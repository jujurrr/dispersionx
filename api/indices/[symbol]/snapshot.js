// GET /api/indices/[symbol]/snapshot
export const config = { runtime: 'edge' };

const DATA_BASE = 'https://data.alpaca.markets';
const FEED = process.env.ALPACA_DATA_FEED || 'iex';

const PROXY = {
  SPX: { etf: 'SPY', scale: 10 },
  NDX: { etf: 'QQQ', scale: 41 },
  DJI: { etf: 'DIA', scale: 100 },
  CAC: { etf: 'EWQ', scale: 196 },
  DAX: { etf: 'EWG', scale: 565 },
};

function authHeaders() {
  return {
    'APCA-API-KEY-ID': process.env.ALPACA_API_KEY_ID,
    'APCA-API-SECRET-KEY': process.env.ALPACA_API_SECRET_KEY,
  };
}

function stdev(arr) {
  if (arr.length < 2) return 0;
  const m = arr.reduce((a, b) => a + b, 0) / arr.length;
  const v = arr.reduce((a, b) => a + (b - m) * (b - m), 0) / (arr.length - 1);
  return Math.sqrt(v);
}
const ann = 100 * Math.sqrt(252);

export default async (req) => {
  if (!process.env.ALPACA_API_KEY_ID || !process.env.ALPACA_API_SECRET_KEY) {
    return Response.json({ error: 'no_keys' }, { status: 503 });
  }

  // Extrait le symbole depuis /api/indices/SPX/snapshot
  const parts = new URL(req.url).pathname.split('/');
  const symbol = (parts[3] || '').toUpperCase();
  const map = PROXY[symbol];
  if (!map) return Response.json({ error: 'unknown_symbol' }, { status: 404 });

  try {
    const url = `${DATA_BASE}/v2/stocks/${map.etf}/bars?timeframe=1Day&limit=260&feed=${FEED}`;
    const r = await fetch(url, { headers: authHeaders() });
    if (!r.ok) return Response.json({ error: 'alpaca_bars', http: r.status }, { status: 502 });
    const bars = (await r.json()).bars || [];
    if (bars.length < 5) return Response.json({ error: 'not_enough_data' }, { status: 502 });

    const closes = bars.map(b => b.c);
    const n = closes.length;
    const last = closes[n - 1];
    const prev = closes[n - 2];

    const rets = [];
    for (let i = 1; i < n; i++) rets.push(Math.log(closes[i] / closes[i - 1]));
    const hv = (w) => stdev(rets.slice(-w)) * ann;

    const pct = (fromIdx) => (fromIdx >= 0 && closes[fromIdx]) ? ((last - closes[fromIdx]) / closes[fromIdx]) * 100 : null;

    const year = new Date().getUTCFullYear();
    let ytdIdx = bars.findIndex(b => new Date(b.t).getUTCFullYear() === year);
    if (ytdIdx < 0) ytdIdx = 0;

    const hv30 = hv(Math.min(30, rets.length));
    const r2 = (x) => x == null ? null : Number(x.toFixed(2));
    const r1 = (x) => x == null ? null : Number(x.toFixed(1));

    return Response.json({
      price: Number((last * map.scale).toFixed(2)),
      change: r2(((last - prev) / prev) * 100),
      hv30: r1(hv30),
      hv1y: r1(hv(Math.min(252, rets.length))),
      iv_est: r1(hv30 * 1.1),
      perf5d: r2(pct(n - 1 - 5)),
      perf30d: r2(pct(n - 1 - 21)),
      ytd: r2(pct(ytdIdx)),
      proxy_etf: map.etf,
    });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 502 });
  }
};
