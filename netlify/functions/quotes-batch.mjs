// Netlify Function: /api/quotes/batch
// Reçoit { symbols: [...] } et renvoie [{ ticker, price, day, week }]
// Cascade : Finnhub (temps réel) → Alpaca (iex, 15min délai) → erreur

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
  // Snapshots : Alpaca accepte les virgules encodées pour cet endpoint
  const listEncoded = encodeURIComponent(symbols.join(','));
  const snapRes = await fetch(`${DATA_BASE}/v2/stocks/snapshots?symbols=${listEncoded}&feed=${FEED}`, { headers: alpacaHeaders() });
  if (!snapRes.ok) return null;
  const snaps = await snapRes.json();

  let weekly = {};
  try {
    // Bars multi-symbols : pas d'encodage des virgules (Alpaca le rejette sinon)
    const listRaw = symbols.join(',');
    const wkRes = await fetch(`${DATA_BASE}/v2/stocks/bars?symbols=${listRaw}&timeframe=1Day&limit=10&feed=${FEED}`, { headers: alpacaHeaders() });
    if (wkRes.ok) weekly = (await wkRes.json()).bars || {};
  } catch { /* variation semaine optionnelle */ }

  return symbols.map(sym => {
    const s = snaps[sym] || {};
    const price = s.latestTrade?.p ?? s.minuteBar?.c ?? s.dailyBar?.c ?? null;
    const prevClose = s.prevDailyBar?.c ?? null;
    const day = (price != null && prevClose) ? ((price - prevClose) / prevClose) * 100 : null;
    const bars = weekly[sym] || [];
    // ~5 séances de trading en arrière
    const idx = Math.max(0, bars.length - 6);
    const wkClose = bars.length >= 2 ? bars[idx]?.c : null;
    const week = (price != null && wkClose) ? ((price - wkClose) / wkClose) * 100 : null;
    return {
      ticker: sym,
      price: price != null ? price.toFixed(2) : null,
      day: day != null ? day.toFixed(2) : null,
      week: week != null ? week.toFixed(2) : null,
    };
  });
}

async function fetchWeekCloseYahoo(ticker) {
  try {
    const r = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=10d`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    if (!r.ok) return null;
    const closes = (await r.json())?.chart?.result?.[0]?.indicators?.quote?.[0]?.close || [];
    const valid = closes.filter(c => c != null);
    return valid.length >= 2 ? valid[Math.max(0, valid.length - 6)] : null;
  } catch { return null; }
}

async function enrichWeekYahoo(results) {
  const missing = results.filter(r => r && r.week == null && r.price != null);
  if (!missing.length) return;
  const closes = await Promise.allSettled(missing.map(r => fetchWeekCloseYahoo(r.ticker)));
  missing.forEach((r, i) => {
    const wkClose = closes[i].status === 'fulfilled' ? closes[i].value : null;
    if (wkClose != null && wkClose !== 0) {
      const price = parseFloat(r.price);
      if (!isNaN(price)) r.week = ((price - wkClose) / wkClose * 100).toFixed(2);
    }
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

  // Essai Finnhub en priorité
  if (finnhubKey) {
    try {
      const finnhubResults = await fetchFinnhub(symbols, finnhubKey);
      const valid = finnhubResults.filter(Boolean);
      // Si Finnhub répond pour au moins la moitié des symboles, on retourne
      if (valid.length >= Math.ceil(symbols.length / 2)) {
        // Pour les symboles manquants, compléter avec Alpaca si disponible
        const missing = symbols.filter((_, i) => !finnhubResults[i]);
        if (missing.length && process.env.ALPACA_API_KEY_ID) {
          try {
            const alpacaFill = await fetchAlpaca(missing);
            const combined = [...valid, ...alpacaFill.filter(r => r.price != null)];
            await enrichWeekYahoo(combined);
            return Response.json(combined, { status: 200 });
          } catch { /* on retourne ce qu'on a */ }
        }
        await enrichWeekYahoo(valid);
        return Response.json(valid, { status: 200 });
      }
    } catch { /* fallback Alpaca */ }
  }

  // Fallback Alpaca
  if (!process.env.ALPACA_API_KEY_ID || !process.env.ALPACA_API_SECRET_KEY) {
    return Response.json({ error: 'no_keys' }, { status: 503 });
  }
  try {
    const out = await fetchAlpaca(symbols);
    await enrichWeekYahoo(out);
    return Response.json(out, { status: 200 });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 502 });
  }
};
