# DispersionX — Backend IBKR (Phase 3)

Service **always-on** qui maintient la connexion socket à IB Gateway/TWS et expose
une API HTTP. **Impossible en serverless** (Netlify) : il faut un VPS/serveur dédié.

```
Navigateur → Netlify (/api/ib/*) → backend-proxy → BACKEND_URL (ce service) → IB Gateway → IBKR
```

## Endpoints

| Méthode | Endpoint               | Description                          |
|---------|------------------------|--------------------------------------|
| GET     | `/health`              | État de la connexion IB              |
| GET     | `/quote?symbols=A,B`   | Derniers prix temps réel             |
| GET     | `/options/atm?symbol=&dte=` | IV ATM + greeks temps réel (straddle) |

Tous les endpoints (sauf `/health`) exigent l'en-tête `Authorization: Bearer <BACKEND_TOKEN>`.

## Pré-requis IBKR

1. Compte Interactive Brokers (papier ou réel).
2. **Souscription aux données de marché options** (sinon pas de greeks/IV).
3. IB Gateway (léger, headless) — lancé via Docker ci-dessous avec auto-login (IBC).

## Déploiement (Docker, recommandé)

Sur un VPS (Hetzner, OVH, DigitalOcean… ~5 €/mois suffit) :

```bash
git clone <ton-repo> && cd backend
cp .env.example .env        # renseigne TWS_USERID, TWS_PASSWORD, BACKEND_TOKEN, ALLOWED_ORIGINS
docker compose up -d --build
docker compose logs -f ibgateway   # vérifier le login IBKR
curl http://localhost:8000/health  # doit renvoyer ib_connected: true
```

> L'image `ghcr.io/gnzsnz/ib-gateway` gère le login automatique et le maintien de session.
> En `TRADING_MODE=paper`, le port API est 4002 ; en `live`, 4001.

## HTTPS (obligatoire pour que Netlify l'appelle)

Mets le backend derrière un reverse proxy TLS. Exemple **Caddy** (`Caddyfile`) :

```
api.mondomaine.com {
    reverse_proxy localhost:8000
}
```

Tu obtiens `https://api.mondomaine.com`.

## Brancher Netlify sur le backend

Dans **Netlify → Environment variables**, ajoute :

| Key            | Value                                   |
|----------------|-----------------------------------------|
| `BACKEND_URL`  | `https://api.mondomaine.com`            |
| `BACKEND_TOKEN`| le **même** token que le `.env` backend |

Puis **Trigger deploy**. Test :

```
https://<ton-site>.netlify.app/api/ib/health
https://<ton-site>.netlify.app/api/ib/options/atm?symbol=AAPL&dte=30
```

## Lancer en local (sans Docker)

Nécessite IB Gateway/TWS déjà lancé et connecté sur le port 4002/7497.

```bash
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --port 8000
```

## Faire passer le ScoreModal sur IBKR plutôt que MarketData

Dans `js/screens/ScoreModal.jsx`, remplace l'appel de surcouche par l'endpoint IB :

```js
// au lieu de DXApi.getOptionAtm(...)
fetch('/api/ib/options/atm?symbol=' + stockTicker + '&dte=' + duration)
  .then(r => r.ok ? r.json() : null)
  .then(opt => { if (opt && opt.iv) setData(prev => ({ ...prev, stock: { ...prev.stock, iv: opt.iv, greeks: opt.greeks, iv_source: 'ibkr' } })); });
```

`source: 'ibkr'` est déjà géré pour l'affichage « IBKR temps réel ».

## Notes

- **ib_insync** est en maintenance communautaire (`ib_async`). Pour migrer : `pip install ib_async`
  et `from ib_async import ...` (API identique).
- IB impose un **clientId** unique par connexion : si plusieurs instances, change `IB_CLIENT_ID`.
- Les **indices CAC/DAX** réels (Euronext/EUREX) passent aussi par IBKR — il suffit d'ajouter
  les contrats `Index('CAC', 'MONEP')`, `Index('DAX', 'EUREX')` dans `ib_service.py`.
