# Handoff Claude Code — DispersionX : brancher la nouvelle DA sur le backend réel

> **But.** Garder le **visuel** et **l'organisation des pages** du nouveau design system DispersionX, et y **rebrancher l'intégralité des fonctionnalités** du produit existant (`dispersion_v3/`) : listes, import/export, scoring de dispersion, recherche, tri de colonnes, corrélation, stratégie, risque, checklist, suivi de positions.
>
> **Rien de la logique métier ne change** — formules de dispersion, corrélation, grecs, scoring, sizing, appels API. On ne retouche que la couche présentation.

Ce paquet est écrit pour être exécuté par **Claude Code** (ou un dev) directement dans le repo `dispersion_v3/`, qui a accès au backend FastAPI et peut écrire le vrai code.

## Les 3 documents
1. **`CLAUDE-CODE-HANDOFF.md`** (ce fichier) — approche, architecture cible, usage du design system, ordre de construction.
2. **`API-FEATURE-MAP.md`** — chaque endpoint backend + chaque fonctionnalité UI → l'écran qui la porte + les composants DS à utiliser. La checklist de complétude.
3. **`SCREEN-SPECS.md`** — spec écran par écran : données affichées, interactions, états, formes de payloads.

Le design system lui-même (tokens, composants, kits) est dans le dossier parent : `../readme.md`, `../styles.css`, `../tokens/`, `../components/`, `../ui_kits/`.

---

## 1. Le constat : ce qui existe vs ce qui est maquetté

Le **produit réel** (`dispersion_v3/frontend`) est une SPA vanilla-JS (hash-router) **organisée autour d'un objet central : la « Liste »** (un panier nommé d'actions, rattaché à un indice). Le parcours réel est :

```
1 Indice  →  2 Actions (scoring)  →  3 Liste (panier)  →  4 Corrélation  →  5 Stratégie  →  6 Risk Lab  →  7 Suivi
```

Les **maquettes** du design system (`../ui_kits/app`) montrent le bon **langage visuel** et la bonne **hiérarchie**, mais avec des données statiques et un Strategy Builder en 8 étapes abstrait. Il manque, par rapport au vrai produit :

- **Les Listes** : création, renommage, suppression, **import/export fichier JSON** (une liste ou bundle de toutes), listes récentes, pastille « liste active », compteur.
- **La sélection d'actions** : grille des composants de l'indice avec **prix/variation live** (quotes par lots), **barre de recherche** temps réel (ticker/nom), **tri par colonne** au clic (cyclique asc→desc→aucun).
- **Le modal de score de dispersion** : score + signal, composantes A/B/C (Edge, HV−IV, Coûts), **sous-scores décomposés** (Liquidité, Attractivité vol, Apport dispersion, Exécution, Risque event), **pipeline ρ̂ par fenêtre**, **IV Rank / Percentile**, grecs du straddle, recommandation, warning earnings, et **« Ajouter à une liste »**.
- **Correlation Lab** : matrice/heatmap pairwise, prime + z-score, ρ par fenêtre (pondérée/équipondérée), **contributions par composant**, **décomposition sectorielle**.
- **Strategy Builder** : **configuration** (structure, 5 méthodes de sizing, contrats indice, durée, delta-neutral), tableau des **jambes**, **agrégats de grecs**, équilibrage vega, hedge delta, persistance serveur.
- **Risk Lab** : scénarios spot/vol indice/vol composants/corrélation/temps/skew/earnings, **heatmap P&L spot×vol**, contributions par sous-jacent et secteur, conclusions.
- **Trade Checklist** : checks Données/Construction/Risque + cases de validation → **commit** de la position.
- **Monitor + Position Detail** : positions suivies, P&L live, grecs entrée vs actuels, dérive de prime, P&L par jambe, **snapshots** historiques, clôture/suppression.

`API-FEATURE-MAP.md` liste tout ça exhaustivement.

---

## 2. Décision d'architecture (à valider avec l'utilisateur)

Deux chemins. **Recommandé : Option A.**

### Option A — Re-skin progressif du frontend réel *(rapide, sûr, recommandé)*
Garder la SPA vanilla existante (router, `api.js`, `views.js`) qui marche déjà, et **remplacer le rendu visuel** vue par vue pour adopter la nouvelle DA. Concrètement :
- Poser d'abord le **kit de pose** (`dispersionx-theme.css` + `theme-toggle.js`, voir `README.md`) → toute l'app prend instantanément les couleurs/typo/thème/logo animé, **sans toucher au JS**. C'est déjà livré.
- Puis, vue par vue, réécrire le HTML généré dans `views.js` pour matcher les maquettes (cartes verre, MetricCard, Stepper, badges, etc.), **en gardant les mêmes appels `api.*` et la même logique d'état**.
- Avantage : à chaque étape l'app reste fonctionnelle et connectée. Aucun risque sur la logique. Pas de réécriture du data-layer.

### Option B — Nouveau front React câblé sur l'API
Reconstruire le front en React en repartant des composants du design system (`../components`) et des écrans (`../ui_kits/app`), puis brancher chaque écran sur les endpoints (`fetch` vers `/api/...`). Plus long, introduit un build step, mais donne une base React propre. À ne choisir que si une migration React est de toute façon prévue.

> Dans les deux cas, **les endpoints, payloads et la logique restent identiques** — voir `API-FEATURE-MAP.md`. Le data-layer `api.js` est réutilisable tel quel en React.

---

## 3. Le design system, en pratique

- **Tokens / couleurs / typo / espacements** : `../styles.css` (point d'entrée unique) importe `../tokens/*`. Variables CSS : `--bg-base/-surface/-elevated/-card`, `--border(-subtle/-strong)`, `--text(-soft/-muted/-dim)`, `--accent`, sémantiques `--green/-red/-amber/-purple/-lime`, `--gold`. **Le vrai `style.css` utilise déjà ces mêmes noms** → compatibilité directe.
- **Thèmes** : sombre par défaut (`:root`), thème clair **Café Warm** via `[data-theme="cafe"]` sur `<html>`. Bascule + persistance via `theme.js` / `theme-toggle.js`. Le vert/rouge gain-perte reste distinct de l'accent dans les deux thèmes.
- **Effets** (`../tokens/effects.css`) : `.dx-glass` (verre sombre/clair), `.dx-lift` (profondeur au survol), `.dx-rise` (apparition), `.dx-pulse(-neg)` (badge d'alerte), `.dx-ico-hover` (icône → accent au survol), `.dx-logo-arcs` (logo qui tourne). Respecte `prefers-reduced-motion`.
- **Composants réutilisables** (`../components/`, namespace `window.DispersionXDesignSystem_cb86be` si bundle, ou à porter en HTML/CSS pour l'Option A) :
  `Button`, `Badge` (+`pulse`), `MetricCard` (count-up, `glass`), `ScoreBadge` (tiers FORT/MODÉRÉ/FAIBLE/NÉGATIF), `RiskBadge`, `CorrelationGauge`, `WarningPanel`, `BeginnerExplanationBox`, `EmptyState`, `Stepper`.
- **Écrans de référence** (`../ui_kits/app/*.jsx`) : `Shell` (sidebar+topbar+toggle), `Dashboard`, `Builder`, `CorrelationLab`, `VolatilityLab`, `RiskLab`, `TradeBrief`, `StrategyMonitor`. À utiliser comme **cible visuelle** de chaque vue réelle.

### Correspondance signaux → couleurs (à respecter)
| Signal scoring | Couleur DS | Tier ScoreBadge |
|---|---|---|
| FORT | `--green-bright` | `pos` |
| MODÉRÉ | `--lime` | `lime` |
| FAIBLE | `--amber` | `warn` |
| NÉGATIF | `--red-bright` | `neg` |

`signal_color` renvoyé par l'API (`green/lime/amber/red/muted`) mappe directement sur ces tokens.

---

## 4. Ordre de construction conseillé (Option A)

1. **Shell** — sidebar (nav réelle : Indices, Mes listes, + récentes, badge compteur, pastille liste active), topbar (breadcrumb, statut API/sources, **toggle thème**, durée). Stepper 7 étapes réel.
2. **Home / Indices** — grille de cartes indices + snapshots live + bloc « Reprendre une liste ».
3. **Index Detail** — snapshot strip, pills de durée, **barre de recherche**, **table triable** des composants avec quotes live, bouton Score par ligne.
4. **Score Modal** — l'écran le plus dense ; tout le détail du scoring + ajout à une liste.
5. **Lists + List Detail** — CRUD, **import/export**, analyse de panier, table d'items triable, retrait.
6. **Correlation Lab**, 7. **Strategy Builder**, 8. **Risk Lab**, 9. **Checklist**, 10. **Monitor + Position Detail**.

Chaque écran : voir sa spec dans `SCREEN-SPECS.md`.

---

## 5. Garde-fous
- Ne pas modifier : `backend/core/*` (scoring, corrélation, markowitz, auto_metrics), les routers, les modèles, la base. Uniquement la couche vue.
- Garder le **ton** : analytique, pédagogique, jamais promotionnel (cf. `../readme.md` § CONTENT FUNDAMENTALS).
- Unités toujours visibles, chiffres en mono alignés à droite, couleur = sens (pas décoration).
- Si une donnée manque côté API, afficher un **placeholder propre** (jamais inventer un chiffre) — l'app réelle le fait déjà (ex. « Prix indisponible · réessayer », IV « estimée depuis HV »).
