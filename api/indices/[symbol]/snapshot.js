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
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${etf}?interval=1d&range=1y`;
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!r.ok) return null;
  const data = await r.json();
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

  // IV réelle (Cboe, cache CDN 15 min) + prix LIVE de l'ETF, en parallèle des barres
  const ivPromise   = ivViaApi(new URL(req.url).origin, symbol, 30).catch(() => null);
  const livePromise = fetchEtfQuoteFinnhub(map.etf).catch(() => null);

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

  // Prix quasi temps réel : on remplace la clôture journalière par le prix live
  // de l'ETF proxy (Finnhub) quand il est disponible.
  const live = await livePromise;
  if (live && live.price) {
    snap.etf_price = Number(live.price.toFixed(2));
    snap.price = Number((live.price * map.scale).toFixed(2));
    if (live.prevClose) snap.change = Number((((live.price - live.prevClose) / live.prevClose) * 100).toFixed(2));
    snap.price_source = 'realtime';
  } else {
    snap.price_source = 'daily_close';
  }

  return Response.json({ ...snap, etf: map.etf, source: barSource });
};
