// POST /api/pro/confirm   Body: { session_id }
// Confirmation SYNCHRONE du paiement, INDÉPENDANTE du webhook. Au retour du
// Checkout (?pro=success&session_id=cs_…), le client appelle cet endpoint : il
// vérifie auprès de Stripe que la session est RÉELLEMENT payée, puis accorde le
// Pro (upsert pro_access via la clé service role) et dépose une notification
// « Pro activé ». C'est le filet de sécurité quand le webhook n'est pas encore
// configuré/enregistré : sans lui, un paiement réussi n'accordait jamais l'accès.
//
// Sécurité : on accorde au user_id ENREGISTRÉ dans la session par le serveur au
// moment du checkout (metadata.user_id), JAMAIS à un id fourni par le client. Le
// session_id (cs_…) n'est connu que de l'acheteur (renvoyé par success_url), et
// on exige status=complete + payment_status=paid. Idempotent avec le webhook
// (merge-duplicates sur pro_access + dédup de la notification).
export const config = { runtime: 'edge' };

import { subscriptionActivatedNotif, insertNotif } from '../_lib/notify.js';

const SB_BASE = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SB_KEY  = process.env.SUPABASE_SERVICE_KEY || '';
const STRIPE  = 'https://api.stripe.com/v1';
const iso = sec => (sec ? new Date(sec * 1000).toISOString() : null);

// Fin de période (epoch s). Stripe (API « Basil » 2025-03-31+) a RETIRÉ
// current_period_end de l'objet Subscription et l'a déplacé sur ses items. On lit
// les deux emplacements pour rester compatible quelle que soit la version d'API du
// compte (sinon l'octroi échoue silencieusement : paiement OK mais pas d'accès).
function periodEndOf(sub) {
  if (!sub) return null;
  if (sub.current_period_end) return sub.current_period_end;              // API < Basil
  const items = Array.isArray(sub.items?.data) ? sub.items.data : [];     // API ≥ Basil
  for (const it of items) { if (it && it.current_period_end) return it.current_period_end; }
  return null;
}

async function stripeGet(path) {
  const r = await fetch(`${STRIPE}${path}`, {
    headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
    signal: AbortSignal.timeout(8000),
  });
  return r.ok ? r.json() : null;
}

export default async (req) => {
  if (req.method !== 'POST') return Response.json({ error: 'method_not_allowed', pro: false }, { status: 405 });
  if (!process.env.STRIPE_SECRET_KEY || !SB_BASE || !SB_KEY) {
    return Response.json({ error: 'not_configured', pro: false }, { status: 501 });
  }

  let body = {};
  try { body = await req.json(); } catch {}
  const sessionId = String(body.session_id || '').trim();
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return Response.json({ error: 'session_manquante', pro: false }, { status: 400 });

  // 1) La session Checkout doit exister et être un abonnement RÉELLEMENT payé.
  const session = await stripeGet(`/checkout/sessions/${sessionId}`);
  if (!session) return Response.json({ error: 'session_introuvable', pro: false }, { status: 404 });
  const paid = session.status === 'complete' && session.payment_status === 'paid';
  if (session.mode !== 'subscription' || !paid) {
    return Response.json({ error: 'paiement_non_confirme', pro: false }, { status: 402 });
  }

  // 2) Bénéficiaire = user_id posé PAR NOUS au checkout (jamais fourni par le client).
  const userId = session.metadata?.user_id || session.client_reference_id;
  const subId  = session.subscription;
  if (!userId || !subId) return Response.json({ error: 'donnees_incompletes', pro: false }, { status: 422 });

  // 3) Fin de période INDISPENSABLE (sinon l'accès serait « à vie » côté client).
  const sub = await stripeGet(`/subscriptions/${subId}`);
  const cpeSec = periodEndOf(sub);
  if (!sub || !cpeSec) return Response.json({ error: 'periode_indisponible', pro: false }, { status: 502 });

  const sbHeaders = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' };
  const periodEnd = iso(cpeSec);

  // 4) Accord Pro — MÊME écriture que le webhook (idempotent : merge-duplicates).
  const up = await fetch(`${SB_BASE}/rest/v1/pro_access`, {
    method: 'POST',
    headers: { ...sbHeaders, Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({
      user_id: userId,
      since: new Date().toISOString(),
      stripe_customer_id: session.customer || null,
      stripe_subscription_id: subId,
      status: sub.status || 'active',
      current_period_end: periodEnd,
    }),
    signal: AbortSignal.timeout(6000),
  }).catch(() => null);
  if (!up || !up.ok) return Response.json({ error: 'grant_failed', pro: false }, { status: 502 });

  // 5) Notification « Pro activé » dans le fil (dédup 30 j par ref ; non bloquant).
  try { await insertNotif(SB_BASE, sbHeaders, userId, subscriptionActivatedNotif({ periodEnd }), 24 * 30); } catch { /* table absente → silencieux */ }

  return Response.json({ pro: true, current_period_end: periodEnd });
};
