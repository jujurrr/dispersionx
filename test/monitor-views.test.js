// Le Strategy Monitor et la page de détail affichaient tous deux le détail d'une
// stratégie : deux implémentations à maintenir (la devise mixte et l'alerte vega
// ont dû être corrigées DEUX fois). Le Monitor se recentre donc sur ce qu'il est
// seul à faire — comparer et agréger — et délègue le détail à StrategyDetail.
//
// La bascule 'detail' restaure l'ancien comportement à l'identique : ce fichier
// vérifie les DEUX vues, pour que le retour arrière reste garanti tant qu'il existe.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { transformSync } from '@babel/core';
import { JSDOM } from 'jsdom';
import React from 'react';
import vm from 'node:vm';

const dom = new JSDOM('<!doctype html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;
Object.defineProperty(global, 'navigator', { value: dom.window.navigator, configurable: true });
global.HTMLElement = dom.window.HTMLElement;
global.Element = dom.window.Element;
global.Node = dom.window.Node;
global.getComputedStyle = dom.window.getComputedStyle;
global.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = await import('react-dom/client');

const DS = {
  MetricCard: ({ label, value, hint }) => React.createElement('div', null, `${label}: ${value}`, hint),
  Badge: ({ children }) => React.createElement('span', null, children),
  RiskBadge: ({ children }) => React.createElement('span', null, children),
  WarningPanel: ({ title, children }) => React.createElement('div', null, title, children),
  BeginnerExplanationBox: ({ children }) => React.createElement('div', null, children),
};

const STRAT = {
  listId: 'L1', listName: 'Tech NDX', displayName: 'Tech NDX', index: 'NDX', indexEtf: 'QQQ',
  duration: 30, expiry: null, nIndex: 2, sizingMethod: 'theta_flat', deltaHedge: 'index',
  components: [{ ticker: 'AAPL', nContracts: 3, vega: 140, premium: 900 }],
  portfolio: { idxVega: 1500, idxTheta: 1000, idxGamma: 1000, idxPrem: 2400,
    netVega: -40, netTheta: 20, netGamma: 0, netPremium: 700, netDelta: 0 },
  builtAt: new Date(Date.now() - 5 * 86400000).toISOString(),
};

// Un vrai localStorage partagé entre montages : c'est lui qui porte la persistance
// de la bascule, donc le stubber par un objet vide masquerait le comportement testé.
const store = new Map();
const localStorage = {
  get length() { return store.size; }, key: i => Array.from(store.keys())[i] ?? null,
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k),
};

function loadMonitor(navCalls) {
  const win = {
    React, localStorage, location: { origin: 'http://localhost' },
    addEventListener() {}, removeEventListener() {}, dispatchEvent() {},
    CustomEvent: class { constructor(t) { this.type = t; } },
    DispersionXDesignSystem_cb86be: DS,
    DXExpiry: { dteTo: iso => Math.ceil((new Date(iso + 'T00:00:00').getTime() - Date.now()) / 86400000), fmtExpiry: d => d },
    DXRisk: { VEGA_NEUTRAL: 60, VEGA_ALERT: 250, CONTRACT: 100 },
    DXApi: null,
  };
  win.window = win;
  const ctx = vm.createContext({
    window: win, localStorage, React, console, CustomEvent: win.CustomEvent,
    fetch: () => Promise.reject(new Error('offline')),
    setInterval: () => 0, setTimeout: f => { f(); return 0; }, clearInterval: () => {}, clearTimeout: () => {},
    Date, JSON, Math, String, Number, Object, Array, isFinite, isNaN, parseFloat, parseInt, Set, Map, Promise, Error,
  });
  // On charge le VRAI api.js : strategyMetrics (statut, grec neutralisé) fait
  // partie de ce qu'on observe.
  vm.runInContext(readFileSync(new URL('../js/api.js', import.meta.url), 'utf8'), ctx);
  vm.runInContext('globalThis.DXApi = window.DXApi;', ctx);
  localStorage.setItem('dx-strategy-L1', JSON.stringify(STRAT));
  const src = readFileSync(new URL('../js/screens/StrategyMonitor.jsx', import.meta.url), 'utf8');
  vm.runInContext(transformSync(src, { presets: ['@babel/preset-react'], babelrc: false, configFile: false }).code, ctx);
  return win.StrategyMonitor;
}

async function mount(Component, props) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await React.act(async () => { root.render(React.createElement(Component, props)); });
  await React.act(async () => { await Promise.resolve(); });
  return { html: container.innerHTML, container, root };
}

function clickFirstRow(container) {
  const row = container.querySelector('tbody tr');
  assert.ok(row, 'une ligne de stratégie doit exister');
  return row;
}

test('vue comparative (défaut) : agrège, et n\'affiche PAS le détail', async () => {
  store.clear();
  const Monitor = loadMonitor();
  const { html, root } = await mount(Monitor, { lists: [{ id: 'L1', name: 'Tech NDX' }], onNav: () => {}, mode: 'Avancé' });

  assert.match(html, /Tech NDX/, 'la stratégie est listée');
  assert.match(html, /Prime nette cumulée/, "l'agrégat de portefeuille reste — c'est la valeur propre du Monitor");
  assert.match(html, /Ouvrir →/, 'chaque ligne mène à sa page de détail');
  // Le bloc dupliqué ne doit plus être rendu.
  assert.doesNotMatch(html, /Détail de la stratégie/);
  assert.doesNotMatch(html, /Exporter IBKR/, 'les actions vivent sur la page de détail');
  await React.act(async () => { root.unmount(); });
});

test('vue comparative : cliquer une ligne ouvre SA page de détail', async () => {
  store.clear();
  const nav = [];
  const Monitor = loadMonitor();
  const { container, root } = await mount(Monitor, {
    lists: [{ id: 'L1', name: 'Tech NDX' }], onNav: (screen, params) => nav.push([screen, params]), mode: 'Avancé',
  });
  await React.act(async () => { clickFirstRow(container).click(); });

  // Comparaison valeur par valeur : l'objet de paramètres naît dans le contexte vm,
  // son prototype diffère de celui du test → deepEqual échouerait pour rien.
  assert.equal(nav.length, 1, 'un seul appel de navigation');
  assert.equal(nav[0][0], 'strategy-detail');
  assert.equal(nav[0][1].listId, 'L1');
  await React.act(async () => { root.unmount(); });
});

test("vue 'detail' : l'ancien comportement est restauré à l'identique", async () => {
  store.clear();
  const nav = [];
  const Monitor = loadMonitor();
  const { container, root } = await mount(Monitor, {
    lists: [{ id: 'L1', name: 'Tech NDX' }], onNav: (s, p) => nav.push([s, p]), mode: 'Avancé',
  });
  // Bascule via le sélecteur de vue, comme le ferait l'utilisateur.
  const toggle = Array.from(container.querySelectorAll('button')).find(b => /Détail intégré/.test(b.textContent));
  assert.ok(toggle, 'le sélecteur de vue doit être présent');
  await React.act(async () => { toggle.click(); });

  const html = container.innerHTML;
  assert.match(html, /Détail de la stratégie/, 'le détail embarqué revient');
  assert.match(html, /Exporter IBKR/, 'avec ses actions');
  assert.doesNotMatch(html, /Ouvrir →/);
  // Et la ligne SÉLECTIONNE au lieu de naviguer.
  await React.act(async () => { clickFirstRow(container).click(); });
  assert.deepEqual(nav, [], 'aucune navigation en vue détail');
  await React.act(async () => { root.unmount(); });
});

test('le choix de vue est mémorisé entre deux visites', async () => {
  store.clear();
  const Monitor = loadMonitor();
  const first = await mount(Monitor, { lists: [{ id: 'L1', name: 'Tech NDX' }], onNav: () => {}, mode: 'Avancé' });
  const toggle = Array.from(first.container.querySelectorAll('button')).find(b => /Détail intégré/.test(b.textContent));
  await React.act(async () => { toggle.click(); });
  await React.act(async () => { first.root.unmount(); });

  assert.equal(localStorage.getItem('dx-monitor-view'), 'detail');
  // Remontage : on doit retrouver la vue choisie, pas le défaut.
  const again = await mount(Monitor, { lists: [{ id: 'L1', name: 'Tech NDX' }], onNav: () => {}, mode: 'Avancé' });
  assert.match(again.html, /Détail de la stratégie/, 'la préférence survit au remontage');
  await React.act(async () => { again.root.unmount(); });
});
