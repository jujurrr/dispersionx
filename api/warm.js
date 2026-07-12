// GET /api/warm?key=SECRET — « réchauffeur » du cache d'IV.
// À appeler toutes les ~10 min (cron externe gratuit, ex. cron-job.org).
// Il re-télécharge en DOUCEUR (faible concurrence → pas de throttling) les
// symboles courants et rafraîchit le cache Supabase partagé. Ainsi, quand un
// utilisateur charge une page en rafale, l'app LIT le cache au lieu de marteler
// le Cboe → plus d'estimation 128, quelle que soit la région de l'utilisateur.
export const config = { runtime: 'edge' };

import { cboeIvBundle } from './_lib/cboe.js';
import { recordIv } from './_lib/iv-history.js';

// Indices + composants courants des listes de démo. Ajuste au besoin.
const SYMBOLS = [
  'SPX', 'NDX', 'DJI', 'CAC', 'DAX',
  'AAPL', 'MSFT', 'NVDA', 'AMZN', 'META', 'TSLA', 'AVGO', 'GOOGL',
  'COST', 'NFLX', 'AMD', 'JPM', 'V', 'UNH', 'LLY', 'GS', 'HD', 'CAT', 'ZS',
];

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) { const i = next++; out[i] = await fn(items[i]); }
  }));
  return out;
}

export default async (req) => {
  const key = new URL(req.url).searchParams.get('key');
  if (!process.env.WARM_KEY || key !== process.env.WARM_KEY) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  const t0 = Date.now();
  // Concurrence 4 = assez doux pour ne pas déclencher le throttling Cboe.
  const res = await mapLimit(SYMBOLS, 4, async (s) => {
    const b = await cboeIvBundle(s, 30, 12000, true).catch(() => null);   // force le rafraîchissement
    if (b?.iv != null) recordIv(s, b.iv).catch(() => {});   // snapshot d'IV du jour → historique → vrai IV Rank
    return b?.iv != null;
  });
  const warmed = res.filter(Boolean).length;
  return Response.json({ warmed, total: SYMBOLS.length, ms: Date.now() - t0 });
};
