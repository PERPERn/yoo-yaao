# Home page — scroll storytelling spec

User direction (2026-10-23): the home page is a **long scroll-down story with animation**, the way modern sites do it. The palette is simple and calm, and the site must stay easy to use. Content from `docs/ux-flow.md` §1 (home) still applies; this file overrides its **layout and motion**.

References:
- **ORYZO** (Lusion; screenshots in the repo root, `Screenshot_*_TikTok.jpg`). One 3D object stays **pinned** in the centre while scrolling drives it: it rotates, scales and changes state. Huge bold type sweeps behind or through the object ("ISN'T JUST A COASTER", "it's wearable"). Cards and posters stack and fan out around it. A **blueprint/wireframe mode** shows the object as outline drawings with dimension lines and a stat ("NOW 37.9% MORE CIRCULAR"). The page ends on a giant outlined wordmark. Site chrome is minimal: a small top nav and a scroll hint.
- **brain.fm/th**:
  - A clear hero with a free CTA.
  - A looping marquee of activity chips.
  - Social proof and "featured in" logos.
  - A stat headline with a count-up.
  - Three colour-coded panels (sleep, relax, meditate).
  - A science/credibility section.
  - Platforms, then an FAQ accordion and the footer.

Our pinned object is the Blender hero `app/public/models/hero.glb`: a passport with a gold visa stamp and a floating Thai island. Its named nodes are `Hero`, `Passport`, `Stamp`, `Island`, `Boat` and `Sparkles`.

## Rules

- **Palette stays simple:** use the UI agent's tokens (`app/src/styles/tokens.css`). Light warm paper background, deep teal ink, one gold accent. Use at most one darker "night" scene for contrast (scene 5).
- **One idea per screen.** Every scene has a headline of 6 words or fewer, plus one line of support copy.
- **Every scene has a real CTA or link into the product**, so the story never becomes a dead end. The sticky header keeps "Find my visa" visible throughout.
- **Motion:** GSAP ScrollTrigger with scrub, animating transforms and opacity only.
  - Under `prefers-reduced-motion`, every scene renders as a normal stacked section with the static `hero-fallback.webp`.
  - Content is never hidden if JS fails.
- **Mobile:** the same story with shorter pins (or no pin under 640px). The 3D object scales down and sits top-centre.
- **Performance:** one WebGL canvas for the whole story (no second renderer). The canvas pauses when off-screen.
- **Data:** prices come from `app/src/data/products.ts`, visas from `app/src/data/visas.ts`, cities from `app/src/data/cities.ts`, and buddies from `app/src/data/buddies.ts`.

## Scenes (top to bottom)

| # | Scene | Pinned object does | DOM layer | CTA |
| --- | --- | --- | --- | --- |
| 1 | **Hero** — "Stay longer in Thailand." | Island floats above the open passport; idle float | Headline, subline, primary CTA, scroll hint | Find my visa → `/finder` |
| 2 | **"It's not just a visa."** | Passport rotates toward the camera; the island lifts | Huge type sweeps horizontally behind the object (ORYZO style) | — |
| 3 | **The problem** | Object shrinks to one side | Three pain cards fan out one by one: "Rules changed: 30-day visa-free since 15 Sep 2026", "Blogs disagree", "90-day reports are easy to forget". Count-up on "30" | Read what changed → `/visas/visa-exempt` |
| 4 | **Find your visa in 60 seconds** | Stamp glows and pulses | Five visa cards (DTV, LTR, Privilege, Exempt, Retirement) stack, then fan out around the passport; each shows its stay length from data | Start the finder → `/finder` |
| 5 | **Blueprint: stay legal** (the one darker scene) | Object switches to wireframe or outline look (an emissive outline material, or swap to a line render) | A 90-day timeline draws itself (SVG stroke-dashoffset); checklist ticks animate; stat "0 missed reports" | Try the 90-day tool → `/tools/90-day` |
| 6 | **Live like a local** | Island rises off the passport and the boat moves | Horizontal scroll of 3 city posters (Bangkok, Chiang Mai, Phuket) with cost-of-living numbers | Explore cities → `/cities` |
| 7 | **Local Buddies** | Object idles small in a corner | brain.fm-style infinite marquee of buddy chips (name, city, service, $price), then two highlighted buddy cards | Meet a buddy → `/buddies` |
| 8 | **Trust** | — (unpinned) | "Every fact has a source": strip of official-source names (Thai embassies, Immigration Bureau, BOI, Thailand Privilege) with "Verified 23 Oct 2026" stamps; count-ups for number of visas, sources and cities | How we verify → `/about` |
| 9 | **Plans for everyone** | — | Three colour-coded panels, as in brain.fm: Travellers (B2C, Free vs Pro $8/mo), Businesses (B2B, featured listing $49/mo, expert leads), Locals (C2C, earn as a buddy, 20% fee) | See pricing → `/pricing` |
| 10 | **FAQ** | — | Accordion of 6 items from `app/src/data/faq.ts` | — |
| 11 | **Finale** | Object returns to centre, slow spin | Giant outlined wordmark `SITE.name` drawn stroke-by-stroke (ORYZO ending), final CTA, footer | Find my visa → `/finder` |

## Ownership

- **Home agent:** owns `app/src/pages/index.astro`, `app/src/components/home/**` and `app/src/scripts/home-scroll.ts`.
  - It may extend `app/src/scripts/hero3d.ts` with a scroll-scene API, for example `setScene(progress)` or exposing node refs, while keeping `mountHero` backwards compatible.
- **UI tokens and shared components** come from the UI agent. Don't fork them.
