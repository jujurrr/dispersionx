# UI Kit — DispersionX Marketing

Recreation of the DispersionX public landing page. Single scrolling page, composes DS primitives (Button, Badge, MetricCard).

## Files
- `index.html` — entry. Loads React + Babel + `_ds_bundle.js`, mounts `Landing`.
- `Landing.jsx` — all sections: sticky nav, hero (with an app mockup: payoff curve, prime card, mini components, vega), the problem, the three things the strategy captures, the 5-step workflow, why it's useful (6 points), what the site does NOT do, where to execute (IBKR-agnostic), final CTA, footer with disclaimer.

## Notes
- Tone is analytical, never promotional — every signal is framed as "à analyser". Mirrors the content rules in the root readme.
- Dark by default; one accent (blue), semantics for meaning only. Hero uses a subtle radial accent/teal wash — the only "imagery" the brand uses.
- Components used: Button, Badge, MetricCard. The hero mockup is bespoke layout markup (allowed — it depicts the app, not a reusable primitive).
