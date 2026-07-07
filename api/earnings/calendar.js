// POST /api/earnings/calendar
// Body: { tickers: string[], days?: number }
// Calendrier des résultats (earnings) à venir des composants, via Finnhub.
// Utile en dispersion : des earnings groupés dans la fenêtre = mouvements
// idiosyncratiques = corrélation réalisée plus faible = dispersion plus payante.
// Non-cassant : sans FINNHUB_API_KEY, renvoie unavailable:true.
export const config = { runtime: 'edge' };

const FINNHUB = 'https://finnhub.io/api/v1';
const ymd = d => new Date(d).toISOString().slice(0, 10);

export default async (req) => {
  let body = {};
  try { body = await req.json(); } catch {}
  const tickers = (body.tickers || []).map(s => String(s).toUpperCase()).slice(0, 30);
  const days = Math.max(7, Math.min(Number(body.days) || 45, 120));
  const token = process.env.FINNHUB_API_KEY;
  if (!tickers.length) return Response.json({ error: 'need_tickers' }, { status: 400 });
  if (!token) return Response.json({ unavailable: true, events: [] });

  const from = ymd(Date.now());
  const to = ymd(Date.now() + days * 86400000);
  try {
    const r = await fetch(`${FINNHUB}/calendar/earnings?from=${from}&to=${to}&token=${token}`, { signal: AbortSignal.timeout(9000) });
    if (!r.ok) return Response.json({ unavailable: true, events: [] });
    const j = await r.json();
    const set = new Set(tickers);
    const events = (j.earningsCalendar || [])
      .filter(e => e && e.symbol && set.has(String(e.symbol).toUpperCase()) && e.date)
      .map(e => ({ symbol: String(e.symbol).toUpperCase(), date: e.date, hour: e.hour || null, eps_est: e.epsEstimate ?? null }))
      .sort((a, b) => a.date.localeCompare(b.date));
    // dédoublonnage (Finnhub peut renvoyer plusieurs lignes par titre)
    const seen = new Set(), uniq = [];
    for (const e of events) { const k = e.symbol + '|' + e.date; if (!seen.has(k)) { seen.add(k); uniq.push(e); } }
    return Response.json({ events: uniq, from, to, days, n_tickers: tickers.length, count: uniq.length });
  } catch {
    return Response.json({ unavailable: true, events: [] });
  }
};
