# UI Kit — DispersionX Application

High-fidelity recreation of the DispersionX app (the private tool). Composes the design-system primitives from `_ds_bundle.js`; layout-specific markup lives in the screen files.

## Files
- `index.html` — entry. Loads React + Babel + `_ds_bundle.js` + screens, mounts `App`.
- `data.js` — sample (non-live) figures mirroring the codebase indices + SP500 weights → `window.DXData`.
- `Shell.jsx` — `Sidebar` (workflow/analyse/suivi nav, data-status footer) + `Topbar` (breadcrumbs, market state, Débutant/Avancé toggle).
- `Dashboard.jsx` — Market Overview, Opportunités table, Stratégies suivies, Alertes, beginner pedagogy.
- `Builder.jsx` — 8-step `Stepper` wizard; fully built steps: Indice (selectable cards), Composants (dense table, density follows mode), Corrélation (gauge + premium), Synthèse (renders the Trade Brief).
- `TradeBrief.jsx` — report-grade final synthesis: résumé en une phrase, construction (legs + vega balance), pourquoi/risques, données clés, checklist, export. Reached via Builder step 8 (Synthèse).
- `VolatilityLab.jsx` — IV vs HV, term structure, skew, open interest, multi-expiry skew (advanced); IV Rank / Percentile metrics.
- `CorrelationLab.jsx` — ρ realized matrix (teal→red heatmap), implied-vs-realized 90-day history (premium band), CorrelationGauge, strategic reading.
- `StrategyMonitor.jsx` — open positions table (P&L, vega, theta, prime drift, status), portfolio summary, selected-position detail with alerts.
- `RiskLab.jsx` — aggregated greeks, scenario selector, worst-case explainer, P&L heatmap, P&L attribution (par sous-jacent / par secteur), warnings.
- `App.jsx` — shell + screen routing + Débutant/Avancé mode state.

## Notes
- The **Débutant / Avancé** toggle (topbar) changes table density and shows/hides pedagogy. Try it on Builder → Composants.
- Click the stepper to move between builder steps; sidebar switches screens.
- Components used: Button, Badge, MetricCard, ScoreBadge, RiskBadge, CorrelationGauge, WarningPanel, BeginnerExplanationBox, Stepper.
- No live data, no real calculations — figures are illustrative. The visual/UX layer only; never alters the dispersion/correlation/greeks math.
