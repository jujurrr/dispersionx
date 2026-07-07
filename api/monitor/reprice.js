// POST /api/monitor/reprice  — reprise (mark-to-market) d'une stratégie à la
// demande, à partir des données RÉELLES Cboe (spot + IV ATM par jambe).
// Body : { strategy } (l'objet dx-strategy-<liste>). Renvoie le P&L théorique
// piloté par le marché réel + l'IV par jambe + la couverture. Sert au bouton
// « Snapshot » (positions locales ET cloud) ; le cron réutilise la même lib.
export const config = { runtime: 'edge' };

import { repriceStrategy, cboeMarket } from '../_lib/reprice.js';

export default async (req) => {
  if (req.method !== 'POST') return Response.json({ error: 'method_not_allowed' }, { status: 405 });
  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'bad_json' }, { status: 400 }); }
  const strategy = body && body.strategy;
  if (!strategy || !Array.isArray(strategy.components)) {
    return Response.json({ error: 'no_strategy' }, { status: 400 });
  }
  try {
    const v = await repriceStrategy(strategy, cboeMarket);
    return Response.json(v, {
      headers: { 'Cache-Control': 'no-store' },   // reprise instantanée, jamais mise en cache
    });
  } catch (e) {
    return Response.json({ error: 'reprice_failed', detail: (e && e.message) || String(e) }, { status: 502 });
  }
};
