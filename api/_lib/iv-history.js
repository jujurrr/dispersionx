// Historique d'IV ATM (Supabase) → vrai IV Rank 52 semaines façon broker.
// Une ligne par (symbol, date) : l'IV ATM réelle du jour. Alimenté par le
// réchauffeur (api/warm.js) et opportunistiquement par le scoring. Lu pour
// calculer l'IV Rank standard dès qu'assez de jours sont accumulés.
//
// Non-cassant : sans SUPABASE_URL + SUPABASE_SERVICE_KEY (ou sans la table
// public.iv_history), toutes les fonctions sont des no-op / retournent null →
// l'app retombe sur l'IV-rank ESTIMÉ (HV). Écritures via la clé service.

const BASE = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const KEY  = process.env.SUPABASE_SERVICE_KEY || '';
const enabled = !!(BASE && KEY);

function ymd(ts = Date.now()) { return new Date(ts).toISOString().slice(0, 10); }

// Enregistre l'IV du jour (idempotent par symbole+date : upsert → une ligne/jour,
// dernière valeur du jour conservée). Best-effort : un échec ne casse rien.
export async function recordIv(symbol, iv) {
  if (!enabled || !(iv > 0)) return;
  try {
    await fetch(`${BASE}/rest/v1/iv_history`, {
      method: 'POST',
      headers: {
        apikey: KEY, Authorization: `Bearer ${KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',   // upsert sur (symbol, d)
      },
      body: JSON.stringify({ symbol: String(symbol).toUpperCase(), d: ymd(), iv: Number(iv) }),
      signal: AbortSignal.timeout(3000),
    });
  } catch { /* best-effort */ }
}

// Vrai IV Rank sur ~52 semaines à partir de l'historique enregistré :
//   rank = (IV_actuelle − IV_min_52s) / (IV_max_52s − IV_min_52s) × 100
// Retourne { rank, min, max, n_days } si assez d'historique (≥ minDays),
// sinon { n_days, insufficient:true }, ou null (Supabase/table indispo).
export async function ivRankFromHistory(symbol, currentIv, minDays = 20) {
  if (!enabled || !(currentIv > 0)) return null;
  try {
    const since = ymd(Date.now() - 372 * 86400000);   // ~53 semaines de marge
    const r = await fetch(
      `${BASE}/rest/v1/iv_history?symbol=eq.${encodeURIComponent(String(symbol).toUpperCase())}&d=gte.${since}&select=iv&order=d.asc`,
      { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` }, signal: AbortSignal.timeout(3500) }
    );
    if (!r.ok) return null;
    const rows = await r.json();
    const ivs = (Array.isArray(rows) ? rows : []).map(x => Number(x.iv)).filter(v => v > 0);
    if (ivs.length < minDays) return { n_days: ivs.length, insufficient: true };
    // Le range 52s inclut le point courant (garantit 0 ≤ rank ≤ 100).
    const min = Math.min(...ivs, currentIv), max = Math.max(...ivs, currentIv);
    const rank = max > min ? Math.round(Math.max(0, Math.min(100, (currentIv - min) / (max - min) * 100))) : 50;
    return { rank, min: Number(min.toFixed(1)), max: Number(max.toFixed(1)), n_days: ivs.length };
  } catch { return null; }
}
