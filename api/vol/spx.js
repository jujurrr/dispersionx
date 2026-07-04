// GET /api/vol/spx
// IV ATM réelle + HV30/HV252 + structure par terme du VRAI SPX
// Sources : Cboe delayed quotes (IV/terme/grecs, différé 15 min, gratuit)
//           + historique Cboe du _SPX pour la HV (repli Yahoo SPY).
export const config = { runtime: 'edge' };

import { cboeIvBundle, fetchClosesSmart } from '../_lib/cboe.js';

function hvFromCloses(closes, window) {
  if (!closes || closes.length < window + 1) return null;
  const rets = [];
  for (let i = closes.length - window; i < closes.length; i++) rets.push(Math.log(closes[i] / closes[i - 1]));
  const m = rets.reduce((a, b) => a + b, 0) / rets.length;
  const v = rets.reduce((a, b) => a + (b - m) ** 2, 0) / (rets.length - 1);
  return Number((Math.sqrt(v * 252) * 100).toFixed(1));
}

export default async () => {
  const [bundle, closes] = await Promise.all([
    cboeIvBundle('SPX', 30),
    fetchClosesSmart('SPX', 300),   // _SPX chez le Cboe : vraies clôtures de l'indice
  ]);

  const hv30  = hvFromCloses(closes, 30);
  const hv252 = hvFromCloses(closes, 252);

  // Repli honnête : sans donnée d'options, l'IV est marquée estimée
  const ivAtm = bundle?.iv ?? (hv30 ? Number((hv30 * 1.12).toFixed(1)) : null);

  return Response.json({
    iv_atm:      ivAtm,
    iv30:        bundle?.iv30 ?? null,
    hv30,
    hv252,
    iv_minus_hv: ivAtm != null && hv30 != null ? Number((ivAtm - hv30).toFixed(1)) : null,
    term:        bundle?.term ?? null,
    spot:        bundle?.spot ?? null,
    asof:        bundle?.asof ?? null,
    source:      bundle ? 'cboe_delayed' : 'hv_estimate',
  }, {
    headers: {
      'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600',
      'Netlify-CDN-Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600',
    },
  });
};
