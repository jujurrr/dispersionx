export const config = { runtime: 'edge' };

import { fetchCboeCloses } from './_lib/cboe.js';

// GET /api/health            → statut de base
// GET /api/health?probe=data → teste en plus la joignabilité de la source Cboe
//                              (latence + ok/ko), pour le monitoring.
export default async (req) => {
  const day = new Date().getDay();
  const body = {
    status: 'ok',
    market_open: day >= 1 && day <= 5,
    timestamp: new Date().toISOString(),
  };

  let probe = false;
  try { probe = new URL(req.url).searchParams.get('probe') === 'data'; } catch {}
  if (probe) {
    const t0 = Date.now();
    const closes = await fetchCboeCloses('SPY', 5).catch(() => null);
    body.data_source = {
      provider: 'cboe_delayed',
      ok: Array.isArray(closes) && closes.length > 0,
      latency_ms: Date.now() - t0,
    };
  }

  return Response.json(body);
};
