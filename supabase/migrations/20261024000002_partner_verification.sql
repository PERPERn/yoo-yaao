-- Partner verification (follow-up to 20261024000001_partner_admin.sql)
-- Flow: apply (public form) -> applicant's email confirmed by the magic link -> admin ticks
-- verified_identity (+ verified_license for agencies) -> approve -> profiles.role = 'partner'.
--   * Partner rights now need profiles.role in ('partner','admin'); an email match alone gives nothing.
--   * Verification fields are admin-only; the public form may add only license_no.
--   * An application cannot become 'approved' until it is verified (trigger, applies to everyone).

-- ---------------------------------------------------------------------------
-- 1. Ownership lookups require the partner role
-- ---------------------------------------------------------------------------
create or replace function private.my_agent_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select a.id from public.agents a
  where a.owner_email is not null
    and lower(a.owner_email) = lower((select auth.jwt()) ->> 'email')
    and exists (select 1 from public.profiles p
                where p.id = (select auth.uid()) and p.role in ('partner', 'admin'));
$$;

create or replace function private.my_listing_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select l.id from public.listings l
  where l.owner_email is not null
    and lower(l.owner_email) = lower((select auth.jwt()) ->> 'email')
    and exists (select 1 from public.profiles p
                where p.id = (select auth.uid()) and p.role in ('partner', 'admin'));
$$;
revoke all on function private.my_listing_ids() from public, anon;
grant execute on function private.my_listing_ids() to authenticated;

-- my_listings() reads through private.my_listing_ids(), so it inherits the role check.
-- (Re)created here because the remote copy from migration 1 was lost; idempotent.
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

-- listings policies used a bare email match; route them through the role-checked lookup.
alter policy "listings: active, owner or admin can read" on public.listings
  using (active or (select public.is_admin()) or id in (select private.my_listing_ids()));
alter policy "listings: owner or admin can update" on public.listings
  using ((select public.is_admin()) or id in (select private.my_listing_ids()))
  with check ((select public.is_admin()) or id in (select private.my_listing_ids()));
-- Applicants still read their own applications by email (any role), so they can follow the status.

-- ---------------------------------------------------------------------------
-- 2. Verification fields
-- ---------------------------------------------------------------------------
alter table public.listing_applications
  add column license_no        text check (license_no is null or char_length(license_no) <= 80),
  add column verified_identity boolean not null default false,
  add column verified_license  boolean not null default false,
  add column review_note       text check (review_note is null or char_length(review_note) <= 2000),
  add column reviewed_at       timestamptz,
  add column reviewed_by       uuid references public.profiles (id) on delete set null;

alter table public.buddy_applications
  add column license_no        text check (license_no is null or char_length(license_no) <= 80),
  add column verified_identity boolean not null default false,
  add column verified_license  boolean not null default false,
  add column review_note       text check (review_note is null or char_length(review_note) <= 2000),
  add column reviewed_at       timestamptz,
  add column reviewed_by       uuid references public.profiles (id) on delete set null;

create index listing_applications_reviewed_by_idx on public.listing_applications (reviewed_by);
create index buddy_applications_reviewed_by_idx on public.buddy_applications (reviewed_by);

-- Public form: license_no only. verified_* / review_* are never insertable by client roles.
grant insert (license_no) on public.listing_applications, public.buddy_applications to anon, authenticated;
-- Admin review (the update policies already require is_admin()). reviewed_at/by are set by the trigger.
grant update (verified_identity, verified_license, review_note)
  on public.listing_applications, public.buddy_applications to authenticated;

-- ---------------------------------------------------------------------------
-- 3. No approval without verification; stamp who reviewed and when
-- ---------------------------------------------------------------------------
create or replace function private.guard_application()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'approved' and (
       not new.verified_identity
       or (to_jsonb(new) ->> 'kind' = 'agency' and not new.verified_license)) then
    raise exception 'verify identity (and licence for agencies) before approving' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' and (new.status, new.verified_identity, new.verified_license, new.review_note)
       is distinct from (old.status, old.verified_identity, old.verified_license, old.review_note) then
    new.reviewed_at := now();
    new.reviewed_by := (select auth.uid()); -- null for the service role
  end if;
  return new;
end;
$$;
revoke all on function private.guard_application() from public, anon;
grant execute on function private.guard_application() to authenticated;

create trigger listing_applications_guard
  before insert or update on public.listing_applications
  for each row execute function private.guard_application();
create trigger buddy_applications_guard
  before insert or update on public.buddy_applications
  for each row execute function private.guard_application();

-- ---------------------------------------------------------------------------
-- 4. approve_partner(): one admin action that approves and grants the partner role
-- ---------------------------------------------------------------------------
-- DEFINER because it writes rows/columns the admin's client grants don't cover
-- (profiles by email, owner_email). It refuses anyone who is not an admin.
create or replace function public.approve_partner(app_type text, app_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_email text;
  v_name  text;
  v_kind  text;
  v_profiles int := 0;
  v_listings int := 0;
  v_agents int := 0;
  v_confirmed boolean;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;

  if app_type = 'listing' then
    update public.listing_applications set status = 'approved'
      where id = app_id returning email, business_name, kind into v_email, v_name, v_kind;
  elsif app_type = 'buddy' then
    update public.buddy_applications set status = 'approved'
      where id = app_id returning email, full_name into v_email, v_name;
  else
    raise exception 'app_type must be listing or buddy' using errcode = '22023';
  end if;
  if v_email is null then
    raise exception 'application not found' using errcode = 'P0002';
  end if;

  -- Never demote an admin.
  update public.profiles set role = 'partner'
    where lower(email) = lower(v_email) and role = 'user';
  get diagnostics v_profiles = row_count;

  select exists (select 1 from auth.users u
                 where lower(u.email) = lower(v_email) and u.email_confirmed_at is not null)
    into v_confirmed;

  -- Link unowned directory rows with the same name; never take over a row someone owns.
  if app_type = 'listing' then
    update public.listings set owner_email = lower(v_email)
      where owner_email is null and lower(name) = lower(v_name);
    get diagnostics v_listings = row_count;
    if v_kind = 'agency' then
      update public.agents set owner_email = lower(v_email)
        where owner_email is null and (lower(name) = lower(v_name) or lower(company) = lower(v_name));
      get diagnostics v_agents = row_count;
    end if;
  end if;

  return jsonb_build_object(
    'email', v_email,
    'account_confirmed', v_confirmed,
    'profiles_updated', v_profiles,
    'listings_linked', v_listings,
    'agents_linked', v_agents
  );
end;
$$;
revoke all on function public.approve_partner(text, uuid) from public, anon;
grant execute on function public.approve_partner(text, uuid) to authenticated;

-- Applicants approved before they ever signed in get the partner role on first sign-in.
-- Only the owner of the email can complete the magic link, so this cannot be claimed by someone else.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, role)
  values (
    new.id,
    new.email,
    case when exists (
      select 1 from public.listing_applications a
      where lower(a.email) = lower(new.email) and a.status in ('approved', 'paid')
      union all
      select 1 from public.buddy_applications b
      where lower(b.email) = lower(new.email) and b.status = 'approved'
    ) then 'partner' else 'user' end
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;
revoke all on function private.handle_new_user() from public, anon, authenticated;
