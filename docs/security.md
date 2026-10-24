# Security review — Yoo Yaao (2026-10-24)

Scope: `app/src/pages/api/*`, `app/src/lib/*`, client scripts, `app/public/sw.js`, built output in
`app/.vercel/output/static`, and the RLS migration `supabase/migrations/20261023000001_init_schema.sql`.
Pre-demo pass: only small, safe fixes were applied. Everything else is listed with a proposal.

## Findings

| # | Severity | Where | Issue | Status |
|---|----------|-------|-------|--------|
| 1 | Medium | whole site | No security headers (CSP, nosniff, frame-ancestors, Referrer-Policy, Permissions-Policy, HSTS). | **Fixed** (`app/astro.config.mjs`) |
| 2 | Medium | `public/sw.js` | Service worker cached every successful navigation, including `/account` (signed-in page; also `?checkout=success&session_id=…`). | **Fixed**: `/account*` bypassed, cache version bumped to `v2` so old copies are dropped |
| 3 | Medium | `leads`, `listing_applications`, `buddy_applications` (RLS) | The publishable key lets anyone insert directly through PostgREST, which skips the API's honeypot. Column grants + CHECK constraints limit shape and size, but not volume (spam / storage abuse). | Not fixed — see proposal A |
| 4 | Medium | `api/lead`, `api/listing-apply`, `api/buddy-apply`, `api/checkout` | No rate limiting. Honeypot only stops naive bots. On serverless an in-memory limiter would not work. | Not fixed — enable a Vercel Firewall rate-limit rule on `/api/*` POST (e.g. 10 req/min/IP) in the dashboard; no code change |
| 5 | Low | `api/revenue` | Public, unauthenticated GET that reads `payments` with the service role. Returns aggregates only (no emails/ids), intended for the demo dashboard. | Accepted for demo. After the demo: require a secret header or an admin session |
| 6 | Low | `lib/supabase.ts` | Auth uses `flowType: 'implicit'` (tokens in URL fragment). PKCE is the recommended flow. | Not fixed (auth-flow change; out of pre-demo scope) |
| 7 | Low | `api/checkout` (Payments agent's file) | `siteUrl()` falls back to the request `Host` when `PUBLIC_SITE_URL` is unset; success/cancel URLs could follow a spoofed host. Vercel controls Host, so low. | Report only — make sure `PUBLIC_SITE_URL` is set in Vercel prod |
| 8 | Low | `api/stripe-webhook` (Payments agent's file) | Signature verified on the raw body with `constructEventAsync` (good). Pro is granted by email match when no user id is present, so a buyer who types someone else's email upgrades that account (a gift, not a theft). | Report only, acceptable |
| 9 | Low | dependencies | `npm audit --omit=dev`: 7 high, all transitive through `@astrojs/vercel` (`path-to-regexp` ReDoS in build-time routing utils, `zod` memory exhaustion in `@vercel/cli-config`). npm's suggested fix is a major downgrade; not reachable from user input at runtime as far as checked. | Deferred — re-check after the demo with an adapter update (review by 2026-11-15) |
| 10 | Info | XSS | `set:html` only renders build-time data (JSON-LD, icons, static FAQ/tab content). Client `innerHTML` in `finder.astro` escapes data with `esc()`; `90-day.astro` inserts only formatted dates. No user input reaches HTML unescaped. | OK |
| 11 | Info | secrets | Built static output contains only the publishable key; no `sb_secret_`, service-role, `sk_*`, or `whsec_*` values (the only match is a string literal inside supabase-js). `.env` is gitignored and never committed. | OK |
| 12 | Info | API input handling | All form routes: JSON-only, 16 KB body cap, allowlist validators, 422 with field details, generic `db_error` to clients with details only in server logs, `cache-control: no-store`. Only `POST` (or `GET` for revenue) handlers are exported. | OK |
| 13 | Info | RLS | All 10 tables have RLS, default grants revoked, owner-only policies use `(select auth.uid())`, `owner_email` not granted, writes to `payments`/`bookings`/`profiles.plan` service-role only, SECURITY DEFINER trigger lives in the unexposed `private` schema with `search_path = ''`. | OK |

## What changed

- `app/astro.config.mjs` — small inline integration that prepends one header route to
  `.vercel/output/config.json` after the Vercel adapter writes it (the adapter owns that file and
  `vercel.json` headers are not guaranteed to merge with Build Output API routes). Headers:
  - `Content-Security-Policy`: `default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' blob: data: https://*.supabase.co wss://*.supabase.co; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self' https://checkout.stripe.com; frame-ancestors 'none'; upgrade-insecure-requests`
  - `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`,
    `Permissions-Policy: camera=(), microphone=(), geolocation=(), browsing-topics=()`, `Strict-Transport-Security: max-age=63072000; includeSubDomains`
  - Fonts are self-hosted (fontsource), Stripe Checkout is a full-page redirect, so no third-party script/style origins are needed.
  - `'unsafe-inline'` is needed because Astro inlines small module scripts. Tighten later with Astro's CSP hashing.
- `app/public/sw.js` — skips `/account*`, `VERSION` bumped `v1` → `v2`.

Verified: `npm run build` passes; the built static site served with these exact headers renders the
home-page 3D scene and the finder (Start → step 1) with no CSP violations in the console.
Not verified on a real Vercel deployment — after deploying, run `curl -sI https://<site>/ | grep -i content-security`.

## Proposed SQL (not applied)

### A. Cap public form spam at the database (finding 3)

Simplest option: keep the anon insert (the API uses the publishable key) but reject floods per email.

```sql
create or replace function private.reject_form_flood()
returns trigger
language plpgsql
security definer -- anon has no SELECT on these tables; function lives in the unexposed private schema
set search_path = ''
as $$
declare
  recent int;
begin
  execute format(
    'select count(*) from %I.%I where email = $1 and created_at > now() - interval ''10 minutes''',
    tg_table_schema, tg_table_name)
  into recent using new.email;
  if recent >= 3 then
    raise exception 'too many submissions' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke all on function private.reject_form_flood() from public, anon, authenticated;

create trigger leads_flood before insert on public.leads
  for each row execute function private.reject_form_flood();
create trigger listing_applications_flood before insert on public.listing_applications
  for each row execute function private.reject_form_flood();
create trigger buddy_applications_flood before insert on public.buddy_applications
  for each row execute function private.reject_form_flood();
```

This only limits per-email floods (an attacker can rotate emails). The stronger option after the
demo: move form inserts to the service-role client on the server and revoke anon INSERT entirely:

```sql
revoke insert on public.leads, public.listing_applications, public.buddy_applications from anon, authenticated;
drop policy "leads: anyone can submit" on public.leads;
drop policy "listing_applications: anyone can submit" on public.listing_applications;
drop policy "buddy_applications: anyone can submit" on public.buddy_applications;
```

(This second option requires changing `api/lead.ts`, `api/listing-apply.ts`, `api/buddy-apply.ts`
to use `getSupabaseAdmin()` in the same deploy.)

### B. Revenue dashboard without the service role (finding 5, optional)

If the dashboard should stay public, expose a view of aggregates only and drop the service-role read:

```sql
create view public.revenue_by_segment with (security_invoker = false) as
  select segment, product_id, count(*) as n, sum(amount_usd) as gross_usd, sum(net_revenue_usd) as net_usd
  from public.payments where status = 'paid' group by segment, product_id;
revoke all on public.revenue_by_segment from public, anon, authenticated;
grant select on public.revenue_by_segment to anon, authenticated;
```

## Follow-ups after the demo

1. Vercel Firewall rate-limit rule for `POST /api/*`.
2. Apply proposal A (service-role inserts + revoke anon INSERT).
3. Protect `/api/revenue` (finding 5).
4. Switch Supabase auth to PKCE (finding 6).
5. Replace `'unsafe-inline'` in `script-src` with hashes (Astro `security.csp`).
6. Re-run `npm audit` after updating `@astrojs/vercel`.

## Partner/admin RLS (migration `20261024000001_partner_admin.sql`, 24 Oct 2026)

- **Roles.** `profiles.role` is `user` (default), `partner` or `admin`. Only an admin (or the service role) can change it: `authenticated` has `UPDATE (role)` on `profiles`, but the only update policy requires `public.is_admin()`, so a non-admin updating their own row matches 0 rows. Bootstrap the first admin from the SQL editor: `update public.profiles set role = 'admin' where lower(email) = '...';`.
- **`public.is_admin()`** is `SECURITY DEFINER`, `stable`, `search_path = ''`, executable by `authenticated` only (not `anon`). It answers only about the caller, and the admin UI calls it via `rpc('is_admin')`. The advisor warning "Signed-In Users Can Execute SECURITY DEFINER Function" for it is accepted for that reason. DEFINER is needed so policies on `profiles` can call it without recursing.
- **Partner identity** is the session email (`auth.jwt()->>'email'`, compared with `lower()`), matched against `listings.owner_email`, `agents.owner_email`, `listing_applications.email` and `buddy_applications.email`. Magic-link sign-in means the email is verified. The ownership lookups (`private.my_agent_ids()`, `private.my_listing_ids()`) are DEFINER functions in the unexposed `private` schema, because `owner_email` is never granted to client roles. `authenticated` has `USAGE` on `private` for that reason only. Nothing in `private` is reachable over the Data API.
- **Column limits.** Grants decide the columns and RLS decides the rows. Because grants apply per role, not per policy, two triggers stop a non-admin `authenticated` caller from changing admin-only columns: `listings.active/featured/featured_until` and `leads.agent_id/assigned_at`. The service role (Stripe webhook) is not affected.
  - Partner: can read their own listings (`rpc('my_listings')`, including inactive ones) and update `description`, `price_from` and `url`. Can read leads assigned to their agents and set `status` to `sent`, `won` or `lost` only. Can read their own applications.
  - Admin: can read all profiles, leads, agents, listings, applications and bookings. Can set `role`, application `status`, lead `status`/`agent_id`/`assigned_at`, and listing `active`/`featured`.
- **Not exposed:** `owner_email` (both tables) and `payments` (beyond the existing payer-only policy). Admins can't insert or delete through the client.
- **Verified** with `set role authenticated` + JWT claims for partner, plain user and admin. Each role sees and changes only the rows above. Partner attempts to feature a listing, rename it, reassign a lead or mark it spam all fail.
- **Known limit:** a user who changes their auth email to a partner's address would inherit that partner's rows. Supabase requires confirmation of the new email by default, so keep "Secure email change" on.

### Partner verification (migration `20261024000002_partner_verification.sql`)

Flow: **apply → email confirmed → admin checks identity + licence → approve → role `partner`.**

1. **Apply.** The public form inserts into `listing_applications` or `buddy_applications`. It can set only the whitelisted columns plus `license_no` (TAT licence or business registration no.). `status` is forced to `new`. `verified_identity`, `verified_license`, `review_note`, `reviewed_at` and `reviewed_by` are not insertable by `anon` or `authenticated` (tested: permission denied).
2. **Email confirmed.** Partner identity is the session email, and a session exists only after the magic link is clicked, so only the owner of the inbox can ever act as that partner. `approve_partner` returns `account_confirmed` so the admin can see whether the applicant has signed in yet.
3. **Admin checks.** Only an admin can update `verified_identity`, `verified_license` and `review_note` (column grant plus the admin-only update policy). A trigger stamps `reviewed_at = now()` and `reviewed_by = auth.uid()` on every review or status change.
4. **Approve.** The trigger `private.guard_application()` rejects `status = 'approved'` unless `verified_identity` is true and, for `kind = 'agency'`, `verified_license` is also true. This holds for everyone, the service role included. `public.approve_partner(app_type, app_id)` is a `SECURITY DEFINER` RPC that raises unless `is_admin()`. It approves the application, which still goes through the trigger.
5. **Role `partner`.** `approve_partner` then sets `profiles.role = 'partner'` for the profile with that email. It never demotes an admin. It also sets `owner_email` on unowned `listings` rows, and on `agents` rows for agencies, whose name matches the business name. It never takes over a row someone already owns. An applicant with no account yet gets `partner` on first sign-in, through `private.handle_new_user()`, which checks for an approved application.

An email match alone gives nothing. `private.my_agent_ids()` and `private.my_listing_ids()` also require `profiles.role in ('partner','admin')`, so leads, `my_listings()` and the listing owner policies are empty for a plain `user` with a matching email (tested). Applicants of any role can still read their own applications to follow the status. `approve_partner` is the second accepted "SECURITY DEFINER callable by authenticated" advisor warning: it is admin-gated inside the function.
