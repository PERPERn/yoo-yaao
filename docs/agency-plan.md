# Partner Portal and Admin Dashboard: plan (24 Oct 2026)

Goal: the site currently has only the traveller side. This plan adds a portal for **service providers (partners)** and a separate **admin dashboard**. Together they close the B2B/C2C loop for the business-model score.

## Who uses what

| Role | Who | Page | What they can do |
|---|---|---|---|
| user | Nomads / travellers | the existing site | Finder, tools, Pro, booking buddies |
| partner | Visa agencies (licensed), coworking/coliving, Local Buddies | `/partner/*` | See their application status, edit their listing, see leads sent to them and mark won/lost, see bookings and payouts (buddies), pay for the featured listing ($49/month, existing checkout) |
| admin | Our team | `/admin/*` (separate layout, `noindex`) | Approve or reject listing and buddy applications, triage leads and assign them to an agent, toggle featured/active on listings, view revenue (reuse `/revenue`), set user roles |

## Data contract (agents B and C write their code against this; agent A builds it)

- `profiles.role text not null default 'user' check (role in ('user','partner','admin'))`. Only the service role / admin can change it.
- `public.is_admin()` is a `security definer stable` function: `exists(select 1 from profiles where id = auth.uid() and role = 'admin')`.
- `leads.agent_id uuid null references agents(id)` and `leads.assigned_at timestamptz`.
- `agents.owner_email text` (private, same as `listings.owner_email`).
- Partner identity = the email of the signed-in session (`auth.jwt()->>'email'`), matched against:
  - `listings.owner_email`
  - `agents.owner_email`
  - `listing_applications.email`
  - `buddy_applications.email`
- RLS (no service-role key needed, because that key isn't set yet). Every policy below is for the `authenticated` role:
  - A partner can select and update their own `listings` row (only `description`, `price_from`, `url`). An admin can do everything.
  - A partner can select `leads` where `agent_id` is in their own agents rows, and can update only `status` to sent/won/lost. An admin can do everything.
  - A partner can select their own `listing_applications` / `buddy_applications` (by email). An admin can select and update `status`.
  - An admin can select `bookings`. A buddy partner is out of scope in the MVP (buddy_id is a demo text id).
- The client uses `supabase` from `app/src/lib/supabase.ts` with the user's session. Never ship the service-role key to the client.
- **Demo mode**: judges have no account. Every page in `/partner` and `/admin` without a session shows a "Demo view — sample data" banner (unmissable) with sample data from `app/src/data/demo-ops.ts`. Nothing is written to the database.

## Work split (at most 3 agents at once)

| Agent | Owns | Key skills |
|---|---|---|
| **A: DB/Backend** | `supabase/migrations/*_partner_admin.sql` (applied through the Supabase MCP), `app/src/lib/ops.ts` (typed queries for partner/admin), `app/src/data/demo-ops.ts` (sample data), `docs/security.md` (append) | supabase, supabase-postgres-best-practices, security-and-hardening, ponytail |
| **B: Partner portal** | `app/src/pages/partner/**`, `app/src/components/partner/**` | interface-design, impeccable, onboarding, fixing-accessibility, emil-design-eng, ponytail |
| **C: Admin dashboard** | `app/src/pages/admin/**`, `app/src/components/admin/**`, `app/src/layouts/Admin.astro` | interface-design, dataviz, impeccable, fixing-accessibility, security-and-hardening, ponytail |
| Main (me) | Plan, contract, link from `/partners` and the footer, reviewing work against real files, commits, deploy | verification-before-completion, dispatching-parallel-agents, requesting-code-review |

Order:
1. A writes the migration and `ops.ts`/`demo-ops.ts` first. B and C start at the same time against the contract above, using demo data.
2. When A is done, B and C connect to the real queries.
3. A QA/security agent reviews the RLS and the pages. Then commit and deploy.

## Out of scope (MVP)

- Payouts to buddies for real (Stripe Connect).
- Notification emails to partners.
- Bulk CSV.
- Audit log.
