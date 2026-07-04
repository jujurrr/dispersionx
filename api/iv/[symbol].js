// GET /api/iv/[symbol]?dte=30
// IV RÉELLES depuis le CDN de cotations différées du Cboe (15 min de délai,
// gratuit, sans clé API) : IV ATM interpolée au DTE demandé, iv30 officielle
// du Cboe (la valeur affichée par IBKR), structure par terme et grecs ATM.
// La réponse est mise en cache par le CDN 15 min (s-maxage) : un symbole
// n'est re-téléchargé du Cboe qu'une fois par quart d'heure, quel que soit
// le nombre de visiteurs — les endpoints batch s'appuient dessus.
export const config = { runtime: 'edge' };

import { cboeIvBundle } from '../_lib/cboe.js';

export default async (req) => {
  const url = new URL(req.url);
  const parts = url.pathname.split('/');
  const symbol = decodeURIComponent(parts[3] || '').toUpperCase().trim();
  const dteTarget = Math.max(5, Math.min(Number(url.searchParams.get('dte')) || 30, 180));
  if (!symbol) return Response.json({ error: 'symbol_required' }, { status: 400 });

  const bundle = await cboeIvBundle(symbol, dteTarget);
  if (!bundle) return Response.json({ error: 'no_iv_data', symbol }, { status: 502 });

  // Structure par terme compacte (≤ 10 points répartis)
  const term = bundle.term || [];
  const step = Math.max(1, Math.ceil(term.length / 10));
  const termOut = term.filter((_, i) => i % step === 0 || i === term.length - 1);

  return Response.json({ ...bundle, term: termOut }, {
    headers: {
      'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600',
      'Netlify-CDN-Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600',
    },
  });
};
