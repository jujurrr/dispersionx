// Filet anti-écrasement : une seule stratégie par liste (contrainte jusqu'au
// schéma cloud), donc reconstruire remplace. Le Builder persiste AUTOMATIQUEMENT
// à chaque réglage → la stratégie précédente disparaissait sans un clic.
// Ces tests prouvent que la remplacée reste récupérable, et surtout qu'elle
// SURVIT à la rafale d'enregistrements du Builder.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function loadApi() {
  const store = new Map();
  const localStorage = {
    get length() { return store.size; },
    key: i => Array.from(store.keys())[i] ?? null,
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
  };
  const win = {
    location: { origin: 'http://localhost' }, localStorage,
    addEventListener() {}, removeEventListener() {}, dispatchEvent() {},
    CustomEvent: class { constructor(t) { this.type = t; } },
    DXMock: { strategy: {} },
  };
  win.window = win;
  const ctx = vm.createContext({
    window: win, localStorage, console, CustomEvent: win.CustomEvent,
    fetch: () => Promise.reject(new Error('offline')),
    setInterval: () => 0, setTimeout: () => 0, clearInterval: () => {},
    Date, JSON, Math, String, Number, Object, Array, isFinite, isNaN, parseFloat, parseInt, Set, Map, Promise, Error,
  });
  vm.runInContext(readFileSync(new URL('../js/api.js', import.meta.url), 'utf8'), ctx);
  return { api: win.DXApi, localStorage };
}

const base = (over = {}) => ({
  listId: 'L1', index: 'NDX', duration: 30, expiry: '2026-08-21', nIndex: 1,
  sizingMethod: 'vega_neutral', weightBasis: 'capped', deltaHedge: 'index',
  components: [{ ticker: 'AAPL', nContracts: 3 }, { ticker: 'MSFT', nContracts: 2 }],
  portfolio: { netVega: -40, netPremium: 700 }, builtAt: '2026-07-10T10:00:00Z', ...over,
});

test('remplacer une stratégie la rend restaurable', () => {
  const { api } = loadApi();
  const v1 = base({ sizingMethod: 'vega_neutral' });
  api.saveStrategy('L1', v1);
  assert.equal(api.previousStrategy('L1'), null, 'rien à restaurer au premier enregistrement');

  const v2 = base({ sizingMethod: 'theta_flat' });
  api.saveStrategy('L1', v2);

  const prev = api.previousStrategy('L1');
  assert.ok(prev, 'la stratégie remplacée est archivée');
  assert.equal(prev.sizingMethod, 'vega_neutral');
});

test("la rafale d'enregistrements du Builder ne chasse PAS l'originale", () => {
  // Le cas qui perdait les données : Construction embarquée ré-enregistre à
  // CHAQUE réglage. Sans verrou par session, le 2ᵉ ajustement remplacerait
  // l'archive par un brouillon intermédiaire et l'originale serait perdue.
  const { api } = loadApi();
  api.saveStrategy('L1', base({ sizingMethod: 'vega_neutral' }));   // l'originale

  api.saveStrategy('L1', base({ sizingMethod: 'theta_flat' }));     // entrée dans le Builder
  api.saveStrategy('L1', base({ sizingMethod: 'theta_flat', nIndex: 2 }));
  api.saveStrategy('L1', base({ sizingMethod: 'theta_flat', nIndex: 3, deltaHedge: 'legs' }));

  const prev = api.previousStrategy('L1');
  assert.equal(prev.sizingMethod, 'vega_neutral', "c'est bien l'originale qui est conservée");
  assert.equal(prev.nIndex, 1);
});

test('renommer ou ranger ne compte PAS comme un remplacement', () => {
  const { api } = loadApi();
  api.saveStrategy('L1', base());
  api.renameStrategy('L1', 'Dispersion août');
  api.setStrategyGroup('L1', 'Court terme');
  // Aucun choix de construction n'a changé → rien à archiver, sinon le filet se
  // remplirait de faux remplacements et masquerait le vrai.
  assert.equal(api.previousStrategy('L1'), null);
});

test('restaurer échange les deux — donc restaurer est annulable', () => {
  const { api } = loadApi();
  api.saveStrategy('L1', base({ sizingMethod: 'vega_neutral' }));
  api.saveStrategy('L1', base({ sizingMethod: 'theta_flat' }));

  const r = api.restoreStrategy('L1');
  assert.equal(r.success, true);
  assert.equal(api.localStrategies([])[0].sizingMethod, 'vega_neutral', 'la précédente redevient courante');
  assert.equal(api.previousStrategy('L1').sizingMethod, 'theta_flat', "celle qu'on vient d'écarter est récupérable");

  api.restoreStrategy('L1');   // aller-retour
  assert.equal(api.localStrategies([])[0].sizingMethod, 'theta_flat');
});

test("l'archive n'est jamais prise pour une stratégie", () => {
  // Piège : `localStrategies()` énumère les clés `dx-strategy-*`. Un préfixe
  // d'archive mal choisi ferait apparaître un doublon fantôme dans « Mes stratégies ».
  const { api, localStorage } = loadApi();
  api.saveStrategy('L1', base({ sizingMethod: 'vega_neutral' }));
  api.saveStrategy('L1', base({ sizingMethod: 'theta_flat' }));

  const all = api.localStrategies([{ id: 'L1', name: 'Tech' }]);
  assert.equal(all.length, 1, 'une seule stratégie listée, pas son archive');
  assert.equal(all[0].listId, 'L1');
  // Et l'archive ne porte pas le préfixe des stratégies (sinon la remontée cloud
  // et l'EarningsPanel la ramasseraient aussi).
  const keys = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i));
  assert.equal(keys.filter(k => k.indexOf('dx-strategy-') === 0).length, 1);
  assert.ok(keys.some(k => k.indexOf('dx-stratprev-') === 0), 'archive stockée sous son propre préfixe');
});

test('supprimer une stratégie supprime son archive', () => {
  const { api, localStorage } = loadApi();
  api.saveStrategy('L1', base({ sizingMethod: 'vega_neutral' }));
  api.saveStrategy('L1', base({ sizingMethod: 'theta_flat' }));
  api.deleteLocalStrategy('L1');
  // Sinon l'archive resterait sans écran pour l'atteindre — de la donnée morte.
  assert.equal(api.previousStrategy('L1'), null);
  const keys = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i));
  assert.equal(keys.length, 0);
});

test('les listes ne se marchent pas dessus', () => {
  const { api } = loadApi();
  api.saveStrategy('L1', base({ sizingMethod: 'vega_neutral' }));
  api.saveStrategy('L2', { ...base({ sizingMethod: 'gamma_flat' }), listId: 'L2' });
  api.saveStrategy('L1', base({ sizingMethod: 'theta_flat' }));

  assert.equal(api.previousStrategy('L1').sizingMethod, 'vega_neutral');
  assert.equal(api.previousStrategy('L2'), null, 'L2 n\'a rien remplacé');
});
