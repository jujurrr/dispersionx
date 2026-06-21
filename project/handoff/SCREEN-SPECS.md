# Screen Specs — DispersionX (nouvelle DA, fonctionnalités réelles)

Spec écran par écran : ce que chaque vue affiche, ses interactions, ses états, et les composants DS à employer. Cible visuelle = `../ui_kits/app/*`. Logique = inchangée (`api.js`, `views.js`). Ordre = celui de build conseillé.

Conventions : chiffres en **mono aligné à droite**, **unités toujours visibles**, **couleur = sens**. Cartes = `.dx-glass .dx-lift` (ou `--bg-card` + bordure). Apparition `.dx-rise` (léger stagger). Pas d'animation permanente sur les graphes.

---

## 0. Shell (sidebar + topbar) — `../ui_kits/app/Shell.jsx`
**Sidebar** : logo animé (`.dx-logo` + `.dx-logo-arcs`) ; nav réelle —
- **Indices** (route home), **Mes listes** (+ badge compteur `#lists-count`).
- Section **Récentes** : 5 dernières listes (pastille verte si `avg_score>0`, badge `n_items`).
- Footer : statut **Données connectées** + `source-chip` par source (yfinance/FMP/IBKR…), pulse sur live.

**Topbar** : breadcrumb (gauche) ; à droite — statut **API** (point on/off, refresh 15 s), **pastille liste active** (`nom (n)`), **pills de durée** quand pertinent, **toggle thème** soleil/lune, avatar.

**Stepper 7 étapes** sous la topbar dans les vues du parcours : `Indice · Actions · Liste · Corrélation · Stratégie · Risk Lab · Suivi`. Composant `Stepper` ; étape *enabled* selon `currentIndex`/`activeListId` ; clic = navigation.

---

## 1. Home / Indices — `views.renderHome`
- **Hero** : titre « Construisez votre stratégie de dispersion » + sous-titre parcours 5 étapes (workflow visuel).
- **Bloc « Reprendre une liste »** : 4 cartes récentes (`nom`, `index · n actions`, `score`), clic → liste. Masqué si aucune liste.
- **Grille d'indices** : carte `.dx-glass .dx-lift` par indice. En-tête : drapeau + nom + `symbol · devise`, `Badge` nb actions. Corps : **snapshot chargé async** (prix, variation ▲▼ colorée, HV30, YTD, 30j) via `MetricCard` compacts. État erreur snapshot : « Prix indisponible · réessayer » (lien retry). Clic carte → Index Detail.

États : loader pendant `/indices` ; error → message.

---

## 2. Index Detail — `views.renderIndexDetail`
La vue de **sélection d'actions**. Pièces, dans l'ordre :
1. **Header indice** : drapeau, nom, `tag`s (symbol, devise, n actions, ETF proxy, « Options liquides »), prix + variation à droite.
2. **Snapshot strip** : `MetricCard`×6 (HV30, HV 1Y, IV estimée, perf 5j/30j/YTD) — couleur perf selon signe.
3. **Barre stratégie** : label « Durée stratégie » + **pills `14/30/45/60/90`j** (état `app.state.duration`).
4. **Barre de recherche** : icône loupe + `input` placeholder « Rechercher une action par ticker ou nom… » + **compteur** `x / total`. Filtrage **temps réel** sur `ticker`+`name`.
5. **Table des composants** triable :
   - Colonnes : `Action` (logo + ticker + nom), `Poids` (barre + %), `Prix`, `Jour` (▲▼ %), `Semaine` (▲▼ %), `Secteur` (tag), `Score` (bouton ▶).
   - **Tri au clic** sur en-têtes `.sortable` : cycle asc→desc→aucun, flèche `↑/↓`, nulls en dernier.
   - **Quotes live** : `batchQuotes` par lots de 40, cellules `···` puis remplies, re-render progressif.
   - Clic ligne **ou** bouton ▶ → **Score Modal**.

Composants DS : `MetricCard`, `Badge`/tags, `Button` (▶ Score). Garder `utils.stockLogoHtml`.

---

## 3. Score Modal — `views.openStockScoreModal` / `renderScoreModal`
**L'écran le plus dense — à soigner.** Voir `API-FEATURE-MAP.md §B` pour le payload complet.
- **Header** : logo + ticker + « vs {indice} · {durée}j », bouton fermer.
- **Warning earnings** (`WarningPanel tone=warn`) si `earnings_in_strategy` : « Earnings dans X j (date) — risque de vol crush ».
- **Hero score** : grande valeur mono colorée par `signal_color` + `ScoreBadge` (FORT/MODÉRÉ/FAIBLE/NÉGATIF).
- **Composantes A/B/C + β** : 4 `MetricCard` —
  - A · Edge (ρ_impl − ρ̂_réal) en pts + détail `impl% → réal%` ;
  - B · HV − IV en pts + `HV%/IV%` ;
  - C · Coûts (−pts) + source spread réel/estimé (+ earnings) ;
  - β · Poids · Prix.
- **Pipeline ρ̂** : carte formule — ρ par fenêtre (w normalisés), `blend × régime = ρ̂ final`.
- **Sous-scores décomposés** : 5 barres 0–100 (Liquidité, Attractivité vol, Apport dispersion, Exécution, Risque event) avec `.reason` ; couleur barre ≥70 vert / ≥45 ambre / sinon rouge ; + `composite_score` et `missing[]`.
- **IV Rank / Percentile** : encart (`iv_rank`, `iv_percentile`, min/max, note) — ou note si indisponible.
- **Grecs straddle** (si présents) : delta/gamma/vega/theta/strike/expiry — carte verte « IBKR temps réel ».
- **Recommandation** : encart texte.
- **Source IV** : ligne discrète (✓ réelle / ⚠ estimée depuis HV).
- **Footer = ajout à une liste** : `<select>` listes filtrées par indice + `Button` « Ajouter » + « + Nouvelle » (ouvre modal création). Après ajout : toast, met à jour pastille active + compteur.

Mode **Débutant** : ajouter un `BeginnerExplanationBox` « Pourquoi ce score ? » résumant Edge/vol/coûts en clair.

---

## 4. Lists — `views.renderLists`
- **Header** : titre + actions : `Button` **↑ Importer** (ouvre `<input type=file .json>`), **↓ Tout exporter**, **+ Nouvelle liste** (primary).
- **Grille de `list-card`** : nom, `index · n actions · date`, mini-stats (Actions, Score moyen coloré), actions par carte : Ouvrir / Exporter / Supprimer (danger + confirm).
- **EmptyState** si aucune liste (icône lignes + CTA créer).
- **Import** : lit le fichier, `POST /lists/import`, toast `(n liste(s))`, refresh. **Export** : download JSON (cf. §C map).

Modal **Création** : nom, **select indice** (SPX/NDX/DJI/CAC/DAX), description → `POST /lists`.

---

## 5. List Detail — `views.renderListDetail`
- **Header** : nom + description ; actions : **Stratégie →** (primary), Corrélation Lab, + Ajouter des actions (→ Index Detail), ↓ Exporter, Supprimer.
- **Bloc analyse panier** (`/lists/{id}/analysis`) : `MetricCard`×6 (Score pondéré, Edge moyen, ρ̄ implicite, ρ̄ réalisée att., Dispersion ×10⁴, Actions) + ligne **signal** global + **recommandations** (liste).
- **Table d'items** triable : `Action` (logo, ticker, ⚠ earnings), `Poids`, `IV/HV`, `β`, `Edge`, `Score` (+ `ScoreBadge` mini), `Ajout` (date), `Retirer` (×). Défaut tri `added` desc. Clic ligne → **réouvre le Score Modal** avec le `score_data` mémorisé. × = `DELETE item` + refresh.
- **EmptyState** si liste vide (CTA → indice).

---

## 6. Correlation Lab — `views.renderCorrelationLab` (`/correlation/list/{id}`)
- **Lecture simple** : encart bordé couleur `interpretation.color` — verdict + texte `simple` + warnings.
- **Métriques** : `MetricCard` ρ implicite, ρ réalisée pondérée, **Prime** (signe coloré), Z-score, Couverture panier %. Option : `CorrelationGauge` (implied/realized).
- **ρ par fenêtre** : carte (pondérée vs équipondérée par fenêtre) + note couverture + note z-score.
- **Heatmap** pairwise : matrice `tickers×tickers`, rouge = forte ρ, bleu = faible/négative ; valeurs en cellule ; sticky header/col.
- **Contributions par composant** : table (Action, Poids, ρ réal vs panier, Contrib prime pts colorée).
- **Décomposition sectorielle** : table (Secteur, Poids, Nb, Contrib prime).
- **Détail du calcul** : liste `interpretation.detail` + note méthode (Markowitz / pairwise).

États : loader « Analyse de corrélation… » ; `error` → message + retour liste.

---

## 7. Strategy Builder — `views.renderStrategyBuilder` / `runStrategyBuild`
- **Config** (carte) : `select` **Structure** (classique / inverse), `select` **Sizing** (vega_neutral, dollar_vega_neutral, beta_adjusted, weight_based, variance_contrib), `number` **Contrats indice**, `select` **Durée** (14/30/45/60), `checkbox` **Delta-neutral**, `Button` **Construire/Reconstruire**.
- **Persistance** : au chargement, `GET /strategy/saved/{id}` réaffiche la dernière + **banner** « calculée le … · Reconstruire pour rafraîchir ».
- **Résultat** (`POST /strategy/build`) :
  - **Agrégats** : `MetricCard` Net vega, Vega indice/comp., Ratio vega (vert si ~1), Delta équiv. hedge, Dollar-delta, Theta/j, Prime nette, Coût transaction, Marge.
  - **Barre d'équilibrage vega** (indice vs composants) + badge net.
  - **Warnings risque** (`WarningPanel`) le cas échéant.
  - **Hedge delta** : carte (delta net, dollar-delta, side/shares/notional ou « ~neutre »).
  - **Table des jambes** : Sous-jacent (logo, INDICE/comp.), Sens (short/long coloré), Qté, Strike, Échéance+DTE, IV, Mid, Vega, Theta, Notionnel. Composants ignorés signalés.
  - **Détail sizing** : méthode, jambes actives/négligeables, déséquilibre vega, contrats totaux, **suggestion de contrats** (bouton applique + reconstruit).

---

## 8. Risk Lab — `views.renderRiskLab` (`/risk/list/{id}`)
- **Synthèse** (carte accent) : `narrative` + `MetricCard` Meilleur/Pire(prix)/Pire corrélation/Perte stress/Prix dangereux/Theta critique.
- **Bar-charts P&L** (barres divergentes vert/rouge) : par mouvement indice ; par choc vol indice ; par choc vol composants ; par passage du temps.
- **Heatmap P&L spot×vol** : vert profit / rouge perte ; lignes = choc vol, colonnes = spot.
- **Tables régimes** : Corrélation, Mouvements composants, Skew, Earnings (Régime, P&L, Description) — `RiskBadge` pour la sévérité.
- **Contributions** : par sous-jacent + par secteur (scénario de référence).
- Note méthodo en pied.

États : loader « Analyse de risque… » ; `error` → CTA Strategy Builder.

---

## 9. Trade Checklist — `views.renderChecklist` (`/monitor/checklist/{id}`)
- **Header** : résumé `n_ok OK · n_warn avert. · n_fail bloquant`.
- **3 blocs** Données / Construction / Risque : chaque check `status` (ok ✓ / warn ⚠ / fail ✗ / manual ○) + label + détail.
- **Bloc validation** : cases à cocher (`validations[]`) + champ **nom de position** + `Button` **Suivre cette stratégie** (désactivé tant que toutes les cases ne sont pas cochées) → `POST /monitor/commit` → redirige vers Position Detail.

Réutiliser le `Trade Brief` (`../ui_kits/app/TradeBrief.jsx`) comme cible visuelle (rapport + checklist + export).

---

## 10. Monitor + Position Detail
**Monitor** (`/monitor/positions?list_id=`) : grille de positions (`index-card` : nom, `index · type`, badge Ouverte/Fermée, date + n snapshots). EmptyState sinon. Cible : `../ui_kits/app/StrategyMonitor.jsx`.

**Position Detail** (`/monitor/position/{cid}`) :
- Header : nom + méta + actions **📸 Snapshot** / **Clôturer** / **Supprimer**.
- `MetricCard` : P&L total, Coût de sortie, P&L net après sortie, Jambes valorisées.
- **Grecs entrée vs actuel** : table (Grec, Entrée, Actuel, Variation colorée).
- **Prime de corrélation** entrée vs actuelle + variation (si dispo).
- **P&L par jambe** : table (Jambe, Sens, Qté, Mid entrée, Mid actuel, IV Δ, P&L). Jambes non valorisées signalées.
- **Historique snapshots** : table (Date, P&L total, P&L quotidien).

---

## États & garde-fous (tous écrans)
- **Loading** : titre « Chargement… » / message contextuel ; **Empty** : `EmptyState` + CTA ; **Error** : message + bouton retour.
- **Donnée manquante** : placeholder propre (« — », « indisponible · réessayer », « IV estimée depuis HV ») — **jamais de chiffre inventé**.
- **Ton** analytique/pédagogique ; signaux = « à analyser », jamais promesses.
- **Accessibilité mouvement** : `prefers-reduced-motion` déjà géré par `effects.css`.
