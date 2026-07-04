// POST /api/vol/ticker
// Body: { ticker: string, index?: string }            — mode détail
//    OR { tickers: string[], index?: string }          — mode batch (liste)
// HV30/60/90 depuis les clôtures Cboe (repli Yahoo), IV RÉELLE depuis les
// chaînes d'options différées du Cboe (repli MarketData si token, sinon
// estimation HV×1.12 marquée comme telle), beta, ρ vs indice.
export const config = { runtime: 'edge' };

import { cboeIvBundle, fetchClosesSmart, ivViaApi } from '../_lib/cboe.js';

const ETF = { SPX: 'SPY', NDX: 'QQQ', DJI: 'DIA', CAC: 'EWQ', DAX: 'EWG' };

function logReturns(closes) {
  const r = [];
  for (let i = 1; i < closes.length; i++) r.push(Math.log(closes[i] / closes[i - 1]));
  return r;
}

function hvFromRets(rets, window) {
  if (!rets || rets.length < window) return null;
  const slice = rets.slice(-window);
  const m = slice.reduce((a, b) => a + b, 0) / slice.length;
  const v = slice.reduce((a, b) => a + (b - m) ** 2, 0) / (slice.length - 1);
  return Number((Math.sqrt(v * 252) * 100).toFixed(2));
}

// Retourne un tableau de HV calculés sur des fenêtres glissantes (pour graphique)
function rollingHV(rets, window = 30, take = 90) {
  if (!rets || rets.length < window + 1) return [];
  const out = [];
  for (let i = window; i <= rets.length; i++) {
    out.push(hvFromRets(rets.slice(i - window, i), window));
  }
  return out.filter(v => v != null).slice(-take);
}

function betaCorr(tickRets, idxRets, n = 90) {
  const len = Math.min(tickRets.length, idxRets.length, n);
  if (len < 15) return { beta: null, corr: null };
  const sx = tickRets.slice(-len), sy = idxRets.slice(-len);
  const mx = sx.reduce((a, b) => a + b, 0) / len;
  const my = sy.reduce((a, b) => a + b, 0) / len;
  let cov = 0, vx = 0, vy = 0;
  for (let i = 0; i < len; i++) {
    cov += (sx[i] - mx) * (sy[i] - my);
    vx  += (sx[i] - mx) ** 2;
    vy  += (sy[i] - my) ** 2;
  }
  return {
    beta: vy > 0 ? Number((cov / vy).toFixed(2)) : null,
    corr: vx > 0 && vy > 0 ? Number((cov / Math.sqrt(vx * vy)).toFixed(2)) : null,
  };
}

// Repli secondaire : IV ATM MarketData.app (si token configuré)
async function fetchIVMarketData(ticker, mdTok) {
  if (!mdTok) return null;
  try {
    const r = await fetch(
      `https://api.marketdata.app/v1/options/chain/${ticker}/?dte=30&side=call&strikeLimit=7`,
      { headers: { Authorization: `Bearer ${mdTok}` }, signal: AbortSignal.timeout(5000) }
    );
    if (!r.ok) return null;
    const d = await r.json();
    if (d.s !== 'ok' || !Array.isArray(d.iv) || !d.iv.length) return null;
    const up = (d.underlyingPrice || [])[0] || 0;
    let best = Math.floor(d.iv.length / 2), bestDiff = Infinity;
    (d.strike || []).forEach((s, i) => { const diff = Math.abs(s - up); if (diff < bestDiff) { bestDiff = diff; best = i; } });
    return d.iv[best] != null ? Number((d.iv[best] * 100).toFixed(1)) : null;
  } catch { return null; }
}

export default async (req) => {
  let body = {};
  try { body = await req.json(); } catch {}

  const origin   = new URL(req.url).origin;
  const mdTok    = process.env.MARKETDATA_API_TOKEN;
  const indexKey = (body.index || 'SPX').toUpperCase();
  const idxEtf   = ETF[indexKey] || 'SPY';

  // ── MODE BATCH ────────────────────────────────────────────────────
  if (Array.isArray(body.tickers)) {
    const tickers = body.tickers.slice(0, 20).map(t => String(t).toUpperCase());
    if (!tickers.length) return Response.json({ error: 'empty_tickers' }, { status: 400 });

    // Clôtures (HV/beta) + IV réelles via /api/iv/{t} (cache CDN 15 min)
    const [idxFetch, ...rest] = await Promise.allSettled([
      fetchClosesSmart(idxEtf),
      ...tickers.map(t => fetchClosesSmart(t)),
      ...tickers.map(t => ivViaApi(origin, t, 30)),
    ]);
    const idxCloses = idxFetch.status === 'fulfilled' ? idxFetch.value : null;
    const idxRets   = idxCloses ? logReturns(idxCloses) : null;

    let nReal = 0;
    const results = tickers.map((ticker, ti) => {
      const closes = rest[ti].status === 'fulfilled' ? rest[ti].value : null;
      const ivReal = rest[tickers.length + ti].status === 'fulfilled' ? rest[tickers.length + ti].value : null;
      if (!closes || closes.length < 32) return { ticker, error: 'no_data' };
      const rets   = logReturns(closes);
      const hv30   = hvFromRets(rets, 30);
      const hv60   = hvFromRets(rets, 60);
      const iv     = ivReal?.iv ?? (hv30 ? Number((hv30 * 1.12).toFixed(1)) : null);
      if (ivReal?.iv != null) nReal++;
      const spread = iv != null && hv30 != null ? Number((iv - hv30).toFixed(1)) : null;
      const { beta, corr } = idxRets ? betaCorr(rets, idxRets) : { beta: null, corr: null };
      return {
        ticker, hv30, hv60,
        iv_est: iv, iv_src: ivReal ? 'cboe_delayed' : 'hv_estimate',
        spread, beta, correlation: corr,
      };
    });

    return Response.json({
      results, index: indexKey,
      source: nReal > 0 ? 'cboe_delayed+hv' : 'yahoo_hv',
    });
  }

  // ── MODE DÉTAIL (ticker unique) ───────────────────────────────────
  const ticker = String(body.ticker || '').toUpperCase();
  if (!ticker) return Response.json({ error: 'ticker_required' }, { status: 400 });

  const [closes, idxCloses, bundle] = await Promise.all([
    fetchClosesSmart(ticker),
    fetchClosesSmart(idxEtf),
    cboeIvBundle(ticker, 30),
  ]);

  if (!closes || closes.length < 32)
    return Response.json({ error: 'insufficient_data', ticker }, { status: 502 });

  const rets    = logReturns(closes);
  const idxRets = idxCloses ? logReturns(idxCloses) : null;

  const hv30  = hvFromRets(rets, 30);
  const hv60  = hvFromRets(rets, 60);
  const hv90  = hvFromRets(rets, 90);
  const hv252 = hvFromRets(rets, Math.min(252, rets.length));
  const hv_history = rollingHV(rets, 30, 90);

  // IV : Cboe (réelle) → MarketData (réelle, si token) → HV×1.12 (estimée)
  const ivAtm = bundle?.iv ?? await fetchIVMarketData(ticker, mdTok);
  const iv_final    = ivAtm ?? (hv30 ? Number((hv30 * 1.12).toFixed(1)) : null);
  const iv_minus_hv = iv_final != null && hv30 != null ? Number((iv_final - hv30).toFixed(1)) : null;

  const { beta, corr } = idxRets ? betaCorr(rets, idxRets) : { beta: null, corr: null };

  return Response.json({
    ticker,
    index:        indexKey,
    hv30,  hv60,  hv90,  hv252,
    iv_atm:       ivAtm,
    iv30:         bundle?.iv30 ?? null,
    iv_est:       iv_final,
    iv_minus_hv,
    hv_history,
    term:         bundle?.term ?? null,
    beta,
    correlation:  corr,
    spot:         bundle?.spot ?? null,
    asof:         bundle?.asof ?? null,
    source:       bundle ? 'cboe_delayed' : (ivAtm ? 'marketdata' : 'hv_estimate'),
  });
};
