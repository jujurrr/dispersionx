// POST /api/account/delete   (suppression définitive du compte — RGPD art. 17)
// SÉCURITÉ : on valide le JWT Supabase (Authorization: Bearer) pour obtenir le
// vrai user_id — un client ne peut donc pas supprimer un autre compte. Puis, avec
// la clé service role :
//   1) on annule l'abonnement Stripe éventuel (évite de continuer à facturer) ;
//   2) on supprime l'utilisateur Auth → cascade FK on delete cascade sur toutes
//      les données (lists, strategies, positions, alerts, trades, pro_access…).
export const config = { runtime: 'edge' };

const SB_BASE = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SB_KEY  = process.env.SUPABASE_SERVICE_KEY || '';
const STRIPE  = 'https://api.stripe.com/v1';

export default async (req) => {
  if (req.method !== 'POST') return Response.json({ error: 'method_not_allowed' }, { status: 405 });
  if (!SB_BASE || !SB_KEY) return Response.json({ error: 'non_configure' }, { status: 501 });

  const authz = req.headers.get('authorization') || '';
  const token = authz.startsWith('Bearer ') ? authz.slice(7) : '';
  if (!token) return Response.json({ error: 'non_authentifie' }, { status: 401 });

  // Valide le token et récupère l'utilisateur réel.
  let userId = null;
  try {
    const ur = await fetch(`${SB_BASE}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: SB_KEY }, signal: AbortSignal.timeout(6000),
    });
    if (ur.ok) userId = (await ur.json())?.id || null;
  } catch {}
  if (!userId) return Response.json({ error: 'token_invalide' }, { status: 401 });

  // 1) Annulation de l'abonnement Stripe éventuel (best-effort — ne bloque pas la
  //    suppression, mais on essaie fort pour ne plus facturer un compte supprimé).
  try {
    const key = process.env.STRIPE_SECRET_KEY;
    if (key) {
      const pr = await fetch(`${SB_BASE}/rest/v1/pro_access?user_id=eq.${userId}&select=stripe_subscription_id`, {
        headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }, signal: AbortSignal.timeout(5000),
      });
      const subId = pr.ok ? (await pr.json())?.[0]?.stripe_subscription_id : null;
      if (subId) {
        await fetch(`${STRIPE}/subscriptions/${encodeURIComponent(subId)}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(8000),
        });
      }
    }
  } catch { /* on poursuit la suppression même si l'annulation Stripe échoue */ }

  // 2) Suppression de l'utilisateur Auth (Admin API, service role) → cascade data.
  try {
    const del = await fetch(`${SB_BASE}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }, signal: AbortSignal.timeout(8000),
    });
    if (!del.ok) return Response.json({ error: 'suppression_impossible' }, { status: 502 });
  } catch {
    return Response.json({ error: 'suppression_impossible' }, { status: 502 });
  }

  return Response.json({ ok: true });
};
