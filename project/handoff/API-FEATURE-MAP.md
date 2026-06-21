# API & Feature Map — DispersionX

Checklist exhaustive de complétude. Chaque endpoint backend + chaque fonctionnalité UI du produit réel, mappé à l'écran qui la porte et aux composants du design system. Source : `dispersion_v3/frontend/js/{api,app,views}.js` + `backend/routers/*`.

Base URL : `window.location.origin + '/api'` (fallback `http://localhost:8000/api`). Health : `GET /health`.

---

## A. Endpoints backend → écran → composants DS

### Indices
| Endpoint | Méthode | Écran | Composants DS |
|---|---|---|---|
| `/indices` | GET | Home (grille) | `index-card` → carte `.dx-glass .dx-lift`, `Badge` (pays/devise) |
| `/indices/{symbol}` | GET | Index Detail | header indice + `tag`s |
| `/indices/{symbol}/snapshot` | GET | Home + Index Detail | `MetricCard` (HV30, IV est., perfs) — chargé async par carte |
| `/indices/{symbol}/components` | GET | Index Detail | table triable des composants |
| `/indices/sources` | GET | Topbar/sidebar | `source-chip` (statut sources : yfinance/FMP/IBKR/…) |

### Quotes (temps réel)
| `/quotes/batch` | POST `{symbols[], weekly, realtime}` | Index Detail | remplit prix/jour/semaine de la table, par lots de 40 |
| `/quotes/index/{symbol}` | GET | (snapshot indice) | — |

### Stocks (scoring)
| `/stocks/auto-score` | POST `{index_symbol, stock_symbol, duration_days, use_ex_action}` | **Score Modal** | tout le modal (voir §B) |

### Lists (objet central)
| `/lists` | GET | Lists, sidebar (récentes + compteur) | `list-card`, `EmptyState` |
| `/lists` | POST `{name, index_symbol, description}` | modal Création | `Button`, form |
| `/lists/{id}` | GET | List Detail, pastille active | — |
| `/lists/{id}` | PUT `{name, description}` | (renommage) | — |
| `/lists/{id}` | DELETE | Lists / List Detail | `Button variant=danger` + confirm |
| `/lists/{id}/items` | POST `{ticker, score_data, notes}` | depuis Score Modal | « Ajouter » |
| `/lists/{id}/items/{ticker}` | DELETE | List Detail | bouton retirer (×) par ligne |
| `/lists/{id}/analysis` | GET | List Detail | `MetricCard`×6 (score pondéré, edge, ρ̄ impl/réal, dispersion ×10⁴, n), `WarningPanel`/reco |
| `/lists/{id}/export` | GET | Lists / List Detail | **export fichier** → download JSON |
| `/lists/export/all` | GET | Lists | **export bundle** → download JSON daté |
| `/lists/import` | POST (contenu fichier JSON) | Lists | **import fichier** via `<input type=file>` |

### Correlation
| `/correlation/list/{id}` | GET | **Correlation Lab** | `CorrelationGauge`, heatmap, `MetricCard` (ρ impl, ρ réal pond., prime, z-score, couverture), tables contributions + secteurs |

### Strategy
| `/strategy/build` | POST `{list_id, strategy_type, sizing_method, index_contracts, duration_days, delta_neutral}` | **Strategy Builder** | config form, table jambes, `MetricCard` agrégats, barre vega, hedge |
| `/strategy/saved/{list_id}` | GET | Strategy Builder | réaffiche la dernière stratégie sauvegardée (+ banner « calculée le … ») |

### Risk
| `/risk/list/{id}` | GET | **Risk Lab** | conclusions, bar-charts P&L, heatmap spot×vol, `RiskBadge`, tables régimes + contributions |

### Monitor
| `/monitor/checklist/{id}` | GET | **Trade Checklist** | blocs Données/Construction/Risque, cases validation |
| `/monitor/commit` | POST `{list_id, name}` | Checklist | bouton « Suivre cette stratégie » (activé si toutes cases cochées) |
| `/monitor/positions?list_id=` | GET | **Monitor** | grille de positions (`index-card`) |
| `/monitor/position/{cid}` | GET | **Position Detail** | P&L live, grecs entrée/actuel, dérive prime, P&L par jambe, snapshots |
| `/monitor/position/{cid}/snapshot` | POST | Position Detail | 📸 Snapshot |
| `/monitor/position/{cid}/close` | POST | Position Detail | Clôturer |
| `/monitor/position/{cid}` | DELETE | Position Detail | Supprimer |

---

## B. Score Modal — détail du payload `auto-score` (l'écran le plus riche)

`data = { scoring, stock, index, metadata }`

- **`scoring`** : `score` (note finale), `signal` (FORT/MODÉRÉ/FAIBLE/NÉGATIF), `signal_color`,
  - **Composantes** : `comp_a_edge` (ρ_impl − ρ̂_réal, pts), `comp_b_vol_premium` (HV−IV, pts), `comp_c_costs` (pts négatifs), `rho_implicit_final`, `rho_real_expected`, `cost_source` (`real_bidask`/estimé), `spread_pct_real`, `cost_spread`, `cost_earnings`.
  - **`subscores`** (0–100 chacun, avec `.score` + `.reason`) : `liquidity`, `vol_attractive`, `dispersion_contrib`, `execution`, `event_risk` → **barres décomposées**. + `composite_score.{score, missing[]}`.
  - **`pipeline`** : `rho_per_window{20,60,120,…}`, `weights_normalized`, `blend`, `regime_factor`, `rho_hat_final` → carte « Pipeline ρ̂ réalisée attendue » (formule).
  - `recommendation` (texte).
- **`stock`** : `symbol`, `weight`, `iv`, `hv`, `beta`, `last_price`, `iv_source` (`estimated_from_hv`/`thetadata`/`alpaca…`), `earnings_in_strategy`, `days_to_earnings`, `earnings_date`,
  - **`iv_rank`** : `iv_rank`, `iv_percentile`, `iv_min`, `iv_max`, `note` → encart IV Rank/Percentile.
  - **`greeks`** (si IBKR temps réel) : `delta`, `gamma`, `vega`, `theta`, `strike`, `expiry`.
- **`index`** : `symbol`, `name`, `iv`.
- **`metadata`** : `duration_days`.

**Composants DS pour ce modal** : `ScoreBadge` (hero score + signal), `MetricCard` (composantes A/B/C/β), barres de sous-scores (réutiliser le motif des sous-scores du builder), `WarningPanel tone=warn` (earnings), `BeginnerExplanationBox` (mode débutant : « Pourquoi ce score ? »), footer avec `<select>` listes + `Button` « Ajouter » + « Nouvelle ».

---

## C. Fonctionnalités UI transverses (à ne pas oublier)

| Fonctionnalité | Où | Détail d'implémentation (réel) |
|---|---|---|
| **Barre de recherche live** | Index Detail | `input#component-search`, filtre `ticker`/`name` à chaque frappe, compteur `x / total`, tri alpha par défaut quand recherche active |
| **Tri de colonnes au clic** | Index Detail, List Detail | en-têtes `.sortable[data-sort]`, cycle **asc → desc → aucun**, flèche `↑/↓`, nulls en dernier ; clés Index : `ticker/weight/price/day/week/sector` ; clés Liste : `ticker/weight/iv/beta/edge/score/added` (défaut `added` desc) |
| **Quotes live par lots** | Index Detail | `batchQuotes(chunk40, weekly=true, realtime=true)`, re-render progressif, `realtime` upgrade le prix Jour via IBKR/Finnhub |
| **Import / Export fichier** | Lists | export = download JSON (1 liste : `dispersion_<nom>.json` ; bundle : `dispersion_listes_<date>.json`) ; import = `<input type=file accept=.json>` → POST `/lists/import`, gère liste seule ou bundle, rename si conflit |
| **Listes récentes + compteur** | Sidebar + Home | `listAllLists()` → badge compteur, 5 récentes en sidebar, 4 cartes « Reprendre une liste » sur Home |
| **Pastille « liste active »** | Topbar | `#btn-active-list` affiche `nom (n items)`, clic → liste |
| **Durée stratégie** | Index Detail | pills `14/30/45/60/90`j, état partagé `app.state.duration`, alimente le scoring |
| **Statut API + sources** | Topbar/sidebar | health toutes les 15 s ; `source-chip` actif/inactif par source |
| **Stepper 7 étapes** | global | 1 Indice · 2 Actions · 3 Liste · 4 Corrélation · 5 Stratégie · 6 Risk Lab · 7 Suivi ; étapes activées selon `currentIndex`/`activeListId` ; `Stepper` DS |
| **Breadcrumb** | Topbar | par vue (ex. Mes listes / {liste} / Corrélation Lab) |
| **Toasts** | global | succès/erreur (création, ajout, export, import, suppression…) |
| **Modal** | global | overlay `rgba(0,0,0,0.7)` + blur ; score, création liste |
| **Logos d'actions** | tables | `utils.stockLogoHtml(ticker)` — conserver |
| **États** | partout | Loading (« Chargement… »), Empty (`EmptyState`), Error (message + action retour), placeholder données manquantes |
| **Persistance thème** | global | `theme-toggle.js` (localStorage `dx-theme`), appliqué avant 1er paint |

---

## D. Indices & données réelles (pour cohérence des maquettes)
5 indices : **SPX** (S&P 500), **NDX** (Nasdaq-100), **DJI** (Dow Jones), **CAC** (CAC 40), **DAX** (DAX 40). Champs carte : `symbol, name, country_flag, currency, n_components, color, etf_proxy, options_liquid, description`. Devise € pour CAC/DAX, sinon $. Composants : `ticker, name, sector, weight`.

> Quand tout endpoint de cette carte a un écran qui le consomme avec la nouvelle DA, et que toutes les lignes du §C sont présentes, le re-skin est **complet**.
