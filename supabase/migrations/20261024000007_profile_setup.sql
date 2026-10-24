-- Profile setup for travellers: name, photo, passport country and a contact line.
--   * The owner may update only these columns (column-level grant); plan / pro_until / role stay
--     server-only, so a user cannot upgrade or promote themselves.
--   * onboarded_at is stamped by the app when setup is finished; it is how /account knows a new
--     user still has to complete their profile.
--   * Avatars live in the public `avatars` bucket under <user id>/<file>. Anyone may view (the URL is
--     unguessable and shown only to the owner and the agency chatting with them); only the owner may write.

alter table public.profiles
  add column display_name text check (display_name is null or char_length(btrim(display_name)) between 1 and 80),
  add column avatar_url   text check (avatar_url is null or char_length(avatar_url) <= 500),
  add column nationality  text check (nationality is null or char_length(nationality) <= 60),
  add column contact      text check (contact is null or char_length(contact) <= 120),
  add column onboarded_at timestamptz;

grant update (display_name, avatar_url, nationality, contact, onboarded_at) on public.profiles to authenticated;

create policy "profiles: owner can update own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- `role` is already granted to authenticated for the admin-only policy. With an owner policy in place the
-- grant alone would let a user promote themselves, so a trigger refuses role changes from non-admins.
create or replace function private.profiles_guard_role()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role is distinct from old.role
     and (select auth.role()) <> 'service_role'
     and not public.is_admin() then
    raise exception 'only an admin can change a role' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger profiles_guard_role before update on public.profiles
  for each row execute function private.profiles_guard_role();

-- ---------------------------------------------------------------------------
-- Avatar storage
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "avatars: owner can upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatars: owner can replace"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatars: owner can delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
