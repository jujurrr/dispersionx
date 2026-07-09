// GET /api/indices/[symbol]/snapshot
// Barres : Alpaca bars → Yahoo Finance bars
// IV indice : RÉELLE via /api/iv (chaînes Cboe différées 15 min, cache CDN) ;
// repli HV×1.1 marqué `iv_source: estimated` si le Cboe est injoignable.
export const config = { runtime: 'edge' };

import { ivViaApi } from '../../_lib/cboe.js';
import { PROXY_SCALE as PROXY } from '../../_lib/proxy-scale.js';

const DATA_BASE = 'https://data.alpaca.markets';
const FINNHUB_BASE = 'https://finnhub.io/api/v1';
const FEED = process.env.ALPACA_DATA_FEED || 'iex';

// Ticker Yahoo de l'INDICE RÉEL (pas l'ETF proxy) — pour le PRIX et les VARIATIONS
// affichés. L'ETF proxy en USD (EWQ/EWG) fausserait le niveau CAC/DAX (change EUR/USD).
const INDEX_YF = { SPX: '^GSPC', NDX: '^NDX', DJI: '^DJI', CAC: '^FCHI', DAX: '^GDAXI' };

// Yahoo chart avec repli query1 → query2 : l'un des hôtes peut être bloqué ou
// throttlé côté IP datacenter (Vercel). Essayer les DEUX maximise l'obtention du
// VRAI niveau d'indice (^GSPC…) et évite de retomber sur l'ETF×échelle — faux de
// ~6 % pour CAC/DAX (ETF en USD → biais EUR/USD).
async function yahooChartJson(sym, params) {
  for (const host of ['query1', 'query2']) {
    try {
      const r = await fetch(`https://${host}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?${params}`,
        { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(5000) });
      if (r.ok) return await r.json();
    } catch { /* hôte suivant */ }
  }
  return null;
}

// Prix + clôture veille RÉELS de l'indice (Yahoo chart meta), quasi temps réel.
async function fetchIndexQuoteYahoo(ticker) {
  const meta = (await yahooChartJson(ticker, 'interval=1d&range=1d'))?.chart?.result?.[0]?.meta;
  if (!meta || meta.regularMarketPrice == null) return null;
  return { price: meta.regularMarketPrice, prevClose: meta.chartPreviousClose ?? meta.previousClose ?? null };
}

// Prix LIVE de l'ETF proxy (Finnhub, temps réel US) → prix d'indice quasi
// temps réel au lieu de la dernière clôture journalière.
async function fetchEtfQuoteFinnhub(etf) {
  const token = process.env.FINNHUB_API_KEY;
  if (!token) return null;
  try {
    const r = await fetch(`${FINNHUB_BASE}/quote?symbol=${etf}&token=${token}`, { signal: AbortSignal.timeout(4000) });
    if (!r.ok) return null;
    const d = await r.json();
    if (!d || d.c == null || d.c === 0) return null;
    return { price: d.c, prevClose: d.pc || null };
  } catch { return null; }
}

function alpacaHeaders() {
  return {
    'APCA-API-KEY-ID':     process.env.ALPACA_API_KEY_ID,
    'APCA-API-SECRET-KEY': process.env.ALPACA_API_SECRET_KEY,
  };
}

function stdev(arr) {
  if (arr.length < 2) return 0;
  const m = arr.reduce((a, b) => a + b, 0) / arr.length;
  return Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / (arr.length - 1));
}
const ANN = 100 * Math.sqrt(252);

async function getBarsAlpaca(etf) {
  const url = `${DATA_BASE}/v2/stocks/${etf}/bars?timeframe=1Day&limit=260&feed=${FEED}`;
  const r = await fetch(url, { headers: alpacaHeaders() });
  if (!r.ok) return null;
  const data = await r.json();
  const bars = data.bars || [];
  if (bars.length < 5) return null;
  return bars.map(b => ({ t: b.t, c: b.c }));
}

async function getBarsYahoo(etf) {
  const data = await yahooChartJson(etf, 'interval=1d&range=1y');
  const result = data?.chart?.result?.[0];
  if (!result) return null;
  const timestamps = result.timestamp || [];
  const closes    = result.indicators?.quote?.[0]?.close || [];
  if (closes.length < 5) return null;
  return timestamps.map((t, i) => ({ t: new Date(t * 1000).toISOString(), c: closes[i] }))
                   .filter(b => b.c != null);
}

function computeSnapshot(bars, scale) {
  const closes = bars.map(b => b.c);
  const n      = closes.length;
  const last   = closes[n - 1];
  const prev   = closes[n - 2];

  const rets = [];
  for (let i = 1; i < n; i++) rets.push(Math.log(closes[i] / closes[i - 1]));
  const hv  = (w) => stdev(rets.slice(-Math.min(w, rets.length))) * ANN;
  const pct = (idx) => (idx >= 0 && closes[idx]) ? ((last - closes[idx]) / closes[idx]) * 100 : null;

  const year   = new Date().getUTCFullYear();
  let ytdIdx   = bars.findIndex(b => new Date(b.t).getUTCFullYear() === year);
  if (ytdIdx < 0) ytdIdx = 0;

  const hv30 = hv(30);
  const r2 = (x) => x == null ? null : Number(x.toFixed(2));
  const r1 = (x) => x == null ? null : Number(x.toFixed(1));

  return {
    price:   Number((last * scale).toFixed(2)),
    // Prix réel de l'ETF proxy (ce que le broker trade : QQQ, SPY…) — les
    // modules de stratégie l'utilisent pour que les valeurs collent au marché.
    etf_price: Number(last.toFixed(2)),
    change:  r2(((last - prev) / prev) * 100),
    hv30:    r1(hv30),
    hv1y:    r1(hv(252)),
    iv_est:  r1(hv30 * 1.1),
    perf5d:  r2(pct(n - 1 - 5)),
    perf30d: r2(pct(n - 1 - 21)),
    ytd:     r2(pct(ytdIdx)),
  };
}

export default async (req) => {
  const parts  = new URL(req.url).pathname.split('/');
  const symbol = (parts[3] || '').toUpperCase();
  const map    = PROXY[symbol];
  if (!map) return Response.json({ error: 'unknown_symbol' }, { status: 404 });

  let bars = null;
  let barSource = 'unknown';

  // IV réelle (Cboe) + prix LIVE de l'ETF (etf_price) + INDICE réel (prix/variations
  // affichés) — tout en parallèle des barres.
  const ivPromise      = ivViaApi(new URL(req.url).origin, symbol, 30).catch(() => null);
  const livePromise    = fetchEtfQuoteFinnhub(map.etf).catch(() => null);
  const idxTicker      = INDEX_YF[symbol];
  const idxBarsPromise = idxTicker ? getBarsYahoo(idxTicker).catch(() => null) : Promise.resolve(null);
  const idxLivePromise = idxTicker ? fetchIndexQuoteYahoo(idxTicker).catch(() => null) : Promise.resolve(null);

  // 1) Alpaca bars
  if (process.env.ALPACA_API_KEY_ID) {
    try { bars = await getBarsAlpaca(map.etf); if (bars) barSource = 'alpaca'; } catch { /* fallback */ }
  }

  // 2) Yahoo Finance bars (fallback)
  if (!bars) {
    try { bars = await getBarsYahoo(map.etf); if (bars) barSource = 'yahoo'; } catch { /* erreur */ }
  }

  if (!bars) return Response.json({ error: 'no_data' }, { status: 502 });

  const snap = computeSnapshot(bars, map.scale);
  const ivReal = await ivPromise;
  if (ivReal?.iv != null) { snap.iv_est = ivReal.iv; snap.iv_source = 'cboe_delayed'; }
  else snap.iv_source = 'estimated';

  // etf_price = prix RÉEL de l'ETF proxy (ce que le broker trade) — utilisé par les
  // modules de stratégie. Ne pilote PLUS le prix d'indice affiché.
  const live = await livePromise;
  if (live && live.price) snap.etf_price = Number(live.price.toFixed(2));

  // ── PRIX + VARIATIONS de l'INDICE : niveau RÉEL (Yahoo ^ticker), pas l'ETF ×
  //    échelle (qui dérive, et fausse CAC/DAX via l'EUR/USD des ETF en USD). ──
  snap.price_source = 'proxy_scale';   // secours par défaut (ETF × échelle du computeSnapshot)
  const idxBars = await idxBarsPromise;
  if (idxBars && idxBars.length >= 5) {
    const ix = computeSnapshot(idxBars, 1);   // scale = 1 → niveau réel de l'indice
    // Prix + variations RÉELS de l'indice (HV/IV laissés sur l'ETF proxy : entrées
    // du scoring/IV Cboe — hors périmètre de la correction d'affichage).
    snap.price   = ix.price;
    snap.change  = ix.change;
    snap.perf5d  = ix.perf5d;
    snap.perf30d = ix.perf30d;
    snap.ytd     = ix.ytd;
    snap.price_source = 'index_daily';
  }
  const idxLive = await idxLivePromise;
  if (idxLive && idxLive.price) {
    snap.price = Number(idxLive.price.toFixed(2));
    if (idxLive.prevClose) snap.change = Number((((idxLive.price - idxLive.prevClose) / idxLive.prevClose) * 100).toFixed(2));
    snap.price_source = 'index_realtime';
  }

  // Petit cache CDN (5 s) : mutualise les appels amont (Yahoo/Finnhub) entre
  // clients/régions au tick 15 s → prix quasi temps réel SANS saturer les APIs
  // (sinon rate-limit → repli sur la clôture veille, bien plus périmé).
  return Response.json({ ...snap, etf: map.etf, source: barSource }, {
    headers: {
      'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=20',
      'Netlify-CDN-Cache-Control': 'public, s-maxage=5, stale-while-revalidate=20',
    },
  });
};
