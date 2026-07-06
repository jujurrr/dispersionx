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

let supa = null;
try {
  if (URL && KEY) supa = createClient(URL, KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
} catch (e) { console.warn('[cloud] init Supabase échouée :', e?.message); supa = null; }

let currentUser = null;

function userFromSession(session) {
  const u = session?.user;
  if (!u) return null;
  const m = u.user_metadata || {};
  return { id: u.id, email: u.email, name: m.name || m.full_name || (u.email ? u.email.split('@')[0] : 'Utilisateur') };
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
  async signInGoogle() {
    const { error } = await supa.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
    if (error) throw error;   // redirection ; la session revient via onAuthStateChange
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
    const { data: ls, error } = await supa.from('lists').select('*').order('created_at', { ascending: true });
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
    return shapeList(l, its);
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
  async remove(id) {
    const { error } = await supa.from('lists').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  },
  async addItem(id, ticker, score_data) {
    const row = { list_id: id, ticker, score: scoreOf(score_data), score_data: score_data || null, weight: score_data?.stock?.weight ?? null };
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
  // Migration : copie les listes localStorage vers le cloud (une seule fois).
  async importLocal(localLists) {
    let n = 0;
    for (const raw of (localLists || [])) {
      if (!raw || !raw.name) continue;
      const { data: l, error } = await supa.from('lists')
        .insert({ user_id: currentUser.id, name: raw.name, index_symbol: raw.index_symbol || 'SPX', description: raw.description || '' })
        .select().single();
      if (error || !l) continue;
      const items = (raw.items || []).filter(i => i && i.ticker).map(i => ({
        list_id: l.id, ticker: i.ticker, weight: i.weight ?? null, score: i.score ?? null, score_data: i.score_data || null,
      }));
      if (items.length) await supa.from('list_items').insert(items);
      n++;
    }
    return { imported: n };
  },
};

// ── Stratégies construites (une par liste, clé dx-strategy-<listId>) ─────────
// Stockées telles quelles (jsonb). Le cloud est la source de vérité ; l'app
// continue de LIRE en synchrone depuis localStorage (ré-hydraté à la connexion),
// donc aucun écran n'a besoin de changer. list_id en texte : robuste quel que
// soit le format d'id de liste.
const strategies = {
  async getAll() {
    const { data, error } = await supa.from('strategies').select('list_id, data');
    if (error) throw error;
    return (data || []).map(r => ({ listId: String(r.list_id), data: r.data }));
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
  return { id: r.id, list_id: r.list_id, name: r.name, strategy: r.strategy, status: r.status, committed_at: r.committed_at, snapshots: r.snapshots || [] };
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
  async remove(id) {
    const { error } = await supa.from('positions').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  },
};

// ── API publique exposée au reste de l'app (js/api.js, Auth.jsx, app.jsx) ────
window.DXCloud = {
  configured: !!supa,
  get enabled() { return !!(supa && currentUser); },
  get user() { return currentUser; },
  auth: supa ? auth : null,
  lists: supa ? lists : null,
  strategies: supa ? strategies : null,
  positions: supa ? positions : null,
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

// Stratégies : le cloud est la source de vérité. On REMONTE d'abord les
// stratégies présentes seulement en local (migration unique), puis on REDESCEND
// toutes les stratégies cloud dans localStorage — ainsi les lectures SYNCHRONES
// de l'app (dx-strategy-<listId>) reflètent le cloud sans changer leur code.
async function syncStrategies() {
  try {
    if (!currentUser) return;
    const cloud = await strategies.getAll();               // [{ listId, data }]
    const have = new Set(cloud.map(s => s.listId));
    const flag = 'dx-strat-migrated-' + currentUser.id;
    if (!localStorage.getItem(flag)) {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.indexOf('dx-strategy-') === 0) keys.push(k);
      }
      for (const k of keys) {
        const listId = k.slice('dx-strategy-'.length);
        if (have.has(listId)) continue;
        let s; try { s = JSON.parse(localStorage.getItem(k)); } catch { continue; }
        if (s && Array.isArray(s.components)) { await strategies.save(listId, s); cloud.push({ listId, data: s }); have.add(listId); }
      }
      localStorage.setItem(flag, '1');
    }
    for (const s of cloud) {
      try { localStorage.setItem('dx-strategy-' + s.listId, JSON.stringify(s.data)); } catch {}
    }
    window.dispatchEvent(new CustomEvent('dx-strategies-changed'));
  } catch (e) { console.warn('[cloud] sync stratégies :', e?.message); }
}

async function onSignedIn() {
  await maybeMigrateLocalLists();
  await syncStrategies();
}

if (supa) {
  supa.auth.getSession().then(({ data }) => {
    currentUser = userFromSession(data.session);
    window.dispatchEvent(new CustomEvent('dx-auth-change', { detail: currentUser }));
    if (currentUser) onSignedIn();
  });
  supa.auth.onAuthStateChange((_evt, session) => {
    const prev = currentUser?.id;
    currentUser = userFromSession(session);
    window.dispatchEvent(new CustomEvent('dx-auth-change', { detail: currentUser }));
    if (currentUser && currentUser.id !== prev) onSignedIn();
  });
}
