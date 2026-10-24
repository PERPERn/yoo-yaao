-- LongStay TH — initial schema
-- Access model:
--   * Every table has RLS enabled.
--   * Grants are explicit and minimal (default grants to anon/authenticated are revoked first).
--   * Users read/write only their own rows (stays, checklist_items) and read their own
--     profile, payments and bookings.
--   * anon/authenticated may INSERT into leads, listing_applications, buddy_applications,
--     limited to whitelisted columns (column-level grants) plus CHECK constraints.
--   * Public SELECT only on verified agents and active listings (non-sensitive columns).
--   * payments / bookings / profiles.plan are written only by the service role (Stripe webhook).

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- Stop new objects in public from being auto-exposed to the Data API.
alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated, public;

-- ---------------------------------------------------------------------------
-- Shared helper: updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id                 uuid primary key references auth.users (id) on delete cascade,
  email              text,
  plan               text not null default 'free' check (plan in ('free', 'pro')),
  pro_until          timestamptz,
  stripe_customer_id text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index profiles_email_lower_idx on public.profiles (lower(email));

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

-- Create a profile row whenever a user signs up.
-- SECURITY DEFINER is required (the auth admin role cannot write public.profiles);
-- it lives in the unexposed `private` schema so it is not callable over the API.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;
revoke all on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------------------
-- stays (user's visa timeline)
-- ---------------------------------------------------------------------------
create table public.stays (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  visa_type        text not null check (char_length(visa_type) between 1 and 40),
  entry_date       date not null,
  expiry_date      date,
  last_report_date date,               -- last 90-day report (TM47)
  city             text check (city is null or char_length(city) <= 60),
  note             text check (note is null or char_length(note) <= 500),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint stays_dates_chk check (expiry_date is null or expiry_date >= entry_date)
);
create index stays_user_id_idx on public.stays (user_id);

create trigger stays_set_updated_at
  before update on public.stays
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- checklist_items (document checklist tracker)
-- ---------------------------------------------------------------------------
create table public.checklist_items (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  visa_slug  text not null check (char_length(visa_slug) between 1 and 40),
  item       text not null check (char_length(item) between 1 and 300),
  done       boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint checklist_items_unique unique (user_id, visa_slug, item)
);

create trigger checklist_items_set_updated_at
  before update on public.checklist_items
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- leads ("Get expert help" form → licensed agents)
-- ---------------------------------------------------------------------------
create table public.leads (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 120),
  email       text not null check (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  nationality text check (nationality is null or char_length(nationality) <= 60),
  visa_slug   text check (visa_slug is null or char_length(visa_slug) <= 40),
  city        text check (city is null or char_length(city) <= 60),
  message     text check (message is null or char_length(message) <= 2000),
  source      text check (source is null or char_length(source) <= 120),
  status      text not null default 'new' check (status in ('new', 'sent', 'won', 'lost', 'spam')),
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- agents (licensed visa agents / law firms directory)
-- ---------------------------------------------------------------------------
create table public.agents (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  company     text,
  license_no  text,
  cities      text[] not null default '{}',
  languages   text[] not null default '{}',
  services    text[] not null default '{}',
  website     text,
  verified    boolean not null default false,
  created_at  timestamptz not null default now()
);
create index agents_verified_idx on public.agents (verified) where verified;

-- ---------------------------------------------------------------------------
-- listings (B2B directory; featured = paid placement)
-- ---------------------------------------------------------------------------
create table public.listings (
  id             uuid primary key default gen_random_uuid(),
  kind           text not null default 'coworking'
                   check (kind in ('coworking', 'coliving', 'agency', 'insurance', 'esim')),
  name           text not null check (char_length(name) between 1 and 120),
  city           text check (city is null or city in ('bangkok', 'chiang-mai', 'phuket')),
  url            text check (url is null or url ~* '^https?://'),
  price_from     text,
  description    text,
  affiliate      boolean not null default false,
  active         boolean not null default true,
  featured       boolean not null default false,
  featured_until timestamptz,
  owner_email    text,                -- private: never granted to anon/authenticated
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create unique index listings_owner_name_uidx on public.listings (owner_email, name);
create index listings_active_featured_idx on public.listings (featured desc, name) where active;

create trigger listings_set_updated_at
  before update on public.listings
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- listing_applications (B2B apply form)
-- ---------------------------------------------------------------------------
create table public.listing_applications (
  id            uuid primary key default gen_random_uuid(),
  business_name text not null check (char_length(business_name) between 1 and 120),
  kind          text not null check (kind in ('coworking', 'coliving', 'agency', 'insurance', 'esim')),
  city          text check (city is null or city in ('bangkok', 'chiang-mai', 'phuket')),
  url           text check (url is null or (char_length(url) <= 500 and url ~* '^https?://')),
  contact_name  text check (contact_name is null or char_length(contact_name) <= 120),
  email         text not null check (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  message       text check (message is null or char_length(message) <= 2000),
  status        text not null default 'new' check (status in ('new', 'approved', 'rejected', 'paid')),
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- buddy_applications (C2C: locals apply to become Local Buddies)
-- ---------------------------------------------------------------------------
create table public.buddy_applications (
  id         uuid primary key default gen_random_uuid(),
  full_name  text not null check (char_length(full_name) between 1 and 120),
  email      text not null check (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  city       text not null check (city in ('bangkok', 'chiang-mai', 'phuket')),
  languages  text[] not null default '{}' check (cardinality(languages) <= 10),
  services   text[] not null default '{}' check (cardinality(services) <= 15),
  bio        text check (bio is null or char_length(bio) <= 2000),
  price_usd  numeric(10, 2) check (price_usd is null or price_usd between 10 and 200),
  status     text not null default 'new' check (status in ('new', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- bookings (C2C buddy sessions; written by the Stripe webhook only)
-- ---------------------------------------------------------------------------
create table public.bookings (
  id                uuid primary key default gen_random_uuid(),
  buddy_id          text not null,
  user_id           uuid references public.profiles (id) on delete set null,
  customer_email    text,
  session_at        timestamptz,
  amount_usd        numeric(10, 2) not null check (amount_usd >= 0),
  platform_fee_usd  numeric(10, 2) not null check (platform_fee_usd >= 0),
  buddy_payout_usd  numeric(10, 2) generated always as (amount_usd - platform_fee_usd) stored,
  stripe_session_id text not null unique,
  status            text not null default 'paid' check (status in ('pending', 'paid', 'cancelled', 'refunded')),
  created_at        timestamptz not null default now()
);
create index bookings_user_id_idx on public.bookings (user_id);
create index bookings_buddy_id_idx on public.bookings (buddy_id);

-- ---------------------------------------------------------------------------
-- payments (every completed Checkout Session; source of revenue reporting)
-- ---------------------------------------------------------------------------
create table public.payments (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references public.profiles (id) on delete set null,
  email             text,
  product_id        text not null check (product_id in ('pro_monthly', 'pro_yearly', 'listing_featured', 'buddy_session')),
  segment           text not null check (segment in ('B2C', 'B2B', 'C2C')),
  amount_usd        numeric(10, 2) not null check (amount_usd >= 0),
  -- Platform's net revenue: full amount for B2C/B2B, commission only for C2C.
  net_revenue_usd   numeric(10, 2) not null check (net_revenue_usd >= 0),
  currency          text not null default 'usd',
  stripe_session_id text not null unique,
  status            text not null default 'paid' check (status in ('pending', 'paid', 'refunded', 'failed')),
  created_at        timestamptz not null default now()
);
create index payments_user_id_idx on public.payments (user_id);
create index payments_segment_idx on public.payments (segment);

-- ===========================================================================
-- RLS
-- ===========================================================================
alter table public.profiles             enable row level security;
alter table public.stays                enable row level security;
alter table public.checklist_items      enable row level security;
alter table public.leads                enable row level security;
alter table public.agents               enable row level security;
alter table public.listings             enable row level security;
alter table public.listing_applications enable row level security;
alter table public.buddy_applications   enable row level security;
alter table public.bookings             enable row level security;
alter table public.payments             enable row level security;

-- Start from zero for client roles, then grant the minimum.
revoke all on public.profiles, public.stays, public.checklist_items, public.leads, public.agents,
  public.listings, public.listing_applications, public.buddy_applications, public.bookings,
  public.payments from anon, authenticated;

-- service_role (server only; bypasses RLS) keeps full access.
grant select, insert, update, delete on public.profiles, public.stays, public.checklist_items,
  public.leads, public.agents, public.listings, public.listing_applications,
  public.buddy_applications, public.bookings, public.payments to service_role;

-- profiles: owner may read. Plan / Stripe fields change only via service role.
grant select on public.profiles to authenticated;
create policy "profiles: owner can read"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

-- stays: full CRUD on own rows.
grant select, insert, update, delete on public.stays to authenticated;
create policy "stays: owner can read"
  on public.stays for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "stays: owner can insert"
  on public.stays for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "stays: owner can update"
  on public.stays for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "stays: owner can delete"
  on public.stays for delete to authenticated
  using ((select auth.uid()) = user_id);

-- checklist_items: full CRUD on own rows.
grant select, insert, update, delete on public.checklist_items to authenticated;
create policy "checklist: owner can read"
  on public.checklist_items for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "checklist: owner can insert"
  on public.checklist_items for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "checklist: owner can update"
  on public.checklist_items for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "checklist: owner can delete"
  on public.checklist_items for delete to authenticated
  using ((select auth.uid()) = user_id);

-- leads: public insert of whitelisted columns only; status stays 'new'. No public read.
grant insert (name, email, nationality, visa_slug, city, message, source)
  on public.leads to anon, authenticated;
create policy "leads: anyone can submit"
  on public.leads for insert to anon, authenticated
  with check (status = 'new');

-- listing_applications: public insert, whitelisted columns, status stays 'new'.
grant insert (business_name, kind, city, url, contact_name, email, message)
  on public.listing_applications to anon, authenticated;
create policy "listing_applications: anyone can submit"
  on public.listing_applications for insert to anon, authenticated
  with check (status = 'new');

-- buddy_applications: public insert, whitelisted columns, status stays 'new'.
grant insert (full_name, email, city, languages, services, bio, price_usd)
  on public.buddy_applications to anon, authenticated;
create policy "buddy_applications: anyone can submit"
  on public.buddy_applications for insert to anon, authenticated
  with check (status = 'new');

-- agents: public read of verified agents (non-sensitive columns).
grant select (id, name, company, license_no, cities, languages, services, website, verified)
  on public.agents to anon, authenticated;
create policy "agents: public can read verified"
  on public.agents for select to anon, authenticated
  using (verified);

-- listings: public read of active listings; owner_email is NOT granted.
grant select (id, kind, name, city, url, price_from, description, affiliate, active, featured, featured_until, created_at)
  on public.listings to anon, authenticated;
create policy "listings: public can read active"
  on public.listings for select to anon, authenticated
  using (active);

-- bookings: customer may read own bookings. Writes: service role only.
grant select on public.bookings to authenticated;
create policy "bookings: owner can read"
  on public.bookings for select to authenticated
  using ((select auth.uid()) = user_id);

-- payments: payer may read own payments. Writes: service role only.
grant select on public.payments to authenticated;
create policy "payments: owner can read"
  on public.payments for select to authenticated
  using ((select auth.uid()) = user_id);
