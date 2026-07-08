// GET /api/notifications/run?key=SECRET — producteur de notifications « système ».
// À appeler par un cron externe ~1×/jour. Aujourd'hui : expiration d'abonnement
// Pro (paliers 7/3/1 j). Les notifs grecs/P&L sont produites par snapshot-run ;
// la corrélation par alerts/run. Écrit dans la table `notifications` (voir
// SUPABASE_SETUP.md §17) via la clé service (hors RLS). Non-cassant : sans la
// table, les inserts échouent silencieusement.
export const config = { runtime: 'edge' };

import { subscriptionNotif, insertNotif } from '../_lib/notify.js';

const SB_BASE = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SB_KEY  = process.env.SUPABASE_SERVICE_KEY || '';
const sbHeaders = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' };

async function sbProAccess() {
  const url = `${SB_BASE}/rest/v1/pro_access?current_period_end=not.is.null&select=user_id,status,current_period_end`;
  const r = await fetch(url, { headers: sbHeaders, signal: AbortSignal.timeout(8000) });
  return r.ok ? r.json() : [];
}

export default async (req) => {
  const key = new URL(req.url).searchParams.get('key');
  const expected = process.env.ALERTS_KEY || process.env.WARM_KEY;
  if (!expected || key !== expected) return Response.json({ error: 'unauthorized' }, { status: 401 });
  if (!SB_BASE || !SB_KEY) return Response.json({ error: 'not_configured' }, { status: 501 });

  const rows = await sbProAccess();
  let checked = 0, notified = 0;
  for (const row of rows) {
    if (!row.user_id) continue;
    checked++;
    const n = subscriptionNotif(row);
    if (n && await insertNotif(SB_BASE, sbHeaders, row.user_id, n)) notified++;
  }
  return Response.json({ checked, notified });
};
