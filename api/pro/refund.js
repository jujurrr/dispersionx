// POST /api/pro/refund
// Garantie commerciale « satisfait ou remboursé » 14 jours, en self-service.
// Rembourse le paiement initial, ANNULE l'abonnement immédiatement et coupe le
// Pro. Éligibilité décidée CÔTÉ SERVEUR (≤ 14 j depuis le 1er paiement).
//
// SÉCURITÉ : identique au portail — on valide le JWT Supabase (Authorization:
// Bearer) pour obtenir le vrai user_id, puis on lit son abonnement côté serveur
// (service role). Un client ne peut jamais rembourser/annuler le compte d'un
// autre. Le client ne fournit AUCUN identifiant Stripe.
export const config = { runtime: 'edge' };

import { insertNotif } from '../_lib/notify.js';

const SB_BASE = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SB_KEY  = process.env.SUPABASE_SERVICE_KEY || '';
const STRIPE  = 'https://api.stripe.com/v1';
const GUARANTEE_DAYS = 14;

async function stripe(path, method = 'GET', form = null) {
  const opt = { method, headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` }, signal: AbortSignal.timeout(9000) };
  if (form) { opt.headers['Content-Type'] = 'application/x-www-form-urlencoded'; opt.body = form.toString(); }
  const r = await fetch(`${STRIPE}${path}`, opt);
  return r.ok ? r.json() : null;
}

// Retrouve la référence de paiement à rembourser, tolérant aux versions d'API
// Stripe (payment_intent / charge / invoice.payments[] en « Basil »).
function paymentRef(inv) {
  if (!inv) return null;
  const id = v => (v && typeof v === 'object') ? v.id : v;
  if (inv.payment_intent) return { payment_intent: id(inv.payment_intent) };
  if (inv.charge) return { charge: id(inv.charge) };
  const pays = Array.isArray(inv.payments?.data) ? inv.payments.data : [];
  for (const p of pays) { const pi = p?.payment?.payment_intent; if (pi) return { payment_intent: id(pi) }; }
  return null;
}

export default async (req) => {
  if (req.method !== 'POST') return Response.json({ error: 'method_not_allowed' }, { status: 405 });
  if (!process.env.STRIPE_SECRET_KEY || !SB_BASE || !SB_KEY) return Response.json({ error: 'non_configure' }, { status: 501 });

  const authz = req.headers.get('authorization') || '';
  const token = authz.startsWith('Bearer ') ? authz.slice(7) : '';
  if (!token) return Response.json({ error: 'non_authentifie' }, { status: 401 });

  // JWT → user réel.
  let userId = null;
  try {
    const ur = await fetch(`${SB_BASE}/auth/v1/user`, { headers: { Authorization: `Bearer ${token}`, apikey: SB_KEY }, signal: AbortSignal.timeout(6000) });
    if (ur.ok) userId = (await ur.json())?.id || null;
  } catch {}
  if (!userId) return Response.json({ error: 'token_invalide' }, { status: 401 });

  // Abonnement du user (jamais fourni par le client).
  const sbHeaders = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' };
  let row = null;
  try {
    const pr = await fetch(`${SB_BASE}/rest/v1/pro_access?user_id=eq.${userId}&select=stripe_subscription_id,since,status`, { headers: sbHeaders, signal: AbortSignal.timeout(5000) });
    if (pr.ok) row = (await pr.json())?.[0] || null;
  } catch {}
  const subId = row?.stripe_subscription_id;
  if (!subId) return Response.json({ error: 'aucun_abonnement' }, { status: 404 });
  if (row.status === 'canceled') return Response.json({ error: 'deja_resilie' }, { status: 409 });

  // Abonnement Stripe (source du 1er paiement + fenêtre d'éligibilité).
  const sub = await stripe(`/subscriptions/${subId}`);
  if (!sub) return Response.json({ error: 'abonnement_introuvable' }, { status: 502 });

  // Éligibilité : ≤ 14 j depuis le début (since local, repli sur Stripe).
  const startMs = (row.since && Date.parse(row.since)) || (sub.start_date ? sub.start_date * 1000 : (sub.created ? sub.created * 1000 : NaN));
  if (!startMs || (Date.now() - startMs) > GUARANTEE_DAYS * 86400000) {
    return Response.json({ error: 'hors_delai', days: GUARANTEE_DAYS }, { status: 403 });
  }

  // Paiement à rembourser = dernière facture payée de l'abonnement.
  let inv = null;
  const latest = (sub.latest_invoice && typeof sub.latest_invoice === 'object') ? sub.latest_invoice.id : sub.latest_invoice;
  if (latest) inv = await stripe(`/invoices/${latest}`);
  if (!inv || inv.status !== 'paid') {
    const list = await stripe(`/invoices?subscription=${encodeURIComponent(subId)}&status=paid&limit=1`);
    inv = (list && Array.isArray(list.data)) ? list.data[0] : null;
  }
  const ref = paymentRef(inv);
  if (!ref) return Response.json({ error: 'paiement_introuvable' }, { status: 502 });

  // 1) Remboursement intégral.
  const rf = new URLSearchParams();
  Object.entries(ref).forEach(([k, v]) => rf.set(k, v));
  const refund = await stripe('/refunds', 'POST', rf);
  if (!refund || refund.status === 'failed') return Response.json({ error: 'remboursement_refuse' }, { status: 502 });

  // 2) Annulation immédiate de l'abonnement (best-effort : le remboursement prime).
  try { await stripe(`/subscriptions/${subId}`, 'DELETE'); } catch {}

  // 3) Coupe l'accès Pro tout de suite avec le statut TERMINAL 'refunded' (distinct
  //    de 'canceled' → visible dans l'historique). Le webhook ne l'écrasera pas.
  try {
    await fetch(`${SB_BASE}/rest/v1/pro_access?user_id=eq.${userId}`, {
      method: 'PATCH',
      headers: { ...sbHeaders, Prefer: 'return=minimal' },
      body: JSON.stringify({ status: 'refunded', current_period_end: new Date().toISOString() }),
      signal: AbortSignal.timeout(6000),
    });
  } catch {}

  // 4) Notification (best-effort, non bloquant).
  try {
    await insertNotif(SB_BASE, sbHeaders, userId, {
      kind: 'subscription', tone: 'neutral',
      title: 'Remboursement effectué',
      body: 'Ton abonnement Pro a été résilié et intégralement remboursé (garantie 14 jours). Le remboursement apparaît sous quelques jours selon ta banque.',
      ref: 'sub:refunded',
    }, 24 * 30);
  } catch {}

  return Response.json({ ok: true, refunded: true });
};
