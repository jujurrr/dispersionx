# Sécurité — DispersionX

Posture de sécurité et **checklist pré-lancement**. Ce document accompagne le
durcissement « niveau entreprise » (Bloc 4). Il décrit ce qui protège l'app
aujourd'hui, ce qu'il faut vérifier avant une ouverture publique, et la marche à
suivre en cas d'incident.

## 1. Architecture & surface d'attaque

- **Front** : SPA statique (Vite → `dist/`), servie par Vercel. Un seul script
  self-hosté, aucun script inline (cf. `dist/index.html`).
- **Back** : fonctions serverless Vercel (`api/**`, runtime edge). Pas de serveur
  applicatif persistant (le proxy `api/ib/*` est optionnel, vers un backend fixe).
- **Données** : Supabase (Postgres + Auth) avec **RLS**. En mode invité, tout
  reste en `localStorage` (rien côté serveur).
- **Paiement** : Stripe (Checkout hébergé + webhook). Aucune donnée bancaire ne
  transite ni n'est stockée chez nous.
- **Données de marché** : récupérées **côté serveur** (Cboe/Yahoo/Finnhub) ; le
  navigateur ne parle qu'à `/api` (même origine) et à Supabase.

## 2. Secrets — serveur vs public

| Variable | Portée | Rôle |
|---|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | **Public** (bundle client) | Auth/DB côté navigateur — **protégé par RLS**, publiable par conception |
| `SUPABASE_SERVICE_KEY` | **Serveur uniquement** | Écritures hors-RLS (webhook, cron snapshots, alertes) |
| `STRIPE_SECRET_KEY` | Serveur | Appels API Stripe |
| `STRIPE_WEBHOOK_SECRET` | Serveur | Vérification de signature du webhook |
| `ALERTS_KEY` / `WARM_KEY` | Serveur | Protège les endpoints cron (`?key=`) |
| `BACKEND_URL` / `BACKEND_TOKEN` | Serveur | Proxy IBKR optionnel |
| `MARKETDATA_API_TOKEN`, `RESEND_API_KEY` | Serveur | Replis données / e-mails |

> **Règle d'or** : seules les variables préfixées `VITE_` finissent dans le
> bundle. Ne jamais préfixer une clé service/secrète par `VITE_`.

## 3. Authentification & autorisation

- Auth Supabase (e-mail/mot de passe) ; mots de passe hachés côté Supabase.
- **RLS** : chaque table utilisateur (`lists`, `list_items`, `strategies`,
  `positions`, `trades`, `alerts`, `pro_access`) est protégée par une politique
  `auth.uid() = user_id`. Un utilisateur ne peut lire/écrire que ses données.
- **Accès Pro** : accordé **exclusivement** par le webhook Stripe côté serveur
  (`api/pro/webhook.js`), jamais par le navigateur. Le client ne fait que
  *lire* son statut.

## 4. Webhook Stripe

- Signature `Stripe-Signature` vérifiée en **HMAC-SHA256** à **temps constant**,
  avec tolérance d'horodatage de 5 min (anti-rejeu).
- Écritures `pro_access` via la **clé service** (hors RLS).
- Réponses 5xx en cas d'erreur → Stripe réessaie (idempotence côté handler).

## 5. En-têtes de sécurité HTTP (`vercel.json`)

Appliqués à toutes les réponses :

- **Content-Security-Policy** — `script-src 'self'` (aucun script tiers ni
  inline), `object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`.
  Autorisations minimales : styles inline + Google Fonts, images `https:`,
  `connect-src` limité à l'app et à Supabase (`*.supabase.co`, `wss:`).
- **Strict-Transport-Security** (HSTS, 2 ans, preload) — force HTTPS.
- **X-Content-Type-Options: nosniff** — pas de sniffing MIME.
- **X-Frame-Options: DENY** + `frame-ancestors 'none'` — anti-clickjacking.
- **Referrer-Policy: strict-origin-when-cross-origin**.
- **Permissions-Policy** — caméra/micro/géoloc/USB/paiement désactivés.
- **Cross-Origin-Opener-Policy: same-origin**.

> Ces en-têtes ont été calibrés sur les ressources réellement chargées (un seul
> script self-hosté, styles inline React, Google Fonts, Supabase) : **la CSP
> n'est pas cassante**. Après déploiement, vérifier l'absence de violation CSP
> dans la console du navigateur avant d'estimer le durcissement « validé ».

## 6. Endpoints & entrées

- Endpoints cron (`/api/alerts/run`, `/api/monitor/snapshot-run`) protégés par
  clé (`?key=`) et nécessitant la clé service.
- `/api/monitor/reprice` valide la présence d'une stratégie et **borne** le
  nombre de composants (anti-abus : une reprise = un appel Cboe par jambe).
- Proxy `/api/ib/*` : hôte cible **fixe** (env) + refus de traversée de chemin.
- Repli résilient sur le CDN Cboe (retries + backoff + cache) — pas de secret
  exposé dans les erreurs.

## 7. Confidentialité

Voir la **[politique de confidentialité](#)** in-app (écran « Confidentialité »,
lien en pied de sidebar et du site). Principes : minimisation, pas de traceurs
publicitaires, RLS, droits RGPD (accès/rectification/effacement/portabilité).

---

## ✅ Checklist pré-lancement

**Configuration**
- [ ] Toutes les variables d'env sont définies sur Vercel (cf. §2), **aucune**
      clé secrète préfixée `VITE_`.
- [ ] `STRIPE_WEBHOOK_SECRET` correspond au webhook Stripe en **production**.
- [ ] Endpoint webhook Stripe pointant sur `/api/pro/webhook` (mode live).

**Base de données**
- [ ] RLS **activée** sur toutes les tables (`lists`, `list_items`,
      `strategies`, `positions`, `trades`, `alerts`, `pro_access`, partages).
- [ ] Politiques testées : un compte B ne voit pas les données d'un compte A.
- [ ] Sauvegardes Supabase activées (PITR selon l'offre).

**En-têtes & transport**
- [ ] `vercel.json` déployé ; en-têtes visibles (`curl -I https://DOMAINE`).
- [ ] Aucune violation **CSP** en console sur les pages clés (landing, app,
      confidentialité, paiement).
- [ ] HTTPS forcé (HSTS) ; domaine en `preload` HSTS (optionnel).

**Application**
- [ ] Accès Pro impossible sans passer par Stripe (tester en base).
- [ ] Déconnexion efface bien la session ; mode invité isolé en local.
- [ ] Politique de confidentialité complétée (identité légale + contact réel).

**Divulgation responsable**
- [ ] Adresse de contact sécurité renseignée (ci-dessous).
- [ ] (Optionnel) `/.well-known/security.txt` publié.

---

## Signaler une vulnérabilité

Merci de signaler toute faille de manière responsable, sans divulgation publique
préalable, à : **security@dispersionx.app** *(à compléter par l'adresse réelle
avant lancement)*. Nous accusons réception sous quelques jours ouvrés.

## En cas d'incident

1. **Contenir** : révoquer/roter la clé concernée (Supabase service, Stripe,
   `ALERTS_KEY`/`WARM_KEY`) depuis les consoles respectives.
2. **Évaluer** : identifier les données/comptes touchés via les journaux.
3. **Corriger** : déployer le correctif, invalider les sessions si nécessaire.
4. **Notifier** : informer les utilisateurs concernés et, si requis, la CNIL
   (sous 72 h pour une violation de données personnelles).
