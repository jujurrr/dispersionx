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

// Récupère le close d'il y a ~5 jours via Yahoo Finance (pas d'auth requise)
async function fetchWeekCloseYahoo(ticker) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=10d`;
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!r.ok) return null;
    const data = await r.json();
    const closes = data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close || [];
    const valid = closes.filter(c => c != null);
    if (valid.length < 2) return null;
    return valid[Math.max(0, valid.length - 6)]; // ~5 jours de bourse en arrière
  } catch { return null; }
}

// Enrichit week=null avec Yahoo Finance pour les résultats manquants
async function enrichWeekYahoo(results) {
  const missing = results.filter(r => r && r.week == null && r.price != null);
  if (!missing.length) return;
  const closes = await Promise.allSettled(missing.map(r => fetchWeekCloseYahoo(r.ticker)));
  missing.forEach((r, i) => {
    const weekClose = closes[i].status === 'fulfilled' ? closes[i].value : null;
    if (weekClose != null && weekClose !== 0) {
      const price = parseFloat(r.price);
      if (!isNaN(price)) r.week = (((price - weekClose) / weekClose) * 100).toFixed(2);
    }
  });
}

async function fetchAlpaca(symbols) {
  const list = encodeURIComponent(symbols.join(','));
  const snapRes = await fetch(`${DATA_BASE}/v2/stocks/snapshots?symbols=${list}&feed=${FEED}`, { headers: alpacaHeaders() });
  if (!snapRes.ok) return null;
  const snaps = await snapRes.json();

  // Barres journalières sur 7 jours pour la variation semaine
  let dailyBars = {};
  try {
    const symList = symbols.join(','); // virgules littérales, pas encodées
    const dRes = await fetch(`${DATA_BASE}/v2/stocks/bars?symbols=${symList}&timeframe=1Day&limit=7&feed=${FEED}`, { headers: alpacaHeaders() });
    if (dRes.ok) dailyBars = (await dRes.json()).bars || {};
  } catch { /* variation semaine optionnelle */ }

  return symbols.map(sym => {
    const s = snaps[sym] || {};
    const price = s.latestTrade?.p ?? s.minuteBar?.c ?? s.dailyBar?.c ?? null;
    const prevClose = s.prevDailyBar?.c ?? null;
    const day = (price != null && prevClose) ? ((price - prevClose) / prevClose) * 100 : null;
    const bars = dailyBars[sym] || [];
    const idx = Math.max(0, bars.length - 6);
    const weekClose = bars.length >= 2 ? bars[idx].c : null; // ~5 jours de bourse en arrière
    const week = (price != null && weekClose) ? ((price - weekClose) / weekClose) * 100 : null;
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

        // Enrichir avec variation semaine via barres journalières Alpaca
        if (process.env.ALPACA_API_KEY_ID) {
          try {
            const allTickers = valid.map(r => r.ticker);
            // Ne pas encoder les virgules — Alpaca attend des virgules littérales
            const symList = allTickers.join(',');
            const dRes = await fetch(`${DATA_BASE}/v2/stocks/bars?symbols=${symList}&timeframe=1Day&limit=7&feed=${FEED}`, { headers: alpacaHeaders() });
            if (dRes.ok) {
              const dailyBars = (await dRes.json()).bars || {};
              valid.forEach(r => {
                const bars = dailyBars[r.ticker] || [];
                // bars trié ASC : bars[0]=le plus ancien, bars[last]=hier
                // Pour variation 5j : prendre le bar à l'index max(0, length-6)
                const idx = Math.max(0, bars.length - 6);
                const weekClose = bars.length >= 2 ? bars[idx].c : null;
                if (weekClose && r.price) {
                  r.week = (((parseFloat(r.price) - weekClose) / weekClose) * 100).toFixed(2);
                }
              });
            }
          } catch { /* semaine optionnelle */ }

          // Fallback Yahoo Finance pour les semaines encore nulles
          await enrichWeekYahoo(valid);

          if (missing.length) {
            try {
              const alpacaFill = await fetchAlpaca(missing);
              const filled = (alpacaFill || []).filter(r => r.price != null);
              await enrichWeekYahoo(filled);
              return Response.json([...valid, ...filled], { status: 200 });
            } catch { /* retourne ce qu'on a */ }
          }
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
    await enrichWeekYahoo(out || []);
    return Response.json(out, { status: 200 });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 502 });
  }
};
