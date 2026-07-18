// `EmptyState` du design system rend la prop `action` et IGNORE les enfants ;
// `icon` est un NŒUD, pas un nom d'icône. Les écrans qui passaient leur bouton en
// enfant se retrouvaient donc avec un état vide SANS porte de sortie — et le mot
// « lists » affiché à la place d'une icône.
//
// Ces écrans chargent leurs données dans un effet : un rendu serveur
// (renderToStaticMarkup) n'exécuterait aucun effet et ne verrait que « Chargement… ».
// On MONTE donc réellement le composant dans un DOM (jsdom) et on laisse tourner
// les effets — seule façon d'observer l'état vide.
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
// `navigator` est en lecture seule sur globalThis (Node ≥ 21) → on le redéfinit.
Object.defineProperty(global, 'navigator', { value: dom.window.navigator, configurable: true });
global.HTMLElement = dom.window.HTMLElement;
global.Element = dom.window.Element;
global.Node = dom.window.Node;
global.getComputedStyle = dom.window.getComputedStyle;
global.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = await import('react-dom/client');

// Le VRAI EmptyState (mêmes règles que project/components/feedback/EmptyState.jsx) :
// un stub permissif qui rendrait les enfants masquerait précisément le bug testé.
const EmptyState = ({ icon = null, title, description = null, action = null }) =>
  React.createElement('div', null, icon, title, description, action);

const DS = {
  EmptyState,
  Button: ({ children }) => React.createElement('button', null, children),
  MetricCard: ({ label, value }) => React.createElement('div', null, `${label}: ${value}`),
  ScoreBadge: ({ children }) => React.createElement('span', null, children),
  Badge: ({ children }) => React.createElement('span', null, children),
  WarningPanel: ({ children }) => React.createElement('div', null, children),
  BeginnerExplanationBox: ({ children }) => React.createElement('div', null, children),
};

// Charge un écran dans son propre « window », comme dans le navigateur.
function loadScreen(file, name, api) {
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
    ConfirmDialog: () => null,
    DXApi: api,
  };
  win.window = win;
  const ctx = vm.createContext({
    window: win, localStorage, React, console, DXApi: api,
    CustomEvent: win.CustomEvent, fetch: () => Promise.reject(new Error('offline')),
    setInterval: () => 0, setTimeout: (f) => { f(); return 0; }, clearInterval: () => {}, clearTimeout: () => {},
    Date, JSON, Math, String, Number, Object, Array, isFinite, isNaN, parseFloat, parseInt, Set, Map, Promise, Error,
  });
  const src = readFileSync(new URL(file, import.meta.url), 'utf8');
  vm.runInContext(transformSync(src, { presets: ['@babel/preset-react'], babelrc: false, configFile: false }).code, ctx);
  return win[name];
}

async function mount(Component, props) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await React.act(async () => { root.render(React.createElement(Component, props)); });
  await React.act(async () => { await Promise.resolve(); });   // laisse les chargements se résoudre
  const html = container.innerHTML;
  await React.act(async () => { root.unmount(); });
  return html;
}

test("Lists · l'état vide propose bien de créer une liste", async () => {
  // Sans liste ET sans bouton, le tout premier écran de l'app était une impasse.
  const Lists = loadScreen('../js/screens/Lists.jsx', 'Lists', {
    getLists: () => Promise.resolve([]),
    getSharedLists: () => Promise.resolve([]),
  });
  const html = await mount(Lists, { onNav: () => {}, addToast: () => {}, onListsChange: () => {} });

  assert.match(html, /Aucune liste/, "l'état vide doit être atteint");
  assert.match(html, /Créer une liste/, 'le bouton doit être rendu (prop `action`)');
  assert.doesNotMatch(html, />lists</, "« lists » ne doit pas s'afficher comme texte");
});

test("ListDetail · l'état vide propose bien d'ajouter des actions", async () => {
  const ListDetail = loadScreen('../js/screens/ListDetail.jsx', 'ListDetail', {
    getList: () => Promise.resolve({ id: 'L1', name: 'Panier vide', index_symbol: 'NDX', items: [] }),
    getListAnalysis: () => Promise.resolve(null),
    batchQuotes: () => Promise.resolve({}),
    getListAudit: () => Promise.resolve([]),
  });
  const html = await mount(ListDetail, { listId: 'L1', onNav: () => {}, addToast: () => {}, mode: 'Avancé' });

  assert.match(html, /Liste vide/, "l'état vide doit être atteint");
  assert.match(html, /Ajouter des actions/, 'le bouton doit être rendu (prop `action`)');
  assert.doesNotMatch(html, />lists</, "« lists » ne doit pas s'afficher comme texte");
});
