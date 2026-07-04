# DispersionX — Netlify Functions (Phase 2)

Couche API serverless. Le frontend appelle `/api/...` ; `netlify.toml` redirige ces
chemins vers les fonctions ci-dessous. Si une fonction est absente ou renvoie une
erreur 5xx, le client (`js/api.js`) bascule automatiquement sur les données mock.

## Fonctions actuelles

| Endpoint frontend                  | Fonction             | Source        |
|------------------------------------|----------------------|---------------|
| `GET  /api/health`                 | `health.mjs`         | Alpaca /clock |
| `POST /api/quotes/batch`           | `quotes-batch.mjs`   | Alpaca data   |
| `GET  /api/iv/:symbol`             | `iv.mjs`             | **Cboe delayed CDN** (IV réelles, différé 15 min, gratuit, sans clé) |
| `GET  /api/indices/:sym/snapshot`  | `index-snapshot.mjs` | Alpaca/Yahoo (barres) + Cboe (IV réelle) |
| `GET  /api/indices/:sym/components`| `index-components.mjs` | FMP (etf-holder / constituent) |
| `GET  /api/options/atm`            | `options-atm.mjs`    | Cboe delayed (IV + greeks réels) ; repli MarketData.app |
| `POST /api/vol/ticker`             | `vol-ticker.mjs`     | Cboe (IV + clôtures) ; repli Yahoo/HV |
| `GET  /api/vol/spx`                | `vol-spx.mjs`        | Cboe `_SPX` (IV + terme + HV du vrai indice) |
| `POST /api/stocks/auto-score`      | `stocks-auto-score.mjs` | Cboe (IV réelles titre + indice) + clôtures |
| `POST /api/risk/portfolio`         | `risk-portfolio.mjs` | Cboe (IV réelles) + clôtures |

> **Données de volatilité** : depuis juillet 2026, l'IV vient des chaînes d'options
> différées 15 min du CDN public du Cboe (`cdn.cboe.com/api/global/delayed_quotes`) —
> vraies IV de marché, gratuites, sans clé ni quota. Le champ `iv30` du Cboe est la
> valeur comparable à celle affichée par IBKR. La HV est calculée sur les clôtures
> historiques Cboe (ajustées des splits), repli Yahoo pour les valeurs non-US.
> Ces fonctions sont des ré-exports des handlers `api/**` (Vercel) — source unique.

> Les snapshots d'indices passent par l'ETF proxy (SPX→SPY, NDX→QQQ, DJI→DIA,
> CAC→EWQ, DAX→EWG). Variation %, HV et perfs sont fiables ; le niveau absolu est
> reconstitué via un facteur d'échelle (bon pour US, approximatif pour CAC/DAX).

## Clés API — à définir dans Netlify (jamais dans le code)

Netlify → **Site settings → Environment variables** → Add a variable :

| Variable                 | Description                                        | Exemple                         |
|--------------------------|---------------------------------------------------|---------------------------------|
| `ALPACA_API_KEY_ID`      | Clé Alpaca (API Key ID)                           | `PK…`                           |
| `ALPACA_API_SECRET_KEY`  | Secret Alpaca                                     | `…`                             |
| `ALPACA_DATA_FEED`       | `iex` (gratuit) ou `sip` (abonnement)             | `iex`                           |
| `ALPACA_TRADING_BASE`    | `https://paper-api.alpaca.markets` (papier) ou `https://api.alpaca.markets` (réel) | `https://paper-api.alpaca.markets` |
| `FMP_API_KEY`            | Clé Financial Modeling Prep (constituants d'indices) | `…`                    |
| `MARKETDATA_API_TOKEN`   | Token MarketData.app (IV ATM + greeks d'options)     | `…`                    |

Après avoir ajouté les variables, redéployer (Deploys → Trigger deploy) pour qu'elles
soient prises en compte. Sans clés, `health` renvoie 503 → l'app reste en « Mode démo ».

## Test local (optionnel)

```bash
npm i -g netlify-cli
netlify dev          # sert le site + les functions sur http://localhost:8888
# puis : curl http://localhost:8888/api/health
```

## Prochaines fonctions (à brancher au fur et à mesure)

- `GET /api/indices/:symbol/snapshot` → Alpaca (prix/HV) + MarketData/ThetaData (IV)
- `GET /api/indices/:symbol/components` → **FMP** (constituants d'indice + poids)
- `GET /api/correlation/list/:id` → calcul ρ réalisée à partir des barres Alpaca
- Options (IV ATM, greeks) → **MarketData.app** (REST, serverless-friendly)

## Hors serverless (Phase 3 — backend dédié obligatoire)

**IBKR TWS API** et **ThetaData** exigent un processus persistant (IB Gateway/TWS,
Theta Terminal) avec connexion socket → impossibles en Netlify Functions. Ils
nécessitent le backend FastAPI (`dispersion_v3/backend`) hébergé sur un VPS/serveur
always-on, que Netlify appellera via une variable `BACKEND_URL`.
