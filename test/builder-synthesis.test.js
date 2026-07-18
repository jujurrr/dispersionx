// Étape « Synthèse » du Builder (TradeBrief).
//
// RÉGRESSION MAJEURE couverte ici : les formateurs monétaires (dxSym/dxA/dxMag)
// étaient définis DANS `Builder`, alors que `TradeBrief` est un composant de
// module distinct qui les appelle → `ReferenceError: dxMag is not defined` au
// rendu. React perdait l'arbre : écran figé, navigation morte, rafraîchissement
// obligatoire — et au rechargement tous les scores étaient recalculés à froid.
// Un test de compilation ne voyait rien : la portée ne casse qu'à l'EXÉCUTION.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { transformSync } from '@babel/core';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import vm from 'node:vm';

function loadBuilder() {
  const win = {
    React, DXMoney: null, DXCloud: { pro: true },
    // Le module s'abonne à `dx-auth-change` au chargement pour purger son
    // brouillon : sans ces méthodes, le stub casse là où le navigateur, lui,
    // les fournit toujours.
    addEventListener() {}, removeEventListener() {}, dispatchEvent() {},
    DXExpiry: { fmtExpiry: d => d, dteTo: () => 30 },
    DispersionXDesignSystem_cb86be: {
      Badge: ({ children }) => React.createElement('span', null, children),
      MetricCard: ({ label, value, hint }) => React.createElement('div', null, `${label}: ${value}`, hint),
      RiskBadge: ({ children }) => React.createElement('span', null, children),
      WarningPanel: ({ title, children }) => React.createElement('div', null, title, children),
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
  return win;
}

const STRATEGY = {
  index: 'NDX', indexEtf: 'QQQ', nIndex: 2, duration: 30, expiry: '2026-08-21',
  sizingMethod: 'theta_flat',
  components: [
    { ticker: 'AAPL', nContracts: 3, vega: 140, premium: 900, theta: -12 },
    { ticker: 'MSFT', nContracts: 2, vega: 120, premium: 800, theta: -10 },
  ],
  portfolio: { idxPrem: 2400, idxVega: 1500, idxTheta: 1000, netVega: -40, netPremium: 700, netTheta: 20, netDelta: 0 },
};

test('la Synthèse rend la stratégie sans planter', () => {
  const win = loadBuilder();
  // Aucune exception ne doit remonter : c'est CE plantage qui gelait l'app.
  const html = renderToStaticMarkup(
    React.createElement(win.TradeBrief, { data: { strategy: STRATEGY }, onNav: () => {}, pro: true }));

  assert.match(html, /QQQ/, "la jambe indice est décrite");
  assert.ok(html.includes('AAPL') && html.includes('MSFT'), 'les composants sont listés');
});

test('la Synthèse marche aussi sans DXMoney chargé (repli de formatage)', () => {
  const win = loadBuilder();
  win.DXMoney = { symbol: () => '€', value: (n, o) => ((o && o.sign === false) ? '' : (n >= 0 ? '+' : '−')) + Math.abs(Math.round(n)) };
  const html = renderToStaticMarkup(
    React.createElement(win.TradeBrief, { data: { strategy: STRATEGY }, onNav: () => {}, pro: true }));
  assert.match(html, /€/, 'la devise courante est utilisée');
});

test("sans stratégie, la Synthèse n'INVENTE pas de position", () => {
  // L'ancien repli fabriquait une jambe SPX fictive : une synthèse plausible mais
  // fausse, que l'utilisateur pouvait prendre pour sa vraie position.
  const win = loadBuilder();
  const html = renderToStaticMarkup(
    React.createElement(win.TradeBrief, { data: {}, onNav: () => {}, pro: true }));

  assert.match(html, /Aucune stratégie à résumer/);
  assert.match(html, /Construction/, 'on renvoie là où la position se dimensionne');
  assert.doesNotMatch(html, /SPX/, 'aucune jambe inventée');
});
