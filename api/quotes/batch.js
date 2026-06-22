// POST { symbols: [...] } → [{ ticker, price, day, week }]
// Cascade : Finnhub (temps réel) → Alpaca iex (15min délai)
export const config = { runtime: 'edge' };

const FINNHUB_BASE = 'https://finnhub.io/api/v1';
const DATA_BASE = 'https://data.alpaca.markets';
const FEED = process.env.ALPACA_DATA_FEED || 'iex';

function alpacaHeaders() {
  return {
    'APCA-API-KEY-ID': process.env.ALPACA_API_KEY_ID,
    'APCA-API-SECRET-KEY': process.env.ALPACA_API_SECRET_KEY,
  };
}

async function fetchFinnhub(symbols, token) {
  const results = await Promise.allSettled(
    symbols.map(sym =>
      fetch(`${FINNHUB_BASE}/quote?symbol=${sym}&token=${token}`)
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (!d || d.c == null || d.c === 0) return null;
          const day = d.pc ? ((d.c - d.pc) / d.pc) * 100 : null;
          return { ticker: sym, price: d.c.toFixed(2), day: day != null ? day.toFixed(2) : null, week: null };
        })
        .catch(() => null)
    )
  );
  return results.map(r => (r.status === 'fulfilled' ? r.value : null));
}

async function fetchAlpaca(symbols) {
  const list = encodeURIComponent(symbols.join(','));
  const snapRes = await fetch(`${DATA_BASE}/v2/stocks/snapshots?symbols=${list}&feed=${FEED}`, { headers: alpacaHeaders() });
  if (!snapRes.ok) return null;
  const snaps = await snapRes.json();

  let weekly = {};
  try {
    const wkRes = await fetch(`${DATA_BASE}/v2/stocks/bars?symbols=${list}&timeframe=1Week&limit=2&feed=${FEED}`, { headers: alpacaHeaders() });
    if (wkRes.ok) weekly = (await wkRes.json()).bars || {};
  } catch { /* variation semaine optionnelle */ }

  return symbols.map(sym => {
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
}

export default async (req) => {
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

  const finnhubKey = process.env.FINNHUB_API_KEY;

  if (finnhubKey) {
    try {
      const finnhubResults = await fetchFinnhub(symbols, finnhubKey);
      const valid = finnhubResults.filter(Boolean);
      if (valid.length >= Math.ceil(symbols.length / 2)) {
        const missing = symbols.filter((_, i) => !finnhubResults[i]);
        if (missing.length && process.env.ALPACA_API_KEY_ID) {
          try {
            const alpacaFill = await fetchAlpaca(missing);
            return Response.json([...valid, ...(alpacaFill || []).filter(r => r.price != null)], { status: 200 });
          } catch { /* retourne ce qu'on a */ }
        }
        return Response.json(valid, { status: 200 });
      }
    } catch { /* fallback Alpaca */ }
  }

  if (!process.env.ALPACA_API_KEY_ID || !process.env.ALPACA_API_SECRET_KEY) {
    return Response.json({ error: 'no_keys' }, { status: 503 });
  }
  try {
    const out = await fetchAlpaca(symbols);
    return Response.json(out, { status: 200 });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 502 });
  }
};
