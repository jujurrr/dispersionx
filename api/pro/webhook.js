// POST /api/pro/webhook  (endpoint webhook Stripe)
// Vérifie la signature Stripe (HMAC-SHA256, Web Crypto) puis met à jour la table
// pro_access via la clé service role (serveur uniquement). C'est le SEUL chemin
// qui accorde le Pro : le navigateur ne peut jamais se l'auto-attribuer.
//   checkout.session.completed  → accorde (status actif, période)
//   customer.subscription.updated → met à jour statut/période (résiliation, échec)
//   customer.subscription.deleted → révoque (status canceled)
export const config = { runtime: 'edge' };

const SB_BASE = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SB_KEY  = process.env.SUPABASE_SERVICE_KEY || '';
const STRIPE  = 'https://api.stripe.com/v1';

// Vérifie l'en-tête Stripe-Signature (t=timestamp,v1=hmac) à temps constant.
async function verifySig(payload, header, secret) {
  if (!header || !secret) return false;
  const parts = {};
  header.split(',').forEach(kv => { const i = kv.indexOf('='); if (i > 0) parts[kv.slice(0, i)] = kv.slice(i + 1); });
  const t = parts.t, v1 = parts.v1;
  if (!t || !v1) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;   // tolérance 5 min
  const enc = new TextEncoder();
  const mat = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', mat, enc.encode(`${t}.${payload}`));
  const hex = [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
  if (hex.length !== v1.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ v1.charCodeAt(i);
  return diff === 0;
}

async function sbUpsert(row) {
  return fetch(`${SB_BASE}/rest/v1/pro_access`, {
    method: 'POST',
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(row), signal: AbortSignal.timeout(5000),
  });
}
async function sbPatchBySub(subId, patch) {
  return fetch(`${SB_BASE}/rest/v1/pro_access?stripe_subscription_id=eq.${encodeURIComponent(subId)}`, {
    method: 'PATCH',
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(patch), signal: AbortSignal.timeout(5000),
  });
}
async function stripeGet(path) {
  const r = await fetch(`${STRIPE}${path}`, { headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` }, signal: AbortSignal.timeout(8000) });
  return r.ok ? r.json() : null;
}
const iso = sec => sec ? new Date(sec * 1000).toISOString() : null;

// Fin de période (epoch s). Stripe (API « Basil » 2025-03-31+) a RETIRÉ
// current_period_end de l'objet Subscription et l'a déplacé sur ses items. On lit
// les deux emplacements pour rester compatible quelle que soit la version d'API.
function periodEndOf(sub) {
  if (!sub) return null;
  if (sub.current_period_end) return sub.current_period_end;              // API < Basil
  const items = Array.isArray(sub.items?.data) ? sub.items.data : [];     // API ≥ Basil
  for (const it of items) { if (it && it.current_period_end) return it.current_period_end; }
  return null;
}

export default async (req) => {
  if (req.method !== 'POST') return new Response('method', { status: 405 });
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !SB_BASE || !SB_KEY) return new Response('not_configured', { status: 501 });

  const payload = await req.text();
  const ok = await verifySig(payload, req.headers.get('stripe-signature'), secret);
  if (!ok) return new Response('bad_signature', { status: 400 });

  let event;
  try { event = JSON.parse(payload); } catch { return new Response('bad_json', { status: 400 }); }
  const obj = event?.data?.object || {};

  try {
    if (event.type === 'checkout.session.completed') {
      const userId = obj.metadata?.user_id || obj.client_reference_id;
      const subId = obj.subscription;
      if (userId && subId) {
        const sub = await stripeGet(`/subscriptions/${subId}`);
        // La fin de période est INDISPENSABLE (sinon accès « à vie » côté client) :
        // si on ne l'obtient pas, on renvoie 5xx → Stripe réessaie le webhook.
        const cpeSec = periodEndOf(sub);
        if (!sub || !cpeSec) throw new Error('subscription_period_unavailable');
        await sbUpsert({
          user_id: userId,
          since: new Date().toISOString(),
          stripe_customer_id: obj.customer || null,
          stripe_subscription_id: subId,
          status: sub.status || 'active',
          current_period_end: iso(cpeSec),
        });
      }
    } else if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      // Résiliation programmée (cancel_at_period_end) : l'accès reste dû jusqu'à la
      // fin de la période payée → statut « canceling » (encore actif mais NON
      // renouvelé). La suppression réelle en fin de période coupe l'accès →
      // « canceled ». Réactivation (uncancel) → obj.status ('active') repris.
      const status = event.type === 'customer.subscription.deleted'
        ? 'canceled'
        : (obj.cancel_at_period_end ? 'canceling' : obj.status);
      const cpe = iso(periodEndOf(obj));
      const userId = obj.metadata?.user_id;
      if (userId) {
        await sbUpsert({ user_id: userId, status, current_period_end: cpe, stripe_subscription_id: obj.id, stripe_customer_id: obj.customer || null });
      } else if (obj.id) {
        await sbPatchBySub(obj.id, { status, current_period_end: cpe });
      }
    }
  } catch {
    return new Response('handler_error', { status: 500 });   // 5xx → Stripe réessaie
  }
  return new Response('ok', { status: 200 });
};
