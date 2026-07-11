// Notifications « intelligentes » — décisions PURES (testables sans réseau) +
// un helper d'insertion Supabase avec dédup par `ref` (anti-spam).
//
// Producteurs (évalués par les crons) :
//   • greek_drift  : delta net $ qui s'éloigne du neutre (snapshot-run)
//   • pnl          : gain/perte notable vs prime engagée (snapshot-run)
//   • subscription : abonnement Pro qui expire dans N jours (notifications/run)
//   • correlation  : corrélation implicite attractive (alerts/run)
//
// Chaque décision renvoie { kind, tone, title, body, ref } | null.
//   tone ∈ 'pos' | 'neg' | 'warn' | 'info'  (couleur dans le fil Activité)
//   ref  = clé de dédup (une notif par condition et par fenêtre de temps)

// Prime brute engagée à l'entrée (base des %). Cohérent avec la reprise/RiskLab.
export function grossPremium(strategy) {
  const s = strategy || {}, p = s.portfolio || {};
  return Math.abs(p.idxPrem || 0) + (s.components || []).reduce((a, c) => a + Math.abs(c.premium || 0), 0);
}

// Dérive de delta : |delta $ net actuel (par +1 %)| au-delà d'un seuil = une
// fraction de la prime engagée, avec un plancher absolu. → « rééquilibre ».
export function deltaDriftNotif(pos, v, { frac = 0.15, floor = 150 } = {}) {
  const cur = v && v.delta_dollar ? v.delta_dollar.current : null;
  if (cur == null || !isFinite(cur)) return null;
  const gross = grossPremium(pos && pos.strategy);
  const thresh = Math.max(floor, frac * gross);
  if (Math.abs(cur) < thresh) return null;
  const dir = cur > 0 ? 'haussier' : 'baissier';
  const name = (pos && pos.name) || 'position';
  const entryD = v.delta_dollar && v.delta_dollar.entry != null ? Math.round(v.delta_dollar.entry) : null;
  const g = v.greeks && v.greeks.current ? v.greeks.current : null;
  const entryTxt = entryD != null ? ` (≈ ${entryD} $ à l'entrée)` : '';
  const dteTxt = v.dte != null ? ` DTE restant ${v.dte}.` : '';
  const gTxt = g && (g.vega != null || g.theta != null) ? ` Vega ${g.vega} $/pt IV, theta ${g.theta} $/j.` : '';
  return {
    kind: 'greek_drift', tone: 'warn',
    title: `Delta à surveiller — ${name}`,
    body: `Delta net ${Math.round(cur)} $/+1 % (${dir})${entryTxt} — la position s'éloigne du neutre.${dteTxt}${gTxt} Pense à rééquilibrer (ETF indice ou par jambe).`,
    ref: `pos:${pos && pos.id}:delta`,
  };
}

// Seuil de P&L : gain (≥ +win) ou perte (≤ loss) notable vs prime engagée.
export function pnlNotif(pos, v, { win = 0.5, loss = -0.3 } = {}) {
  const pnl = v ? v.total_pnl : null;
  const gross = grossPremium(pos && pos.strategy);
  if (pnl == null || !isFinite(pnl) || !(gross > 0)) return null;
  const r = pnl / gross;
  const name = (pos && pos.name) || 'position';
  const dteTxt = v.dte != null ? ` DTE restant ${v.dte}.` : '';
  const breakdown = (typeof v.straddle_pnl === 'number' && typeof v.hedge_pnl === 'number' && Math.abs(v.hedge_pnl) >= 1)
    ? ` (straddles ${Math.round(v.straddle_pnl)} $ · couverture ${Math.round(v.hedge_pnl)} $)` : '';
  if (r >= win) return { kind: 'pnl', tone: 'pos', title: `Gain notable — ${name}`, body: `P&L +${Math.round(pnl)} $ (+${Math.round(r * 100)} % de la prime engagée)${breakdown}.${dteTxt} Envisage une prise de profit.`, ref: `pos:${pos && pos.id}:pnlwin` };
  if (r <= loss) return { kind: 'pnl', tone: 'neg', title: `Perte notable — ${name}`, body: `P&L ${Math.round(pnl)} $ (${Math.round(r * 100)} % de la prime engagée)${breakdown}.${dteTxt} Revois la thèse et le risque.`, ref: `pos:${pos && pos.id}:pnlloss` };
  return null;
}

// Expiration d'abonnement : notifie aux paliers (7/3/1 j). Ton = urgence.
// row : { current_period_end (ISO), status }.
export function subscriptionNotif(row, now = Date.now(), { paliers = [7, 3, 1] } = {}) {
  const end = row && row.current_period_end ? Date.parse(row.current_period_end) : NaN;
  if (isNaN(end) || end < now) return null;
  const d = Math.ceil((end - now) / 86400000);
  if (!paliers.includes(d)) return null;
  const canceled = row.status === 'canceled';
  const tone = d <= 1 ? 'neg' : d <= 3 ? 'warn' : 'pos';
  const jour = `${d} jour${d > 1 ? 's' : ''}`;
  return {
    kind: 'subscription', tone,
    title: canceled ? 'Abonnement Pro résilié' : 'Abonnement Pro',
    body: canceled
      ? `Ton accès Pro se termine dans ${jour}. Réactive-le pour ne rien perdre.`
      : `Renouvellement de ton abonnement Pro dans ${jour}.`,
    ref: `sub:${d}`,
  };
}

// Activation de l'abonnement Pro (paiement confirmé). Déposée par /api/pro/confirm
// au retour du Checkout → l'utilisateur voit dans son fil que le paiement a bien
// été pris en compte, en plus du toast éphémère. ref stable → une seule par
// activation (dédup par fenêtre côté insertNotif).
export function subscriptionActivatedNotif({ periodEnd } = {}) {
  let renewTxt = '';
  if (periodEnd) {
    const d = new Date(periodEnd);
    if (!isNaN(d)) renewTxt = ` Prochain renouvellement le ${d.toLocaleDateString('fr-FR')}.`;
  }
  return {
    kind: 'subscription', tone: 'pos',
    title: 'Bienvenue dans DispersionX Pro ✦',
    body: `Ton paiement a bien été reçu et ton accès Pro est activé.${renewTxt} Merci de ta confiance ! Découvre tout ce que tu viens de débloquer avec Pro.`,
    ref: 'sub:activated',
  };
}

// Renouvellement d'abonnement (paiement d'un nouveau cycle réussi). Déposée par le
// webhook sur invoice.payment_succeeded (billing_reason = subscription_cycle). ref
// UNIQUE par période → une notif par renouvellement (pas de dédup entre cycles).
export function subscriptionRenewedNotif({ periodEnd } = {}) {
  let nextTxt = '', key = 'x';
  if (periodEnd) {
    const d = new Date(periodEnd);
    if (!isNaN(d)) { nextTxt = ` Prochaine échéance le ${d.toLocaleDateString('fr-FR')}.`; key = d.toISOString().slice(0, 10); }
  }
  return {
    kind: 'subscription', tone: 'pos',
    title: 'Abonnement Pro renouvelé',
    body: `Ton abonnement Pro a été renouvelé et ton accès continue sans interruption.${nextTxt}`,
    ref: `sub:renewed:${key}`,
  };
}

// Corrélation attractive (au passage du seuil, edge-trigger côté alerts/run).
export function correlationNotif({ index, percentile, verdict }) {
  if (typeof percentile !== 'number') return null;
  return {
    kind: 'correlation', tone: 'pos',
    title: `Corrélation ${index} au ${percentile}ᵉ percentile`,
    body: `${verdict || 'Corrélation implicite élevée'} — une dispersion (long composants / short indice) est potentiellement attractive.`,
    ref: `corr:${index}`,
  };
}

// ── Insertion Supabase (service role) avec dédup par (user_id, ref) sur une
// fenêtre `dedupHours` → au plus une notif par condition et par ~jour. Non
// bloquant : toute erreur (table absente, réseau) renvoie false sans lever. ──
export async function insertNotif(SB_BASE, sbHeaders, userId, notif, dedupHours = 20) {
  if (!SB_BASE || !userId || !notif || !notif.ref) return false;
  const sinceIso = new Date(Date.now() - dedupHours * 3600000).toISOString();
  try {
    const q = `${SB_BASE}/rest/v1/notifications?user_id=eq.${userId}&ref=eq.${encodeURIComponent(notif.ref)}&created_at=gte.${encodeURIComponent(sinceIso)}&select=id&limit=1`;
    const r = await fetch(q, { headers: sbHeaders, signal: AbortSignal.timeout(6000) });
    if (r.ok) { const ex = await r.json(); if (Array.isArray(ex) && ex.length) return false; }
  } catch { /* on tente quand même l'insert */ }
  try {
    const r = await fetch(`${SB_BASE}/rest/v1/notifications`, {
      method: 'POST', headers: { ...sbHeaders, Prefer: 'return=minimal' },
      body: JSON.stringify({ user_id: userId, kind: notif.kind, tone: notif.tone, title: notif.title, body: notif.body, ref: notif.ref }),
      signal: AbortSignal.timeout(6000),
    });
    return !!(r && r.ok);
  } catch { return false; }
}
