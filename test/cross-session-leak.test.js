// Étanchéité entre sessions.
//
// La déconnexion purge les caches localStorage (src/cloud.js) mais NE RECHARGE PAS
// la page : tout état gardé en mémoire de module lui survit. Le brouillon du
// Builder — identifiants de liste et tickers sélectionnés — réapparaissait donc
// dans la session suivante, autre compte ou invité.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { transformSync } from '@babel/core';
import React from 'react';
import vm from 'node:vm';

function loadBuilder() {
  const handlers = {};
  const win = {
    React, DXMoney: null, DXCloud: { pro: true },
    DXExpiry: { fmtExpiry: d => d, dteTo: () => 30 },
    addEventListener: (evt, fn) => { (handlers[evt] = handlers[evt] || []).push(fn); },
    removeEventListener() {}, dispatchEvent() {},
    DispersionXDesignSystem_cb86be: {
      Badge: ({ children }) => React.createElement('span', null, children),
      MetricCard: ({ label, value }) => React.createElement('div', null, `${label}: ${value}`),
      RiskBadge: ({ children }) => React.createElement('span', null, children),
      WarningPanel: ({ children }) => React.createElement('div', null, children),
      ScoreBadge: ({ children }) => React.createElement('span', null, children),
      Stepper: () => null, CorrelationGauge: () => null,
      BeginnerExplanationBox: ({ children }) => React.createElement('div', null, children),
    },
  };
  win.window = win;
  const ctx = vm.createContext({
    window: win, React, console, DXApi: {},
    localStorage: { length: 0, key: () => null, getItem: () => null, setItem() {}, removeItem() {} },
    CustomEvent: class { constructor(t) { this.type = t; } },
    fetch: () => Promise.reject(new Error('offline')),
    setInterval: () => 0, setTimeout: () => 0, clearInterval: () => {},
    Date, JSON, Math, String, Number, Object, Array, isFinite, isNaN, parseFloat, parseInt, Set, Map, Promise, Error,
  });
  const src = readFileSync(new URL('../js/screens/Builder.jsx', import.meta.url), 'utf8');
  vm.runInContext(transformSync(src, { presets: ['@babel/preset-react'], babelrc: false, configFile: false }).code, ctx);
  return { ctx, fire: evt => (handlers[evt] || []).forEach(fn => fn()) };
}

test("le brouillon du Builder ne franchit pas un changement de compte", () => {
  const { ctx, fire } = loadBuilder();

  // Session A : un brouillon existe (liste de travail + sélection de l'utilisateur).
  vm.runInContext("_builderDraft = { step: 3, sourceListId: 'liste-de-A', selectedItems: ['AAPL','MSFT'] };", ctx);
  assert.ok(vm.runInContext('_builderDraft', ctx), 'le brouillon est bien posé');

  // Déconnexion / connexion d'un autre compte : la page n'est PAS rechargée.
  fire('dx-auth-change');

  assert.equal(vm.runInContext('_builderDraft', ctx), null,
    "le brouillon d'une session ne doit pas être restauré dans la suivante");
});

test("le module s'abonne bien au changement d'authentification", () => {
  // Garde-fou : si l'abonnement disparaît, la fuite revient en silence.
  const src = readFileSync(new URL('../js/screens/Builder.jsx', import.meta.url), 'utf8');
  assert.match(src, /addEventListener\('dx-auth-change'/);
});
