/* ─────────────────────────────────────────────────────────────
   DispersionX — contrôleur de langue (JS pur, sans build).
   Calqué sur js/theme.js : applique + persiste la langue (fr/en/zh)
   et notifie l'app via un événement `dx-lang`.

   PRINCIPE NON-CASSANT — la traduction se fait « par le texte source ».
   La CLÉ de traduction EST la chaîne française telle qu'écrite dans les
   écrans. `t('Accueil')` renvoie :
     • en français       → 'Accueil'  (la clé elle-même)
     • dans une autre    → la traduction si elle existe, SINON le français.
   Conséquence : toute chaîne non encore traduite reste affichée en
   français. On peut donc traduire progressivement, écran par écran,
   sans jamais casser l'affichage.

   Exposé :
     window.DXI18n   = { LANGS, get, set, t }
     window.t        = raccourci vers DXI18n.t
     window.useLang  = hook React (re-render au changement de langue)
   Charger AVANT les écrans (voir src/main.jsx).
   ───────────────────────────────────────────────────────────── */
(function () {
  var KEY = 'dx-lang';

  var LANGS = [
    { code: 'fr', label: 'FR', name: 'Français' },
    { code: 'en', label: 'EN', name: 'English' },
    { code: 'zh', label: '中文', name: '中文' },
  ];

  // ── Dictionnaires. Clés = texte source FRANÇAIS. `fr` est implicite. ──
  // On ne remplit que en/zh ; une clé absente retombe sur le français.
  var DICT = {
    en: {
      // ── Navigation (barre latérale) ──
      'Accueil': 'Home',
      'Analyse': 'Analysis',
      'Stratégie': 'Strategy',
      'Aide': 'Help',
      'Pro': 'Pro',
      'Indices': 'Indices',
      'Mes listes': 'My lists',
      'Dashboard': 'Dashboard',
      'Correlation Lab': 'Correlation Lab',
      'Volatility Lab': 'Volatility Lab',
      'Construction': 'Construction',
      'Risk Lab': 'Risk Lab',
      'Strategy Builder': 'Strategy Builder',
      'Strategy Monitor': 'Strategy Monitor',
      'Formules & Référence': 'Formulas & Reference',
      'Opportunités': 'Opportunities',
      'Marché Pro': 'Market Pro',
      'Suivi': 'Tracking',
      'Journal': 'Journal',
      'Récentes': 'Recent',
      'Volatility desk': 'Volatility desk',
      // ── Sidebar : pied + statuts ──
      'Mon compte': 'My account',
      'Mode réel · ': 'Live mode · ',
      'Mode invité': 'Guest mode',
      'Sources :': 'Sources:',
      'Passer Pro': 'Go Pro',
      'Confidentialité': 'Privacy',
      'Accueil — Indices': 'Home — Indices',
      'Réservé au forfait Pro': 'Pro plan only',
      'Préférences du compte': 'Account preferences',
      'Se connecter': 'Sign in',
      'Données différées 15 min — analyse pédagogique, pas un conseil en investissement.':
        '15-min delayed data — educational analysis, not investment advice.',
      'Vos listes et stratégies restent uniquement sur cet appareil. Connectez-vous (gratuit) pour les sauvegarder et les retrouver sur tous vos appareils.':
        'Your lists and strategies stay on this device only. Sign in (free) to save them and access them from all your devices.',
      // ── ThemeToggle / SectionToggle ──
      'Thème clair': 'Light theme',
      'Thème sombre': 'Dark theme',
      'Changer de thème': 'Toggle theme',
      'Changer de langue': 'Change language',
      'Aller à l’espace de création': 'Go to the workspace',
      'Aller à la présentation': 'Go to the overview',
      // ── Topbar ──
      'Débutant': 'Beginner',
      'Avancé': 'Advanced',
      "Change uniquement l'aide affichée, pas les calculs ni les données. « Débutant » ajoute des encadrés d'explication sur chaque écran ; « Avancé » les masque pour une interface plus dense.":
        'Only changes the on-screen guidance, not the calculations or data. “Beginner” adds explanation boxes on every screen; “Advanced” hides them for a denser interface.',
      'Marché ouvert': 'Market open',
      'Marché fermé': 'Market closed',
      'démo': 'demo',
      'Statut des places boursières': 'Exchange status',
      'Menu': 'Menu',
      'Connexion': 'Sign in',
      // ── Breadcrumbs (app.jsx) ──
      'Opportunités Pro': 'Pro Opportunities',
      'Suivi des positions': 'Position tracking',
      'Journal de trades': 'Trade journal',
      'Préférences': 'Preferences',
      'Checklist': 'Checklist',
      'Position': 'Position',
      'Tarifs': 'Pricing',
      // ── Écran Préférences ──
      'Compte, sécurité, abonnement et apparence.': 'Account, security, subscription and appearance.',
      'Compte': 'Account',
      "Votre pseudo est affiché dans l'app et sur les listes partagées.":
        'Your display name is shown in the app and on shared lists.',
      'Connecté en tant que': 'Signed in as',
      'Pseudo': 'Display name',
      'Votre pseudo': 'Your display name',
      'Enregistrement…': 'Saving…',
      'Enregistrer': 'Save',
      'E-mail': 'Email',
      'Sécurité': 'Security',
      'Définir ou changer votre mot de passe.': 'Set or change your password.',
      'Nouveau mot de passe': 'New password',
      'Au moins 6 caractères': 'At least 6 characters',
      'Mise à jour…': 'Updating…',
      'Mettre à jour': 'Update',
      'Masquer': 'Hide',
      'Afficher': 'Show',
      'Abonnement': 'Subscription',
      "Le module Pro : auto-chercheur d'opportunités, risque & sizing inline, backtest historique.":
        'The Pro module: automatic opportunity finder, inline risk & sizing, historical backtest.',
      'Se termine bientôt': 'Ending soon',
      'Pro actif': 'Pro active',
      'Gratuit': 'Free',
      'Ouvrir les Opportunités': 'Open Opportunities',
      'Ouverture…': 'Opening…',
      "Gérer l'abonnement": 'Manage subscription',
      '✓ Meilleurs paniers de dispersion par indice (5 à 20 actions)':
        '✓ Best dispersion baskets per index (5 to 20 stocks)',
      '✓ Sizing vega-neutre + 3 scénarios de stress, comme le Risk Lab':
        '✓ Vega-neutral sizing + 3 stress scenarios, like the Risk Lab',
      '✓ Backtest historique de la prime de corrélation capturée':
        '✓ Historical backtest of the captured correlation premium',
      'Redirection…': 'Redirecting…',
      'mois': 'month',
      'Voir les tarifs →': 'See pricing →',
      'Apparence': 'Appearance',
      'Thème clair ou sombre.': 'Light or dark theme.',
      "Le thème est mémorisé sur cet appareil. Le mode d'affichage (Débutant / Avancé) se règle en haut à droite de l'app.":
        'The theme is saved on this device. The display mode (Beginner / Advanced) is set at the top right of the app.',
      'Langue': 'Language',
      "Langue de l'interface.": 'Interface language.',
      "La langue est mémorisée sur cet appareil. Les données de marché et les calculs restent identiques.":
        'The language is saved on this device. Market data and calculations stay the same.',
      'Session': 'Session',
      'Se déconnecter de ce compte sur cet appareil.': 'Sign out of this account on this device.',
      'Se déconnecter': 'Sign out',
      'Préférences': 'Preferences',
      'Connectez-vous': 'Sign in',
      'Créez un compte (gratuit) pour sauvegarder vos réglages, vos listes et gérer votre abonnement.':
        'Create a (free) account to save your settings, your lists and manage your subscription.',
      'Se connecter / créer un compte': 'Sign in / create an account',
      // ── Landing (page de présentation) ──
      'Créer une stratégie': 'Create a strategy',
      "Analyse de dispersion d'options": 'Options dispersion analysis',
      'Construisez des stratégies de dispersion avec une lecture claire de la volatilité et de la corrélation.':
        'Build dispersion strategies with a clear reading of volatility and correlation.',
      'Analysez un indice, sélectionnez ses composants, mesurez la prime de corrélation, construisez une stratégie vega-neutre et testez vos risques avant exécution.':
        'Analyze an index, select its components, measure the correlation premium, build a vega-neutral strategy and stress-test your risk before execution.',
      'Comprendre la dispersion': 'Understand dispersion',
      'Mode Débutant & Avancé': 'Beginner & Advanced mode',
      'Les options ne pricent pas que la volatilité.': 'Options don’t price volatility alone.',
      'Pourquoi cette approche est utile': 'Why this approach helps',
      'Elle oblige à analyser sous plusieurs angles.': 'It forces analysis from several angles.',
      'Les risques, rendus visibles': 'Risks, made visible',
      "Un portefeuille vega-neutre n'est pas sans risque.": 'A vega-neutral portfolio is not risk-free.',
      'DispersionX Pro': 'DispersionX Pro',
      "Laissez l'algorithme trouver vos meilleures stratégies — et suivez-les en temps réel.":
        'Let the algorithm find your best strategies — and track them in real time.',
      "Passez d'une idée de volatilité à une stratégie construite et testée.":
        'Turn a volatility idea into a built and tested strategy.',
      'Comprendre': 'Understand',
      'Pourquoi': 'Why',
      'Workflow': 'Workflow',
      'Risques': 'Risks',
      'Exécution': 'Execution',
      'Comment ça fonctionne': 'How it works',
      "De l'analyse à la stratégie, en sept étapes.": 'From analysis to strategy, in seven steps.',
      'Lancer le Builder': 'Launch the Builder',
      'Voir les formules': 'See the formulas',
      'Où exécuter la stratégie': 'Where to execute the strategy',
      "La construction ici, l'exécution sous votre contrôle.": 'Building here, execution under your control.',
      'Lancer le Strategy Builder': 'Launch the Strategy Builder',
      "Outil d'analyse — ne constitue pas un conseil en investissement.":
        'Analysis tool — does not constitute investment advice.',
      // ── Landing : corps complet ──
      '5 indices · SPX, NDX, DJI, CAC 40, DAX 40': '5 indices · SPX, NDX, DJI, CAC 40, DAX 40',
      'SPX · 31 DTE · dispersion · illustration': 'SPX · 31 DTE · dispersion · illustration',
      'Payoff estimé': 'Estimated payoff',
      'Prime ρ': 'ρ premium',
      'Vega net': 'Net vega',
      // Comprendre
      'Prime de corrélation': 'Correlation premium',
      'Comparer la corrélation implicite pricée par le marché à la corrélation réalisée observée sur les composants.':
        'Compare the implied correlation priced by the market with the realized correlation observed on the components.',
      'Écart indice / composants': 'Index / components gap',
      "Identifier si la volatilité de l'indice est chère ou bon marché face à celle des actions individuelles.":
        "Identify whether the index's volatility is expensive or cheap relative to that of the individual stocks.",
      'Mouvements idiosyncratiques': 'Idiosyncratic moves',
      "Chercher des composants capables de bouger indépendamment de l'indice, moteur de la dispersion.":
        'Look for components able to move independently of the index — the engine of dispersion.',
      "La volatilité d'un indice dépend de celle de ses composants et de leur corrélation. Les options d'indice embarquent donc un prix de la corrélation — que l'on peut comparer à la corrélation réellement observée. Une stratégie de dispersion exploite l'écart entre la volatilité de l'indice et celle des actions qui le composent.":
        "An index's volatility depends on that of its components and on their correlation. Index options therefore embed a price for correlation — which can be compared to the correlation actually observed. A dispersion strategy exploits the gap between the index's volatility and that of the stocks that make it up.",
      "Quand les actions bougent beaucoup individuellement mais que leurs mouvements se compensent, l'indice reste relativement stable. C'est précisément cette différence que la dispersion mesure et cherche à monétiser.":
        'When stocks move a lot individually but their moves offset each other, the index stays relatively stable. It is precisely this difference that dispersion measures and seeks to monetize.',
      'implicite': 'implied',
      'réalisée': 'realized',
      'prime de corrélation': 'correlation premium',
      "Une prime positive signifie que le marché price une synchronisation plus forte que celle réellement observée : un contexte historiquement favorable à la dispersion.":
        'A positive premium means the market is pricing a stronger synchronization than the one actually observed: a context historically favorable to dispersion.',
      "Concrètement : on vend la volatilité de l'indice (short straddle) et on achète celle des composants (long straddles), en équilibrant les deux jambes pour ne garder que le pari sur la dispersion.":
        "In practice: you sell the index's volatility (short straddle) and buy that of the components (long straddles), balancing the two legs to keep only the bet on dispersion.",
      // Pourquoi
      "Volatilité implicite, volatilité historique, corrélation, liquidité, grecs, theta, scénario de stress et coût d'exécution — chaque dimension est mesurée, jamais supposée.":
        'Implied volatility, historical volatility, correlation, liquidity, greeks, theta, stress scenario and execution cost — every dimension is measured, never assumed.',
      'Analyse structurée': 'Structured analysis',
      'La stratégie est examinée sous plusieurs angles avant toute décision.':
        'The strategy is examined from several angles before any decision.',
      'Meilleure compréhension du risque': 'Better risk understanding',
      'Grecs, theta, scénarios de stress et coûts rendus visibles.':
        'Greeks, theta, stress scenarios and costs made visible.',
      'Construction vega-neutre': 'Vega-neutral construction',
      'Équilibrage entre la jambe indice et le panier de composants.':
        'Balancing between the index leg and the basket of components.',
      'Scénarios de stress': 'Stress scenarios',
      'Sell-off corrélé, vol crush, hausse IV — testés avant exécution.':
        'Correlated sell-off, vol crush, IV spike — tested before execution.',
      'Lecture pédagogique': 'Educational reading',
      'Explications « en clair » et tooltips pour les débutants sérieux.':
        'Plain-language explanations and tooltips for serious beginners.',
      'Outil avancé': 'Advanced tool',
      'Matrices, formules et exports pour les utilisateurs expérimentés.':
        'Matrices, formulas and exports for experienced users.',
      // Workflow
      'Choisir un indice et une échéance': 'Choose an index and an expiry',
      'SPX, NDX, DJI, CAC 40, DAX 40 — liquidité, caractéristiques, durée.':
        'SPX, NDX, DJI, CAC 40, DAX 40 — liquidity, characteristics, duration.',
      'Analyser les composants': 'Analyze the components',
      'Score décomposé, IV/HV, β, filtres et avertissements earnings.':
        'Decomposed score, IV/HV, β, filters and earnings warnings.',
      'Construire la liste': 'Build the list',
      "Constituer le panier, suivre le score pondéré et l'edge moyen.":
        'Assemble the basket, track the weighted score and the average edge.',
      'Mesurer la corrélation': 'Measure the correlation',
      'ρ implicite vs ρ̂ réalisée, prime, z-score et contributions.':
        'Implied ρ vs realized ρ̂, premium, z-score and contributions.',
      'Construire la stratégie': 'Build the strategy',
      'Sizing vega-neutre + couverture delta (ETF indice ou par jambe).':
        'Vega-neutral sizing + delta hedge (index ETF or per leg).',
      'Tester le risque': 'Test the risk',
      'Scénarios de stress, grecs, simulateur de P&L interactif.':
        'Stress scenarios, greeks, interactive P&L simulator.',
      'Checklist & suivi': 'Checklist & tracking',
      'Valider la checklist, committer la position et suivre grecs, DTE et alertes.':
        'Validate the checklist, commit the position and track greeks, DTE and alerts.',
      // Risques
      'La plateforme met en avant les scénarios défavorables avant toute validation. Comprendre où la stratégie peut perdre est aussi important que mesurer son edge.':
        'The platform highlights the unfavorable scenarios before any validation. Understanding where the strategy can lose is as important as measuring its edge.',
      'Sell-off corrélé': 'Correlated sell-off',
      "L'indice baisse, sa volatilité monte et les composants suivent dans la même direction — le principal risque de la dispersion.":
        'The index falls, its volatility rises and the components follow in the same direction — the main risk of dispersion.',
      'Vol crush': 'Vol crush',
      "La volatilité implicite des composants retombe (après earnings, par exemple) : les straddles longs perdent de la valeur même si l'action ne bouge pas.":
        'The implied volatility of the components falls back (after earnings, for example): long straddles lose value even if the stock does not move.',
      'Theta & échéance': 'Theta & expiry',
      'Les straddles longs composants brûlent du theta chaque jour : si la dispersion attendue ne se réalise pas, le portage coûte.':
        'Long component straddles burn theta every day: if the expected dispersion does not materialize, the carry costs.',
      "Coût d'exécution": 'Execution cost',
      "Le bid/ask aller-retour peut absorber une part significative de l'edge théorique.":
        'The round-trip bid/ask can absorb a significant part of the theoretical edge.',
      'Ce que le site ne fait pas': 'What the site does not do',
      "Un outil d'analyse, pas une promesse.": 'An analysis tool, not a promise.',
      "DispersionX sert à analyser, construire, simuler et comprendre. L'exécution et la décision restent sous votre contrôle.":
        'DispersionX is for analyzing, building, simulating and understanding. Execution and the decision remain under your control.',
      'Ne donne pas de conseil financier': 'Does not give financial advice',
      'Ne garantit aucune performance': 'Guarantees no performance',
      'Ne remplace pas Risk Navigator ni une validation humaine': 'Does not replace Risk Navigator or human validation',
      "N'exécute jamais automatiquement sans contrôle": 'Never executes automatically without control',
      // Exécution
      "La stratégie peut être reproduite sur des plateformes d'options multi-jambes — notamment IBKR TWS ou OptionTrader. DispersionX reste agnostique : il prépare l'analyse et la construction, vous gardez la main sur l'exécution.":
        'The strategy can be reproduced on multi-leg options platforms — notably IBKR TWS or OptionTrader. DispersionX stays agnostic: it prepares the analysis and the construction, you keep control of the execution.',
      'Options multi-jambes': 'Multi-leg options',
      // Pro
      "Les outils d'analyse restent gratuits. Pro ajoute le moteur qui vous fait gagner des heures : l'auto-chercheur construit les meilleures dispersions tout seul, et le suivi valorise vos positions au marché réel, jour après jour.":
        'The analysis tools stay free. Pro adds the engine that saves you hours: the auto-finder builds the best dispersions on its own, and tracking values your positions at the real market, day after day.',
      // Pro — cartes phares (ProBenefits, visibles sur la Landing)
      'Gain de temps ×100': 'Time saver ×100',
      "L'auto-chercheur construit vos meilleures stratégies — tout seul":
        'The auto-finder builds your best strategies — on its own',
      "Fini les heures à tester des paniers à la main. L'algorithme explore des milliers de combinaisons et vous sort les dispersions au plus haut potentiel, prêtes à construire — en quelques secondes.":
        'No more hours spent testing baskets by hand. The algorithm explores thousands of combinations and surfaces the highest-potential dispersions, ready to build — in seconds.',
      'Classe automatiquement les meilleurs paniers par indice': 'Automatically ranks the best baskets per index',
      'Sizing vega-neutre + 3 scénarios de stress déjà calculés': 'Vega-neutral sizing + 3 stress scenarios already computed',
      'Backtest de la prime de corrélation capturée': 'Backtest of the captured correlation premium',
      'Pilotage en temps réel': 'Real-time steering',
      'Suivez vos stratégies au marché réel, jour après jour': 'Track your strategies at the real market, day after day',
      'Chaque position est valorisée en direct : P&L, grecs, évolution. Vous savez toujours où vous en êtes — et quand sortir.':
        'Every position is valued live: P&L, greeks, evolution. You always know where you stand — and when to exit.',
      'P&L mark-to-market (spot + IV réels Cboe)': 'Mark-to-market P&L (real Cboe spot + IV)',
      "Courbe d'évolution + Δ vs entrée / vs veille": 'Evolution curve + Δ vs entry / vs previous day',
      'Relevé automatique quotidien': 'Automatic daily snapshot',
      'Se connecter pour passer Pro': 'Sign in to go Pro',
      'Meilleures opportunités': 'Top opportunities',
      'actions': 'stocks',
      'prime ρ': 'ρ premium',
      'Évolution du P&L': 'P&L evolution',
      // ── Pro — export IBKR (Landing §5 Exécution + carte phare ProBenefits) ──
      'Du clic au courtier': 'From click to broker',
      'Découvrir Pro': 'Discover Pro',
      'Exportez toute la stratégie vers IBKR en un clic': 'Export the whole strategy to IBKR in one click',
      "Pro génère un fichier prêt à importer dans le Risk Navigator de TWS — options indice, straddles composants et couverture delta en actions comprises. Il s'ouvre en portefeuille « What-If » : vous suivez la position virtuellement, puis vous exécutez chez votre courtier quand vous voulez. Rien n'est jamais transmis sans vous.":
        'Pro generates a file ready to import into the TWS Risk Navigator — index options, component straddles and the stock delta hedge included. It opens as a "What-If" portfolio: you follow the position virtually, then execute at your broker whenever you want. Nothing is ever transmitted without you.',
      'Exportez la stratégie vers IBKR — prête à trader': 'Export the strategy to IBKR — ready to trade',
      "Un seul clic et toute la construction part dans un fichier importable dans le Risk Navigator de TWS : options indice, straddles composants et couverture delta en actions. Plus rien à ressaisir — vous suivez la position en What-If, puis vous exécutez chez votre courtier quand vous le décidez.":
        'A single click and the whole construction goes into a file you can import into the TWS Risk Navigator: index options, component straddles and the stock delta hedge. Nothing to re-enter — you follow the position in What-If, then execute at your broker whenever you decide.',
      'CSV importable en 1 clic — toutes les jambes reproduites fidèlement': 'CSV importable in 1 click — every leg faithfully reproduced',
      'Jambes de couverture delta en actions incluses': 'Stock delta-hedge legs included',
      "What-If : suivez virtuellement, puis transmettez l'ordre — rien n'est exécuté sans vous": 'What-If: follow it virtually, then transmit the order — nothing is executed without you',
      'call + put': 'call + put',
      'actions (hedge)': 'stock (hedge)',
    },
    zh: {
      // ── Navigation (barre latérale) ──
      'Accueil': '首页',
      'Analyse': '分析',
      'Stratégie': '策略',
      'Aide': '帮助',
      'Pro': 'Pro',
      'Indices': '指数',
      'Mes listes': '我的清单',
      'Dashboard': '仪表盘',
      'Correlation Lab': '相关性实验室',
      'Volatility Lab': '波动率实验室',
      'Construction': '构建',
      'Risk Lab': '风险实验室',
      'Strategy Builder': '策略构建器',
      'Strategy Monitor': '策略监控',
      'Formules & Référence': '公式与参考',
      'Opportunités': '机会',
      'Marché Pro': '市场 Pro',
      'Suivi': '跟踪',
      'Journal': '日志',
      'Récentes': '最近',
      'Volatility desk': '波动率台席',
      // ── Sidebar : pied + statuts ──
      'Mon compte': '我的账户',
      'Mode réel · ': '实时模式 · ',
      'Mode invité': '访客模式',
      'Sources :': '数据来源：',
      'Passer Pro': '升级 Pro',
      'Confidentialité': '隐私',
      'Accueil — Indices': '首页 — 指数',
      'Réservé au forfait Pro': '仅限 Pro 套餐',
      'Préférences du compte': '账户偏好设置',
      'Se connecter': '登录',
      'Données différées 15 min — analyse pédagogique, pas un conseil en investissement.':
        '数据延迟 15 分钟 — 教育性分析，非投资建议。',
      'Vos listes et stratégies restent uniquement sur cet appareil. Connectez-vous (gratuit) pour les sauvegarder et les retrouver sur tous vos appareils.':
        '您的清单和策略仅保存在本设备上。登录（免费）即可保存，并在所有设备上访问。',
      // ── ThemeToggle / SectionToggle ──
      'Thème clair': '浅色主题',
      'Thème sombre': '深色主题',
      'Changer de thème': '切换主题',
      'Changer de langue': '切换语言',
      'Aller à l’espace de création': '进入创作空间',
      'Aller à la présentation': '返回介绍页',
      // ── Topbar ──
      'Débutant': '新手',
      'Avancé': '高级',
      "Change uniquement l'aide affichée, pas les calculs ni les données. « Débutant » ajoute des encadrés d'explication sur chaque écran ; « Avancé » les masque pour une interface plus dense.":
        '仅改变界面显示的帮助内容，不影响计算或数据。“新手”会在每个页面添加说明框；“高级”则隐藏它们，界面更紧凑。',
      'Marché ouvert': '市场开盘',
      'Marché fermé': '市场休市',
      'démo': '演示',
      'Statut des places boursières': '交易所状态',
      'Menu': '菜单',
      'Connexion': '登录',
      // ── Breadcrumbs (app.jsx) ──
      'Opportunités Pro': 'Pro 机会',
      'Suivi des positions': '持仓跟踪',
      'Journal de trades': '交易日志',
      'Préférences': '偏好设置',
      'Checklist': '检查清单',
      'Position': '持仓',
      'Tarifs': '价格',
      // ── Écran Préférences ──
      'Compte, sécurité, abonnement et apparence.': '账户、安全、订阅与外观。',
      'Compte': '账户',
      "Votre pseudo est affiché dans l'app et sur les listes partagées.":
        '您的昵称会显示在应用中以及共享清单上。',
      'Connecté en tant que': '登录身份',
      'Pseudo': '昵称',
      'Votre pseudo': '您的昵称',
      'Enregistrement…': '保存中…',
      'Enregistrer': '保存',
      'E-mail': '电子邮件',
      'Sécurité': '安全',
      'Définir ou changer votre mot de passe.': '设置或修改您的密码。',
      'Nouveau mot de passe': '新密码',
      'Au moins 6 caractères': '至少 6 个字符',
      'Mise à jour…': '更新中…',
      'Mettre à jour': '更新',
      'Masquer': '隐藏',
      'Afficher': '显示',
      'Abonnement': '订阅',
      "Le module Pro : auto-chercheur d'opportunités, risque & sizing inline, backtest historique.":
        'Pro 模块：自动机会搜索、内置风险与头寸规模、历史回测。',
      'Se termine bientôt': '即将结束',
      'Pro actif': 'Pro 已激活',
      'Gratuit': '免费',
      'Ouvrir les Opportunités': '打开机会',
      'Ouverture…': '打开中…',
      "Gérer l'abonnement": '管理订阅',
      '✓ Meilleurs paniers de dispersion par indice (5 à 20 actions)':
        '✓ 每个指数的最佳离散组合（5 至 20 只股票）',
      '✓ Sizing vega-neutre + 3 scénarios de stress, comme le Risk Lab':
        '✓ Vega 中性头寸规模 + 3 种压力情景，与风险实验室相同',
      '✓ Backtest historique de la prime de corrélation capturée':
        '✓ 已捕获相关性溢价的历史回测',
      'Redirection…': '跳转中…',
      'mois': '月',
      'Voir les tarifs →': '查看价格 →',
      'Apparence': '外观',
      'Thème clair ou sombre.': '浅色或深色主题。',
      "Le thème est mémorisé sur cet appareil. Le mode d'affichage (Débutant / Avancé) se règle en haut à droite de l'app.":
        '主题保存在本设备上。显示模式（新手 / 高级）可在应用右上角设置。',
      'Langue': '语言',
      "Langue de l'interface.": '界面语言。',
      "La langue est mémorisée sur cet appareil. Les données de marché et les calculs restent identiques.":
        '语言保存在本设备上。市场数据和计算保持不变。',
      'Session': '会话',
      'Se déconnecter de ce compte sur cet appareil.': '在本设备上退出此账户。',
      'Se déconnecter': '退出登录',
      'Connectez-vous': '登录',
      'Créez un compte (gratuit) pour sauvegarder vos réglages, vos listes et gérer votre abonnement.':
        '创建（免费）账户以保存您的设置、清单并管理订阅。',
      'Se connecter / créer un compte': '登录 / 创建账户',
      // ── Landing (page de présentation) ──
      'Créer une stratégie': '创建策略',
      "Analyse de dispersion d'options": '期权离散度分析',
      'Construisez des stratégies de dispersion avec une lecture claire de la volatilité et de la corrélation.':
        '在清晰解读波动率与相关性的基础上构建离散度策略。',
      'Analysez un indice, sélectionnez ses composants, mesurez la prime de corrélation, construisez une stratégie vega-neutre et testez vos risques avant exécution.':
        '分析指数、选择其成分股、衡量相关性溢价、构建 Vega 中性策略，并在执行前测试您的风险。',
      'Comprendre la dispersion': '理解离散度',
      'Mode Débutant & Avancé': '新手与高级模式',
      'Les options ne pricent pas que la volatilité.': '期权定价的不只是波动率。',
      'Pourquoi cette approche est utile': '为什么这种方法有用',
      'Elle oblige à analyser sous plusieurs angles.': '它促使你从多个角度分析。',
      'Les risques, rendus visibles': '让风险一目了然',
      "Un portefeuille vega-neutre n'est pas sans risque.": 'Vega 中性的投资组合并非没有风险。',
      'DispersionX Pro': 'DispersionX Pro',
      "Laissez l'algorithme trouver vos meilleures stratégies — et suivez-les en temps réel.":
        '让算法为您找到最佳策略 — 并实时跟踪它们。',
      "Passez d'une idée de volatilité à une stratégie construite et testée.":
        '将一个波动率想法转化为已构建并经过测试的策略。',
      'Comprendre': '理解',
      'Pourquoi': '为什么',
      'Workflow': '工作流程',
      'Risques': '风险',
      'Exécution': '执行',
      'Comment ça fonctionne': '运作方式',
      "De l'analyse à la stratégie, en sept étapes.": '从分析到策略，七个步骤。',
      'Lancer le Builder': '启动构建器',
      'Voir les formules': '查看公式',
      'Où exécuter la stratégie': '在哪里执行策略',
      "La construction ici, l'exécution sous votre contrôle.": '在此构建，执行由您掌控。',
      'Lancer le Strategy Builder': '启动策略构建器',
      "Outil d'analyse — ne constitue pas un conseil en investissement.":
        '分析工具 — 不构成投资建议。',
      // ── Landing : corps complet ──
      '5 indices · SPX, NDX, DJI, CAC 40, DAX 40': '5 个指数 · SPX、NDX、DJI、CAC 40、DAX 40',
      'SPX · 31 DTE · dispersion · illustration': 'SPX · 31 DTE · 离散 · 示意',
      'Payoff estimé': '预计收益',
      'Prime ρ': 'ρ 溢价',
      'Vega net': '净 Vega',
      // Comprendre
      'Prime de corrélation': '相关性溢价',
      'Comparer la corrélation implicite pricée par le marché à la corrélation réalisée observée sur les composants.':
        '将市场定价的隐含相关性与成分股上观察到的已实现相关性进行比较。',
      'Écart indice / composants': '指数与成分股的差距',
      "Identifier si la volatilité de l'indice est chère ou bon marché face à celle des actions individuelles.":
        '判断指数的波动率相对于个股是偏贵还是偏便宜。',
      'Mouvements idiosyncratiques': '特异性波动',
      "Chercher des composants capables de bouger indépendamment de l'indice, moteur de la dispersion.":
        '寻找能够独立于指数波动的成分股 — 这是离散度的驱动力。',
      "La volatilité d'un indice dépend de celle de ses composants et de leur corrélation. Les options d'indice embarquent donc un prix de la corrélation — que l'on peut comparer à la corrélation réellement observée. Une stratégie de dispersion exploite l'écart entre la volatilité de l'indice et celle des actions qui le composent.":
        '指数的波动率取决于其成分股的波动率以及它们之间的相关性。因此，指数期权中隐含了一个相关性的价格 — 可以将其与实际观察到的相关性进行比较。离散度策略正是利用指数波动率与其成分股波动率之间的差距。',
      "Quand les actions bougent beaucoup individuellement mais que leurs mouvements se compensent, l'indice reste relativement stable. C'est précisément cette différence que la dispersion mesure et cherche à monétiser.":
        '当个股各自大幅波动但彼此的走势相互抵消时，指数会保持相对稳定。离散度衡量并试图变现的正是这种差异。',
      'implicite': '隐含',
      'réalisée': '已实现',
      'prime de corrélation': '相关性溢价',
      "Une prime positive signifie que le marché price une synchronisation plus forte que celle réellement observée : un contexte historiquement favorable à la dispersion.":
        '正溢价意味着市场所定价的同步程度高于实际观察到的水平：这是历史上有利于离散度的环境。',
      "Concrètement : on vend la volatilité de l'indice (short straddle) et on achète celle des composants (long straddles), en équilibrant les deux jambes pour ne garder que le pari sur la dispersion.":
        '具体而言：卖出指数的波动率（卖出跨式），买入成分股的波动率（买入跨式），并平衡两条腿，只保留对离散度的押注。',
      // Pourquoi
      "Volatilité implicite, volatilité historique, corrélation, liquidité, grecs, theta, scénario de stress et coût d'exécution — chaque dimension est mesurée, jamais supposée.":
        '隐含波动率、历史波动率、相关性、流动性、希腊值、Theta、压力情景以及执行成本 — 每个维度都经过测量，而非假设。',
      'Analyse structurée': '结构化分析',
      'La stratégie est examinée sous plusieurs angles avant toute décision.':
        '在做出任何决定之前，从多个角度审视策略。',
      'Meilleure compréhension du risque': '更好地理解风险',
      'Grecs, theta, scénarios de stress et coûts rendus visibles.':
        '将希腊值、Theta、压力情景与成本一览无遗。',
      'Construction vega-neutre': 'Vega 中性构建',
      'Équilibrage entre la jambe indice et le panier de composants.':
        '在指数腿与成分股组合之间进行平衡。',
      'Scénarios de stress': '压力情景',
      'Sell-off corrélé, vol crush, hausse IV — testés avant exécution.':
        '相关性抛售、波动率骤降、IV 飙升 — 在执行前测试。',
      'Lecture pédagogique': '易懂的解读',
      'Explications « en clair » et tooltips pour les débutants sérieux.':
        '为认真的新手提供“通俗”解释和提示。',
      'Outil avancé': '高级工具',
      'Matrices, formules et exports pour les utilisateurs expérimentés.':
        '为有经验的用户提供矩阵、公式和导出功能。',
      // Workflow
      'Choisir un indice et une échéance': '选择指数和到期日',
      'SPX, NDX, DJI, CAC 40, DAX 40 — liquidité, caractéristiques, durée.':
        'SPX、NDX、DJI、CAC 40、DAX 40 — 流动性、特征、期限。',
      'Analyser les composants': '分析成分股',
      'Score décomposé, IV/HV, β, filtres et avertissements earnings.':
        '分解评分、IV/HV、β、筛选与财报预警。',
      'Construire la liste': '构建清单',
      "Constituer le panier, suivre le score pondéré et l'edge moyen.":
        '构建组合，跟踪加权评分与平均优势。',
      'Mesurer la corrélation': '衡量相关性',
      'ρ implicite vs ρ̂ réalisée, prime, z-score et contributions.':
        '隐含 ρ 对比已实现 ρ̂、溢价、z 分数与贡献度。',
      'Construire la stratégie': '构建策略',
      'Sizing vega-neutre + couverture delta (ETF indice ou par jambe).':
        'Vega 中性头寸规模 + Delta 对冲（指数 ETF 或按腿）。',
      'Tester le risque': '测试风险',
      'Scénarios de stress, grecs, simulateur de P&L interactif.':
        '压力情景、希腊值、交互式盈亏模拟器。',
      'Checklist & suivi': '检查清单与跟踪',
      'Valider la checklist, committer la position et suivre grecs, DTE et alertes.':
        '完成检查清单，提交持仓，并跟踪希腊值、DTE 与提醒。',
      // Risques
      'La plateforme met en avant les scénarios défavorables avant toute validation. Comprendre où la stratégie peut perdre est aussi important que mesurer son edge.':
        '平台会在任何确认之前突出显示不利情景。理解策略可能亏损的地方，与衡量其优势同样重要。',
      'Sell-off corrélé': '相关性抛售',
      "L'indice baisse, sa volatilité monte et les composants suivent dans la même direction — le principal risque de la dispersion.":
        '指数下跌，其波动率上升，成分股朝同一方向跟随 — 这是离散度的主要风险。',
      'Vol crush': '波动率骤降',
      "La volatilité implicite des composants retombe (après earnings, par exemple) : les straddles longs perdent de la valeur même si l'action ne bouge pas.":
        '成分股的隐含波动率回落（例如财报之后）：即使股价不动，买入的跨式也会贬值。',
      'Theta & échéance': 'Theta 与到期',
      'Les straddles longs composants brûlent du theta chaque jour : si la dispersion attendue ne se réalise pas, le portage coûte.':
        '买入的成分股跨式每天消耗 Theta：如果预期的离散度没有实现，持有成本高昂。',
      "Coût d'exécution": '执行成本',
      "Le bid/ask aller-retour peut absorber une part significative de l'edge théorique.":
        '买卖价差的往返成本可能吞噬掉相当一部分理论优势。',
      'Ce que le site ne fait pas': '本网站不做什么',
      "Un outil d'analyse, pas une promesse.": '一个分析工具，而非承诺。',
      "DispersionX sert à analyser, construire, simuler et comprendre. L'exécution et la décision restent sous votre contrôle.":
        'DispersionX 用于分析、构建、模拟和理解。执行与决策始终由您掌控。',
      'Ne donne pas de conseil financier': '不提供财务建议',
      'Ne garantit aucune performance': '不保证任何业绩',
      'Ne remplace pas Risk Navigator ni une validation humaine': '不替代 Risk Navigator 或人工验证',
      "N'exécute jamais automatiquement sans contrôle": '绝不会在没有监督的情况下自动执行',
      // Exécution
      "La stratégie peut être reproduite sur des plateformes d'options multi-jambes — notamment IBKR TWS ou OptionTrader. DispersionX reste agnostique : il prépare l'analyse et la construction, vous gardez la main sur l'exécution.":
        '该策略可以在多腿期权平台上复制 — 尤其是 IBKR TWS 或 OptionTrader。DispersionX 保持中立：它负责分析与构建，执行则由您掌控。',
      'Options multi-jambes': '多腿期权',
      // Pro
      "Les outils d'analyse restent gratuits. Pro ajoute le moteur qui vous fait gagner des heures : l'auto-chercheur construit les meilleures dispersions tout seul, et le suivi valorise vos positions au marché réel, jour après jour.":
        '分析工具始终免费。Pro 增加了为您节省数小时的引擎：自动搜索器独立构建最佳离散组合，跟踪功能则按真实市场逐日估值您的持仓。',
      // Pro — cartes phares (ProBenefits, visibles sur la Landing)
      'Gain de temps ×100': '节省时间 ×100',
      "L'auto-chercheur construit vos meilleures stratégies — tout seul":
        '自动搜索器独立为您构建最佳策略',
      "Fini les heures à tester des paniers à la main. L'algorithme explore des milliers de combinaisons et vous sort les dispersions au plus haut potentiel, prêtes à construire — en quelques secondes.":
        '不再需要花数小时手动测试组合。算法会探索数千种组合，在几秒内为您筛选出最具潜力、可直接构建的离散组合。',
      'Classe automatiquement les meilleurs paniers par indice': '自动按指数对最佳组合进行排名',
      'Sizing vega-neutre + 3 scénarios de stress déjà calculés': 'Vega 中性头寸规模 + 已计算好的 3 种压力情景',
      'Backtest de la prime de corrélation capturée': '已捕获相关性溢价的回测',
      'Pilotage en temps réel': '实时掌控',
      'Suivez vos stratégies au marché réel, jour après jour': '按真实市场逐日跟踪您的策略',
      'Chaque position est valorisée en direct : P&L, grecs, évolution. Vous savez toujours où vous en êtes — et quand sortir.':
        '每个持仓都实时估值：盈亏、希腊值、走势。您始终清楚自己的处境 — 以及何时退出。',
      'P&L mark-to-market (spot + IV réels Cboe)': '按市值计价的盈亏（真实的 Cboe 现价 + IV）',
      "Courbe d'évolution + Δ vs entrée / vs veille": '走势曲线 + Δ 对比入场 / 对比前一日',
      'Relevé automatique quotidien': '每日自动快照',
      'Se connecter pour passer Pro': '登录以升级 Pro',
      'Meilleures opportunités': '最佳机会',
      'actions': '只股票',
      'prime ρ': 'ρ 溢价',
      'Évolution du P&L': '盈亏走势',
      // ── Pro — export IBKR (Landing §5 Exécution + carte phare ProBenefits) ──
      'Du clic au courtier': '从点击到券商',
      'Découvrir Pro': '了解 Pro',
      'Exportez toute la stratégie vers IBKR en un clic': '一键将整个策略导出到 IBKR',
      "Pro génère un fichier prêt à importer dans le Risk Navigator de TWS — options indice, straddles composants et couverture delta en actions comprises. Il s'ouvre en portefeuille « What-If » : vous suivez la position virtuellement, puis vous exécutez chez votre courtier quand vous voulez. Rien n'est jamais transmis sans vous.":
        'Pro 会生成一个可直接导入 TWS Risk Navigator 的文件 — 包含指数期权、成分股跨式以及股票 Delta 对冲。它以“What-If”投资组合形式打开：您可以虚拟跟踪该持仓，随后在任何时候于您的券商处执行。没有您的操作，绝不会传输任何订单。',
      'Exportez la stratégie vers IBKR — prête à trader': '将策略导出到 IBKR — 可直接交易',
      "Un seul clic et toute la construction part dans un fichier importable dans le Risk Navigator de TWS : options indice, straddles composants et couverture delta en actions. Plus rien à ressaisir — vous suivez la position en What-If, puis vous exécutez chez votre courtier quand vous le décidez.":
        '只需一键，整个构建即可进入一个可导入 TWS Risk Navigator 的文件：指数期权、成分股跨式以及股票 Delta 对冲。无需重新录入 — 您在 What-If 中跟踪持仓，然后在您决定时于券商处执行。',
      'CSV importable en 1 clic — toutes les jambes reproduites fidèlement': '一键可导入的 CSV — 忠实还原每一条腿',
      'Jambes de couverture delta en actions incluses': '包含股票 Delta 对冲腿',
      "What-If : suivez virtuellement, puis transmettez l'ordre — rien n'est exécuté sans vous": 'What-If：虚拟跟踪，随后再传输订单 — 没有您的操作不会执行',
      'call + put': '看涨 + 看跌',
      'actions (hedge)': '股票（对冲）',
    },
  };

  function normalize(l) {
    return (l === 'en' || l === 'zh') ? l : 'fr';
  }

  var current;
  try { current = normalize(localStorage.getItem(KEY)); } catch (e) { current = 'fr'; }

  function applyHtmlLang(l) {
    try { document.documentElement.setAttribute('lang', l === 'zh' ? 'zh-CN' : l); } catch (e) {}
  }
  applyHtmlLang(current);

  // t(cléFrançaise[, vars]) → chaîne traduite (repli sur le français).
  function translate(key, vars) {
    var out = key;
    if (current !== 'fr') {
      var table = DICT[current];
      if (table && Object.prototype.hasOwnProperty.call(table, key)) out = table[key];
    }
    if (vars) {
      out = String(out).replace(/\{(\w+)\}/g, function (m, k) {
        return (vars[k] != null) ? vars[k] : m;
      });
    }
    return out;
  }

  window.DXI18n = {
    LANGS: LANGS,
    get: function () { return current; },
    set: function (l) {
      var n = normalize(l);
      if (n === current) return;
      current = n;
      try { localStorage.setItem(KEY, current); } catch (e) {}
      applyHtmlLang(current);
      window.dispatchEvent(new CustomEvent('dx-lang', { detail: current }));
    },
    t: translate,
  };
  window.t = translate;

  // Hook React : renvoie la langue courante et re-render au changement.
  // Utilisé une fois au sommet de l'app → tout l'arbre se re-rend.
  window.useLang = function () {
    var React = window.React;
    if (!React) return current;
    var st = React.useState(current);
    React.useEffect(function () {
      var h = function (e) { st[1](e.detail); };
      window.addEventListener('dx-lang', h);
      return function () { window.removeEventListener('dx-lang', h); };
    }, []);
    return st[0];
  };
})();
