// POST /api/stocks/auto-score
// Body: { index_symbol, stock_symbol, duration_days }
// Score de dispersion : IV réelles Cboe (via /api/iv, cache CDN 15 min),
// clôtures Cboe (repli Yahoo) pour HV/ρ/beta, repli MarketData si token.
export const config = { runtime: 'edge' };

import { allow, tooMany } from '../_lib/ratelimit.js';

// cboeIvBundle appelé DIRECTEMENT (en mémoire) : il lit d'abord le cache Supabase
// partagé (fiable inter-région) et évite le saut HTTP interne vers /api/iv qui
// échouait dans certaines régions (→ 502 → estimation 128).
import { fetchClosesSmart, cboeIvBundle } from '../_lib/cboe.js';
import { proxyEtf } from '../_lib/proxy-scale.js';
import { kvCacheGet, kvCacheSet } from '../_lib/iv-cache.js';

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

// ── Risque événement : prochain earnings du titre via Finnhub, requête PAR
//    SYMBOLE (fiable — l'appel global est incomplet), mais MUTUALISÉE par un
//    cache mémoire isolate + Supabase (12 h) pour ne PAS refaire l'appel à
//    chaque score → évite le rate-limit Finnhub. Horizon plafonné à 60 j. ──
const EARN_HORIZON = 60;                 // fenêtre de détection (jours)
const EARN_TTL_MS  = 24 * 3600 * 1000;   // ≥ cycle du pré-réchauffeur (api/earnings/warm.js)
const _earnMem = new Map();              // sym -> { val, at } (survit sur isolate chaud)

async function fetchNextEarningsRaw(sym, token) {
  const ymd = d => new Date(d).toISOString().slice(0, 10);
  const from = ymd(Date.now()), to = ymd(Date.now() + EARN_HORIZON * 86400000);
  try {
    const r = await fetch(`https://finnhub.io/api/v1/calendar/earnings?symbol=${encodeURIComponent(sym)}&from=${from}&to=${to}&token=${token}`, { signal: AbortSignal.timeout(6000) });
    if (!r.ok) return null;
    const dates = ((await r.json())?.earningsCalendar || []).map(e => e && e.date).filter(d => d && d >= from).sort();
    return dates.length ? { date: dates[0] } : { none: true };
  } catch { return null; }
}

// Retour : { date:'YYYY-MM-DD' } | { none:true } | null (indisponible).
async function getNextEarnings(sym, token) {
  if (!token) return null;
  const mem = _earnMem.get(sym);
  if (mem && Date.now() - mem.at < EARN_TTL_MS) return mem.val;
  const cached = await kvCacheGet('EARN:' + sym, EARN_TTL_MS);
  if (cached && (cached.date || cached.none)) { _earnMem.set(sym, { val: cached, at: Date.now() }); return cached; }
  const val = await fetchNextEarningsRaw(sym, token);
  if (val) { _earnMem.set(sym, { val, at: Date.now() }); kvCacheSet('EARN:' + sym, val).catch(() => {}); }
  return val;   // null = échec ponctuel → non caché, retenté au prochain score
}

export default async (req) => {
  if (!allow(req, { limit: 200, windowMs: 10000 })) return tooMany();   // scoring par action → limite haute
  let body = {};
  try { body = await req.json(); } catch {}

  const indexSym = (body.index_symbol || 'SPX').toUpperCase();
  const sym      = (body.stock_symbol  || '').toUpperCase().trim();
  const duration = Math.max(7, Math.min(Number(body.duration_days) || 30, 120));
  if (!sym) return Response.json({ error: 'no_symbol' }, { status: 400 });

  // Ancre de corrélation implicite : ρ_impl RÉEL du panier fourni par l'appelant
  // (calculé par /api/correlation/implied depuis l'IV de l'indice vs les IV des
  // composants — le vrai edge de dispersion). À défaut, repli sur la constante
  // RHO_IMPL_EST (fail-safe non-cassant : ancienne behavior conservée).
  const rhoImplIn  = Number(body.rho_impl);
  const rhoImpl    = rhoImplIn > 0 && rhoImplIn < 1 ? rhoImplIn : RHO_IMPL_EST;
  const rhoImplSrc = rhoImplIn > 0 && rhoImplIn < 1 ? 'basket_cboe' : 'default';

  const idxEtf = proxyEtf(indexSym);
  const mdTok  = process.env.MARKETDATA_API_TOKEN;
  const T = duration / 365;

  const [stockData, idxData, ivCboe, ivIdxCboe, earnRes] = await Promise.all([
    fetchBarsData(sym),
    fetchBarsData(idxEtf),
    cboeIvBundle(sym, duration).catch(() => null),
    cboeIvBundle(indexSym, duration).catch(() => null),
    getNextEarnings(sym, process.env.FINNHUB_API_KEY),
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

  const volPrem = iv - hv;   // information (IV vs HV) — n'entre PLUS dans le score
  // (le score composite est calculé plus bas, une fois evScore connu — modèle pondéré)

  // ── Catalyseur EARNINGS — RÉEL via Finnhub. Sur un COMPOSANT, un résultat DANS
  //    la fenêtre = gap IDIOSYNCRATIQUE = décorrélation vs l'indice = CARBURANT de
  //    la dispersion (la jambe longue paie sur le mouvement propre, l'indice
  //    moyenne et bouge peu). On le RÉCOMPENSE au lieu de le pénaliser comme un
  //    straddle-long naïf. Pèse 15 %. La prime d'IV liée à l'earnings est en plus
  //    DÉCONTAMINÉE de l'IV-rank (sinon l'earnings serait compté deux fois). ──
  let earningsDate = '—', daysToEarnings = null, earningsInStrategy = false, evScore = 60, evReason;
  if (earnRes == null) {
    // Calendrier indisponible (Finnhub throttlé / pas de clé) — neutre.
    evScore = 60;
    evReason = process.env.FINNHUB_API_KEY ? 'Calendrier des résultats momentanément indisponible.' : 'Calendrier des résultats non configuré.';
  } else if (earnRes.none) {
    // Aucun résultat proche — pas de catalyseur de décorrélation par earnings (neutre).
    evScore = 60; earningsDate = 'aucun proche';
    evReason = `Aucun résultat dans les ${EARN_HORIZON} prochains jours — pas de catalyseur de décorrélation.`;
  } else {
    const d = earnRes.date;
    earningsDate = d;
    daysToEarnings = Math.max(0, Math.round((Date.parse(d + 'T12:00:00Z') - Date.now()) / 86400000));
    earningsInStrategy = daysToEarnings <= duration;
    if (earningsInStrategy) {
      // FAVORABLE : gap idiosyncratique dans la fenêtre. Pic quand l'earnings est
      // assez tôt pour tenir à travers ET capturer le mouvement (frac ≈ 0.4).
      const frac = duration > 0 ? Math.min(1, daysToEarnings / duration) : 0;
      evScore = Math.round(Math.max(72, Math.min(92, 92 - Math.abs(frac - 0.4) * 32)));
      evReason = `Résultats le ${d} (dans ${daysToEarnings} j, DANS la fenêtre) — gap idiosyncratique = décorrélation, favorable à la dispersion.`;
    } else {
      // Earnings après l'échéance : gap non capté dans la fenêtre → neutre.
      evScore = 60;
      evReason = `Prochains résultats le ${d} (dans ${daysToEarnings} j, après l'échéance) — gap non capté dans la fenêtre.`;
    }
  }

  // ── Modèle de score : MOYENNE PONDÉRÉE de 5 sous-scores ∈ [0,100] ───────────
  //  Corrélation 45 % (cœur) · IV-rank 20 % (IV basse dans son historique =
  //  favorable à l'achat, DÉCONTAMINÉE de la prime d'earnings) · catalyseur
  //  earnings 15 % (gap idiosyncratique = décorrélation = FAVORABLE à la
  //  dispersion) · vol idiosyncratique 10 % (HV·√(1−ρ²), le mouvement propre) ·
  //  liquidité 10 % (spread bid/ask réel du straddle ATM).
  const clampS = v => Math.max(0, Math.min(100, v));
  const corrScore    = Math.round(clampS(50 + (rhoImpl - rho) * 130));  // ρ réal < ρ impl (RÉEL) = favorable
  // IV-rank décontaminé de la prime d'EARNINGS : si un résultat est dans la
  // fenêtre, l'IV est gonflée pour une raison ATTENDUE (prime d'earnings, déjà
  // valorisée par le catalyseur earnings) — pas une richesse structurelle. On
  // n'autorise donc PAS cette IV gonflée à re-pénaliser le titre (plancher neutre) :
  // sinon l'earnings serait compté DEUX fois (catalyseur + IV-rank).
  let ivRankScore    = Math.round(clampS(100 - ivRank));                      // IV basse dans son historique = favorable
  if (earningsInStrategy) ivRankScore = Math.max(ivRankScore, 50);
  // Vol IDIOSYNCRATIQUE : combien l'action bouge INDÉPENDAMMENT de l'indice
  // (σ_idio = HV·√(1−ρ²)). C'est le vrai moteur du straddle long — il faut que
  // ça bouge tout seul pour payer. Remplace l'ancien « beta vs 1.1 » (mesure
  // directionnelle, cible arbitraire, redondante avec ρ). Orthogonal aux autres :
  // l'IV-rank dit si c'est CHER à acheter, la vol idio dit si ça BOUGE assez.
  const idioVol   = hv * Math.sqrt(Math.max(0, 1 - rho * rho));               // points de vol annualisés
  const idioScore = Math.round(clampS(idioVol * 2.2));                        // ~25 %→55, ~45 %→99

  // Liquidité RÉELLE des options : spread bid/ask du straddle ATM (chaîne Cboe),
  // en % du mid. Serré = liquide. Le PRIX n'est PAS un proxy de liquidité (les
  // noms illiquides ont souvent un prix élevé) → on ne l'utilise plus. Repli
  // neutre-bas si options non cotées (nom peu tradeable).
  const atmSpreadPct = (ivCboe?.greeks?.spreadPct != null && ivCboe.greeks.spreadPct > 0) ? ivCboe.greeks.spreadPct : null;
  const liqScore     = atmSpreadPct != null ? Math.round(clampS(100 - atmSpreadPct * 3.5)) : 45;

  const W = { correlation: 0.45, iv_rank: 0.20, event: 0.15, idio: 0.10, liquidity: 0.10 };
  const score = Math.round(clampS(
    W.correlation * corrScore + W.iv_rank * ivRankScore + W.event * evScore +
    W.idio * idioScore + W.liquidity * liqScore));
  const [signal, signal_color] = score >= 75 ? ['FORT', 'green'] : score >= 55 ? ['MODÉRÉ', 'amber'] : ['FAIBLE', 'red'];

  const subscores = {
    dispersion_contrib: { score: corrScore,    reason: `ρ réalisée ${(rho * 100).toFixed(0)}% vs implicite ${(rhoImpl * 100).toFixed(0)}% (${rho < rhoImpl - 0.1 ? 'sous l\'implicite = favorable' : rho > rhoImpl + 0.05 ? 'au-dessus = défavorable' : 'proche de l\'implicite'})` },
    vol_attractive:     { score: ivRankScore,  reason: `IV rank ${ivRank}% — IV ${iv.toFixed(1)}% vs HV ${hv.toFixed(1)}% (${ivRank <= 40 ? "vol bon marché à l'achat" : ivRank >= 65 ? "vol chère à l'achat" : 'vol moyenne'})` },
    earnings_catalyst:  { score: evScore,      reason: evReason },
    idio_vol:           { score: idioScore,    reason: `Vol idio ${idioVol.toFixed(0)}% (HV ${hv.toFixed(0)}% × √(1−ρ²)) — mouvement propre, indépendant de l'indice` },
    liquidity:          { score: liqScore,     reason: atmSpreadPct != null ? `Spread straddle ATM ${atmSpreadPct.toFixed(1)}% (réel Cboe) — ${atmSpreadPct <= 3 ? 'liquide' : atmSpreadPct <= 8 ? 'moyen' : 'large / illiquide'}` : 'Options non cotées — liquidité incertaine' },
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
  if (score >= 75)     rec = `Score favorable (${score}/100) : prime de corrélation présente (ρ réal. ${(rho * 100).toFixed(0)}% < ρ impl. ${(rhoImpl * 100).toFixed(0)}%${rhoImplSrc === 'basket_cboe' ? ' réelle' : ''}) et volatilité ${ivRank <= 45 ? "bon marché à l'achat" : 'correcte'} (IV rank ${ivRank}%). Bon candidat pour la jambe longue d'une dispersion.`;
  else if (score >= 55) rec = `Score modéré (${score}/100) : composant utilisable. ρ réalisée ${(rho * 100).toFixed(0)}% ; IV rank ${ivRank}%. Surveiller la liquidité et un éventuel résultat dans la fenêtre.`;
  else                  rec = `Score faible (${score}/100) : ${rho >= 0.7 ? `corrélation élevée avec l'indice (ρ=${(rho * 100).toFixed(0)}%) limite l'apport à la dispersion` : 'profil peu favorable à la dispersion'}${ivRank >= 65 ? " et IV chère à l'achat (IV rank élevé)" : ''}. Envisager un autre composant.`;

  return Response.json({
    scoring: {
      score, signal, signal_color,
      weights: W,
      // Décomposition pondérée : contribution = poids × sous-score (∑ = score).
      comp_correlation: Number((W.correlation * corrScore).toFixed(1)),
      comp_iv_rank:     Number((W.iv_rank * ivRankScore).toFixed(1)),
      comp_event:       Number((W.event * evScore).toFixed(1)),
      comp_idio:        Number((W.idio * idioScore).toFixed(1)),
      comp_liquidity:   Number((W.liquidity * liqScore).toFixed(1)),
      iv_rank_used: ivRank,
      // rétro-compat (anciens noms) — dérivés du nouveau modèle :
      comp_a_edge: Number((W.correlation * corrScore).toFixed(1)),
      comp_b_vol_premium: Number(volPrem.toFixed(1)),   // info IV−HV (hors score)
      comp_c_costs: compCcosts,
      rho_implicit_final: rhoImpl, rho_impl_source: rhoImplSrc, corr_risk_premium: Number((rhoImpl - rho).toFixed(3)), rho_real_expected: rho,
      cost_source: atmSpreadPct != null ? 'real_bidask' : 'estimated', spread_pct_real: atmSpreadPct != null ? atmSpreadPct : Number(spreadPctEst.toFixed(2)), cost_spread: costSpread, cost_earnings: costEarnings,
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
