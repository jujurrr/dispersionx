# Checklist de lancement — DispersionX

Suivi des démarches avant la mise en ligne commerciale (B2C, France).
Coche au fur et à mesure. `[x]` = fait · `[ ]` = à faire.

> Le **code** est prêt et déployé. Ce qui reste est surtout **administratif / config**.
> Réfs : `ENV.md` (variables), `SUPABASE_SETUP.md` (SQL/RLS), `RGPD-REGISTRE.md`, `SECURITY.md`.

---

## ✅ Déjà fait (code & conformité technique)

- [x] Pages légales : Mentions légales, CGU, CGV (+ liens footer)
- [x] Consentement CGU à l'inscription + acceptation CGV à l'achat
- [x] RGPD : politique de confidentialité, opt-out mesure d'audience
- [x] RGPD : suppression de compte (art. 17) + export « Télécharger mes données » (art. 20)
- [x] RGPD : registre des traitements (`RGPD-REGISTRE.md`)
- [x] Sécurité : CSP/HSTS/en-têtes, RLS, webhook Stripe signé
- [x] Sécurité : rate-limit + validation symboles sur les endpoints de données
- [x] Sécurité : politique de mot de passe forte, `security.txt`
- [x] Sécurité : MFA (TOTP) — côté app (enforcement serveur optionnel via SQL §19)
- [x] Droit financier : statut non-CIF/PSI/MiFID + disclaimers « non personnalisé »
- [x] Pro : export/import de listes & stratégies réservé à Pro (ferme le contournement du partage)
- [x] Stripe : portail de résiliation corrigé
- [x] Hébergement : Supabase en **région UE**
- [x] DPA Vercel : téléchargé et archivé

---

## 🔴 Bloquant — à faire AVANT d'encaisser un paiement

### Identité & statut
- [ ] **Créer la micro-entreprise** (auto-entrepreneur) → obtenir le **SIRET**
- [ ] **Remplir `js/legal-info.js`** (retirer tous les `{{ }}`) :
  - [x] nom (`Jules ROSENZWEIG`), directeur de publication, ville tribunal (`Lyon`), date
  - [ ] **adresse** (domiciliation conseillée si tu ne veux pas afficher ton domicile)
  - [ ] **SIRET** (14 chiffres)
  - [ ] **téléphone** (optionnel)
  - [ ] confirmer **e-mail de contact** réel et relevé

### Médiation de la consommation (obligation B2C)
- [ ] **Adhérer à un médiateur** (CM2C / Medicys / SMCV…) — inscription + cotisation
- [ ] Renseigner **nom + URL + adresse** du médiateur dans `js/legal-info.js`

### Données de marché (le risque à ne pas sous-estimer)
- [ ] **Décider la source des cotations brutes** : fournisseur licencié (Finnhub payant / Polygon / Databento) autorisant l'affichage aux abonnés, **ou** se limiter aux résultats calculés
- [ ] **Ne pas redistribuer** de données d'échange non licenciées (Cboe/Yahoo brut) en commercial
- [ ] Vérifier par écrit les droits d'affichage du/des fournisseur(s) retenu(s)

### Stripe (mode Live)
- [ ] Créer le **produit + prix** → récupérer `STRIPE_PRICE_ID`
- [ ] Basculer les **clés Stripe en Live** (`STRIPE_SECRET_KEY`)
- [ ] **Activer le Customer Portal** (Settings → Billing → Customer portal)
- [ ] Configurer le **webhook** `/api/pro/webhook` (events `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`) → `STRIPE_WEBHOOK_SECRET`
- [ ] Faire **un vrai paiement test** (puis rembourser)

### E-mail
- [ ] `contact@dispersionx.app` (ou autre) **existe et est relevé** (contact légal + support + Stripe)

---

## 🟠 Important — au moment du lancement

### Config technique
- [ ] Toutes les **variables d'environnement Vercel** présentes (suivre `ENV.md`)
- [ ] Tout le **SQL de `SUPABASE_SETUP.md`** appliqué sur le projet UE de prod
- [ ] Supabase → **Confirm email** activé
- [ ] (Si 2FA voulue) Supabase → **MFA TOTP** activé + migration **§19 (aal2)** appliquée

### DPA (accords de sous-traitance à archiver)
- [ ] Supabase (formulaire signé) — copie archivée
- [x] Vercel — PDF archivé
- [ ] Stripe (inclus dans leurs Terms) — PDF archivé
- [ ] Resend (si e-mails d'alerte utilisés) — DPA archivé

### Test bout-en-bout en production
- [ ] Inscription → **confirmation e-mail** reçue
- [ ] Construire une stratégie (mode gratuit)
- [ ] **Passer Pro** (paiement) → fonctionnalités Pro débloquées
- [ ] **Résilier** via le portail Stripe → accès jusqu'à fin de période
- [ ] **Supprimer le compte** → données effacées + abonnement annulé
- [ ] Export « Télécharger mes données » → fichier JSON correct

---

## 🟢 Recommandé — non bloquant

- [ ] **Avis d'un avocat (1 h)** en droit financier : confirmer la qualification (pas d'AMF/CIF pour un outil d'analyse générique)
- [ ] **Domiciliation commerciale** si tu ne veux pas afficher ton domicile
- [ ] Rate-limit **durable** (Upstash / Vercel KV) si le trafic grossit
- [ ] Sauvegardes Supabase vérifiées (selon plan)

---

## Ordre malin recommandé
1. Micro-entreprise → SIRET  →  remplir `legal-info.js`
2. Adhérer au médiateur → compléter `legal-info.js`
3. Trancher les données de marché
4. Stripe Live + webhook + portail
5. Vérifier env/SQL + toggles Supabase
6. Test bout-en-bout → **go live** 🚀
