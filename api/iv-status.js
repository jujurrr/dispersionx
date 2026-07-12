// GET /api/iv-status            → résumé : jours d'historique d'IV par symbole.
// GET /api/iv-status?symbol=XYZ → détail d'un symbole (jours, dates, min/max, prêt).
// Diagnostic de la montée en charge du VRAI IV Rank (table Supabase iv_history).
// Non-cassant : sans Supabase / sans la table → { enabled:false } ou note claire.
export const config = { runtime: 'edge' };

import { allow, tooMany } from './_lib/ratelimit.js';
import { signalRowCount } from './_lib/signal-history.js';

const BASE = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const KEY  = process.env.SUPABASE_SERVICE_KEY || '';
const enabled = !!(BASE && KEY);
const READY_DAYS = 60;              // seuil à partir duquel le vrai IV Rank pilote le score
const FETCH_CAP  = 100000;

async function q(path) {
  const r = await fetch(`${BASE}/rest/v1/${path}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
    signal: AbortSignal.timeout(6000),
  });
  if (!r.ok) return null;
  return r.json();
}

export default async (req) => {
  if (!allow(req, { limit: 60, windowMs: 10000 })) return tooMany();
  if (!enabled) {
    return Response.json({ enabled: false, note: 'Supabase non configuré côté serveur (SUPABASE_SERVICE_KEY absent).' });
  }
  const sym = new URL(req.url).searchParams.get('symbol');
  try {
    if (sym) {
      const rows = await q(`iv_history?symbol=eq.${encodeURIComponent(sym.toUpperCase())}&select=d,iv&order=d.asc`);
      if (!rows) return Response.json({ enabled: true, error: 'table_indisponible', note: 'La table public.iv_history existe-t-elle ? (SUPABASE_SETUP.md §7)' });
      const ivs = rows.map(r => Number(r.iv)).filter(v => v > 0);
      const n = ivs.length;
      return Response.json({
        enabled: true, symbol: sym.toUpperCase(), n_days: n,
        first: rows[0]?.d ?? null, last: rows[n - 1]?.d ?? null,
        iv_min: n ? Number(Math.min(...ivs).toFixed(1)) : null,
        iv_max: n ? Number(Math.max(...ivs).toFixed(1)) : null,
        ready: n >= READY_DAYS, ready_at_days: READY_DAYS,
      });
    }
    // Résumé tous symboles : on compte les jours par symbole côté JS.
    const rows = await q(`iv_history?select=symbol&order=symbol&limit=${FETCH_CAP}`);
    if (!rows) return Response.json({ enabled: true, error: 'table_indisponible', note: 'Crée la table public.iv_history (SUPABASE_SETUP.md §7).' });
    const counts = {};
    for (const r of rows) counts[r.symbol] = (counts[r.symbol] || 0) + 1;
    const symbols = Object.entries(counts)
      .map(([symbol, n_days]) => ({ symbol, n_days, ready: n_days >= READY_DAYS }))
      .sort((a, b) => b.n_days - a.n_days);
    return Response.json({
      enabled: true,
      total_rows: rows.length,
      total_symbols: symbols.length,
      ready_count: symbols.filter(s => s.ready).length,
      ready_at_days: READY_DAYS,
      signal_history_rows: await signalRowCount(),   // #0 dataset de validation du score
      capped: rows.length >= FETCH_CAP,   // au-delà, utiliser ?symbol= pour le détail exact
      symbols,
    });
  } catch (e) {
    return Response.json({ enabled: true, error: 'query_failed', message: String((e && e.message) || e) });
  }
};
