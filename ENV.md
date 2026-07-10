# Variables d'environnement — DispersionX (Vercel)

Checklist générée depuis le code (`process.env.*` / `import.meta.env.*`). À vérifier
dans **Vercel → Settings → Environment Variables** (portée **Production**, et Preview
si besoin) avant le lancement.

> ⚠️ **Règle d'or** : seules les variables préfixées `VITE_` finissent dans le bundle
> navigateur (publiques par conception). **Ne jamais** préfixer une clé secrète par `VITE_`.

## Minimum pour un lancement complet

`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`,
`STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`, `FINNHUB_API_KEY`.

*(Sans aucune variable, l'app tourne quand même en **mode invité** avec les données
gratuites Cboe — mais sans comptes, sans paiement et avec des cotations limitées.)*

---

## Client (bundle navigateur — préfixe `VITE_`, publiques)

| Variable | Requis | Rôle / conséquence si absente |
|---|---|---|
| `VITE_SUPABASE_URL` | **Oui** (comptes) | URL du projet Supabase (auth/DB côté navigateur). Absente → pas de comptes, tout reste local. |
| `VITE_SUPABASE_ANON_KEY` | **Oui** (comptes) | Clé anon **publique** (protégée par RLS). Idem : nécessaire aux comptes/cloud. |
| `VITE_PRO_ANNUAL` | Non | `1` → active l'offre **annuelle** dans l'UI (nécessite aussi `STRIPE_PRICE_ID_ANNUAL`). |

## Serveur — Supabase

| Variable | Requis | Rôle / conséquence si absente |
|---|---|---|
| `SUPABASE_URL` | **Oui** | Utilisée par le webhook Stripe, la **suppression de compte**, les crons. (repli : `VITE_SUPABASE_URL`) |
| `SUPABASE_SERVICE_KEY` | **Oui** | **SECRET** (service role). Octroi du Pro (webhook), suppression de compte, snapshots/alertes. Absente → paiement non honoré, suppression compte KO. |

## Serveur — Stripe (abonnement)

| Variable | Requis | Rôle / conséquence si absente |
|---|---|---|
| `STRIPE_SECRET_KEY` | **Oui** (Pro) | Checkout, portail de résiliation, webhook, annulation à la suppression de compte. |
| `STRIPE_PRICE_ID` | **Oui** (Pro) | ID du prix **mensuel**. Absente → checkout renvoie `stripe_non_configure`. |
| `STRIPE_WEBHOOK_SECRET` | **Oui** (Pro) | Vérification de la signature du webhook. Absente → aucun accès Pro n'est accordé. |
| `STRIPE_PRICE_ID_ANNUAL` | Non | ID du prix **annuel** (si offre annuelle activée). |
| `APP_URL` | Non | URL de repli pour `return_url`/`success_url` si l'en-tête `Origin` est absent. |

## Serveur — Données de marché

| Variable | Requis | Rôle / conséquence si absente |
|---|---|---|
| `FINNHUB_API_KEY` | Recommandé | Cotations temps réel + calendrier des résultats. Absente → repli Alpaca/Yahoo, cotations limitées. |
| `ALPACA_API_KEY_ID` | Non | Repli cotations (Alpaca IEX, différé 15 min). |
| `ALPACA_API_SECRET_KEY` | Non | Idem (paire avec la précédente). |
| `ALPACA_DATA_FEED` | Non | Flux Alpaca (défaut `iex`). |
| `MARKETDATA_API_TOKEN` | Non | Repli chaîne d'options (MarketData.app). Le Cboe gratuit couvre l'essentiel. |

> **Sans clé** : Cboe (IV/HV/chaînes différées) et Yahoo Finance fonctionnent déjà.

## Serveur — E-mails & tâches planifiées (crons)

| Variable | Requis | Rôle / conséquence si absente |
|---|---|---|
| `RESEND_API_KEY` | Non | Envoi des e-mails d'alerte. Absente → alertes visibles **in-app** uniquement. |
| `ALERTS_FROM` | Si Resend | Adresse expéditrice des e-mails d'alerte. |
| `ALERTS_KEY` | Si crons | Protège les endpoints cron (`?key=`) : alertes, notifications, snapshots. |
| `WARM_KEY` | Si crons | Protège les endpoints de pré-chauffe (`?key=`). |

## Serveur — Proxy IBKR (optionnel)

| Variable | Requis | Rôle |
|---|---|---|
| `BACKEND_URL` | Non | Backend IBKR pour le proxy `/api/ib/*` (What-If avancé). |
| `BACKEND_TOKEN` | Non | Jeton d'authentification vers ce backend. |

---

## Réglages hors variables d'environnement (dashboards)

- **Supabase → Authentication → Providers → Email** : activer **« Confirm email »** (vérification d'e-mail).
- **Supabase → Authentication → MFA** : activer **TOTP** (pour la double authentification in-app).
- **Supabase** : choisir une **région d'hébergement UE** (RGPD).
- **Stripe → Settings → Billing → Customer portal** : **activer** (portail de résiliation).
- **Stripe → Webhooks** : endpoint `/api/pro/webhook` abonné à `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.

*Voir aussi `SECURITY.md` (portée des secrets) et `SUPABASE_SETUP.md` (schéma & RLS).*
