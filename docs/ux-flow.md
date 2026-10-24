# UX Flow Spec: Thailand Long-Stay App

> Owner: UX agent. Frontend A and Frontend B build from this file.
> Sources: `BUILD-PLAN.md` §1, §2, §4 · `app/src/types/contracts.ts` · `app/src/config/site.ts` · `app/src/data/products.ts`.
> Visual reference: Miro board https://miro.com/app/board/uXjVEWEwo1M=/ (Sitemap, User Flows, Mobile Wireframes).
> Brand name comes from `SITE.name`. Never hardcode it. In this file it is written as **{Brand}**.
> **Prices:** every page reads prices from `app/src/data/products.ts` (`getProduct()`, `PLATFORM_FEE_RATE`). Never hardcode them. The amounts in this file are examples of the current values: Pro $8/mo or $59/yr ("Save 38%"), Featured listing $49/mo (founding-partner price), buddy sessions $25–60 with a 20% platform fee.

---

## 0. Global rules (apply to every page)

### 0.1 Mobile-first layout
- Design at **360px** first, then 768px and 1024px+. Single column under 768px. No horizontal scroll at any width.
- Side gutter is 16px on mobile and 24px on tablet. Content max-width is 1120px, and 720px for long reading text (visa guides, legal).
- Touch targets are at least **44×44px**, with 8px or more between them.
- Body text 16px, line-height 1.5. Never below 14px, except legal footnotes at 13px.
- **Sticky bottom CTA bar** on mobile for pages with one main conversion action: finder result, visa guide, buddy profile, pricing, partners. Leave room for the iOS safe area (`env(safe-area-inset-bottom)`).
- Respect `prefers-reduced-motion`: GSAP reveals become instant, and the 3D hero is replaced by a static poster image.

### 0.2 Navigation
- **Header (desktop):** logo (links to `/`) · the `NAV` items from `site.ts` (Visa Finder, Visas, Stay Tools, Cities, Local Buddies, Pricing) · on the right, "Log in" (text link) or an avatar, then a primary button **"Find my visa"** (links to `/finder`). When the user is on `/finder`, that button becomes "Go Pro" (links to `/pricing`).
- **Header (mobile):** logo, a "Find my visa" button (small), and a hamburger (44px, `aria-label="Open menu"`). The menu is a full-height sheet that lists the NAV items, then "For partners", "Get expert help", and "Log in / Account". It closes on Esc, on the X button, and when a link is chosen. Trap focus while it is open.
- **Mobile bottom tab bar** (an optional PWA feel, shown only under 768px when the app runs installed in `display-mode: standalone`): Home · Finder · Tools · Buddies · Account. That is 5 items, the maximum.
- **Footer**, in 4 columns that stack on mobile:
  - *Plan:* Visa Finder, Compare visas, Cities, Stay Tools
  - *Get help:* Local Buddies, Become a buddy, Get expert help
  - *Business:* For partners, Pricing, Revenue (live demo)
  - *About:* Method & sources, Legal & privacy, Affiliate disclosure, Contact (`SITE.supportEmail`)
  - Bottom line: "{Brand} gives general information, not legal advice. Always confirm with the Thai embassy or immigration office." (links to `/legal#disclaimer`)
- **Breadcrumbs** on every page at L2 or deeper (`/visas/dtv` shows Home › Visas › DTV). Use `<nav aria-label="Breadcrumb">` and BreadcrumbList schema.

### 0.3 Trust pattern (product-wide)
- Every visa or city fact block ends with a **SourceNote**: "Source: {label} ↗ · Verified {verifiedAt as 'Oct 2026'}". Primary sources get a small "Official" tag.
- If `verifiedAt` is older than 90 days, show an amber "May be out of date" note next to the date.
- Affiliate links (`Listing.affiliate === true`) get a visible **"Paid link"** label next to the link, which links to `/legal#affiliate`.

### 0.4 Shared states
| State | Pattern |
|---|---|
| Loading (data or API) | Skeleton blocks that match the final layout (no spinners for page content). Buttons show an inline spinner and a "…ing" label, and are disabled while busy. |
| Empty | An icon, one sentence that explains the area, and a primary action. Never a blank area. |
| Error (network/API) | An inline alert (`role="alert"`) beside the failed area: "Something went wrong. {specific cause}." plus a **Try again** button. Keep whatever the user typed. |
| Offline (PWA) | A top banner: "You're offline. Guides and tools still work; payments and booking need a connection." Disable payment buttons and show the reason. |
| Form field error | A red message under the field, linked with `aria-describedby`. Validate on blur and on submit. On submit, focus the first invalid field. |
| Payment return | `?checkout=success`: a success toast and the updated state. `?checkout=cancel`: a neutral notice, "Payment cancelled — you weren't charged." |

### 0.5 Shared components (UI agent builds them in `components/ui/`; this is the list pages need)
`Button` (primary/secondary/ghost, sizes md/lg) · `Card` · `Badge` (verdict: great-fit=green, possible=amber, not-eligible=grey, always with a text label, never color alone) · `SourceNote` · `Stepper/ProgressBar` · `Field` (label, hint, error) · `Select` with search (countries) · `Alert` · `Toast` · `Skeleton` · `EmptyState` · `Tabs` · `Accordion` · `PriceCard` · `StickyCTA` · `Modal/Sheet` · `Breadcrumbs` · `StatTile` · `Avatar` · `Rating` (stars plus a number, e.g. "4.9 (32)").

---

## 1. Routes

Each route lists: **Purpose**, **Sections** (top to bottom), **Components**, **Primary CTA**, **States**, and **Mobile notes**.

### 1.1 `/` Home
- **Purpose:** in 5 seconds, explain what {Brand} does and push visitors into the Visa Finder.
- **Sections:**
  1. **Hero.** H1 `SITE.tagline` ("Stay longer in Thailand — legally, easily."), subline `SITE.description`, primary button **"Find my visa in 2 minutes"** (to `/finder`), secondary link "Compare all visas" (to `/visas`). The three.js `.glb` sits on the right on desktop and below the copy on mobile, with a fixed aspect-ratio box so the layout does not shift (no CLS).
  2. **Trust strip.** "Facts checked against official Thai sources · Updated monthly · Not legal advice". Three small icons.
  3. **How it works** (3 steps): ① Answer 6 questions ② Get your best-fit visa and checklist ③ Stay legal with reminders. Each step links to `/finder`, `/visas` and `/tools` in turn.
  4. **Visa cards row.** 5 cards (DTV, LTR, Privilege, Visa-exempt, Retirement): shortName, one-line summary, stay length, cost. Each links to `/visas/[slug]`. Horizontal snap-scroll on mobile (this is the single allowed exception to the no-horizontal-scroll rule; it is a carousel inside the page, not page overflow), and a grid on desktop.
  5. **Stay Tools teaser.** A mini 90-day calculator (one date input that shows the next report date) with the CTA "Open Stay Tools".
  6. **Cities.** 3 photo cards: name, budget per month, internet Mbps. Each links to `/cities/[slug]`.
  7. **Local Buddies teaser.** 3 buddy cards with the CTA "Meet a Local Buddy" (to `/buddies`).
  8. **Pricing teaser.** Free vs Pro in two columns. CTA "See Pro" (to `/pricing`).
  9. **Partner strip.** "Run a coworking, coliving or visa agency? Get featured." (to `/partners`).
  10. Footer.
- **Primary CTA:** Find my visa (shown in the hero and repeated in the sticky header).
- **States:** if the 3D model fails or WebGL is missing, show a static poster image. The page itself is static (SSG).
- **Mobile:** the hero copy and CTA must sit above the fold at 360×640. Load the 3D model lazily after first paint.

### 1.2 `/finder` Visa Finder (wizard, results on the same page)
- **Purpose:** turn a user profile (`FinderInput`) into a ranked list of `FinderResult[]`.
- **Sections:** an intro card ("6 quick questions · about 2 minutes · nothing is saved unless you log in"), then **Start**, then a stepper with one question per screen (see §3), then **Results**.
- **Components:** `Stepper` ("Step 2 of 6" plus a progress bar), `Field`, country `Select`, radio cards for purpose, number inputs with prefixes, Back/Next buttons.
- **Results section:**
  - Header: "Your best fit: **{top shortName}**" with the score ring (0–100) and the verdict badge.
  - A ranked list of all 5 `FinderResult`, each as a card: verdict badge, score bar, `reasons[]` as a bullet list (✓ fit / ✕ blocker, using icons plus text), and the button "Read the {shortName} guide" (to `/visas/[slug]`).
  - Not-eligible cards are collapsed by default ("Show 2 visas you don't qualify for").
  - **Next steps box:** "Get the document checklist" (to `/tools/checklist?visa=slug`) · "Plan your 90-day reports" (to `/tools/90-day`).
  - **Pro upsell card:** "Save this result and get reminders before every deadline. **Go Pro — $8/mo**" (to `/pricing`, or straight to checkout when logged in).
  - **Expert help card:** "Complex case? Talk to a licensed visa agent." (to `/experts?visa=slug`).
  - "Edit answers" link (back to step 1, answers kept) · "Start over".
- **Primary CTA:** during the wizard, **Next**. On results, **"Read the {top} guide"**.
- **States:** keep answers in `sessionStorage` so a refresh does not lose them. Results are computed on the client, and the result area shows a skeleton for at most 300ms. If every visa comes back not-eligible, show the empty state: "No long-stay visa fits yet. Visa-exempt entry may still work for short trips — or talk to an expert." with CTAs to Visa-exempt and to `/experts`.
- **Mobile:** one question per screen. The Next button is sticky at the bottom. Use `inputmode="numeric"` for numbers. Move focus to the question heading on each step change. Reflect the step in the URL hash (`#step-3`) so the browser Back button works.

### 1.3 `/visas` All visas compared
- **Purpose:** compare all 5 visas side by side.
- **Sections:** H1 "Thai long-stay visas compared" · a short intro · a **comparison table** (desktop) or **stacked cards** (mobile) with these rows: best for, stay per entry, validity, cost, minimum income, minimum savings, minimum age, remote work allowed · a "Not sure? Take the Visa Finder" banner · a SourceNote for each column.
- **Primary CTA:** "Find my visa" (to `/finder`). Each column or card has "Full guide".
- **States:** static. If a value is missing, show "—" with the tooltip "Not required".
- **Mobile:** the table becomes cards. Don't use a horizontally scrolling table on phones. An optional "Compare 2" picker can follow later.

### 1.4 `/visas/[slug]` Visa guide (dtv · ltr · privilege · visa-exempt · retirement)
- **Purpose:** everything needed to apply for one visa, with sources.
- **Sections:**
  1. Breadcrumbs. H1 `name`. `summary`. Badges taken from `bestFor`.
  2. **Key facts** as 4 `StatTile`s: stay per entry · validity · cost · extendable.
  3. **Am I eligible?** The eligibility list, then the CTA "Check with the Visa Finder".
  4. **Documents checklist.** `documents[]` as checkboxes (they save to localStorage) and the CTA "Track this checklist" (to `/tools/checklist?visa=slug`).
  5. **How to apply.** `steps[]` as a numbered vertical timeline.
  6. **Gotchas.** `gotchas[]` in an amber callout ("Common mistakes").
  7. **Sources.** The `sources[]` list and "Verified {date}".
  8. **Get help.** Two cards: "Talk to a licensed agent" (to `/experts?visa=slug`) · "Book a Local Buddy for practical help" (to `/buddies`).
  9. **Affiliate block** (DTV/LTR/Retirement only): "Insurance you may need" — a SafetyWing/Genki listing with the "Paid link" label.
  10. Related visas (2 cards).
- **Primary CTA:** a sticky bottom bar on mobile, **"Save this visa & get reminders"** (logged out → `/account?next=/visas/slug&intent=pro`; Free user → `/pricing`; Pro → saves to the account).
- **States:** an unknown slug returns a 404 page that offers the list of 5 visas.
- **Mobile:** an anchor chip row under the H1 (Facts · Eligibility · Documents · Steps · Sources) that sticks while scrolling.

### 1.5 `/tools` Stay Tools hub
- **Purpose:** the entry point to the three free tools.
- **Sections:** H1 "Stay Tools" · subline "Free. Works offline. Pro adds reminders and sync." · 3 tool cards (90-day report, Stay & tax counter, Document checklist), each with a one-line description and an "Open" button · a Pro band listing reminder features with **"Go Pro"**.
- **Primary CTA:** open a tool.
- **Mobile:** cards stacked full width.

### 1.6 `/tools/90-day` 90-day report calculator
- **Purpose:** compute the next 90-day report deadlines and export them to a calendar.
- **Sections:** H1 "90-day report calculator" · a form (**Date you entered Thailand** or **Date of your last 90-day report**, as a radio choice plus a date input) · a **Result card**: the next due date (large), the filing window "You can report from {due−15} to {due+7}", and a list of the following 3 due dates · a button **"Add to calendar (.ics)"** · "How to file: online, by post, or in person" accordion · a TM30 explainer accordion ("Your landlord must file TM30 within 24h of your arrival") · a Pro band: "Get an email 15 days and 1 day before each report. Go Pro".
- **Primary CTA:** Add to calendar.
- **States:** the result is empty until a date is valid ("Pick a date to see your deadlines"). If the date is in the future, show "Entry date can't be in the future." If the next due date has already passed, show a red alert: "This report may be overdue. Fines start at 2,000 THB. File as soon as possible." with a link to the sources.
- **Mobile:** use the native date input. The result card appears directly under the form and the page scrolls to it.

### 1.7 `/tools/stay-counter` Visa expiry + 180-day tax residency
- **Purpose:** show days left on the permission to stay, and days spent in Thailand this calendar year (tax residency starts at 180 days).
- **Sections:** form fields **Visa type** (select, 5 slugs), **Latest entry date**, **Permitted until** (auto-suggested from the visa rules, editable), and **Days already in Thailand this year (before this entry)** (number) · two **result tiles**: "Days left on your stay" (with a progress ring) and "Days in Thailand in {year}: N / 180" (bar; amber from 150, red at 180 or more with the text "You may be a Thai tax resident for {year}. Foreign income brought into Thailand may be taxed.") · "Add expiry to calendar (.ics)" · a not-legal-advice note and a SourceNote · Pro band: "Save multiple stays and get alerts".
- **Primary CTA:** Add to calendar (Pro: **"Save this stay"**).
- **States:** if the dates are reversed, show "Permitted-until must be after entry date."
- **Mobile:** tiles stack vertically.

### 1.8 `/tools/checklist` Document checklist tracker
- **Purpose:** tick off visa documents. Saved locally; Pro syncs it to the account.
- **Sections:** a visa picker (tabs or select, pre-filled from `?visa=`) · a progress bar "4 of 11 ready" · the checklist from `Visa.documents` (checkbox, document name, and an optional "note" field) · **"Download PDF"** (Pro yearly) · a sync status line: "Saved on this device" or "Synced to your account ✓".
- **Primary CTA:** tick the items. Secondary: **"Sync across devices — Go Pro"**.
- **States:** empty (no visa chosen): "Pick a visa to load its checklist." When everything is checked: a short celebration, "All documents ready. Next: book your embassy appointment." with a link to the guide's steps.
- **Mobile:** each row is at least 48px tall and the whole row is clickable.

### 1.9 `/cities` Cities list
- **Purpose:** compare the 3 cities.
- **Sections:** H1 "Where to base yourself" · 3 large cards (photo, name, summary, budget/comfortable cost, studio rent, internet Mbps, best months) · a compact comparison table (stacked on mobile) · CTA "Find your visa next" (to `/finder`).
- **Primary CTA:** open a city.

### 1.10 `/cities/[slug]` City guide (bangkok · chiang-mai · phuket)
- **Purpose:** the practical cost and lifestyle guide for one city, plus partner listings.
- **Sections:** breadcrumbs, a hero (photo, H1, summary) · **4 StatTiles**: cost per month (budget–comfortable), studio / 1-bed rent, internet Mbps, best months · **Watch out** (amber callout with `watchOut[]`) · **Neighborhoods** (cards: name and vibe) · **Coworking** (list; **featured listings appear first** with a "Featured" badge, plus day pass and link) · **Coliving and services** (from `Listing` filtered by city; affiliate items carry "Paid link") · **Local Buddies in {city}** (3 cards, then "See all" to `/buddies?city=slug`) · SourceNote · a partner CTA: "Own a space in {city}? Get featured — $49/mo" (to `/partners`).
- **Primary CTA:** "Book a Local Buddy in {city}".
- **States:** no listings yields an EmptyState with "Be the first featured space here" (to `/partners`).

### 1.11 `/buddies` Local Buddies marketplace (C2C)
- **Purpose:** browse vetted locals and expats, then open a profile and book.
- **Sections:** H1 "Local Buddies" · subline "Practical help from vetted locals — apartment viewings, bank accounts, SIM, city orientation. 60-min sessions." · a **filter bar**: city (All/BKK/CNX/HKT chips), service (select), language (select), and sort (Top rated / Price low–high) · a **results grid** of `BuddyCard`s: avatar, displayName, city, a rating with the session count, languages, the top 3 services as chips, "$35 / 60 min", and the button "View profile" · a **scope note**: "Buddies give practical help only. They don't file visas — for that, see licensed experts." (link to `/experts`) · a band: "Live in Thailand? Earn by helping newcomers. Become a buddy" (to `/buddies/join`).
- **Primary CTA:** View profile.
- **States:** loading shows 6 skeleton cards. With no results for the filters: "No buddies match these filters." plus a "Clear filters" button. Filters live in the URL query (`?city=chiang-mai&service=…`) so the view can be shared.
- **Mobile:** filters sit in a horizontally scrolling chip row plus a "Filters" button that opens a bottom sheet. Cards are one per row.

### 1.12 `/buddies/[id]` Buddy profile + book & pay
- **Purpose:** build trust, then book a paid 60-minute session.
- **Sections:**
  1. Profile header: avatar, name, city, a rating "★ 4.9 · 32 sessions", languages, and a "Verified buddy" badge.
  2. Bio.
  3. "I can help with": the services as a checklist.
  4. **Booking card** (the right column on desktop, inline on mobile):
     - **Service** (select from `services`)
     - **Preferred date** (date, from tomorrow up to 60 days ahead)
     - **Time** (select: Morning / Afternoon / Evening)
     - **Meeting** (radio: In person in {city} / Video call)
     - **What do you need help with?** (textarea, optional, 300 characters)
     - **Your email** (prefilled when logged in)
     - Price summary: "Session $35 · Service fee included · **Total $35**"
     - Button **"Book & pay $35"**, which goes to `/api/checkout` (product `buddy_session`, buddyId) and then Stripe.
     - Microcopy under the button: "Secure payment by Stripe. Free cancellation up to 24h before. Full refund if your buddy cancels."
  5. "What happens next" (3 steps: Pay → buddy confirms within 24h by email → meet).
  6. Reviews (static samples are fine for the demo).
  7. Scope note (practical help only, not legal advice).
- **Primary CTA:** Book & pay (in a sticky bottom bar on mobile that scrolls to the booking card).
- **Confirmation** (`/buddies/[id]?checkout=success`, or the account page): a success panel, "You're booked! {Buddy} will confirm by email within 24 hours.", a booking summary (service, date, time, total paid, reference), "Add to calendar", and "Back to buddies". It is also listed under Account → Bookings.
- **States:** an unknown id gives a 404 linking to `/buddies`. Checkout errors show an inline alert above the button. On cancel: "Booking not completed — you weren't charged."

### 1.13 `/buddies/join` Become a buddy
- **Purpose:** supply side of the marketplace. Collects applications through `/api/buddy-apply`.
- **Sections:** a hero ("Earn $25–60/hour helping newcomers settle in") · how it works (apply → short video call → go live; we keep 20% to cover payments and support) · a form: **Full name**, **Email**, **City** (select), **Languages** (multi-select chips), **Services you can offer** (checkboxes: Apartment viewing, Bank account, SIM & phone, City orientation, Hospital/clinic visit, Translation at appointments, Other), **Your hourly price (USD)** (number, 25–60), **Short bio** (textarea, 50–500 characters), and a checkbox "I understand buddies give practical help only and never file visas or give legal advice." (required) · submit **"Apply to be a buddy"**.
- **States:** success replaces the form with "Thanks, {name}! We review applications within 3 days and will email you." The error state keeps the input.

### 1.14 `/partners` Partners (B2B)
- **Purpose:** sell featured listings ($49/mo) and verified-agent plans. Ends in Stripe checkout.
- **Sections:**
  1. Hero: "Reach long-stay nomads planning their move to Thailand." Stats (sample numbers clearly labelled as targets, or real ones when available).
  2. **Who it's for:** 3 cards: Coworking · Coliving & condos · Licensed visa agencies.
  3. **Plans** (`PriceCard`s): **Featured Listing $49/mo** with a "Founding-partner price, locked for the first 20 partners" badge (top placement on a city page, Verified badge, monthly clicks report) · **Verified Agent $199/mo** (receive qualified leads from the "Get expert help" form; or pay per lead at $40–110) · **Team / API** "Coming soon — join the waitlist".
  4. **Apply form** (shown under the plans; choosing a plan scrolls to it and preselects it): **Business name**, **Type** (Coworking / Coliving / Agency), **City**, **Website**, **Contact email**, **Plan** (radio). For agencies, also **Licence / registration number** (required) and a checkbox confirming the licence. Then **"Continue to payment"**, which posts to `/api/listing-apply` and then goes to `/api/checkout` (`listing_featured`) and Stripe.
  5. "What happens after payment": your listing goes live as Featured within 1 business day; you get an invoice and a monthly report.
  6. FAQ: cancel anytime · how leads are qualified · refund policy.
- **Primary CTA:** "Get featured — $49/mo".
- **Success** (`?checkout=success`): "Payment received — your listing is now featured." plus a preview card of the listing with the Featured badge and a link "See it on the {city} page".
- **Mobile:** plans are stacked cards with the recommended one first. The form is a single column.

### 1.15 `/experts` Get expert help (lead-gen)
- **Purpose:** a qualified lead form that routes to licensed agents (B2B revenue). Posts to `/api/lead`.
- **Sections:** H1 "Get help from a licensed visa expert" · trust line: "Free to ask. We only refer to licensed agencies. We never file visas ourselves." · 3 steps (Tell us your case → a matched agent replies within 1 business day → you decide) · the form (see §4.4) · FAQ (cost, privacy, who the agents are) · disclosure: "We may receive a referral fee from partner agents."
- **Primary CTA:** **"Get matched with an expert"**.
- **States:** success: "Request sent. A licensed agent will email you within 1 business day. Reference #{id}." Errors keep the input.

### 1.16 `/pricing` Pricing
- **Purpose:** one page that covers B2C plans (and shows B2B and C2C pricing for transparency and for the judges).
- **Sections:**
  1. H1 "Simple pricing". A **billing toggle** Monthly / Yearly (Yearly shows a "Save 38%" badge).
  2. **Free vs Pro** cards. Free: Visa Finder, all guides, all tools (local only), .ics export. **Pro $8/mo or $59/yr**: everything in Free plus the `products.ts` features. Pro is the highlighted card, with the CTA **"Go Pro"**.
  3. "For businesses": a Featured listing card at $49/mo (to `/partners`) and a Verified agent card (to `/partners#agents`).
  4. "Local Buddies": "Sessions $25–60. Buddies keep 80%." (fee from `PLATFORM_FEE_RATE`)
  5. Footer link "See live revenue (demo)" (to `/revenue`).
  5. FAQ (cancel anytime, refunds, what happens to my data on Free, Stripe test-mode note for the demo).
- **Go Pro flow:** logged out → `/account?next=/pricing&intent=pro_{interval}` (magic link) → back to `/pricing`, which auto-starts checkout → Stripe → `/account?checkout=success`. Logged in → straight to `/api/checkout`.
- **States:** a Pro user sees "You're on Pro ✓" in place of the button. Checkout errors show an inline alert.
- **Mobile:** the Pro card comes first, the toggle is sticky above the cards, and the CTA is in a sticky bottom bar.

### 1.17 `/account` Login + account
- **Purpose:** magic-link login, plan status, saved stays, reminders and bookings.
- **Logged-out view (Login):** see §5. One email field with **"Email me a login link"**.
- **Logged-in view:**
  1. Greeting: "Hi {email}". A **plan badge** (Free / Pro · renews {date}).
  2. **Upgrade card** for Free users ("Unlock reminders — $8/mo") or **Manage billing** for Pro (Stripe portal, or "Cancel" text for the demo).
  3. **Onboarding checklist** (see §5.3), until it is complete or dismissed.
  4. **My stays** (Pro): a list of saved stays (visa, entry date, expiry, next 90-day date) and "+ Add a stay". Free users see a locked preview with the text "Pro feature".
  5. **Reminders** (Pro): toggles for 90-day report (15 days and 1 day before), visa expiry (30 and 7 days before), TM30 after travel, and the 180-day warning.
  6. **Bookings**: buddy sessions with status (Pending confirmation / Confirmed / Completed).
  7. **Saved visas and checklist progress.**
  8. Log out · Delete my data (PDPA).
- **Primary CTA:** Free: **Go Pro**. Pro: **Add a stay**.
- **States:** `?checkout=success` shows a celebration banner: "Welcome to Pro! Your reminders are on." with a secondary link "See it on the revenue dashboard" (to `/revenue`). If the webhook has not arrived yet: "Confirming your payment…" (poll every 2s for up to 20s, then "Payment received — it can take a minute to show. Refresh."). An expired magic link shows "That link has expired. We've sent a new one." and a resend button.
- **Empty states:** My stays: "No stays saved yet. Add your entry date and we'll track every deadline." with "+ Add a stay". Bookings: "No sessions booked. Meet a Local Buddy" (to `/buddies`).

### 1.17b `/revenue` Revenue dashboard (public demo)
- **Purpose:** close the judges' "sign up → pay → revenue" story. It shows the Stripe test-mode payments the demo just made, split by segment. The page is public, read-only, and shows no customer personal data (no emails or names).
- **Data:** `GET /api/revenue` returns `{ configured, total, bySegment: { B2C, B2B, C2C: { grossUsd, netUsd, count } }, byProduct, recent[10] }`. Fetch on load, and refresh every 10s while the tab is visible plus on a "Refresh" button press.
- **Sections:**
  1. H1 "Revenue (live demo)". Subline: "Real Stripe test-mode payments from this site. Updates every 10 seconds." A small "Test mode" badge.
  2. **Total tile** (large): total gross in USD and total net ("after buddy payouts"), with the payment count.
  3. **3 segment cards** in a row (stacked on mobile), always in this order: **B2C (Pro subscriptions)**, **B2B (Featured listings and leads)**, **C2C (Local Buddy fees)**. Each card shows gross, net and count. For C2C, net is the 20% platform fee; label it "Platform fee (20%)". Each segment has a text label and an icon, not color alone.
  4. **By product**: a compact list or table of `byProduct` (product name from `products.ts`, count, gross).
  5. **Recent payments**: the last 10 rows from `recent` — time ("2 min ago", with the full timestamp in `title`), product, segment badge, amount. Use `aria-live="polite"` on the list so new rows are announced.
  6. **Try it yourself** strip with 3 buttons: "Go Pro" (to `/pricing`), "Book a buddy" (to `/buddies`), "Get featured" (to `/partners`), and the note "Use test card 4242 4242 4242 4242".
- **Primary CTA:** Refresh. Secondary: the try-it buttons.
- **States:**
  - Loading: skeleton tiles and 5 skeleton rows.
  - `configured: false` → an EmptyState: "Payments aren't connected yet. Once Stripe test keys are added, every Pro upgrade, buddy booking and featured listing shows up here." Show the segment cards at $0 (greyed) so the layout is still visible.
  - `configured: true` with zero payments → "No payments yet. Make the first one:" plus the try-it buttons.
  - Error → an inline alert, "Couldn't load revenue. Try again.", plus Refresh. Keep the last good data on screen.
- **Mobile:** total tile first, then the segment cards stacked, then recent payments. Amounts use tabular numbers and are right-aligned.
- **Linked from:** account page after a successful payment ("See it on the revenue dashboard"), the footer (Business column), and the pricing page footer link.

### 1.18 `/about` Method & sources
- **Purpose:** credibility for the judges and users.
- **Sections:** mission (the tourism angle: longer stays mean more spent locally) · **How we verify** (primary sources first, monthly checks, a verified date on every fact) · the list of sources · team · contact.
- **Primary CTA:** "Try the Visa Finder".

### 1.19 `/legal` Legal
- **Sections, with anchors:** `#disclaimer` (not legal advice; we don't file visas) · `#affiliate` (affiliate disclosure, "Paid link") · `#privacy` (PDPA: what we store, Supabase Singapore region, how to delete) · `#terms` (Pro, buddies, partners, refunds) · `#cookies`.
- **Mobile:** a table of contents at the top. Reading width at most 720px.

### 1.20 API routes (no UI, but UI contracts)
| Route | Called from | UI on success | UI on error |
|---|---|---|---|
| `POST /api/checkout` `{productId, buddyId?, listingId?}` | pricing, account, buddy profile, partners | `window.location = url` (Stripe) | Inline alert "Couldn't start payment. Try again." |
| `POST /api/stripe-webhook` | Stripe | (the account or listing updates) | n/a |
| `GET /api/revenue` | /revenue | Render totals, segments and recent payments | Inline alert; keep the last good data. `configured:false` gives the empty state |
| `POST /api/lead` | /experts | Success panel with a reference | Inline alert, input kept |
| `POST /api/buddy-apply` | /buddies/join | Success panel | Inline alert |
| `POST /api/listing-apply` | /partners | Goes on to checkout | Inline alert |

### 1.21 404 / offline page
- 404: "This page took a wrong turn." Links: Visa Finder, Visas, Home.
- Offline fallback (service worker): "You're offline. Cached guides and tools still work." with links to the cached pages.

---

## 2. User flows (mirrors the Miro "User Flows" section)

### 2a. B2C: visitor → Pro subscriber (the demo money path)
1. `/` Hero → **Find my visa in 2 minutes**
2. `/finder` 6 steps → Results (top: DTV, 92, Great fit)
3. **Read the DTV guide** → `/visas/dtv` (documents, steps, sources)
4. **Plan your 90-day reports** → `/tools/90-day` → result → (logged out) the "Get reminders — Go Pro" band
5. **Go Pro** → `/pricing` (Yearly toggle) → **Go Pro** → `/account?intent=pro_yearly` → enter email → **Email me a login link**
6. Click the link in the email → returns logged in → checkout starts automatically → **Stripe Checkout** (test card 4242 4242 4242 4242)
7. Stripe success → `/account?checkout=success` → "Welcome to Pro!" → the onboarding checklist → **Add a stay** (prefilled from the finder answers if they exist)
8. Revenue: on the account success banner, tap **"See it on the revenue dashboard"** → `/revenue`. The new $59 payment appears at the top of Recent payments and in the B2C card (this is the demo's closing shot).

Decision points: logged in already? (skip step 5's email) · checkout cancelled? (back to `/pricing` with a notice) · webhook delayed? (the "Confirming…" state).

### 2b. C2C: traveller books a Local Buddy
1. `/buddies` → filter City = Chiang Mai → BuddyCard → **View profile**
2. `/buddies/[id]` → booking card: service, date, time, meeting type → **Book & pay $35**
3. Stripe Checkout (guest allowed; email collected by Stripe)
4. Success → `/buddies/[id]?checkout=success` → confirmation panel (reference, add to calendar) + email
5. The buddy confirms within 24h → status shows "Confirmed" in Account → Bookings
- Revenue split shown on `/pricing`: the buddy gets 80%, the platform 20% (`PLATFORM_FEE_RATE`).

### 2c. B2B: partner gets featured
1. `/partners` (from the footer, a city page's "Get featured", or the pricing page) → **Get featured — $49/mo**
2. Apply form (business, type, city, website, email, plan) → **Continue to payment** → `/api/listing-apply` → `/api/checkout`
3. Stripe Checkout (subscription) → success → `/partners?checkout=success` → "Your listing is now featured" + preview
4. The listing shows first on `/cities/[slug]` with the **Featured** badge.

### 2d. B2B lead-gen: expert help
1. Entry points: finder results ("Complex case?"), each visa guide's "Get help" block, the buddies scope note, and the footer.
2. `/experts` form (prefilled visa from `?visa=`) → **Get matched with an expert** → `/api/lead`
3. Success panel with a reference → an agent emails within 1 business day → the lead is billed to the agent ($40–110, or covered by the $199/mo plan).

---

## 3. Visa Finder question sequence (`FinderInput`)

One question per screen. Progress: "Step N of 6". All fields required except where marked. Defaults speed things up, following the endowed-progress idea.

| Step | Field(s) | Label (question) | Control | Helper / microcopy | Validation |
|---|---|---|---|---|---|
| 1 | `purpose` | **What brings you to Thailand?** | 6 radio cards with icons: Remote work (`remote-work`) · Long holiday (`tourism`) · Retirement (`retire`) · Investing / wealth (`invest`) · Study (`study`) · Learn Thai skills — Muay Thai, cooking, culture (`soft-power`) | "Pick the main reason. You can change it later." | required |
| 2 | `nationality` | **Which passport will you travel on?** | country select with search (ISO alpha-2), flag + name | "Visa-exempt rules depend on your passport." | required |
| 2 | `residenceCountry` | **Where do you live now?** | country select; checkbox "Same as my passport" (checked by default) | "DTV applications must be filed at a Thai embassy in the country where you live." | required |
| 3 | `stayDays` | **How long do you want to stay?** | segmented chips: Up to 2 months (60) · 3–6 months (180) · 6–12 months (365) · 1–5 years (1825) · 5+ years (3650); plus "Exact days" number input | "Rough is fine." | 1–3650 |
| 4 | `age` | **How old are you?** | number (`inputmode=numeric`) | "Some visas have age rules (Retirement 50+)." | 18–100 |
| 5 | `incomeUsdYear` | **What's your yearly income before tax?** | number with a USD prefix, plus quick chips: <$40k · $40–80k · $80k+ | "In US dollars. Used only to check visa thresholds — never stored unless you save." | ≥0 |
| 6 | `savingsThb` | **How much savings could you show in a bank account?** | number with a THB prefix, live hint "≈ $X USD", chips: <500k · 500k–800k · 800k+ THB | "DTV asks for 500,000 THB; Retirement asks for 800,000 THB." | ≥0 |
| → | | **See my visas** (button on step 6) | | "Your answers stay in this browser." | |

Buttons: **Next** (primary), **Back** (ghost; hidden on step 1). On the last step the button reads **"See my visas"**. Keyboard: Enter moves to Next. Step 2 groups the two country questions because they belong together.

---

## 4. Microcopy: CTAs and forms

### 4.1 CTA dictionary (use these exact strings)
| Context | Text |
|---|---|
| Main entry | **Find my visa in 2 minutes** (hero) / **Find my visa** (header) |
| Finder | Next · Back · **See my visas** · Edit answers · Start over |
| Finder result | Read the {DTV} guide · Get the document checklist · Plan your 90-day reports |
| Pro upsell | **Go Pro — $8/mo** · Get reminders · Save this visa & get reminders |
| Pricing | **Go Pro** · Start with Free · You're on Pro ✓ |
| Tools | Add to calendar (.ics) · Save this stay · Download PDF |
| Buddies | View profile · **Book & pay ${price}** · Become a buddy · Apply to be a buddy |
| Partners | **Get featured — $49/mo** · Continue to payment · Join the waitlist |
| Experts | **Get matched with an expert** |
| Account | **Email me a login link** · Resend link · Use a different email · Add a stay · Manage billing · Log out |

Rule: start with a verb, keep it to 5 words or fewer, put the price inside payment buttons, and never use "Submit" or "Click here".

### 4.2 Login (`/account`)
- Heading: **"Log in or sign up"**. Subline: "No password needed. We'll email you a secure link."
- Field: **Email** · placeholder `you@example.com` · `type=email autocomplete=email`.
- Button: **Email me a login link**
- Below: "New here? The same link creates your free account." · "By continuing you agree to our Terms and Privacy Policy."
- Errors: "Enter an email address." · "That doesn't look like an email — check for typos." · typo suggestion "Did you mean name@gmail.com?" · rate limit "Too many tries. Wait a minute and try again."
- Sent state: **"Check your inbox"** · "We sent a link to **{email}**. It expires in 1 hour." · **Resend link** (enabled after 30s, with a countdown) · Use a different email · "Can't find it? Check spam or Promotions."

### 4.3 Buddy booking
Labels as in §1.12. Errors: "Choose a date from tomorrow onwards." · "Pick a time of day." · "Enter your email so your buddy can reach you."

### 4.4 Expert lead form (`/experts`)
| Field | Label | Control | Required |
|---|---|---|---|
| name | Your name | text, `autocomplete=name` | yes |
| email | Email | email | yes |
| visa | Which visa are you considering? | select: 5 visas + "Not sure" (prefilled from `?visa=`) | yes |
| nationality | Passport country | country select | yes |
| timeline | When do you want to apply? | radio: Within 1 month · 1–3 months · Just researching | yes |
| message | Tell us about your case | textarea, 20–1000 characters, hint "e.g. freelancer with clients in the EU, want DTV, previous overstay of 3 days" | yes |
| consent | "I agree that {Brand} shares my request with up to 2 licensed partner agents." | checkbox | yes |

Button: **Get matched with an expert**. Below it: "Free to ask. No obligation."

### 4.5 Partner apply form
Labels as in §1.14. Microcopy: "Cancel anytime from your invoice email." · Agency licence hint: "We verify every agency before it goes live."

### 4.6 Empty and error strings (quick list)
- Generic error: "Something went wrong on our side. Try again — your info is still here."
- Payment cancelled: "Payment cancelled — you weren't charged."
- Offline payment: "You're offline. Connect to the internet to pay."
- Not legal advice: "General information, not legal advice. Rules change — check the source and the embassy before you apply."

---

## 5. Signup and onboarding

### 5.1 Principles applied
- **Value before signup.** The finder, guides and tools all work without an account. Ask for signup only when a feature needs persistence (save, reminders, sync, Pro).
- **One field.** Email only, through a Supabase magic link. No password, no name, no confirm-email field.
- **Intent carried through.** Every signup trigger passes `?next=` and `?intent=` so the user lands back where they were and the action they wanted (save, go Pro) completes automatically.
- **Pre-fill.** Finder answers in `sessionStorage` turn into the first "stay" after login.

### 5.2 Signup triggers → after login
| Trigger | Where | After login |
|---|---|---|
| Go Pro | /pricing, upsell cards | Auto-starts Stripe checkout for the chosen interval |
| Save this visa & get reminders | /visas/[slug], finder results | Saves the visa → for Free users, a Pro prompt sheet ("Reminders are a Pro feature") |
| Save this stay | /tools/stay-counter, /tools/90-day | Free: stay saved locally + Pro prompt. Pro: saved to the account |
| Sync checklist | /tools/checklist | Pro prompt |
| Log in (header) | anywhere | /account |

### 5.3 First-run onboarding (on `/account`, first login)
A checklist card titled **"Get set up (1 of 4 done)"**. Step 1 is pre-checked: "Account created ✓" (endowed progress).
1. ✓ Create your account
2. ☐ **Find your visa**: links to `/finder` (auto-checked if finder answers exist)
3. ☐ **Add your stay**: entry date plus visa gives every deadline (the aha moment: seeing "Next 90-day report: 14 Jan 2027")
4. ☐ **Turn on reminders** (Pro). Free users see "Go Pro to turn on" here.
- Show a progress bar. The card can be dismissed with "Hide". On completion: "You're all set — we'll remind you before every deadline."
- **Activation event:** a stay is saved with a computed next-deadline date.
- **Emails** (for the backend and later work): welcome (immediate; one CTA, "Add your stay") · if no stay after 24h, "Your next 90-day date in 10 seconds" · for a Free user after 3 days, "Never miss a report — Pro reminders".

### 5.4 Pro paywall pattern
- Locked features show a **preview with a lock icon** plus one line of value ("Get an email 15 days before your report is due") and **Go Pro — $8/mo**. Never a dead end: the free alternative (".ics export") always stays visible.

---

## 6. Accessibility checklist (all pages)
- Contrast at least 4.5:1 for text, 3:1 for UI. Visible focus ring (2px, offset).
- Every input has a visible `<label>`. Placeholders are examples only.
- Verdict, score and status never rely on color alone (use a text label and an icon).
- Icon-only buttons have an `aria-label`. Decorative icons are `aria-hidden`.
- The wizard step change moves focus to the heading and announces "Step 3 of 6" through `aria-live="polite"`.
- A skip link "Skip to content" on every page.
- Language `lang="en"`. Dates are shown as "14 Jan 2027" (unambiguous).
- Modals and sheets trap focus, close on Esc, and return focus to the trigger.

---

## 7. Open questions for main agent
See the UX agent's hand-off report. Defaults assumed above: guest buddy booking allowed; Verified Agent $199/mo shown on /partners but only `listing_featured` exists in `ProductId`; yearly saving shown as "Save 38%" to match products.ts. All prices must be read from `app/src/data/products.ts` at build time, never hardcoded; the dollar amounts in this file are examples.
