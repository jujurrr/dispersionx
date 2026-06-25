// Netlify Function: /api/marketcap
// Reçoit { symbols: [...] } et renvoie [{ ticker, mcap }]
// mcap = capitalisation boursière en millions USD (null si indisponible).
// Source : Finnhub /stock/profile2 → fallback Yahoo Finance quote v7.
// Sert au dimensionnement cap-weighted (poids type indice) de la dispersion.

const FINNHUB_BASE = 'https://finnhub.io/api/v1';

async function finnhubMcap(sym, token) {
  try {
    const r = await fetch(`${FINNHUB_BASE}/stock/profile2?symbol=${encodeURIComponent(sym)}&token=${token}`);
    if (!r.ok) return null;
    const d = await r.json();
    const mc = d && d.marketCapitalization;     // millions USD
    return (mc && mc > 0) ? mc : null;
  } catch { return null; }
}

async function yahooMcap(sym) {
  try {
    const r = await fetch(
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(sym)}`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    if (!r.ok) return null;
    const q = (await r.json())?.quoteResponse?.result?.[0];
    const mc = q && q.marketCap;                // USD absolu
    return (mc && mc > 0) ? mc / 1e6 : null;     // → millions, cohérent avec Finnhub
  } catch { return null; }
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

  const token = process.env.FINNHUB_API_KEY;
  const out = await Promise.all(symbols.map(async sym => {
    let mcap = token ? await finnhubMcap(sym, token) : null;
    if (mcap == null) mcap = await yahooMcap(sym);
    return { ticker: sym, mcap: mcap != null ? Math.round(mcap) : null };
  }));
  return Response.json(out, { status: 200 });
};
