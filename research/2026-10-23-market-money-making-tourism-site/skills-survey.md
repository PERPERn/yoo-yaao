## Recommended Skills (find-skills survey)

Surveyed via `npx skills find` on 2026-10-23 (queries: travel, affiliate, programmatic seo, directory, monetization). Install counts are from skills.sh at time of query; they signal popularity, not quality guarantee. Treat sub-1K-install skills from unknown authors with caution.

### Already installed globally (per this machine's skill list) — use directly

These cover most of the build. Map to build phases:

- **Content / SEO / discovery:** `programmatic-seo`, `seo-audit`, `ai-seo`, `schema`, `site-architecture`, `content-strategy`, `directory-submissions`, `link-building`, `copywriting`, `copy-editing`.
- **Monetization / conversion:** `offers`, `pricing`, `paywalls`, `cro`, `conversion-tracking`, `referrals`, `lead-magnets`, `free-tools`, `analytics`, `attribution`, `ads`, `ad-creative`.
- **Research / planning:** `market-research`, `customer-research`, `deep-research`, `competitors`, `competitor-profiling`, `marketing-plan`, `marketing-ideas`, `launch`, `shipping-and-launch`.
- **Build (matches existing vanilla-JS + Supabase stack):** `supabase`, `supabase-postgres-best-practices`, `frontend-ui-engineering`, `ui-styling`, `design`, `design-taste-frontend`, `impeccable`, `interface-design`, `ui-ux-pro-max`, `web-design-guidelines`, GSAP set (`gsap-core`/`gsap-scrolltrigger`/`gsap-timeline`), `fixing-accessibility`, `fixing-metadata`, `fixing-motion-performance`, `performance-optimization`, `deploy-to-vercel`, `browser-testing-with-devtools`, `git-workflow-and-versioning`, `ci-cd-and-automation`.

Note: most installed marketing skills appear to come from `coreyhaines31/marketingskills` (e.g. `programmatic-seo` ~148.5K installs, `seo-audit` ~235.1K, `directory-submissions` ~84.1K) — Established within the agent-skills ecosystem by install count.

### Candidate additions (NOT installed) — install only if the chosen model needs them

| Skill package | Installs | When to add |
| --- | --- | --- |
| `mbfinotti/partnerships-skills@affiliate-disclosure-compliance` | ~11.8K | If monetizing via affiliates — FTC/disclosure compliance. |
| `mbfinotti/partnerships-skills@affiliate-commission-structure` | ~11.7K | Modeling affiliate revenue / choosing programs. |
| `mbfinotti/partnerships-skills@affiliate-program-terms` | ~11.8K | Vetting booking/tour affiliate program terms. |
| `mbfinotti/partnerships-skills@affiliate-performance-dashboard` | ~11.8K | Tracking affiliate earnings once live. |
| `price-win/pricewin-skills-hub@pricewin-price-comparison` | ~10.5K | ONLY if building a flight/hotel price-comparison or deal-finder angle. |
| `price-win/pricewin-skills-hub@pricewin-deal-finder` / `pricewin-hotel-search` / `pricewin-flight-search` / `pricewin-booking-assistant` | ~6.9–10.6K | Same deal/booking-product angle; unknown author — vet before trusting output. |
| `agricidaniel/claude-seo@seo-programmatic` | ~6.5K | Alternative programmatic-SEO playbook (already have one installed; skip unless gaps). |

Install command format: `npx skills add <owner/repo@skill> -g -y`

> Caveat: `price-win` and other sub-15K-install hubs are from unknown authors — the find-skills guidance says prefer 1K+ installs and official sources (vercel-labs, anthropics), and be skeptical of low-star repos. Vet their SKILL.md before relying on them. The affiliate-compliance skills are useful but still treat their legal output as a starting point, not legal advice.

> Decision link: which of these to actually install depends on the Step 5 market/model pick — affiliate skills if the pick is affiliate-content; pricewin skills only if the pick is a deals/price-comparison tool.
