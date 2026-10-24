# BUILD PLAN — Thailand Long-Stay App (working name in `app/src/config/site.ts`)

> All for One University · Software track "Make Me Money" · **Submit 25 Oct 2026 12:00–13:30** (internal target 24 Oct 21:00) · Present 25 Oct 19:00 (Thai).
> Deliverables: (1) a link to a working website, (2) a 2-minute .mp4 pitch on Google Drive.
> Scoring: problem 20 · **product completeness 30** · **business model / feasibility 30** · pitch 20 · **+bonus for promoting tourism**.

## 1. Product (English UI)

The app helps digital nomads and long-stay foreigners pick the right Thai visa, apply correctly, and stay legal. Users who stay longer spend more in Thailand, which is the tourism angle.

**Core functions (must work for judges):**
1. **Visa Finder** — a wizard that ranks DTV / LTR / Privilege / Visa-exempt / Retirement for the user's profile, with reasons.
2. **Visa guides** — requirements, cost, documents and steps for each visa. Every fact shows its official source and a "verified on" date.
3. **Stay Tools** — a 90-day report calculator, a visa-expiry and 180-day tax-residency counter, a document checklist tracker, and an .ics calendar export.
4. **Cities** — Bangkok, Chiang Mai and Phuket: cost of living, rent, internet, best months, coworking.
5. **Local Buddies (C2C)** — browse vetted locals and long-term expats, then book a paid 60-minute practical-help session.
6. **Accounts + Pro (B2C)** — magic-link login, then upgrade to Pro through Stripe Checkout (test mode). Pro saves stays, adds reminders, and unlocks the tracker.
7. **Partners (B2B)** — coworking spaces, coliving operators and licensed agencies apply for featured listings through Stripe. Visitors can send a "Get expert help" lead form to licensed agents.
8. Pricing, About/Method, Legal (disclaimer, affiliate disclosure, PDPA/privacy). Installable PWA.

## 2. Business model

| Segment | Revenue stream | Price (draft) | Why it is real |
| --- | --- | --- | --- |
| **B2C** | Pro subscription | $6/mo or $39/yr | Reminders and a tracker for a problem with legal stakes (fines, overstay) |
| B2C → partner | Insurance affiliate (SafetyWing ~10% recurring, Genki 5–10%) | commission | Recurring; insurance is required for DTV/LTR-type stays |
| B2C → partner | eSIM affiliate (Airalo 10%) | commission | Every arrival needs data |
| **B2B** | Featured listings (coworking, coliving, condos) | $49/mo | Directory norm $50–250/mo |
| B2B | Lead-gen to licensed visa agents/law firms | $40–110 per qualified lead, or $199/mo verified partner | Agents already charge 3k–55k THB; the hub only refers, never files visas (regulated) |
| B2B (phase 2) | Team plan / API for HR and relocation firms | $299/mo | Companies relocating remote staff |
| **C2C** | Local Buddies marketplace: 60-min sessions at $25–60 | platform keeps 20% | Practical help (apartment viewing, opening a bank account, city orientation), not legal advice |

Costs: Supabase free → $25/mo, Vercel free → $20/mo, domain ~$12/yr, Stripe fees per transaction, plus content upkeep (verifying visa rules monthly).
Modeled revenue (research, not a forecast): ~10k visits/mo ≈ $300–800/mo; ~50k ≈ $2,000–5,000/mo.
Full model + pitch numbers: `docs/business-model.md` (Business agent).

## 3. Tech stack

- **Astro 7** (static pages, good SEO) + vanilla TS islands + **@astrojs/vercel** adapter for API routes (`export const prerender = false`).
- **Supabase** project `longstay-th` (ref `eydalrefulzulohhthcp`, ap-southeast-1): Auth (magic link), Postgres, RLS.
- **Stripe** Checkout + webhook in test mode.
- **GSAP** (+ScrollTrigger) for motion; **three.js** hero rendering a `.glb` modelled in **Blender** via MCP.
- PWA: manifest + service worker (offline guides/tools).
- Deploy: **Vercel**. Flow/wireframes: **Miro** board https://miro.com/app/board/uXjVEWEwo1M=/
- Contracts: `app/src/types/contracts.ts` (data shapes) and `app/src/config/site.ts` (brand, nav). Only the main agent changes them.

## 4. Site map

```
/                      Home (3D hero, how it works, finder CTA, trust/sources, cities, pricing teaser)
/finder                Visa Finder wizard → results on same page
/visas                 All visas compared
/visas/[slug]          dtv · ltr · privilege · visa-exempt · retirement
/tools                 Stay Tools hub
/tools/90-day          90-day report calculator (+ .ics)
/tools/stay-counter    Visa expiry + 180-day tax residency counter
/tools/checklist       Document checklist tracker (local; synced for Pro)
/cities, /cities/[slug] bangkok · chiang-mai · phuket
/buddies               C2C marketplace list (+ filters)
/buddies/[id]          Buddy profile + book & pay
/buddies/join          Become a buddy (application)
/partners              B2B: list your space / become a verified agent (+ checkout)
/experts               Get expert help (lead form → licensed agents)
/pricing               B2C Free vs Pro · B2B plans · C2C commission
/account               Login (magic link), plan status, saved stays, reminders
/revenue               Public demo revenue dashboard (GET /api/revenue: B2C/B2B/C2C totals, recent payments)
/about, /legal         Method & sources · disclaimer · affiliate disclosure · privacy (PDPA)
/api/checkout, /api/stripe-webhook, /api/lead, /api/buddy-apply, /api/listing-apply
```

## 5. Agent team and file ownership

The main agent plans, writes the contracts, integrates, reviews, and owns git. Each subagent writes only its own paths.

| Wave | Agent | Owns | Skills to load |
| --- | --- | --- | --- |
| 1 | **UX** | Miro board, `docs/ux-flow.md` | Miro canvas composer skill, `ui-ux-pro-max`, `site-architecture`, `onboarding`, `signup` |
| 1 | **UI / Design system** | `app/src/styles/**`, `app/src/components/ui/**`, `app/src/layouts/**`, `docs/design.md` | `design-taste-frontend`, `impeccable`, `ui-ux-pro-max`, `baseline-ui`, `fixing-accessibility` |
| 1 | **Content / Data** | `app/src/data/**` (except `products.ts`) | `source-driven-development`, `copywriting`, `schema`, `ai-seo` |
| 1 | **DB / Backend** | `supabase/**`, `app/src/lib/**`, `app/src/pages/api/**`, `docs/backend.md` | `supabase`, `supabase-postgres-best-practices`, `security-and-hardening`, `api-and-interface-design` |
| 1 | **3D / Motion** | `blender/**`, `app/public/models/**`, `app/src/scripts/**` | Blender MCP, `gsap-core`, `gsap-scrolltrigger`, `gsap-timeline`, `gsap-performance`, `fixing-motion-performance` |
| 1 | **Business / Pitch (Thai)** | `docs/business-model.md`, `app/src/data/products.ts`, `docs/pitch/**` | `pricing`, `offers`, `product-marketing`, `marketing-plan`, `copywriting` |
| 2 | **Frontend A** (core) | home, finder, visas, tools, cities pages + their components | `frontend-ui-engineering`, `incremental-implementation`, `fixing-metadata`, `fixing-accessibility` |
| 2 | **Frontend B** (money) | buddies, partners, experts, pricing, account, legal pages | `frontend-ui-engineering`, `cro`, `paywalls`, `signup`, `pricing` |
| 3 | **QA / Deploy** | tests, fixes via main, Vercel deploy | `browser-testing-with-devtools`, `verification-before-completion`, `deploy-to-vercel`, `seo-audit`, `shipping-and-launch` |
| 3 | **Video** | `docs/pitch/video/**` (2-min mp4) | `remotion`, `video` |

Main agent: `task-observer`, `dispatching-parallel-agents`, `verification-before-completion`.

## 6. Timeline

| When | What |
| --- | --- |
| 23 Oct evening | Wave 1 (6 agents in parallel) |
| 23 Oct night → 24 Oct morning | Wave 2 frontend integration, first deploy |
| 24 Oct day | Wave 3 QA, polish, 3D/animation, video, pitch deck |
| **24 Oct 21:00** | Internal deadline: site live + video + docs |
| 25 Oct 12:00–13:30 | Official submission (cannot edit after) |
| 25 Oct 19:00 | Present (Thai) |

## 7. Needs from the user

- **Stripe test keys:** create a free Stripe account, switch to Test mode, then paste `STRIPE_SECRET_KEY` into `app/.env`. The webhook secret comes after deploy.
- **Supabase secret key:** `SUPABASE_SERVICE_ROLE_KEY` from Dashboard → Project Settings → API keys, pasted into `app/.env`.
- **Final project name** (placeholder "Yoo Yaao").
