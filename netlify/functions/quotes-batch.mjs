// Netlify Function: /api/quotes/batch
// Reçoit { symbols: [...] } et renvoie [{ ticker, price, day, week }] — la même
// forme que window.DXMock.batchQuotes, pour que le frontend la consomme sans changement.
// Source : Alpaca Market Data (snapshots + barres hebdo). Repli mock côté client si 5xx.

const DATA_BASE = 'https://data.alpaca.markets';
const FEED = process.env.ALPACA_DATA_FEED || 'iex'; // 'iex' (gratuit) ou 'sip' (payant)

function authHeaders() {
  return {
    'APCA-API-KEY-ID': process.env.ALPACA_API_KEY_ID,
    'APCA-API-SECRET-KEY': process.env.ALPACA_API_SECRET_KEY,
  };
}

export default async (req) => {
  if (!process.env.ALPACA_API_KEY_ID || !process.env.ALPACA_API_SECRET_KEY) {
    return Response.json({ error: 'no_keys' }, { status: 503 });
  }

  // Symboles depuis le corps JSON (POST) ou la query (?symbols=A,B)
  let symbols = [];
  try {
    const body = await req.json();
    symbols = body.symbols || [];
  } catch {
    const u = new URL(req.url);
    symbols = (u.searchParams.get('symbols') || '').split(',').filter(Boolean);
  }
  symbols = symbols.map(s => String(s).toUpperCase().trim()).filter(Boolean);
  if (!symbols.length) return Response.json([], { status: 200 });

  const list = encodeURIComponent(symbols.join(','));
  try {
    // 1) Snapshots : dernier trade + barre du jour + barre de la veille
    const snapRes = await fetch(`${DATA_BASE}/v2/stocks/snapshots?symbols=${list}&feed=${FEED}`, { headers: authHeaders() });
    if (!snapRes.ok) return Response.json({ error: 'alpaca_snapshots', http: snapRes.status }, { status: 502 });
    const snaps = await snapRes.json();

    // 2) Barres hebdomadaires (variation semaine, best-effort)
    let weekly = {};
    try {
      const wkRes = await fetch(`${DATA_BASE}/v2/stocks/bars?symbols=${list}&timeframe=1Week&limit=2&feed=${FEED}`, { headers: authHeaders() });
      if (wkRes.ok) weekly = (await wkRes.json()).bars || {};
    } catch { /* la variation semaine reste nulle */ }

    const out = symbols.map(sym => {
      const s = snaps[sym] || {};
      const price = s.latestTrade?.p ?? s.minuteBar?.c ?? s.dailyBar?.c ?? null;
      const prevClose = s.prevDailyBar?.c ?? null;
      const day = (price != null && prevClose) ? ((price - prevClose) / prevClose) * 100 : null;
      const wkBars = weekly[sym] || [];
      const wkClose = wkBars.length ? wkBars[0].c : null;
      const week = (price != null && wkClose) ? ((price - wkClose) / wkClose) * 100 : null;
      return {
        ticker: sym,
        price: price != null ? price.toFixed(2) : null,
        day: day != null ? day.toFixed(2) : null,
        week: week != null ? week.toFixed(2) : null,
      };
    });
    return Response.json(out, { status: 200 });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 502 });
  }
};
