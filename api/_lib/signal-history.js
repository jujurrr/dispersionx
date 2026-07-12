// Historique des SIGNAUX (Supabase) → dataset de validation/backtest du score.
// Une ligne par (symbol, date, index, duration) : le vecteur complet du jour
// (score + sous-scores + entrées + sources). Alimenté opportunistiquement par le
// scoring (api/stocks/auto-score.js). But : dans quelques semaines, pouvoir
// classer par score et mesurer le P&L de dispersion réalisé N jours plus tard.
//
// Non-cassant : sans SUPABASE_URL + SUPABASE_SERVICE_KEY (ou sans la table
// public.signal_history), c'est un no-op. Écritures via la clé service.

const BASE = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const KEY  = process.env.SUPABASE_SERVICE_KEY || '';
const enabled = !!(BASE && KEY);

function ymd(ts = Date.now()) { return new Date(ts).toISOString().slice(0, 10); }

// Enregistre le vecteur de signaux du jour (idempotent par
// symbol+date+index+duration : upsert → une ligne/jour, dernière du jour gardée).
// Best-effort : un échec n'interrompt jamais le scoring.
export async function recordSignal(row) {
  if (!enabled || !row || !row.symbol) return;
  try {
    await fetch(`${BASE}/rest/v1/signal_history`, {
      method: 'POST',
      headers: {
        apikey: KEY, Authorization: `Bearer ${KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',   // upsert sur (symbol, d, index_symbol, duration)
      },
      body: JSON.stringify({ ...row, d: ymd() }),
      signal: AbortSignal.timeout(3000),
    });
  } catch { /* best-effort */ }
}

// Nombre total de lignes accumulées (diagnostic). null si indispo.
export async function signalRowCount() {
  if (!enabled) return null;
  try {
    const r = await fetch(`${BASE}/rest/v1/signal_history?select=symbol&limit=1`, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Prefer: 'count=exact' },
      signal: AbortSignal.timeout(4000),
    });
    if (!r.ok) return null;
    const cr = r.headers.get('content-range') || '';   // ex. "0-0/1234"
    const total = cr.includes('/') ? Number(cr.split('/')[1]) : null;
    return Number.isFinite(total) ? total : null;
  } catch { return null; }
}
