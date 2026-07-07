// POST /api/pro/checkout
// Body: { user_id, email?, cycle? }  (cycle = 'monthly' | 'annual', défaut mensuel)
// Crée une session Stripe Checkout (abonnement) et renvoie l'URL de redirection.
// Le user_id Supabase est propagé dans les métadonnées de la session ET de
// l'abonnement → le webhook sait à qui accorder le Pro (mensuel comme annuel).
// Aucune clé Stripe ni service role n'est jamais exposée au client.
export const config = { runtime: 'edge' };

const STRIPE = 'https://api.stripe.com/v1';

export default async (req) => {
  if (req.method !== 'POST') return Response.json({ error: 'method_not_allowed' }, { status: 405 });
  const key = process.env.STRIPE_SECRET_KEY;
  const priceMonthly = process.env.STRIPE_PRICE_ID;
  const priceAnnual = process.env.STRIPE_PRICE_ID_ANNUAL;   // optionnel : abonnement annuel
  if (!key || !priceMonthly) return Response.json({ error: 'stripe_non_configure' }, { status: 501 });

  let body = {};
  try { body = await req.json(); } catch {}
  const userId = String(body.user_id || '').trim();
  const email = body.email ? String(body.email).trim() : '';
  // Annuel seulement s'il est demandé ET configuré ; sinon repli mensuel (sûr).
  const cycle = body.cycle === 'annual' ? 'annual' : 'monthly';
  const price = (cycle === 'annual' && priceAnnual) ? priceAnnual : priceMonthly;
  if (!userId) return Response.json({ error: 'utilisateur_manquant' }, { status: 400 });

  const origin = req.headers.get('origin') || process.env.APP_URL || '';
  const form = new URLSearchParams();
  form.set('mode', 'subscription');
  form.set('line_items[0][price]', price);
  form.set('line_items[0][quantity]', '1');
  form.set('success_url', `${origin}/?pro=success`);
  form.set('cancel_url', `${origin}/?pro=cancel`);
  form.set('client_reference_id', userId);
  form.set('metadata[user_id]', userId);
  form.set('subscription_data[metadata][user_id]', userId);   // porté sur l'abonnement (events update/delete)
  form.set('allow_promotion_codes', 'true');
  if (email) form.set('customer_email', email);

  try {
    const r = await fetch(`${STRIPE}/checkout/sessions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
      signal: AbortSignal.timeout(10000),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.url) return Response.json({ error: j?.error?.message || 'stripe_error' }, { status: 502 });
    return Response.json({ url: j.url });
  } catch {
    return Response.json({ error: 'checkout_indisponible' }, { status: 502 });
  }
};
