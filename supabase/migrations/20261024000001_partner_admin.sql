-- Partner portal + admin dashboard (contract: docs/agency-plan.md)
-- Access model:
--   * profiles.role ('user' | 'partner' | 'admin'). Only an admin (or the service role) can change it.
--   * Partner identity = the signed-in session email (auth.jwt()->>'email'), compared case-insensitively
--     with listings.owner_email, agents.owner_email, listing_applications.email, buddy_applications.email.
--   * Column-level grants decide WHICH columns authenticated may update; RLS decides WHICH rows;
--     triggers stop a partner from touching admin-only columns (grants are per role, not per policy).
--   * owner_email columns stay ungranted, so they never leave the database through the Data API.

-- ---------------------------------------------------------------------------
-- Schema changes
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column role text not null default 'user' check (role in ('user', 'partner', 'admin'));

alter table public.leads
  add column agent_id    uuid references public.agents (id) on delete set null,
  add column assigned_at timestamptz;
create index leads_agent_id_idx on public.leads (agent_id);

alter table public.agents add column owner_email text; -- private: never granted to anon/authenticated
create index agents_owner_email_lower_idx on public.agents (lower(owner_email));

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER so the lookup is not itself subject to profiles RLS (avoids policy recursion).
-- Only answers about the caller, so exposing it to authenticated leaks nothing.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin');
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- Agent ids owned by the caller. DEFINER because agents.owner_email is not granted to authenticated
-- (a policy subquery would hit "permission denied for column"). Lives in the unexposed private schema.
create or replace function private.my_agent_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.agents
  where owner_email is not null and lower(owner_email) = lower((select auth.jwt()) ->> 'email');
$$;
revoke all on function private.my_agent_ids() from public, anon;
grant usage on schema private to authenticated; -- usage only; private is not exposed to the Data API
grant execute on function private.my_agent_ids() to authenticated;

-- Partners (non-admin authenticated users) may change only partner columns.
-- The service role (Stripe webhook) is not 'authenticated', so it is unaffected.
create or replace function private.guard_listing_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated' and not public.is_admin()
     and (new.active is distinct from old.active
          or new.featured is distinct from old.featured
          or new.featured_until is distinct from old.featured_until) then
    raise exception 'only an admin can change active/featured' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_listing_update() from public, anon;
grant execute on function private.guard_listing_update() to authenticated;
create trigger listings_guard_update
  before update on public.listings
  for each row execute function private.guard_listing_update();

create or replace function private.guard_lead_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated' and not public.is_admin()
     and (new.agent_id is distinct from old.agent_id
          or new.assigned_at is distinct from old.assigned_at) then
    raise exception 'only an admin can assign leads' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_lead_update() from public, anon;
grant execute on function private.guard_lead_update() to authenticated;
create trigger leads_guard_update
  before update on public.leads
  for each row execute function private.guard_lead_update();

-- ---------------------------------------------------------------------------
-- Grants + RLS (authenticated only; one policy per table/action to keep evaluation cheap)
-- ---------------------------------------------------------------------------

-- profiles: owner reads own row, admin reads all and sets role. A non-admin has no update policy,
-- so they cannot change their own role (or anything else) on profiles.
drop policy "profiles: owner can read" on public.profiles;
create policy "profiles: owner or admin can read"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id or (select public.is_admin()));
grant update (role) on public.profiles to authenticated;
create policy "profiles: admin can set role"
  on public.profiles for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- listings: anon keeps the public policy; authenticated gets one combined policy
-- (active, or own listing incl. inactive, or admin). Owner/admin can update.
alter policy "listings: public can read active" on public.listings to anon;
create policy "listings: active, owner or admin can read"
  on public.listings for select to authenticated
  using (active or (select public.is_admin()) or lower(owner_email) = lower((select auth.jwt()) ->> 'email'));
grant update (description, price_from, url, active, featured, featured_until) on public.listings to authenticated;
create policy "listings: owner or admin can update"
  on public.listings for update to authenticated
  using ((select public.is_admin()) or lower(owner_email) = lower((select auth.jwt()) ->> 'email'))
  with check ((select public.is_admin()) or lower(owner_email) = lower((select auth.jwt()) ->> 'email'));

-- agents: anon sees verified; authenticated sees verified, admin sees all (assign-lead picker).
alter policy "agents: public can read verified" on public.agents to anon;
create policy "agents: verified or admin can read"
  on public.agents for select to authenticated
  using (verified or (select public.is_admin()));

-- leads: partner sees leads assigned to their agents and may set status sent/won/lost; admin does all.
grant select (id, name, email, nationality, visa_slug, city, message, source, status, created_at, agent_id, assigned_at)
  on public.leads to authenticated;
grant update (status, agent_id, assigned_at) on public.leads to authenticated;
create policy "leads: assigned partner or admin can read"
  on public.leads for select to authenticated
  using ((select public.is_admin()) or agent_id in (select private.my_agent_ids()));
create policy "leads: assigned partner or admin can update"
  on public.leads for update to authenticated
  using ((select public.is_admin()) or agent_id in (select private.my_agent_ids()))
  with check (
    (select public.is_admin())
    or (agent_id in (select private.my_agent_ids()) and status in ('sent', 'won', 'lost'))
  );

-- applications: applicant (by email) or admin can read; only admin can change status.
grant select on public.listing_applications, public.buddy_applications to authenticated;
grant update (status) on public.listing_applications, public.buddy_applications to authenticated;
create policy "listing_applications: applicant or admin can read"
  on public.listing_applications for select to authenticated
  using ((select public.is_admin()) or lower(email) = lower((select auth.jwt()) ->> 'email'));
create policy "listing_applications: admin can update"
  on public.listing_applications for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
create policy "buddy_applications: applicant or admin can read"
  on public.buddy_applications for select to authenticated
  using ((select public.is_admin()) or lower(email) = lower((select auth.jwt()) ->> 'email'));
create policy "buddy_applications: admin can update"
  on public.buddy_applications for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- bookings: customer reads own, admin reads all. Writes stay service-role only.
drop policy "bookings: owner can read" on public.bookings;
create policy "bookings: owner or admin can read"
  on public.bookings for select to authenticated
  using ((select auth.uid()) = user_id or (select public.is_admin()));

-- Bootstrap the first admin once, from the SQL editor (never from the client):
--   update public.profiles set role = 'admin' where lower(email) = 'you@example.com';

-- ---------------------------------------------------------------------------
-- my_listings(): the caller's own listings (active or not).
-- owner_email is not granted, so the client cannot filter on it; RLS alone would also return
-- everyone's active listings. INVOKER wrapper: RLS + column grants still apply; only the id
-- lookup runs as definer.
-- ---------------------------------------------------------------------------
create or replace function private.my_listing_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.listings
  where owner_email is not null and lower(owner_email) = lower((select auth.jwt()) ->> 'email');
$$;
revoke all on function private.my_listing_ids() from public, anon;
grant execute on function private.my_listing_ids() to authenticated;

create or replace function public.my_listings()
returns table (
  id uuid, kind text, name text, city text, url text, price_from text, description text,
  affiliate boolean, active boolean, featured boolean, featured_until timestamptz, created_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select l.id, l.kind, l.name, l.city, l.url, l.price_from, l.description,
         l.affiliate, l.active, l.featured, l.featured_until, l.created_at
  from public.listings l
  where l.id in (select private.my_listing_ids())
  order by l.name;
$$;
revoke all on function public.my_listings() from public, anon;
grant execute on function public.my_listings() to authenticated;
