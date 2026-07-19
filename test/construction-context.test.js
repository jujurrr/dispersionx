// Cohérence du contexte quand on passe d'une liste à une autre.
//
// Trois défauts distincts, tous visibles en enchaînant liste A → liste B :
//  1. `listId` venait du PARAMÈTRE mais `indexSym` du CONTEXTE (encore sur la
//     liste précédente) → le nouveau panier était analysé contre l'ancien indice :
//     jambe indice, poids et ρ implicite faux, noms de l'ancienne liste à l'écran.
//  2. La structure imposée par le playbook Régime était écrasée par celle d'une
//     construction antérieure → retour silencieux en vega-neutre.
//  3. Cette consigne ne survivait pas à un aller-retour tant que la stratégie
//     n'était pas enregistrée.
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

const LIST_A = { id: 'A', name: 'Ancienne liste', index_symbol: 'SPX',
  items: [{ ticker: 'JPM' }, { ticker: 'XOM' }, { ticker: 'KO' }] };
const LIST_B = { id: 'B', name: 'Nouvelle liste', index_symbol: 'NDX',
  items: [{ ticker: 'AAPL' }, { ticker: 'MSFT' }] };

// Store partagé entre montages : c'est lui qui porte la mémoire de structure.
const store = new Map();
const localStorage = {
  get length() { return store.size; }, key: i => Array.from(store.keys())[i] ?? null,
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k),
};

function loadConstruction(seen) {
  const api = {
    getList: id => Promise.resolve(id === 'A' ? LIST_A : LIST_B),
    // On enregistre l'indice RÉELLEMENT interrogé : c'est le cœur du défaut n°1.
    getSnapshot: sym => { seen.snapshot.push(sym); return Promise.resolve({ price: 500, iv_est: 20 }); },
    getBatchVol: (t, sym) => { seen.vol.push(sym); return Promise.resolve({ results: [] }); },
    impliedCorrelation: (sym) => { seen.impl.push(sym); return Promise.resolve(null); },
    batchQuotes: () => Promise.resolve([]),
    getMarketCaps: () => Promise.resolve([]),
    getOptionAtm: () => Promise.resolve(null),
    getSources: () => Promise.resolve([]),
  };
  const win = {
    React, localStorage, location: { origin: 'http://localhost' },
    addEventListener() {}, removeEventListener() {}, dispatchEvent() {},
    CustomEvent: class { constructor(t) { this.type = t; } },
    DispersionXDesignSystem_cb86be: {
      MetricCard: ({ label, value }) => React.createElement('div', null, `${label}: ${value}`),
      Badge: ({ children }) => React.createElement('span', null, children),
      WarningPanel: ({ children }) => React.createElement('div', null, children),
      BeginnerExplanationBox: ({ children }) => React.createElement('div', null, children),
      RiskBadge: ({ children }) => React.createElement('span', null, children),
    },
    DXRisk: {
      CONTRACT: 100, VEGA_NEUTRAL: 60, VEGA_ALERT: 250,
      straddleGreeks: (p, iv, d) => ({ vega: 10, theta: -1, gammaK: 1, premium: 100, delta1pct: 0.1 }),
    },
    DXMock: { getComponents: () => [], synthVol: () => ({ iv_est: 30, hv30: 27, beta: 1 }) },
    // Interface réelle de window.DXExpiry (js/data.js) : un stub partiel ferait
    // planter le module au rendu, pas révéler un défaut du code testé.
    // Devise d'affichage en EUROS : les valeurs doivent être converties ET
    // étiquetées avec le bon symbole.
    DXMoney: {
      symbol: () => '€',
      convert: n => n * 0.9,
      value: (n, o) => ((o && o.sign === false) ? '' : (n >= 0 ? '+' : '−')) + Math.abs(Math.round(n * 0.9)),
      format: n => Math.round(n * 0.9) + ' €',
    },
    DXExpiry: {
      dteTo: () => 30,
      fmtExpiry: d => String(d),
      isThirdFriday: () => true,
      expiriesFor: targets => (targets || [30]).map(t => ({ date: '2026-08-21', dte: t })),
      optionsFromDates: (isoList, targets) => (targets || [30]).map(t => ({ date: '2026-08-21', dte: t })),
    },
    DXApi: api,
    // Composants du Shell rendus SANS garde par Construction (ModuleCtxBar,
    // ModuleCtxPicker, DXLoader) : ils existent toujours dans le navigateur.
    ModuleCtxBar: () => null, ModuleCtxPicker: () => null, DXLoader: () => null,
  };
  win.window = win;
  const ctx = vm.createContext({
    window: win, localStorage, React, console, DXApi: api, CustomEvent: win.CustomEvent,
    fetch: () => Promise.reject(new Error('offline')),
    setInterval: () => 0, setTimeout: f => { f(); return 0; }, clearInterval: () => {}, clearTimeout: () => {},
    Date, JSON, Math, String, Number, Object, Array, isFinite, isNaN, parseFloat, parseInt, Set, Map, Promise, Error,
  });
  const src = readFileSync(new URL('../js/screens/Construction.jsx', import.meta.url), 'utf8');
  vm.runInContext(transformSync(src, { presets: ['@babel/preset-react'], babelrc: false, configFile: false }).code, ctx);
  return win.Construction;
}

async function mount(Component, props) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await React.act(async () => { root.render(React.createElement(Component, props)); });
  for (let i = 0; i < 4; i++) await React.act(async () => { await Promise.resolve(); });
  return { container, root };
}

const LISTS = [LIST_A, LIST_B];
// Le contexte est resté sur la liste A — exactement l'état après une navigation.
const STALE_CTX = { listId: 'A', listName: 'Ancienne liste', listIndex: 'SPX', index: 'SPX' };

test("l'indice suit la liste ouverte, pas le contexte périmé", async () => {
  store.clear();
  const seen = { snapshot: [], vol: [], impl: [] };
  const C = loadConstruction(seen);
  const { root } = await mount(C, {
    listId: 'B', moduleCtx: STALE_CTX, onModuleCtx: () => {}, lists: LISTS,
    onNav: () => {}, addToast: () => {}, mode: 'Avancé',
  });

  // Tout ce qui est interrogé doit l'être sur NDX (liste B), jamais sur SPX (liste A).
  assert.ok(seen.snapshot.length, "l'indice a bien été interrogé");
  assert.ok(seen.snapshot.every(s => s === 'NDX'), `indice interrogé : ${seen.snapshot.join(',')}`);
  assert.ok(seen.vol.every(s => s === 'NDX'), `vol demandée sur : ${seen.vol.join(',')}`);
  assert.ok(seen.impl.every(s => s === 'NDX'), `ρ implicite demandée sur : ${seen.impl.join(',')}`);
  await React.act(async () => { root.unmount(); });
});

test('le contexte affiché est resynchronisé sur la liste ouverte', async () => {
  store.clear();
  const pushed = [];
  const C = loadConstruction({ snapshot: [], vol: [], impl: [] });
  const { root } = await mount(C, {
    listId: 'B', moduleCtx: STALE_CTX, onModuleCtx: u => pushed.push(u), lists: LISTS,
    onNav: () => {}, addToast: () => {}, mode: 'Avancé',
  });

  const last = pushed[pushed.length - 1];
  assert.ok(last, 'le module doit corriger le contexte');
  assert.equal(last.listId, 'B');
  assert.equal(last.listName, 'Nouvelle liste', "le titre ne doit plus annoncer l'ancienne liste");
  assert.equal(last.listIndex, 'NDX');
  await React.act(async () => { root.unmount(); });
});

test('une structure imposée prime sur celle de la stratégie enregistrée', async () => {
  store.clear();
  // Construction antérieure sur cette liste, en vega-neutre.
  localStorage.setItem('dx-strategy-B', JSON.stringify({
    nIndex: 1, sizingMethod: 'vega_neutral', components: [{ ticker: 'AAPL', nContracts: 1 }], portfolio: {},
  }));
  const C = loadConstruction({ snapshot: [], vol: [], impl: [] });
  const { root } = await mount(C, {
    listId: 'B', sizingOverride: 'theta_flat', moduleCtx: STALE_CTX, onModuleCtx: () => {},
    lists: LISTS, onNav: () => {}, addToast: () => {}, mode: 'Avancé',
  });

  // La consigne du playbook Régime doit tenir — et être mémorisée pour cette liste.
  assert.equal(localStorage.getItem('dx-sizing-B'), 'theta_flat');
  await React.act(async () => { root.unmount(); });
});

test("la structure choisie survit à un aller-retour sans enregistrement", async () => {
  store.clear();
  const C = loadConstruction({ snapshot: [], vol: [], impl: [] });
  // 1er passage : arrivée depuis le playbook Régime en theta-flat.
  const first = await mount(C, {
    listId: 'B', sizingOverride: 'theta_flat', moduleCtx: STALE_CTX, onModuleCtx: () => {},
    lists: LISTS, onNav: () => {}, addToast: () => {}, mode: 'Avancé',
  });
  await React.act(async () => { first.root.unmount(); });

  // 2e passage par le menu : plus aucune consigne dans l'URL, rien d'enregistré.
  const again = await mount(C, {
    listId: 'B', moduleCtx: STALE_CTX, onModuleCtx: () => {}, lists: LISTS,
    onNav: () => {}, addToast: () => {}, mode: 'Avancé',
  });
  assert.equal(localStorage.getItem('dx-sizing-B'), 'theta_flat', 'pas de retour silencieux au vega-neutre');
  await React.act(async () => { again.root.unmount(); });
});

test("en euros, aucune valeur convertie n'est étiquetée en dollars", async () => {
  // Les cartes vega / delta / theta convertissaient bien le MONTANT mais gardaient
  // un « $ » écrit en dur — juste à côté de « Prime nette », elle correctement en €.
  store.clear();
  const C = loadConstruction({ snapshot: [], vol: [], impl: [] });
  const { container, root } = await mount(C, {
    listId: 'B', moduleCtx: STALE_CTX, onModuleCtx: () => {}, lists: LISTS,
    onNav: () => {}, addToast: () => {}, mode: 'Avancé',
  });
  const html = container.innerHTML;

  assert.match(html, /Vega net/, 'les cartes de synthèse sont rendues');
  assert.doesNotMatch(html, /\$\/1%/, "plus de « $/1% » alors que la devise est l'euro");
  assert.doesNotMatch(html, /\d\s?\$/, 'aucun montant suivi du symbole dollar');
  await React.act(async () => { root.unmount(); });
});

test('chaque liste garde SA structure', async () => {
  store.clear();
  const C = loadConstruction({ snapshot: [], vol: [], impl: [] });
  const b = await mount(C, { listId: 'B', sizingOverride: 'theta_flat', moduleCtx: STALE_CTX, onModuleCtx: () => {}, lists: LISTS, onNav: () => {}, addToast: () => {}, mode: 'Avancé' });
  await React.act(async () => { b.root.unmount(); });
  const a = await mount(C, { listId: 'A', sizingOverride: 'gamma_flat', moduleCtx: STALE_CTX, onModuleCtx: () => {}, lists: LISTS, onNav: () => {}, addToast: () => {}, mode: 'Avancé' });
  await React.act(async () => { a.root.unmount(); });

  assert.equal(localStorage.getItem('dx-sizing-B'), 'theta_flat');
  assert.equal(localStorage.getItem('dx-sizing-A'), 'gamma_flat', 'la liste A ne récupère pas la structure de B');
});

test('le gamma net est affiche en dollars pour ±1 %, pas en gamma brut', async () => {
  // Le gamma est stocke en γ brut (P&L = γ·(ΔS/S)²). Affiche tel quel il sortait
  // en millions, a cote de trois structures exprimees en dollars — l'utilisateur
  // a legitimement cru a une anomalie. Convention du site (StrategyDetail,
  // `gammaCell`) : γ × 1e-4 = dollars pour un mouvement de ±1 %.
  //
  // Le stub greeks donne gammaK = 1 par contrat, donc netGamma reste petit ici :
  // ce test verrouille l'UNITE affichee et la conversion, pas une magnitude.
  store.clear();
  const C = loadConstruction({ snapshot: [], vol: [], impl: [] });
  const { container, root } = await mount(C, {
    listId: 'G', sizingOverride: 'gamma_flat', moduleCtx: STALE_CTX, onModuleCtx: () => {},
    lists: LISTS, onNav: () => {}, addToast: () => {}, mode: 'Avancé',
  });
  const txt = container.textContent;

  assert.match(txt, /Gamma-flat/, 'la structure gamma-flat est bien active');
  assert.match(txt, /gamma net/, 'le grec neutralise est nomme');
  // L'unite DOIT etre ecrite : sans elle, on compare un gamma a des dollars.
  assert.match(txt, /pour ±1\s?%/, "l'unite « pour ±1 % » accompagne le gamma net");
  await React.act(async () => { root.unmount(); });
});

test('chaque structure nomme SON unite (on ne compare pas un vega a une prime)', async () => {
  store.clear();
  const C = loadConstruction({ snapshot: [], vol: [], impl: [] });
  for (const [structure, unite] of [
    ['vega_neutral',    /pour 1 pt d'IV/],
    ['theta_flat',      /\/jour/],
    ['premium_neutral', /prime net/],
  ]) {
    const { container, root } = await mount(C, {
      listId: 'U', sizingOverride: structure, moduleCtx: STALE_CTX, onModuleCtx: () => {},
      lists: LISTS, onNav: () => {}, addToast: () => {}, mode: 'Avancé',
    });
    assert.match(container.textContent, unite, `${structure} doit nommer son unite`);
    await React.act(async () => { root.unmount(); });
  }
});

test("une structure inatteignable a cette taille est SIGNALEE, pas subie", async () => {
  // Les options se traitent par lots entiers : n = max(1, round(cible × poids / grec)).
  // Quand la part visee par composant pese moins d'un contrat, l'arrondi tombe a 0
  // et le plancher force 1 lot → on achete plusieurs fois trop de chaque jambe et le
  // grec cense etre neutralise ne l'est pas. Mesure sur un cas type (indice 7 507 $,
  // composant 2 235 $, 10 noms) : prime nette −14 846 $ au lieu de ≈ 0 a 1 contrat.
  // Et ce n'est PAS monotone (3 tombe juste, 4 et 5 non) — d'ou une recherche a
  // tatons cote utilisateur si rien ne le signale.
  store.clear();
  const C = loadConstruction({ snapshot: [], vol: [], impl: [] });
  const { container, root } = await mount(C, {
    listId: 'B', sizingOverride: 'premium_neutral', moduleCtx: STALE_CTX, onModuleCtx: () => {},
    lists: LISTS, onNav: () => {}, addToast: () => {}, mode: 'Avancé',
  });
  const txt = container.textContent;
  assert.match(txt, /pas atteignable/, "l'inatteignabilite est dite explicitement");
  assert.match(txt, /lots entiers/, 'la cause (granularite des lots) est expliquee');
  assert.match(txt, /contrats indice/, 'une taille de remplacement est proposee');
  await React.act(async () => { root.unmount(); });
});

test("le bouton applique la taille qui neutralise vraiment", async () => {
  store.clear();
  const C = loadConstruction({ snapshot: [], vol: [], impl: [] });
  const { container, root } = await mount(C, {
    listId: 'B', sizingOverride: 'premium_neutral', moduleCtx: STALE_CTX, onModuleCtx: () => {},
    lists: LISTS, onNav: () => {}, addToast: () => {}, mode: 'Avancé',
  });
  const btn = Array.from(container.querySelectorAll('button')).find(b => /Appliquer \d+/.test(b.textContent));
  assert.ok(btn, 'le bouton d\'application est present');

  await React.act(async () => { btn.click(); });
  for (let i = 0; i < 4; i++) await React.act(async () => { await Promise.resolve(); });

  // Une fois la bonne taille appliquee, l'avertissement doit disparaitre.
  assert.doesNotMatch(container.textContent, /pas atteignable/,
    'a la taille suggeree, la structure est tenue');
  await React.act(async () => { root.unmount(); });
});

test("en 1 lot par jambe, aucun avertissement d'atteignabilite", async () => {
  // `equal_weight` ne neutralise rien : parler de residu n'aurait aucun sens.
  store.clear();
  const C = loadConstruction({ snapshot: [], vol: [], impl: [] });
  const { container, root } = await mount(C, {
    listId: 'B', sizingOverride: 'equal_weight', moduleCtx: STALE_CTX, onModuleCtx: () => {},
    lists: LISTS, onNav: () => {}, addToast: () => {}, mode: 'Avancé',
  });
  assert.doesNotMatch(container.textContent, /pas atteignable/);
  await React.act(async () => { root.unmount(); });
});
