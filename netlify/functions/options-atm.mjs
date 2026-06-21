// Netlify Function: /api/options/atm?symbol=AAPL&dte=30
// IV ATM + greeks réels via MarketData.app (chaîne d'options).
// Renvoie { symbol, underlying_price, strike, expiry, dte, iv (en %), greeks:{delta,gamma,vega,theta,strike,expiry}, source }.

const BASE = 'https://api.marketdata.app/v1/options/chain';

export default async (req) => {
  const token = process.env.MARKETDATA_API_TOKEN;
  if (!token) return Response.json({ error: 'no_keys' }, { status: 503 });

  const q = new URL(req.url).searchParams;
  const symbol = (q.get('symbol') || '').toUpperCase();
  const dte = q.get('dte') || '30';
  if (!symbol) return Response.json({ error: 'no_symbol' }, { status: 400 });

  try {
    const url = `${BASE}/${symbol}/?dte=${encodeURIComponent(dte)}&side=call&strikeLimit=20`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) return Response.json({ error: 'marketdata', http: r.status }, { status: 502 });
    const d = await r.json();
    if (d.s !== 'ok' || !Array.isArray(d.strike) || !d.strike.length) {
      return Response.json({ error: 'no_chain' }, { status: 502 });
    }

    // ATM = strike le plus proche du sous-jacent
    const up = d.underlyingPrice || [];
    let best = 0, bestDiff = Infinity;
    for (let i = 0; i < d.strike.length; i++) {
      const ref = up[i] ?? up[0];
      const diff = Math.abs(d.strike[i] - ref);
      if (diff < bestDiff) { bestDiff = diff; best = i; }
    }

    const expUnix = (d.expiration || [])[best];
    const expiry = expUnix ? new Date(expUnix * 1000).toISOString().slice(0, 10) : null;
    const num = (a) => (a && a[best] != null ? Number(a[best]) : null);
    const ivDec = num(d.iv);

    return Response.json({
      symbol,
      underlying_price: num(up),
      strike: num(d.strike),
      expiry,
      dte: num(d.dte),
      iv: ivDec != null ? Number((ivDec * 100).toFixed(1) ) : null, // % pour l'affichage frontend
      greeks: {
        delta: num(d.delta),
        gamma: num(d.gamma),
        vega: num(d.vega),
        theta: num(d.theta),
        strike: num(d.strike),
        expiry,
      },
      source: 'marketdata',
    });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 502 });
  }
};
