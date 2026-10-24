# Backend: Supabase + Stripe

Supabase project `longstay-th` (ref `eydalrefulzulohhthcp`, ap-southeast-1). Stripe runs in **test mode**.
The demo flow for judges is: sign up with a magic link, pay with Stripe Checkout, then see the revenue recorded (`payments` table and `GET /api/revenue`).

## Files

| File | Runs on | Purpose |
| --- | --- | --- |
| `supabase/migrations/20261023000001_init_schema.sql` | DB | Tables, RLS, grants, signup trigger (already applied to the project) |
| `app/src/lib/supabase.ts` | browser | Publishable-key client and auth/data helpers |
| `app/src/lib/server-env.ts` | server | Runtime secrets (`astro:env` `getSecret`), anon server client, JSON and validation helpers |
| `app/src/lib/supabase-admin.ts` | server | Service-role client. Throws `AdminNotConfiguredError` if the key is missing |
| `app/src/lib/stripe.ts` | server | `getStripe()` returns a Stripe client, or `null` when it isn't configured |
| `app/src/pages/api/*.ts` | server (Vercel function) | `checkout`, `stripe-webhook`, `lead`, `buddy-apply`, `listing-apply`, `revenue` |

Never import `supabase-admin.ts`, `stripe.ts` or `server-env.ts` from code that runs in the browser.

## Schema

| Table | Key columns | Written by |
| --- | --- | --- |
| `profiles` | `id` → `auth.users`, `email`, `plan` (`free`/`pro`), `pro_until`, `stripe_customer_id` | Signup trigger; plan fields only by the webhook (service role) |
| `stays` | `user_id`, `visa_type`, `entry_date`, `expiry_date`, `last_report_date` (90-day report), `city`, `note` | The user (RLS) |
| `checklist_items` | `user_id`, `visa_slug`, `item`, `done`; unique `(user_id, visa_slug, item)` | The user (RLS) |
| `leads` | `name`, `email`, `nationality`, `visa_slug`, `city`, `message`, `source`, `status` | Anyone, insert only |
| `agents` | `name`, `company`, `license_no`, `cities[]`, `languages[]`, `services[]`, `website`, `verified` | Admin (dashboard) |
| `listings` | `kind`, `name`, `city`, `url`, `featured`, `featured_until`, `owner_email` (private), `active`; unique `(owner_email, name)` | Admin and the webhook |
| `listing_applications` | `business_name`, `kind`, `city`, `url`, `contact_name`, `email`, `message`, `status` | Anyone, insert only |
| `buddy_applications` | `full_name`, `email`, `city`, `languages[]`, `services[]`, `bio`, `price_usd`, `status` | Anyone, insert only |
| `bookings` | `buddy_id` (text), `user_id`, `customer_email`, `session_at`, `amount_usd`, `platform_fee_usd`, `buddy_payout_usd` (generated), `stripe_session_id` unique, `status` | Webhook only |
| `payments` | `user_id`, `email`, `product_id`, `segment`, `amount_usd`, `net_revenue_usd`, `stripe_session_id` unique, `status` | Webhook only |

On `payments`, `net_revenue_usd` is the platform's own revenue. It equals the full amount for B2C and B2B, and only the 20% commission for C2C.

Trigger `on_auth_user_created` calls `private.handle_new_user()`, which inserts a `profiles` row. The function is `SECURITY DEFINER`, but it sits in the unexposed `private` schema with `EXECUTE` revoked, so the API cannot call it.

## RLS and grants

- RLS is **enabled on all 10 tables**. Default privileges that auto-expose new `public` tables to `anon`/`authenticated` are revoked. Every grant is explicit.
- **Own rows only:**
  - `stays` and `checklist_items` allow full CRUD where `auth.uid() = user_id`. UPDATE policies have both `USING` and `WITH CHECK`, so a user cannot move a row to another user.
  - `profiles`, `payments` and `bookings` are **select-only** for the owner. A user can't make themselves Pro.
- **Anonymous insert:** `leads`, `listing_applications` and `buddy_applications` grant `INSERT` on whitelisted columns only. `status` is not writable, and the policy also enforces `status = 'new'`. CHECK constraints validate email format, lengths, enums and price range. These tables have no public read.
- **Public read:**
  - `agents` where `verified`.
  - `listings` where `active`.
  - Both use column-level grants. `listings.owner_email` is not readable, so query explicit columns (`select('id,name,kind,city,url,featured,…')`), because `select('*')` returns 401/42501 for `anon`.
- **Service role only:** writes to `payments`, `bookings`, `profiles.plan/pro_until`, `listings`, and all admin reads. The service role bypasses RLS and is only used inside `/api/stripe-webhook` and `/api/revenue`.

The policies were tested in a rolled-back transaction:
- `anon` can insert a lead but cannot read leads.
- User A sees 1 profile and 1 stay, and the checklist upsert toggles correctly.
- User B sees 0 of A's stays and only their own profile.

### Advisors (after migration)

- **Security:** 0 findings.
- **Performance:** only `unused_index` (INFO) on 8 indexes. This is expected on an empty database. They are FK and filter indexes (`stays.user_id`, `payments.user_id`, …), so keep them.

## API contract

Every error has the same shape: `{ "error": "<code>", "details"?: { field: message } }`. All responses are `application/json` with `cache-control: no-store`.

| Status | `error` | When |
| --- | --- | --- |
| 400 | `invalid_json` | Body isn't a JSON object, is over 16 KB, or the content-type is wrong |
| 422 | `validation_failed` | `details` lists the bad fields |
| 503 | `payments_not_configured` | `STRIPE_SECRET_KEY` (or the webhook secret) is missing |
| 503 | `database_not_configured` | Supabase URL or key is missing |
| 500 / 502 | `db_error` / `checkout_failed` | Upstream failure. Details are logged on the server only |

The three form routes accept a hidden honeypot field `website`. If it is filled, they return 201 without saving anything.

### `POST /api/checkout`

Request:
```jsonc
{
  "productId": "pro_monthly" | "pro_yearly" | "listing_featured" | "buddy_session",
  "email": "a@b.com",          // optional; prefilled in Checkout
  "buddyId": "nok-bkk",        // required for buddy_session
  "priceUsd": 35,              // buddy_session only, 10–200; ignored when src/data/buddies.ts exists (server uses that price)
  "sessionAt": "2026-11-02T10:00:00+07:00", // optional, buddy_session
  "listingName": "Hubba Coworking", // required for listing_featured
  "listingKind": "coworking",  // optional: coworking|coliving|agency|insurance|esim
  "listingCity": "bangkok"     // optional: bangkok|chiang-mai|phuket
}
```
Optional header: `Authorization: Bearer <supabase access_token>`. Get the token from `getAccessToken()` in `lib/supabase.ts`. **Send it for Pro**, so the payment is linked to the profile directly. Without it, the webhook matches the profile by email.

Response `200`: `{ "url": "https://checkout.stripe.com/...", "id": "cs_test_..." }`. Redirect with `location.href = url`.

- **Mode:** Pro and listing use `subscription` mode (monthly or yearly `price_data`). A buddy session uses `payment` mode. Currency is USD; the price comes from `data/products.ts`.
- **Metadata:** `productId`, `segment`, `userId`, `email`, `buddyId`, `amountUsd`, `platformFeeUsd`, `platformFeeRate`, `listingName`/`Kind`/`City` and `sessionAt`. It is set on the Checkout Session and also on the subscription or payment intent.
- **Redirects:** success goes to `/account?checkout=success&session_id={CHECKOUT_SESSION_ID}`; cancel goes to `/pricing?checkout=cancel`. The base is `PUBLIC_SITE_URL`, or the request origin when that is unset.

### `POST /api/stripe-webhook`

This route is called by Stripe only. It verifies `stripe-signature` against the raw body using `STRIPE_WEBHOOK_SECRET`. It handles `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Other events return `200 {received:true, ignored}`.

1. **Upsert `payments`** on `stripe_session_id`, which makes it idempotent.
2. **Pro:** sets `profiles.plan='pro'` and `pro_until = max(current, session.created + 1 month/year)`, and stores `stripe_customer_id`.
3. **Listing:** upserts `listings` on `(owner_email, name)` with `featured=true` and `featured_until = created + 1 month`. It also marks the matching `listing_applications` row as `paid`.
4. **Buddy session:** inserts `bookings` with `amount_usd` and `platform_fee_usd = amount × PLATFORM_FEE_RATE (0.2)`. `buddy_payout_usd` is generated.

Responses:
- `200 {received:true}`.
- `400 invalid_signature` / `missing_signature`.
- `503` when Stripe or the service role is not configured. Stripe retries a 503.
- `500` on a database error. Stripe retries this too.

### `POST /api/lead`
Request: `{ name*, email*, nationality?, visaSlug?, city?, message? (≤2000), source? }`. Response: `201 { "ok": true }`.

### `POST /api/buddy-apply`
Request: `{ fullName*, email*, city* (bangkok|chiang-mai|phuket), languages?: string[] | "a, b", services?: string[] | "a, b", bio?, priceUsd? (10–200) }`. Response: `201 { "ok": true }`.

### `POST /api/listing-apply`
Request: `{ businessName*, kind* (coworking|coliving|agency|insurance|esim), city?, url? (http/https), contactName?, email*, message? }`. Response: `201 { "ok": true }`.

The three form routes insert with the **publishable key**, so RLS and column grants are the security boundary. They do not need the service role.

### `GET /api/revenue`
```jsonc
{
  "configured": true,              // false (all zeros) until SUPABASE_SERVICE_ROLE_KEY is set
  "currency": "usd",
  "total":     { "grossUsd": 80, "netUsd": 62, "count": 3 },
  "bySegment": { "B2C": {…}, "B2B": {…}, "C2C": {…} },
  "byProduct": { "pro_monthly": {…}, "pro_yearly": {…}, "listing_featured": {…}, "buddy_session": {…} },
  "recent":    [{ "productId", "segment", "amountUsd", "netUsd", "createdAt" }],  // last 10, no emails
  "updatedAt": "ISO"
}
```
The response contains totals only and no personal data. It is public on purpose for the demo dashboard.

## Browser helpers (`app/src/lib/supabase.ts`)

`supabase` is the client, or `null` when it is not configured. The helpers:
- `getSession()`
- `getAccessToken()`
- `signInWithMagicLink(email, redirectTo?)`: the default redirect is `${origin}/account`.
- `signOut()`
- `onAuthChange(cb)`
- `getProfile()`: returns `{id, email, plan, proUntil, isPro}` or `null`.
- `saveStay(input)`: creates a stay, or updates it when `id` is passed.
- `listStays()`
- `deleteStay(id)`
- `toggleChecklistItem(visaSlug, item, done)`
- `listChecklist(visaSlug?)`

Helpers throw on errors. Read helpers return `[]` or `null` when the user is signed out. Auth uses the implicit flow, so a magic link still works when it is opened in a different browser or device.

## Environment variables

| Var | Where | Value |
| --- | --- | --- |
| `PUBLIC_SUPABASE_URL` | browser and server | `https://eydalrefulzulohhthcp.supabase.co` (already set) |
| `PUBLIC_SUPABASE_PUBLISHABLE_KEY` | browser and server | `sb_publishable_…` (already set) |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | Supabase secret key `sb_secret_…` (or the legacy `service_role` JWT) |
| `STRIPE_SECRET_KEY` | **server only** | `sk_test_…` |
| `STRIPE_WEBHOOK_SECRET` | **server only** | `whsec_…` |
| `PUBLIC_SITE_URL` | server | `http://localhost:4321` locally, the Vercel URL in production |

Secrets are read at runtime through `getSecret()` from `astro:env/server`, so they are never inlined into the build. Put them in `app/.env` locally, which is gitignored. On Vercel, add them under **Project → Settings → Environment Variables** for Production and Preview, then redeploy.

### Get the Supabase secret key
1. Open https://supabase.com/dashboard/project/eydalrefulzulohhthcp/settings/api-keys
2. In **Secret keys**, click **Create new secret key** if none exists, then **Reveal** and copy the `sb_secret_…` value. The legacy `service_role` key from the "Legacy API Keys" tab also works.
3. Paste it as `SUPABASE_SERVICE_ROLE_KEY=` in `app/.env` and in Vercel. Never give it a `PUBLIC_` prefix.

### Get a Stripe test key
1. Create a free account at https://dashboard.stripe.com/register. No business verification is needed for test mode.
2. Turn on **Test mode** (toggle in the top right).
3. Go to **Developers → API keys**: https://dashboard.stripe.com/test/apikeys
4. Copy the **Secret key** `sk_test_…` into `STRIPE_SECRET_KEY` in `app/.env` and in Vercel.

## Register the webhook

**After deploying to Vercel:**
1. Go to Stripe (Test mode) → **Developers → Webhooks → Add endpoint**: https://dashboard.stripe.com/test/webhooks
2. Set the endpoint URL to `https://<your-vercel-domain>/api/stripe-webhook`.
3. Select the events `checkout.session.completed` and `checkout.session.async_payment_succeeded`.
4. Open the endpoint, click **Reveal signing secret**, and copy `whsec_…` into `STRIPE_WEBHOOK_SECRET` in Vercel. Redeploy.

**Locally, with the Stripe CLI:**
```bash
brew install stripe/stripe-cli/stripe && stripe login
stripe listen --forward-to localhost:4321/api/stripe-webhook   # prints a whsec_… → put it in app/.env, restart `npm run dev`
```

## Test a payment
1. Sign in at `/account` with a magic link, using a real inbox.
2. Start an upgrade on `/pricing`. The page calls `POST /api/checkout` with the Bearer token.
3. In Stripe Checkout, pay with card **4242 4242 4242 4242**, any future expiry (for example 12/34), any CVC and any ZIP.
4. You are redirected to `/account?checkout=success`. `getProfile()` now returns `isPro: true`; the webhook usually arrives within about 1 s, so poll once or twice.
5. Check `GET /api/revenue`, or Supabase → Table Editor → `payments`.

More test cards: `4000 0000 0000 9995` (declined) and `4000 0025 0000 3155` (3-D Secure).

## Supabase Auth settings

Dashboard → **Authentication → URL Configuration**: https://supabase.com/dashboard/project/eydalrefulzulohhthcp/auth/url-configuration
- **Site URL:** `https://longstay-th.vercel.app`, or your production domain.
- **Redirect URLs:** add all of these.
  - `http://localhost:4321/**`
  - `https://longstay-th.vercel.app/**`
  - `https://*-<your-vercel-team>.vercel.app/**`, for preview deploys.

Under **Authentication → Sign In / Providers → Email**, keep Email enabled. The built-in mailer is rate-limited to a few emails per hour, so for the live demo either sign in once in advance or set up custom SMTP (for example Resend) under **Authentication → Emails → SMTP Settings**.

## Known limits

- **Renewals:** Pro and listing renewals (`invoice.paid`) are not processed. `pro_until` covers the first period, which is enough for the demo. To support renewals, add `invoice.paid` handling to extend `pro_until`.
- **Rate limiting:** there is no rate limit on the public form routes beyond the honeypot and Supabase's own limits. Add Vercel Firewall rules if spam appears.
- **Admin:** approving buddies and agents is manual in the Supabase Table Editor (`buddy_applications.status`, `agents.verified`).
