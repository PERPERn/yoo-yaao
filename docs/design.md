# Design direction: "Teal & Gold on paper"

The app gives legal-ish advice to people who are about to spend money and risk fines. It should feel like a calm,
well-kept office that is also friendly, and the home page tells that as a long scroll story (see `docs/home-scroll.md`).
The palette is deliberately restrained: **2 neutrals, 1 primary, 1 accent, 3 segment tints and one night scene.**
The Thai touch comes from the colours (teal temple-roof tiles, gold leaf and garlands, lotus) and from two typefaces drawn in Bangkok.
We do not use clip-art temples, elephants, flag stripes or tuk-tuks.

Live reference: **`/styleguide`** shows every token and component, including the night, sweep, marquee and accordion demos.

## 1. Palette

All values are CSS custom properties in `app/src/styles/tokens.css`. **Use tokens only; never put raw hex in components or pages.**
Contrast ratios were computed with the WCAG 2.x formula.

| Token | Light | Use | Contrast |
| --- | --- | --- | --- |
| `--color-bg` | `#F6F3EC` | Warm paper ground | — |
| `--color-ink` | `#10292B` | Deep-teal ink for body text and headings | 13.8:1 |
| `--color-ink-2` | `#4B5B5A` | Secondary text | 6.4:1 |
| `--color-surface` / `-2` / `-3` | `#FFF` / `#EEEAE0` / `#E3DED2` | Cards; alternate sections; hover | — |
| `--color-brand` (teal) | `#0D6461` | Primary buttons, links, active nav | 6.3:1; white on it 7.0:1 |
| `--color-brand-tint` | `#D6EBE7` | Teal surface | teal text on it 5.6:1 |
| `--color-accent` (gold) | `#E3A33A` | **Fills only**: Pro/upgrade, ribbons, stars, selection | ink on it 7.0:1 |
| `--color-accent-text` | `#845A0C` | Gold used as text | 6.1:1 on white |
| `--seg-b2c-bg` / `-strong` | `#D6EBE7` / `#0D6461` | Travellers (lagoon) | 5.6:1 |
| `--seg-b2b-bg` / `-strong` | `#F5E6C8` / `#845A0C` | Businesses (sand) | 4.9:1 |
| `--seg-c2c-bg` / `-strong` | `#F7DCCF` / `#9A3D22` | Locals (lotus) | 5.3:1 |
| `--seg-ink` | `#10292B` | Body text on any segment tint | ≥11.7:1 |
| `--night-bg` / `--night-surface` | `#0B1F21` / `#12302F` | The one dark scene, and the footer | — |
| `--night-ink` / `--night-ink-2` | `#E9EFEC` / `#9DB3B0` | Text on night | 14.6:1 / 7.7:1 |
| `--night-brand` / `--night-accent` | `#5CC8BE` / `#F0B44C` | Teal and gold on night | 8.5:1 / 9.2:1 |
| `--night-line` / `--night-line-strong` | `#2E5553` / `#5CC8BE` | Blueprint grid / drawing strokes | non-text |
| status: info, success, warning, danger (+ `-tint`) | `#1D5FA8`, `#1E7A44`, `#845A0C`, `#B3261E` | Functional only | ≥4.6:1 on their tints |
| `--color-focus` | `#1D5FA8` | Focus ring (blue, distinct from teal) | ≥3:1 |

- **Gold** marks money and premium only. **Never set small text in `--color-accent`.** It fails contrast; use `--color-accent-text`.
- **Segment tints** are reserved for the three audiences (pricing panels, marquee chips, segment badges). They are not decoration.
- **Night:** use `<Section tone="night">` (or `.section--night` / `.theme-night` on any wrapper). This remaps the semantic tokens locally, so every ui/ component inside renders correctly on dark. Add `.blueprint-grid` for the measuring-grid paper. **Use it at most once per page** (home scene 5); the footer is the other dark area.
- **OS dark mode** (`prefers-color-scheme`) switches the whole site to the night palette. `data-theme="light"` on `<html>` forces light mode.

Proportions: about 80% paper and surfaces, 15% ink, 5% teal, and a few gold moments per view. Use one teal primary button per view.

## 2. Type

| Role | Family | Why |
| --- | --- | --- |
| Display: headings, prices, stats, wordmark | **Bricolage Grotesque** (variable, weight 200–800 + optical size), `--font-display` | A warm grotesque with ink-trap character. Its optical-size axis tightens it automatically at scene sizes (100px+), so huge type stays crisp; it has tabular figures for prices and stats. |
| Body and UI | **Public Sans** (variable 100–900, italic), `--font-body` | A sturdy public-service sans with a large x-height and tabular and fractional figures. It reads well at 15–17px in forms, tables and dashboards. |
| Thai fallback | **Anuphan** (variable), second in both stacks | Neither Latin face has Thai, so Thai place names (เชียงใหม่) and ฿ fall through to Anuphan by Cadson Demak (Bangkok), never to the OS font. Its files only download when Thai text is on the page. |

Both fonts are self-hosted through `@fontsource` (imported in `src/styles/fonts.css`), so they also work offline in the PWA. Thai
place names such as เชียงใหม่ render in the same voice as the English text.

Scale (fluid, 360 → 1280px): `--text-xs` 13 · `sm` 15 · `base` 17 · `lg` 18–20 · `xl` 20–24 · `2xl` 24–32 · `3xl` 30–44 (h2) ·
`4xl` 38–68 (h1) · `5xl` 44–92 (hero, `.display`).
Scroll-story display sizes: `--text-6xl` 52–144px (`.display-6xl`, scene headlines), `--text-sweep` clamp(72px, 14vw, 256px) (`.text-sweep`, one nowrap line that GSAP moves on x behind the 3D object), and `--text-giant` clamp(80px, 16vw, 320px) (`.text-giant`, the finale wordmark). Combine with `.text-outline` (transparent fill, `currentColor` stroke; set `--outline-width`, and `.text-outline--brand` makes it teal). Wrap sweep and giant type in `.overflow-clip` so it never causes horizontal scroll. Leading for these is `--leading-display` 0.9 and tracking is `--tracking-giant` (-0.025em).
Headings use `text-wrap: balance`, tight leading (1.04–1.18) and negative tracking: h1 `--tracking-display` -0.022em, h2 `--tracking-heading` -0.015em, h3 and smaller about -0.01em. Body text uses leading 1.6 and `--measure` 68ch (applied to running text in `main` by global.css). Tables, `<time>`, `<data>`, `<output>`, stats, prices and count-ups get `tabular-nums` globally.
Numbers (dates, fees, counters) use `.tabular` or `<time>`/`<data>`, which get tabular figures automatically.

## 3. Space, radius, elevation, motion

- Spacing follows a 4px base: `--space-1…24`. The gap between page sections is `--space-section` (64–128px), and the side margin is `--gutter` (16–32px).
- Widths: `.container` (1216px content) and `.container-narrow` (736px, for reading and forms).
- Radius: one decision per element type; `--radius-2xl` (32) is for segment panels and posters. **Buttons, chips, badges and tabs are always pill** (`--radius-pill`). Inputs and callouts use `--radius-md` (10), cards `--radius-lg` (16), and big panels, price cards and hero media `--radius-xl` (24).
- Elevation: **separate surfaces by tone, not by shadow or border.** `--shadow-float` is only for things that float (menus, popovers, sticky header after scroll). `--shadow-raise` is only for hovered link cards.
- Motion: `--marquee-duration` (40s), `--shadow-card-stack` (only for fanned scroll cards, which float), and `--z-stage` (20) for the pinned canvas. Use `--duration-fast` 150ms for press and colour changes, `--duration-base` 200ms for hover, `--duration-slow` 320ms for panels, and `--duration-reveal` 700ms with `--reveal-distance` 24px for GSAP `data-reveal` entrances. Use `--ease-out` for entrances. Animate transform and opacity only. Buttons press to `scale(0.98)` and lift on hover only with a fine pointer. `global.css` turns transitions off under `prefers-reduced-motion`.
- Layers: `--z-header` 100, `--z-overlay` 200, `--z-modal` 300, `--z-toast` 400. Do not invent z-index values.

## 4. Layout: `layouts/Base.astro`

```astro
---
import Base from '../layouts/Base.astro';
import Section from '../components/ui/Section.astro';
---
<Base title="Visa Finder" description="Answer 6 questions, get the Thai visa that fits.">
  <Section titleLevel={1} eyebrow="Visa Finder" title="Which Thai visa fits you?" lead="…">…</Section>
</Base>
```

- Props: `title` (the layout appends ` · {SITE.name}`; pass `SITE.name` itself on the home page to get "Name — tagline"), `description`, `image?` (OG image; the default is `/og.png`, which still has to be added to `public/`), `noindex?`, `canonical?`, `type?`.
- Slot `head` adds extra `<head>` tags such as JSON-LD: `<script slot="head" type="application/ld+json" set:html={…} />`.
- The layout already provides the skip link, a sticky header (wordmark, NAV from `config/site.ts`, "Log in" → `/account`, "Find my visa" → `/finder`), an accessible mobile menu (aria-expanded, Escape closes it, focus moves into it), `<main id="main">`, and a footer with the disclaimer line, affiliate disclosure, /about and /legal links.
- `aria-current="page"` is set automatically when the path matches a NAV href or one of its sub-paths.
- It links `/manifest.webmanifest`, `/icons/icon-192.png` (apple-touch) and theme-color. **The PWA owner must create those files.**
- Pages own everything inside `<main>`. Wrap content in `<Section>` or `.container`. Do not add another header or footer.

## 5. Components (`src/components/ui/`)

Every component spreads extra attributes onto its root, so `data-reveal`, `id` and `aria-*` all work. Every component also accepts `class`.

| Component | Props | Notes |
| --- | --- | --- |
| `Button` | `variant` primary\|accent\|secondary\|ghost · `size` sm\|md\|lg · `href?` (renders `<a>`) · `type` · `icon?` · `iconRight?` · `block?` · `disabled?` · `external?` | Use `accent` only for paid upgrade or checkout. Hooks pass through, e.g. `data-checkout="pro_yearly"`. |
| `Card` | `as` div\|article\|li\|section\|aside · `title?` · `titleLevel` 2–4 · `href?` (stretched link on title) · `tone` surface\|tint\|brand\|accent · `padding` sm\|md\|lg | Slots: `media`, default, `footer`. On a card with `href`, inner buttons sit above the stretched link. |
| `Badge` | `variant` verified\|demo\|pro\|paid\|neutral\|brand\|accent\|info\|success\|warning\|danger · `icon?` · `title?` | Presets bring their own label and icon. Slot text overrides the label. **Every affiliate link gets `<Badge variant="paid"/>`; every sample person or listing gets `demo`.** |
| `Input` | `name` · `id?` · `label?` · `hint?` · `error?` · `type` · `value?` · `placeholder?` · `required?` · `optional?` · `multiline?` · `rows?` · `hideLabel?` | With `label` it wraps itself in `Field` and sets `aria-describedby` and `aria-invalid`. |
| `Select` | `name` · `id?` · `label?` · `hint?` · `error?` · `options` (string or `{value,label,disabled}`) · `value?` · `placeholder?` · `required?` | Native select. You can also put `<option>`s in the slot. |
| `Field` | `id` · `label` · `hint?` · `error?` · `required?` · `optional?` · `group?` (fieldset/legend) · `hideLabel?` | Wrap custom controls such as radios (`<label class="choice">`). The error element has id `${id}-error` and `aria-live`, so scripts can fill its text. |
| `Section` | `id?` · `eyebrow?` · `title?` · `lead?` · `titleLevel` 1–3 · `align` start\|center · `tone` default\|tint\|brand\|night · `width` default\|narrow · `spacing` default\|tight\|none | Slot `actions` sits beside the header. The eyebrow is sentence case, never tiny uppercase. |
| `Stat` | `value` · `label` · `unit?` · `prefix?` · `note?` · `size` md\|lg | Real, sourced numbers only. |
| `Callout` | `tone` info\|warning\|success\|danger · `title?` · `icon?` · `live?` | `live` makes it role=status (role=alert for danger) when it appears after an action. |
| `SourceTag` | `source?` (contracts `Source`) or `label` + `url` + `tier` · `verifiedAt?` (ISO) · `compact?` | Renders "Source: X · Verified 12 Oct 2026". **Put one under every visa or city fact block.** |
| `PriceCard` | `name` · `price` · `currency` ($) · `period?` · `description?` · `features[]` · `note?` · `ctaLabel?` · `ctaHref?` · `ctaVariant?` · `ctaAttrs?` · `featured?` · `ribbon?` · `segment?` | A `featured` card gets a teal surface and a gold CTA. |
| `Steps` | `items` (string or `{title, body?}`) · `layout` vertical\|horizontal · `start?` | A real `<ol>`. |
| `Tabs` | `tabs` `{id,label}[]` · `label` · `selected?` · `uid?` | Panels come from named slots matching each tab id. Supports arrow, Home and End keys. Fires a `tabchange` event. |
| `Avatar` | `name` · `src?` · `size` sm\|md\|lg\|xl · `verified?` | Initials fallback with a stable tint per name. |
| `Rating` | `value` (0–5) · `count?` · `showValue?` · `size?` | Announced as "Rated 4.8 out of 5 from 32 reviews". |
| `EmptyState` | `title` · `description?` · `icon?` · `actionLabel?` + `actionHref?` or slot `action` · `titleLevel?` | Always give one next action. |
| `Icon` | `name` · `size` (20) · `label?` · `strokeWidth?` | Names: check, alert, info, calendar, map-pin, passport, globe, clock, star, arrow-right, arrow-up-right, chevron-down, menu, x, shield, users, briefcase, wifi, wallet, lock, plus. Decorative (aria-hidden) unless you pass `label`. |
| `Marquee` | `label` (required, region name) · `speed?` (s/loop, default 40) · `direction` left\|right · `gap?` · `pauseButton?` (true) · `fade?` (true) | CSS-only loop. The slot renders twice and the copy is aria-hidden and inert. Pauses on hover, on focus and with a visible pause button (WCAG 2.2.2). Under reduced motion it stops and wraps. Chips: `.marquee-chip` with `--b2c`, `--b2b` or `--c2c`. |
| `Accordion` | `items` `{question, answer (HTML ok), id?}[]` · `exclusive?` (one open at a time) · `open?` (index) · `name?` · `schema?` (FAQPage JSON-LD) | Native `<details>`, so it works without JS. Opening animates where `interpolate-size` is supported. |
| `Logo` | `href?` (null renders it without a link) · `size` sm\|md\|lg · `markOnly?` | Reads `SITE.name`. |
| `HeroStage` | `label?` · `ratio?` (1 / 1) | `<div data-hero-3d>` with an on-palette SVG fallback. The 3D script appends its `<canvas>` inside and sets `el.dataset.ready = 'true'`, which fades the fallback out. |

Global classes (`global.css`): `.container`, `.container-narrow`, `.section`, `.section--tint`, `.section--brand`,
`.stack` (`--stack-gap`), `.cluster` (`--cluster-gap`), `.grid` (`--grid-min`, `--grid-gap`), `.split` (2 columns ≥960px),
`.section--night`, `.blueprint-grid`, `.seg` + `.seg--b2c|b2b|c2c` (+ `.seg-strong`), `.display-6xl`, `.text-sweep`, `.text-giant`, `.text-outline`, `.overflow-clip`, `.marquee-chip`,
`.lead`, `.muted`, `.small`, `.display`, `.tabular`, `.sr-only`, `.prose` (guides, legal), `.control` (raw input/select/textarea), and `.choice` (checkbox or radio row).

## 6. Do / Don't for frontend agents

**Do**
- Read the brand from `SITE` and the nav from `NAV`. Never hardcode the product name.
- Show a `SourceTag` with a verified date next to every legal fact. Trust is the product.
- Use `Callout tone="warning"` for anything with legal stakes (overstay, fines, rule changes) and `info` for tips.
- Mark sample buddies, listings and reviews with `<Badge variant="demo"/>`, and affiliate links with `variant="paid"` plus `rel="sponsored noopener"`.
- Keep one primary (teal) action per view. Use `accent` (gold) only where money is involved.
- Alternate section tones (`default` → `tint` → `default`) instead of drawing lines between sections.
- Give every section a heading and use one `h1` per page (`Section titleLevel={1}` or your hero).
- Keep tap targets at 44px or more. Label every field visibly, not with a placeholder. Put each error next to its field.
- Add `data-reveal` to section children for GSAP. Content must stay visible if JS fails, so never hide it with CSS by default.
- Check every page at 390px and in dark mode.

**Don't**
- Don't use gradients, glows, glassmorphism or backdrop blur, purple or indigo, emoji as icons, or decorative blobs.
- Don't use tiny uppercase letter-spaced labels or "01 / 02 / 03" numbering (use `Steps`).
- Don't put shadows on cards at rest, and don't add hairline borders around every box. Separate surfaces by tone.
- Don't build rows of identical icon-topped feature cards. Vary the section layouts (split, steps, stats, a list with sources).
- Don't set small text in gold (`--color-accent`), and don't put grey text on a tinted background below 4.5:1.
- Don't invent statistics, testimonials or press logos. Use real sourced numbers or label them Demo.
- Don't use raw hex values, arbitrary z-indexes or one-off font sizes. Add a token instead (ask the UI agent or the main agent).
- Don't remove focus outlines.
