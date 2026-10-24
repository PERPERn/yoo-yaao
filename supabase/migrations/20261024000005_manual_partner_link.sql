-- approve_partner: the admin picks which directory row to link (security review: name-based
-- auto-linking could hand an unowned listing/agent to an applicant who just reused its name).
--   * New optional params listing_id / agent_id. Only those rows are linked, and only while unowned.
--   * No param = link nothing ("create later"). Nothing is matched by name any more.
--   * link_candidates(): unowned listings + agents for the admin's picker (admin-only).

-- ---------------------------------------------------------------------------
-- 1. approve_partner(app_type, app_id, listing_id, agent_id)
-- ---------------------------------------------------------------------------
-- Old 2-arg version would stay callable (and keep name matching) as an overload; drop it.
drop function public.approve_partner(text, uuid);

-- DEFINER because it writes rows/columns the admin's client grants don't cover
-- (profiles by email, owner_email). It refuses anyone who is not an admin.
create or replace function public.approve_partner(
  app_type   text,
  app_id     uuid,
  listing_id uuid default null,
  agent_id   uuid default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_email text;
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
      where id = app_id returning email, kind into v_email, v_kind;
  elsif app_type = 'buddy' then
    if approve_partner.listing_id is not null or approve_partner.agent_id is not null then
      raise exception 'buddy applications have no listing or agent to link' using errcode = '22023';
    end if;
    update public.buddy_applications set status = 'approved'
      where id = app_id returning email into v_email;
  else
    raise exception 'app_type must be listing or buddy' using errcode = '22023';
  end if;
  if v_email is null then
    raise exception 'application not found' using errcode = 'P0002';
  end if;
  if approve_partner.agent_id is not null and v_kind is distinct from 'agency' then
    raise exception 'only agency applications can be linked to an agent' using errcode = '22023';
  end if;

  -- Never demote an admin.
  update public.profiles set role = 'partner'
    where lower(email) = lower(v_email) and role = 'user';
  get diagnostics v_profiles = row_count;

  select exists (select 1 from auth.users u
                 where lower(u.email) = lower(v_email) and u.email_confirmed_at is not null)
    into v_confirmed;

  -- Link only the rows the admin chose, and never take over a row someone already owns.
  if approve_partner.listing_id is not null then
    update public.listings l set owner_email = lower(v_email)
      where l.id = approve_partner.listing_id and l.owner_email is null;
    get diagnostics v_listings = row_count;
  end if;
  if approve_partner.agent_id is not null then
    update public.agents a set owner_email = lower(v_email)
      where a.id = approve_partner.agent_id and a.owner_email is null;
    get diagnostics v_agents = row_count;
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
revoke all on function public.approve_partner(text, uuid, uuid, uuid) from public, anon;
grant execute on function public.approve_partner(text, uuid, uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. link_candidates(): unowned rows for the approve picker
-- ---------------------------------------------------------------------------
-- DEFINER only for the owner_email IS NULL test (column not granted to clients). Admin-gated,
-- unexposed schema. The public wrapper is INVOKER, so names/cities still pass the admin's RLS.
create or replace function private.unowned_link_ids()
returns table (target text, id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select 'listing', l.id from public.listings l where l.owner_email is null and public.is_admin()
  union all
  select 'agent', a.id from public.agents a where a.owner_email is null and public.is_admin();
$$;
revoke all on function private.unowned_link_ids() from public, anon;
grant execute on function private.unowned_link_ids() to authenticated;

create or replace function public.link_candidates()
returns table (target text, id uuid, name text, kind text, city text)
language sql
stable
security invoker
set search_path = ''
as $$
  select 'listing', l.id, l.name, l.kind, l.city
  from public.listings l
  where l.id in (select u.id from private.unowned_link_ids() u where u.target = 'listing')
  union all
  select 'agent', a.id, a.name, 'agency', a.cities[1]
  from public.agents a
  where a.id in (select u.id from private.unowned_link_ids() u where u.target = 'agent')
  order by 3;
$$;
revoke all on function public.link_candidates() from public, anon;
grant execute on function public.link_candidates() to authenticated;
