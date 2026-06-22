// GET /api/options/atm?symbol=AAPL&dte=30
// Cascade : MarketData.app → Yahoo Finance options (IV ATM, sans grecs)
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
    greeks: { delta: num(d.delta), gamma: num(d.gamma), vega: num(d.vega), theta: num(d.theta), strike: num(d.strike), expiry: expUnix ? new Date(expUnix * 1000).toISOString().slice(0, 10) : null },
    source: 'marketdata',
  };
}

async function fetchYahooOptions(symbol, dte) {
  const headers = { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' };

  // 1. Dates d'expiration disponibles + prix actuel
  const r1 = await fetch(`https://query1.finance.yahoo.com/v7/finance/options/${encodeURIComponent(symbol)}`, { headers });
  if (!r1.ok) return null;
  const d1 = await r1.json();
  const res = d1?.optionChain?.result?.[0];
  if (!res) return null;

  const price = res.quote?.regularMarketPrice;
  if (!price) return null;

  const expirations = res.expirationDates || [];
  if (!expirations.length) return null;

  // 2. Expiration la plus proche du DTE demandé
  const targetTs = Date.now() / 1000 + dte * 86400;
  let bestExp = expirations[0], bestDiff = Infinity;
  for (const ts of expirations) {
    const diff = Math.abs(ts - targetTs);
    if (diff < bestDiff) { bestDiff = diff; bestExp = ts; }
  }

  // 3. Chaîne d'options pour cette expiration
  const r2 = await fetch(
    `https://query1.finance.yahoo.com/v7/finance/options/${encodeURIComponent(symbol)}?date=${bestExp}`,
    { headers }
  );
  if (!r2.ok) return null;
  const d2 = await r2.json();
  const calls = d2?.optionChain?.result?.[0]?.options?.[0]?.calls || [];
  if (!calls.length) return null;

  // 4. Call ATM (strike le plus proche du prix actuel)
  let atm = null, atmDiff = Infinity;
  for (const c of calls) {
    const diff = Math.abs((c.strike || 0) - price);
    if (diff < atmDiff) { atmDiff = diff; atm = c; }
  }
  if (!atm?.impliedVolatility) return null;

  const expiry = new Date(bestExp * 1000).toISOString().slice(0, 10);
  const dteDays = Math.round((bestExp - Date.now() / 1000) / 86400);

  return {
    symbol,
    underlying_price: price,
    strike: atm.strike,
    expiry,
    dte: dteDays,
    iv: Number((atm.impliedVolatility * 100).toFixed(1)),
    greeks: null, // Yahoo Finance ne fournit pas les grecs
    source: 'yahoo',
  };
}

export default async (req) => {
  const q = new URL(req.url).searchParams;
  const symbol = (q.get('symbol') || '').toUpperCase();
  const dte = parseInt(q.get('dte') || '30', 10);
  if (!symbol) return Response.json({ error: 'no_symbol' }, { status: 400 });

  // Mode comparaison : retourne les deux sources simultanément
  if (q.get('compare') === '1') {
    const [md, yh] = await Promise.allSettled([
      process.env.MARKETDATA_API_TOKEN
        ? fetchMarketData(symbol, dte, process.env.MARKETDATA_API_TOKEN)
        : Promise.resolve(null),
      fetchYahooOptions(symbol, dte),
    ]);
    return Response.json({
      symbol, dte,
      marketdata: md.status === 'fulfilled' ? md.value : { error: String(md.reason) },
      yahoo: yh.status === 'fulfilled' ? yh.value : { error: String(yh.reason) },
    });
  }

  // 1. MarketData.app (IV + grecs)
  if (process.env.MARKETDATA_API_TOKEN) {
    try {
      const res = await fetchMarketData(symbol, dte, process.env.MARKETDATA_API_TOKEN);
      if (res?.iv) return Response.json(res);
    } catch { /* fallback */ }
  }

  // 2. Yahoo Finance (IV ATM uniquement)
  try {
    const res = await fetchYahooOptions(symbol, dte);
    if (res?.iv) return Response.json(res);
  } catch { /* pas de données */ }

  return Response.json({ error: 'no_iv_data' }, { status: 502 });
};
