-- Delivery + reviews: the assigned agency hands over finished work, the customer confirms, then reviews.
-- Flow: partner uploads files (bucket `deliverables`) -> inserts lead_deliveries -> sets lead 'delivered'
--       -> customer sets 'completed' -> customer may post one agency_reviews row.
-- Access model (same helpers as the chat, migration 0004):
--   * Customer = private.my_customer_lead_ids() (confirmed auth email = leads.email).
--   * Partner  = private.my_partner_lead_ids() (lead.agent_id owned by a partner/admin profile).
--   * Status transitions are enforced by a trigger; grants/RLS decide who may update at all.
--   * Reviews are public, but lead_id is never granted, so a review can't be tied to a customer.
--   * /experts "Message" may create a lead aimed at one verified agency (leads.agent_id on insert).

-- ---------------------------------------------------------------------------
-- 1. Lead statuses + who may set them
-- ---------------------------------------------------------------------------
alter table public.leads drop constraint leads_status_check;
alter table public.leads add constraint leads_status_check
  check (status in ('new', 'sent', 'won', 'lost', 'spam', 'delivered', 'completed'));

-- One update policy (multiple-permissive lint): admin anything; partner sent/won/lost/delivered;
-- customer only 'completed'. The trigger below checks the transition itself.
alter policy "leads: assigned partner or admin can update" on public.leads
  using (
    (select public.is_admin())
    or agent_id in (select private.my_agent_ids())
    or id in (select private.my_customer_lead_ids())
  )
  with check (
    (select public.is_admin())
    or (agent_id in (select private.my_agent_ids()) and status in ('sent', 'won', 'lost', 'delivered'))
    or (id in (select private.my_customer_lead_ids()) and status = 'completed')
  );

create or replace function private.guard_lead_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user <> 'authenticated' or public.is_admin() or new.status is not distinct from old.status then
    return new;
  end if;
  if old.status = 'completed' then
    raise exception 'a completed lead can no longer change' using errcode = '42501';
  end if;
  if new.status = 'delivered' then
    if old.id not in (select private.my_partner_lead_ids()) or old.status not in ('new', 'sent', 'won') then
      raise exception 'only the assigned agency can mark an open lead delivered' using errcode = '42501';
    end if;
    if not exists (select 1 from public.lead_deliveries d where d.lead_id = old.id) then
      raise exception 'submit the delivery before marking the lead delivered' using errcode = '23514';
    end if;
  elsif new.status = 'completed' then
    if old.id not in (select private.my_customer_lead_ids()) or old.status <> 'delivered' then
      raise exception 'only the customer can confirm a delivered lead' using errcode = '42501';
    end if;
  elsif old.id not in (select private.my_partner_lead_ids()) then
    raise exception 'only the assigned agency can change this status' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_lead_status() from public, anon;
grant execute on function private.guard_lead_status() to authenticated;
create trigger leads_guard_status
  before update of status on public.leads
  for each row execute function private.guard_lead_status();

-- /experts "Message this agency": the lead can name a verified agency up front. Unverified or
-- unknown ids fail the policy; assigned_at stays admin-only.
grant insert (agent_id) on public.leads to anon, authenticated;
alter policy "leads: anyone can submit" on public.leads
  with check (
    status = 'new'
    and (agent_id is null or agent_id in (select a.id from public.agents a where a.verified))
  );

-- ---------------------------------------------------------------------------
-- 2. Storage: private bucket deliverables/<lead_id>/<file>
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('deliverables', 'deliverables', false, 10485760, array[
  'application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/heic',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "deliverables: customer, partner or admin can read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'deliverables'
    and (
      (select public.is_admin())
      or (storage.foldername(name))[1] in (select id::text from private.my_customer_lead_ids() id)
      or (storage.foldername(name))[1] in (select id::text from private.my_partner_lead_ids() id)
    )
  );
-- Insert only: no update/delete policy, so files can't be swapped after the customer sees them.
create policy "deliverables: assigned partner can upload"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'deliverables'
    and (storage.foldername(name))[1] in (select id::text from private.my_partner_lead_ids() id)
  );

-- ---------------------------------------------------------------------------
-- 3. lead_deliveries
-- ---------------------------------------------------------------------------
create table public.lead_deliveries (
  id         uuid primary key default gen_random_uuid(),
  lead_id    uuid not null references public.leads (id) on delete cascade,
  note       text check (note is null or char_length(note) <= 2000),
  files      text[] not null default '{}' check (cardinality(files) <= 10),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index lead_deliveries_lead_idx on public.lead_deliveries (lead_id, created_at);
create index lead_deliveries_created_by_idx on public.lead_deliveries (created_by);
alter table public.lead_deliveries enable row level security;

revoke all on public.lead_deliveries from public, anon, authenticated;
grant select on public.lead_deliveries to authenticated;
grant insert (lead_id, note, files) on public.lead_deliveries to authenticated;

create policy "lead_deliveries: customer, partner or admin can read"
  on public.lead_deliveries for select to authenticated
  using (
    (select public.is_admin())
    or lead_id in (select private.my_customer_lead_ids())
    or lead_id in (select private.my_partner_lead_ids())
  );
create policy "lead_deliveries: assigned partner can submit"
  on public.lead_deliveries for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and lead_id in (select private.my_partner_lead_ids())
    -- every path must sit in this lead's folder
    and not exists (select 1 from unnest(files) f where f not like lead_id::text || '/%' or f like '%..%')
  );

-- ---------------------------------------------------------------------------
-- 4. agency_reviews
-- ---------------------------------------------------------------------------
create table public.agency_reviews (
  id         uuid primary key default gen_random_uuid(),
  lead_id    uuid not null unique references public.leads (id) on delete cascade,
  agent_id   uuid not null references public.agents (id) on delete cascade,
  rating     int not null check (rating between 1 and 5),
  body       text check (body is null or char_length(body) <= 1000),
  created_at timestamptz not null default now()
);
create index agency_reviews_agent_idx on public.agency_reviews (agent_id);
alter table public.agency_reviews enable row level security;

-- agent_id / created_at come from the lead, never from the client.
create or replace function private.agency_reviews_before_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_status text;
  v_agent uuid;
begin
  if current_user = 'authenticated' then
    if new.lead_id not in (select private.my_customer_lead_ids())
       or new.lead_id in (select private.my_partner_lead_ids()) then
      raise exception 'only the customer of this lead can review it' using errcode = '42501';
    end if;
  end if;
  select l.status, l.agent_id into v_status, v_agent from public.leads l where l.id = new.lead_id;
  if v_status is distinct from 'completed' or v_agent is null then
    raise exception 'reviews open once the customer confirms the work' using errcode = '23514';
  end if;
  new.agent_id := v_agent;
  new.created_at := now();
  new.body := nullif(btrim(new.body), '');
  return new;
end;
$$;
revoke all on function private.agency_reviews_before_insert() from public, anon;
grant execute on function private.agency_reviews_before_insert() to authenticated;
create trigger agency_reviews_stamp before insert on public.agency_reviews
  for each row execute function private.agency_reviews_before_insert();

revoke all on public.agency_reviews from public, anon, authenticated;
grant select (id, agent_id, rating, body, created_at) on public.agency_reviews to anon, authenticated;
grant insert (lead_id, rating, body) on public.agency_reviews to authenticated;

create policy "agency_reviews: anyone can read"
  on public.agency_reviews for select to anon, authenticated
  using (true);
create policy "agency_reviews: completed customer can review once"
  on public.agency_reviews for insert to authenticated
  with check (lead_id in (select private.my_customer_lead_ids()));

-- The customer's own reviews, keyed by lead (lead_id isn't granted). DEFINER only for that column.
create or replace function private.my_reviews()
returns table (lead_id uuid, rating int, body text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select r.lead_id, r.rating, r.body, r.created_at from public.agency_reviews r
  where r.lead_id in (select private.my_customer_lead_ids());
$$;
revoke all on function private.my_reviews() from public, anon;
grant execute on function private.my_reviews() to authenticated;

create or replace function public.my_reviews()
returns table (lead_id uuid, rating int, body text, created_at timestamptz)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.my_reviews(); $$;
revoke all on function public.my_reviews() from public, anon;
grant execute on function public.my_reviews() to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Ratings: per-agent average + count (INVOKER: only granted columns are read)
-- ---------------------------------------------------------------------------
create view public.agent_ratings with (security_invoker = true) as
  select agent_id, round(avg(rating), 1)::float8 as avg_rating, count(*)::int as review_count
  from public.agency_reviews group by agent_id;
grant select on public.agent_ratings to anon, authenticated;

create or replace function public.agent_rating(p_agent_id uuid)
returns table (avg_rating float8, review_count int)
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(r.avg_rating, 0), coalesce(r.review_count, 0)
  from (select 1) x left join public.agent_ratings r on r.agent_id = p_agent_id;
$$;
revoke all on function public.agent_rating(uuid) from public;
grant execute on function public.agent_rating(uuid) to anon, authenticated;
