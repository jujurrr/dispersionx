/* ═══════════════════════════════════════════════════════════════
   DispersionX — Mock data (used when backend is not reachable)
   Mirrors real API payloads from dispersion_v3.
   ═══════════════════════════════════════════════════════════════ */
(function () {

  const INDICES = [
    {
      symbol: 'SPX', name: 'S&P 500', country_flag: '🇺🇸', currency: 'USD',
      n_components: 503, color: '#1f9d63', etf_proxy: 'SPY',
      options_liquid: true, description: 'Indice phare américain, très liquide, cash-settled. Taille notionnelle élevée.',
      difficulty: 'intermédiaire',
    },
    {
      symbol: 'NDX', name: 'Nasdaq-100', country_flag: '🇺🇸', currency: 'USD',
      n_components: 100, color: '#2bb877', etf_proxy: 'QQQ',
      options_liquid: true, description: 'Exposition forte au secteur tech/croissance. Volatilité implicite généralement plus élevée.',
      difficulty: 'avancé',
    },
    {
      symbol: 'DJI', name: 'Dow Jones', country_flag: '🇺🇸', currency: 'USD',
      n_components: 30, color: '#cba258', etf_proxy: 'DIA',
      options_liquid: false, description: '30 grandes capitalisations américaines. Liquidité options plus faible que SPX/NDX.',
      difficulty: 'débutant',
    },
    {
      symbol: 'CAC', name: 'CAC 40', country_flag: '🇫🇷', currency: 'EUR',
      n_components: 40, color: '#ab68d9', etf_proxy: 'CAC',
      options_liquid: false, description: 'Indice français. Options disponibles sur Euronext. Liquidité variable selon le sous-jacent.',
      difficulty: 'avancé',
    },
    {
      symbol: 'DAX', name: 'DAX 40', country_flag: '🇩🇪', currency: 'EUR',
      n_components: 40, color: '#f0a830', etf_proxy: 'EXS1',
      options_liquid: false, description: 'Indice allemand. Options EUREX disponibles. Liquidité correcte sur les grands composants.',
      difficulty: 'avancé',
    },
  ];

  const SNAPSHOTS = {
    SPX: { price: 6432.18, change: +0.42, hv30: 15.6, hv1y: 18.1, iv_est: 18.2, perf5d: +1.3, perf30d: +3.8, ytd: +11.4 },
    NDX: { price: 22148.42, change: -0.18, hv30: 19.2, hv1y: 22.4, iv_est: 21.4, perf5d: -0.6, perf30d: +2.1, ytd: +14.2 },
    DJI: { price: 42891.10, change: +0.31, hv30: 12.1, hv1y: 14.8, iv_est: 14.4, perf5d: +0.9, perf30d: +2.9, ytd: +7.8 },
    CAC: { price: 7842.30, change: -0.22, hv30: 14.8, hv1y: 17.2, iv_est: 16.4, perf5d: -0.4, perf30d: +1.8, ytd: +4.2 },
    DAX: { price: 18620.44, change: +0.55, hv30: 13.9, hv1y: 16.6, iv_est: 15.8, perf5d: +1.1, perf30d: +3.2, ytd: +9.1 },
  };

  const COMPONENTS = {
    SPX: [
      { ticker: 'NVDA', name: 'Nvidia', sector: 'Technology', weight: 7.3, score: 84, iv: 46.2, hv: 41.8, rho: 0.58, earnings: false, liq: 'Élevée', beta: 1.62 },
      { ticker: 'AAPL', name: 'Apple', sector: 'Technology', weight: 7.0, score: 71, iv: 28.4, hv: 25.1, rho: 0.62, earnings: true, liq: 'Élevée', beta: 1.18 },
      { ticker: 'MSFT', name: 'Microsoft', sector: 'Technology', weight: 6.5, score: 76, iv: 24.8, hv: 22.0, rho: 0.64, earnings: false, liq: 'Élevée', beta: 1.22 },
      { ticker: 'AMZN', name: 'Amazon', sector: 'Consumer Disc.', weight: 3.8, score: 68, iv: 31.0, hv: 28.4, rho: 0.55, earnings: false, liq: 'Élevée', beta: 1.35 },
      { ticker: 'META', name: 'Meta Platforms', sector: 'Communications', weight: 2.9, score: 82, iv: 38.5, hv: 33.2, rho: 0.49, earnings: false, liq: 'Élevée', beta: 1.44 },
      { ticker: 'AVGO', name: 'Broadcom', sector: 'Technology', weight: 2.4, score: 79, iv: 42.1, hv: 37.0, rho: 0.53, earnings: false, liq: 'Bonne', beta: 1.55 },
      { ticker: 'TSLA', name: 'Tesla', sector: 'Consumer Disc.', weight: 1.9, score: 88, iv: 54.3, hv: 47.9, rho: 0.41, earnings: true, liq: 'Élevée', beta: 2.01 },
      { ticker: 'JPM',  name: 'JPMorgan Chase', sector: 'Financials', weight: 1.55, score: 64, iv: 22.0, hv: 20.6, rho: 0.66, earnings: false, liq: 'Bonne', beta: 1.08 },
      { ticker: 'V',    name: 'Visa', sector: 'Financials', weight: 1.4, score: 58, iv: 18.4, hv: 17.2, rho: 0.69, earnings: false, liq: 'Bonne', beta: 0.94 },
      { ticker: 'UNH',  name: 'UnitedHealth', sector: 'Healthcare', weight: 1.3, score: 55, iv: 20.8, hv: 22.4, rho: 0.58, earnings: false, liq: 'Bonne', beta: 0.82 },
      { ticker: 'XOM',  name: 'Exxon Mobil', sector: 'Energy', weight: 1.2, score: 61, iv: 24.2, hv: 22.8, rho: 0.52, earnings: false, liq: 'Bonne', beta: 1.12 },
      { ticker: 'LLY',  name: 'Eli Lilly', sector: 'Healthcare', weight: 1.15, score: 73, iv: 32.6, hv: 28.4, rho: 0.44, earnings: false, liq: 'Bonne', beta: 0.76 },
    ],
    NDX: [
      { ticker: 'NVDA', name: 'Nvidia', sector: 'Technology', weight: 12.1, score: 84, iv: 46.2, hv: 41.8, rho: 0.61, earnings: false, liq: 'Élevée', beta: 1.62 },
      { ticker: 'AAPL', name: 'Apple', sector: 'Technology', weight: 11.6, score: 71, iv: 28.4, hv: 25.1, rho: 0.64, earnings: true, liq: 'Élevée', beta: 1.18 },
      { ticker: 'MSFT', name: 'Microsoft', sector: 'Technology', weight: 10.8, score: 76, iv: 24.8, hv: 22.0, rho: 0.66, earnings: false, liq: 'Élevée', beta: 1.22 },
      { ticker: 'AMZN', name: 'Amazon', sector: 'Consumer Disc.', weight: 6.3, score: 68, iv: 31.0, hv: 28.4, rho: 0.58, earnings: false, liq: 'Élevée', beta: 1.35 },
      { ticker: 'META', name: 'Meta Platforms', sector: 'Communications', weight: 4.8, score: 82, iv: 38.5, hv: 33.2, rho: 0.52, earnings: false, liq: 'Élevée', beta: 1.44 },
      { ticker: 'AVGO', name: 'Broadcom', sector: 'Technology', weight: 4.0, score: 79, iv: 42.1, hv: 37.0, rho: 0.56, earnings: false, liq: 'Bonne', beta: 1.55 },
      { ticker: 'TSLA', name: 'Tesla', sector: 'Consumer Disc.', weight: 3.1, score: 88, iv: 54.3, hv: 47.9, rho: 0.43, earnings: true, liq: 'Élevée', beta: 2.01 },
      { ticker: 'COST', name: 'Costco', sector: 'Consumer Staples', weight: 2.6, score: 52, iv: 16.8, hv: 15.4, rho: 0.72, earnings: false, liq: 'Bonne', beta: 0.88 },
    ],
    DJI: [
      { ticker: 'UNH',  name: 'UnitedHealth', sector: 'Healthcare', weight: 9.8, score: 55, iv: 20.8, hv: 22.4, rho: 0.51, earnings: false, liq: 'Bonne', beta: 0.82 },
      { ticker: 'MSFT', name: 'Microsoft', sector: 'Technology', weight: 8.4, score: 76, iv: 24.8, hv: 22.0, rho: 0.64, earnings: false, liq: 'Élevée', beta: 1.22 },
      { ticker: 'GS',   name: 'Goldman Sachs', sector: 'Financials', weight: 7.6, score: 69, iv: 26.4, hv: 24.2, rho: 0.58, earnings: false, liq: 'Bonne', beta: 1.32 },
      { ticker: 'HD',   name: 'Home Depot', sector: 'Consumer Disc.', weight: 7.2, score: 61, iv: 22.4, hv: 20.8, rho: 0.62, earnings: false, liq: 'Bonne', beta: 1.04 },
      { ticker: 'CAT',  name: 'Caterpillar', sector: 'Industrials', weight: 6.8, score: 66, iv: 28.6, hv: 26.4, rho: 0.55, earnings: false, liq: 'Bonne', beta: 1.18 },
    ],
    CAC: [
      { ticker: 'LVMH', name: 'LVMH Moët Hennessy', sector: 'Consumer Disc.', weight: 11.2, score: 72, iv: 24.6, hv: 22.8, rho: 0.54, earnings: false, liq: 'Bonne', beta: 0.88 },
      { ticker: 'TTE',  name: 'TotalEnergies', sector: 'Energy', weight: 9.4, score: 64, iv: 22.8, hv: 21.2, rho: 0.58, earnings: false, liq: 'Bonne', beta: 0.96 },
      { ticker: 'SAN',  name: 'Sanofi', sector: 'Healthcare', weight: 8.1, score: 58, iv: 18.4, hv: 17.6, rho: 0.62, earnings: false, liq: 'Bonne', beta: 0.72 },
      { ticker: 'BNP',  name: 'BNP Paribas', sector: 'Financials', weight: 7.4, score: 66, iv: 24.2, hv: 22.6, rho: 0.61, earnings: false, liq: 'Bonne', beta: 1.14 },
    ],
    DAX: [
      { ticker: 'SAP',  name: 'SAP SE', sector: 'Technology', weight: 12.8, score: 68, iv: 22.4, hv: 20.8, rho: 0.56, earnings: false, liq: 'Bonne', beta: 0.94 },
      { ticker: 'SIE',  name: 'Siemens', sector: 'Industrials', weight: 9.6, score: 62, iv: 20.8, hv: 19.4, rho: 0.61, earnings: false, liq: 'Bonne', beta: 1.08 },
      { ticker: 'ALV',  name: 'Allianz', sector: 'Financials', weight: 8.4, score: 58, iv: 18.2, hv: 17.4, rho: 0.64, earnings: false, liq: 'Bonne', beta: 0.88 },
      { ticker: 'MUV2', name: 'Munich Re', sector: 'Financials', weight: 7.2, score: 55, iv: 16.8, hv: 16.2, rho: 0.67, earnings: false, liq: 'Bonne', beta: 0.82 },
    ],
  };

  const MOCK_LISTS = [
    {
      id: 'list-1', name: 'Tech SPX Core', index_symbol: 'SPX', description: 'Top composants tech du S&P 500',
      n_items: 5, avg_score: 78, created_at: '2026-06-08', updated_at: '2026-06-15',
      items: [
        { ticker: 'NVDA', weight: 7.3, score: 84, score_data: null, added: '2026-06-08' },
        { ticker: 'MSFT', weight: 6.5, score: 76, score_data: null, added: '2026-06-08' },
        { ticker: 'META', weight: 2.9, score: 82, score_data: null, added: '2026-06-10' },
        { ticker: 'AVGO', weight: 2.4, score: 79, score_data: null, added: '2026-06-10' },
        { ticker: 'TSLA', weight: 1.9, score: 88, score_data: null, added: '2026-06-12' },
      ],
    },
    {
      id: 'list-2', name: 'NDX Volatilité', index_symbol: 'NDX', description: 'Composants Nasdaq à fort potentiel dispersion',
      n_items: 4, avg_score: 72, created_at: '2026-06-12', updated_at: '2026-06-18',
      items: [
        { ticker: 'NVDA', weight: 12.1, score: 84, score_data: null, added: '2026-06-12' },
        { ticker: 'TSLA', weight: 3.1, score: 88, score_data: null, added: '2026-06-12' },
        { ticker: 'META', weight: 4.8, score: 82, score_data: null, added: '2026-06-14' },
        { ticker: 'AMZN', weight: 6.3, score: 68, score_data: null, added: '2026-06-18' },
      ],
    },
  ];

  // ── Score déterministe par ticker (identique dans la table ET le ScoreModal) ──
  function scoreFor(ticker) {
    for (const arr of Object.values(COMPONENTS)) {
      const c = arr.find(x => x.ticker === ticker);
      if (c && c.score != null) return c.score;
    }
    let h = 0; const t = String(ticker || '');
    for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0;
    return 48 + (h % 45); // 48..92, stable par ticker
  }
  function compOf(ticker) {
    for (const arr of Object.values(COMPONENTS)) {
      const c = arr.find(x => x.ticker === ticker);
      if (c) return c;
    }
    return null;
  }
  function compWeight(ticker) { return compOf(ticker)?.weight ?? null; }

  // ── Stockage persistant des listes (localStorage) ──
  const LS_LISTS = 'dx-lists';
  function _loadLists() {
    try { const s = localStorage.getItem(LS_LISTS); if (s) return JSON.parse(s); } catch {}
    return JSON.parse(JSON.stringify(MOCK_LISTS));
  }
  let LISTS = _loadLists();
  function _saveLists() { try { localStorage.setItem(LS_LISTS, JSON.stringify(LISTS)); } catch {} }
  function _findList(id) { return LISTS.find(l => l.id === id); }
  function _recompute(l) {
    l.n_items = (l.items || []).length;
    const sc = (l.items || []).map(i => i.score).filter(s => s != null);
    l.avg_score = sc.length ? Math.round(sc.reduce((a, b) => a + b, 0) / sc.length) : 0;
    l.updated_at = new Date().toISOString().slice(0, 10);
  }

  const MOCK_SCORE = (ticker) => {
    const score = scoreFor(ticker);
    const [signal, signal_color] = score >= 75 ? ['FORT', 'green'] : score >= 55 ? ['MODÉRÉ', 'amber'] : ['FAIBLE', 'red'];
    const comp = compOf(ticker);
    const iv = comp?.iv ?? 30, hv = comp?.hv ?? 27, beta = comp?.beta ?? 1.1, weight = comp?.weight ?? 2.0, rho = comp?.rho ?? 0.5;
    return {
      scoring: {
        score, signal, signal_color,
        comp_a_edge: Number(((0.61 - rho) * 40).toFixed(1)),
        comp_b_vol_premium: Number((iv - hv).toFixed(1)),
        comp_c_costs: -4.1,
        rho_implicit_final: 0.61, rho_real_expected: rho,
        cost_source: 'estimated', spread_pct_real: 0.22, cost_spread: 2.8, cost_earnings: 1.3,
        subscores: {
          liquidity: { score: Math.min(99, score + 8), reason: 'Liquidité estimée à partir du profil du composant' },
          vol_attractive: { score, reason: `IV ${iv.toFixed(1)}% vs HV ${hv.toFixed(1)}%` },
          dispersion_contrib: { score: Math.max(20, score - 6), reason: 'β et corrélation favorables à la dispersion' },
          execution: { score: Math.min(99, score + 4), reason: 'Exécution estimée' },
          event_risk: { score: comp?.earnings ? 45 : 80, reason: comp?.earnings ? 'Earnings possibles dans la durée' : "Pas d'earnings dans la durée" },
        },
        composite_score: { score, missing: [] },
        pipeline: {
          rho_per_window: { 20: rho + 0.03, 60: rho, 120: rho - 0.02 },
          weights_normalized: { 20: 0.25, 60: 0.50, 120: 0.25 },
          blend: rho, regime_factor: 1.0, rho_hat_final: rho,
        },
        recommendation: score >= 75 ? 'Score favorable : prime de corrélation positive et profil attractif.' : score >= 55 ? 'Score modéré : composant utilisable, surveiller les coûts et la liquidité.' : 'Score faible : apport à la dispersion limité dans ce contexte.',
      },
      stock: {
        symbol: ticker, weight, iv, hv, beta,
        last_price: null, iv_source: 'estimated_from_hv',
        earnings_in_strategy: !!comp?.earnings, days_to_earnings: comp?.earnings ? 6 : 48, earnings_date: '—',
        iv_rank: { iv_rank: Math.round(score * 0.7), iv_percentile: Math.round(score * 0.66), iv_min: Math.max(5, hv - 12), iv_max: hv + 30, note: 'Estimation à partir du profil de volatilité.' },
        greeks: { delta: 0.02, gamma: 0.0008, vega: 148.2, theta: -44.1, strike: 0, expiry: '—' },
      },
      index: { symbol: 'SPX', name: 'S&P 500', iv: 18.2 },
      metadata: { duration_days: 30 },
    };
  };

  const MOCK_POSITIONS = [
    { id: 'pos-1', name: 'SPX 30j · dispersion', idx: 'SPX', dte: 24, opened: '2026-06-12', primeIn: 5.8, primeNow: 6.4, pnl: 1240, vega: -48, theta: 96, status: 'sain', alert: null },
    { id: 'pos-2', name: 'NDX 28j · dispersion', idx: 'NDX', dte: 19, opened: '2026-06-15', primeIn: 3.6, primeNow: 3.1, pnl: -320, vega: 210, theta: 74, status: 'surveiller', alert: 'Vega déséquilibré' },
    { id: 'pos-3', name: 'SPX 45j · dispersion', idx: 'SPX', dte: 41, opened: '2026-06-08', primeIn: 7.1, primeNow: 8.0, pnl: 2180, vega: -12, theta: 132, status: 'sain', alert: null },
    { id: 'pos-4', name: 'DAX 30j · dispersion', idx: 'DAX', dte: 9, opened: '2026-06-01', primeIn: 4.2, primeNow: 2.4, pnl: -640, vega: 30, theta: 188, status: 'risque', alert: 'Theta critique · 9 DTE' },
  ];

  function fakeQuote(ticker) {
    const seed = ticker.charCodeAt(0) * 7 + ticker.charCodeAt(ticker.length - 1) * 3;
    const price = 50 + (seed % 900);
    const day = ((seed % 20) - 10) / 10;
    const week = ((seed % 30) - 15) / 10;
    return { ticker, price: price.toFixed(2), day: day.toFixed(2), week: week.toFixed(2) };
  }

  window.DXMock = {
    indices: INDICES,
    sources: { yfinance: true, fmp: true, ibkr: false },
    getSnapshot: (s) => SNAPSHOTS[s] || SNAPSHOTS.SPX,
    getComponents: (s) => (COMPONENTS[s] || COMPONENTS.SPX).map(c => ({ ...c })),
    batchQuotes: (symbols) => symbols.map(fakeQuote),
    autoScore: (ticker) => ({ ...MOCK_SCORE(ticker), stock: { ...MOCK_SCORE(ticker).stock, symbol: ticker } }),
    get lists() { return LISTS; },
    scoreFor,
    createList: (name, index_symbol, description) => {
      const l = { id: 'list-' + Date.now(), name, index_symbol, description, n_items: 0, avg_score: 0,
        created_at: new Date().toISOString().slice(0, 10), updated_at: new Date().toISOString().slice(0, 10), items: [] };
      LISTS.push(l); _saveLists(); return l;
    },
    deleteList: (id) => { LISTS = LISTS.filter(l => l.id !== id); _saveLists(); return { success: true }; },
    addListItem: (id, ticker, score_data) => {
      const l = _findList(id); if (!l) return { success: false };
      l.items = l.items || [];
      // Utiliser le score réel de score_data (autoScore) plutôt que scoreFor (hash arbitraire)
      const realScore = score_data?.score ?? score_data?.composite_score?.score ?? scoreFor(ticker);
      const existing = l.items.find(i => i.ticker === ticker);
      if (existing) {
        // Mise à jour du score et score_data si un nouveau scoring est fourni
        if (score_data?.score != null) existing.score = realScore;
        if (score_data != null) existing.score_data = score_data;
        _recompute(l); _saveLists();
      } else {
        l.items.push({ ticker, weight: compWeight(ticker), score: realScore, score_data: score_data || null, added: new Date().toISOString().slice(0, 10) });
        _recompute(l); _saveLists();
      }
      return { success: true };
    },
    removeListItem: (id, ticker) => {
      const l = _findList(id); if (!l) return { success: false };
      l.items = (l.items || []).filter(i => i.ticker !== ticker);
      _recompute(l); _saveLists(); return { success: true };
    },
    importLists: (parsed) => {
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      let n = 0;
      arr.forEach(raw => {
        if (!raw || !raw.name) return;
        const l = { ...raw, id: 'list-' + Date.now() + '-' + (n++), updated_at: new Date().toISOString().slice(0, 10), items: raw.items || [] };
        _recompute(l); LISTS.push(l);
      });
      _saveLists(); return { imported: n, message: n + ' liste(s) importée(s)' };
    },
    getListAnalysis: () => ({
      avg_score: 78.4, avg_edge: 11.2, rho_impl: 0.52, rho_real: 0.45, dispersion: 0.000418, n_items: 5,
      signal: 'FAVORABLE', recommendations: [
        'Prime de corrélation positive (+7.0 pts) — signal favorable à la dispersion.',
        'Surveiller les earnings AAPL (6j) avant de construire la stratégie.',
        'Ratio IV/HV moyen de 1.12 — spread de volatilité positif.',
      ],
    }),
    correlation: {
      // Prime = (rho_impl − rho_real) × 100 = (0.52 − 0.45) × 100 = +7.0 pts.
      // rho_real ≈ moyenne des corrélations par paires de la matrice (≈ 0.45).
      rho_impl: 0.52, rho_real: 0.45, premium: 7.0, z_score: 1.8, basket_coverage: 82.4,
      interpretation: { color: 'green', verdict: 'Favorable', simple: 'Le marché price une synchronisation plus forte que celle observée.', warnings: [] },
      rho_by_window: { w20: 0.47, w60: 0.45, w120: 0.43, w20_eq: 0.49, w60_eq: 0.46, w120_eq: 0.44 },
      matrix: {
        tickers: ['SPX', 'NVDA', 'AAPL', 'MSFT', 'META', 'TSLA'],
        values: [
          [1.00, 0.58, 0.62, 0.64, 0.49, 0.41],
          [0.58, 1.00, 0.46, 0.51, 0.52, 0.39],
          [0.62, 0.46, 1.00, 0.61, 0.43, 0.34],
          [0.64, 0.51, 0.61, 1.00, 0.45, 0.36],
          [0.49, 0.52, 0.43, 0.45, 1.00, 0.38],
          [0.41, 0.39, 0.34, 0.36, 0.38, 1.00],
        ],
      },
      contributions: [
        { ticker: 'NVDA', weight: 7.3, rho_real: 0.58, contrib: 2.4 },
        { ticker: 'META', weight: 2.9, rho_real: 0.49, contrib: 1.8 },
        { ticker: 'TSLA', weight: 1.9, rho_real: 0.41, contrib: 1.2 },
        { ticker: 'MSFT', weight: 6.5, rho_real: 0.64, contrib: 0.8 },
      ],
      sectors: [
        { sector: 'Technology', weight: 24.2, n: 3, contrib: 3.6 },
        { sector: 'Communications', weight: 2.9, n: 1, contrib: 1.8 },
        { sector: 'Consumer Disc.', weight: 5.7, n: 2, contrib: 1.0 },
      ],
    },
    strategy: {
      legs: {
        index: { ticker: 'SPX', action: 'Vendre straddle', strike: 6450, expiry: '2026-07-18', premium: -4820, vega: -620, theta: 182, delta: 4, qty: 1 },
        basket: [
          { ticker: 'NVDA', premium: 1180, vega: 148, theta: -44, qty: 2 },
          { ticker: 'TSLA', premium: 1640, vega: 132, theta: -51, qty: 1 },
          { ticker: 'META', premium: 980, vega: 96, theta: -31, qty: 1 },
          { ticker: 'MSFT', premium: 860, vega: 88, theta: -29, qty: 1 },
          { ticker: 'AVGO', premium: 1200, vega: 108, theta: -38, qty: 1 },
        ],
      },
      greeks: { delta: 12, gamma: -0.8, vega: -180, theta: 96, premium_net: 1240, cost_est: -310 },
      vega_index: -620, vega_basket: 572, vega_net: -48,
    },
    risk: {
      greeks: { delta: 12, gamma: -0.8, vega: -180, theta: 96, premium_net: 1240, cost_est: -310 },
      scenarios: [
        { name: 'Marché stable', pnl: 960, risk: 'faible', description: "Les composants bougent modérément et dans des directions différentes. La stratégie capte le theta." },
        { name: 'Sell-off corrélé', pnl: -3420, risk: 'critique', description: "L'indice baisse fortement, les composants suivent. La jambe indice perd plus que les composants ne gagnent." },
        { name: 'Rally corrélé', pnl: -1180, risk: 'élevé', description: "Les marchés montent ensemble. La corrélation réalisée converge vers l'implicite, réduisant la prime." },
        { name: 'Vol crush composants', pnl: -2050, risk: 'élevé', description: "La volatilité réalisée des composants s'effondre. Les straddles long perdent rapidement de la valeur." },
        { name: 'Hausse IV indice', pnl: -640, risk: 'modéré', description: "L'IV de l'indice monte (stress de marché). Le short straddle indice perd mais les composants amortissent." },
        { name: 'Passage du temps', pnl: 540, risk: 'faible', description: "Le marché évolue peu sur 10 jours. Le theta quotidien (+96$) compense les petits mouvements de prix." },
      ],
      pnl_by_name: [
        { ticker: 'SPX (short)', pnl: -2100, weight: 100 },
        { ticker: 'NVDA', pnl: 720, weight: 7.3 },
        { ticker: 'TSLA', pnl: 540, weight: 1.9 },
        { ticker: 'META', pnl: 410, weight: 2.9 },
        { ticker: 'AAPL', pnl: -180, weight: 7.0 },
        { ticker: 'MSFT', pnl: -290, weight: 6.5 },
      ],
      pnl_by_sector: [
        { sector: 'Indice', pnl: -2100 },
        { sector: 'Technology', pnl: 140 },
        { sector: 'Consumer Disc.', pnl: 420 },
        { sector: 'Communications', pnl: 410 },
      ],
      conclusions: [
        { text: "Sell-off corrélé : perte maximale estimée à −3 420 $.", severity: 'critical' },
        { text: "Le vega net est légèrement long : surveiller une hausse de la vol implicite.", severity: 'warn' },
        { text: "Theta positif (+96 $/jour) — la stratégie gagne avec le temps si le marché est calme.", severity: 'ok' },
      ],
    },
    checklist: {
      sections: [
        {
          name: 'Données', checks: [
            { id: 'c1', text: 'Prix live disponible pour l\'indice et les composants', ok: true },
            { id: 'c2', text: 'IV ATM chargée (source confirmée)', ok: true },
            { id: 'c3', text: 'Historique HV 20/60/120j présent', ok: true },
            { id: 'c4', text: 'Aucun earnings dans la durée de la stratégie', ok: false, warn: true },
          ],
        },
        {
          name: 'Construction', checks: [
            { id: 'c5', text: 'Stratégie construite et sauvegardée', ok: true },
            { id: 'c6', text: 'Vega net < 10% du vega indice', ok: true },
            { id: 'c7', text: 'Prime de corrélation positive', ok: true },
            { id: 'c8', text: 'Coût bid/ask < 15% de la prime', ok: true },
          ],
        },
        {
          name: 'Risque', checks: [
            { id: 'c9', text: 'Risk Lab consulté (scénarios validés)', ok: false },
            { id: 'c10', text: 'Perte max sell-off corrélé acceptable', ok: false },
            { id: 'c11', text: 'Pas de concentration sectorielle > 60%', ok: true },
          ],
        },
      ],
    },
    positions: MOCK_POSITIONS,
  };

  // Also expose as DXData for backward compat with design system kit components
  window.DXData = {
    index: { symbol: 'SPX', name: 'S&P 500', flag: '🇺🇸', currency: 'USD', price: '6,432.18', change: '+0.42%', up: true, iv: 18.2, hv30: 15.6, ivRank: 38, dte: 31 },
    market: [
      { label: 'IV ATM SPX', value: '18.2', unit: '%', delta: '+0.4', accent: 'var(--accent)' },
      { label: 'ρ implicite moy.', value: '0.61', delta: '+0.03', accent: 'var(--info)' },
      { label: 'ρ̂ réalisée', value: '0.48', delta: '−0.02', accent: 'var(--info)' },
      { label: 'Prime ρ', value: '+7.0', unit: 'pts', delta: '+1.2', accent: 'var(--pos)' },
      { label: 'Vol du jour', value: '12.1', unit: '%', delta: '−0.6', accent: 'var(--warn)' },
    ],
    components: COMPONENTS.SPX,
    greeks: [
      { label: 'Delta net', value: '+12', accent: 'var(--accent)' },
      { label: 'Gamma net', value: '−0.8', accent: 'var(--warn)' },
      { label: 'Vega net', value: '−180', accent: 'var(--warn)', hint: 'Vega indice + composants' },
      { label: 'Theta /jour', value: '+96', unit: '$', accent: 'var(--pos)' },
      { label: 'Prime nette', value: '+1,240', unit: '$', accent: 'var(--pos)' },
      { label: 'Coût estimé', value: '−310', unit: '$', accent: 'var(--neg)', hint: 'Bid/ask aller-retour' },
    ],
    scenarios: [
      { name: 'Marché stable', pnl: '+960', risk: 'faible', up: true },
      { name: 'Sell-off corrélé', pnl: '−3,420', risk: 'critique', up: false },
      { name: 'Rally corrélé', pnl: '−1,180', risk: 'élevé', up: false },
      { name: 'Vol crush composants', pnl: '−2,050', risk: 'élevé', up: false },
      { name: 'Hausse IV indice', pnl: '−640', risk: 'modéré', up: false },
      { name: 'Passage du temps', pnl: '+540', risk: 'faible', up: true },
    ],
    opportunities: [
      { idx: 'SPX', dte: 31, prime: '+7.0', score: 82, risk: 'modéré' },
      { idx: 'NDX', dte: 28, prime: '+4.1', score: 67, risk: 'élevé' },
      { idx: 'DJI', dte: 45, prime: '+2.0', score: 41, risk: 'modéré' },
    ],
    corr: {
      matrixTickers: ['SPX', 'NVDA', 'AAPL', 'MSFT', 'META', 'TSLA'],
      matrix: [
        [1.00, 0.58, 0.62, 0.64, 0.49, 0.41],
        [0.58, 1.00, 0.46, 0.51, 0.52, 0.39],
        [0.62, 0.46, 1.00, 0.61, 0.43, 0.34],
        [0.64, 0.51, 0.61, 1.00, 0.45, 0.36],
        [0.49, 0.52, 0.43, 0.45, 1.00, 0.38],
        [0.41, 0.39, 0.34, 0.36, 0.38, 1.00],
      ],
      history: [
        { d: 'J-90', impl: 0.52, real: 0.50 }, { d: 'J-75', impl: 0.54, real: 0.49 },
        { d: 'J-60', impl: 0.57, real: 0.51 }, { d: 'J-45', impl: 0.59, real: 0.50 },
        { d: 'J-30', impl: 0.60, real: 0.49 }, { d: 'J-15', impl: 0.62, real: 0.47 },
        { d: "Auj.", impl: 0.61, real: 0.48 },
      ],
    },
    positions: MOCK_POSITIONS,
    legs: {
      index: { t: 'SPX', action: 'Vendre straddle', strike: 6450, exp: '21 nov.', prime: '−4,820', vega: '−620', theta: '+182', delta: '+4', qty: 1 },
      basket: [
        { t: 'NVDA', prime: '+1,180', vega: '+148', theta: '−44', qty: 2 },
        { t: 'TSLA', prime: '+1,640', vega: '+132', theta: '−51', qty: 1 },
        { t: 'META', prime: '+980', vega: '+96', theta: '−31', qty: 1 },
        { t: 'MSFT', prime: '+860', vega: '+88', theta: '−29', qty: 1 },
        { t: 'AVGO', prime: '+1,200', vega: '+108', theta: '−38', qty: 1 },
      ],
    },
    pnlByName: [
      { t: 'SPX (short)', pnl: -2100, w: 100 },
      { t: 'NVDA', pnl: 720, w: 7.3 },
      { t: 'TSLA', pnl: 540, w: 1.9 },
      { t: 'META', pnl: 410, w: 2.9 },
      { t: 'AAPL', pnl: -180, w: 7.0 },
      { t: 'MSFT', pnl: -290, w: 6.5 },
    ],
    pnlBySector: [
      { s: 'Indice', pnl: -2100 },
      { s: 'Technology', pnl: 140 },
      { s: 'Consumer Disc.', pnl: 420 },
      { s: 'Communications', pnl: 410 },
    ],
    term: [
      { dte: 7, iv: 19.8 }, { dte: 14, iv: 18.9 }, { dte: 30, iv: 18.2 },
      { dte: 45, iv: 17.6 }, { dte: 60, iv: 17.1 }, { dte: 90, iv: 16.4 }, { dte: 120, iv: 16.0 },
    ],
    skew: [
      { k: '−10%', iv: 24.1 }, { k: '−5%', iv: 20.8 }, { k: 'ATM', iv: 18.2 },
      { k: '+5%', iv: 16.9 }, { k: '+10%', iv: 16.2 },
    ],
    expiries: [
      { d: '7j', dte: 7, iv: 19.8, theta: 'élevé', rec: false },
      { d: '14j', dte: 14, iv: 18.9, theta: 'élevé', rec: false },
      { d: '30j', dte: 31, iv: 18.2, theta: 'modéré', rec: true },
      { d: '45j', dte: 45, iv: 17.6, theta: 'modéré', rec: true },
      { d: '60j', dte: 60, iv: 17.1, theta: 'faible', rec: false },
      { d: '90j', dte: 90, iv: 16.4, theta: 'faible', rec: false },
    ],
  };
})();
