// GET /api/options/atm?symbol=AAPL&dte=30
// Source : MarketData.app (IV ATM + grecs)
// Yahoo Finance v7/options bloqué côté serveur (401) — MarketData seule source viable
export const config = { runtime: 'edge' };

const MD_BASE = 'https://api.marketdata.app/v1/options/chain';

async function fetchMarketData(symbol, dte, token) {
  const r = await fetch(`${MD_BASE}/${symbol}/?dte=${encodeURIComponent(dte)}&side=call&strikeLimit=20`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) return null;
  const d = await r.json();
  if (d.s !== 'ok' || !Array.isArray(d.strike) || !d.strike.length) return null;

  const up = d.underlyingPrice || [];
  let best = 0, bestDiff = Infinity;
  for (let i = 0; i < d.strike.length; i++) {
    const diff = Math.abs(d.strike[i] - (up[i] ?? up[0]));
    if (diff < bestDiff) { bestDiff = diff; best = i; }
  }
  const num = (a) => (a && a[best] != null ? Number(a[best]) : null);
  const expUnix = (d.expiration || [])[best];
  const ivDec = num(d.iv);
  return {
    symbol, underlying_price: num(up), strike: num(d.strike),
    expiry: expUnix ? new Date(expUnix * 1000).toISOString().slice(0, 10) : null,
    dte: num(d.dte),
    iv: ivDec != null ? Number((ivDec * 100).toFixed(1)) : null,
    greeks: {
      delta: num(d.delta), gamma: num(d.gamma),
      vega: num(d.vega), theta: num(d.theta),
      strike: num(d.strike),
      expiry: expUnix ? new Date(expUnix * 1000).toISOString().slice(0, 10) : null,
    },
    source: 'marketdata',
  };
}

export default async (req) => {
  const q = new URL(req.url).searchParams;
  const symbol = (q.get('symbol') || '').toUpperCase();
  const dte = parseInt(q.get('dte') || '30', 10);
  if (!symbol) return Response.json({ error: 'no_symbol' }, { status: 400 });

  if (!process.env.MARKETDATA_API_TOKEN) {
    return Response.json({ error: 'no_keys' }, { status: 503 });
  }

  try {
    const res = await fetchMarketData(symbol, dte, process.env.MARKETDATA_API_TOKEN);
    if (res?.iv) return Response.json(res);
  } catch { /* pas de données */ }

  return Response.json({ error: 'no_iv_data' }, { status: 502 });
};
