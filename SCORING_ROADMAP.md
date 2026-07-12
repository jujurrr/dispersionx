# Feuille de route — scoring de dispersion → modèle quantitatif validé

État actuel : moteur cohérent économiquement (corrélation implicite CBOE réelle,
vega-pondération, IV-rank honnête, earnings recadré) **mais non validé sur données**.
Objectif : passer d'un « screener intelligent » à un **modèle mesuré** (Score →
Trade simulé → P&L → Validation).

Principe directeur : **arrêter d'ajouter des facteurs, commencer à mesurer.**
Pas de skew, pas de ML tant que le score actuel n'est pas validé out-of-sample.

Effort noté en jours-homme approximatifs. Risque = de casse en prod.

---

## #0 — Dataset de validation `signal_history`  ·  FAIT (b49c478)  ·  0,5 j  ·  risque nul

Log quotidien du vecteur complet (score + 5 sous-scores + ρ_impl/ρ_real/iv/hv/
iv_rank/spread + sources) par (symbol, date, index, duration). **Contrainte = le
temps** : on ne valide que ce qu'on a loggé → lancé en premier.
Reste à faire côté user : **créer la table `public.signal_history`** (SUPABASE_SETUP §7).
Suivi : `/api/iv-status` → `signal_history_rows`.

---

## #1 — Fonctions canoniques + fenêtres séparées  ·  FAIT  ·  risque faible

**Problème** : 3 formules de corrélation implicite (CBOE / VIX / ratio² HV) et 2
fenêtres de réalisé (252 vs 60) coexistent. Le correctif IV-rank a couplé par
accident la fenêtre de corrélation à 252 j.

**Cible — une seule implémentation, partout** :
```
calculateImpliedCorrelation(sigmaIndex, [{w, sigma, vega}], mode)   # = formule CBOE
   ρ = (σI² − Σwᵢ²σᵢ²) / ((Σwᵢσᵢ)² − Σwᵢ²σᵢ²),  clamp [0.05, 0.95]
   mode ∈ {vega, notional}. Baromètre : mêmes formules, σ = HV (faute d'IV
   historique) — PLUS le raccourci (σidx/σmoy)². Matrice « VIX » : remplacée.

calculateRealizedCorrelation(returnsMatrix, window)                 # une seule pearson
```
**Fenêtres (échéance ~45 j)** :
| Grandeur | Fenêtre | Raison |
|---|---|---|
| Corrélation réalisée | **60 j** (idéalement blend/EWMA court) | horizon du trade + trajectoire (queue) |
| Vol idiosyncratique (HV) | **60 j** | horizon du trade |
| IV Rank | **252 j** | convention broker |
| Beta / régime | **252 j** | statistique lente (beta = display only) |

Découpler `fetchBarsData` : garder 252 clôtures pour le range IV-rank, mais
calculer corrélation/idio sur la **tranche 60 j**.

---

## #2 — Score de confiance A/B/C  ·  FAIT  ·  risque nul

Les drapeaux existent déjà (`rho_impl_source`, `iv_source`, `iv_rank_method`,
`cost_source`) → simple agrégation :
```
A = tout réel (ρ_impl cboe_vega + iv cboe + spread réel + iv-rank true)
B = un proxy (ρ_impl notional/HV, iv marketdata, iv-rank estimé…)
C = fallback (ρ_impl 0.65, iv = HV×1.15, liq = 45)
```
Exposer `confidence` dans le payload + badge ScoreModal. Honnêteté immédiate.

---

## #3 — Architecture : gate corrélation + 2 couches  ·  ~1 j  ·  risque moyen (derrière flag)

**Problème** : le score additif laisse une mauvaise corrélation être compensée ;
et il écrase un edge de PANIER dans un score par ACTION.

**Cible — séparer les deux couches** :

Couche A — **par action = éligibilité + qualité** (pas l'edge de panier) :
```
corrGate = sigmoid( (ρ_index_impl − ρ_real_name − premiumMin) / k )   # ∈ [0,1]
   premiumMin ≈ 0.05 (prime minimale pour payer le risque de queue) — CALIBRÉ par #4
   k ≈ 0.08 (douceur) — CALIBRÉ
quality = w1·(100−ivRank) + w2·idioScore + w3·costAdjScore   # 0..100
   earnings = léger modificateur (catalyseur), pas un gros terme additif
nameScore = corrGate · quality
```
→ un nom plus corrélé que (implicite − primeMin) : gate → 0 → score → 0. Les
éligibles sont classés par qualité.

Couche B — **edge de panier** (le vrai signal du trade, au niveau portefeuille) :
```
basketEdge = ρ_impl_basket(vega) − ρ_real_basket(vega, 60 j) − riskAdj(régime)
netEdge    = basketEdge − coûtExécution(panier)     # net de spread round-trip
```
**NE PAS calibrer w1/w2/w3/premiumMin/k avant #4.** Les poser en défauts,
mesurer, ajuster.

---

## #3bis — Ajustement de régime / risque de queue  ·  ~0,5 j  ·  risque faible

La dispersion = beaucoup de petits gains, quelques grosses pertes (short
corrélation ⇒ short krach). Le score doit connaître le régime :
```
stress = f(VIX_level, VIX_percentile, VIX_term_structure, SPY_drawdown_1m)
riskAdj = clamp(stressPenalty, 0, 0.5)      # jusqu'à −50 % d'edge en stress
```
Applique un haircut sur `basketEdge` (couche B), pas sur la qualité.

---

## #4 — Backtest (LA validation)  ·  ~1,5 j  ·  dépend de ~60-90 j de données #0

**Protocole à DEUX niveaux** (ne pas confondre) :

Niveau 1 — **validation du SIGNAL, sans bruit directionnel** :
```
capture_corr(t → t+H) = ρ_impl(t) − ρ_real(t..t+H)     # variance-based
```
Classer les snapshots par score → quintiles → mesurer la capture moyenne par
quintile. **PASS si** top quintile > bottom, monotone, out-of-sample.
(Réutilise la logique de `api/backtest/dispersion.js`, déjà propre.)

Niveau 2 — **tradabilité, P&L d'options réaliste net de coûts** :
```
book vega-neutre (long composants straddle, short indice straddle),
avec thêta, dérive de delta, coût round-trip = 2 jambes × spread ATM réel.
→ P&L net, hit rate, max drawdown, Sharpe par quintile de score.
```
**Avant de toucher un seul poids : passer le Niveau 1.** Si le top quintile ne
capture pas plus que le bottom, le score ne vaut rien — on refait le modèle.

---

## #5 — Optimisation panier (la vraie différenciation)  ·  ~1 j  ·  risque moyen

Le finder EXISTE déjà (glouton + swaps) mais son objectif double-compte la
corrélation et le workflow « score action → liste » le contourne.
```
maximiser  E[netEdge du panier]  sous contraintes :
   nb d'actions, poids vega, concentration sectorielle, corrélation intra-panier,
   coût d'exécution total.
```
Canoniser l'objectif (couche B + #3bis), router l'utilisateur par le finder au
lieu du chemin par action. → passe de screener à outil quasi-institutionnel.

---

## Ordre d'exécution recommandé

1. **#0** (fait) — créer la table, laisser tourner. Horloge lancée.
2. En parallèle, sans attendre : **#1** (canonique + fenêtres) + **#2** (confiance).
   Sûrs, améliorent la cohérence, n'invalident pas le dataset (on logge les nouvelles valeurs).
3. **#3 + #3bis** derrière un flag, avec des poids par défaut NON calibrés.
4. À ~60-90 j de `signal_history` : **#4 niveau 1**. Décision go/no-go sur le modèle.
5. Si go : calibrer #3, puis **#4 niveau 2**, puis **#5**.

## Ce qu'on NE fait PAS maintenant
Skew / surface de vol, machine learning, nouveaux facteurs. Tant que #4 niveau 1
n'est pas passé, tout ajout est du sur-apprentissage déguisé.
