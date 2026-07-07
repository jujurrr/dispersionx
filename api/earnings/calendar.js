// POST /api/earnings/calendar
// Body: { tickers: string[], days?: number }
// Prochains résultats (earnings) des tickers demandés, via Finnhub — requête
// PAR SYMBOLE (plus fiable que l'appel global). Utile en dispersion : des
// earnings groupés = mouvements idiosyncratiques = corrélation réalisée plus
// faible = dispersion plus payante. Sans FINNHUB_API_KEY → unavailable:true.
export const config = { runtime: 'edge' };

const FINNHUB = 'https://finnhub.io/api/v1';
const ymd = d => new Date(d).toISOString().slice(0, 10);

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) { const i = next++; out[i] = await fn(items[i]); }
  }));
  return out;
}

async function oneSymbol(sym, from, to, token) {
  try {
    const r = await fetch(`${FINNHUB}/calendar/earnings?symbol=${encodeURIComponent(sym)}&from=${from}&to=${to}&token=${token}`, { signal: AbortSignal.timeout(6000) });
    if (!r.ok) return [];
    const j = await r.json();
    return (j.earningsCalendar || [])
      .filter(e => e && e.date)
      .map(e => ({ symbol: sym, date: e.date, hour: e.hour || null, eps_est: e.epsEstimate ?? null }));
  } catch { return []; }
}

export default async (req) => {
  let body = {};
  try { body = await req.json(); } catch {}
  const tickers = [...new Set((body.tickers || []).map(s => String(s).toUpperCase()))].slice(0, 40);
  const days = Math.max(7, Math.min(Number(body.days) || 45, 180));
  const token = process.env.FINNHUB_API_KEY;
  if (!tickers.length) return Response.json({ error: 'need_tickers' }, { status: 400 });
  if (!token) return Response.json({ unavailable: true, events: [] });

  const from = ymd(Date.now());
  const to = ymd(Date.now() + days * 86400000);
  const lists = await mapLimit(tickers, 6, t => oneSymbol(t, from, to, token));

  // Fusionne, garde le PROCHAIN earnings par symbole, trie par date.
  const byNext = {};
  for (const arr of lists) for (const e of arr) {
    if (e.date < from || e.date > to) continue;
    if (!byNext[e.symbol] || e.date < byNext[e.symbol].date) byNext[e.symbol] = e;
  }
  const events = Object.values(byNext).sort((a, b) => a.date.localeCompare(b.date));
  return Response.json({ events, from, to, days, requested: tickers.length, count: events.length });
};
