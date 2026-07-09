// GET /api/earnings/warm?key=SECRET — pré-remplit le cache earnings (Supabase),
// de façon RÉGULÉE (≈1 appel/s → sous les 60/min de Finnhub) et en ROTATION
// (une tranche de l'univers par exécution). À appeler par un cron externe toutes
// les ~3 min (mêmes WARM_KEY/ALERTS_KEY que les autres crons).
//
// But : /api/stocks/auto-score LIT ce cache au lieu d'appeler Finnhub par action
// pendant le scoring interactif → plus de rate-limit ni de « momentanément
// indisponible » quand on descend dans la liste des composants d'un indice.
export const config = { runtime: 'edge' };

import { INDEX_DATA } from '../indices/[symbol]/components.js';
import { kvCacheSet } from '../_lib/iv-cache.js';

const HORIZON = 60;      // fenêtre de détection (jours) — alignée sur auto-score
const CHUNK   = 12;      // symboles/exécution (tient sous ~20 s d'edge)
const PACE_MS = 900;     // ~1 appel/s → sous les 60/min de Finnhub
const ROTATE_MS = 3 * 60000;

// Univers = tickers uniques de tous les indices (listes figées de components.js).
const UNIVERSE = (() => {
  const set = new Set();
  for (const arr of Object.values(INDEX_DATA)) for (const row of (arr || [])) if (row && row[0]) set.add(String(row[0]).toUpperCase());
  return [...set];
})();

const sleep = ms => new Promise(r => setTimeout(r, ms));
const ymd = d => new Date(d).toISOString().slice(0, 10);

async function warmOne(sym, token) {
  const from = ymd(Date.now()), to = ymd(Date.now() + HORIZON * 86400000);
  try {
    const r = await fetch(`https://finnhub.io/api/v1/calendar/earnings?symbol=${encodeURIComponent(sym)}&from=${from}&to=${to}&token=${token}`, { signal: AbortSignal.timeout(6000) });
    if (!r.ok) return false;
    const dates = ((await r.json())?.earningsCalendar || []).map(e => e && e.date).filter(d => d && d >= from).sort();
    await kvCacheSet('EARN:' + sym, dates.length ? { date: dates[0] } : { none: true });
    return true;
  } catch { return false; }
}

export default async (req) => {
  const key = new URL(req.url).searchParams.get('key');
  const expected = process.env.WARM_KEY || process.env.ALERTS_KEY;
  if (!expected || key !== expected) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const token = process.env.FINNHUB_API_KEY;
  if (!token) return Response.json({ error: 'no_finnhub_key' }, { status: 501 });

  // Rotation : une tranche différente à chaque exécution → couvre tout l'univers
  // sur plusieurs passes, puis le rafraîchit en boucle.
  const chunks = Math.max(1, Math.ceil(UNIVERSE.length / CHUNK));
  const idx = Math.floor(Date.now() / ROTATE_MS) % chunks;
  const batch = UNIVERSE.slice(idx * CHUNK, idx * CHUNK + CHUNK);

  let warmed = 0;
  for (const sym of batch) {
    if (await warmOne(sym, token)) warmed++;
    await sleep(PACE_MS);
  }
  return Response.json({ chunk: idx, chunks, batch: batch.length, warmed, universe: UNIVERSE.length });
};
