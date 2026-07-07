// GET /api/alerts/run?key=SECRET — évaluateur d'alertes de corrélation.
// À appeler par un cron externe (ex. cron-job.org), ~1×/jour après clôture US.
// Pour chaque indice ayant des alertes actives, calcule le percentile de
// corrélation implicite (via /api/correlation/barometer) et déclenche les
// alertes dont le seuil est franchi — déclenchement sur FRONT (edge-trigger) :
// on n'e-maile qu'au passage au-dessus du seuil, pas à chaque exécution.
// E-mail via Resend si RESEND_API_KEY + ALERTS_FROM sont définis ; sinon
// l'alerte est marquée déclenchée et reste visible dans l'app.
export const config = { runtime: 'edge' };

const SB_BASE = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SB_KEY  = process.env.SUPABASE_SERVICE_KEY || '';

const sbHeaders = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' };

async function sbGetActive() {
  const r = await fetch(`${SB_BASE}/rest/v1/alerts?active=eq.true&select=id,user_id,email,index_symbol,threshold,tickers,triggered_at`, { headers: sbHeaders, signal: AbortSignal.timeout(6000) });
  return r.ok ? r.json() : [];
}
async function sbPatch(id, patch) {
  return fetch(`${SB_BASE}/rest/v1/alerts?id=eq.${id}`, { method: 'PATCH', headers: { ...sbHeaders, Prefer: 'return=minimal' }, body: JSON.stringify(patch), signal: AbortSignal.timeout(5000) });
}

async function tickersFor(origin, index, stored) {
  if (Array.isArray(stored) && stored.length >= 2) return stored.slice(0, 20);
  try {
    const r = await fetch(`${origin}/api/indices/${encodeURIComponent(index)}/components`, { signal: AbortSignal.timeout(9000) });
    if (!r.ok) return null;
    const j = await r.json();
    const arr = Array.isArray(j) ? j : (j.components || j.items || []);
    const t = arr.map(c => (typeof c === 'string' ? c : c.ticker)).filter(Boolean).slice(0, 20);
    return t.length >= 2 ? t : null;
  } catch { return null; }
}
async function barometerFor(origin, tickers, index) {
  try {
    const r = await fetch(`${origin}/api/correlation/barometer`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tickers, index }), signal: AbortSignal.timeout(24000) });
    if (!r.ok) return null;
    const j = await r.json();
    return j && j.current ? j.current : null;
  } catch { return null; }
}

async function sendEmail(to, index, pct, verdict) {
  const key = process.env.RESEND_API_KEY, from = process.env.ALERTS_FROM;
  if (!key || !from || !to) return false;
  const appUrl = process.env.APP_URL || '';
  const html = `
    <div style="font-family:system-ui,Arial,sans-serif;max-width:520px;margin:auto;color:#0f172a">
      <h2 style="margin:0 0 6px">Corrélation ${index} au ${pct}<sup>e</sup> percentile</h2>
      <p style="margin:0 0 14px;color:#475569">${verdict}. La corrélation implicite de ${index} est historiquement élevée — une dispersion (long composants / short indice) est potentiellement attractive.</p>
      ${appUrl ? `<a href="${appUrl}" style="display:inline-block;padding:10px 18px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Ouvrir DispersionX</a>` : ''}
      <p style="margin:16px 0 0;font-size:12px;color:#94a3b8">Signal indicatif sur données différées/estimées — pas un conseil en investissement. Gérez vos alertes dans l'app.</p>
    </div>`;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject: `DispersionX · corrélation ${index} au ${pct}e percentile`, html }),
      signal: AbortSignal.timeout(8000),
    });
    return r.ok;
  } catch { return false; }
}

export default async (req) => {
  const key = new URL(req.url).searchParams.get('key');
  const expected = process.env.ALERTS_KEY || process.env.WARM_KEY;
  if (!expected || key !== expected) return Response.json({ error: 'unauthorized' }, { status: 401 });
  if (!SB_BASE || !SB_KEY) return Response.json({ error: 'not_configured' }, { status: 501 });

  const origin = new URL(req.url).origin;
  const alerts = await sbGetActive();
  if (!alerts.length) return Response.json({ checked: 0, fired: 0 });

  // Un calcul de baromètre par indice distinct.
  const byIndex = {};
  for (const a of alerts) (byIndex[a.index_symbol] = byIndex[a.index_symbol] || []).push(a);
  const curByIndex = {};
  await Promise.all(Object.keys(byIndex).map(async idx => {
    const seed = byIndex[idx].find(a => Array.isArray(a.tickers) && a.tickers.length >= 2);
    const tickers = await tickersFor(origin, idx, seed && seed.tickers);
    curByIndex[idx] = tickers ? await barometerFor(origin, tickers, idx) : null;
  }));

  let fired = 0, checked = 0;
  for (const a of alerts) {
    const cur = curByIndex[a.index_symbol];
    if (!cur || typeof cur.percentile !== 'number') continue;
    checked++;
    const pct = cur.percentile;
    const armed = !a.triggered_at;                       // pas encore déclenchée
    if (pct >= a.threshold && armed) {
      const emailed = await sendEmail(a.email, a.index_symbol, pct, cur.verdict || '');
      await sbPatch(a.id, { triggered_at: new Date().toISOString(), notified_at: emailed ? new Date().toISOString() : null, last_percentile: pct });
      fired++;
    } else if (pct < a.threshold && !armed) {
      await sbPatch(a.id, { triggered_at: null, last_percentile: pct });   // ré-armée
    } else {
      await sbPatch(a.id, { last_percentile: pct });
    }
  }
  return Response.json({ checked, fired, indices: Object.keys(byIndex).length });
};
