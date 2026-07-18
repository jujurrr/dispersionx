// Rendu RÉEL de l'écran StrategyDetail (react-dom/server) sur un window stubé.
// La compilation JSX ne prouve que la syntaxe ; ici on exécute le composant, ce
// qui attrape les plantages d'exécution (destructuration d'un objet absent,
// prop mal utilisée, champ manquant du blob de stratégie) — et on vérifie le
// gating Pro, qui est une règle métier, pas une question de style.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { transformSync } from '@babel/core';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import vm from 'node:vm';

const url = p => new URL(p, import.meta.url);

function makeEnv() {
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
    DXMock: { strategy: {} }, React,
    // Doublures du design system : on teste l'écran, pas le rendu des briques.
    DispersionXDesignSystem_cb86be: {
      MetricCard: ({ label, value, unit }) => React.createElement('div', null, `${label}: ${value}${unit || ''}`),
      Badge: ({ children }) => React.createElement('span', null, children),
      WarningPanel: ({ title, children }) => React.createElement('div', null, title, children),
      EmptyState: ({ title, description, action }) => React.createElement('div', null, title, description, action),
    },
    ConfirmDialog: () => null,
    DXExpiry: { fmtExpiry: () => 'vend. 21 août', dteTo: () => 34 },
  };
  win.window = win;
  const ctx = vm.createContext({
    window: win, localStorage, console, React, CustomEvent: win.CustomEvent,
    fetch: () => Promise.reject(new Error('offline')),
    setInterval: () => 0, setTimeout: () => 0, clearInterval: () => {},
    Date, JSON, Math, String, Number, Object, Array, isFinite, isNaN, parseFloat, parseInt, Set, Map, Promise, Error,
  });
  vm.runInContext(readFileSync(url('../js/api.js'), 'utf8'), ctx);
  // Dans le navigateur, `window.DXApi` EST un global : les écrans l'appellent
  // sans préfixe. On reproduit ça, sinon le composant plante sur `DXApi`.
  vm.runInContext('globalThis.DXApi = window.DXApi;', ctx);
  const src = readFileSync(url('../js/screens/StrategyDetail.jsx'), 'utf8');
  vm.runInContext(transformSync(src, { presets: ['@babel/preset-react'], babelrc: false, configFile: false }).code, ctx);
  return { win, localStorage };
}

// Forme réelle produite par Construction.buildStrategy().
const STRAT = {
  listId: 'L1', listName: 'Tech NDX Core', index: 'NDX', indexEtf: 'QQQ', indexPrice: 480,
  duration: 30, expiry: '2026-08-21', builtAt: '2026-07-15T10:00:00Z',
  nIndex: 2, sizingMethod: 'theta_flat', weightBasis: 'capped', deltaHedge: 'index',
  hedgeUnits: 12, hedgeNotional: 57600,
  // ⚠ UNITÉS RÉELLES de Construction (vérifiées dans Construction.jsx) :
  // `iv` et `weight` sont en POURCENTAGE (indexIV = 18, weightUsed = … * 100,
  // et les maths font `sigma: c.iv / 100`). Des fixtures en fraction (0.28)
  // masqueraient un ×100 à l'affichage — c'est exactement ce qui était arrivé.
  components: [
    { ticker: 'AAPL', price: 230, iv: 28, weight: 22, nContracts: 3, vega: 140, theta: -12, premium: 900, delta: 5 },
    { ticker: 'MSFT', price: 500, iv: 25, weight: 19, nContracts: 2, vega: 120, theta: -10, premium: 800, delta: 4 },
  ],
  portfolio: {
    idxVega: 300, idxTheta: 25, idxPrem: 2400, compVega: 260, compTheta: -22, compPrem: 1700,
    netVega: -40, netTheta: 3, netGamma: 1, netPremium: 700, netDelta: 0, netDeltaRaw: 9, idxIV: 18.5,
  },
};
const LISTS = [{ id: 'L1', name: 'Tech NDX Core' }];

function renderDetail(env, props) {
  return renderToStaticMarkup(React.createElement(env.win.StrategyDetail, {
    listId: 'L1', onNav: () => {}, lists: LISTS, addToast: () => {}, ...props,
  }));
}
function seeded(strat = STRAT) {
  const env = makeEnv();
  env.localStorage.setItem('dx-strategy-' + (strat.listId || 'L1'), JSON.stringify(strat));
  return env;
}

test('StrategyDetail : récapitule la construction sans planter', () => {
  // 'Débutant' avec majuscule et accent : c'est la valeur utilisée partout dans l'app.
  const html = renderDetail(seeded(), { pro: true, mode: 'Débutant' });

  assert.ok(html.includes('Tech NDX Core'), 'nom hérité de la liste');
  // La phrase de synthèse doit refléter les VRAIS chiffres du blob (2 vendus, 3+2=5 achetés).
  assert.match(html, /vendez 2 straddles sur NDX/);
  assert.match(html, /achetez 5 straddles répartis sur 2 composants/);
  assert.match(html, /theta-flat/i);
  assert.ok(html.includes('21 août'), 'échéance formatée via DXExpiry');
  assert.ok(html.includes('AAPL') && html.includes('MSFT'), 'composants listés');
});

test('StrategyDetail : IV et poids affichés SANS ×100 parasite', () => {
  // Régression : la table remultipliait par 100 des valeurs déjà en pourcentage
  // → une IV de 28 % s'affichait « 2800.0% » et un poids de 22 % « 2200.0% ».
  const html = renderDetail(seeded(), { pro: true });
  assert.ok(html.includes('18.5%'), "IV de l'indice");
  assert.ok(html.includes('28.0%'), 'IV du composant');
  assert.ok(html.includes('22.0%'), 'poids du composant');
  assert.doesNotMatch(html, /1850\.0%|2800\.0%|2200\.0%/, 'aucune valeur centuplée');
});

test("StrategyDetail : l'ordre des sections va du quoi vers l'action", () => {
  const html = renderDetail(seeded(), { pro: true });
  // Ordre voulu : phrase → chiffres clés → composition → structure/couverture → actions.
  const at = needle => { const i = html.indexOf(needle); assert.notEqual(i, -1, `introuvable : ${needle}`); return i; };
  const phrase      = at('La stratégie en une phrase');
  const chiffres    = at('Prime nette');
  const composition = at('>Composition<');
  const structure   = at('Structure choisie');
  const couverture  = at('Couverture du delta');
  const actions     = at('Suivre cette position');

  assert.ok(phrase < chiffres,       'la phrase précède les chiffres clés');
  assert.ok(chiffres < composition,  'les chiffres clés précèdent la composition');
  assert.ok(composition < structure, 'la composition précède la structure');
  assert.ok(structure < couverture,  'structure et couverture restent côte à côte, dans cet ordre');
  assert.ok(couverture < actions,    'les actions ferment la page');
});

test('StrategyDetail : les fonctions payantes sont verrouillées hors Pro', () => {
  const env = seeded();
  const pro  = renderDetail(env, { pro: true });
  const free = renderDetail(env, { pro: false });

  // Pro : actions disponibles, aucun cadenas sur elles.
  assert.ok(pro.includes('Suivre cette position') && !pro.includes('🔒 Suivre'));
  assert.ok(pro.includes('Exporter IBKR') && !pro.includes('🔒 Exporter IBKR'));
  // Non-Pro : suivi et export IBKR verrouillés…
  assert.match(free, /🔒 Suivre cette position/);
  assert.match(free, /🔒 Exporter IBKR/);
  // …mais l'analyse reste ouverte (Risk Lab, Ajuster ne sont PAS des features Pro).
  assert.ok(free.includes('Risk Lab'));
  assert.ok(free.includes('Ajuster la construction'));
});

test('StrategyDetail : le nom propre prime, la liste source reste visible', () => {
  const env = seeded();
  env.win.DXApi.renameStrategy('L1', 'Dispersion août');
  const html = renderDetail(env, { pro: true });
  assert.ok(html.includes('Dispersion août'), 'nom propre affiché');
  assert.ok(html.includes('Tech NDX Core'), 'liste source toujours tracée');
});

test('StrategyDetail : stratégie absente → état vide, pas de crash', () => {
  const env = makeEnv();   // rien en storage
  const html = renderToStaticMarkup(React.createElement(env.win.StrategyDetail, {
    listId: 'INCONNU', onNav: () => {}, lists: LISTS, addToast: () => {}, pro: true,
  }));
  assert.match(html, /introuvable/);
});

test('StrategyDetail : sans couverture delta, le résidu directionnel est signalé', () => {
  const env = seeded({ ...STRAT, deltaHedge: 'none', hedgeUnits: 0, hedgeNotional: 0,
    portfolio: { ...STRAT.portfolio, netDelta: 9 } });
  const html = renderDetail(env, { pro: true });
  assert.ok(html.includes('Aucune'), 'méthode de couverture = Aucune');
  assert.match(html, /directionnelle/);
});

test('StrategyDetail : blob minimal (champs absents) → aucun crash', () => {
  // Une vieille stratégie peut ne pas avoir expiry/weightBasis/hedge/portfolio complet.
  const env = seeded({ listId: 'L1', index: 'SPX', components: [{ ticker: 'AAPL', nContracts: 1 }], portfolio: {} });
  const html = renderDetail(env, { pro: false });
  assert.ok(html.includes('AAPL'));
  assert.ok(html.length > 500, 'la page rend bien du contenu');
});
