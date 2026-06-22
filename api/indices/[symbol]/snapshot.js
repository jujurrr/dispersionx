// GET /api/indices/[symbol]/snapshot
// Cascade : Alpaca bars → Yahoo Finance bars → erreur
export const config = { runtime: 'edge' };

const DATA_BASE = 'https://data.alpaca.markets';
const FEED = process.env.ALPACA_DATA_FEED || 'iex';

const PROXY = {
  SPX: { etf: 'SPY',  scale: 10  },
  NDX: { etf: 'QQQ',  scale: 41  },
  DJI: { etf: 'DIA',  scale: 100 },
  CAC: { etf: 'EWQ',  scale: 196 },
  DAX: { etf: 'EWG',  scale: 565 },
};

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
    change:  r2(((last - prev) / prev) * 100),
    hv30:    r1(hv30),
    hv1y:    r1(hv(252)),
    iv_est:  r1(hv30 * 1.1),
    perf5d:  r2(pct(n - 1 - 5)),
    perf30d: r2(pct(n - 1 - 21)),
    ytd:     r2(pct(ytdIdx)),
  };
}

// IV réelle depuis Alpaca options (ETF liquides seulement : SPY, QQQ, DIA)
const ETF_OPTIONS_SUPPORTED = ['SPY', 'QQQ', 'DIA'];

async function getEtfIVAlpaca(etf, price) {
  if (!ETF_OPTIONS_SUPPORTED.includes(etf)) return null;
  if (!process.env.ALPACA_API_KEY_ID) return null;
  const headers = {
    'APCA-API-KEY-ID': process.env.ALPACA_API_KEY_ID,
    'APCA-API-SECRET-KEY': process.env.ALPACA_API_SECRET_KEY,
  };
  const now = new Date();
  const fmtDate = (d) => new Date(now.getTime() + d * 86400000).toISOString().slice(0, 10);
  // Options à ~30j d'échéance
  const cRes = await fetch(
    `https://data.alpaca.markets/v1beta1/options/contracts?underlying_symbols=${etf}&type=call&expiration_date_gte=${fmtDate(20)}&expiration_date_lte=${fmtDate(50)}&limit=100`,
    { headers }
  );
  if (!cRes.ok) return null;
  const contracts = (await cRes.json()).option_contracts || [];
  if (!contracts.length) return null;

  let best = null, bestDiff = Infinity;
  for (const c of contracts) {
    const diff = Math.abs((c.strike_price || 0) - price);
    if (diff < bestDiff) { bestDiff = diff; best = c; }
  }
  if (!best) return null;

  const oRes = await fetch(`https://data.alpaca.markets/v1beta1/options/snapshots?symbols=${best.symbol}`, { headers });
  if (!oRes.ok) return null;
  const oSnap = ((await oRes.json()).snapshots || {})[best.symbol];
  const iv = oSnap?.impliedVolatility;
  return iv != null ? Number((iv * 100).toFixed(1)) : null;
}

export default async (req) => {
  const parts  = new URL(req.url).pathname.split('/');
  const symbol = (parts[3] || '').toUpperCase();
  const map    = PROXY[symbol];
  if (!map) return Response.json({ error: 'unknown_symbol' }, { status: 404 });

  let bars = null;
  let barSource = 'unknown';

  // 1) Alpaca bars
  if (process.env.ALPACA_API_KEY_ID) {
    try { bars = await getBarsAlpaca(map.etf); if (bars) barSource = 'alpaca'; } catch { /* fallback */ }
  }

  // 2) Yahoo Finance fallback
  if (!bars) {
    try { bars = await getBarsYahoo(map.etf); if (bars) barSource = 'yahoo'; } catch { /* erreur */ }
  }

  if (!bars) return Response.json({ error: 'no_data' }, { status: 502 });

  const snap = computeSnapshot(bars, map.scale);

  // 3) IV réelle depuis Alpaca options (remplace iv_est si dispo)
  try {
    const etfPrice = bars[bars.length - 1].c;
    const ivReal = await getEtfIVAlpaca(map.etf, etfPrice);
    if (ivReal != null) {
      snap.iv_est = ivReal;
      snap.iv_source = 'alpaca';
    }
  } catch { /* iv_est HV×1.1 conservée */ }

  return Response.json({ ...snap, source: barSource });
};
