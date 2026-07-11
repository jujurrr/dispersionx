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
      'Au moins 8 caractères': 'At least 8 characters',
      'Au moins 8 caractères, dont une majuscule, une minuscule, un chiffre et un caractère spécial.': 'At least 8 characters, including an uppercase letter, a lowercase letter, a number and a special character.',
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

      // ── Commun aux pages légales / réglages ──
      '← Accueil': '← Home',
      'Dernière mise à jour :': 'Last updated:',

      // ── Préférences — double authentification (2FA) ──
      'Double authentification (2FA)': 'Two-factor authentication (2FA)',
      'Activée': 'Enabled',
      'Désactivée': 'Disabled',
      "Scannez ce QR code avec une application d'authentification (Google Authenticator, Authy, 1Password…), puis saisissez le code à 6 chiffres pour confirmer.":
        'Scan this QR code with an authenticator app (Google Authenticator, Authy, 1Password…), then enter the 6-digit code to confirm.',
      'QR code 2FA': '2FA QR code',
      'Clé manuelle (si vous ne pouvez pas scanner)': 'Manual key (if you cannot scan)',
      'Code à 6 chiffres': '6-digit code',
      'Vérification…': 'Verifying…',
      'Activer': 'Enable',
      'Annuler': 'Cancel',
      "Un code de votre application d'authentification sera demandé à chaque connexion.":
        'A code from your authenticator app will be required at every sign-in.',
      'Désactivation…': 'Disabling…',
      'Désactiver la 2FA': 'Disable 2FA',
      "Ajoutez une couche de sécurité : en plus du mot de passe, un code temporaire sera demandé à la connexion.":
        'Add a layer of security: on top of your password, a temporary code will be required at sign-in.',
      'Préparation…': 'Preparing…',
      'Activer la double authentification': 'Enable two-factor authentication',
      'Activation impossible : ': 'Cannot enable: ',
      "la MFA n'est peut-être pas activée côté Supabase.": 'MFA may not be enabled on the Supabase side.',
      'Double authentification activée.': 'Two-factor authentication enabled.',
      'Code invalide ou expiré': 'Invalid or expired code',
      'Double authentification désactivée.': 'Two-factor authentication disabled.',
      'Désactivation impossible': 'Cannot disable',

      // ── CGU (Terms) ──
      "Conditions Générales d'Utilisation": 'Terms of Use',
      '1. Objet': '1. Purpose',
      "Les présentes CGU définissent les conditions d'accès et d'utilisation du service **DispersionX** (le « Service »), édité par {editeur}. L'achat d'un abonnement Pro est régi par les [Conditions Générales de Vente](nav:sales).":
        'These Terms of Use define the conditions of access to and use of the **DispersionX** service (the “Service”), published by {editeur}. Purchasing a Pro subscription is governed by the [Terms of Sale](nav:sales).',
      '2. Acceptation': '2. Acceptance',
      "L'utilisation du Service implique l'acceptation pleine et entière des présentes CGU. Lors de la création d'un compte, l'utilisateur atteste les avoir lues et acceptées. En cas de désaccord, l'utilisateur doit cesser d'utiliser le Service.":
        'Using the Service implies full and unreserved acceptance of these Terms of Use. When creating an account, the user certifies having read and accepted them. In case of disagreement, the user must stop using the Service.',
      '3. Accès au Service': '3. Access to the Service',
      "**Mode invité** : accessible sans compte ; les données restent stockées localement dans le navigateur.":
        '**Guest mode**: available without an account; data stays stored locally in the browser.',
      "**Compte gratuit** : donne accès aux fonctionnalités de base et à la synchronisation.":
        '**Free account**: gives access to the basic features and to synchronization.',
      "**Abonnement Pro** : débloque des fonctionnalités d'analyse avancées (voir CGV).":
        '**Pro subscription**: unlocks advanced analysis features (see Terms of Sale).',
      "L'accès au Service suppose un appareil connecté à Internet. Les frais de connexion sont à la charge de l'utilisateur.":
        'Access to the Service requires a device connected to the Internet. Connection costs are borne by the user.',
      '4. Utilisation normale': '4. Normal use',
      "L'utilisateur s'engage à utiliser le Service conformément à sa destination : analyse et construction de stratégies à titre **personnel, informatif et pédagogique**. Il est responsable de la confidentialité de ses identifiants et de toute activité réalisée depuis son compte.":
        'The user undertakes to use the Service in accordance with its purpose: analyzing and building strategies on a **personal, informational and educational** basis. The user is responsible for keeping their credentials confidential and for any activity carried out from their account.',
      '5. Interdictions': '5. Prohibitions',
      "Il est notamment interdit :": 'In particular, it is prohibited to:',
      "de tenter d'accéder à des fonctionnalités payantes sans abonnement, ou de contourner les protections d'accès ;":
        'attempt to access paid features without a subscription, or circumvent access protections;',
      "d'extraire, copier, revendre ou rediffuser massivement les données ou contenus (scraping, moissonnage) ;":
        'extract, copy, resell or massively redistribute the data or content (scraping, harvesting);',
      "de désassembler, décompiler ou pratiquer la rétro-ingénierie du Service ;":
        'disassemble, decompile or reverse-engineer the Service;',
      "de perturber le fonctionnement du Service (attaques, surcharge, injection) ;":
        'disrupt the operation of the Service (attacks, overload, injection);',
      "d'utiliser le Service à des fins illégales ou portant atteinte aux droits de tiers.":
        'use the Service for illegal purposes or in ways that infringe third-party rights.',
      '6. Propriété intellectuelle': '6. Intellectual property',
      "Le Service, sa marque, son interface, son code et ses méthodes d'analyse sont protégés et demeurent la propriété exclusive de l'éditeur. L'abonnement confère un simple **droit d'usage personnel, non exclusif et non cessible**, pour la durée de l'abonnement. Les données que vous créez (listes, stratégies) vous appartiennent.":
        'The Service, its trademark, interface, code and analysis methods are protected and remain the exclusive property of the publisher. The subscription grants only a **personal, non-exclusive and non-transferable right of use**, for the duration of the subscription. The data you create (lists, strategies) belongs to you.',
      '7. Disponibilité et évolution du Service': '7. Availability and evolution of the Service',
      "Le Service est fourni « en l'état », sans garantie de disponibilité continue. L'éditeur peut le suspendre pour maintenance, le faire évoluer ou en modifier les fonctionnalités à tout moment. Les **données de marché sont différées d'au moins 15 minutes** et peuvent être estimées ou incomplètes ; leur exactitude n'est pas garantie.":
        'The Service is provided “as is”, with no guarantee of continuous availability. The publisher may suspend it for maintenance, develop it or change its features at any time. **Market data is delayed by at least 15 minutes** and may be estimated or incomplete; its accuracy is not guaranteed.',
      "Les données de marché (cotations, volatilités, chaînes d'options) proviennent de fournisseurs tiers et demeurent leur propriété. Elles sont mises à disposition pour un **usage strictement personnel** au sein du Service : toute extraction, revente, rediffusion ou redistribution à des tiers est interdite. Le Service n'affiche que des données **différées** et des **résultats calculés** (indicateurs, statistiques, graphiques), à l'exclusion de tout flux temps réel destiné à l'exécution d'ordres.":
        'Market data (quotes, volatilities, option chains) comes from third-party providers and remains their property. It is made available for **strictly personal use** within the Service: any extraction, resale, rebroadcast or redistribution to third parties is prohibited. The Service only displays **delayed** data and **computed results** (indicators, statistics, charts), excluding any real-time feed intended for order execution.',
      '8. Avertissement — absence de conseil en investissement': '8. Warning — no investment advice',
      "**DispersionX est un outil d'analyse générique et pédagogique.** Il ne fournit **aucune recommandation personnalisée**, ne constitue **ni un conseil en investissement, ni une incitation à investir**, et n'exécute aucune opération de marché. Les résultats, scores et « opportunités » présentés sont des indicateurs théoriques, non individualisés, qui ne tiennent pas compte de votre situation. Les instruments financiers (options, actions) présentent un risque de perte pouvant aller jusqu'à la totalité du capital engagé. Toute décision d'investissement relève de votre seule responsabilité ; consultez un professionnel habilité (conseiller en investissements financiers) avant d'agir.":
        '**DispersionX is a generic, educational analysis tool.** It provides **no personalized recommendation**, constitutes **neither investment advice nor an inducement to invest**, and executes no market transaction. The results, scores and “opportunities” shown are theoretical, non-individualized indicators that do not take your situation into account. Financial instruments (options, stocks) carry a risk of loss that may reach the entire capital committed. Any investment decision is your sole responsibility; consult an authorized professional (financial investment advisor) before acting.',
      "**L'éditeur n'est ni un prestataire de services d'investissement (PSI), ni un conseiller en investissements financiers (CIF)**, n'est pas enregistré à l'ORIAS ni agréé par l'AMF, et ne fournit aucun service d'investissement au sens de l'article L321-1 du Code monétaire et financier ni de la directive MiFID II. Le Service ne constitue pas du démarchage bancaire ou financier.":
        '**The publisher is neither an investment services provider (PSI) nor a financial investment advisor (CIF)**, is not registered with ORIAS or authorized by the AMF, and provides no investment service within the meaning of Article L321-1 of the French Monetary and Financial Code or of the MiFID II directive. The Service does not constitute banking or financial solicitation.',
      '9. Limitation de responsabilité': '9. Limitation of liability',
      "Dans les limites permises par la loi, l'éditeur ne saurait être tenu responsable des pertes financières, pertes de données, dommages indirects ou décisions prises sur la base du Service. Rien dans les présentes ne limite la responsabilité en cas de faute lourde, de dol, ou pour ce que la loi interdit d'exclure.":
        'To the extent permitted by law, the publisher cannot be held liable for financial losses, data losses, indirect damages or decisions made on the basis of the Service. Nothing herein limits liability in the event of gross negligence, wilful misconduct, or for anything the law prohibits excluding.',
      '10. Suspension et résiliation de compte': '10. Suspension and termination of account',
      "L'éditeur peut suspendre ou résilier un compte en cas de manquement aux présentes CGU (notamment §5), après information lorsque cela est possible. L'utilisateur peut à tout moment supprimer ses données depuis l'application (listes, stratégies, positions) et demander la **suppression complète de son compte** en écrivant à [{email}](mailto:{email}) (traitée sous 30 jours, art. 17 RGPD) ; les modalités relatives à l'abonnement payant figurent dans les CGV.":
        'The publisher may suspend or terminate an account in the event of a breach of these Terms of Use (in particular §5), with prior notice where possible. The user may at any time delete their data from the application (lists, strategies, positions) and request the **complete deletion of their account** by writing to [{email}](mailto:{email}) (handled within 30 days, art. 17 GDPR); the terms relating to the paid subscription are set out in the Terms of Sale.',
      '11. Données personnelles': '11. Personal data',
      "Les traitements sont décrits dans la [Politique de confidentialité](nav:privacy).":
        'Processing is described in the [Privacy Policy](nav:privacy).',
      '12. Modification des CGU': '12. Changes to the Terms of Use',
      "L'éditeur peut modifier les présentes CGU. La date de mise à jour figure en haut de page ; en cas de changement substantiel, les utilisateurs en sont informés dans l'application.":
        'The publisher may amend these Terms of Use. The update date appears at the top of the page; in the event of a substantial change, users are informed within the application.',
      '13. Droit applicable et litiges': '13. Governing law and disputes',
      "Les présentes CGU sont régies par le **droit français**. En cas de litige, une solution amiable sera recherchée en priorité (voir la médiation prévue aux CGV). À défaut, les tribunaux français sont compétents dans les conditions du droit commun.":
        'These Terms of Use are governed by **French law**. In the event of a dispute, an amicable solution will be sought first (see the mediation provided for in the Terms of Sale). Failing that, the French courts have jurisdiction under the conditions of ordinary law.',

      // ── Mentions légales (Legal) ──
      'Mentions légales': 'Legal notice',
      '1. Éditeur du site': '1. Site publisher',
      'Éditeur': 'Publisher',
      'Statut': 'Status',
      'Adresse': 'Address',
      'SIRET': 'SIRET',
      'TVA': 'VAT',
      'Téléphone': 'Phone',
      '2. Directeur de la publication': '2. Publication director',
      "{directeur}, en qualité d'éditeur du site.": '{directeur}, as publisher of the site.',
      '3. Hébergement': '3. Hosting',
      "Le site est hébergé par : **{hebergeur}**.": 'The site is hosted by: **{hebergeur}**.',
      "Les données de compte sont gérées via : **{hebergeurDb}**. Le paiement des abonnements est traité par **Stripe Payments Europe, Ltd.** ; aucune donnée bancaire n'est stockée par l'éditeur.":
        'Account data is managed via: **{hebergeurDb}**. Subscription payments are processed by **Stripe Payments Europe, Ltd.**; no banking data is stored by the publisher.',
      '4. Contact': '4. Contact',
      "Pour toute question relative au site : [{email}](mailto:{email}).":
        'For any question about the site: [{email}](mailto:{email}).',
      '5. Propriété intellectuelle': '5. Intellectual property',
      "L'ensemble des éléments du site (marque « DispersionX », logo, textes, interface, code, méthodologies d'analyse, graphiques) est protégé par le droit de la propriété intellectuelle et demeure la propriété exclusive de l'éditeur, sauf mention contraire. Toute reproduction, représentation, extraction ou réutilisation, totale ou partielle, sans autorisation écrite préalable, est interdite.":
        'All elements of the site (the “DispersionX” trademark, logo, texts, interface, code, analysis methodologies, charts) are protected by intellectual property law and remain the exclusive property of the publisher, unless otherwise stated. Any reproduction, representation, extraction or reuse, in whole or in part, without prior written authorization, is prohibited.',
      '6. Responsabilité — nature du service': '6. Liability — nature of the service',
      "DispersionX est un **outil d'analyse et de simulation à visée pédagogique**. Il ne passe aucun ordre de bourse, ne gère aucun portefeuille, ne détient aucun fonds et ne fournit **aucun conseil en investissement personnalisé**. Les données affichées sont **différées (15 min)** et parfois estimées. L'éditeur ne saurait être tenu responsable des décisions prises sur la base des informations fournies (voir les CGU).":
        'DispersionX is an **analysis and simulation tool for educational purposes**. It places no stock-market orders, manages no portfolio, holds no funds and provides **no personalized investment advice**. The data shown is **delayed (15 min)** and sometimes estimated. The publisher cannot be held liable for decisions made on the basis of the information provided (see the Terms of Use).',
      "**Statut réglementaire :** l'éditeur n'est pas un prestataire de services d'investissement (PSI) ni un conseiller en investissements financiers (CIF), n'est pas enregistré à l'ORIAS ni agréé par l'AMF ou l'ACPR, et ne fournit aucun service d'investissement au sens de l'article L321-1 du Code monétaire et financier ni de la directive MiFID II. Le Service ne relève pas de ces réglementations.":
        '**Regulatory status:** the publisher is not an investment services provider (PSI) or a financial investment advisor (CIF), is not registered with ORIAS or authorized by the AMF or the ACPR, and provides no investment service within the meaning of Article L321-1 of the French Monetary and Financial Code or of the MiFID II directive. The Service does not fall under these regulations.',
      "**Sources de données :** les cotations et volatilités affichées proviennent de fournisseurs tiers (notamment Cboe, Yahoo Finance, Finnhub), sont **différées** et fournies à titre informatif. Elles restent la propriété de leurs fournisseurs respectifs ; leur réutilisation ou redistribution en dehors d'un usage personnel est interdite.":
        '**Data sources:** the quotes and volatilities displayed come from third-party providers (notably Cboe, Yahoo Finance, Finnhub), are **delayed** and provided for informational purposes. They remain the property of their respective providers; their reuse or redistribution beyond personal use is prohibited.',
      '7. Données personnelles': '7. Personal data',
      "Le traitement des données personnelles est décrit dans la [Politique de confidentialité](nav:privacy). Conformément au RGPD, vous disposez de droits d'accès, de rectification et d'effacement, exerçables à l'adresse ci-dessus.":
        'The processing of personal data is described in the [Privacy Policy](nav:privacy). In accordance with the GDPR, you have rights of access, rectification and erasure, which can be exercised at the address above.',
      '8. Droit applicable': '8. Governing law',
      "Le site et son utilisation sont régis par le **droit français**. Les conditions d'utilisation figurent dans les [CGU](nav:terms) et les [CGV](nav:sales).":
        'The site and its use are governed by **French law**. The terms of use are set out in the [Terms of Use](nav:terms) and the [Terms of Sale](nav:sales).',

      // ── Politique de confidentialité (Privacy) ──
      'Politique de confidentialité': 'Privacy Policy',
      "**DispersionX** est une plateforme pédagogique d'analyse et de construction de stratégies d'options (dispersion). Cette politique explique quelles données nous traitons, pourquoi, et quels sont vos droits. Nous appliquons une logique de **minimisation** : nous ne collectons que le strict nécessaire au fonctionnement du service, et **aucune donnée n'est vendue** ni utilisée à des fins publicitaires.":
        '**DispersionX** is an educational platform for analyzing and building options (dispersion) strategies. This policy explains what data we process, why, and what your rights are. We apply a logic of **minimization**: we collect only what is strictly necessary for the service to work, and **no data is sold** or used for advertising purposes.',
      '1. Responsable du traitement': '1. Data controller',
      "Le responsable du traitement est **{responsable}**{statut}. Coordonnées complètes dans les [Mentions légales](nav:legal). Pour toute question relative à vos données ou à l'exercice de vos droits : [{email}](mailto:{email}).":
        'The data controller is **{responsable}**{statut}. Full contact details in the [Legal notice](nav:legal). For any question about your data or the exercise of your rights: [{email}](mailto:{email}).',
      '2. Données que nous traitons': '2. Data we process',
      'Catégorie': 'Category',
      'Exemples': 'Examples',
      'Finalité': 'Purpose',
      'Contenu': 'Content',
      'Abonnement Pro': 'Pro subscription',
      'Techniques': 'Technical',
      "Adresse e-mail, mot de passe (haché par notre hébergeur d'authentification)": 'Email address, password (hashed by our authentication host)',
      'Créer et sécuriser votre compte, synchroniser vos données entre appareils': 'Create and secure your account, sync your data across devices',
      "Listes d'actions, stratégies construites, positions suivies et leurs snapshots": 'Stock lists, built strategies, tracked positions and their snapshots',
      'Fournir le service (analyse, suivi de positions)': 'Provide the service (analysis, position tracking)',
      'Identifiants client/abonnement Stripe, statut, période': 'Stripe customer/subscription IDs, status, period',
      "Gérer l'abonnement payant (le paiement est traité par Stripe, nous ne stockons aucune donnée de carte)": 'Manage the paid subscription (payment is handled by Stripe; we store no card data)',
      'Journaux serveur (horodatage, statut), stockage local du navigateur': 'Server logs (timestamp, status), browser local storage',
      'Sécurité, prévention des abus, bon fonctionnement': 'Security, abuse prevention, proper operation',
      "En **mode invité** (non connecté), vos listes et stratégies restent **uniquement sur votre appareil** (stockage local du navigateur) et ne transitent pas par nos serveurs.":
        'In **guest mode** (not signed in), your lists and strategies stay **only on your device** (browser local storage) and do not pass through our servers.',
      '3. Bases légales (RGPD, art. 6)': '3. Legal bases (GDPR, art. 6)',
      "**Exécution du contrat** : compte, synchronisation, abonnement Pro.": '**Performance of the contract**: account, synchronization, Pro subscription.',
      "**Intérêt légitime** : sécurité, prévention des abus, journaux techniques.": '**Legitimate interest**: security, abuse prevention, technical logs.',
      "**Obligation légale** : conservation des justificatifs de paiement.": '**Legal obligation**: retention of payment records.',
      '4. Sous-traitants et destinataires': '4. Processors and recipients',
      "Nous faisons appel à des prestataires qui n'agissent que sur nos instructions :": 'We use providers that act only on our instructions:',
      "**Supabase** — authentification et base de données (comptes, listes, stratégies, positions). Accès protégé par des règles de sécurité au niveau des lignes (RLS) : chacun n'accède qu'à ses propres données.":
        '**Supabase** — authentication and database (accounts, lists, strategies, positions). Access protected by row-level security (RLS): each person accesses only their own data.',
      "**Vercel** — hébergement du site et des fonctions serveur.": '**Vercel** — hosting of the site and server functions.',
      "**Stripe** — traitement des paiements de l'abonnement Pro (nous ne voyons ni ne stockons vos données bancaires).":
        '**Stripe** — processing of Pro subscription payments (we neither see nor store your banking data).',
      "**Sources de données de marché** — Cboe (cotations différées 15 min), Yahoo Finance, Finnhub. Les requêtes partent de nos serveurs, pas de votre navigateur ; nous ne leur transmettons aucune donnée personnelle.":
        '**Market data sources** — Cboe (15-min delayed quotes), Yahoo Finance, Finnhub. Requests come from our servers, not your browser; we transmit no personal data to them.',
      "**Resend** — envoi d'e-mails d'alerte, uniquement si vous activez une alerte.": '**Resend** — sending alert emails, only if you enable an alert.',
      "**Vercel Web Analytics** — mesure d'audience sans cookie et sans identifiant personnel (pages vues, événements agrégés), servie depuis notre propre domaine. Aucune donnée n'est revendue ni recoupée entre sites.":
        '**Vercel Web Analytics** — audience measurement without cookies and without personal identifiers (page views, aggregated events), served from our own domain. No data is resold or cross-referenced between sites.',
      '5. Cookies et stockage local': '5. Cookies and local storage',
      "DispersionX **n'utilise pas de cookies publicitaires ni de traceurs tiers**. Nous utilisons le **stockage local** de votre navigateur (localStorage) pour mémoriser vos préférences (thème, mode d'affichage) et, en mode invité, vos listes et stratégies. L'authentification Supabase conserve un jeton de session pour vous garder connecté. Ces éléments sont strictement nécessaires au fonctionnement et ne servent pas au pistage.":
        'DispersionX **uses no advertising cookies or third-party trackers**. We use your browser’s **local storage** (localStorage) to remember your preferences (theme, display mode) and, in guest mode, your lists and strategies. Supabase authentication keeps a session token to keep you signed in. These items are strictly necessary for operation and are not used for tracking.',
      "Notre **mesure d'audience** (Vercel Web Analytics) fonctionne **sans cookie** et sans identifiant : elle relève de la mesure d'audience exemptée de consentement au sens des recommandations de la CNIL. Vous pouvez néanmoins la désactiver depuis vos **Préférences**.":
        'Our **audience measurement** (Vercel Web Analytics) works **without cookies** and without identifiers: it qualifies as consent-exempt audience measurement within the meaning of the CNIL’s recommendations. You can nonetheless disable it from your **Preferences**.',
      '6. Durée de conservation': '6. Retention period',
      "Données de compte et contenu : tant que votre compte est actif.": 'Account data and content: as long as your account is active.',
      "À la suppression de votre compte : effacement des données associées (sauf obligations légales, ex. justificatifs de paiement).":
        'When your account is deleted: erasure of the associated data (except legal obligations, e.g. payment records).',
      "Données locales du navigateur : conservées jusqu'à ce que vous les effaciez (déconnexion, vidage du cache).":
        'Browser local data: kept until you erase it (sign-out, cache clearing).',
      '7. Transferts hors Union européenne': '7. Transfers outside the European Union',
      "Certains prestataires (ex. Stripe) peuvent traiter des données en dehors de l'UE. Ces transferts sont encadrés par des garanties appropriées (clauses contractuelles types). Vous pouvez choisir la région d'hébergement de votre base Supabase.":
        'Some providers (e.g. Stripe) may process data outside the EU. These transfers are framed by appropriate safeguards (standard contractual clauses). You can choose the hosting region of your Supabase database.',
      '8. Vos droits': '8. Your rights',
      "Conformément au RGPD, vous disposez des droits d'accès, de rectification, d'effacement, de limitation, d'opposition et de portabilité :":
        'In accordance with the GDPR, you have the rights of access, rectification, erasure, restriction, objection and portability:',
      "**Directement dans l'app** : modifier/supprimer vos listes, stratégies et positions ; **télécharger toutes vos données** en JSON (Préférences → Confidentialité → « Télécharger mes données », portabilité art. 20) ; **supprimer votre compte** (Préférences → Supprimer mon compte, art. 17) ; gérer votre abonnement via le portail Stripe.":
        '**Directly in the app**: edit/delete your lists, strategies and positions; **download all your data** as JSON (Preferences → Privacy → “Download my data”, portability art. 20); **delete your account** (Preferences → Delete my account, art. 17); manage your subscription via the Stripe portal.',
      "**Par e-mail** : vous pouvez aussi exercer ces droits (accès, portabilité, effacement) en écrivant à [{email}](mailto:{email}).":
        '**By email**: you can also exercise these rights (access, portability, erasure) by writing to [{email}](mailto:{email}).',
      "Vous pouvez introduire une réclamation auprès de l'autorité de contrôle compétente (en France, la CNIL).":
        'You may lodge a complaint with the competent supervisory authority (in France, the CNIL).',
      '9. Sécurité': '9. Security',
      "Les échanges sont chiffrés en transit (HTTPS/TLS). L'accès aux données est cloisonné par utilisateur (RLS). Les clés sensibles (paiement, service) restent côté serveur et ne sont jamais exposées au navigateur. Voir le détail de nos mesures dans le fichier **SECURITY.md** du projet.":
        'Exchanges are encrypted in transit (HTTPS/TLS). Data access is partitioned per user (RLS). Sensitive keys (payment, service) stay on the server and are never exposed to the browser. See the details of our measures in the project’s **SECURITY.md** file.',
      '10. Données de marché & avertissement': '10. Market data & disclaimer',
      "Les données affichées sont **différées (15 min)** et parfois estimées. DispersionX est un outil **pédagogique** et ne constitue **pas un conseil en investissement**. Aucune décision financière ne devrait reposer sur ces seules informations.":
        'The data shown is **delayed (15 min)** and sometimes estimated. DispersionX is an **educational** tool and does **not constitute investment advice**. No financial decision should rely on this information alone.',
      '11. Modifications': '11. Changes',
      "Cette politique peut évoluer. La date de dernière mise à jour figure en haut de page ; en cas de changement important, nous vous en informerons dans l'application.":
        'This policy may change. The last-updated date appears at the top of the page; in case of a significant change, we will inform you within the application.',
      "Une question sur vos données ? Écrivez-nous : [{email}](mailto:{email})":
        'A question about your data? Write to us: [{email}](mailto:{email})',

      // ── CGV (Sales) ──
      'Conditions Générales de Vente': 'Terms of Sale',
      "1. Objet et champ d'application": '1. Purpose and scope',
      "Les présentes CGV régissent la vente de l'abonnement **DispersionX Pro** (le « Service Pro ») par {editeur} ({statut}) au consommateur (l'« Abonné »). Elles s'appliquent à l'exclusion de toute autre condition et sont acceptées par l'Abonné avant tout paiement.":
        'These Terms of Sale govern the sale of the **DispersionX Pro** subscription (the “Pro Service”) by {editeur} ({statut}) to the consumer (the “Subscriber”). They apply to the exclusion of any other terms and are accepted by the Subscriber before any payment.',
      '2. Vendeur': '2. Seller',
      "{editeur} — {adresse} — SIRET {siret} — {tva} — contact : [{email}](mailto:{email}). Détails dans les [Mentions légales](nav:legal).":
        '{editeur} — {adresse} — SIRET {siret} — {tva} — contact: [{email}](mailto:{email}). Details in the [Legal notice](nav:legal).',
      '3. Service Pro': '3. Pro Service',
      "L'abonnement Pro débloque des fonctionnalités **d'analyse avancées** (auto-chercheur d'opportunités, contexte de marché, suivi de positions, journal, rapports, export vers un logiciel de courtier). Il s'agit d'un service **d'information et d'analyse** : il ne comprend aucune exécution d'ordre, aucune gestion de portefeuille et aucun conseil personnalisé (voir les [CGU](nav:terms), §8).":
        'The Pro subscription unlocks **advanced analysis** features (automatic opportunity finder, market context, position tracking, journal, reports, export to broker software). It is an **information and analysis** service: it includes no order execution, no portfolio management and no personalized advice (see the [Terms of Use](nav:terms), §8).',
      '4. Prix': '4. Price',
      "Abonnement mensuel : **{prix} par {periode}**.": 'Monthly subscription: **{prix} per {periode}**.',
      "**{tva}** — les prix sont donc nets, sans TVA à ajouter.": '**{tva}** — prices are therefore net, with no VAT to add.',
      "Le prix affiché au moment de la commande prévaut. Des codes promotionnels peuvent s'appliquer.":
        'The price shown at the time of order prevails. Promotional codes may apply.',
      "L'éditeur peut modifier ses tarifs ; le nouveau prix ne s'applique qu'aux échéances postérieures à l'information de l'Abonné.":
        'The publisher may change its prices; the new price applies only to due dates after the Subscriber has been informed.',
      '5. Souscription': '5. Subscription',
      "La souscription nécessite un compte et s'effectue en ligne via notre prestataire de paiement **Stripe**. La commande est ferme après acceptation des présentes CGV (case à cocher / clic de confirmation) et validation du paiement. Un e-mail de confirmation est adressé par Stripe.":
        'Subscribing requires an account and is done online via our payment provider **Stripe**. The order is firm after acceptance of these Terms of Sale (checkbox / confirmation click) and payment validation. A confirmation email is sent by Stripe.',
      '6. Paiement': '6. Payment',
      "Le paiement est traité par **Stripe Payments Europe, Ltd.** L'éditeur ne collecte ni ne conserve aucune donnée de carte bancaire. En souscrivant, l'Abonné autorise le **prélèvement récurrent** du montant de l'abonnement à chaque échéance. En cas d'échec de paiement, l'accès Pro peut être suspendu jusqu'à régularisation.":
        'Payment is processed by **Stripe Payments Europe, Ltd.** The publisher neither collects nor keeps any bank card data. By subscribing, the Subscriber authorizes the **recurring charge** of the subscription amount at each due date. In the event of payment failure, Pro access may be suspended until the situation is resolved.',
      '7. Durée et renouvellement automatique': '7. Term and automatic renewal',
      "L'abonnement est conclu pour une durée d'**un mois**, **reconduit tacitement** de mois en mois par prélèvement automatique, tant que l'Abonné ne résilie pas. Conformément à l'article L215-1 du Code de la consommation, l'Abonné peut mettre fin à la reconduction à tout moment (voir §8).":
        'The subscription is entered into for a term of **one month**, **tacitly renewed** month to month by automatic charge, as long as the Subscriber does not cancel. In accordance with Article L215-1 of the French Consumer Code, the Subscriber may end the renewal at any time (see §8).',
      '8. Résiliation': '8. Cancellation',
      "L'Abonné peut résilier **à tout moment, en ligne et en quelques clics**, depuis **Préférences → Gérer l'abonnement** (portail Stripe), conformément à l'article L215-1-1 du Code de la consommation. La résiliation prend effet à la **fin de la période en cours** déjà payée : l'accès Pro reste actif jusqu'à cette date, sans nouveau prélèvement. Aucun engagement de durée n'est imposé.":
        'The Subscriber may cancel **at any time, online and in a few clicks**, from **Preferences → Manage subscription** (Stripe portal), in accordance with Article L215-1-1 of the French Consumer Code. Cancellation takes effect at the **end of the current period** already paid: Pro access stays active until that date, with no further charge. No minimum commitment period is imposed.',
      '9. Droit de rétractation': '9. Right of withdrawal',
      "Conformément aux articles L221-18 et suivants du Code de la consommation, l'Abonné dispose d'un délai de **quatorze (14) jours** pour se rétracter, sans motif.":
        'In accordance with Articles L221-18 et seq. of the French Consumer Code, the Subscriber has a period of **fourteen (14) days** to withdraw, without giving a reason.',
      "Le Service Pro étant un contenu/service numérique fourni immédiatement, l'Abonné, en cochant la case correspondante lors de la commande, **demande expressément l'accès immédiat** et reconnaît que son droit de rétractation sera **perdu une fois le service pleinement exécuté** (art. L221-28). Indépendamment de ce droit, l'éditeur offre une **garantie commerciale « satisfait ou remboursé » de {garantie} jours** : remboursement intégral sur simple demande à [{email}](mailto:{email}) dans les {garantie} jours suivant le premier paiement.":
        'As the Pro Service is digital content/service supplied immediately, the Subscriber, by ticking the corresponding box at the time of order, **expressly requests immediate access** and acknowledges that their right of withdrawal will be **lost once the service is fully performed** (art. L221-28). Independently of this right, the publisher offers a **{garantie}-day “satisfied or refunded” commercial guarantee**: full refund on simple request to [{email}](mailto:{email}) within {garantie} days of the first payment.',
      '10. Remboursement': '10. Refund',
      "Tout remboursement dû (rétractation ou garantie commerciale) est effectué via Stripe, sur le moyen de paiement utilisé, dans un délai maximal de 14 jours suivant l'acceptation de la demande.":
        'Any refund due (withdrawal or commercial guarantee) is made via Stripe, to the payment method used, within a maximum of 14 days after acceptance of the request.',
      '11. Garantie légale de conformité': '11. Legal guarantee of conformity',
      "L'Abonné bénéficie de la **garantie légale de conformité** applicable aux contenus et services numériques (art. L224-25-1 et suivants du Code de la consommation) : le Service doit être conforme à sa description et l'éditeur répond des défauts de conformité existants. Ces garanties légales s'appliquent indépendamment de toute garantie commerciale.":
        'The Subscriber benefits from the **legal guarantee of conformity** applicable to digital content and services (art. L224-25-1 et seq. of the French Consumer Code): the Service must conform to its description and the publisher is liable for existing conformity defects. These legal guarantees apply independently of any commercial guarantee.',
      '12. Facturation': '12. Billing',
      "Un justificatif / reçu est disponible pour chaque paiement via le portail Stripe (Préférences → Gérer l'abonnement). Compte tenu de la franchise en base de TVA, aucune TVA n'est facturée.":
        'A receipt is available for each payment via the Stripe portal (Preferences → Manage subscription). Given the VAT-exemption scheme (franchise en base), no VAT is charged.',
      '13. Données personnelles': '13. Personal data',
      "Les traitements liés à l'abonnement (compte, identifiants Stripe, statut) sont décrits dans la [Politique de confidentialité](nav:privacy).":
        'Processing related to the subscription (account, Stripe IDs, status) is described in the [Privacy Policy](nav:privacy).',
      '14. Service client et réclamations': '14. Customer service and complaints',
      "Pour toute réclamation, contactez d'abord le service client : [{email}](mailto:{email}). Une réponse est apportée dans les meilleurs délais.":
        'For any complaint, first contact customer service: [{email}](mailto:{email}). A reply is provided as soon as possible.',
      '15. Médiation de la consommation': '15. Consumer mediation',
      "Conformément à l'article L612-1 du Code de la consommation, après une réclamation écrite restée infructueuse, l'Abonné peut recourir gratuitement au médiateur de la consommation dont relève l'éditeur : **{mediateurNom}** — {mediateurAdresse} — {mediateurUrl}.":
        'In accordance with Article L612-1 of the French Consumer Code, after a written complaint that has remained unsuccessful, the Subscriber may refer the matter free of charge to the consumer mediator the publisher depends on: **{mediateurNom}** — {mediateurAdresse} — {mediateurUrl}.',
      '16. Responsabilité': '16. Liability',
      "La responsabilité de l'éditeur au titre du Service Pro s'apprécie dans les limites fixées par les [CGU](nav:terms) (§8 et §9), notamment l'absence de conseil en investissement et le caractère différé/estimé des données.":
        'The publisher’s liability in respect of the Pro Service is assessed within the limits set by the [Terms of Use](nav:terms) (§8 and §9), notably the absence of investment advice and the delayed/estimated nature of the data.',
      '17. Droit applicable et litiges': '17. Governing law and disputes',
      "Les présentes CGV sont soumises au **droit français**. À défaut de résolution amiable ou par médiation, les tribunaux compétents sont ceux du ressort de {ville}, sous réserve des règles d'ordre public protégeant le consommateur.":
        'These Terms of Sale are subject to **French law**. Failing an amicable resolution or mediation, the competent courts are those of the jurisdiction of {ville}, subject to the public-order rules protecting consumers.',
      '18. Modification des CGV': '18. Changes to the Terms of Sale',
      "L'éditeur peut modifier les présentes CGV ; les conditions applicables sont celles en vigueur à la date de la commande (ou de son renouvellement), l'Abonné étant informé de tout changement substantiel avant l'échéance suivante.":
        'The publisher may amend these Terms of Sale; the applicable terms are those in force at the date of the order (or its renewal), the Subscriber being informed of any substantial change before the next due date.',

      // ── Export IBKR (What-If) ──
      'Exporter vers IBKR · What-If': 'Export to IBKR · What-If',
      "Un fichier **.csv** reproduisant toute la stratégie, à importer dans le **Risk Navigator** de TWS. Il s'ouvre en **portefeuille hypothétique** — aucun ordre n'est exécuté.":
        'A **.csv** file reproducing the whole strategy, to import into the TWS **Risk Navigator**. It opens as a **hypothetical portfolio** — no order is executed.',
      'Fermer': 'Close',
      'Ce que contient le fichier': 'What the file contains',
      'globale (actions ETF indice)': 'global (index ETF shares)',
      'jambe par jambe (actions des composants + ETF indice)': 'leg by leg (component shares + index ETF)',
      'aucune': 'none',
      "• **Jambe indice** : short straddle {etf} ({n} {lot}, call + put)": '• **Index leg**: short straddle {etf} ({n} {lot}, call + put)',
      'lot': 'lot',
      'lots': 'lots',
      "• **{n} composants** : long straddle chacun (call + put)": '• **{n} components**: long straddle each (call + put)',
      "• **Couverture du delta** : {hedge}": '• **Delta hedge**: {hedge}',
      "• **Échéance** : {exp}": '• **Expiry**: {exp}',
      "{opt} {lignesOpt} d'options ({contracts} contrats){stock} · {rows} lignes au total.":
        '{opt} option {lignesOpt} ({contracts} contracts){stock} · {rows} rows in total.',
      'ligne': 'line',
      'lignes': 'lines',
      " + {n} {lignesStk} d'actions (couverture)": ' + {n} stock {lignesStk} (hedge)',
      'Vérification des échéances…': 'Checking expiries…',
      '↓ Télécharger le CSV (What-If)': '↓ Download the CSV (What-If)',
      'Fichier téléchargé — suis les étapes ci-dessous.': 'File downloaded — follow the steps below.',
      "Validation des strikes sur la chaîne d'options réelle (Cboe)…": 'Validating strikes on the real option chain (Cboe)…',
      "(l'échéance est déjà cotée par tous les sous-jacents, fixée à la construction)": '(the expiry is already listed by all underlyings, fixed at construction)',
      '✓ {v}/{o} sous-jacents validés': '✓ {v}/{o} underlyings validated',
      "sur la chaîne d'options réelle (Cboe) — strikes et échéance réellement listés.": 'on the real option chain (Cboe) — strikes and expiry actually listed.',
      '{v}/{o} sous-jacents validés': '{v}/{o} underlyings validated',
      "sur la chaîne d'options réelle. Les {n} {restants} (composants sans options US ou chaîne indisponible) utilisent le strike standard le plus proche — si TWS en rejette un, choisis le strike listé voisin.":
        'on the real option chain. The remaining {n} {restants} (components without US options or with an unavailable chain) use the nearest standard strike — if TWS rejects one, pick the neighboring listed strike.',
      'restant': 'one',
      'restants': 'ones',
      'Échéance alignée sur {exp}.': 'Expiry aligned to {exp}.',
      "La date sélectionnée ({sel}) n'est pas cotée par toutes les actions —": 'The selected date ({sel}) is not listed by all the stocks —',
      'toutes les jambes': 'all legs',
      "utilisent donc une seule échéance cotée par l'ensemble des sous-jacents, et cette date s'applique partout dans le site (suivi, monitor).":
        'therefore use a single expiry listed by all underlyings, and this date applies everywhere on the site (tracking, monitor).',
      "Comment l'importer dans TWS (pas à pas)": 'How to import it into TWS (step by step)',
      'Ouvre TWS': 'Open TWS',
      'Lance Trader Workstation (le logiciel de bureau IBKR) et connecte-toi à ton compte.': 'Launch Trader Workstation (the IBKR desktop software) and sign in to your account.',
      'Ouvre le Risk Navigator': 'Open the Risk Navigator',
      'Menu du haut → Analytical Tools (ou New Window) → Risk Navigator.': 'Top menu → Analytical Tools (or New Window) → Risk Navigator.',
      'Importe le fichier': 'Import the file',
      'Dans le Risk Navigator : menu Portfolio → Import → sélectionne le fichier .csv que tu viens de télécharger → Open.':
        'In the Risk Navigator: Portfolio menu → Import → select the .csv file you just downloaded → Open.',
      'Les positions arrivent en What-If': 'The positions arrive as What-If',
      "IBKR ouvre un portefeuille hypothétique (« What-If ») avec toutes tes jambes. RIEN n'est exécuté : c'est une simulation.":
        'IBKR opens a hypothetical (“What-If”) portfolio with all your legs. NOTHING is executed: it is a simulation.',
      'Enregistre le What-If': 'Save the What-If',
      'Menu Portfolio → Save (ou Save As) pour le conserver et suivre ses grecs / son P&L virtuel dans le temps.':
        'Portfolio menu → Save (or Save As) to keep it and track its greeks / virtual P&L over time.',
      '(Optionnel) Passer réellement les ordres': '(Optional) Actually place the orders',
      "Coche la case « Trade » sur les positions à ouvrir, puis clique sur le bouton « Trade » en haut du What-If : IBKR crée les ordres dans TWS. Ils restent en attente — tant que tu ne cliques pas sur Transmit, rien n'est envoyé au marché.":
        'Tick the “Trade” box on the positions to open, then click the “Trade” button at the top of the What-If: IBKR creates the orders in TWS. They stay pending — until you click Transmit, nothing is sent to the market.',
      "Aucun risque d'exécution.": 'No execution risk.',
      "L'import crée seulement une simulation (What-If) : tu peux suivre la position virtuellement, voir ses grecs et son P&L, puis décider — ou non — de passer les ordres. Rien n'est envoyé au marché sans ton clic sur":
        'The import only creates a simulation (What-If): you can follow the position virtually, see its greeks and P&L, then decide — or not — to place the orders. Nothing is sent to the market without your click on',
      "**Échéance {exp}** et **strikes ATM** — exactement ceux de la stratégie construite (le site modélise chaque jambe au plus proche du prix, sur une échéance mensuelle standard). Les contrats sont validés sur la vraie chaîne d'options quand elle est disponible. Le fichier est optimisé pour les sous-jacents cotés aux États-Unis (SPX→SPY, NDX→QQQ, DJI→DIA et leurs composants){foreign}.":
        '**Expiry {exp}** and **ATM strikes** — exactly those of the built strategy (the site models each leg closest to the price, on a standard monthly expiry). Contracts are validated on the real option chain when it is available. The file is optimized for US-listed underlyings (SPX→SPY, NDX→QQQ, DJI→DIA and their components){foreign}.',
      " ; pour les composants européens (CAC/DAX), la devise est renseignée mais tu devras éventuellement préciser la place de cotation dans TWS":
        '; for European components (CAC/DAX), the currency is filled in but you may need to specify the listing exchange in TWS',

      // ── Historique d'abonnement (Préférences) ──
      'Historique d’abonnement': 'Subscription history',
      'Vos paiements et périodes de facturation, synchronisés avec Stripe.': 'Your payments and billing periods, synced with Stripe.',
      'Chargement de l’historique…': 'Loading history…',
      'Historique indisponible pour le moment.': 'History unavailable right now.',
      'Membre Pro depuis le {date}': 'Pro member since {date}',
      'Aucune facture pour l’instant — elle apparaîtra après le premier prélèvement.': 'No invoice yet — it will appear after the first charge.',
      'Accès Pro accordé manuellement — aucun historique de facturation Stripe.': 'Pro access granted manually — no Stripe billing history.',
      'Période du {start} au {end}': 'Period {start} – {end}',
      'Payée': 'Paid',
      'En attente': 'Pending',
      'Annulée': 'Voided',
      'Échouée': 'Failed',
      'Facture': 'Invoice',
      // Statuts de compte (historique)
      'Actif': 'Active',
      'Essai': 'Trial',
      'Résilié': 'Canceled',
      'Remboursé': 'Refunded',
      'Inactif': 'Inactive',
      // ── Remboursement 14 jours (garantie) ──
      'Résilier & être remboursé (14 j)': 'Cancel & get refunded (14 days)',
      'Traitement…': 'Processing…',
      'Garantie « satisfait ou remboursé » : dans les {days} jours suivant le premier paiement, résilie et obtiens un remboursement intégral en un clic.':
        'Money-back guarantee: within {days} days of your first payment, cancel and get a full refund in one click.',
      'Résilier et être remboursé ?': 'Cancel and get refunded?',
      'Ton accès Pro sera coupé immédiatement et ton dernier paiement intégralement remboursé (garantie 14 jours). Cette action est définitive.':
        'Your Pro access will be cut immediately and your last payment fully refunded (14-day guarantee). This action is final.',
      'Confirmer le remboursement': 'Confirm refund',
      'Abonnement résilié et remboursé. Le remboursement apparaîtra sous quelques jours.': 'Subscription canceled and refunded. The refund will appear within a few days.',
      'Délai de 14 jours dépassé — le remboursement automatique n’est plus disponible.': 'The 14-day window has passed — automatic refund is no longer available.',
      'Aucun abonnement Stripe à rembourser.': 'No Stripe subscription to refund.',
      'Remboursement impossible pour le moment : {err}': 'Refund unavailable right now: {err}',

      // ── Pancarte d'accueil (FirstVisitGuide) ──
      'Bienvenue ✦': 'Welcome ✦',
      'J’ai compris': 'Got it',
      // Pancarte Opportunités
      "L'auto-chercheur d'opportunités": 'The opportunity finder',
      "Il fait le travail d'analyse à ta place : au lieu de tester des paniers à la main, il en explore des milliers et te classe les meilleures dispersions d'un indice.":
        'It does the analysis for you: instead of testing baskets by hand, it explores thousands of them and ranks an index’s best dispersions.',
      'Choisis un indice et un horizon': 'Pick an index and a horizon',
      'SPX, NDX, DJI, CAC ou DAX, puis l’échéance de référence (15 à 60 jours).': 'SPX, NDX, DJI, CAC or DAX, then the reference expiry (15 to 60 days).',
      'Lance la recherche': 'Run the search',
      'Le site évalue des milliers de paniers (5 à 20 actions) en combinant le score de dispersion de chaque action et la prime de corrélation du panier.':
        'The site evaluates thousands of baskets (5 to 20 stocks), combining each stock’s dispersion score with the basket’s correlation premium.',
      'Compare les meilleures opportunités': 'Compare the best opportunities',
      'Chaque résultat affiche sa prime, sa diversification et un backtest historique de la prime de corrélation captée.':
        'Each result shows its premium, its diversification and a historical backtest of the correlation premium captured.',
      'Ouvre-la pour l’affiner': 'Open it to refine it',
      'Un clic l’envoie en Construction — sizing vega-neutre et 3 scénarios de stress déjà calculés, comme au Risk Lab.':
        'One click sends it to Construction — vega-neutral sizing and 3 stress scenarios already computed, just like the Risk Lab.',
      // Pancarte Suivi
      'Le Suivi de tes positions': 'Tracking your positions',
      'Toutes les stratégies que tu as engagées, réunies au même endroit pour suivre leur évolution dans le temps.':
        'All the strategies you’ve committed, gathered in one place to follow how they evolve over time.',
      'Tes positions committées arrivent ici': 'Your committed positions land here',
      'Une stratégie engagée (Construction → Risk Lab → Checklist) apparaît automatiquement dans le Suivi, toutes listes confondues.':
        'A committed strategy (Construction → Risk Lab → Checklist) automatically appears in Tracking, across all lists.',
      'Trois façons de les ranger': 'Three ways to organize them',
      'Bascule entre Grille, Groupes et Chronologique selon ce que tu veux voir.': 'Switch between Grid, Groups and Timeline depending on what you want to see.',
      'Crée tes propres groupes': 'Create your own groups',
      'Range chaque position dans un groupe personnalisé — synchronisé sur tous tes appareils.': 'File each position into a custom group — synced across all your devices.',
      'Suis grecs et P&L dans le temps': 'Track greeks and P&L over time',
      'Ouvre une position pour voir ses grecs au DTE restant, ses snapshots et son P&L théorique.':
        'Open a position to see its greeks at the remaining DTE, its snapshots and its theoretical P&L.',
      // Pancarte Marché Pro
      'Le Marché Pro': 'Market Pro',
      'Le contexte de marché de la dispersion : quand la corrélation est chère, quels catalyseurs arrivent, et des alertes pour ne pas rater le bon moment.':
        'The market context for dispersion: when correlation is expensive, which catalysts are coming, and alerts so you don’t miss the right moment.',
      'Le baromètre de corrélation': 'The correlation barometer',
      'Vois si la corrélation implicite d’un indice est chère ou bon marché — le meilleur moment pour vendre de la dispersion.':
        'See whether an index’s implied correlation is expensive or cheap — the best moment to sell dispersion.',
      'Choisis ton indice': 'Pick your index',
      'SPX, NDX, DJI, CAC ou DAX : tout le contexte s’adapte à l’indice sélectionné.': 'SPX, NDX, DJI, CAC or DAX: the whole context adapts to the selected index.',
      'Le calendrier des résultats': 'The earnings calendar',
      'Repère les publications de résultats à venir sur les composants — des catalyseurs de volatilité à surveiller.':
        'Spot upcoming earnings on the components — volatility catalysts to watch.',
      'Pose des alertes': 'Set alerts',
      'Sois prévenu quand la corrélation franchit un seuil, pour agir au bon moment.': 'Get notified when correlation crosses a threshold, to act at the right time.',
      // Pancarte Journal
      'Ton Journal de trades': 'Your trade journal',
      'Enregistre tes dispersions et bâtis ton track record dans le temps : réalisé vs attendu, taux de réussite, P&L cumulé.':
        'Log your dispersions and build your track record over time: realized vs expected, win rate, cumulative P&L.',
      'Enregistre un trade': 'Log a trade',
      '« + Nouveau trade » : indice, composants, prime d’entrée et horizon — ou pré-rempli depuis une opportunité ou une liste.':
        '“+ New trade”: index, components, entry premium and horizon — or pre-filled from an opportunity or a list.',
      'Suis réalisé vs attendu': 'Track realized vs expected',
      'À la clôture, compare la performance réelle à ce que tu visais, avec le P&L et l’issue du trade.':
        'At close, compare the real performance to what you were aiming for, with the P&L and the outcome.',
      'Bâtis ta performance': 'Build your performance',
      'Le journal cumule ton taux de réussite et ton P&L au fil des trades — ton vrai track record.':
        'The journal adds up your win rate and P&L trade after trade — your real track record.',
      'Synchronisé et privé': 'Synced and private',
      'Tes trades sont stockés dans ton compte (cloud, privé) et te suivent sur tous tes appareils.':
        'Your trades are stored in your account (cloud, private) and follow you across all your devices.',
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
      'Au moins 8 caractères': '至少 8 个字符',
      'Au moins 8 caractères, dont une majuscule, une minuscule, un chiffre et un caractère spécial.': '至少 8 个字符，包含大写字母、小写字母、数字和特殊字符。',
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

      // ── Commun aux pages légales / réglages ──
      '← Accueil': '← 首页',
      'Dernière mise à jour :': '最后更新：',

      // ── Préférences — double authentification (2FA) ──
      'Double authentification (2FA)': '双重身份验证 (2FA)',
      'Activée': '已启用',
      'Désactivée': '已禁用',
      "Scannez ce QR code avec une application d'authentification (Google Authenticator, Authy, 1Password…), puis saisissez le code à 6 chiffres pour confirmer.":
        '使用身份验证应用（Google Authenticator、Authy、1Password…）扫描此二维码，然后输入 6 位验证码以确认。',
      'QR code 2FA': '2FA 二维码',
      'Clé manuelle (si vous ne pouvez pas scanner)': '手动密钥（如果无法扫描）',
      'Code à 6 chiffres': '6 位验证码',
      'Vérification…': '验证中…',
      'Activer': '启用',
      'Annuler': '取消',
      "Un code de votre application d'authentification sera demandé à chaque connexion.":
        '每次登录时都需要输入身份验证应用中的验证码。',
      'Désactivation…': '禁用中…',
      'Désactiver la 2FA': '禁用 2FA',
      "Ajoutez une couche de sécurité : en plus du mot de passe, un code temporaire sera demandé à la connexion.":
        '增加一层安全保护：除密码外，登录时还需输入一个临时验证码。',
      'Préparation…': '准备中…',
      'Activer la double authentification': '启用双重身份验证',
      'Activation impossible : ': '无法启用：',
      "la MFA n'est peut-être pas activée côté Supabase.": 'Supabase 端可能尚未启用 MFA。',
      'Double authentification activée.': '双重身份验证已启用。',
      'Code invalide ou expiré': '验证码无效或已过期',
      'Double authentification désactivée.': '双重身份验证已禁用。',
      'Désactivation impossible': '无法禁用',

      // ── CGU (Terms) ──
      "Conditions Générales d'Utilisation": '使用条款',
      '1. Objet': '1. 目的',
      "Les présentes CGU définissent les conditions d'accès et d'utilisation du service **DispersionX** (le « Service »), édité par {editeur}. L'achat d'un abonnement Pro est régi par les [Conditions Générales de Vente](nav:sales).":
        '本使用条款界定了由 {editeur} 发布的 **DispersionX** 服务（“本服务”）的访问与使用条件。购买 Pro 订阅受[销售条款](nav:sales)约束。',
      '2. Acceptation': '2. 接受',
      "L'utilisation du Service implique l'acceptation pleine et entière des présentes CGU. Lors de la création d'un compte, l'utilisateur atteste les avoir lues et acceptées. En cas de désaccord, l'utilisateur doit cesser d'utiliser le Service.":
        '使用本服务即表示完全无保留地接受本使用条款。创建账户时，用户确认已阅读并接受本条款。如有异议，用户应停止使用本服务。',
      '3. Accès au Service': '3. 服务的访问',
      "**Mode invité** : accessible sans compte ; les données restent stockées localement dans le navigateur.":
        '**访客模式**：无需账户即可使用；数据仅本地保存在浏览器中。',
      "**Compte gratuit** : donne accès aux fonctionnalités de base et à la synchronisation.":
        '**免费账户**：可使用基础功能与同步功能。',
      "**Abonnement Pro** : débloque des fonctionnalités d'analyse avancées (voir CGV).":
        '**Pro 订阅**：解锁高级分析功能（见销售条款）。',
      "L'accès au Service suppose un appareil connecté à Internet. Les frais de connexion sont à la charge de l'utilisateur.":
        '访问本服务需要一台联网设备。上网费用由用户承担。',
      '4. Utilisation normale': '4. 正常使用',
      "L'utilisateur s'engage à utiliser le Service conformément à sa destination : analyse et construction de stratégies à titre **personnel, informatif et pédagogique**. Il est responsable de la confidentialité de ses identifiants et de toute activité réalisée depuis son compte.":
        '用户承诺按本服务的用途使用本服务：以**个人、信息性和教育性**为目的进行策略分析与构建。用户负责其登录凭据的保密，并对其账户下进行的一切活动负责。',
      '5. Interdictions': '5. 禁止行为',
      "Il est notamment interdit :": '尤其禁止：',
      "de tenter d'accéder à des fonctionnalités payantes sans abonnement, ou de contourner les protections d'accès ;":
        '试图在未订阅的情况下访问付费功能，或绕过访问保护措施；',
      "d'extraire, copier, revendre ou rediffuser massivement les données ou contenus (scraping, moissonnage) ;":
        '大规模提取、复制、转售或再传播数据或内容（抓取、爬取）；',
      "de désassembler, décompiler ou pratiquer la rétro-ingénierie du Service ;":
        '反汇编、反编译或对本服务进行逆向工程；',
      "de perturber le fonctionnement du Service (attaques, surcharge, injection) ;":
        '干扰本服务的运行（攻击、过载、注入）；',
      "d'utiliser le Service à des fins illégales ou portant atteinte aux droits de tiers.":
        '将本服务用于非法目的或侵害第三方权利。',
      '6. Propriété intellectuelle': '6. 知识产权',
      "Le Service, sa marque, son interface, son code et ses méthodes d'analyse sont protégés et demeurent la propriété exclusive de l'éditeur. L'abonnement confère un simple **droit d'usage personnel, non exclusif et non cessible**, pour la durée de l'abonnement. Les données que vous créez (listes, stratégies) vous appartiennent.":
        '本服务及其商标、界面、代码和分析方法均受保护，且始终为发布者的专有财产。订阅仅授予在订阅期内的**个人、非排他、不可转让的使用权**。您创建的数据（清单、策略）归您所有。',
      '7. Disponibilité et évolution du Service': '7. 服务的可用性与变更',
      "Le Service est fourni « en l'état », sans garantie de disponibilité continue. L'éditeur peut le suspendre pour maintenance, le faire évoluer ou en modifier les fonctionnalités à tout moment. Les **données de marché sont différées d'au moins 15 minutes** et peuvent être estimées ou incomplètes ; leur exactitude n'est pas garantie.":
        '本服务按“现状”提供，不保证持续可用。发布者可随时因维护而暂停、升级或修改其功能。**市场数据至少延迟 15 分钟**，可能为估算值或不完整；其准确性不作保证。',
      "Les données de marché (cotations, volatilités, chaînes d'options) proviennent de fournisseurs tiers et demeurent leur propriété. Elles sont mises à disposition pour un **usage strictement personnel** au sein du Service : toute extraction, revente, rediffusion ou redistribution à des tiers est interdite. Le Service n'affiche que des données **différées** et des **résultats calculés** (indicateurs, statistiques, graphiques), à l'exclusion de tout flux temps réel destiné à l'exécution d'ordres.":
        '市场数据（报价、波动率、期权链）来自第三方提供商，其所有权仍归提供商。它们仅在本服务内供**严格个人使用**：禁止任何形式的提取、转售、转播或向第三方再分发。本服务仅显示**延迟**数据和**计算结果**（指标、统计、图表），不包含任何用于下单执行的实时行情。',
      '8. Avertissement — absence de conseil en investissement': '8. 警告 — 不构成投资建议',
      "**DispersionX est un outil d'analyse générique et pédagogique.** Il ne fournit **aucune recommandation personnalisée**, ne constitue **ni un conseil en investissement, ni une incitation à investir**, et n'exécute aucune opération de marché. Les résultats, scores et « opportunités » présentés sont des indicateurs théoriques, non individualisés, qui ne tiennent pas compte de votre situation. Les instruments financiers (options, actions) présentent un risque de perte pouvant aller jusqu'à la totalité du capital engagé. Toute décision d'investissement relève de votre seule responsabilité ; consultez un professionnel habilité (conseiller en investissements financiers) avant d'agir.":
        '**DispersionX 是一款通用的教育性分析工具。**它**不提供任何个性化建议**，**既不构成投资建议，也不构成投资诱导**，且不执行任何市场交易。所展示的结果、评分和“机会”均为理论性、非个性化指标，未考虑您的具体情况。金融工具（期权、股票）存在损失风险，可能损失全部投入资金。任何投资决定均由您自行负责；行动前请咨询有资质的专业人士（金融投资顾问）。',
      "**L'éditeur n'est ni un prestataire de services d'investissement (PSI), ni un conseiller en investissements financiers (CIF)**, n'est pas enregistré à l'ORIAS ni agréé par l'AMF, et ne fournit aucun service d'investissement au sens de l'article L321-1 du Code monétaire et financier ni de la directive MiFID II. Le Service ne constitue pas du démarchage bancaire ou financier.":
        '**发布者既非投资服务提供商（PSI），也非金融投资顾问（CIF）**，未在 ORIAS 注册，也未获 AMF 批准，且不提供法国《货币与金融法典》第 L321-1 条或 MiFID II 指令意义上的任何投资服务。本服务不构成银行或金融招揽。',
      '9. Limitation de responsabilité': '9. 责任限制',
      "Dans les limites permises par la loi, l'éditeur ne saurait être tenu responsable des pertes financières, pertes de données, dommages indirects ou décisions prises sur la base du Service. Rien dans les présentes ne limite la responsabilité en cas de faute lourde, de dol, ou pour ce que la loi interdit d'exclure.":
        '在法律允许的范围内，发布者不对财务损失、数据丢失、间接损害或基于本服务作出的决定承担责任。本条款中的任何内容均不限制因重大过失、欺诈或法律禁止排除的情形所产生的责任。',
      '10. Suspension et résiliation de compte': '10. 账户的暂停与终止',
      "L'éditeur peut suspendre ou résilier un compte en cas de manquement aux présentes CGU (notamment §5), après information lorsque cela est possible. L'utilisateur peut à tout moment supprimer ses données depuis l'application (listes, stratégies, positions) et demander la **suppression complète de son compte** en écrivant à [{email}](mailto:{email}) (traitée sous 30 jours, art. 17 RGPD) ; les modalités relatives à l'abonnement payant figurent dans les CGV.":
        '如用户违反本使用条款（尤其是第 5 条），发布者可在可能时提前通知后暂停或终止其账户。用户可随时在应用中删除其数据（清单、策略、持仓），并通过写信至 [{email}](mailto:{email}) 请求**彻底删除其账户**（在 30 天内处理，GDPR 第 17 条）；有关付费订阅的条款见销售条款。',
      '11. Données personnelles': '11. 个人数据',
      "Les traitements sont décrits dans la [Politique de confidentialité](nav:privacy).":
        '相关处理在[隐私政策](nav:privacy)中说明。',
      '12. Modification des CGU': '12. 使用条款的修改',
      "L'éditeur peut modifier les présentes CGU. La date de mise à jour figure en haut de page ; en cas de changement substantiel, les utilisateurs en sont informés dans l'application.":
        '发布者可修改本使用条款。更新日期显示在页面顶部；如有重大变更，将在应用内通知用户。',
      '13. Droit applicable et litiges': '13. 适用法律与争议',
      "Les présentes CGU sont régies par le **droit français**. En cas de litige, une solution amiable sera recherchée en priorité (voir la médiation prévue aux CGV). À défaut, les tribunaux français sont compétents dans les conditions du droit commun.":
        '本使用条款受**法国法律**管辖。如发生争议，将优先寻求友好解决（见销售条款所规定的调解）。否则，由法国法院依普通法规定行使管辖权。',

      // ── Mentions légales (Legal) ──
      'Mentions légales': '法律声明',
      '1. Éditeur du site': '1. 网站发布者',
      'Éditeur': '发布者',
      'Statut': '状态',
      'Adresse': '地址',
      'SIRET': 'SIRET',
      'TVA': '增值税',
      'Téléphone': '电话',
      '2. Directeur de la publication': '2. 出版负责人',
      "{directeur}, en qualité d'éditeur du site.": '{directeur}，作为本网站的发布者。',
      '3. Hébergement': '3. 托管',
      "Le site est hébergé par : **{hebergeur}**.": '本网站由以下机构托管：**{hebergeur}**。',
      "Les données de compte sont gérées via : **{hebergeurDb}**. Le paiement des abonnements est traité par **Stripe Payments Europe, Ltd.** ; aucune donnée bancaire n'est stockée par l'éditeur.":
        '账户数据通过以下方式管理：**{hebergeurDb}**。订阅付款由 **Stripe Payments Europe, Ltd.** 处理；发布者不存储任何银行数据。',
      '4. Contact': '4. 联系方式',
      "Pour toute question relative au site : [{email}](mailto:{email}).":
        '如对本网站有任何疑问：[{email}](mailto:{email})。',
      '5. Propriété intellectuelle': '5. 知识产权',
      "L'ensemble des éléments du site (marque « DispersionX », logo, textes, interface, code, méthodologies d'analyse, graphiques) est protégé par le droit de la propriété intellectuelle et demeure la propriété exclusive de l'éditeur, sauf mention contraire. Toute reproduction, représentation, extraction ou réutilisation, totale ou partielle, sans autorisation écrite préalable, est interdite.":
        '本网站的所有元素（“DispersionX”商标、标志、文本、界面、代码、分析方法、图表）均受知识产权法保护，除非另有说明，均为发布者的专有财产。未经事先书面授权，禁止对其进行任何全部或部分的复制、展示、提取或再利用。',
      '6. Responsabilité — nature du service': '6. 责任 — 服务性质',
      "DispersionX est un **outil d'analyse et de simulation à visée pédagogique**. Il ne passe aucun ordre de bourse, ne gère aucun portefeuille, ne détient aucun fonds et ne fournit **aucun conseil en investissement personnalisé**. Les données affichées sont **différées (15 min)** et parfois estimées. L'éditeur ne saurait être tenu responsable des décisions prises sur la base des informations fournies (voir les CGU).":
        'DispersionX 是一款**以教育为目的的分析与模拟工具**。它不下达任何证券订单、不管理任何投资组合、不持有任何资金，也**不提供任何个性化投资建议**。所显示的数据为**延迟（15 分钟）**，有时为估算值。发布者不对基于所提供信息作出的决定承担责任（见使用条款）。',
      "**Statut réglementaire :** l'éditeur n'est pas un prestataire de services d'investissement (PSI) ni un conseiller en investissements financiers (CIF), n'est pas enregistré à l'ORIAS ni agréé par l'AMF ou l'ACPR, et ne fournit aucun service d'investissement au sens de l'article L321-1 du Code monétaire et financier ni de la directive MiFID II. Le Service ne relève pas de ces réglementations.":
        '**监管状态：**发布者既非投资服务提供商（PSI），也非金融投资顾问（CIF），未在 ORIAS 注册，也未获 AMF 或 ACPR 批准，且不提供法国《货币与金融法典》第 L321-1 条或 MiFID II 指令意义上的任何投资服务。本服务不受这些法规约束。',
      "**Sources de données :** les cotations et volatilités affichées proviennent de fournisseurs tiers (notamment Cboe, Yahoo Finance, Finnhub), sont **différées** et fournies à titre informatif. Elles restent la propriété de leurs fournisseurs respectifs ; leur réutilisation ou redistribution en dehors d'un usage personnel est interdite.":
        '**数据来源：**所显示的报价和波动率来自第三方提供商（尤其是 Cboe、Yahoo Finance、Finnhub），为**延迟**数据，仅供参考。它们仍归各自提供商所有；禁止在个人使用之外对其再利用或再分发。',
      '7. Données personnelles': '7. 个人数据',
      "Le traitement des données personnelles est décrit dans la [Politique de confidentialité](nav:privacy). Conformément au RGPD, vous disposez de droits d'accès, de rectification et d'effacement, exerçables à l'adresse ci-dessus.":
        '个人数据的处理在[隐私政策](nav:privacy)中说明。根据 GDPR，您享有访问、更正和删除的权利，可通过上述地址行使。',
      '8. Droit applicable': '8. 适用法律',
      "Le site et son utilisation sont régis par le **droit français**. Les conditions d'utilisation figurent dans les [CGU](nav:terms) et les [CGV](nav:sales).":
        '本网站及其使用受**法国法律**管辖。使用条件载于[使用条款](nav:terms)和[销售条款](nav:sales)中。',

      // ── Politique de confidentialité (Privacy) ──
      'Politique de confidentialité': '隐私政策',
      "**DispersionX** est une plateforme pédagogique d'analyse et de construction de stratégies d'options (dispersion). Cette politique explique quelles données nous traitons, pourquoi, et quels sont vos droits. Nous appliquons une logique de **minimisation** : nous ne collectons que le strict nécessaire au fonctionnement du service, et **aucune donnée n'est vendue** ni utilisée à des fins publicitaires.":
        '**DispersionX** 是一个用于分析和构建期权（离散度）策略的教育平台。本政策说明我们处理哪些数据、原因以及您的权利。我们遵循**最小化**原则：仅收集服务运行所严格必需的数据，且**不出售任何数据**，也不将其用于广告目的。',
      '1. Responsable du traitement': '1. 数据控制者',
      "Le responsable du traitement est **{responsable}**{statut}. Coordonnées complètes dans les [Mentions légales](nav:legal). Pour toute question relative à vos données ou à l'exercice de vos droits : [{email}](mailto:{email}).":
        '数据控制者为 **{responsable}**{statut}。完整联系方式见[法律声明](nav:legal)。如对您的数据或权利行使有任何疑问：[{email}](mailto:{email})。',
      '2. Données que nous traitons': '2. 我们处理的数据',
      'Catégorie': '类别',
      'Exemples': '示例',
      'Finalité': '目的',
      'Contenu': '内容',
      'Abonnement Pro': 'Pro 订阅',
      'Techniques': '技术数据',
      "Adresse e-mail, mot de passe (haché par notre hébergeur d'authentification)": '电子邮件地址、密码（由我们的身份验证托管商进行哈希处理）',
      'Créer et sécuriser votre compte, synchroniser vos données entre appareils': '创建并保护您的账户，在设备之间同步您的数据',
      "Listes d'actions, stratégies construites, positions suivies et leurs snapshots": '股票清单、已构建的策略、已跟踪的持仓及其快照',
      'Fournir le service (analyse, suivi de positions)': '提供服务（分析、持仓跟踪）',
      'Identifiants client/abonnement Stripe, statut, période': 'Stripe 客户/订阅标识、状态、周期',
      "Gérer l'abonnement payant (le paiement est traité par Stripe, nous ne stockons aucune donnée de carte)": '管理付费订阅（付款由 Stripe 处理，我们不存储任何卡片数据）',
      'Journaux serveur (horodatage, statut), stockage local du navigateur': '服务器日志（时间戳、状态）、浏览器本地存储',
      'Sécurité, prévention des abus, bon fonctionnement': '安全、防止滥用、正常运行',
      "En **mode invité** (non connecté), vos listes et stratégies restent **uniquement sur votre appareil** (stockage local du navigateur) et ne transitent pas par nos serveurs.":
        '在**访客模式**（未登录）下，您的清单和策略**仅保留在您的设备上**（浏览器本地存储），不会经过我们的服务器。',
      '3. Bases légales (RGPD, art. 6)': '3. 法律依据（GDPR 第 6 条）',
      "**Exécution du contrat** : compte, synchronisation, abonnement Pro.": '**合同履行**：账户、同步、Pro 订阅。',
      "**Intérêt légitime** : sécurité, prévention des abus, journaux techniques.": '**合法利益**：安全、防止滥用、技术日志。',
      "**Obligation légale** : conservation des justificatifs de paiement.": '**法律义务**：保存付款凭证。',
      '4. Sous-traitants et destinataires': '4. 分包商与接收方',
      "Nous faisons appel à des prestataires qui n'agissent que sur nos instructions :": '我们使用仅按我们指示行事的服务商：',
      "**Supabase** — authentification et base de données (comptes, listes, stratégies, positions). Accès protégé par des règles de sécurité au niveau des lignes (RLS) : chacun n'accède qu'à ses propres données.":
        '**Supabase** — 身份验证与数据库（账户、清单、策略、持仓）。通过行级安全规则（RLS）保护访问：每个人只能访问自己的数据。',
      "**Vercel** — hébergement du site et des fonctions serveur.": '**Vercel** — 网站与服务器函数的托管。',
      "**Stripe** — traitement des paiements de l'abonnement Pro (nous ne voyons ni ne stockons vos données bancaires).":
        '**Stripe** — 处理 Pro 订阅付款（我们既不查看也不存储您的银行数据）。',
      "**Sources de données de marché** — Cboe (cotations différées 15 min), Yahoo Finance, Finnhub. Les requêtes partent de nos serveurs, pas de votre navigateur ; nous ne leur transmettons aucune donnée personnelle.":
        '**市场数据来源** — Cboe（延迟 15 分钟的报价）、Yahoo Finance、Finnhub。请求来自我们的服务器，而非您的浏览器；我们不向它们传输任何个人数据。',
      "**Resend** — envoi d'e-mails d'alerte, uniquement si vous activez une alerte.": '**Resend** — 发送提醒邮件，仅在您启用提醒时。',
      "**Vercel Web Analytics** — mesure d'audience sans cookie et sans identifiant personnel (pages vues, événements agrégés), servie depuis notre propre domaine. Aucune donnée n'est revendue ni recoupée entre sites.":
        '**Vercel Web Analytics** — 无 Cookie、无个人标识的访问量统计（页面浏览、聚合事件），由我们自有域名提供。不出售任何数据，也不在网站之间进行交叉比对。',
      '5. Cookies et stockage local': '5. Cookie 与本地存储',
      "DispersionX **n'utilise pas de cookies publicitaires ni de traceurs tiers**. Nous utilisons le **stockage local** de votre navigateur (localStorage) pour mémoriser vos préférences (thème, mode d'affichage) et, en mode invité, vos listes et stratégies. L'authentification Supabase conserve un jeton de session pour vous garder connecté. Ces éléments sont strictement nécessaires au fonctionnement et ne servent pas au pistage.":
        'DispersionX **不使用广告 Cookie 或第三方跟踪器**。我们使用浏览器的**本地存储**（localStorage）来记住您的偏好（主题、显示模式），并在访客模式下保存您的清单和策略。Supabase 身份验证会保留一个会话令牌以使您保持登录。这些内容是运行所严格必需的，不用于跟踪。',
      "Notre **mesure d'audience** (Vercel Web Analytics) fonctionne **sans cookie** et sans identifiant : elle relève de la mesure d'audience exemptée de consentement au sens des recommandations de la CNIL. Vous pouvez néanmoins la désactiver depuis vos **Préférences**.":
        '我们的**访问量统计**（Vercel Web Analytics）**无 Cookie**、无标识：根据法国 CNIL 的建议，它属于免征同意的访问量统计。不过，您仍可在**偏好设置**中将其禁用。',
      '6. Durée de conservation': '6. 保留期限',
      "Données de compte et contenu : tant que votre compte est actif.": '账户数据与内容：只要您的账户处于活动状态。',
      "À la suppression de votre compte : effacement des données associées (sauf obligations légales, ex. justificatifs de paiement).":
        '删除账户时：清除相关数据（法律义务除外，例如付款凭证）。',
      "Données locales du navigateur : conservées jusqu'à ce que vous les effaciez (déconnexion, vidage du cache).":
        '浏览器本地数据：在您清除之前一直保留（退出登录、清空缓存）。',
      '7. Transferts hors Union européenne': '7. 欧盟境外的数据传输',
      "Certains prestataires (ex. Stripe) peuvent traiter des données en dehors de l'UE. Ces transferts sont encadrés par des garanties appropriées (clauses contractuelles types). Vous pouvez choisir la région d'hébergement de votre base Supabase.":
        '部分服务商（如 Stripe）可能在欧盟境外处理数据。此类传输受适当保障措施（标准合同条款）约束。您可以选择 Supabase 数据库的托管区域。',
      '8. Vos droits': '8. 您的权利',
      "Conformément au RGPD, vous disposez des droits d'accès, de rectification, d'effacement, de limitation, d'opposition et de portabilité :":
        '根据 GDPR，您享有访问、更正、删除、限制、反对和可携带的权利：',
      "**Directement dans l'app** : modifier/supprimer vos listes, stratégies et positions ; **télécharger toutes vos données** en JSON (Préférences → Confidentialité → « Télécharger mes données », portabilité art. 20) ; **supprimer votre compte** (Préférences → Supprimer mon compte, art. 17) ; gérer votre abonnement via le portail Stripe.":
        '**直接在应用中**：编辑/删除您的清单、策略和持仓；以 JSON 格式**下载您的全部数据**（偏好设置 → 隐私 → “下载我的数据”，可携带权第 20 条）；**删除您的账户**（偏好设置 → 删除我的账户，第 17 条）；通过 Stripe 门户管理您的订阅。',
      "**Par e-mail** : vous pouvez aussi exercer ces droits (accès, portabilité, effacement) en écrivant à [{email}](mailto:{email}).":
        '**通过电子邮件**：您也可以写信至 [{email}](mailto:{email}) 行使这些权利（访问、可携带、删除）。',
      "Vous pouvez introduire une réclamation auprès de l'autorité de contrôle compétente (en France, la CNIL).":
        '您可以向主管监管机构（在法国为 CNIL）提出投诉。',
      '9. Sécurité': '9. 安全',
      "Les échanges sont chiffrés en transit (HTTPS/TLS). L'accès aux données est cloisonné par utilisateur (RLS). Les clés sensibles (paiement, service) restent côté serveur et ne sont jamais exposées au navigateur. Voir le détail de nos mesures dans le fichier **SECURITY.md** du projet.":
        '数据传输过程中经过加密（HTTPS/TLS）。数据访问按用户隔离（RLS）。敏感密钥（付款、服务）始终保留在服务器端，绝不暴露给浏览器。有关我们措施的详情，请见项目中的 **SECURITY.md** 文件。',
      '10. Données de marché & avertissement': '10. 市场数据与免责声明',
      "Les données affichées sont **différées (15 min)** et parfois estimées. DispersionX est un outil **pédagogique** et ne constitue **pas un conseil en investissement**. Aucune décision financière ne devrait reposer sur ces seules informations.":
        '所显示的数据为**延迟（15 分钟）**，有时为估算值。DispersionX 是一款**教育性**工具，**不构成投资建议**。任何财务决定都不应仅依据这些信息作出。',
      '11. Modifications': '11. 修改',
      "Cette politique peut évoluer. La date de dernière mise à jour figure en haut de page ; en cas de changement important, nous vous en informerons dans l'application.":
        '本政策可能变更。最后更新日期显示在页面顶部；如有重大变更，我们将在应用内通知您。',
      "Une question sur vos données ? Écrivez-nous : [{email}](mailto:{email})":
        '对您的数据有疑问？请写信给我们：[{email}](mailto:{email})',

      // ── CGV (Sales) ──
      'Conditions Générales de Vente': '销售条款',
      "1. Objet et champ d'application": '1. 目的与适用范围',
      "Les présentes CGV régissent la vente de l'abonnement **DispersionX Pro** (le « Service Pro ») par {editeur} ({statut}) au consommateur (l'« Abonné »). Elles s'appliquent à l'exclusion de toute autre condition et sont acceptées par l'Abonné avant tout paiement.":
        '本销售条款约束 {editeur}（{statut}）向消费者（“订阅者”）销售 **DispersionX Pro** 订阅（“Pro 服务”）。本条款排除任何其他条件而适用，并由订阅者在任何付款前接受。',
      '2. Vendeur': '2. 卖方',
      "{editeur} — {adresse} — SIRET {siret} — {tva} — contact : [{email}](mailto:{email}). Détails dans les [Mentions légales](nav:legal).":
        '{editeur} — {adresse} — SIRET {siret} — {tva} — 联系方式：[{email}](mailto:{email})。详情见[法律声明](nav:legal)。',
      '3. Service Pro': '3. Pro 服务',
      "L'abonnement Pro débloque des fonctionnalités **d'analyse avancées** (auto-chercheur d'opportunités, contexte de marché, suivi de positions, journal, rapports, export vers un logiciel de courtier). Il s'agit d'un service **d'information et d'analyse** : il ne comprend aucune exécution d'ordre, aucune gestion de portefeuille et aucun conseil personnalisé (voir les [CGU](nav:terms), §8).":
        'Pro 订阅解锁**高级分析**功能（自动机会搜索、市场背景、持仓跟踪、日志、报告、导出到券商软件）。这是一项**信息与分析**服务：不包含任何下单执行、投资组合管理或个性化建议（见[使用条款](nav:terms)第 8 条）。',
      '4. Prix': '4. 价格',
      "Abonnement mensuel : **{prix} par {periode}**.": '月度订阅：**每{periode} {prix}**。',
      "**{tva}** — les prix sont donc nets, sans TVA à ajouter.": '**{tva}** — 因此价格为净额，无需另加增值税。',
      "Le prix affiché au moment de la commande prévaut. Des codes promotionnels peuvent s'appliquer.":
        '下单时所显示的价格为准。可适用促销代码。',
      "L'éditeur peut modifier ses tarifs ; le nouveau prix ne s'applique qu'aux échéances postérieures à l'information de l'Abonné.":
        '发布者可修改其价格；新价格仅适用于在通知订阅者之后的到期日。',
      '5. Souscription': '5. 订阅',
      "La souscription nécessite un compte et s'effectue en ligne via notre prestataire de paiement **Stripe**. La commande est ferme après acceptation des présentes CGV (case à cocher / clic de confirmation) et validation du paiement. Un e-mail de confirmation est adressé par Stripe.":
        '订阅需要一个账户，并通过我们的付款服务商 **Stripe** 在线完成。在接受本销售条款（勾选复选框／点击确认）并完成付款验证后，订单即告确定。Stripe 会发送一封确认邮件。',
      '6. Paiement': '6. 付款',
      "Le paiement est traité par **Stripe Payments Europe, Ltd.** L'éditeur ne collecte ni ne conserve aucune donnée de carte bancaire. En souscrivant, l'Abonné autorise le **prélèvement récurrent** du montant de l'abonnement à chaque échéance. En cas d'échec de paiement, l'accès Pro peut être suspendu jusqu'à régularisation.":
        '付款由 **Stripe Payments Europe, Ltd.** 处理。发布者既不收集也不保存任何银行卡数据。订阅即表示订阅者授权在每个到期日**定期扣取**订阅金额。如付款失败，Pro 访问权限可能被暂停，直至问题得到解决。',
      '7. Durée et renouvellement automatique': '7. 期限与自动续订',
      "L'abonnement est conclu pour une durée d'**un mois**, **reconduit tacitement** de mois en mois par prélèvement automatique, tant que l'Abonné ne résilie pas. Conformément à l'article L215-1 du Code de la consommation, l'Abonné peut mettre fin à la reconduction à tout moment (voir §8).":
        '订阅期限为**一个月**，只要订阅者不取消，即通过自动扣款按月**默示续订**。根据法国《消费法典》第 L215-1 条，订阅者可随时终止续订（见第 8 条）。',
      '8. Résiliation': '8. 取消',
      "L'Abonné peut résilier **à tout moment, en ligne et en quelques clics**, depuis **Préférences → Gérer l'abonnement** (portail Stripe), conformément à l'article L215-1-1 du Code de la consommation. La résiliation prend effet à la **fin de la période en cours** déjà payée : l'accès Pro reste actif jusqu'à cette date, sans nouveau prélèvement. Aucun engagement de durée n'est imposé.":
        '根据法国《消费法典》第 L215-1-1 条，订阅者可**随时在线并只需几次点击**，从**偏好设置 → 管理订阅**（Stripe 门户）取消。取消在已付费的**当前周期结束时**生效：Pro 访问权限保持有效至该日期，且不再扣款。不设任何最低期限承诺。',
      '9. Droit de rétractation': '9. 撤回权',
      "Conformément aux articles L221-18 et suivants du Code de la consommation, l'Abonné dispose d'un délai de **quatorze (14) jours** pour se rétracter, sans motif.":
        '根据法国《消费法典》第 L221-18 条及以下条款，订阅者享有**十四 (14) 天**的期限，可无理由撤回。',
      "Le Service Pro étant un contenu/service numérique fourni immédiatement, l'Abonné, en cochant la case correspondante lors de la commande, **demande expressément l'accès immédiat** et reconnaît que son droit de rétractation sera **perdu une fois le service pleinement exécuté** (art. L221-28). Indépendamment de ce droit, l'éditeur offre une **garantie commerciale « satisfait ou remboursé » de {garantie} jours** : remboursement intégral sur simple demande à [{email}](mailto:{email}) dans les {garantie} jours suivant le premier paiement.":
        '由于 Pro 服务是立即提供的数字内容/服务，订阅者在下单时勾选相应复选框，即**明确要求立即获取访问权限**，并承认其撤回权将在**服务完全履行后丧失**（第 L221-28 条）。除该权利外，发布者还提供**为期 {garantie} 天的“满意或退款”商业保证**：在首次付款后 {garantie} 天内，只需发送请求至 [{email}](mailto:{email}) 即可全额退款。',
      '10. Remboursement': '10. 退款',
      "Tout remboursement dû (rétractation ou garantie commerciale) est effectué via Stripe, sur le moyen de paiement utilisé, dans un délai maximal de 14 jours suivant l'acceptation de la demande.":
        '任何应付退款（撤回或商业保证）均通过 Stripe 退回至所使用的付款方式，最迟在请求获接受后 14 天内完成。',
      '11. Garantie légale de conformité': '11. 法定符合性保证',
      "L'Abonné bénéficie de la **garantie légale de conformité** applicable aux contenus et services numériques (art. L224-25-1 et suivants du Code de la consommation) : le Service doit être conforme à sa description et l'éditeur répond des défauts de conformité existants. Ces garanties légales s'appliquent indépendamment de toute garantie commerciale.":
        '订阅者享有适用于数字内容和服务的**法定符合性保证**（法国《消费法典》第 L224-25-1 条及以下条款）：本服务须与其描述相符，发布者对既存的符合性缺陷负责。此类法定保证独立于任何商业保证而适用。',
      '12. Facturation': '12. 开票',
      "Un justificatif / reçu est disponible pour chaque paiement via le portail Stripe (Préférences → Gérer l'abonnement). Compte tenu de la franchise en base de TVA, aucune TVA n'est facturée.":
        '每笔付款均可通过 Stripe 门户获取凭证/收据（偏好设置 → 管理订阅）。鉴于增值税免征制度，不收取任何增值税。',
      '13. Données personnelles': '13. 个人数据',
      "Les traitements liés à l'abonnement (compte, identifiants Stripe, statut) sont décrits dans la [Politique de confidentialité](nav:privacy).":
        '与订阅相关的处理（账户、Stripe 标识、状态）在[隐私政策](nav:privacy)中说明。',
      '14. Service client et réclamations': '14. 客户服务与投诉',
      "Pour toute réclamation, contactez d'abord le service client : [{email}](mailto:{email}). Une réponse est apportée dans les meilleurs délais.":
        '如有任何投诉，请先联系客户服务：[{email}](mailto:{email})。我们将尽快答复。',
      '15. Médiation de la consommation': '15. 消费调解',
      "Conformément à l'article L612-1 du Code de la consommation, après une réclamation écrite restée infructueuse, l'Abonné peut recourir gratuitement au médiateur de la consommation dont relève l'éditeur : **{mediateurNom}** — {mediateurAdresse} — {mediateurUrl}.":
        '根据法国《消费法典》第 L612-1 条，在书面投诉未果后，订阅者可免费向发布者所属的消费调解员求助：**{mediateurNom}** — {mediateurAdresse} — {mediateurUrl}。',
      '16. Responsabilité': '16. 责任',
      "La responsabilité de l'éditeur au titre du Service Pro s'apprécie dans les limites fixées par les [CGU](nav:terms) (§8 et §9), notamment l'absence de conseil en investissement et le caractère différé/estimé des données.":
        '发布者就 Pro 服务承担的责任，在[使用条款](nav:terms)（第 8 条和第 9 条）所设定的范围内评估，尤其是不提供投资建议以及数据的延迟/估算性质。',
      '17. Droit applicable et litiges': '17. 适用法律与争议',
      "Les présentes CGV sont soumises au **droit français**. À défaut de résolution amiable ou par médiation, les tribunaux compétents sont ceux du ressort de {ville}, sous réserve des règles d'ordre public protégeant le consommateur.":
        '本销售条款受**法国法律**约束。若未能友好解决或经调解解决，管辖法院为 {ville} 辖区的法院，但须遵守保护消费者的公共秩序规则。',
      '18. Modification des CGV': '18. 销售条款的修改',
      "L'éditeur peut modifier les présentes CGV ; les conditions applicables sont celles en vigueur à la date de la commande (ou de son renouvellement), l'Abonné étant informé de tout changement substantiel avant l'échéance suivante.":
        '发布者可修改本销售条款；适用的条款为下单（或续订）之日有效的条款，任何重大变更将在下一到期日前通知订阅者。',

      // ── Export IBKR (What-If) ──
      'Exporter vers IBKR · What-If': '导出到 IBKR · What-If',
      "Un fichier **.csv** reproduisant toute la stratégie, à importer dans le **Risk Navigator** de TWS. Il s'ouvre en **portefeuille hypothétique** — aucun ordre n'est exécuté.":
        '一个还原整个策略的 **.csv** 文件，可导入 TWS 的 **Risk Navigator**。它以**假设性投资组合**形式打开 — 不执行任何订单。',
      'Fermer': '关闭',
      'Ce que contient le fichier': '文件包含的内容',
      'globale (actions ETF indice)': '整体（指数 ETF 股票）',
      'jambe par jambe (actions des composants + ETF indice)': '逐腿（成分股股票 + 指数 ETF）',
      'aucune': '无',
      "• **Jambe indice** : short straddle {etf} ({n} {lot}, call + put)": '• **指数腿**：卖出跨式 {etf}（{n} {lot}，看涨 + 看跌）',
      'lot': '手',
      'lots': '手',
      "• **{n} composants** : long straddle chacun (call + put)": '• **{n} 只成分股**：各买入跨式（看涨 + 看跌）',
      "• **Couverture du delta** : {hedge}": '• **Delta 对冲**：{hedge}',
      "• **Échéance** : {exp}": '• **到期日**：{exp}',
      "{opt} {lignesOpt} d'options ({contracts} contrats){stock} · {rows} lignes au total.":
        '{opt} {lignesOpt}期权（{contracts} 份合约）{stock} · 共 {rows} 行。',
      'ligne': '行',
      'lignes': '行',
      " + {n} {lignesStk} d'actions (couverture)": ' + {n} {lignesStk}股票（对冲）',
      'Vérification des échéances…': '正在核对到期日…',
      '↓ Télécharger le CSV (What-If)': '↓ 下载 CSV（What-If）',
      'Fichier téléchargé — suis les étapes ci-dessous.': '文件已下载 — 请按以下步骤操作。',
      "Validation des strikes sur la chaîne d'options réelle (Cboe)…": '正在真实期权链（Cboe）上验证行权价…',
      "(l'échéance est déjà cotée par tous les sous-jacents, fixée à la construction)": '（到期日已由所有标的挂牌，在构建时确定）',
      '✓ {v}/{o} sous-jacents validés': '✓ 已验证 {v}/{o} 个标的',
      "sur la chaîne d'options réelle (Cboe) — strikes et échéance réellement listés.": '在真实期权链（Cboe）上 — 行权价与到期日均真实挂牌。',
      '{v}/{o} sous-jacents validés': '已验证 {v}/{o} 个标的',
      "sur la chaîne d'options réelle. Les {n} {restants} (composants sans options US ou chaîne indisponible) utilisent le strike standard le plus proche — si TWS en rejette un, choisis le strike listé voisin.":
        '在真实期权链上。其余 {n} {restants}（无美股期权或期权链不可用的成分股）使用最接近的标准行权价 — 如果 TWS 拒绝其中某个，请选择相邻的已挂牌行权价。',
      'restant': '个',
      'restants': '个',
      'Échéance alignée sur {exp}.': '到期日已对齐至 {exp}。',
      "La date sélectionnée ({sel}) n'est pas cotée par toutes les actions —": '所选日期（{sel}）并非所有股票均挂牌 —',
      'toutes les jambes': '所有腿',
      "utilisent donc une seule échéance cotée par l'ensemble des sous-jacents, et cette date s'applique partout dans le site (suivi, monitor).":
        '因此使用由全部标的共同挂牌的单一到期日，且该日期适用于网站各处（跟踪、监控）。',
      "Comment l'importer dans TWS (pas à pas)": '如何导入 TWS（分步说明）',
      'Ouvre TWS': '打开 TWS',
      'Lance Trader Workstation (le logiciel de bureau IBKR) et connecte-toi à ton compte.': '启动 Trader Workstation（IBKR 桌面软件）并登录你的账户。',
      'Ouvre le Risk Navigator': '打开 Risk Navigator',
      'Menu du haut → Analytical Tools (ou New Window) → Risk Navigator.': '顶部菜单 → Analytical Tools（或 New Window）→ Risk Navigator。',
      'Importe le fichier': '导入文件',
      'Dans le Risk Navigator : menu Portfolio → Import → sélectionne le fichier .csv que tu viens de télécharger → Open.':
        '在 Risk Navigator 中：Portfolio 菜单 → Import → 选择你刚下载的 .csv 文件 → Open。',
      'Les positions arrivent en What-If': '持仓以 What-If 形式载入',
      "IBKR ouvre un portefeuille hypothétique (« What-If ») avec toutes tes jambes. RIEN n'est exécuté : c'est une simulation.":
        'IBKR 会打开一个包含你所有腿的假设性（“What-If”）投资组合。不会执行任何操作：这是一个模拟。',
      'Enregistre le What-If': '保存 What-If',
      'Menu Portfolio → Save (ou Save As) pour le conserver et suivre ses grecs / son P&L virtuel dans le temps.':
        'Portfolio 菜单 → Save（或 Save As）以保存它，并随时间跟踪其希腊值 / 虚拟盈亏。',
      '(Optionnel) Passer réellement les ordres': '（可选）真正下单',
      "Coche la case « Trade » sur les positions à ouvrir, puis clique sur le bouton « Trade » en haut du What-If : IBKR crée les ordres dans TWS. Ils restent en attente — tant que tu ne cliques pas sur Transmit, rien n'est envoyé au marché.":
        '在要开立的持仓上勾选“Trade”复选框，然后点击 What-If 顶部的“Trade”按钮：IBKR 会在 TWS 中创建订单。它们保持挂起状态 — 在你点击 Transmit 之前，不会向市场发送任何内容。',
      "Aucun risque d'exécution.": '没有执行风险。',
      "L'import crée seulement une simulation (What-If) : tu peux suivre la position virtuellement, voir ses grecs et son P&L, puis décider — ou non — de passer les ordres. Rien n'est envoyé au marché sans ton clic sur":
        '导入只会创建一个模拟（What-If）：你可以虚拟跟踪持仓、查看其希腊值和盈亏，然后再决定是否下单。在你点击以下按钮之前，不会向市场发送任何内容：',
      "**Échéance {exp}** et **strikes ATM** — exactement ceux de la stratégie construite (le site modélise chaque jambe au plus proche du prix, sur une échéance mensuelle standard). Les contrats sont validés sur la vraie chaîne d'options quand elle est disponible. Le fichier est optimisé pour les sous-jacents cotés aux États-Unis (SPX→SPY, NDX→QQQ, DJI→DIA et leurs composants){foreign}.":
        '**到期日 {exp}** 和 **平值行权价** — 与所构建策略完全一致（本网站以最接近价格的方式对每条腿建模，采用标准月度到期）。在真实期权链可用时会据此验证合约。该文件针对在美国挂牌的标的进行了优化（SPX→SPY、NDX→QQQ、DJI→DIA 及其成分股）{foreign}。',
      " ; pour les composants européens (CAC/DAX), la devise est renseignée mais tu devras éventuellement préciser la place de cotation dans TWS":
        '；对于欧洲成分股（CAC/DAX），已填写货币，但你可能需要在 TWS 中指定挂牌交易所',

      // ── 订阅历史（偏好设置）──
      'Historique d’abonnement': '订阅历史',
      'Vos paiements et périodes de facturation, synchronisés avec Stripe.': '你的付款和账单周期，与 Stripe 同步。',
      'Chargement de l’historique…': '正在加载历史…',
      'Historique indisponible pour le moment.': '历史暂时不可用。',
      'Membre Pro depuis le {date}': '自 {date} 起成为 Pro 会员',
      'Aucune facture pour l’instant — elle apparaîtra après le premier prélèvement.': '暂无账单——将在首次扣款后显示。',
      'Accès Pro accordé manuellement — aucun historique de facturation Stripe.': '手动授予的 Pro 访问权限——无 Stripe 账单历史。',
      'Période du {start} au {end}': '周期 {start} 至 {end}',
      'Payée': '已支付',
      'En attente': '待处理',
      'Annulée': '已作废',
      'Échouée': '失败',
      'Facture': '发票',
      // 账户状态（历史）
      'Actif': '有效',
      'Essai': '试用',
      'Résilié': '已取消',
      'Remboursé': '已退款',
      'Inactif': '未激活',
      // ── 14 天退款保证 ──
      'Résilier & être remboursé (14 j)': '取消并获得退款（14 天）',
      'Traitement…': '处理中…',
      'Garantie « satisfait ou remboursé » : dans les {days} jours suivant le premier paiement, résilie et obtiens un remboursement intégral en un clic.':
        '“满意或退款”保证：在首次付款后的 {days} 天内，一键取消并获得全额退款。',
      'Résilier et être remboursé ?': '取消并退款？',
      'Ton accès Pro sera coupé immédiatement et ton dernier paiement intégralement remboursé (garantie 14 jours). Cette action est définitive.':
        '你的 Pro 访问将立即中止，最后一次付款将全额退款（14 天保证）。此操作不可撤销。',
      'Confirmer le remboursement': '确认退款',
      'Abonnement résilié et remboursé. Le remboursement apparaîtra sous quelques jours.': '订阅已取消并退款。退款将在几天内显示。',
      'Délai de 14 jours dépassé — le remboursement automatique n’est plus disponible.': '已超过 14 天期限 — 自动退款不再可用。',
      'Aucun abonnement Stripe à rembourser.': '没有可退款的 Stripe 订阅。',
      'Remboursement impossible pour le moment : {err}': '目前无法退款：{err}',

      // ── 欢迎提示卡（FirstVisitGuide）──
      'Bienvenue ✦': '欢迎 ✦',
      'J’ai compris': '知道了',
      // 机会提示卡
      "L'auto-chercheur d'opportunités": '机会自动搜索器',
      "Il fait le travail d'analyse à ta place : au lieu de tester des paniers à la main, il en explore des milliers et te classe les meilleures dispersions d'un indice.":
        '它替你完成分析：无需手动测试篮子，它会探索成千上万个组合，并为你排出某个指数最佳的离散度。',
      'Choisis un indice et un horizon': '选择指数和期限',
      'SPX, NDX, DJI, CAC ou DAX, puis l’échéance de référence (15 à 60 jours).': 'SPX、NDX、DJI、CAC 或 DAX，然后选择参考到期日（15 至 60 天）。',
      'Lance la recherche': '开始搜索',
      'Le site évalue des milliers de paniers (5 à 20 actions) en combinant le score de dispersion de chaque action et la prime de corrélation du panier.':
        '网站会评估成千上万个篮子（5 至 20 只股票），结合每只股票的离散度评分与篮子的相关性溢价。',
      'Compare les meilleures opportunités': '比较最佳机会',
      'Chaque résultat affiche sa prime, sa diversification et un backtest historique de la prime de corrélation captée.':
        '每个结果都会显示其溢价、分散度以及所捕获相关性溢价的历史回测。',
      'Ouvre-la pour l’affiner': '打开它进行细化',
      'Un clic l’envoie en Construction — sizing vega-neutre et 3 scénarios de stress déjà calculés, comme au Risk Lab.':
        '一键将其发送到“构建” — 已计算好 vega 中性头寸规模和 3 个压力情景，就像风险实验室一样。',
      // 跟踪提示卡
      'Le Suivi de tes positions': '跟踪你的持仓',
      'Toutes les stratégies que tu as engagées, réunies au même endroit pour suivre leur évolution dans le temps.':
        '你已建立的所有策略，集中在一处，便于跟踪它们随时间的演变。',
      'Tes positions committées arrivent ici': '你已建立的持仓会出现在这里',
      'Une stratégie engagée (Construction → Risk Lab → Checklist) apparaît automatiquement dans le Suivi, toutes listes confondues.':
        '已建立的策略（构建 → 风险实验室 → 检查清单）会自动出现在跟踪中，涵盖所有列表。',
      'Trois façons de les ranger': '三种整理方式',
      'Bascule entre Grille, Groupes et Chronologique selon ce que tu veux voir.': '根据你想查看的内容，在网格、分组和时间线之间切换。',
      'Crée tes propres groupes': '创建你自己的分组',
      'Range chaque position dans un groupe personnalisé — synchronisé sur tous tes appareils.': '将每个持仓归入自定义分组 — 在你所有设备间同步。',
      'Suis grecs et P&L dans le temps': '随时间跟踪希腊值和盈亏',
      'Ouvre une position pour voir ses grecs au DTE restant, ses snapshots et son P&L théorique.':
        '打开一个持仓，查看其在剩余 DTE 时的希腊值、快照和理论盈亏。',
      // 市场 Pro 提示卡
      'Le Marché Pro': '市场 Pro',
      'Le contexte de marché de la dispersion : quand la corrélation est chère, quels catalyseurs arrivent, et des alertes pour ne pas rater le bon moment.':
        '离散度交易的市场背景：相关性何时偏贵、有哪些催化剂即将到来，以及提醒你不错过合适时机。',
      'Le baromètre de corrélation': '相关性晴雨表',
      'Vois si la corrélation implicite d’un indice est chère ou bon marché — le meilleur moment pour vendre de la dispersion.':
        '查看某个指数的隐含相关性是偏贵还是便宜 — 卖出离散度的最佳时机。',
      'Choisis ton indice': '选择你的指数',
      'SPX, NDX, DJI, CAC ou DAX : tout le contexte s’adapte à l’indice sélectionné.': 'SPX、NDX、DJI、CAC 或 DAX：整个背景会随所选指数调整。',
      'Le calendrier des résultats': '财报日历',
      'Repère les publications de résultats à venir sur les composants — des catalyseurs de volatilité à surveiller.':
        '发现成分股即将公布的财报 — 值得关注的波动率催化剂。',
      'Pose des alertes': '设置提醒',
      'Sois prévenu quand la corrélation franchit un seuil, pour agir au bon moment.': '当相关性突破阈值时收到通知，以便在合适的时机行动。',
      // 交易日志提示卡
      'Ton Journal de trades': '你的交易日志',
      'Enregistre tes dispersions et bâtis ton track record dans le temps : réalisé vs attendu, taux de réussite, P&L cumulé.':
        '记录你的离散度交易，随时间建立业绩记录：实际 vs 预期、胜率、累计盈亏。',
      'Enregistre un trade': '记录一笔交易',
      '« + Nouveau trade » : indice, composants, prime d’entrée et horizon — ou pré-rempli depuis une opportunité ou une liste.':
        '“+ 新交易”：指数、成分股、入场溢价和期限 — 或从机会或列表中预填。',
      'Suis réalisé vs attendu': '跟踪实际 vs 预期',
      'À la clôture, compare la performance réelle à ce que tu visais, avec le P&L et l’issue du trade.':
        '平仓时，将实际表现与你的目标进行比较，包含盈亏和结果。',
      'Bâtis ta performance': '建立你的业绩',
      'Le journal cumule ton taux de réussite et ton P&L au fil des trades — ton vrai track record.':
        '日志逐笔累计你的胜率和盈亏 — 你真正的业绩记录。',
      'Synchronisé et privé': '同步且私密',
      'Tes trades sont stockés dans ton compte (cloud, privé) et te suivent sur tous tes appareils.':
        '你的交易存储在你的账户中（云端、私密），在你所有设备间同步。',
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
