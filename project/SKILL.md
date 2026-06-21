---
name: dispersionx-design
description: Use this skill to generate well-branded interfaces and assets for DispersionX, a guided options-dispersion analysis platform, either for production or throwaway prototypes/mocks. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the `readme.md` file within this skill, and explore the other available files.

DispersionX is a dark-by-default, institutional financial tool for building and risk-testing options **dispersion** strategies. The aesthetic is serious, precise, calm and slightly futuristic — never crypto/casino. One structural accent (electric blue); semantic colors carry meaning only. Inter for UI, JetBrains Mono for every number/ticker/greek. Tone is analytical and pedagogical, never promotional — "analyser / mesurer / comprendre", never "maximiser vos gains".

Key files:
- `styles.css` + `tokens/` — link/import for colors, type, spacing, fonts.
- `assets/` — `logo.svg`, `wordmark.svg`.
- `components/` — React primitives (Button, Badge, MetricCard, ScoreBadge, RiskBadge, CorrelationGauge, WarningPanel, BeginnerExplanationBox, EmptyState, Stepper).
- `ui_kits/marketing/` and `ui_kits/app/` — full-screen recreations to copy from.
- `guidelines/` — foundation specimen cards.

If creating visual artifacts (slides, mocks, throwaway prototypes), copy assets out and create static HTML files for the user to view. If working on production code, copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without other guidance, ask what they want to build, ask a few questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need. Never change dispersion/correlation/greeks/scoring math — only the visual and UX layers.
