// POST { index } → { index, constituents: [tickers] }
// Liste complète des constituants d'un indice via Finnhub /index/constituents.
// Repli (liste vide) géré côté client avec la base connue.
export const config = { runtime: 'edge' };

const FINNHUB_BASE = 'https://finnhub.io/api/v1';
const IDX = { SPX: '^GSPC', NDX: '^NDX', DJI: '^DJI', CAC: '^FCHI', DAX: '^GDAXI' };

export default async (req) => {
  let index = '';
  try { index = (await req.json()).index || ''; }
  catch { index = new URL(req.url).searchParams.get('index') || ''; }
  index = String(index).toUpperCase().trim();

  const sym = IDX[index];
  const token = process.env.FINNHUB_API_KEY;
  if (!sym || !token) return Response.json({ index, constituents: [] }, { status: 200 });

  try {
    const r = await fetch(`${FINNHUB_BASE}/index/constituents?symbol=${encodeURIComponent(sym)}&token=${token}`);
    if (!r.ok) return Response.json({ index, constituents: [] }, { status: 200 });
    const d = await r.json();
    const list = Array.isArray(d?.constituents) ? d.constituents.map(s => String(s).toUpperCase()) : [];
    return Response.json({ index, constituents: list }, { status: 200 });
  } catch {
    return Response.json({ index, constituents: [] }, { status: 200 });
  }
};
