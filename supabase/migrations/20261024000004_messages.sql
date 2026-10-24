-- Lead chat: the nomad who sent a lead <-> the partner agency it is assigned to. Admin reads all.
-- Access model:
--   * Customer = signed-in user whose confirmed auth email equals leads.email (magic link => verified inbox).
--     Email match, not a user_id column, so leads sent before sign-up (anon /api/lead) still work.
--   * Partner = lead.agent_id in private.my_agent_ids() (already requires profiles.role partner/admin).
--   * sender_role / sender_id / created_at / read_at are set by a trigger, never trusted from the client.
--   * No delete; the only update is stamping read_at on messages someone else sent.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------
create table public.lead_messages (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references public.leads (id) on delete cascade,
  sender_role text not null check (sender_role in ('customer', 'partner', 'admin')),
  sender_id   uuid default auth.uid(),
  body        text not null check (char_length(btrim(body)) between 1 and 4000),
  created_at  timestamptz not null default now(),
  read_at     timestamptz
);
create index lead_messages_lead_created_idx on public.lead_messages (lead_id, created_at);
alter table public.lead_messages enable row level security;

-- ---------------------------------------------------------------------------
-- Who am I on a lead? DEFINER: reads auth.users / agents.owner_email, which clients can't.
-- Both answer only about the caller. Unexposed private schema.
-- ---------------------------------------------------------------------------
create or replace function private.my_customer_lead_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select l.id from public.leads l
  where lower(l.email) = lower((select auth.jwt()) ->> 'email')
    and exists (select 1 from auth.users u
                where u.id = (select auth.uid()) and u.email_confirmed_at is not null
                  and lower(u.email) = lower(l.email));
$$;

create or replace function private.my_partner_lead_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select l.id from public.leads l where l.agent_id in (select private.my_agent_ids());
$$;
revoke all on function private.my_customer_lead_ids(), private.my_partner_lead_ids() from public, anon;
grant execute on function private.my_customer_lead_ids(), private.my_partner_lead_ids() to authenticated;

-- ---------------------------------------------------------------------------
-- Triggers: stamp sender on insert; allow only read_at (set once) on update
-- ---------------------------------------------------------------------------
create or replace function private.lead_messages_before_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.sender_id := auth.uid();
  new.created_at := now();
  new.read_at := null;
  new.body := btrim(new.body);
  -- Partner first: an agency staffer who also once filed a lead is acting as the agency here.
  if new.lead_id in (select private.my_partner_lead_ids()) then
    new.sender_role := 'partner';
  elsif new.lead_id in (select private.my_customer_lead_ids()) then
    new.sender_role := 'customer';
  elsif public.is_admin() then
    new.sender_role := 'admin';
  else
    raise exception 'not a participant in this conversation' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger lead_messages_stamp before insert on public.lead_messages
  for each row execute function private.lead_messages_before_insert();

create or replace function private.lead_messages_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.lead_id, new.sender_role, new.sender_id, new.body, new.created_at)
     is distinct from (old.lead_id, old.sender_role, old.sender_id, old.body, old.created_at) then
    raise exception 'messages cannot be edited' using errcode = '42501';
  end if;
  new.read_at := coalesce(old.read_at, now()); -- first read wins; can't be cleared or back-dated
  return new;
end;
$$;
create trigger lead_messages_read_only before update on public.lead_messages
  for each row execute function private.lead_messages_before_update();

-- ---------------------------------------------------------------------------
-- Grants + RLS (authenticated only; anon has nothing)
-- ---------------------------------------------------------------------------
revoke all on public.lead_messages from public, anon, authenticated;
grant select on public.lead_messages to authenticated;
grant insert (lead_id, body) on public.lead_messages to authenticated;
grant update (read_at) on public.lead_messages to authenticated;

create policy "lead_messages: participants or admin can read"
  on public.lead_messages for select to authenticated
  using (
    (select public.is_admin())
    or lead_id in (select private.my_customer_lead_ids())
    or lead_id in (select private.my_partner_lead_ids())
  );

create policy "lead_messages: participants or admin can send"
  on public.lead_messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and (
      lead_id in (select private.my_customer_lead_ids())
      or lead_id in (select private.my_partner_lead_ids())
      or (select public.is_admin())
    )
  );

create policy "lead_messages: recipient can mark read"
  on public.lead_messages for update to authenticated
  using (
    sender_id is distinct from (select auth.uid())
    and (lead_id in (select private.my_customer_lead_ids()) or lead_id in (select private.my_partner_lead_ids()))
  )
  with check (
    sender_id is distinct from (select auth.uid())
    and (lead_id in (select private.my_customer_lead_ids()) or lead_id in (select private.my_partner_lead_ids()))
  );

-- The customer can now read their own lead (thread header). One policy, not two (multiple permissive lint).
drop policy "leads: assigned partner or admin can read" on public.leads;
create policy "leads: admin, assigned partner or customer can read"
  on public.leads for select to authenticated
  using (
    (select public.is_admin())
    or agent_id in (select private.my_agent_ids())
    or id in (select private.my_customer_lead_ids())
  );

-- ---------------------------------------------------------------------------
-- my_threads(): my conversations (as customer or partner) + last message + unread count.
-- SECURITY INVOKER, so every row still passes the RLS above.
-- ---------------------------------------------------------------------------
create or replace function public.my_threads()
returns table (
  lead_id uuid,
  my_role text,
  lead_name text,
  visa_slug text,
  agent_id uuid,
  agent_name text,
  created_at timestamptz,
  last_body text,
  last_at timestamptz,
  last_sender_role text,
  unread int
)
language sql
stable
security invoker
set search_path = ''
as $$
  with mine as (
    select id, 'partner'::text as my_role from private.my_partner_lead_ids() id
    union
    select id, 'customer' from private.my_customer_lead_ids() id
      where id not in (select private.my_partner_lead_ids())
  )
  select l.id, mine.my_role, l.name, l.visa_slug, l.agent_id, a.name, l.created_at,
         m.body, m.created_at, m.sender_role,
         (select count(*)::int from public.lead_messages u
           where u.lead_id = l.id and u.read_at is null and u.sender_id is distinct from (select auth.uid()))
  from mine
  join public.leads l on l.id = mine.id and l.status <> 'spam'
  left join public.agents a on a.id = l.agent_id
  left join lateral (
    select x.body, x.created_at, x.sender_role from public.lead_messages x
    where x.lead_id = l.id order by x.created_at desc limit 1
  ) m on true
  order by coalesce(m.created_at, l.created_at) desc;
$$;
revoke all on function public.my_threads() from public, anon;
grant execute on function public.my_threads() to authenticated;

-- Realtime: postgres_changes on this table are filtered by the select policy per subscriber.
alter publication supabase_realtime add table public.lead_messages;
