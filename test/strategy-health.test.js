// Santé d'une stratégie : l'alerte doit porter sur le grec que la STRUCTURE
// prétend neutraliser. Avant, le vega était contrôlé quelle que soit la structure
// → toute stratégie theta-flat / gamma-flat / premium-neutral restait marquée
// « Vega déséquilibré » à vie, alors que son vega est libre PAR CONSTRUCTION.
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
    // Vrai calcul de DTE : un stub constant masquerait la logique de date
    // (et donc la priorité de l'alerte « échéance courte » sur celle de structure).
    DXExpiry: { dteTo: iso => Math.ceil((new Date(iso + 'T00:00:00').getTime() - Date.now()) / 86400000), fmtExpiry: d => d },
  };
  win.window = win;
  const ctx = vm.createContext({
    window: win, localStorage, console, CustomEvent: win.CustomEvent,
    fetch: () => Promise.reject(new Error('offline')),
    setInterval: () => 0, setTimeout: () => 0, clearInterval: () => {},
    Date, JSON, Math, String, Number, Object, Array, isFinite, isNaN, parseFloat, parseInt, Set, Map, Promise, Error,
  });
  vm.runInContext(readFileSync(new URL('../js/api.js', import.meta.url), 'utf8'), ctx);
  return win.DXApi;
}

// Échéance calculée par rapport à AUJOURD'HUI : une date en dur finirait par
// tomber dans le passé et ferait basculer tous les cas en « échéance courte ».
const inDays = n => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

// Jambe indice de référence ~1 000 par grec ; le net varie selon le scénario.
const strat = (sizingMethod, portfolio) => ({
  listId: 'L1', index: 'NDX', duration: 30, expiry: inDays(25), nIndex: 1,
  sizingMethod, components: [{ ticker: 'AAPL', nContracts: 2 }],
  builtAt: '2026-07-10T10:00:00Z',
  portfolio: { idxVega: 1500, idxTheta: 1000, idxGamma: 1000, idxPrem: 1000,
    netVega: 0, netTheta: 0, netGamma: 0, netPremium: 0, netDelta: 0, ...portfolio },
});

test('theta-flat : un gros vega n\'est PLUS une alerte (il est libre par choix)', () => {
  const api = loadApi();
  // Vega net énorme (bien au-delà des 250 $ du seuil) mais theta bien neutralisé.
  const m = api.strategyMetrics(strat('theta_flat', { netVega: -900, netTheta: 20 }));
  assert.equal(m.status, 'sain');
  assert.equal(m.alert, null, 'aucun faux positif « Vega déséquilibré »');
  assert.equal(m.neutralised, 'theta');
});

test('theta-flat : en revanche un theta MAL neutralisé est signalé', () => {
  const api = loadApi();
  // Résidu 400/1000 = 40 % de la jambe indice → la structure ne tient pas sa promesse.
  const m = api.strategyMetrics(strat('theta_flat', { netTheta: 400, netVega: -900 }));
  assert.equal(m.status, 'surveiller');
  assert.match(m.alert, /Theta non neutralisé/);
  assert.match(m.alert, /40 %/);
});

test('vega-neutre : le contrôle vega historique est conservé', () => {
  const api = loadApi();
  assert.equal(api.strategyMetrics(strat('vega_neutral', { netVega: -40 })).status, 'sain');
  const bad = api.strategyMetrics(strat('vega_neutral', { netVega: -900 }));
  assert.equal(bad.status, 'surveiller');
  assert.match(bad.alert, /Vega déséquilibré/);
});

test('gamma-flat et premium-neutral contrôlent LEUR grec', () => {
  const api = loadApi();
  // Gamma conforme malgré un vega délirant.
  assert.equal(api.strategyMetrics(strat('gamma_flat', { netGamma: 100, netVega: -2000 })).alert, null);
  // Gamma dérivé de 50 %.
  assert.match(api.strategyMetrics(strat('gamma_flat', { netGamma: 500 })).alert, /Gamma non neutralisé/);
  // Prime dérivée de 60 %.
  assert.match(api.strategyMetrics(strat('premium_neutral', { netPremium: 600 })).alert, /Prime non neutralisé/);
});

test('« 1 lot » ne promet rien → aucune alerte de structure', () => {
  const api = loadApi();
  const m = api.strategyMetrics(strat('equal_weight', { netVega: -3000, netGamma: 2000 }));
  assert.equal(m.neutralised, null);
  assert.equal(m.alert, null);
});

test('stratégie ANCIENNE sans idxGamma : on se tait plutôt que d\'inventer', () => {
  const api = loadApi();
  // idxGamma absent (construite avant qu'on le stocke) → référence inconnue.
  const s = strat('gamma_flat', { netGamma: 5000 });
  delete s.portfolio.idxGamma;
  assert.equal(api.strategyMetrics(s).alert, null, 'aucun verdict sur une donnée manquante');
});

test('sizingMethod absent = vega-neutre (comportement historique préservé)', () => {
  const api = loadApi();
  const s = strat('vega_neutral', { netVega: -900 });
  delete s.sizingMethod;
  const m = api.strategyMetrics(s);
  assert.equal(m.sizing, 'vega_neutral');
  assert.match(m.alert, /Vega déséquilibré/);
});

test('une échéance courte reste prioritaire sur le contrôle de structure', () => {
  const api = loadApi();
  const s = strat('theta_flat', { netTheta: 400 });
  s.expiry = null; s.duration = 30;
  s.builtAt = new Date(Date.now() - 27 * 86400000).toISOString();   // ~3 DTE restants
  const m = api.strategyMetrics(s);
  assert.equal(m.status, 'risque');
  assert.match(m.alert, /Theta critique/);
});

test('le coût de portage reste signalé quand la structure, elle, est conforme', () => {
  const api = loadApi();
  const m = api.strategyMetrics(strat('gamma_flat', { netGamma: 50, netTheta: -400 }));
  assert.equal(m.status, 'surveiller');
  assert.match(m.alert, /Coût de portage/);
});
