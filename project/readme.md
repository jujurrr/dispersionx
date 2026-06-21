# DispersionX — Design System

A design system for **DispersionX**, a guided web platform for building **options dispersion strategies** (short index straddle + long single-name straddles = short implied correlation). The product takes a user from *idea* → *index* → *components* → *correlation premium* → *constructed, risk-tested strategy*, ready for **manual** execution on a broker like IBKR TWS.

The system exists to make a genuinely complex quant workflow **legible**: serious enough for an advanced options trader and a quant who wants to check the math, calm and explained enough for a motivated beginner. The aesthetic is institutional, precise, quietly futuristic — a professional volatility tool, never a crypto/casino dashboard. **Beauty serves comprehension of risk.**

> Scope note (from the brief): this design system governs *visual & UX* layers only — layouts, components, copy, tokens, navigation, data presentation, states. It never alters the dispersion math, correlation engine, greeks, or scoring logic, which already exist in the codebase.

---

## Sources analysed

- **Codebase** (read-only, mounted): `dispersion_v3/` — a FastAPI backend + vanilla-JS SPA frontend.
  - `dispersion_v3/frontend/css/style.css` — the production dark "TradingView-like" theme (1727 lines). The **primary source** for the visual language captured here (palette, type, spacing, components like the stepper, components table, score modal, snapshot strip).
  - `dispersion_v3/frontend/index.html`, `js/views.js`, `js/app.js` — sidebar SPA, hash router, view rendering.
  - `dispersion_v3/backend/data/indices.py`, `sp500_components.py`, `index_components.py` — the 5 indices (SPX, NDX, DJI, CAC 40, DAX 40) and real component weights/sectors used for authentic sample data.
  - `dispersion_v3/backend/core/scoring.py`, `correlation.py`, `markowitz.py` — the scoring formula `Score = Edge + (HV−IV) − costs`, implied/realized correlation, dispersion. **Reference only — never re-implemented or changed.**
- **`uploads/DESIGN-notion.md`** — Notion brand analysis, provided as an *editorial-clarity* reference (blocks, whitespace, sober type, "in plain terms" callouts). DispersionX borrows Notion's calm structure and pedagogy, **not** its light palette — DispersionX is dark by default.

No Figma file or logo asset was provided; the brand mark is the production SVG bar-glyph (see `assets/`).

---

## CONTENT FUNDAMENTALS

**Language:** primary UI copy is **French** (the product's audience), with standard finance English terms kept verbatim (*straddle, vega, theta, skew, IV Rank, sell-off, vega-neutral*). Marketing/landing copy is also French. When generating English surfaces, mirror the same tone.

**Voice — analytical, never promotional.** The product *measures, analyses, simulates, tests, structures, identifies an imbalance*. It must **never** sell a dream. Banned vocabulary: "maximisez vos gains", "stratégie gagnante", "opportunité sûre", "revenus passifs", "l'IA trade à votre place". Preferred verbs: **analyser, mesurer, comprendre, simuler, tester, structurer, identifier**. Every signal is "un signal à analyser", never a recommendation to act.

**Pedagogy is built in, two registers:**
- **Beginner mode** — fewer columns, more tooltips, recommendations, and *"En clair"* (in plain terms) explanation boxes.
  - Example pattern: *"En clair : si les actions bougent beaucoup mais pas toutes dans le même sens, la jambe single-name peut gagner tandis que l'indice reste contenu."*
- **Advanced mode** — full matrices, greeks, multi-window correlation, formulas (an "Afficher les formules" toggle), filters, exports.

**Casing & labels:** UPPERCASE micro-labels with wide tracking for metric/column headers (`IV ATM`, `HV 30J`, `PRIME ρ`). Sentence case for body and headings. Units are **always shown** next to figures (`%`, `bps`, `j` for days, `DTE`, `$`).

**Tone of risk:** risks are surfaced *before* construction, plainly. Example: *"Le scénario le plus défavorable actuellement est un sell-off corrélé : l'indice baisse, sa volatilité monte, et les composants se déplacent dans la même direction."* Disclaimers are present and sober: *outil d'aide à la décision, pas un conseil financier.*

**No emoji in chrome.** The legacy app uses a few emoji (flags 🇺🇸🇫🇷, signal dots) — in this system, country flags are acceptable as compact origin markers in dense tables, but status/signal meaning is carried by **color + text label**, not emoji. No decorative emoji anywhere.

---

## VISUAL FOUNDATIONS

**Overall vibe:** a calm, dark trading terminal with the editorial breathing room of a document tool. Dense where the user is an expert (tables, matrices), spacious and explained where they are learning. Slightly futuristic via the electric-blue accent and pulsing live-data dots — never gaming-grade glow.

**Color:** A warm green-black graphite canvas (`--bg-base #0c1310`) with a short stack of progressively lighter green-anthracite surfaces (`--bg-surface → --bg-elevated → --bg-card → --bg-input`). Green-tinted hairlines (`--border #2a3d34`) define structure. Exactly **one** structural accent — a deep café/emerald green `--accent #1f9d63` — for primary actions, active nav, focus; gold (`--gold #cba258`) is reserved for highlight ceremony. Semantics carry meaning only: mint-teal `--pos` (positive / vol cheap / favorable — kept distinct from the emerald action green), red `--neg` (loss / risk), amber `--warn`, violet `--info`. **Color is never decorative.** A second, opt-in **Café Warm light theme** (`[data-theme="cafe"]`: cream canvas, deep green, gold, dark ink) ships alongside — see Theming below.

**Type:** Inter for all UI and display, JetBrains Mono for **every** number, ticker, greek and formula — mono is the signature of "this is data." Display headings are heavy (800) with tight negative tracking (`-0.02em`); body stays 400 at 1.5–1.55 line-height for readability. Metric values are large mono (`--type-data-xl/lg`); figures in tables are mono and **right-aligned**.

**Spacing & layout:** 4px base grid. App is a fixed `240px` sidebar + `52px` topbar + scrolling view; marketing is a centered ~1100px column with generous vertical rhythm. Whitespace (not rules) is the primary grouping device, Notion-style. Cards use internal padding around `20–24px`.

**Backgrounds:** flat dark fills — **no** photographic imagery, no full-bleed photos. The only "texture" is the faint accent/teal gradient wash on hero and analysis panels (`linear-gradient(135deg, rgba(41,98,255,0.08), rgba(38,166,154,0.06))`) and a 1px top gradient hairline on analysis cards. No repeating patterns, no noise.

**Borders, cards, radii:** cards are `--bg-card` + 1px `--border`, radius `--radius-lg (8px)`; large feature/hero panels use `--radius-xl (14px)`; chips/tags/score badges use `--radius-sm (4px)`; pills (durations, status) use `--radius-pill`. Buttons and inputs round at `--radius (6px)` / `4px`. Selectable index/list cards add a 3px accent bar on the left edge that brightens on hover.

**Shadows:** quiet and layered — `--shadow (0 8px 24px rgba(0,0,0,0.4))` for raised cards/modals, `--shadow-lg` for dialogs. Most surfaces rely on the hairline + surface-step alone. No hard drop shadows, no neon glow except the subtle pulse ring on live-status dots.

**Animation:** restrained and functional. `--dur-fast 0.12s` for hover/press color & border shifts, `--dur 0.2s` for toasts/modals, ease `cubic-bezier(0.4,0,0.2,1)`. Cards lift `translateY(-1px)` on hover. The only loops are meaningful: a 2s pulse on "live data" dots, a spinner + flowing progress bar on the loader, a blink on loading quotes. No decorative motion.

**Hover / press states:** hover lightens surface (`--bg-hover`) and/or strengthens border (`--border-strong`); primary buttons go to `--accent-hover`. Active/selected uses `--accent-soft` fill + accent border + accent text. Press is a color shift (and brief `scale` on marketing CTAs), never a heavy bounce.

**Transparency & blur:** modal/loader backdrops use `rgba(0,0,0,0.7)` + `backdrop-filter: blur(4px)`. Soft semantic fills (`--*-soft`, ~14% alpha) tint badges, recommendation boxes and warning banners over the dark canvas.

**Right-alignment & units:** numeric table columns are right-aligned mono; every figure shows its unit; negative/positive values take `--neg-bright` / `--pos-bright`.

---

## ICONOGRAPHY

The production app uses **inline stroke SVG icons** (24×24, `stroke="currentColor"`, `stroke-width="2"`, round caps/joins) — the **Lucide / Feather** visual family (e.g. the docs "book" icon, the list "lines" icon in `index.html`). This system standardizes on **Lucide** (same stroke weight and style), linked from CDN, so icons inherit `currentColor` and sit inline at 16–18px in chrome, 14px in dense rows.

- **Brand mark:** a "correlation arcs" glyph — two opposed arcs (implied vs realized ρ) around a center node — rendered **inline** (not a static `<img>`) so it adapts to the active theme via CSS vars (mint + emerald arcs, themed mark surface, `Dispersion` in `--text` + `X` in `--accent-hover`). Static fallbacks live in `assets/logo.svg` / `assets/wordmark.svg`. On hover the arcs rotate a full turn (`.dx-logo` in `effects.css`). Earlier 3-bar and node concepts were explored in `guidelines/logo-options.html`.
- **Country origin:** compact flag emoji (🇺🇸 🇫🇷 🇩🇪) are acceptable inline in dense index/component tables as origin markers (carried over from the codebase data) — not as decoration.
- **No icon font, no PNG icons** in the source. No decorative emoji.

Usage: keep icons monochrome (inherit text color), reserve accent-colored icons for active nav only. Never hand-draw bespoke illustrative SVGs — use Lucide glyphs.

---

## Index / manifest

**Root**
- `styles.css` — global entry (imports tokens + fonts). Consumers link this one file.
- `readme.md` — this guide.
- `SKILL.md` — Agent Skill manifest (for Claude Code download).

**`tokens/`** — `fonts.css` (Inter + JetBrains Mono via Google Fonts), `colors.css` (surfaces, borders, text, accent, semantics + aliases), `typography.css` (sans + mono type roles), `spacing.css` (4px scale, radii, elevation, motion), `effects.css` (glass / lift / rise / pulse / icon-hover utilities), `themes.css` (the **Café Warm** light theme on `[data-theme="cafe"]`).

### Theming (dark ↔ café)
The default is the dark graphite terminal (`:root`). A warm light theme — **Café Warm** (cream canvas, deep green accent, gold) — is opt-in via `data-theme="cafe"` on `<html>`. All component/kit colors read from the token vars, so the whole system flips with the attribute (smooth color crossfade built into `themes.css`). The UI kits ship a controller, `ui_kits/theme.js` (`window.DXTheme.get/set/toggle`, persisted in `localStorage` under `dx-theme`, applied before first paint), and a **sun/moon toggle** in the app topbar and the marketing nav. Semantic gain/loss stay green/red (tuned for light) so risk reading is never ambiguous.

**`assets/`** — `logo.svg` (3-bar mark), `wordmark.svg` (mark + DispersionX).

**`guidelines/`** — foundation specimen cards: `colors-surfaces`, `colors-accent`, `colors-text`, `type-display`, `type-body`, `type-data`, `spacing-scale`, `spacing-radii`.

**`components/`** — reusable React primitives (namespace `window.DispersionXDesignSystem_cb86be`):
- `core/` — **Button**, **Badge**, **MetricCard**
- `data/` — **ScoreBadge**, **RiskBadge**, **CorrelationGauge**
- `feedback/` — **WarningPanel**, **BeginnerExplanationBox**, **EmptyState**
- `navigation/` — **Stepper**

Each has `.jsx` + `.d.ts` + `.prompt.md`; one `@dsCard` HTML per directory. Several are marked `@startingPoint`.

**`ui_kits/`**
- `marketing/` — public landing page (`index.html` + `Landing.jsx`).
- `app/` — the application: shell + Dashboard + Strategy Builder + Risk Lab (`index.html`, `Shell.jsx`, `Dashboard.jsx`, `Builder.jsx`, `RiskLab.jsx`, `App.jsx`, `data.js`).

### Coverage notes / not yet built
The brief lists more components and app pages than are built here. The system ships the **distinctive, high-value** primitives and three flagship screens. Straightforward additions a consumer can compose from existing tokens/components (not yet authored as standalone primitives): OptionLegTable, StrategyLegCard, Heatmap (a simple version lives in RiskLab), PayoffChart (bespoke SVG in the hero), DataTable/ExpandableRow, EducationalTooltip (the `?` marker pattern lives in MetricCard), AdvancedToggle (lives in the topbar), ExportPanel, LoadingState/ErrorState. App pages Volatility Lab, Screener, Strategy Monitor, Journal, Settings, and the Trade Brief synthesis are stubbed in the app shell. See CAVEATS in the handoff.
