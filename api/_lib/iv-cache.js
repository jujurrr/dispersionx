// Cache d'IV PARTAGÉ (Supabase) — indépendant de la région Vercel.
// Problème résolu : le cache CDN de /api/iv est PAR RÉGION ; si une région
// n'arrive pas à joindre le Cboe (throttling), elle retombe sur l'estimation
// HV×1.15. Ici, dès qu'UNE région récupère un symbole, il est stocké dans
// Supabase et TOUTES les régions le lisent (IV réelle, fiable, ~15 min).
//
// Non-cassant : sans SUPABASE_SERVICE_KEY (variable d'env serveur), le cache
// est désactivé et le comportement actuel est conservé. Écritures via la clé
// service (serveur uniquement, jamais exposée au client).

const BASE = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const KEY  = process.env.SUPABASE_SERVICE_KEY || '';
const TTL_MS = 15 * 60 * 1000;   // fraîcheur = délai Cboe (15 min)
const enabled = !!(BASE && KEY);

export async function ivCacheGet(symbol, dte) {
  if (!enabled) return null;
  try {
    const r = await fetch(
      `${BASE}/rest/v1/iv_cache?symbol=eq.${encodeURIComponent(symbol)}&dte=eq.${dte}&select=payload,fetched_at`,
      { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` }, signal: AbortSignal.timeout(3000) }
    );
    if (!r.ok) return null;
    const rows = await r.json();
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row || !row.payload) return null;
    if (Date.now() - new Date(row.fetched_at).getTime() > TTL_MS) return null;   // périmé
    return row.payload;
  } catch { return null; }
}

export async function ivCacheSet(symbol, dte, payload) {
  if (!enabled || !payload) return;
  try {
    await fetch(`${BASE}/rest/v1/iv_cache`, {
      method: 'POST',
      headers: {
        apikey: KEY, Authorization: `Bearer ${KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',   // upsert sur (symbol, dte)
      },
      body: JSON.stringify({ symbol, dte, payload, fetched_at: new Date().toISOString() }),
      signal: AbortSignal.timeout(3000),
    });
  } catch { /* best-effort : un échec d'écriture ne casse rien */ }
}

// ── Cache générique (même table iv_cache, dte=0) pour des payloads non-IV avec
//    un TTL au choix — ex. calendrier earnings global. Clé = `key` (sentinelle,
//    pas un vrai symbole). ─────────────────────────────────────────────────────
export async function kvCacheGet(key, ttlMs) {
  if (!enabled) return null;
  try {
    const r = await fetch(
      `${BASE}/rest/v1/iv_cache?symbol=eq.${encodeURIComponent(key)}&dte=eq.0&select=payload,fetched_at`,
      { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` }, signal: AbortSignal.timeout(4000) }
    );
    if (!r.ok) return null;
    const row = (await r.json())?.[0];
    if (!row || !row.payload) return null;
    if (Date.now() - new Date(row.fetched_at).getTime() > ttlMs) return null;   // périmé
    return row.payload;
  } catch { return null; }
}
export async function kvCacheSet(key, payload) {
  if (!enabled || !payload) return;
  try {
    await fetch(`${BASE}/rest/v1/iv_cache`, {
      method: 'POST',
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({ symbol: key, dte: 0, payload, fetched_at: new Date().toISOString() }),
      signal: AbortSignal.timeout(4000),
    });
  } catch { /* best-effort */ }
}
