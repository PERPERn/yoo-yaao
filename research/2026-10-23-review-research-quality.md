# Research Quality Review — 2026-10-23

Review of `2026-10-23-market-money-making-tourism-site.md` (parent study) and the in-progress `2026-10-23-market-nomad-visa-sea-hub.md` (deep-dive), done with the `verification-before-completion` discipline: sub-agent reports were not trusted as-is; load-bearing claims were re-checked with fresh searches.

## 1. Requirement checklist (against the user's original request)

| Requirement | Status | Evidence |
| --- | --- | --- |
| Research data to brainstorm money-making tourism-site ideas | Done | 6 axis notes + synthesis in parent report |
| Support a build/no-build decision | Partly done | Verdict + ranked ideas exist; niche validation (deep-dive) still running |
| Use the "make me money" approach and scoring the user said is in this directory | **Not done** | No file matching "make me money", scoring, or rubric found in `/Users/cu29/Work/All_For_One` (excluding `research/`), `~/.claude/skills`, or `~/.agents`. The ideas were ranked by my own judgment, not by the user's rubric. |
| find-skills survey of skills to use | Done | `2026-10-23-market-money-making-tourism-site/skills-survey.md` |
| Install `obra/superpowers` | Done, with a caveat | 15 skills installed **project-local** at `.agents/skills/` and symlinked for Claude Code. A global install failed: "PromptScript does not support global skill installation". |
| Final polished report (Step 6) | Pending | Report-writer has not yet added the Executive Summary or Sources section |

## 2. Spot-verification of load-bearing claims

| Claim in report | Verdict | Fresh evidence |
| --- | --- | --- |
| Thailand 2025: 32,974,321 arrivals (−7.23%), 1.536T baht | **Confirmed** | [Asia News Network](https://asianews.network/?p=248960), [Bernama](https://www.bernama.com/en/news.php?id=2509419), [Skift](https://skift.com/2026/01/06/why-thailands-foreign-tourist-numbers-slipped-in-2025-and-what-it-means-for-2026/) |
| 2025 source-market order | **Minor fix** | Malaysia 4.52M, China 4.47M, India 2.49M, **Russia 1.9M, South Korea 1.55M** (the report's 2024 order put Korea ahead of Russia; in 2025 Russia is #4) |
| Amadeus Self-Service portal shut down July 17, 2026 | **Confirmed** | [PhocusWire](https://www.phocuswire.com/amadeus-shut-down-self-service-apis-portal-developers). New detail: Amadeus later said it is working with Anthropic to give developers access to its content inside AI dev environments ([PhocusWire](https://www.phocuswire.com/news/technology/amadeus-anthropic-claude-developers-travel-sellers)). |
| Booking.com cut "thousands" of affiliates, May 2025 | **Confirmed, framing too strong** | [Skift](https://skift.com/2025/05/30/why-booking-com-cut-thousands-of-affiliate-partners-and-what-comes-next/). Affiliates were moved to networks (CJ, Awin, Affnetmedia) rather than losing access entirely. One unconfirmed source says partners earning more than about €1,000/month were spared. The report should say "direct terms were withdrawn and partners were moved to networks", not "income switched off". |
| Pew: AI summary cuts clicks from 15% to 8% | **Confirmed** | [Pew Research, 2025-07-22](https://www.pewresearch.org/short-reads/2025/07/22/google-users-are-less-likely-to-click-on-links-when-an-ai-summary-appears/). Caveat: the panel was 900 US adults; it says nothing about non-US users or revenue. |
| Mediavine thresholds | **Report is internally inconsistent; must fix** | Journey dropped from 10,000 to **1,000 sessions/month on 2026-01-15** (Tier-1 traffic). The main network now requires **$5,000/yr ad revenue**, though some sources still list 50k sessions ([Productive Blogging](https://www.productiveblogging.com/?p=15446), [Jupiter](https://www.jupiter.co/blog/mediavine-requirements-2026-how-to-qualify)). The monetization section's "display is dead money below ~50K sessions" and its revenue ladder use the old threshold. |
| Nomad List "decline ~$704K (2023) → ~$47K MRR (2024)" | **Downgrade: unverified, and the units don't match** | The only corroborated number is an undated ~$47K MRR (≈ $560K/yr) from estimator sites ([gaps.com](https://gaps.com/travel/)). Other estimates say $3–5M/yr. Comparing an annual figure with an MRR figure overstates any decline. The report should drop "decline" and say the revenue is unverified. |
| Thai vs Western RPM gap (~10x) | **Direction holds, size is soft** | US display RPM appears as $20–50 in an undated blog. Thailand's only data point is a YouTube RPM (~$0.55), not display ([dynamoi](https://dynamoi.com/data/youtube-adsense-rpm/th)). No source compares display RPM like-for-like. Treat as Low–Medium: "large gap, likely 5–20x". |
| DTV ~35,000 applicants in year 1 | **Unverified** | No official count found. Official embassy pages give terms only ([Thai Embassy Helsinki](https://helsinki.thaiembassy.org/en/publicservice/destination-thailand-visa-dtv)). New: stricter DTV documentation rules reported **effective 2026-08-31** ([Envoy Global](https://www.envoyglobal.com/news-alert/thailand-tightens-destination-thailand-visa-dtv-requirements/)). This needs to reach the deep-dive visa axis. |

## 3. Synthesis-level weaknesses (my own errors)

1. **Garbled AI-intent statistic.** The Key Findings say AI "still routes clicks on transactional intent (~2–3%)". The source figure means transactional queries are only about 2–3% of the volume AI answers cite. That supports the conclusion (AI rarely substitutes for transactional pages), but the wording misstates it. Needs rewording.
2. **Unreconciled RPM ranges.** Travel display RPM appears as $10–18 (monetization axis), $15–35 (Thailand axis), and $25–35 stable (threats axis). The synthesis never reconciles them. A defensible single statement: "~$10–35 depending on Tier-1 share; US-heavy sites reach the top of the range."
3. **No first-party evidence.** Everything is secondary research. The `customer-research` skill treats interviews and surveys as the highest-signal evidence, and none exist yet. The deep-dive audience axis (Reddit VOC) is a proxy, not a substitute.
4. **The biggest unknown is still open.** No source gives time-to-traffic (months to reach 1k / 25k sessions for a new site in 2026). The go/no-go depends most on this number.
5. **The ideas were not scored with the user's rubric** (see section 1), because it was never located.

## 4. Verdict

The research is **solid on direction** and **weak on exact numbers**. The core conclusions survived re-checking: the blog model is the worst bet, English inbound beats Thai domestic, tools and data beat articles, owned audience beats RPM, and pure client-side rendering is an SEO risk. Most dollar figures are still Low confidence.

**Not yet complete enough to commit build time:**

- Fix the Mediavine, Booking, Nomad List, and AI-intent errors in the parent report.
- Finish the deep-dive (demand, VOC, competitors, visa data, monetization, build plan).
- Score the ideas with the user's own rubric once it is located.
- Before building, validate with real-world signal: a keyword-tool pull for the niche and 5–10 conversations with actual nomads.
