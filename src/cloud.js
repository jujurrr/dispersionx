// ── Couche cloud (Supabase) : auth + listes synchronisées côté serveur ──────
// Non-cassant : SANS les variables d'env VITE_SUPABASE_*, le client reste null,
// DXCloud.configured = false, et l'app fonctionne exactement comme avant
// (localStorage via DXMock). Dès que les clés sont présentes ET qu'un
// utilisateur est connecté, DXCloud.enabled devient true et js/api.js route
// les listes vers Supabase. Les données sont façonnées au format DXMock pour
// que l'UI ne change pas.
import { createClient } from '@supabase/supabase-js';

const ENV = (typeof import.meta !== 'undefined' && import.meta.env) || {};
const URL = ENV.VITE_SUPABASE_URL;
const KEY = ENV.VITE_SUPABASE_ANON_KEY;
// Offre annuelle activée uniquement si VITE_PRO_ANNUAL=1 (à poser en même temps
// que STRIPE_PRICE_ID_ANNUAL côté serveur). Exposé au client pour l'UI Tarifs.
if (typeof window !== 'undefined') window.DX_PRO_ANNUAL = ENV.VITE_PRO_ANNUAL === '1';

// Retour du lien « mot de passe oublié » : on lit le hash (#…type=recovery) AVANT
// que Supabase (detectSessionInUrl) ne le nettoie → l'app affiche le formulaire.
if (typeof window !== 'undefined' && /(?:^|[#&])type=recovery/.test(window.location.hash || '')) {
  window.__dxRecovery = true;
}

let supa = null;
try {
  if (URL && KEY) supa = createClient(URL, KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
} catch (e) { console.warn('[cloud] init Supabase échouée :', e?.message); supa = null; }

let currentUser = null;
let proAccess = false;      // accès au module « Opportunités Pro » (table pro_access)
let proSubscribed = false;  // Pro issu d'un abonnement Stripe (a un customer) → portail dispo
let proStatus = null;       // statut d'abonnement ('active', 'canceled', …) si connu
let proPeriodEnd = null;    // fin de période en cours (ISO) si abonnement
let proSince = null;        // début de l'abonnement (ISO) — fenêtre garantie 14 j
let pendingMfa = null;      // { factorId } si un défi 2FA (AAL2) est en attente, sinon null

// Vérifie l'accès Pro de l'utilisateur courant (RLS : il ne lit que sa ligne).
// Un abonnement Stripe écrit status + current_period_end (via webhook, service
// role). Compat : les octrois manuels en SQL (sans statut) restent actifs.
async function checkPro() {
  proSubscribed = false; proStatus = null; proPeriodEnd = null; proSince = null;
  if (!supa || !currentUser) return false;
  try {
    const { data, error } = await supa.from('pro_access')
      .select('status,current_period_end,stripe_customer_id,stripe_subscription_id,since').eq('user_id', currentUser.id).maybeSingle();
    if (error || !data) return false;
    const status = data.status || 'active';                       // octroi manuel = actif
    // 'canceling' = résiliation programmée (Stripe cancel_at_period_end) : l'accès
    // reste dû jusqu'à la fin de la période payée — la validité est bornée plus bas
    // par current_period_end (donc jamais « à vie »). 'canceled' = accès coupé.
    if (status !== 'active' && status !== 'trialing' && status !== 'canceling') return false;
    const cpe = data.current_period_end ? new Date(data.current_period_end).getTime() : null;
    const isSubscription = !!data.stripe_subscription_id;          // abonnement Stripe (mensuel/annuel)
    if (isSubscription) {
      // Un ABONNEMENT n'est JAMAIS « à vie » : accès uniquement pendant une
      // période valide et NON échue. Période absente (donnée incomplète) ou
      // dépassée → pas d'accès (le renouvellement Stripe repousse la période).
      if (cpe == null || cpe < Date.now()) return false;
    } else if (cpe != null && cpe < Date.now()) {
      return false;   // octroi manuel avec fin explicite dépassée
    }
    proSubscribed = !!data.stripe_customer_id;                    // abonnement Stripe → portail dispo
    proStatus = status; proPeriodEnd = data.current_period_end || null;
    proSince = data.since || null;
    return true;
  } catch { return false; }
}

// Lance le paiement Stripe (redirige vers le Checkout hébergé). Le retour se
// fait sur ?pro=success ; c'est le WEBHOOK (serveur, service role) qui accorde
// réellement le Pro — jamais le navigateur.
const proApi = {
  async startCheckout(cycle) {
    if (!currentUser) throw new Error('not_signed_in');
    const r = await fetch('/api/pro/checkout', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: currentUser.id, email: currentUser.email, cycle: cycle === 'annual' ? 'annual' : 'monthly' }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.url) throw new Error(j.error || 'checkout_indisponible');
    window.location.href = j.url;
  },
  async refresh() {
    proAccess = await checkPro();
    window.dispatchEvent(new CustomEvent('dx-pro-change', { detail: proAccess }));
    return proAccess;
  },
  // Confirmation SYNCHRONE du paiement au retour du Checkout, INDÉPENDANTE du
  // webhook : le serveur revérifie la session auprès de Stripe et accorde le Pro
  // (+ notification). Filet de sécurité si le webhook n'est pas configuré. Le
  // serveur accorde au user_id enregistré dans la session, pas à un id client.
  async confirmCheckout(sessionId) {
    if (!sessionId) return { pro: false, error: 'session_manquante' };
    try {
      const r = await fetch('/api/pro/confirm', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      });
      const j = await r.json().catch(() => ({}));
      const pro = !!(r.ok && j.pro);
      // On remonte le motif d'échec (diagnostic : periode_indisponible, grant_failed,
      // not_configured…) pour pouvoir l'afficher plutôt que d'échouer en silence.
      if (!pro && !j.error) j.error = 'http_' + r.status;
      return { pro, error: pro ? null : j.error };
    } catch (e) { return { pro: false, error: 'reseau' }; }
  },
  // Portail de facturation Stripe (résilier, carte, factures). L'endpoint valide
  // le JWT Supabase → on lui transmet le token de session, pas le user_id.
  async openPortal() {
    if (!currentUser) throw new Error('not_signed_in');
    const { data } = await supa.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) throw new Error('not_signed_in');
    const r = await fetch('/api/pro/portal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: '{}',
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.url) throw new Error(j.error || 'portail_indisponible');
    window.location.href = j.url;
  },
  // Historique d'abonnement (factures Stripe). Lecture seule, authentifiée par le
  // JWT Supabase (comme le portail). Non-cassant : en cas d'échec/hors-ligne,
  // renvoie une enveloppe vide plutôt que de lever.
  async history() {
    if (!currentUser) return { entries: [], subscribed: false };
    try {
      const { data } = await supa.auth.getSession();
      const token = data?.session?.access_token;
      if (!token) return { entries: [], subscribed: false };
      const r = await fetch('/api/pro/history', { headers: { Authorization: `Bearer ${token}` } });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return { entries: [], subscribed: false, error: j.error || 'indisponible' };
      return { entries: [], subscribed: false, ...j };
    } catch { return { entries: [], subscribed: false, error: 'indisponible' }; }
  },
  // Garantie 14 j « satisfait ou remboursé » (self-service) : rembourse le paiement
  // initial, annule l'abonnement et coupe le Pro. Éligibilité vérifiée côté serveur.
  async requestRefund() {
    if (!currentUser) throw new Error('not_signed_in');
    const { data } = await supa.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) throw new Error('not_signed_in');
    const r = await fetch('/api/pro/refund', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: '{}',
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) throw new Error(j.error || 'remboursement_indisponible');
    return true;
  },
};

function userFromSession(session) {
  const u = session?.user;
  if (!u) return null;
  const m = u.user_metadata || {};
  return {
    id: u.id, email: u.email,
    name: m.name || m.full_name || (u.email ? u.email.split('@')[0] : 'Utilisateur'),
    emailVerified: !!(u.email_confirmed_at || u.confirmed_at),
  };
}

// ── Authentification ────────────────────────────────────────────────────────
const auth = {
  async signUpPassword(email, password, name) {
    const { data, error } = await supa.auth.signUp({ email, password, options: { data: { name } } });
    if (error) throw error;
    if (!data.session) { const e = new Error('confirm_email'); e.code = 'confirm_email'; throw e; } // confirmation e-mail requise
    return userFromSession(data.session);
  },
  async signInPassword(email, password) {
    const { data, error } = await supa.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return userFromSession(data.session);
  },
  async signInOAuth(provider) {
    const { error } = await supa.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin } });
    if (error) throw error;   // redirection ; la session revient via onAuthStateChange
  },
  async signInGoogle()  { return this.signInOAuth('google'); },
  async signInDiscord() { return this.signInOAuth('discord'); },
  // Mot de passe oublié : envoie un e-mail de réinitialisation. Le lien ramène
  // sur l'app (detectSessionInUrl) → événement PASSWORD_RECOVERY → l'app propose
  // de saisir un nouveau mot de passe (updatePassword).
  async resetPassword(email) {
    const { error } = await supa.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    if (error) throw error;
  },
  async updatePassword(password) {
    const { error } = await supa.auth.updateUser({ password });
    if (error) throw error;
  },
  // Met à jour le pseudo (user_metadata.name) et rafraîchit currentUser.
  async updateProfile(name) {
    const { data, error } = await supa.auth.updateUser({ data: { name } });
    if (error) throw error;
    currentUser = userFromSession({ user: data.user });
    window.dispatchEvent(new CustomEvent('dx-auth-change', { detail: currentUser }));
    return currentUser;
  },
  // Change l'adresse e-mail. Supabase envoie un lien de confirmation au nouvel
  // e-mail (et, selon la config, à l'ancien) : le changement n'est effectif
  // qu'après clic sur ce lien.
  async updateEmail(email) {
    const { error } = await supa.auth.updateUser({ email }, { emailRedirectTo: window.location.origin });
    if (error) throw error;
  },
  // Renvoie l'e-mail de confirmation (adresse encore non vérifiée).
  async resendConfirmation(email) {
    const { error } = await supa.auth.resend({ type: 'signup', email });
    if (error) throw error;
  },
  // Suppression définitive du compte (RGPD art. 17). Annule l'abonnement Stripe
  // éventuel puis supprime l'utilisateur Auth côté serveur (service role) →
  // cascade sur toutes les données (FK on delete cascade). Déconnecte + purge local.
  async deleteAccount() {
    const { data } = await supa.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) throw new Error('not_signed_in');
    const r = await fetch('/api/account/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: '{}',
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) throw new Error(j.error || 'suppression_impossible');
    try { await supa.auth.signOut(); } catch {}   // déclenche la purge des caches locaux
    return true;
  },
  // ── Double authentification (TOTP) — opt-in ; nécessite l'activation de la MFA
  //    dans le projet Supabase (Authentication → MFA → TOTP). Additif : sans
  //    facteur vérifié, la connexion est INCHANGÉE (aucune régression). ──
  mfa: {
    async list() { const { data, error } = await supa.auth.mfa.listFactors(); if (error) throw error; return data; },
    async enroll() { const { data, error } = await supa.auth.mfa.enroll({ factorType: 'totp' }); if (error) throw error; return data; },
    async verify(factorId, code) {
      const ch = await supa.auth.mfa.challenge({ factorId });
      if (ch.error) throw ch.error;
      const v = await supa.auth.mfa.verify({ factorId, challengeId: ch.data.id, code: String(code).replace(/\s+/g, '') });
      if (v.error) throw v.error;
      const s = await supa.auth.getSession();                 // reflète la session AAL2
      currentUser = userFromSession(s.data?.session);
      window.dispatchEvent(new CustomEvent('dx-auth-change', { detail: currentUser }));
      try { await onSignedIn(); } catch {}                    // synchro différée maintenant que l'on est AAL2
      return v.data;
    },
    async unenroll(factorId) { const { error } = await supa.auth.mfa.unenroll({ factorId }); if (error) throw error; },
    // À la connexion : renvoie { factorId } si un défi AAL2 est requis, sinon null.
    // FAIL-OPEN : toute erreur → null (on ne bloque jamais la connexion sur un bug MFA).
    async pendingChallenge() {
      try {
        const { data } = await supa.auth.mfa.getAuthenticatorAssuranceLevel();
        if (data && data.currentLevel === 'aal1' && data.nextLevel === 'aal2') {
          const f = await supa.auth.mfa.listFactors();
          const totp = (f.data?.totp || []).find(x => x.status === 'verified');
          return totp ? { factorId: totp.id } : null;
        }
      } catch { /* fail-open */ }
      return null;
    },
  },
  async signOut() { if (supa) await supa.auth.signOut(); },
};

// ── Listes (façonnées comme DXMock) ─────────────────────────────────────────
function shapeItem(r) {
  return { ticker: r.ticker, weight: r.weight ?? null, score: r.score ?? null, score_data: r.score_data || null, added: (r.added_at || '').slice(0, 10) };
}
function shapeList(l, items) {
  const its = (items || []).map(shapeItem);
  const sc = its.map(i => i.score).filter(s => s != null);
  return {
    id: l.id, name: l.name, index_symbol: l.index_symbol, description: l.description || '',
    group_name: l.group_name || null,   // groupe (colonne optionnelle) ; null si absent
    n_items: its.length,
    avg_score: sc.length ? Math.round(sc.reduce((a, b) => a + b, 0) / sc.length) : 0,
    created_at: (l.created_at || '').slice(0, 10),
    updated_at: (l.updated_at || '').slice(0, 10),
    items: its,
  };
}
function scoreOf(sd) { return sd?.score ?? sd?.composite_score?.score ?? null; }

const lists = {
  async getAll() {
    // MES listes uniquement (filtre explicite : la RLS de partage rend AUSSI
    // lisibles les listes partagées avec moi — celles-ci ont leur propre section).
    const { data: ls, error } = await supa.from('lists').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: true });
    if (error) throw error;
    const byList = {};
    if (ls.length) {
      const { data: its, error: e2 } = await supa.from('list_items').select('*').in('list_id', ls.map(l => l.id));
      if (e2) throw e2;
      its.forEach(it => { (byList[it.list_id] = byList[it.list_id] || []).push(it); });
    }
    return ls.map(l => shapeList(l, byList[l.id]));
  },
  async get(id) {
    const { data: l, error } = await supa.from('lists').select('*').eq('id', id).single();
    if (error) throw error;
    const { data: its } = await supa.from('list_items').select('*').eq('list_id', id).order('added_at', { ascending: true });
    const shaped = shapeList(l, its);
    // Drapeaux de partage : le détail (ListDetail) grise l'édition en lecture seule.
    if (currentUser && l.user_id !== currentUser.id) {
      const { data: sh } = await supa.from('list_shares').select('role, owner_email').eq('list_id', id).eq('shared_with', currentUser.id).maybeSingle();
      shaped.shared = true;
      shaped.role = sh?.role || 'viewer';
      shaped.owner_email = sh?.owner_email || null;
      shaped.can_edit = shaped.role === 'editor';
    } else {
      shaped.can_edit = true;
    }
    return shaped;
  },
  async create(name, index_symbol, description = '') {
    const { data, error } = await supa.from('lists').insert({ user_id: currentUser.id, name, index_symbol: index_symbol || 'SPX', description }).select().single();
    if (error) throw error;
    return shapeList(data, []);
  },
  async update(id, name, description) {
    const { data, error } = await supa.from('lists').update({ name, description, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) throw error;
    return shapeList(data, []);
  },
  // Affecte la liste à un groupe (chaîne) ou null. Nécessite la colonne
  // lists.group_name (voir SUPABASE_SETUP.md). L'erreur remonte si la colonne
  // n'existe pas encore → l'UI invite à appliquer la migration.
  async setGroup(id, group_name) {
    const g = (group_name && String(group_name).trim()) || null;
    const { error } = await supa.from('lists').update({ group_name: g, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
    return { success: true, group_name: g };
  },
  async remove(id) {
    // RPC delete_list : supprime en UNE transaction avec app.skip_item_audit →
    // une seule entrée d'audit « list_deleted » (pas de bruit par-action).
    // Repli non-cassant (suppression directe) si la RPC n'existe pas encore.
    const { error } = await supa.rpc('delete_list', { p_list_id: id });
    if (error) {
      const em = `${error.message || ''} ${error.code || ''}`;
      if (/PGRST202|delete_list|does not exist|schema cache/i.test(em)) {
        const { error: e2 } = await supa.from('lists').delete().eq('id', id);
        if (e2) throw e2;
      } else throw error;
    }
    return { success: true };
  },
  async addItem(id, ticker, score_data) {
    const sc = scoreOf(score_data);
    const row = { list_id: id, ticker: String(ticker).toUpperCase().trim(), score: sc != null ? Math.round(Number(sc)) : null, score_data: score_data || null, weight: score_data?.stock?.weight ?? null };
    const { error } = await supa.from('list_items').upsert(row, { onConflict: 'list_id,ticker' });
    if (error) throw error;
    await supa.from('lists').update({ updated_at: new Date().toISOString() }).eq('id', id);
    return { success: true };
  },
  async removeItem(id, ticker) {
    const { error } = await supa.from('list_items').delete().eq('list_id', id).eq('ticker', ticker);
    if (error) throw error;
    return { success: true };
  },
  // Migration / import : copie des listes (localStorage ou fichier) vers le cloud.
  // Chemin préféré : RPC import_list → UNE entrée d'audit « list_created » (pas de
  // bruit par-action). Repli non-cassant (insertion directe) si la RPC n'existe
  // pas encore. On DÉDOUBLONNE les tickers et on ARRONDIT le score (colonne int).
  async importLocal(localLists) {
    let n = 0;
    for (const raw of (localLists || [])) {
      if (!raw || !raw.name) continue;
      const seen = new Set();
      const items = [];
      for (const i of (raw.items || [])) {
        const ticker = i && i.ticker != null ? String(i.ticker).toUpperCase().trim() : '';
        if (!ticker || seen.has(ticker)) continue;
        seen.add(ticker);
        items.push({
          ticker,
          weight: i.weight != null ? Number(i.weight) : null,
          score: i.score != null ? Math.round(Number(i.score)) : null,
          score_data: i.score_data || null,
        });
      }
      const { error } = await supa.rpc('import_list', {
        p_name: raw.name, p_index: raw.index_symbol || 'SPX', p_description: raw.description || '', p_items: items,
      });
      if (error) {
        const em = `${error.message || ''} ${error.code || ''}`;
        if (/PGRST202|import_list|does not exist|schema cache/i.test(em)) {
          await importListDirect(raw, items);   // DB pas encore à jour → insertion directe
        } else {
          throw error;
        }
      }
      n++;
    }
    return { imported: n };
  },
};

// Repli d'import (RPC import_list absente) : insertion directe list + items.
// Surface les erreurs et supprime la liste orpheline si les items échouent.
async function importListDirect(raw, items) {
  const { data: l, error } = await supa.from('lists')
    .insert({ user_id: currentUser.id, name: raw.name, index_symbol: raw.index_symbol || 'SPX', description: raw.description || '' })
    .select().single();
  if (error) throw error;
  if (!l) return;
  if (items.length) {
    const rows = items.map(i => ({ list_id: l.id, ticker: i.ticker, weight: i.weight, score: i.score, score_data: i.score_data }));
    const { error: e2 } = await supa.from('list_items').insert(rows);
    if (e2) { await supa.from('lists').delete().eq('id', l.id); throw e2; }
  }
}

// ── Stratégies construites (une par liste, clé dx-strategy-<listId>) ─────────
// Stockées telles quelles (jsonb). Le cloud est la source de vérité ; l'app
// continue de LIRE en synchrone depuis localStorage (ré-hydraté à la connexion),
// donc aucun écran n'a besoin de changer. list_id en texte : robuste quel que
// soit le format d'id de liste.
const strategies = {
  async getAll() {
    // `user_id` : distingue MES stratégies (à afficher/nettoyer) des stratégies
    // simplement rendues lisibles par la RLS de partage (owner ≠ moi).
    const { data, error } = await supa.from('strategies').select('list_id, data, user_id');
    if (error) throw error;
    return (data || []).map(r => ({ listId: String(r.list_id), data: r.data, owner: r.user_id }));
  },
  async save(listId, data) {
    const row = { user_id: currentUser.id, list_id: String(listId), data, built_at: data?.builtAt || null, updated_at: new Date().toISOString() };
    const { error } = await supa.from('strategies').upsert(row, { onConflict: 'user_id,list_id' });
    if (error) throw error;
    return { success: true };
  },
  async remove(listId) {
    const { error } = await supa.from('strategies').delete().eq('list_id', String(listId));
    if (error) throw error;
    return { success: true };
  },
};

// ── Positions committées (façonnées comme le store local dx-positions) ───────
function shapePosition(r) {
  return { id: r.id, list_id: r.list_id, name: r.name, strategy: r.strategy, status: r.status, committed_at: r.committed_at, snapshots: r.snapshots || [], group_name: r.group_name || null };
}
const positions = {
  async list(listId) {
    let q = supa.from('positions').select('*').order('committed_at', { ascending: false });
    if (listId) q = q.eq('list_id', String(listId));
    const { data, error } = await q;
    if (error) throw error;
    return (data || []).map(shapePosition);
  },
  async get(id) {
    const { data, error } = await supa.from('positions').select('*').eq('id', id).single();
    if (error) throw error;
    return shapePosition(data);
  },
  async commit(listId, name, strategy) {
    const { data, error } = await supa.from('positions')
      .insert({ user_id: currentUser.id, list_id: listId ? String(listId) : null, name: name || null, strategy, status: 'open', snapshots: [] })
      .select().single();
    if (error) throw error;
    return { success: true, commitment_id: data.id, id: data.id };
  },
  async addSnapshot(id, snap) {
    const { data: cur, error: e1 } = await supa.from('positions').select('snapshots').eq('id', id).single();
    if (e1) throw e1;
    const snaps = Array.isArray(cur?.snapshots) ? cur.snapshots.slice() : [];
    snaps.push(snap);
    const { error } = await supa.from('positions').update({ snapshots: snaps }).eq('id', id);
    if (error) throw error;
    return { success: true };
  },
  async setStatus(id, status) {
    const { error } = await supa.from('positions').update({ status }).eq('id', id);
    if (error) throw error;
    return { success: true };
  },
  async rename(id, name) {
    const { error } = await supa.from('positions').update({ name: name || null }).eq('id', id);
    if (error) throw error;
    return { success: true };
  },
  // Range une position dans un groupe (étiquette texte) ou l'en retire (null).
  // Colonne positions.group_name (voir SUPABASE_SETUP.md §16b). L'erreur remonte
  // si la colonne est absente → l'UI invite à appliquer la migration.
  async setGroup(id, group_name) {
    const g = (group_name && String(group_name).trim()) || null;
    const { error } = await supa.from('positions').update({ group_name: g }).eq('id', id);
    if (error) throw error;
    return { success: true, group_name: g };
  },
  async remove(id) {
    const { error } = await supa.from('positions').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  },
};

// ── Partage de listes (par e-mail, rôle viewer|editor) ──────────────────────
// La résolution e-mail → utilisateur passe par une fonction SQL SECURITY DEFINER
// (share_list) : le navigateur ne lit JAMAIS la table des comptes (auth.users).
// Les e-mails du propriétaire et du destinataire sont dénormalisés dans
// list_shares pour l'affichage. RLS et fonction : voir SUPABASE_SETUP.md §9.
const shares = {
  // Listes partagées AVEC moi (façonnées comme des listes + drapeaux de partage).
  // Réservé à Pro : un compte non-Pro ne voit AUCUNE liste partagée (le partage
  // est une fonctionnalité Pro, côté émetteur ET destinataire). La vraie
  // application est la RLS serveur (SUPABASE_SETUP.md §18) ; ceci est le miroir UI.
  async sharedWithMe() {
    if (!proAccess) return [];
    const { data: sh, error } = await supa.from('list_shares').select('*').eq('shared_with', currentUser.id);
    if (error) throw error;
    if (!sh || !sh.length) return [];
    const ids = sh.map(s => s.list_id);
    const { data: ls, error: e2 } = await supa.from('lists').select('*').in('id', ids);
    if (e2) throw e2;
    const { data: its } = await supa.from('list_items').select('*').in('list_id', ids);
    const byList = {};
    (its || []).forEach(it => { (byList[it.list_id] = byList[it.list_id] || []).push(it); });
    const meta = {}; sh.forEach(s => { meta[s.list_id] = s; });
    return (ls || []).map(l => ({
      ...shapeList(l, byList[l.id]),
      shared: true, role: meta[l.id]?.role || 'viewer',
      owner_email: meta[l.id]?.owner_email || null, share_id: meta[l.id]?.id,
    }));
  },
  // Partages d'une liste que JE possède (pour la gérer).
  async forList(listId) {
    const { data, error } = await supa.from('list_shares').select('*').eq('list_id', listId).eq('owner_id', currentUser.id).order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []).map(s => ({ id: s.id, email: s.shared_with_email, role: s.role, created_at: s.created_at }));
  },
  // Partager par e-mail via la RPC sécurisée. Erreurs possibles (message) :
  // not_owner, user_not_found, cannot_share_self, bad_role.
  async share(listId, email, role) {
    const { data, error } = await supa.rpc('share_list', { p_list_id: listId, p_email: email, p_role: role || 'viewer' });
    if (error) throw error;
    return data;
  },
  async setRole(shareId, role) {
    const { error } = await supa.from('list_shares').update({ role }).eq('id', shareId);
    if (error) throw error;
    return { success: true };
  },
  async revoke(shareId) {
    const { error } = await supa.from('list_shares').delete().eq('id', shareId);
    if (error) throw error;
    return { success: true };
  },
  // ── Partage par LIEN (invitation) ──────────────────────────────────────────
  // Le propriétaire crée un lien (token) avec un rôle ; quiconque l'ouvre en
  // étant connecté le « réclame » (RPC redeem_share_link) → il est ajouté aux
  // partages de la liste. Révocable (suppression du lien).
  async createLink(listId, role) {
    const { data, error } = await supa.from('share_links')
      .insert({ list_id: listId, owner_id: currentUser.id, role: role || 'viewer' })
      .select('id, token, role, created_at').single();
    if (error) throw error;
    return { id: data.id, token: data.token, role: data.role, created_at: data.created_at };
  },
  async links(listId) {
    const { data, error } = await supa.from('share_links')
      .select('id, token, role, created_at').eq('list_id', listId).eq('owner_id', currentUser.id)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  },
  async revokeLink(linkId) {
    const { error } = await supa.from('share_links').delete().eq('id', linkId);
    if (error) throw error;
    return { success: true };
  },
  async redeem(token) {
    // Rejoindre une liste partagée est réservé à Pro (destinataire). Bloqué côté
    // client ; la RPC le refuse aussi côté serveur (SUPABASE_SETUP.md §18).
    if (!proAccess) { const e = new Error('pro_required'); e.code = 'pro_required'; throw e; }
    const { data, error } = await supa.rpc('redeem_share_link', { p_token: token });
    if (error) throw error;
    return data;   // list_id
  },
};

// ── Journal d'audit (lecture seule côté client ; écrit par des triggers SQL) ──
const audit = {
  async forList(listId, limit = 100) {
    // Tri secondaire par id : plusieurs lignes d'une même transaction ont le MÊME
    // created_at ; sans ce tri, l'ordre serait arbitraire. id numérique (bigint).
    const { data, error } = await supa.from('audit_log').select('*')
      .eq('list_id', listId).order('created_at', { ascending: false }).order('id', { ascending: false }).limit(limit);
    if (error) throw error;
    return (data || []).map(r => ({ id: Number(r.id), actor_email: r.actor_email, action: r.action, detail: r.detail || {}, created_at: r.created_at }));
  },
  // Activité GLOBALE visible par l'utilisateur (toutes ses listes + partagées) —
  // la RLS ne renvoie que les lignes qu'il a le droit de voir.
  async recent(limit = 200) {
    const { data, error } = await supa.from('audit_log').select('*')
      .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(limit);
    if (error) throw error;
    return (data || []).map(r => ({ id: Number(r.id), list_id: r.list_id, actor_email: r.actor_email, action: r.action, detail: r.detail || {}, created_at: r.created_at }));
  },
};

// ── Alertes de corrélation (Pro) : chacun gère les siennes (RLS) ────────────
const alerts = {
  async list() {
    const { data, error } = await supa.from('alerts').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async create({ index, threshold, tickers }) {
    const row = {
      user_id: currentUser.id, email: currentUser.email,
      index_symbol: index, kind: 'impl_corr_pct',
      threshold: Math.max(1, Math.min(99, Math.round(threshold))),
      tickers: Array.isArray(tickers) ? tickers.slice(0, 20) : [],
      active: true,
    };
    const { data, error } = await supa.from('alerts').insert(row).select().single();
    if (error) throw error;
    return data;
  },
  async setActive(id, active) {
    const { error } = await supa.from('alerts').update({ active, triggered_at: null }).eq('id', id).eq('user_id', currentUser.id);
    if (error) throw error;
  },
  async remove(id) {
    const { error } = await supa.from('alerts').delete().eq('id', id).eq('user_id', currentUser.id);
    if (error) throw error;
  },
};

// ── Journal de trades (Pro) : chacun gère les siens (RLS) ───────────────────
const trades = {
  async list() {
    const { data, error } = await supa.from('trades').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async create(t) {
    const row = {
      user_id: currentUser.id,
      label: t.label || null,
      index_symbol: t.index || null,
      tickers: Array.isArray(t.tickers) ? t.tickers.slice(0, 30) : [],
      entry_date: t.entry_date || new Date().toISOString().slice(0, 10),
      horizon: t.horizon || null,
      entry_pct: t.entry_pct != null && t.entry_pct !== '' ? Math.round(t.entry_pct) : null,
      entry_prime: t.entry_prime != null && t.entry_prime !== '' ? Number(t.entry_prime) : null,
      status: 'open',
      notes: t.notes || null,
    };
    const { data, error } = await supa.from('trades').insert(row).select().single();
    if (error) throw error;
    return data;
  },
  async close(id, { exit_date, pnl, outcome, notes }) {
    const patch = {
      status: 'closed',
      exit_date: exit_date || new Date().toISOString().slice(0, 10),
      pnl: pnl != null && pnl !== '' ? Number(pnl) : null,
      outcome: outcome || null,
    };
    if (notes != null) patch.notes = notes;
    const { error } = await supa.from('trades').update(patch).eq('id', id).eq('user_id', currentUser.id);
    if (error) throw error;
  },
  async reopen(id) {
    const { error } = await supa.from('trades').update({ status: 'open', exit_date: null, pnl: null, outcome: null }).eq('id', id).eq('user_id', currentUser.id);
    if (error) throw error;
  },
  async remove(id) {
    const { error } = await supa.from('trades').delete().eq('id', id).eq('user_id', currentUser.id);
    if (error) throw error;
  },
};

// ── Notifications « intelligentes » (lecture seule côté client, RLS par user).
// Produites par les crons serveur (voir api/_lib/notify.js). ─────────────────
const notifications = {
  async list(limit = 50) {
    const { data, error } = await supa.from('notifications').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false }).limit(limit);
    if (error) throw error;
    return data || [];
  },
};

// Portabilité RGPD (art. 20) : rassemble TOUTES les données de l'utilisateur
// (RLS → uniquement les siennes ; on exclut les stratégies partagées par autrui)
// en un objet JSON exportable/téléchargeable.
async function exportAccount() {
  if (!supa || !currentUser) throw new Error('not_signed_in');
  const safe = (p) => p.catch(() => []);
  const [ls, st, pos, tr, al] = await Promise.all([
    safe(lists.getAll()),
    safe(strategies.getAll()),
    safe(positions.list()),
    safe(trades.list()),
    safe(alerts.list()),
  ]);
  return {
    export_format: 'dispersionx-account-export',
    version: 1,
    exported_at: new Date().toISOString(),
    account: { id: currentUser.id, email: currentUser.email, name: currentUser.name, email_verified: !!currentUser.emailVerified },
    subscription: { pro: proAccess, status: proStatus, current_period_end: proPeriodEnd, subscribed: proSubscribed },
    lists: ls,
    strategies: (st || []).filter(s => !s.owner || s.owner === currentUser.id),   // les miennes uniquement
    positions: pos,
    trades: tr,
    alerts: al,
  };
}

// ── API publique exposée au reste de l'app (js/api.js, Auth.jsx, app.jsx) ────
window.DXCloud = {
  configured: !!supa,
  get enabled() { return !!(supa && currentUser); },
  get user() { return currentUser; },
  get pendingMfa() { return pendingMfa; },   // { factorId } si un défi 2FA reste à valider
  auth: supa ? auth : null,
  get pro() { return proAccess; },
  get proSubscribed() { return proSubscribed; },
  get proStatus() { return proStatus; },
  get proPeriodEnd() { return proPeriodEnd; },
  get proSince() { return proSince; },
  isPro: () => checkPro(),
  startProCheckout: (cycle) => proApi.startCheckout(cycle),
  refreshPro: () => proApi.refresh(),
  confirmPro: (sessionId) => proApi.confirmCheckout(sessionId),
  openProPortal: () => proApi.openPortal(),
  proHistory: () => proApi.history(),
  requestRefund: () => proApi.requestRefund(),
  exportAccount: () => exportAccount(),
  lists: supa ? lists : null,
  strategies: supa ? strategies : null,
  positions: supa ? positions : null,
  shares: supa ? shares : null,
  audit: supa ? audit : null,
  alerts: supa ? alerts : null,
  trades: supa ? trades : null,
  notifications: supa ? notifications : null,
};

// ── Suivi de session : maintient currentUser + prévient l'app ───────────────
async function maybeMigrateLocalLists() {
  try {
    if (!currentUser) return;
    const flag = 'dx-migrated-' + currentUser.id;
    if (localStorage.getItem(flag)) return;
    const local = JSON.parse(localStorage.getItem('dx-lists') || '[]');
    const cloud = await lists.getAll();
    if (Array.isArray(local) && local.length && cloud.length === 0) {
      await lists.importLocal(local);
      window.dispatchEvent(new CustomEvent('dx-lists-changed'));
    }
    localStorage.setItem(flag, '1');
  } catch (e) { console.warn('[cloud] migration listes :', e?.message); }
}

// Purge le cache LOCAL des stratégies (clés dx-strategy-<listId>). Utilisé à la
// déconnexion et avant chaque hydratation → aucune stratégie d'un compte/session
// précédent ne subsiste dans localStorage.
function purgeLocalStrategies() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.indexOf('dx-strategy-') === 0) localStorage.removeItem(k);
    }
  } catch {}
}

// Stratégies : le cloud est la SEULE source de vérité, STRICTEMENT scopé au
// compte (RLS). À la connexion on : (1) auto-répare le cloud en supprimant MES
// stratégies orphelines (liste plus détenue — résidu de l'ancien bug de
// migration inter-comptes) ; (2) remonte les stratégies locales UNIQUEMENT si
// leur liste m'appartient (jamais les fuites d'un autre compte) ; (3) PURGE le
// cache local et le réécrit EXACTEMENT depuis le cloud (mes stratégies +
// partagées). Résultat : le Monitor ne montre QUE les stratégies du compte.
async function syncStrategies() {
  try {
    if (!currentUser) return;
    // La lecture des listes DOIT réussir avant toute auto-réparation. Si elle
    // échoue (réseau, RLS…), ownLists reste null → on NE SUPPRIME RIEN : sinon
    // toutes mes stratégies passeraient pour « orphelines » (ownIds vide) et
    // seraient effacées du cloud (perte de données irréversible).
    let ownLists = null;
    try { ownLists = await lists.getAll(); }
    catch (e) { console.warn('[cloud] sync stratégies : lecture des listes échouée — auto-réparation ignorée', e?.message); }
    const ownIds = new Set((ownLists || []).map(l => String(l.id)));
    let cloud = await strategies.getAll();               // [{ listId, data, owner }] — miennes + partagées

    // (1) Auto-réparation : mes stratégies dont la liste ne m'appartient PLUS
    //     (contamination d'un autre compte, ou liste supprimée) → à retirer.
    //     UNIQUEMENT si la lecture des listes a réussi ET renvoyé ≥1 liste. Une
    //     liste VIDE peut venir d'un blocage silencieux (RLS aal2 qui renvoie []
    //     SANS erreur, pas un throw) → on ne supprime rien, au risque de tout
    //     effacer. Un compte sans aucune liste ne perd donc pas ses stratégies
    //     (elles restent, simplement pas auto-nettoyées — bénin).
    if (ownLists && ownLists.length) {
      const orphans = cloud.filter(s => s.owner === currentUser.id && !ownIds.has(s.listId));
      for (const s of orphans) { try { await strategies.remove(s.listId); } catch {} }
      if (orphans.length) cloud = cloud.filter(s => !(s.owner === currentUser.id && !ownIds.has(s.listId)));
    }

    // (2) Migration guest→compte (1×) : uniquement les stratégies locales dont
    //     la liste M'APPARTIENT (une stratégie construite hors-ligne pour une de
    //     mes listes). Jamais les résidus d'un autre compte.
    const have = new Set(cloud.map(s => s.listId));
    const flag = 'dx-strat-migrated-' + currentUser.id;
    // ownLists fiable requis (≥1 liste, cf. ci-dessus) : sans ça on ne migre pas
    // ET on ne pose pas le drapeau (une prochaine synchro réussie fera la migration).
    if (ownLists && ownLists.length && !localStorage.getItem(flag)) {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.indexOf('dx-strategy-') === 0) keys.push(k); }
      for (const k of keys) {
        const listId = k.slice('dx-strategy-'.length);
        if (have.has(listId) || !ownIds.has(listId)) continue;
        let s; try { s = JSON.parse(localStorage.getItem(k)); } catch { continue; }
        if (s && Array.isArray(s.components)) { await strategies.save(listId, s); cloud.push({ listId, data: s }); have.add(listId); }
      }
      localStorage.setItem(flag, '1');
    }

    // (3) Le cache local REFLÈTE EXACTEMENT le cloud du compte + on marque son
    //     propriétaire (scoping : purge auto si un autre compte réouvre l'app).
    purgeLocalStrategies();
    for (const s of cloud) { try { localStorage.setItem('dx-strategy-' + s.listId, JSON.stringify(s.data)); } catch {} }
    try { localStorage.setItem('dx-strat-owner', currentUser.id); } catch {}
    window.dispatchEvent(new CustomEvent('dx-strategies-changed'));
  } catch (e) { console.warn('[cloud] sync stratégies :', e?.message); }
}

async function onSignedIn() {
  // Double authentification en attente (session AAL1, défi AAL2 requis) : NE PAS
  // synchroniser maintenant. Avec l'enforcement MFA côté serveur (RLS aal2), les
  // lectures cloud sont refusées à AAL1 → syncStrategies purgerait le cache local à
  // tort. On diffère ET on DEMANDE le code à l'UI via un événement GLOBAL — ce qui
  // couvre TOUS les modes d'entrée (mot de passe, OAuth Google/Discord, rechargement),
  // pas seulement le formulaire de connexion. auth.mfa.verify relance onSignedIn.
  try {
    const pend = await auth.mfa.pendingChallenge();
    if (pend) {
      pendingMfa = pend;
      window.dispatchEvent(new CustomEvent('dx-mfa-required', { detail: pend }));
      return;
    }
  } catch {}
  pendingMfa = null;
  // Changement de compte à chaud : si le cache local appartenait à un AUTRE
  // compte, purger ses positions locales (repli hors-ligne/invité). Les
  // positions d'un même compte sont préservées (pas de re-sync cloud). Les
  // stratégies sont, elles, réécrites depuis le cloud par syncStrategies.
  let owner = ''; try { owner = localStorage.getItem('dx-strat-owner') || ''; } catch {}
  if (currentUser && owner && owner !== currentUser.id) {
    // Vrai changement de compte (owner = un AUTRE compte, ≠ invité) → purger les
    // caches locaux de positions ET de listes AVANT toute migration, pour ne pas
    // remonter les résidus de l'autre compte. (Invité→compte : owner vide → on ne
    // purge pas → la migration invité fonctionne.)
    try { localStorage.removeItem('dx-positions'); } catch {}
    try { localStorage.removeItem('dx-lists'); } catch {}
    window.dispatchEvent(new CustomEvent('dx-positions-changed'));
    window.dispatchEvent(new CustomEvent('dx-lists-changed'));
  }
  await maybeMigrateLocalLists();
  await syncStrategies();
  proAccess = await checkPro();
  window.dispatchEvent(new CustomEvent('dx-pro-change', { detail: proAccess }));
}

if (supa) {
  supa.auth.getSession().then(({ data }) => {
    currentUser = userFromSession(data.session);
    window.dispatchEvent(new CustomEvent('dx-auth-change', { detail: currentUser }));
    // Cache local scopé au dernier compte hydraté : si la session au démarrage
    // (ou son absence : session expirée / invité) ne correspond pas, on purge le
    // résidu — aucune stratégie d'un autre compte ne survit à une réouverture.
    let owner = ''; try { owner = localStorage.getItem('dx-strat-owner') || ''; } catch {}
    if (owner !== (currentUser?.id || '')) {
      purgeLocalStrategies();
      try { localStorage.removeItem('dx-positions'); } catch {}   // positions locales d'un autre compte
      try { localStorage.removeItem('dx-lists'); } catch {}        // listes locales/repli d'un autre compte
      try { if (currentUser) localStorage.setItem('dx-strat-owner', currentUser.id); else localStorage.removeItem('dx-strat-owner'); } catch {}
      window.dispatchEvent(new CustomEvent('dx-strategies-changed'));
      window.dispatchEvent(new CustomEvent('dx-positions-changed'));
      window.dispatchEvent(new CustomEvent('dx-lists-changed'));
    }
    if (currentUser) onSignedIn();
  });
  supa.auth.onAuthStateChange((evt, session) => {
    const prev = currentUser?.id;
    currentUser = userFromSession(session);
    window.dispatchEvent(new CustomEvent('dx-auth-change', { detail: currentUser }));
    if (evt === 'PASSWORD_RECOVERY') window.dispatchEvent(new CustomEvent('dx-password-recovery'));
    if (currentUser && currentUser.id !== prev) onSignedIn();
    else if (!currentUser) {
      // Déconnexion : purger les caches locaux (stratégies + positions) → aucune
      // fuite vers la session suivante (invité ou autre compte). Rafraîchir l'UI.
      pendingMfa = null;
      purgeLocalStrategies();
      try { localStorage.removeItem('dx-positions'); } catch {}
      try { localStorage.removeItem('dx-lists'); } catch {}
      try { localStorage.removeItem('dx-strat-owner'); } catch {}
      proAccess = false;
      window.dispatchEvent(new CustomEvent('dx-pro-change', { detail: false }));
      window.dispatchEvent(new CustomEvent('dx-strategies-changed'));
      window.dispatchEvent(new CustomEvent('dx-positions-changed'));
      window.dispatchEvent(new CustomEvent('dx-lists-changed'));
    }
  });
  // Les partages changent (ex. après avoir réclamé un lien) → ré-hydrate les
  // constructions : getAll() renvoie AUSSI celles partagées (RLS §9), donc les
  // constructions reçues apparaissent dans le Strategy Monitor / Risk Lab.
  let _stratSyncT = null;
  window.addEventListener('dx-lists-changed', () => {
    if (!currentUser) return;
    clearTimeout(_stratSyncT);
    _stratSyncT = setTimeout(() => syncStrategies(), 1500);
  });
}
