// Résolution du NOM d'une stratégie — le contrat de l'écran « Mes stratégies ».
// Règle : une stratégie hérite du nom de sa liste source tant qu'elle n'a pas de
// nom propre ; dès qu'on la renomme, son nom propre gagne et devient indépendant
// de la liste. Comme tous les écrans (Mes stratégies, Strategy Monitor, Suivi)
// passent par cette MÊME résolution, la tester ici couvre la propagation partout.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// js/api.js est un IIFE navigateur : on lui fabrique un window minimal.
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
    location: { origin: 'http://localhost' },
    localStorage,
    addEventListener() {}, removeEventListener() {}, dispatchEvent() {},
    CustomEvent: class { constructor(t) { this.type = t; } },
    DXMock: { strategy: {} },
  };
  win.window = win;
  const ctx = vm.createContext({
    window: win, localStorage, console,
    // Global nu : api.js fait `new CustomEvent(...)` sans préfixe `window.`
    // (le health-check périodique en émet un hors de tout try/catch).
    CustomEvent: win.CustomEvent,
    fetch: () => Promise.reject(new Error('offline')),
    setInterval: () => 0, setTimeout: () => 0, clearInterval: () => {},
    Date, JSON, Math, String, Number, Object, Array, isFinite, parseFloat, parseInt, Set, Map, Promise, Error,
  });
  vm.runInContext(readFileSync(new URL('../js/api.js', import.meta.url), 'utf8'), ctx);
  return { api: win.DXApi, localStorage };
}

const STRAT = { components: [{ ticker: 'AAPL' }], index: 'NDX', duration: 30, portfolio: {}, builtAt: '2026-07-10T10:00:00Z' };

test('strategyName : hérite du nom de liste, puis le nom propre prend le dessus', () => {
  const { api } = loadApi();
  // Sans nom propre → nom de la liste source.
  assert.equal(api.strategyName({ ...STRAT }, 'Tech NDX Core'), 'Tech NDX Core');
  // Avec nom propre → il gagne, la liste n'est plus consultée.
  assert.equal(api.strategyName({ ...STRAT, name: 'Dispersion juillet' }, 'Tech NDX Core'), 'Dispersion juillet');
  // Repli sur l'indice : jamais de nom vide affiché.
  assert.equal(api.strategyName({ ...STRAT }, null), 'NDX');
  // Nom propre vide/blanc = pas un nom → on retombe sur l'héritage.
  assert.equal(api.strategyName({ ...STRAT, name: '   ' }, 'Tech NDX Core'), 'Tech NDX Core');
});

test('renameStrategy : écrit un nom propre, puis null restaure l\'héritage', () => {
  const { api, localStorage } = loadApi();
  localStorage.setItem('dx-strategy-L1', JSON.stringify(STRAT));
  const lists = [{ id: 'L1', name: 'Tech NDX Core' }];

  // Avant renommage : hérité.
  assert.equal(api.localStrategies(lists)[0].displayName, 'Tech NDX Core');

  api.renameStrategy('L1', 'Dispersion juillet');
  assert.equal(api.localStrategies(lists)[0].displayName, 'Dispersion juillet');
  // Le nom propre est bien PERSISTÉ dans le blob (donc write-through cloud).
  assert.equal(JSON.parse(localStorage.getItem('dx-strategy-L1')).name, 'Dispersion juillet');

  // Renommer la LISTE ne doit plus rien changer : le nom propre est indépendant.
  assert.equal(api.localStrategies([{ id: 'L1', name: 'Autre nom' }])[0].displayName, 'Dispersion juillet');

  // Réinitialisation → l'héritage reprend, et le champ disparaît du blob.
  api.renameStrategy('L1', null);
  assert.equal(api.localStrategies(lists)[0].displayName, 'Tech NDX Core');
  assert.equal('name' in JSON.parse(localStorage.getItem('dx-strategy-L1')), false);
});

test('renommer la liste se propage à la stratégie non renommée', () => {
  const { api, localStorage } = loadApi();
  localStorage.setItem('dx-strategy-L1', JSON.stringify(STRAT));
  // Le nom n'est pas figé dans le blob : il est résolu au rendu depuis `lists`.
  assert.equal(api.localStrategies([{ id: 'L1', name: 'Avant' }])[0].displayName, 'Avant');
  assert.equal(api.localStrategies([{ id: 'L1', name: 'Après' }])[0].displayName, 'Après');
});

test('strategyMetrics.name porte le nom de la stratégie (libellé du Monitor)', () => {
  const { api, localStorage } = loadApi();
  localStorage.setItem('dx-strategy-L1', JSON.stringify(STRAT));
  const lists = [{ id: 'L1', name: 'Tech NDX Core' }];

  assert.match(api.strategyMetrics(api.localStrategies(lists)[0]).name, /Tech NDX Core/);
  api.renameStrategy('L1', 'Dispersion juillet');
  assert.match(api.strategyMetrics(api.localStrategies(lists)[0]).name, /Dispersion juillet/);
});

test('setStrategyGroup : range dans le blob, et null retire du groupe', () => {
  const { api, localStorage } = loadApi();
  localStorage.setItem('dx-strategy-L1', JSON.stringify(STRAT));
  const lists = [{ id: 'L1', name: 'Tech NDX Core' }];

  api.setStrategyGroup('L1', 'Court terme');
  assert.equal(api.localStrategies(lists)[0].group_name, 'Court terme');
  // Rangé DANS le blob → suit le write-through cloud, sans colonne Supabase.
  assert.equal(JSON.parse(localStorage.getItem('dx-strategy-L1')).group_name, 'Court terme');

  api.setStrategyGroup('L1', null);
  assert.equal(api.localStrategies(lists)[0].group_name, undefined);
});

test('renommer/ranger ne touche PAS la stratégie voisine', () => {
  const { api, localStorage } = loadApi();
  localStorage.setItem('dx-strategy-L1', JSON.stringify(STRAT));
  localStorage.setItem('dx-strategy-L2', JSON.stringify({ ...STRAT, index: 'SPX' }));
  const lists = [{ id: 'L1', name: 'Liste 1' }, { id: 'L2', name: 'Liste 2' }];

  api.renameStrategy('L1', 'Renommée');
  const byId = Object.fromEntries(api.localStrategies(lists).map(s => [s.listId, s]));
  assert.equal(byId.L1.displayName, 'Renommée');
  assert.equal(byId.L2.displayName, 'Liste 2');   // intacte
});
