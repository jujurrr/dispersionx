// POST /api/pro/portal   (portail de facturation Stripe)
// Renvoie l'URL du portail client Stripe (résilier, changer de carte, factures).
// SÉCURITÉ : le portail donne accès à la facturation d'un client → on ne fait
// PAS confiance au corps. On valide le JWT Supabase (Authorization: Bearer) pour
// obtenir le vrai user_id, puis on récupère son stripe_customer_id côté serveur
// (service role). Un client ne peut donc pas ouvrir le portail d'un autre compte.
export const config = { runtime: 'edge' };

const SB_BASE = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SB_KEY  = process.env.SUPABASE_SERVICE_KEY || '';
const STRIPE  = 'https://api.stripe.com/v1';

export default async (req) => {
  if (req.method !== 'POST') return Response.json({ error: 'method_not_allowed' }, { status: 405 });
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || !SB_BASE || !SB_KEY) return Response.json({ error: 'non_configure' }, { status: 501 });

  const authz = req.headers.get('authorization') || '';
  const token = authz.startsWith('Bearer ') ? authz.slice(7) : '';
  if (!token) return Response.json({ error: 'non_authentifie' }, { status: 401 });

  // Valide le token Supabase et récupère l'utilisateur réel (apikey = service role).
  let userId = null;
  try {
    const ur = await fetch(`${SB_BASE}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: SB_KEY }, signal: AbortSignal.timeout(6000),
    });
    if (ur.ok) userId = (await ur.json())?.id || null;
  } catch {}
  if (!userId) return Response.json({ error: 'token_invalide' }, { status: 401 });

  // Récupère le customer Stripe côté serveur (jamais fourni par le client).
  let customer = null;
  try {
    const pr = await fetch(`${SB_BASE}/rest/v1/pro_access?user_id=eq.${userId}&select=stripe_customer_id`, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }, signal: AbortSignal.timeout(5000),
    });
    if (pr.ok) { const rows = await pr.json(); customer = rows?.[0]?.stripe_customer_id || null; }
  } catch {}
  if (!customer) return Response.json({ error: 'aucun_abonnement' }, { status: 404 });

  // return_url DOIT être une URL absolue (exigence Stripe). Repli sur l'origine de
  // la requête si l'en-tête Origin est absent (jamais de chemin relatif nu).
  const origin = req.headers.get('origin') || process.env.APP_URL || new URL(req.url).origin;
  const form = new URLSearchParams();
  form.set('customer', customer);
  form.set('return_url', `${origin}/?pro=managed`);
  try {
    const r = await fetch(`${STRIPE}/billing_portal/sessions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(), signal: AbortSignal.timeout(10000),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.url) return Response.json({ error: j?.error?.message || 'stripe_error' }, { status: 502 });
    return Response.json({ url: j.url });
  } catch {
    return Response.json({ error: 'portail_indisponible' }, { status: 502 });
  }
};
