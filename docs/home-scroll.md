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

- **Palette stays simple:** use the UI agent's tokens (`app/src/styles/tokens.css`). Pale celadon background, deep teal ink, one gold accent. Dark areas: the wall, the map and the blueprint scene.
- **One idea per screen.** Every scene has a headline of 6 words or fewer, plus one line of support copy.
- **Every scene has a real CTA or link into the product**, so the story never becomes a dead end. The sticky header keeps "Find my visa" visible throughout.
- **Motion:** GSAP ScrollTrigger with scrub, animating transforms and opacity only.
  - Under `prefers-reduced-motion`, every scene renders as a normal stacked section with the static `hero-fallback.webp`.
  - Content is never hidden if JS fails.
- **Mobile:** the same story with shorter pins (or no pin under 640px). The 3D object scales down and sits top-centre.
- **Performance:** one WebGL canvas for the whole story (no second renderer). The canvas pauses when off-screen.
- **Data:** prices come from `app/src/data/products.ts`, visas from `app/src/data/visas.ts`, cities from `app/src/data/cities.ts`, and buddies from `app/src/data/buddies.ts`.

## Scenes (top to bottom, since the Nov 2026 redesign)

| # | Scene (`data-scene`) | Component | What happens | CTA |
| --- | --- | --- | --- | --- |
| 1 | `hero` visa wall | `stage/VisaGallery` | Five lit niches. Hover lights one, click flies in to the facts; Esc, arrows and Back work. Portrait: swipe the niches, facts below | Find my visa → `/finder` |
| 2 | `problem` | `home/SceneProblem` | Pinned: three cards rise in | Read what changed → `/visas/visa-exempt` |
| 3 | `blueprint` | `home/SceneBlueprint` | Pinned: the 90-day timeline draws; the 3D passport shows as wireframe | 90-day tool → `/tools/90-day` |
| 4 | `cities` map | `stage/CityMap` | Thailand relief map. A pin flies down and lands on the city photo | City guide |
| 5 | `why` | `home/SceneWhy` | Four sourced tourism figures | – |
| 6 | `buddies`, `demo`, `trust`, `plans`, `faq` | `home/*` | Reveals only | Each scene has one |
| 7 | `finale` | `home/SceneFinale` | 3D passport returns, outlined wordmark draws | Find my visa → `/finder` |

The 3D object (`hero3d.ts`) mounts once in `index.astro` and shows only in scenes 3 and 7 (`POSES` in `home-scroll.ts`). Pins and the scene snap are unchanged.

## Ownership

- **Home agent:** owns `app/src/pages/index.astro`, `app/src/components/home/**` and `app/src/scripts/home-scroll.ts`.
  - It may extend `app/src/scripts/hero3d.ts` with a scroll-scene API, for example `setScene(progress)` or exposing node refs, while keeping `mountHero` backwards compatible.
- **UI tokens and shared components** come from the UI agent. Don't fork them.
