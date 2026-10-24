-- Profile + onboarding fields, owner self-edit, and the public `avatars` Storage bucket.
--   * Owners may UPDATE only the new profile columns (column-level grant). plan / pro_until /
--     stripe_customer_id / email / id stay ungranted (service role only).
--   * `role` already has an UPDATE grant for the admin policy; a new owner policy would OR with it,
--     so a trigger now rejects role changes by any non-admin client.
--   * avatars: public read by URL; each user writes only `<uid>/...`; 2 MB, jpeg/png/webp.

alter table public.profiles
  add column display_name text check (char_length(btrim(display_name)) between 1 and 60),
  add column avatar_url   text check (char_length(avatar_url) <= 500 and avatar_url like 'https://%'),
  add column nationality  text check (nationality ~ '^[A-Z]{2}$'),
  add column current_visa text check (char_length(current_visa) <= 40),
  add column entry_date   date check (entry_date >= date '1990-01-01'),
  add column city         text check (char_length(city) <= 60),
  add column onboarded_at timestamptz;

grant update (display_name, avatar_url, nationality, current_visa, entry_date, city, onboarded_at)
  on public.profiles to authenticated;

create policy "profiles: owner can update own profile fields"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Role stays admin-only even though owners can now update their row.
create or replace function private.guard_profile_role()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role is distinct from old.role
     and current_user in ('authenticated', 'anon')
     and not coalesce((select public.is_admin()), false) then
    raise exception 'role can only be changed by an admin' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_profile_role() from public, anon;
grant execute on function private.guard_profile_role() to authenticated;

create trigger profiles_guard_role
  before update of role on public.profiles
  for each row execute function private.guard_profile_role();

-- Storage: avatars
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- No public SELECT policy: files are served by public URL; listing stays owner-only.
create policy "avatars: owner can read own folder"
  on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatars: owner can upload to own folder"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatars: owner can replace own files"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatars: owner can delete own files"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
