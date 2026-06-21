// Sample data for the DispersionX app UI kit. Realistic figures, not live.
// Mirrors the codebase indices + SP500 components (mid-2025 weights).
window.DXData = {
  index: {
    symbol: 'SPX', name: 'S&P 500', flag: '🇺🇸', currency: 'USD',
    price: '6,432.18', change: '+0.42%', up: true,
    iv: 18.2, hv30: 15.6, ivRank: 38, dte: 31,
  },
  market: [
    { label: 'IV ATM SPX', value: '18.2', unit: '%', delta: '+0.4', accent: 'var(--accent)' },
    { label: 'ρ implicite moy.', value: '0.61', delta: '+0.03', accent: 'var(--info)' },
    { label: 'ρ̂ réalisée', value: '0.48', delta: '−0.02', accent: 'var(--info)' },
    { label: 'Prime ρ', value: '+6.4', unit: 'pts', delta: '+1.2', accent: 'var(--pos)' },
    { label: 'Vol du jour', value: '12.1', unit: '%', delta: '−0.6', accent: 'var(--warn)' },
  ],
  components: [
    { t: 'NVDA', n: 'Nvidia', sec: 'Technology', w: 7.3, score: 84, iv: 46.2, hv: 41.8, rho: 0.58, earnings: false, liq: 'Élevée' },
    { t: 'AAPL', n: 'Apple', sec: 'Technology', w: 7.0, score: 71, iv: 28.4, hv: 25.1, rho: 0.62, earnings: true, liq: 'Élevée' },
    { t: 'MSFT', n: 'Microsoft', sec: 'Technology', w: 6.5, score: 76, iv: 24.8, hv: 22.0, rho: 0.64, earnings: false, liq: 'Élevée' },
    { t: 'AMZN', n: 'Amazon', sec: 'Consumer Disc.', w: 3.8, score: 68, iv: 31.0, hv: 28.4, rho: 0.55, earnings: false, liq: 'Élevée' },
    { t: 'META', n: 'Meta Platforms', sec: 'Communications', w: 2.9, score: 82, iv: 38.5, hv: 33.2, rho: 0.49, earnings: false, liq: 'Élevée' },
    { t: 'AVGO', n: 'Broadcom', sec: 'Technology', w: 2.4, score: 79, iv: 42.1, hv: 37.0, rho: 0.53, earnings: false, liq: 'Bonne' },
    { t: 'TSLA', n: 'Tesla', sec: 'Consumer Disc.', w: 1.9, score: 88, iv: 54.3, hv: 47.9, rho: 0.41, earnings: true, liq: 'Élevée' },
    { t: 'JPM', n: 'JPMorgan Chase', sec: 'Financials', w: 1.55, score: 64, iv: 22.0, hv: 20.6, rho: 0.66, earnings: false, liq: 'Bonne' },
  ],
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
    { idx: 'SPX', dte: 31, prime: '+6.4', score: 82, risk: 'modéré' },
    { idx: 'NDX', dte: 28, prime: '+4.1', score: 67, risk: 'élevé' },
    { idx: 'DJI', dte: 45, prime: '+2.0', score: 41, risk: 'modéré' },
  ],
  expiries: [
    { d: '7j', dte: 7, iv: 19.8, theta: 'élevé', rec: false },
    { d: '14j', dte: 14, iv: 18.9, theta: 'élevé', rec: false },
    { d: '30j', dte: 31, iv: 18.2, theta: 'modéré', rec: true },
    { d: '45j', dte: 45, iv: 17.6, theta: 'modéré', rec: true },
    { d: '60j', dte: 60, iv: 17.1, theta: 'faible', rec: false },
    { d: '90j', dte: 90, iv: 16.4, theta: 'faible', rec: false },
  ],
  // P&L attribution under the selected scenario (sell-off corrélé)
  pnlByName: [
    { t: 'SPX (short)', pnl: -2100, w: 100 },
    { t: 'NVDA', pnl: 720, w: 7.3 },
    { t: 'TSLA', pnl: 540, w: 1.9 },
    { t: 'META', pnl: 410, w: 2.9 },
    { t: 'AAPL', pnl: -180, w: 7.0 },
    { t: 'MSFT', pnl: -290, w: 6.5 },
    { t: 'AMZN', pnl: -120, w: 3.8 },
  ],
  pnlBySector: [
    { s: 'Indice', pnl: -2100 },
    { s: 'Technology', pnl: 140 },
    { s: 'Consumer Disc.', pnl: 420 },
    { s: 'Communications', pnl: 410 },
    { s: 'Financials', pnl: -90 },
  ],
  // Term structure (ATM IV by DTE) and skew (IV by strike offset)
  term: [
    { dte: 7, iv: 19.8 }, { dte: 14, iv: 18.9 }, { dte: 30, iv: 18.2 },
    { dte: 45, iv: 17.6 }, { dte: 60, iv: 17.1 }, { dte: 90, iv: 16.4 }, { dte: 120, iv: 16.0 },
  ],
  skew: [
    { k: '−10%', iv: 24.1 }, { k: '−5%', iv: 20.8 }, { k: 'ATM', iv: 18.2 },
    { k: '+5%', iv: 16.9 }, { k: '+10%', iv: 16.2 },
  ],
  // Trade Brief legs
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
  // ── Correlation Lab ──
  corr: {
    matrixTickers: ['SPX', 'NVDA', 'AAPL', 'MSFT', 'AMZN', 'META', 'TSLA'],
    // pairwise realized correlation (symmetric); diagonal = 1
    matrix: [
      [1.00, 0.58, 0.62, 0.64, 0.55, 0.49, 0.41],
      [0.58, 1.00, 0.46, 0.51, 0.44, 0.52, 0.39],
      [0.62, 0.46, 1.00, 0.61, 0.48, 0.43, 0.34],
      [0.64, 0.51, 0.61, 1.00, 0.50, 0.45, 0.36],
      [0.55, 0.44, 0.48, 0.50, 1.00, 0.47, 0.42],
      [0.49, 0.52, 0.43, 0.45, 0.47, 1.00, 0.38],
      [0.41, 0.39, 0.34, 0.36, 0.42, 0.38, 1.00],
    ],
    // 90-day history of implied vs realized mean correlation
    history: [
      { d: 'J-90', impl: 0.52, real: 0.50 }, { d: 'J-75', impl: 0.54, real: 0.49 },
      { d: 'J-60', impl: 0.57, real: 0.51 }, { d: 'J-45', impl: 0.59, real: 0.50 },
      { d: 'J-30', impl: 0.60, real: 0.49 }, { d: 'J-15', impl: 0.62, real: 0.47 },
      { d: "Auj.", impl: 0.61, real: 0.48 },
    ],
  },
  // ── Strategy Monitor ──
  positions: [
    { name: 'SPX 30j · dispersion', idx: 'SPX', dte: 24, opened: '12 juin', primeIn: '+5.8', primeNow: '+6.4', pnl: 1240, vega: -48, theta: 96, status: 'sain', alert: null },
    { name: 'NDX 28j · dispersion', idx: 'NDX', dte: 19, opened: '15 juin', primeIn: '+3.6', primeNow: '+3.1', pnl: -320, vega: 210, theta: 74, status: 'surveiller', alert: 'Vega déséquilibré' },
    { name: 'SPX 45j · dispersion', idx: 'SPX', dte: 41, opened: '08 juin', primeIn: '+7.1', primeNow: '+8.0', pnl: 2180, vega: -12, theta: 132, status: 'sain', alert: null },
    { name: 'DAX 30j · dispersion', idx: 'DAX', dte: 9, opened: '01 juin', primeIn: '+4.2', primeNow: '+2.4', pnl: -640, vega: 30, theta: 188, status: 'risque', alert: 'Theta critique · 9 DTE' },
  ],
};

