// GET /api/monitor/snapshot-run?key=SECRET — relevé des positions ouvertes.
// À appeler par un cron externe (ex. cron-job.org). Cadence au choix : 1×/jour
// après clôture US (historique quotidien) OU toutes les 15 min pendant la séance
// (suivi intraday). 15 min = plancher utile (différé Cboe) ; plus fréquent =
// mêmes données. Pour CHAQUE position ouverte (cloud Supabase), reprend la
// stratégie au marché réel Cboe et append un snapshot mark-to-market :
//   { taken_at, total_pnl (vs entrée), daily_pnl (vs dernier relevé), net_vega,
//     net_theta, dte, coverage, mtm:true }
// puis COMPACTE l'historique (tout le jour + 1 clôture/jour antérieur) → le
// jsonb reste borné même à 15 min. La courbe P&L et les Δ se construisent ainsi.
//
// Nécessite SUPABASE_URL + SUPABASE_SERVICE_KEY (mêmes variables que alerts/run,
// clé service = accès à toutes les positions, hors RLS). Positions locales
// (navigateur) non concernées : elles n'existent pas côté serveur.
export const config = { runtime: 'edge' };

import { repriceStrategy, cboeMarket, compactSnapshots } from '../_lib/reprice.js';

const SB_BASE = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SB_KEY  = process.env.SUPABASE_SERVICE_KEY || '';
const sbHeaders = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' };

async function sbOpenPositions() {
  const url = `${SB_BASE}/rest/v1/positions?status=eq.open&select=id,strategy,snapshots`;
  const r = await fetch(url, { headers: sbHeaders, signal: AbortSignal.timeout(8000) });
  return r.ok ? r.json() : [];
}
async function sbPatchSnapshots(id, snapshots) {
  return fetch(`${SB_BASE}/rest/v1/positions?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...sbHeaders, Prefer: 'return=minimal' },
    body: JSON.stringify({ snapshots }),
    signal: AbortSignal.timeout(6000),
  });
}

// Dernier P&L mark-to-market déjà enregistré (pour le P&L quotidien).
function lastMtmPnl(snaps) {
  for (let i = (snaps || []).length - 1; i >= 0; i--) {
    if (snaps[i] && snaps[i].mtm && typeof snaps[i].total_pnl === 'number') return snaps[i].total_pnl;
  }
  return null;
}

export default async (req) => {
  const key = new URL(req.url).searchParams.get('key');
  const expected = process.env.ALERTS_KEY || process.env.WARM_KEY;
  if (!expected || key !== expected) return Response.json({ error: 'unauthorized' }, { status: 401 });
  if (!SB_BASE || !SB_KEY) return Response.json({ error: 'not_configured' }, { status: 501 });

  const positions = await sbOpenPositions();
  if (!positions.length) return Response.json({ checked: 0, snapped: 0 });

  let snapped = 0, failed = 0;
  // Séquentiel : ménage le CDN Cboe (throttlé) ; le cache 15 min partagé
  // dédoublonne les symboles récurrents entre positions.
  for (const p of positions) {
    const strategy = p.strategy;
    if (!strategy || !Array.isArray(strategy.components) || !strategy.components.length) continue;
    try {
      const v = await repriceStrategy(strategy, cboeMarket);
      const prev = lastMtmPnl(p.snapshots);
      const snap = {
        taken_at: v.asof,
        total_pnl: v.total_pnl,
        daily_pnl: prev == null ? null : Math.round((v.total_pnl - prev) * 100) / 100,
        net_vega: v.net_vega,
        net_theta: v.net_theta,
        dte: v.dte,
        coverage: v.coverage,
        mtm: true,
      };
      const snaps = Array.isArray(p.snapshots) ? p.snapshots.slice() : [];
      snaps.push(snap);
      // Compaction : autorise une cadence intraday (jusqu'à 15 min, le plancher
      // du différé Cboe) sans faire grossir le jsonb — tout le jour + 1 clôture
      // par jour antérieur.
      const r = await sbPatchSnapshots(p.id, compactSnapshots(snaps));
      if (r && r.ok) snapped++; else failed++;
    } catch { failed++; }
  }
  return Response.json({ checked: positions.length, snapped, failed });
};
