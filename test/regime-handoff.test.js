// Parcours « Opportunités → Régime & Structure → Construction ».
//
// L'auto-chercheur envoyait directement à la Construction, qui retombait sur le
// vega-neutre par DÉFAUT quel que soit le régime — la structure n'était donc
// jamais choisie. Il passe maintenant par le module Régime, comme le Builder
// (dont l'étape « Structure » précède « Construction »).
//
// Ce qui doit tenir : le module Régime transmet à la Construction LA structure
// recommandée ET l'échéance retenue en amont — sinon l'horizon choisi dans les
// Opportunités serait silencieusement perdu en route.
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

// `RegimePlaybook` n'est pas exposé sur window : c'est une déclaration de haut
// niveau du module, donc accessible dans le contexte vm où le fichier s'exécute.
function loadPlaybook() {
  const win = {
    React, location: { origin: 'http://localhost' },
    localStorage: { length: 0, key: () => null, getItem: () => null, setItem() {}, removeItem() {} },
    addEventListener() {}, removeEventListener() {}, dispatchEvent() {},
    CustomEvent: class { constructor(t) { this.type = t; } },
    DispersionXDesignSystem_cb86be: {
      MetricCard: ({ label, value }) => React.createElement('div', null, `${label}: ${value}`),
      Badge: ({ children }) => React.createElement('span', null, children),
      WarningPanel: ({ title, children }) => React.createElement('div', null, title, children),
      BeginnerExplanationBox: ({ children }) => React.createElement('div', null, children),
    },
  };
  win.window = win;
  const ctx = vm.createContext({
    window: win, React, console, DXApi: {}, localStorage: win.localStorage,
    CustomEvent: win.CustomEvent, fetch: () => Promise.reject(new Error('offline')),
    setInterval: () => 0, setTimeout: f => { f(); return 0; }, clearInterval: () => {}, clearTimeout: () => {},
    Date, JSON, Math, String, Number, Object, Array, isFinite, isNaN, parseFloat, parseInt, Set, Map, Promise, Error,
  });
  const src = readFileSync(new URL('../js/screens/CorrelationLab.jsx', import.meta.url), 'utf8');
  vm.runInContext(transformSync(src, { presets: ['@babel/preset-react'], babelrc: false, configFile: false }).code, ctx);
  return vm.runInContext('RegimePlaybook', ctx);
}

async function mount(el) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await React.act(async () => { root.render(el); });
  return { container, root };
}

const buildBtn = container =>
  Array.from(container.querySelectorAll('button')).find(b => /Construire en/.test(b.textContent));

test('le module Régime envoie la Construction sur la structure recommandée', async () => {
  const Playbook = loadPlaybook();
  const nav = [];
  // Prime très riche + skew raide → le playbook recommande une structure de portage.
  const { container, root } = await mount(React.createElement(Playbook, {
    premiumPct: 88, premium: 12, skew: [0.44, 0.38, 0.30, 0.22, 0.18, 0.20, 0.26], term: [0.20, 0.22, 0.24, 0.27, 0.29],
    mode: 'Avancé', onNav: (s, p) => nav.push([s, p]), listId: 'L1', duration: 45,
  }));

  const btn = buildBtn(container);
  assert.ok(btn, 'le bouton « Construire en … » doit être proposé');
  await React.act(async () => { btn.click(); });

  assert.equal(nav.length, 1);
  assert.equal(nav[0][0], 'construction');
  assert.equal(nav[0][1].listId, 'L1');
  assert.ok(nav[0][1].sizing, 'une structure est transmise — pas de retour au défaut');
  // La structure doit être une des méthodes réellement acceptées par Construction.
  assert.ok(['vega_neutral', 'gamma_flat', 'theta_flat', 'premium_neutral'].includes(nav[0][1].sizing),
    `structure inattendue : ${nav[0][1].sizing}`);
  await React.act(async () => { root.unmount(); });
});

test("l'échéance choisie en amont survit au passage par le Régime", async () => {
  const Playbook = loadPlaybook();
  const nav = [];
  const { container, root } = await mount(React.createElement(Playbook, {
    premiumPct: 88, premium: 12, skew: [0.44, 0.38, 0.30, 0.22, 0.18, 0.20, 0.26], term: [0.20, 0.22, 0.24, 0.27, 0.29],
    mode: 'Avancé', onNav: (s, p) => nav.push([s, p]), listId: 'L1', duration: 45,
  }));
  await React.act(async () => { buildBtn(container).click(); });

  assert.equal(nav[0][1].duration, 45, "l'horizon retenu dans les Opportunités est reporté");
  await React.act(async () => { root.unmount(); });
});

test("sans échéance en amont, aucune durée n'est inventée", async () => {
  // Entrée normale par le menu : la Construction garde SA durée, on ne la force pas.
  const Playbook = loadPlaybook();
  const nav = [];
  const { container, root } = await mount(React.createElement(Playbook, {
    premiumPct: 88, premium: 12, skew: [0.44, 0.38, 0.30, 0.22, 0.18, 0.20, 0.26], term: [0.20, 0.22, 0.24, 0.27, 0.29],
    mode: 'Avancé', onNav: (s, p) => nav.push([s, p]), listId: 'L1',
  }));
  await React.act(async () => { buildBtn(container).click(); });

  assert.equal('duration' in nav[0][1], false);
  await React.act(async () => { root.unmount(); });
});

test("l'auto-chercheur route vers le Régime, pas vers la Construction", () => {
  // Garde-fou sur le câblage : c'est CE saut qui faisait retomber toute
  // opportunité sur le vega-neutre par défaut.
  const src = readFileSync(new URL('../js/screens/OpportunityFinder.jsx', import.meta.url), 'utf8');
  const call = src.match(/onNav\('(\w+)',\s*\{\s*listId:\s*l\.id,\s*duration\s*\}\)/);
  assert.ok(call, "createAndBuild doit naviguer avec listId + duration");
  assert.equal(call[1], 'regime');
});
