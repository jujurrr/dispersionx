// Raccourcis de modules dans l'en-tête d'une liste.
//
// « Régime & Structure » y manquait : le module existe, la barre latérale y mène,
// le Builder et l'auto-chercheur passent par lui — mais depuis une liste, il était
// injoignable. Ce test verrouille la liste des raccourcis pour qu'un module ajouté
// au parcours ne soit plus oublié ici.
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

const LIST = { id: 'L1', name: 'Tech NDX', index_symbol: 'NDX', items: [] };

function loadListDetail() {
  const api = {
    getList: () => Promise.resolve(LIST),
    getListAnalysis: () => Promise.resolve(null),
    batchQuotes: () => Promise.resolve({}),
    getListAudit: () => Promise.resolve([]),
  };
  const win = {
    React, location: { origin: 'http://localhost' },
    localStorage: { length: 0, key: () => null, getItem: () => null, setItem() {}, removeItem() {} },
    addEventListener() {}, removeEventListener() {}, dispatchEvent() {},
    CustomEvent: class { constructor(t) { this.type = t; } },
    DispersionXDesignSystem_cb86be: {
      EmptyState: ({ icon, title, description, action }) => React.createElement('div', null, icon, title, description, action),
      MetricCard: ({ label, value }) => React.createElement('div', null, `${label}: ${value}`),
      ScoreBadge: ({ children }) => React.createElement('span', null, children),
      WarningPanel: ({ children }) => React.createElement('div', null, children),
      BeginnerExplanationBox: ({ children }) => React.createElement('div', null, children),
    },
    ConfirmDialog: () => null,
    DXApi: api,
  };
  win.window = win;
  const ctx = vm.createContext({
    window: win, React, console, DXApi: api, localStorage: win.localStorage,
    CustomEvent: win.CustomEvent, fetch: () => Promise.reject(new Error('offline')),
    setInterval: () => 0, setTimeout: f => { f(); return 0; }, clearInterval: () => {}, clearTimeout: () => {},
    Date, JSON, Math, String, Number, Object, Array, isFinite, isNaN, parseFloat, parseInt, Set, Map, Promise, Error,
  });
  const src = readFileSync(new URL('../js/screens/ListDetail.jsx', import.meta.url), 'utf8');
  vm.runInContext(transformSync(src, { presets: ['@babel/preset-react'], babelrc: false, configFile: false }).code, ctx);
  return win.ListDetail;
}

async function mount(nav) {
  const ListDetail = loadListDetail();
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await React.act(async () => {
    root.render(React.createElement(ListDetail, {
      listId: 'L1', onNav: (s, p) => nav.push([s, p]), addToast: () => {}, mode: 'Avancé',
    }));
  });
  await React.act(async () => { await Promise.resolve(); });
  return { container, root };
}

const byLabel = (container, re) =>
  Array.from(container.querySelectorAll('button')).find(b => re.test(b.textContent));

test("tout le parcours d'analyse est joignable depuis une liste", async () => {
  const { container, root } = await mount([]);
  // L'ordre suit le parcours réel : corréler → choisir la structure → dimensionner.
  for (const re of [/Corrélation/, /Régime & Structure/, /Risk Lab/, /Construction/]) {
    assert.ok(byLabel(container, re), `raccourci manquant : ${re}`);
  }
  await React.act(async () => { root.unmount(); });
});

test('« Régime & Structure » ouvre le module sur CETTE liste', async () => {
  const nav = [];
  const { container, root } = await mount(nav);
  await React.act(async () => { byLabel(container, /Régime & Structure/).click(); });

  assert.equal(nav.length, 1);
  assert.equal(nav[0][0], 'regime');
  assert.equal(nav[0][1].listId, 'L1');
  // Aucune échéance inventée : la Construction gardera la sienne (contrairement à
  // l'entrée par l'auto-chercheur, qui elle transmet l'horizon retenu).
  assert.equal('duration' in nav[0][1], false);
  await React.act(async () => { root.unmount(); });
});

test('le Régime précède la Construction dans la barre de raccourcis', async () => {
  const { container, root } = await mount([]);
  const labels = Array.from(container.querySelectorAll('button')).map(b => b.textContent);
  const at = re => labels.findIndex(l => re.test(l));
  assert.ok(at(/Corrélation/) < at(/Régime & Structure/));
  assert.ok(at(/Régime & Structure/) < at(/Construction/), 'on choisit la structure AVANT de dimensionner');
  await React.act(async () => { root.unmount(); });
});
