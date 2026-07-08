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
