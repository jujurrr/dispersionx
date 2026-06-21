# Kit de handoff — DispersionX

Ce dossier relie le **design** (le design system DispersionX) au **produit réel** (`dispersion_v3/`, FastAPI + SPA), de deux façons selon ton besoin.

## 🟢 Niveau 1 — Re-skin immédiat (2 minutes, zéro code)
Applique la nouvelle DA (couleurs vertes, thème sombre/clair Café, logo animé, toggle soleil/lune) à ton frontend existant **déjà branché au backend**, sans toucher au JS.

- **`dispersionx-theme.css`** — surcharge les variables CSS (mêmes noms que ton `style.css`). Sombre par défaut + thème clair via `[data-theme="cafe"]`.
- **`theme-toggle.js`** — applique/mémorise le thème, injecte le bouton soleil/lune.
- **Pose** : voir « Installation (Niveau 1) » ci-dessous.

## 🔵 Niveau 2 — Handoff Claude Code (rebrancher TOUTES les fonctionnalités)
Pour retrouver, dans la nouvelle DA, **toutes** les fonctionnalités du produit (listes, import/export, scoring de dispersion, recherche, tri de colonnes, corrélation, stratégie, risque, checklist, suivi). À exécuter par **Claude Code** dans le repo.

- **`CLAUDE-CODE-HANDOFF.md`** — approche, architecture cible (re-skin progressif recommandé), usage du design system, ordre de build, garde-fous.
- **`API-FEATURE-MAP.md`** — chaque endpoint backend + chaque fonctionnalité UI → écran + composants DS. La checklist de complétude.
- **`SCREEN-SPECS.md`** — spec écran par écran (Home, Index Detail, Score Modal, Lists, List Detail, Correlation/Strategy/Risk Lab, Checklist, Monitor, Position Detail).

> Démarrage rapide pour Claude Code : ouvrir `dispersion_v3/`, lire `CLAUDE-CODE-HANDOFF.md`, puis suivre l'ordre de build en se référant à `API-FEATURE-MAP.md` (complétude) et `SCREEN-SPECS.md` (détail). Le design system est dans le dossier parent (`../`).

### Exemple de référence travaillé — `examples/`
Un écran converti de bout en bout, pour montrer le geste exact :
- **`examples/IndexDetail.reskin.html`** — aperçu **interactif** de la vue *Index Detail* (sélection d'actions) dans la nouvelle DA : recherche live, tri de colonnes au clic, quotes qui se remplissent, bascule sombre/Café. Données simulées. Ouvre-le pour voir/tester le rendu.
- **`examples/renderIndexDetail.js`** — la **fonction `views.renderIndexDetail` prête à coller** dans `dispersion_v3/frontend/js/views.js` : appels `api.*` et logique (filtre, cycle de tri, quotes par lots de 40) **strictement identiques** à l'original ; seuls le HTML et les classes changent. Le CSS de référence est en pied de fichier. C'est le patron à répliquer pour les autres vues.

---

## Pourquoi le re-skin est si direct
Ton `frontend/css/style.css` définit déjà ses couleurs via des variables CSS (`--bg-base`, `--accent`, `--text`…). On surcharge juste ces variables → toute l'app change d'allure, et continue d'appeler ton backend exactement pareil.

## Installation (Niveau 1 — 2 lignes)
1. Copie `dispersionx-theme.css` et `theme-toggle.js` dans `dispersion_v3/frontend/css/` et `dispersion_v3/frontend/js/`.
2. Dans `frontend/index.html` :
   ```html
   <!-- après ton style.css existant -->
   <link rel="stylesheet" href="/static/css/style.css">
   <link rel="stylesheet" href="/static/css/dispersionx-theme.css">
   ...
   <!-- juste avant </body> -->
   <script src="/static/js/theme-toggle.js"></script>
   ```
3. Relance `uvicorn` (ou rafraîchis). C'est tout — l'app, branchée à tes données live, est re-skinnée, avec le bouton soleil/lune dans la topbar.

## Logo animé (optionnel)
Pour les arcs qui tournent au survol, remplace le SVG du logo dans `index.html` par :
```html
<span class="dx-logo"><span class="dx-logo-arcs"><!-- ton <svg> ici --></span></span>
```
(le CSS de rotation est déjà dans `dispersionx-theme.css`).

## Ce que je NE peux pas faire d'ici (limites honnêtes)
- **Exécuter ton backend** (Python/FastAPI) ni faire que les maquettes hébergées appellent `localhost:8000` — ce sont des artefacts de design hébergés ailleurs.
- **Écrire dans `dispersion_v3/`** — il est monté en lecture seule. Les fichiers ci-dessus sont à copier toi-même (2 min).

## Pour une intégration plus profonde
Voir **Niveau 2** ci-dessus — `CLAUDE-CODE-HANDOFF.md`, `API-FEATURE-MAP.md`, `SCREEN-SPECS.md` couvrent le rebranchement complet des fonctionnalités (Strategy Builder, Risk Lab, Correlation/Volatility Lab, Trade Brief, Monitor) sur tes routes API réelles, à exécuter par Claude Code dans le repo.

## Référence design
- Tokens & règles : `../readme.md`, `../styles.css`, `../tokens/`
- Composants & UI kits : `../components/`, `../ui_kits/`
