// POST /api/risk/portfolio
// Body: { tickers: string[], index: string, duration?: number }
// Greeks ATM straddle (IV réelles Cboe via /api/iv, cache CDN 15 min)
// + scénarios + beta depuis les clôtures Cboe (repli Yahoo)
export const config = { runtime: 'edge' };

import { fetchClosesSmart, cboeIvBundle } from '../_lib/cboe.js';
import { proxyEtf, proxyScale } from '../_lib/proxy-scale.js';

const R = 0.043;
// Fenêtre de HV réalisée (jours de bourse) — MÊME valeur que api/stocks/auto-score.js
// pour que la HV de la liste (risk/portfolio) et celle du ScoreModal (auto-score)
// coïncident. 45 j ≈ convention broker (un earnings isolé ne domine pas).
const HV_WINDOW = 45;

// Exécute des tâches asynchrones avec un plafond de concurrence, en préservant
// l'ordre des résultats. Sert à ne pas marteler le CDN Cboe (barres + IV) avec
// 30+ requêtes simultanées, ce qui déclenche son throttling (l'IV retombe alors
// silencieusement sur l'estimation HV).
export async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  const n = Math.max(1, Math.min(limit, items.length));
  const workers = Array.from({ length: n }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

export function normPDF(x) { return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI); }
export function normCDF(x) {
  const s = x < 0 ? -1 : 1, a = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * a);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a);
  return 0.5 * (1 + s * y);
}

export function bsAtm(S, sigma, T) {
  if (T <= 0 || sigma <= 0 || S <= 0) return null;
  const sqrtT = Math.sqrt(T);
  const d1 = (R * sqrtT / sigma) + sigma * sqrtT / 2;
  const nd1 = normPDF(d1);
  return {
    premium: 2 * S * (normCDF(d1) - 0.5) + S * sigma * sqrtT * nd1 * 0.5,
    gamma:   2 * nd1 / (S * sigma * sqrtT),
    vega:    2 * S * nd1 * sqrtT,
    theta: -(S * sigma * nd1) / (2 * sqrtT * 365),
  };
}

async function fetchBarsData(sym) {
  try {
    const valid = await fetchClosesSmart(sym, 70);   // ~3 mois de clôtures
    if (!valid || valid.length < 6) return null;

    const lastClose = valid[valid.length - 1];
    const slice = valid.slice(-(HV_WINDOW + 1));
    const rets  = [];
    for (let i = 1; i < slice.length; i++) {
      if (slice[i] > 0 && slice[i - 1] > 0) rets.push(Math.log(slice[i] / slice[i - 1]));
    }
    if (rets.length < 5) return { lastClose, hv: null, rets: [] };

    const m  = rets.reduce((a, b) => a + b, 0) / rets.length;
    const vv = rets.reduce((a, b) => a + (b - m) ** 2, 0) / (rets.length - 1);
    const hv = Number((Math.sqrt(vv * 252) * 100).toFixed(1));

    return { lastClose, hv, rets };
  } catch { return null; }
}

function computeBeta(stockRets, idxRets) {
  const n = Math.min(stockRets.length, idxRets.length);
  if (n < 5) return null;
  const sx = stockRets.slice(-n), sy = idxRets.slice(-n);
  const mx = sx.reduce((a, b) => a + b, 0) / n;
  const my = sy.reduce((a, b) => a + b, 0) / n;
  let cov = 0, vy = 0;
  for (let i = 0; i < n; i++) { cov += (sx[i] - mx) * (sy[i] - my); vy += (sy[i] - my) ** 2; }
  return vy > 0 ? Number((cov / vy).toFixed(2)) : null;
}

async function fetchIVFromMD(sym, dte, token) {
  if (!token) return null;
  try {
    const r = await fetch(
      `https://api.marketdata.app/v1/options/chain/${sym}/?dte=${dte}&side=call&strikeLimit=10`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!r.ok) return null;
    const d = await r.json();
    if (d.s !== 'ok' || !Array.isArray(d.iv) || !d.iv.length) return null;
    const up = (d.underlyingPrice || [])[0] || 0;
    let best = 0, bestDiff = Infinity;
    (d.strike || []).forEach((s, i) => { const diff = Math.abs(s - up); if (diff < bestDiff) { bestDiff = diff; best = i; } });
    const ivVal = d.iv[best];
    return ivVal != null && isFinite(ivVal) ? Number((ivVal * 100).toFixed(1)) : null;
  } catch { return null; }
}

export default async (req) => {
  let body = {};
  try { body = await req.json(); } catch {}

  // Déduplication : un même ticker deux fois ne doit pas doubler les fetches Cboe.
  const tickers  = [...new Set((body.tickers || []).map(s => String(s).toUpperCase().trim()).filter(Boolean))].slice(0, 15);
  const indexSym = (body.index || 'SPX').toUpperCase();
  const duration = Math.max(7, Math.min(Number(body.duration) || 30, 120));
  if (tickers.length === 0) return Response.json({ error: 'no_tickers' }, { status: 400 });

  // Échelles ETF proxy → niveau d'indice : source UNIQUE partagée avec le
  // snapshot et le miroir navigateur (window.DXProxy) — cf. _lib/proxy-scale.js.
  const idxEtf   = proxyEtf(indexSym);
  const idxScale = proxyScale(indexSym);
  const mdTok  = process.env.MARKETDATA_API_TOKEN;
  const T = duration / 365;

  // IV via cboeIvBundle EN MÉMOIRE (cache Supabase partagé d'abord) : plus de
  // saut HTTP interne vers /api/iv (fragile selon la région). Barres + IV en un
  // lot, concurrence plafonnée pour ne pas marteler le Cboe. Ordre préservé.
  const tasks = [
    () => fetchBarsData(idxEtf),
    () => cboeIvBundle(indexSym, duration).catch(() => null),
    ...tickers.flatMap(t => [() => fetchBarsData(t), () => cboeIvBundle(t, duration).catch(() => null)]),
  ];
  const [idxData, idxIVr, ...tickerResults] = await mapLimit(tasks, 6, fn => fn());

  const idxRets  = idxData?.rets || null;
  const idxClose = idxData?.lastClose || null;
  const idxHV    = idxData?.hv || null;

  const perTicker = tickers.map((t, i) => {
    const bars   = tickerResults[i * 2];
    const ivCboe = tickerResults[i * 2 + 1];
    if (!bars) return { ticker: t, price: null, hv: null, iv: null, beta: null, ivSrc: null };
    const price = ivCboe?.spot ?? bars.lastClose;
    const hv    = bars.hv;
    const iv    = ivCboe?.iv ?? (hv ? Number((hv * 1.15).toFixed(1)) : null);
    const beta  = bars.rets && idxRets ? computeBeta(bars.rets, idxRets) : null;
    return { ticker: t, price, hv, iv, beta, ivSrc: ivCboe?.iv != null ? 'cboe_delayed' : (hv ? 'hv_estimate' : null) };
  }).filter(r => r.price && r.iv);

  // Repli MarketData pour les tickers sans IV Cboe (si token configuré)
  if (mdTok) {
    const missing = perTicker.filter(r => r.ivSrc === 'hv_estimate');
    const mdIVs = await Promise.all(missing.map(r => fetchIVFromMD(r.ticker, duration, mdTok)));
    missing.forEach((r, i) => { if (mdIVs[i] != null) { r.iv = mdIVs[i]; r.ivSrc = 'marketdata'; } });
  }

  const idxIVfn = idxIVr?.iv
    ?? await fetchIVFromMD(idxEtf, duration, mdTok)
    ?? (idxHV ? Number((idxHV * 1.1).toFixed(1)) : null);

  if (perTicker.length === 0) return Response.json({ error: 'no_price_data' }, { status: 502 });

  const nW = perTicker.length;
  const CONTRACT = 100;
  let portGamma = 0, portVega = 0, portTheta = 0, portPremium = 0;

  const perTickerResult = perTicker.map(r => {
    const g = bsAtm(r.price, r.iv / 100, T);
    if (!g) return { ...r, greeks: null };
    const w = 1 / nW;
    portGamma   += g.gamma   * CONTRACT * w;
    portVega    += g.vega    * CONTRACT * w;
    portTheta   += g.theta   * CONTRACT * w;
    portPremium += g.premium * CONTRACT * w;
    return { ...r, greeks: { gamma: Number(g.gamma.toFixed(5)), vega: Number(g.vega.toFixed(3)), theta: Number(g.theta.toFixed(3)), premium: Number(g.premium.toFixed(2)) } };
  });

  // ETF-level greeks for backward-compatible net portfolio metrics
  const idxG     = idxIVfn && idxClose ? bsAtm(idxClose, idxIVfn / 100, T) : null;
  const idxVega  = idxG ? -(idxG.vega   * CONTRACT) : 0;
  const idxTheta = idxG ? -(idxG.theta  * CONTRACT) : 0;
  const idxPrem  = idxG ?  (idxG.premium * CONTRACT) : 0;
  // Index-level greeks (ETF price × multiplier) for vega-neutral sizing in Strategy Builder
  const idxPriceScaled = (idxClose || 0) * idxScale;
  const idxGscaled = idxIVfn && idxPriceScaled ? bsAtm(idxPriceScaled, idxIVfn / 100, T) : null;

  const netVega    = Number((portVega   + idxVega).toFixed(2));
  const netTheta   = Number((portTheta  + idxTheta).toFixed(2));
  const netPremium = Number((portPremium - idxPrem).toFixed(2));
  const avgIV      = Number((perTicker.reduce((s, r) => s + (r.iv || 0), 0) / perTicker.length).toFixed(1));

  // baseScale ancré sur le theta journalier × durée pour des P&L réalistes
  const thetaRef = Math.max(40, Math.abs(netTheta) * duration);
  const baseScale = Math.max(100, Math.min(thetaRef * 3, 2500));

  // netVegaPct : $ par 1 % de mouvement IV (vega BS est en $/Δσ ; Δ1% = Δσ 0.01)
  const netVegaPct = netVega * 0.01;

  const fmt = (n) => {
    const abs = Math.abs(Math.round(n));
    const s   = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return (n >= 0 ? '+' : '−') + s;
  };

  const scenarios = [
    { name: 'Dispersion forte',  pnl: fmt(baseScale * 2.1),          up: true,  risk: 'faible'   },
    { name: 'Sell-off corrélé',  pnl: fmt(-baseScale * 2.6),         up: false, risk: 'critique' },
    { name: 'Marché range',      pnl: fmt(Math.abs(netTheta) * duration * 0.55), up: true, risk: 'faible' },
    { name: 'Vol crush (−20%)',  pnl: fmt(netVegaPct * -20),         up: netVegaPct * -20 > 0, risk: 'modéré' },
    { name: 'Gap directionnel',  pnl: fmt(-baseScale * 0.85),        up: false, risk: 'élevé'   },
    { name: 'Theta decay (7j)',  pnl: fmt(Math.abs(netTheta) * 7),   up: true,  risk: 'faible'  },
  ];

  return Response.json({
    greeks: [
      { label: 'Δ net',     value: '≈ 0',                                    hint: 'ATM straddles delta-neutre', accent: 'var(--pos)' },
      { label: 'Γ net',     value: (portGamma >= 0 ? '+' : '') + portGamma.toFixed(4), hint: portGamma > 0 ? 'Long gamma' : 'Short gamma', accent: 'var(--accent)' },
      { label: 'Vega net',  value: fmt(Math.round(netVegaPct)) + ' $/1%',   hint: netVega > 0 ? 'Long vega' : 'Court vega ($/1% IV)', accent: 'var(--pos)' },
      { label: 'Θ /jour',   value: fmt(netTheta) + ' $',                     hint: netTheta > 0 ? 'Gain quotidien' : 'Coût quotidien', accent: 'var(--warn)' },
      { label: 'IV moy.',   value: avgIV + '%',                               hint: `Composants (${idxIVfn ? idxIVfn.toFixed(1) + '% ' + indexSym : 'index N/D'})`, accent: 'var(--info)' },
      { label: 'Prime net', value: fmt(netPremium) + ' $',                   hint: netPremium < 0 ? 'Débit net' : 'Crédit net', accent: 'var(--accent)' },
    ],
    scenarios,
    // pnlByName : P&L per-ticker pour choc IV +15% sur CE straddle (1 contrat plein)
    pnlByName:   perTickerResult.map(r => ({ t: r.ticker, pnl: r.greeks ? Math.round(r.greeks.vega * 0.15 * CONTRACT) : 0 })),
    pnlBySector: [{ s: 'Composants', pnl: Math.round(portVega * 0.15) }, { s: indexSym, pnl: Math.round(idxVega * 0.15) }],
    portfolio:   { n_tickers: perTicker.length, avg_iv: avgIV, index_iv: idxIVfn ?? null, net_vega: netVegaPct, net_theta: netTheta, net_premium: netPremium, duration },
    per_ticker:  perTickerResult.map(r => ({ ticker: r.ticker, price: r.price, iv: r.iv, hv: r.hv, beta: r.beta, iv_src: r.ivSrc, greeks: r.greeks })),
    // Index-level greeks for Strategy Builder vega-neutral sizing (uses scaled index price, not ETF price)
    index_greeks: idxGscaled ? {
      vega_per_lot:    Number((idxGscaled.vega    * CONTRACT).toFixed(1)),  // $/σ per 1 long contract
      theta_per_lot:   Number((-idxGscaled.theta  * CONTRACT).toFixed(1)), // $/day gain per 1 short contract
      premium_per_lot: Number((idxGscaled.premium * CONTRACT).toFixed(1)), // $ premium per 1 contract
      iv:              idxIVfn,
      scale:           idxScale,
    } : null,
    source: perTicker.some(r => r.ivSrc === 'cboe_delayed') ? 'cboe_delayed'
          : perTicker.some(r => r.ivSrc === 'marketdata') ? 'marketdata'
          : 'hv_estimate',
  });
};
