// GET /api/pro/history   (historique d'abonnement — factures Stripe)
// Renvoie l'historique de facturation de l'utilisateur : depuis quand il est Pro,
// le statut/renouvellement en cours, et la liste de ses factures (date, montant,
// période couverte, statut, lien vers la facture hébergée).
//
// SÉCURITÉ : identique à /api/pro/portal — on ne fait PAS confiance au corps. On
// valide le JWT Supabase (Authorization: Bearer) pour obtenir le vrai user_id,
// puis on récupère son stripe_customer_id côté serveur (service role). Un client
// ne peut donc jamais lire la facturation d'un autre compte. Lecture seule.
export const config = { runtime: 'edge' };

const SB_BASE = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SB_KEY  = process.env.SUPABASE_SERVICE_KEY || '';
const STRIPE  = 'https://api.stripe.com/v1';
const iso = sec => (sec ? new Date(sec * 1000).toISOString() : null);

async function stripeGet(path) {
  const r = await fetch(`${STRIPE}${path}`, {
    headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
    signal: AbortSignal.timeout(8000),
  });
  return r.ok ? r.json() : null;
}

export default async (req) => {
  if (req.method !== 'GET') return Response.json({ error: 'method_not_allowed' }, { status: 405 });
  if (!process.env.STRIPE_SECRET_KEY || !SB_BASE || !SB_KEY) {
    return Response.json({ error: 'non_configure', entries: [] }, { status: 501 });
  }

  const authz = req.headers.get('authorization') || '';
  const token = authz.startsWith('Bearer ') ? authz.slice(7) : '';
  if (!token) return Response.json({ error: 'non_authentifie', entries: [] }, { status: 401 });

  // Valide le token Supabase → user réel (apikey = service role).
  let userId = null;
  try {
    const ur = await fetch(`${SB_BASE}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: SB_KEY }, signal: AbortSignal.timeout(6000),
    });
    if (ur.ok) userId = (await ur.json())?.id || null;
  } catch {}
  if (!userId) return Response.json({ error: 'token_invalide', entries: [] }, { status: 401 });

  // Ligne pro_access (customer + méta) — jamais fournie par le client.
  let row = null;
  try {
    const pr = await fetch(`${SB_BASE}/rest/v1/pro_access?user_id=eq.${userId}&select=stripe_customer_id,since,status,current_period_end`, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }, signal: AbortSignal.timeout(5000),
    });
    if (pr.ok) row = (await pr.json())?.[0] || null;
  } catch {}

  const base = {
    since: row?.since || null,
    status: row?.status || null,
    current_period_end: row?.current_period_end || null,
    subscribed: !!row?.stripe_customer_id,
    entries: [],
  };
  if (!row?.stripe_customer_id) return Response.json(base);   // octroi manuel → pas de factures Stripe

  // Factures du client (les plus récentes d'abord). `expand` de la ligne pour
  // récupérer la période de service couverte par l'abonnement.
  const inv = await stripeGet(`/invoices?customer=${encodeURIComponent(row.stripe_customer_id)}&limit=24`);
  const list = (inv && Array.isArray(inv.data)) ? inv.data : [];
  base.entries = list
    .filter(x => x && x.status !== 'draft')                   // on masque les brouillons
    .map(x => {
      const line = Array.isArray(x.lines?.data) ? x.lines.data.find(l => l && l.period) : null;
      const pStart = line?.period?.start ?? x.period_start ?? null;
      const pEnd   = line?.period?.end   ?? x.period_end   ?? null;
      const cents  = (x.status === 'paid') ? x.amount_paid : x.total;
      return {
        id: x.id,
        number: x.number || null,
        date: iso(x.status_transitions?.paid_at || x.created),
        amount: (typeof cents === 'number') ? cents / 100 : null,
        currency: (x.currency || 'eur').toUpperCase(),
        status: x.status || null,                            // paid | open | void | uncollectible
        periodStart: iso(pStart),
        periodEnd: iso(pEnd),
        url: x.hosted_invoice_url || null,
      };
    });

  return Response.json(base);
};
