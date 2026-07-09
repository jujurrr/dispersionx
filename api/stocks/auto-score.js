// POST /api/stocks/auto-score
// Body: { index_symbol, stock_symbol, duration_days }
// Score de dispersion : IV réelles Cboe (via /api/iv, cache CDN 15 min),
// clôtures Cboe (repli Yahoo) pour HV/ρ/beta, repli MarketData si token.
export const config = { runtime: 'edge' };

// cboeIvBundle appelé DIRECTEMENT (en mémoire) : il lit d'abord le cache Supabase
// partagé (fiable inter-région) et évite le saut HTTP interne vers /api/iv qui
// échouait dans certaines régions (→ 502 → estimation 128).
import { fetchClosesSmart, cboeIvBundle } from '../_lib/cboe.js';
import { proxyEtf } from '../_lib/proxy-scale.js';

const R = 0.043;
const RHO_IMPL_EST = 0.65;
// Fenêtre de HV réalisée (jours de bourse) pour la prime de vol du score.
// 45 j ≈ convention des brokers : assez long pour qu'un earnings isolé ne fasse
// pas exploser la HV, assez court pour rester réactif. (30 j y était trop
// sensible : ex. ZS 128 % vs ~110 % broker.)
const HV_WINDOW = 45;

function normPDF(x) { return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI); }
function normCDF(x) {
  const s = x < 0 ? -1 : 1, a = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * a);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a);
  return 0.5 * (1 + s * y);
}
function bsAtm(S, sigma, T) {
  if (T <= 0 || sigma <= 0 || S <= 0) return null;
  const sqrtT = Math.sqrt(T);
  const d1 = (R * sqrtT / sigma) + sigma * sqrtT / 2;
  const nd1 = normPDF(d1);
  return {
    premium: 2 * S * (normCDF(d1) - 0.5) + S * sigma * sqrtT * nd1 * 0.5,
    gamma:   2 * nd1 / (S * sigma * sqrtT),
    vega:    2 * S * nd1 * sqrtT,
    theta: -(S * sigma * nd1) / (2 * sqrtT * 365),
    delta:   0.02,
  };
}

async function fetchBarsData(sym) {
  try {
    const valid = await fetchClosesSmart(sym, 70);   // ~3 mois de clôtures
    if (!valid || valid.length < 10) return null;
    const lastClose = valid[valid.length - 1];
    const rets = [];
    for (let i = 1; i < valid.length; i++) rets.push(Math.log(valid[i] / valid[i - 1]));
    function hvOf(window) {
      const slice = rets.slice(-window);
      if (slice.length < 5) return null;
      const m = slice.reduce((a, b) => a + b, 0) / slice.length;
      const v = slice.reduce((a, b) => a + (b - m) ** 2, 0) / (slice.length - 1);
      return Number((Math.sqrt(v * 252) * 100).toFixed(1));
    }
    const windowedHVs = [];
    for (let w = 0; w + 20 <= rets.length; w += 5) {
      const slice = rets.slice(w, w + 20);
      const m = slice.reduce((a, b) => a + b, 0) / slice.length;
      const v = slice.reduce((a, b) => a + (b - m) ** 2, 0) / (slice.length - 1);
      windowedHVs.push(Math.sqrt(v * 252) * 100);
    }
    const hvMin = windowedHVs.length ? Number((Math.min(...windowedHVs) * 0.85).toFixed(1)) : null;
    const hvMax = windowedHVs.length ? Number((Math.max(...windowedHVs) * 1.5).toFixed(1)) : null;
    return { lastClose, hv: hvOf(HV_WINDOW), rets, hvMin, hvMax };
  } catch { return null; }
}

function pearson(x, y) {
  const n = Math.min(x.length, y.length);
  if (n < 5) return null;
  const xi = x.slice(-n), yi = y.slice(-n);
  const mx = xi.reduce((a, b) => a + b, 0) / n;
  const my = yi.reduce((a, b) => a + b, 0) / n;
  let cov = 0, vx = 0, vy = 0;
  for (let i = 0; i < n; i++) { cov += (xi[i] - mx) * (yi[i] - my); vx += (xi[i] - mx) ** 2; vy += (yi[i] - my) ** 2; }
  return vx > 0 && vy > 0 ? cov / Math.sqrt(vx * vy) : 0;
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

// Prochain résultat (earnings) du titre via Finnhub — pour scorer le RISQUE
// ÉVÉNEMENT (même source que le module « Résultats » Pro, mais côté serveur donc
// accessible à TOUS). Retour : 'YYYY-MM-DD' (prochain earnings) | { none: true }
// (aucun dans l'horizon) | null (indisponible : pas de clé ou échec réseau).
async function fetchNextEarnings(sym, horizonDays, token) {
  if (!token) return null;
  const ymd = d => new Date(d).toISOString().slice(0, 10);
  const from = ymd(Date.now());
  const to   = ymd(Date.now() + horizonDays * 86400000);
  try {
    const r = await fetch(`https://finnhub.io/api/v1/calendar/earnings?symbol=${encodeURIComponent(sym)}&from=${from}&to=${to}&token=${token}`, { signal: AbortSignal.timeout(5000) });
    if (!r.ok) return null;
    const j = await r.json();
    const dates = (j.earningsCalendar || []).map(e => e && e.date).filter(Boolean).filter(d => d >= from).sort();
    return dates.length ? dates[0] : { none: true };
  } catch { return null; }
}

export default async (req) => {
  let body = {};
  try { body = await req.json(); } catch {}

  const indexSym = (body.index_symbol || 'SPX').toUpperCase();
  const sym      = (body.stock_symbol  || '').toUpperCase().trim();
  const duration = Math.max(7, Math.min(Number(body.duration_days) || 30, 120));
  if (!sym) return Response.json({ error: 'no_symbol' }, { status: 400 });

  const idxEtf = proxyEtf(indexSym);
  const mdTok  = process.env.MARKETDATA_API_TOKEN;
  const T = duration / 365;

  const earnHorizon = Math.min(180, Math.max(duration + 30, 90));
  const [stockData, idxData, ivCboe, ivIdxCboe, earnRaw] = await Promise.all([
    fetchBarsData(sym),
    fetchBarsData(idxEtf),
    cboeIvBundle(sym, duration).catch(() => null),
    cboeIvBundle(indexSym, duration).catch(() => null),
    fetchNextEarnings(sym, earnHorizon, process.env.FINNHUB_API_KEY),
  ]);

  if (!stockData) return Response.json({ error: 'no_price_data', symbol: sym }, { status: 502 });

  // IV : Cboe (réelle, différée 15 min) → MarketData (si token) → HV×1.15
  const ivMD  = ivCboe?.iv == null ? await fetchIVFromMD(sym, duration, mdTok) : null;
  const price = ivCboe?.spot ?? stockData.lastClose;
  const hv  = stockData.hv ?? 25;
  const iv    = ivCboe?.iv ?? ivMD ?? Number((hv * 1.15).toFixed(1));
  const ivSrc = ivCboe?.iv != null ? 'cboe_delayed' : (ivMD != null ? 'marketdata' : 'estimated_from_hv');

  const rho  = idxData?.rets ? Number((pearson(stockData.rets, idxData.rets) ?? 0.55).toFixed(3)) : 0.55;
  const beta = idxData?.rets ? (computeBeta(stockData.rets, idxData.rets) ?? 1.0) : 1.0;

  const ivMin  = stockData.hvMin ?? Number((hv * 0.6).toFixed(1));
  const ivMax  = stockData.hvMax ?? Number((hv * 2.0).toFixed(1));
  const ivRank = ivMax > ivMin ? Math.round(Math.max(0, Math.min(100, (iv - ivMin) / (ivMax - ivMin) * 100))) : 50;
  const ivPct  = Math.round(Math.max(0, Math.min(100, ivRank * 0.95)));

  const volPrem    = iv - hv;
  const edgeRho    = (RHO_IMPL_EST - rho) * 40;
  const betaScore  = Math.max(0, 12 - Math.abs(beta - 1.1) * 10);
  const volContrib = Math.max(-25, Math.min(25, volPrem));
  const score      = Math.round(Math.max(0, Math.min(100, 50 + volContrib + edgeRho + betaScore)));
  const [signal, signal_color] = score >= 75 ? ['FORT', 'green'] : score >= 55 ? ['MODÉRÉ', 'amber'] : ['FAIBLE', 'red'];

  // ── Risque événement (earnings) — RÉEL via Finnhub. Un résultat DANS la fenêtre
  //    de la stratégie = risque de gap directionnel + IV crush → sous-score plus
  //    bas. Sous-score d'affichage (n'entre pas dans le score composite). ──
  let earningsDate = '—', daysToEarnings = null, earningsInStrategy = false, evScore = 70, evReason;
  if (earnRaw == null) {
    evScore = 70;
    evReason = process.env.FINNHUB_API_KEY ? 'Date de résultats indisponible pour ce titre.' : 'Calendrier des résultats non configuré.';
  } else if (earnRaw.none) {
    evScore = 90; earningsDate = 'aucun avant échéance';
    evReason = `Aucun résultat annoncé avant l'échéance (${duration} j) — risque événement faible.`;
  } else {
    earningsDate = earnRaw;
    daysToEarnings = Math.max(0, Math.round((Date.parse(earnRaw + 'T12:00:00Z') - Date.now()) / 86400000));
    earningsInStrategy = daysToEarnings <= duration;
    if (earningsInStrategy) {
      const frac = duration > 0 ? Math.min(1, daysToEarnings / duration) : 0;
      evScore = Math.round(Math.max(35, Math.min(62, 38 + frac * 24)));
      evReason = `Résultats le ${earnRaw} (dans ${daysToEarnings} j, DANS la fenêtre) — gap directionnel & IV crush possibles.`;
    } else {
      evScore = 88;
      evReason = `Prochains résultats le ${earnRaw} (dans ${daysToEarnings} j, après l'échéance) — hors fenêtre.`;
    }
  }

  const subscores = {
    vol_attractive:     { score: Math.round(Math.max(0, Math.min(99, 50 + volPrem * 1.8))), reason: `IV ${iv.toFixed(1)}% vs HV ${hv.toFixed(1)}% (prime ${volPrem >= 0 ? '+' : ''}${volPrem.toFixed(1)} pts)` },
    dispersion_contrib: { score: Math.round(Math.max(0, Math.min(99, (1 - Math.max(0, rho)) * 120))), reason: `ρ réalisée ${(rho * 100).toFixed(0)}% vs indice (${rho < 0.5 ? 'faible = favorable' : rho < 0.7 ? 'modérée' : 'élevée = défavorable'})` },
    liquidity:          { score: Math.min(99, Math.round(50 + Math.log(Math.max(1, price)) * 5)), reason: `Prix ${price.toFixed(2)}$ — proxy liquidité` },
    execution:          { score: Math.min(99, Math.round(75 - rho * 28)), reason: `Spread estimé selon corrélation` },
    event_risk:         { score: evScore, reason: evReason },
  };

  // Coût d'exécution ESTIMÉ, spécifique à chaque action (pas de vraie chaîne
  // bid/ask ici) : spread aller-retour plus large pour les noms chers en vol et
  // peu liquides (proxy de liquidité = prix), + un tampon événement/slippage qui
  // croît avec l'IV. Remplace l'ancienne valeur figée (-3.8 pour tout le monde).
  const spreadPctEst = Math.max(0.03, Math.min(1.2,
    0.05 + (iv / 100) * 0.30 + Math.max(0, (60 - Math.min(60, price)) / 60) * 0.35));
  const costSpread   = Number((spreadPctEst * 12).toFixed(1));
  // Coût earnings majoré si un résultat tombe DANS la fenêtre (IV crush / gap).
  const costEarnings = Number(((0.6 + (iv / 100) * 1.2) * (earningsInStrategy ? 1.7 : 1)).toFixed(1));
  const compCcosts   = Number((-(costSpread + costEarnings)).toFixed(1));

  const g = bsAtm(price, iv / 100, T);
  const expiryDate = new Date(Date.now() + duration * 86400000).toISOString().slice(0, 10);

  let rec;
  if (score >= 75)     rec = `Score favorable (${score}/100) : prime de corrélation positive (ρ réal. ${(rho * 100).toFixed(0)}% < ρ impl. 65%) et prime de vol ${volPrem >= 0 ? 'positive (+' + volPrem.toFixed(1) + ' pts)' : 'légèrement négative (' + volPrem.toFixed(1) + ' pts)'}. Composant attractif pour une stratégie de dispersion.`;
  else if (score >= 55) rec = `Score modéré (${score}/100) : composant utilisable. ρ réalisée ${(rho * 100).toFixed(0)}% — prime de corrélation ${edgeRho >= 0 ? 'présente' : 'faible'}. Surveiller les coûts de spread et la liquidité des options.`;
  else                  rec = `Score faible (${score}/100) : corrélation élevée avec l'indice (ρ=${(rho * 100).toFixed(0)}%) limite l'apport à la dispersion${volPrem < 0 ? ' et la prime de vol est négative' : ''}. Envisager un autre composant.`;

  return Response.json({
    scoring: {
      score, signal, signal_color,
      comp_a_edge: Number(edgeRho.toFixed(1)), comp_b_vol_premium: Number(volPrem.toFixed(1)), comp_c_costs: compCcosts,
      rho_implicit_final: RHO_IMPL_EST, rho_real_expected: rho,
      cost_source: 'estimated', spread_pct_real: Number(spreadPctEst.toFixed(2)), cost_spread: costSpread, cost_earnings: costEarnings,
      subscores, composite_score: { score },
      pipeline: { rho_per_window: { 20: Number((rho + 0.02).toFixed(3)), 60: rho, 120: Number((rho - 0.01).toFixed(3)) }, weights_normalized: { 20: 0.25, 60: 0.50, 120: 0.25 }, blend: rho, regime_factor: 1.0, rho_hat_final: rho },
      recommendation: rec,
    },
    stock: {
      symbol: sym, weight: 10.0, iv, hv, beta,
      last_price: Number(price.toFixed(2)), iv_source: ivSrc,
      earnings_in_strategy: earningsInStrategy, days_to_earnings: daysToEarnings, earnings_date: earningsDate,
      iv_rank: { iv_rank: ivRank, iv_percentile: ivPct, iv_min: ivMin, iv_max: ivMax, note: ivSrc === 'cboe_delayed' ? 'IV réelle Cboe (différé 15 min) — rang estimé depuis HV historique' : ivSrc === 'marketdata' ? 'IV réelle MarketData — rang estimé depuis HV historique' : 'IV et rang estimés depuis la HV historique' },
      // Grecs du straddle ATM (Black-Scholes) — désormais nourris par l'IV réelle.
      // Strike/échéance réels de la chaîne Cboe quand disponibles.
      greeks: g ? {
        delta: Number(g.delta.toFixed(3)), gamma: Number(g.gamma.toFixed(5)),
        vega: Number(g.vega.toFixed(1)), theta: Number(g.theta.toFixed(1)),
        strike: ivCboe?.greeks?.strike ?? Number(price.toFixed(0)),
        expiry: ivCboe?.greeks?.expiry ?? expiryDate,
      } : null,
    },
    index: { symbol: indexSym, name: { SPX: 'S&P 500', NDX: 'Nasdaq 100', DJI: 'Dow Jones', CAC: 'CAC 40', DAX: 'DAX' }[indexSym] || indexSym, iv: ivIdxCboe?.iv ?? (idxData?.hv ? Number((idxData.hv * 1.1).toFixed(1)) : null), iv_source: ivIdxCboe?.iv != null ? 'cboe_delayed' : 'estimated_from_hv' },
    metadata: { duration_days: duration, source: ivSrc === 'cboe_delayed' ? 'cboe+closes' : (ivSrc === 'marketdata' ? 'marketdata+closes' : 'closes_only') },
  });
};
