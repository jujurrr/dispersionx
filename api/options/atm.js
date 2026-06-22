// GET /api/options/atm?symbol=AAPL&dte=30
// Cascade : MarketData.app → Alpaca options v1beta1
export const config = { runtime: 'edge' };

const MD_BASE = 'https://api.marketdata.app/v1/options/chain';
const ALP_BASE = 'https://data.alpaca.markets';

function alpacaHeaders() {
  return {
    'APCA-API-KEY-ID': process.env.ALPACA_API_KEY_ID,
    'APCA-API-SECRET-KEY': process.env.ALPACA_API_SECRET_KEY,
  };
}

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
    greeks: { delta: num(d.delta), gamma: num(d.gamma), vega: num(d.vega), theta: num(d.theta), strike: num(d.strike), expiry: expUnix ? new Date(expUnix * 1000).toISOString().slice(0, 10) : null },
    source: 'marketdata',
  };
}

async function fetchAlpacaOptions(symbol, dte) {
  const headers = alpacaHeaders();
  const feed = process.env.ALPACA_DATA_FEED || 'iex';

  // 1. Prix actuel du sous-jacent
  const sRes = await fetch(`${ALP_BASE}/v2/stocks/${symbol}/snapshot?feed=${feed}`, { headers });
  if (!sRes.ok) return null;
  const snap = await sRes.json();
  const price = snap.latestTrade?.p ?? snap.minuteBar?.c ?? snap.dailyBar?.c;
  if (!price) return null;

  // 2. Contrats d'options proches du DTE demandé
  const now = new Date();
  const fmtDate = (d) => new Date(now.getTime() + d * 86400000).toISOString().slice(0, 10);
  const minExp = fmtDate(Math.max(1, dte - 7));
  const maxExp = fmtDate(dte + 35);

  const cRes = await fetch(
    `${ALP_BASE}/v1beta1/options/contracts?underlying_symbols=${symbol}&type=call&expiration_date_gte=${minExp}&expiration_date_lte=${maxExp}&limit=100`,
    { headers }
  );
  if (!cRes.ok) return null;
  const contracts = (await cRes.json()).option_contracts || [];
  if (!contracts.length) return null;

  // 3. Contrat ATM (strike le plus proche du prix actuel)
  let best = null, bestDiff = Infinity;
  for (const c of contracts) {
    const diff = Math.abs((c.strike_price || 0) - price);
    if (diff < bestDiff) { bestDiff = diff; best = c; }
  }
  if (!best) return null;

  // 4. Snapshot du contrat ATM (IV + grecs)
  const oRes = await fetch(`${ALP_BASE}/v1beta1/options/snapshots?symbols=${best.symbol}`, { headers });
  if (!oRes.ok) return null;
  const oSnap = ((await oRes.json()).snapshots || {})[best.symbol];
  if (!oSnap?.impliedVolatility) return null;

  const iv = oSnap.impliedVolatility;
  const g = oSnap.greeks || {};
  const dteDays = Math.round((new Date(best.expiration_date) - now) / 86400000);

  return {
    symbol, underlying_price: price, strike: best.strike_price,
    expiry: best.expiration_date, dte: dteDays,
    iv: Number((iv * 100).toFixed(1)),
    greeks: {
      delta: g.delta ?? null, gamma: g.gamma ?? null,
      vega: g.vega ?? null, theta: g.theta ?? null,
      strike: best.strike_price, expiry: best.expiration_date,
    },
    source: 'alpaca',
  };
}

export default async (req) => {
  const q = new URL(req.url).searchParams;
  const symbol = (q.get('symbol') || '').toUpperCase();
  const dte = parseInt(q.get('dte') || '30', 10);
  if (!symbol) return Response.json({ error: 'no_symbol' }, { status: 400 });

  // 1. MarketData.app
  if (process.env.MARKETDATA_API_TOKEN) {
    try {
      const res = await fetchMarketData(symbol, dte, process.env.MARKETDATA_API_TOKEN);
      if (res?.iv) return Response.json(res);
    } catch { /* fallback */ }
  }

  // 2. Alpaca options v1beta1
  if (process.env.ALPACA_API_KEY_ID) {
    try {
      const res = await fetchAlpacaOptions(symbol, dte);
      if (res?.iv) return Response.json(res);
    } catch { /* pas de données */ }
  }

  return Response.json({ error: 'no_iv_data' }, { status: 502 });
};
