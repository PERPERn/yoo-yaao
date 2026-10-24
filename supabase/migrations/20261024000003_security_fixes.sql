-- Security review fixes for 20261024000002_partner_verification.sql
-- 'paid' skipped the verification gate: an admin could set status = 'paid' on an unverified
-- application, and handle_new_user() grants the partner role for 'paid' as well as 'approved'.
-- Gate both statuses the same way.
create or replace function private.guard_application()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status in ('approved', 'paid') and (
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
