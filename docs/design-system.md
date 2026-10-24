# Yoo Yaao design system

Snapshot of the visual system as shipped on 24 Oct 2026. The source of truth is the code:
`app/src/styles/tokens.css` (all values), `app/src/styles/global.css` (base + utilities),
`app/src/styles/fonts.css` (type), live reference at `/styleguide`. Longer rationale: `docs/design.md`.

**Rule: components use tokens only. Never put a raw hex, px size or font name in a component.**

Concept: "Teal & Gold on paper". A calm, well-kept office that is also friendly. Thai character comes from
colour (temple-roof teal, gold leaf, lotus) and from type drawn in Bangkok. No clip-art temples, elephants,
flag stripes or tuk-tuks.

## 1. Colour

### Neutrals
| Token | Value | Use |
| --- | --- | --- |
| `--color-bg` | `#f6f3ec` | Warm paper page ground |
| `--color-surface` | `#ffffff` | Cards, inputs |
| `--color-surface-2` | `#eeeae0` | Alternate sections, sunken areas |
| `--color-surface-3` | `#e3ded2` | Hover on surface-2, skeletons |
| `--color-ink` | `#10292b` | Body text, headings (13.8:1) |
| `--color-ink-2` | `#4b5b5a` | Secondary text (6.4:1) |
| `--color-ink-3` | `#5d6b6a` | Placeholder, meta (5.6:1 on white) |
| `--color-border` | `#ddd7ca` | Separators (non-text) |
| `--color-border-strong` | `#8d9998` | Input borders (3:1 non-text) |

### Primary teal
| Token | Value | Use |
| --- | --- | --- |
| `--color-brand` | `#0d6461` | Buttons, links, active nav (6.3:1; white on it 7.0:1) |
| `--color-brand-strong` | `#0a4f4d` | Hover / pressed |
| `--color-brand-tint` | `#d6ebe7` | Teal surface (brand text on it 5.6:1) |
| `--color-on-brand` | `#ffffff` | Text on teal |

### Accent gold (money and premium only)
| Token | Value | Use |
| --- | --- | --- |
| `--color-accent` | `#e3a33a` | **Fills only**: Pro/upgrade, ribbons, stars (ink on it 7.0:1) |
| `--color-accent-strong` | `#d18f22` | Hover |
| `--color-accent-tint` | `#f5e6c8` | Gold surface |
| `--color-accent-text` | `#845a0c` | Gold used as text (6.1:1 on white) |
| `--color-on-accent` | `#10292b` | Text on gold |

Never set small text in `--color-accent`; it fails contrast. Use `--color-accent-text`.

### Segment tints (reserved for the three audiences, not decoration)
| Audience | Background | Strong (text/icon) |
| --- | --- | --- |
| Travellers, lagoon | `--seg-b2c-bg` `#d6ebe7` | `--seg-b2c-strong` `#0d6461` |
| Businesses, sand | `--seg-b2b-bg` `#f5e6c8` | `--seg-b2b-strong` `#845a0c` |
| Locals, lotus | `--seg-c2c-bg` `#f7dccf` | `--seg-c2c-strong` `#9a3d22` |

Body text on any tint: `--seg-ink` `#10292b`.

### Status (functional only)
| State | Colour | Tint |
| --- | --- | --- |
| info | `#1d5fa8` | `#e7eff9` |
| success | `#1e7a44` | `#e3f2e8` |
| warning | `#845a0c` | `#f5e6c8` |
| danger | `#b3261e` | `#fbe9e7` |

Focus ring `--color-focus` `#1d5fa8` (blue, distinct from teal buttons). Scrim `rgb(11 31 33 / 0.55)`.

### Night scene and footer (the one dark variant)
`--night-bg` `#0b1f21` · `--night-surface` `#12302f` · `--night-ink` `#e9efec` · `--night-ink-2` `#9db3b0` ·
`--night-brand` `#5cc8be` · `--night-accent` `#f0b44c` · `--night-line` `#2e5553` (grid) · `--night-line-strong` `#5cc8be` (drawing stroke).
Use `<Section tone="night">` or `.theme-night`; it remaps the semantic tokens locally. **At most once per page**
(home blueprint scene). The footer is the other dark area. `.blueprint-grid` draws the 48px measuring grid.

Proportions: about 80% paper and surfaces, 15% ink, 5% teal, a few gold moments per view. One teal primary button per view.

OS dark mode: tokens.css remaps everything to the night palette under `prefers-color-scheme: dark`, but
`<html data-theme="light">` forces light, so dark mode is currently off. Decide: remove the forced theme or update the docs.

## 2. Typography

| Role | Family | Notes |
| --- | --- | --- |
| Display (headings, big scene type) | **Bricolage Grotesque** variable, optical size | `--font-display`; tightens itself at large sizes |
| Body and UI | **Public Sans** variable (+ italic) | `--font-body`; tabular and fractional figures |
| Thai (and ฿) fallback in both stacks | **Anuphan** variable (Cadson Demak, Bangkok) | Downloads only when Thai appears |
| Mono | system mono | `--font-mono` |

Self-hosted through `@fontsource` (CSP is `'self'` only, works offline in the PWA).

Fluid scale (min @ 360px, max @ 1280px):
`--text-xs` 13 · `--text-sm` 15 · `--text-base` 17 (body) · `--text-lg` 18–20 (lead) · `--text-xl` 20–24 ·
`--text-2xl` 24–32 (h3) · `--text-3xl` 30–44 (h2) · `--text-4xl` 38–68 (h1) · `--text-5xl` 44–92 (hero) ·
`--text-6xl` 52–144 (scene headline) · `--text-sweep` 72–256 · `--text-giant` 80–320 (finale wordmark).

Leading: tight 1.04 · snug 1.18 · normal 1.6 · display 0.9.
Tracking: display −0.022em (h1) · heading −0.015em (h2) · giant −0.025em.
Weights: 400, 500, 600, 700. Running text measure: `--measure` 68ch, applied to `p` and `blockquote` only
(not `li`/`dd`: they are card and grid cells; capping them squeezed whole pages).

Style rules: sentence case eyebrows in teal, never tiny tracked caps. Tabular numbers for money and dates.

## 3. Space, layout, shape

- Spacing, 4px base: `--space-1` 4 · 2 8 · 3 12 · 4 16 · 5 20 · 6 24 · 8 32 · 10 40 · 12 48 · 16 64 · 20 80 · 24 96.
  Section padding `--space-section` = clamp(4rem, 2.5rem + 6vw, 8rem).
- Container `--container` 76rem; narrow 46rem; gutter clamp(1rem, 0.5rem + 2vw, 2rem). Use `.container` / `<Section>` for width.
- Header height `--header-h` 4.25rem. Minimum tap target `--tap-min` 44px.
- Radius: sm 6 · md 10 · lg 16 · xl 24 · 2xl 32 (segment panels, posters) · pill 999.
- Utilities: `.stack`, `.cluster`, `.grid` (auto-fill, set `--grid-min`), `.split`, `.section--tint|brand|night`.

## 4. Elevation, motion, layers

- Elevation: `--elev-1` rest, `--elev-2` hover/open (`--shadow-raise`), `--elev-3` floating (menus, header; `--shadow-float`),
  `--elev-inset` sunken (inputs). Ink-tinted shadows with a 1px top highlight.
- Motion: ease-out `cubic-bezier(0.22, 1, 0.36, 1)`; fast 150ms (press, colour) · base 200ms (hover lift) · slow 320ms ·
  reveal 700ms, distance 24px. Only transform and opacity animate. Everything is skipped under `prefers-reduced-motion`,
  and content is never hidden by CSS, so it still shows without JS. GSAP via `data-reveal`, `data-reveal-stagger`,
  `data-count-to`, `data-parallax`, `data-intro` (`app/src/scripts/motion.ts`).
- Z layers: base 0 · raised 10 · stage 20 (pinned 3D canvas) · header 100 · overlay 200 · modal 300 · toast 400.

## 5. Components (`app/src/components/ui/`)
Accordion, Avatar, Badge, Button, Callout, Card, EmptyState, Field, HeroStage, Icon, Input, Logo, Marquee,
PriceCard, Rating, Section, Select, SourceTag, Stat, Steps, Tabs. Page-level: `core/PageHeader`, `core/Breadcrumbs`,
`core/ProBand`, `core/DocChecklist`, `core/LegalNote`, `money/PayNotice`, `money/BuddyCard`, `chat/Chat`.
Layouts: `Base` (public), `Business`, `Admin`. Account menu in the Base header (avatar, name, Profile, Messages, Log out).

## 6. Accessibility floor
- All text pairs meet WCAG AA against their surface (ratios noted above). Known gap from the audit: 32 spots at 3.1–4.5:1 and
  footer link contrast; fix by moving to `--color-ink-2` or darker tokens, not by new colours.
- Focus is always visible (blue ring). Links are never distinguished from text by colour alone.
- Exactly one `<h1>` per page. Thai text always renders in Anuphan, never the OS face.

## 7. Do and don't
- Do reuse tokens; add a token before adding a one-off value.
- Do keep gold for money and premium; keep segment tints for the three audiences.
- Do use `SourceTag` on every legal fact and price.
- Don't use side-stripe accent borders, decorative grids outside the night scene, or gradient text.
- Don't cap `li`/`dd` width globally.
- Don't use the night scene more than once per page.
- 3D hero: shows in hero, in wireframe in the blueprint scene (poses in `app/src/scripts/home-scroll.ts`), and above the finale wordmark.
