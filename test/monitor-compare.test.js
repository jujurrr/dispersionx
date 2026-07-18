// Le Strategy Monitor ne fait plus que ce qu'il est SEUL à faire : comparer et
// agréger toutes les stratégies. Le détail d'une stratégie vit sur sa page
// (StrategyDetail) — le bloc dupliqué a été supprimé, pas masqué.
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
  BeginnerExplanationBox: ({ children }) => React.createElement('div', null, children),
};

const STRAT = {
  listId: 'L1', index: 'NDX', indexEtf: 'QQQ', duration: 30, expiry: null, nIndex: 2,
  sizingMethod: 'theta_flat', deltaHedge: 'index',
  components: [{ ticker: 'AAPL', nContracts: 3, vega: 140, premium: 900 }],
  portfolio: { idxVega: 1500, idxTheta: 1000, idxGamma: 1000, idxPrem: 2400,
    netVega: -40, netTheta: 20, netGamma: 0, netPremium: 700, netDelta: 0 },
  builtAt: new Date(Date.now() - 5 * 86400000).toISOString(),
};

function loadMonitor() {
  const store = new Map();
  const localStorage = {
    get length() { return store.size; }, key: i => Array.from(store.keys())[i] ?? null,
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k),
  };
  const win = {
    React, localStorage, location: { origin: 'http://localhost' },
    addEventListener() {}, removeEventListener() {}, dispatchEvent() {},
    CustomEvent: class { constructor(t) { this.type = t; } },
    DispersionXDesignSystem_cb86be: DS,
    DXExpiry: { dteTo: iso => Math.ceil((new Date(iso + 'T00:00:00').getTime() - Date.now()) / 86400000), fmtExpiry: d => d },
    DXRisk: { VEGA_NEUTRAL: 60, VEGA_ALERT: 250, CONTRACT: 100 },
  };
  win.window = win;
  const ctx = vm.createContext({
    window: win, localStorage, React, console, CustomEvent: win.CustomEvent,
    fetch: () => Promise.reject(new Error('offline')),
    setInterval: () => 0, setTimeout: f => { f(); return 0; }, clearInterval: () => {}, clearTimeout: () => {},
    Date, JSON, Math, String, Number, Object, Array, isFinite, isNaN, parseFloat, parseInt, Set, Map, Promise, Error,
  });
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

const LISTS = [{ id: 'L1', name: 'Tech NDX' }];

test('le Monitor agrège et liste, sans rendre le détail', async () => {
  const Monitor = loadMonitor();
  const { html, root } = await mount(Monitor, { lists: LISTS, onNav: () => {}, mode: 'Avancé' });

  assert.match(html, /Tech NDX/, 'la stratégie est listée');
  assert.match(html, /Prime nette cumulée/, "l'agrégat de portefeuille — la valeur propre du Monitor");
  assert.match(html, /Ouvrir →/, 'chaque ligne mène à sa page');
  // Le bloc dupliqué doit avoir DISPARU du code, pas seulement être caché.
  assert.doesNotMatch(html, /Détail de la stratégie/);
  assert.doesNotMatch(html, /Exporter IBKR/, 'les actions vivent sur la page de détail');
  await React.act(async () => { root.unmount(); });
});

test('cliquer une ligne ouvre la page de la stratégie', async () => {
  const nav = [];
  const Monitor = loadMonitor();
  const { container, root } = await mount(Monitor, {
    lists: LISTS, onNav: (s, p) => nav.push([s, p]), mode: 'Avancé',
  });
  const row = container.querySelector('tbody tr');
  assert.ok(row, 'une ligne doit exister');
  await React.act(async () => { row.click(); });

  assert.equal(nav.length, 1);
  assert.equal(nav[0][0], 'strategy-detail');
  assert.equal(nav[0][1].listId, 'L1');
  await React.act(async () => { root.unmount(); });
});

test("une entrée ciblée sur une stratégie redirige vers sa page", async () => {
  // La sidebar peut encore appeler onNav('monitor', { listId }) : plutôt que de
  // présélectionner une ligne (le détail n'est plus ici), on redirige.
  const nav = [];
  const Monitor = loadMonitor();
  const { root } = await mount(Monitor, {
    lists: LISTS, listId: 'L1', onNav: (s, p) => nav.push([s, p]), mode: 'Avancé',
  });
  assert.ok(nav.some(([s, p]) => s === 'strategy-detail' && p.listId === 'L1'));
  await React.act(async () => { root.unmount(); });
});
