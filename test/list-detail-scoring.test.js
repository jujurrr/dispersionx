// En-tête d'analyse d'une liste : ce qui est affiché doit être MESURÉ, et doit
// s'accorder avec les scores des lignes juste en dessous.
//
// Deux défauts corrigés ici, tous deux visibles sur le même écran :
//
//  1. Les scores étaient ancrés sur la ρ implicite du SOUS-PANIER de la liste
//     (ou, sous 12 noms, sur le fail-safe serveur 0,65), alors que l'écran
//     Indices les ancrait sur la ρ de l'indice complet. Le même titre valait
//     jusqu'à 23 points de plus selon le chemin de navigation.
//
//  2. Les cartes d'analyse venaient de DXApi.getListAnalysis(), qui interroge un
//     endpoint /lists/:id/analysis INEXISTANT. L'appel échouait donc toujours et
//     retombait sur des constantes de démonstration : toute liste, quel que soit
//     son contenu, affichait « Edge moyen +11,2 · ρ implicite 0,52 · ρ̂ réalisée
//     0,45 », un signal « FAVORABLE » et des recommandations parlant d'un
//     résultat AAPL — à côté de scores, eux, bien réels.
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

const ANCHOR = 0.24;     // ρ implicite de l'indice (ancre canonique)
const BASKET_RHO = 0.51; // ρ̂ réalisée mesurée du panier

// Liste VOLONTAIREMENT courte (3 noms) : c'est le cas qui n'obtenait aucune
// ancre auparavant et retombait sur le fail-safe 0,65.
const LIST = {
  id: 'L1', name: 'Tech NDX', index_symbol: 'NDX',
  items: [
    // Scores PERSISTÉS à l'ajout, volontairement gonflés (ancre 0,65 d'alors).
    { ticker: 'AAPL', score: 78, score_data: { score: 78 }, added: '2026-07-01' },
    { ticker: 'MSFT', score: 74, score_data: { score: 74 }, added: '2026-07-01' },
    { ticker: 'NVDA', score: 81, score_data: { score: 81 }, added: '2026-07-01' },
  ],
};
// Score canonique renvoyé par le serveur quand l'ancre correcte est passée.
const CANON = { AAPL: 31, MSFT: 28, NVDA: 35 };

function loadListDetail({ anchor = ANCHOR, capture } = {}) {
  const api = {
    getList: () => Promise.resolve(JSON.parse(JSON.stringify(LIST))),
    batchQuotes: () => Promise.resolve({}),
    getListAudit: () => Promise.resolve([]),
    getCorrelation: () => Promise.resolve({ rho_real: BASKET_RHO }),
    getCachedScore: () => null,
    autoScore: (idx, ticker, d, x, rho) => {
      capture && capture.push({ ticker, dur: d, rho });
      return Promise.resolve({ scoring: { score: CANON[ticker] ?? 0 } });
    },
    addListItem: () => Promise.resolve({ success: true }),
    // Ne DOIT plus être appelé : l'endpoint n'existe pas.
    getListAnalysis: () => { throw new Error('getListAnalysis ne doit plus être utilisé'); },
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
    // Le store est la seule autorité sur l'ancre.
    DXStore: { DEFAULT_DUR: 30, resolveRhoImpl: () => Promise.resolve(anchor) },
    DXMock: { getComponents: () => [] },
    DXActivity: { sentence: () => '', timeAgo: () => '' },
    DXCloud: { pro: false, enabled: false },
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

async function mount(opts = {}) {
  const ListDetail = loadListDetail(opts);
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await React.act(async () => {
    root.render(React.createElement(ListDetail, {
      listId: 'L1', onNav: () => {}, addToast: () => {}, mode: 'Avancé',
      duration: opts.duration || 30,
    }));
  });
  // Laisse les chaînes asynchrones (ancre → scoring → corrélation) se résoudre.
  for (let i = 0; i < 6; i++) await React.act(async () => { await Promise.resolve(); });
  return { container, root, text: () => container.textContent };
}

test("les actions d'une liste sont scorées sur l'ancre de l'INDICE", async () => {
  const capture = [];
  const { root } = await mount({ capture });
  assert.ok(capture.length >= 3, 'les 3 actions ont été rescorées');
  for (const c of capture) {
    assert.equal(c.rho, ANCHOR, `${c.ticker} doit être scoré sur l'ancre de l'indice, pas sur un sous-panier`);
    assert.equal(c.dur, 30);
  }
  await React.act(async () => { root.unmount(); });
});

test('la liste affiche le score canonique, pas celui figé à l\'ajout', async () => {
  const { root, text } = await mount();
  const t = text();
  // Les scores gonflés persistés (78/74/81) doivent avoir été remplacés.
  for (const v of Object.values(CANON)) assert.ok(t.includes(String(v)), `score canonique ${v} attendu`);
  assert.ok(!/\b78\b/.test(t) && !/\b81\b/.test(t), 'les scores figés à l\'ancre 0,65 ne sont plus affichés');
  await React.act(async () => { root.unmount(); });
});

test('la moyenne affichée est celle des scores affichés', async () => {
  const { root, text } = await mount();
  const attendu = ((CANON.AAPL + CANON.MSFT + CANON.NVDA) / 3).toFixed(1);
  assert.match(text(), new RegExp('Score pondéré: ' + attendu.replace('.', '\\.')));
  await React.act(async () => { root.unmount(); });
});

test('plus aucune constante de démonstration dans l\'en-tête', async () => {
  const { root, text } = await mount();
  const t = text();
  // Les valeurs du mock getListAnalysis, qui s'affichaient pour TOUTE liste.
  assert.ok(!t.includes('11.2'), 'l\'« Edge moyen +11,2 » inventé a disparu');
  assert.ok(!t.includes('0.52'), 'la « ρ implicite 0,52 » inventée a disparu');
  assert.ok(!t.includes('0.45'), 'la « ρ̂ réalisée 0,45 » inventée a disparu');
  assert.ok(!t.includes('AAPL (6j)'), 'la recommandation inventée sur AAPL a disparu');
  assert.ok(!t.includes('Dispersion'), 'la carte « Dispersion » sans source a été retirée');
  await React.act(async () => { root.unmount(); });
});

test('ρ implicite = ancre du scoring, ρ̂ réalisée = mesure du panier, prime = écart', async () => {
  const { root, text } = await mount();
  const t = text();
  assert.match(t, /ρ implicite: 0\.24/, "l'en-tête montre l'ancre qui a réellement servi à scorer");
  assert.match(t, /ρ̂ réalisée: 0\.51/, 'la corrélation réalisée est celle mesurée sur le panier');
  // Prime = (0,24 − 0,51) × 100 = −27,0 pts → défavorable, et dit comme tel.
  assert.match(t, /Prime ρ: -27\.0 pts/);
  assert.match(t, /DÉFAVORABLE/);
  await React.act(async () => { root.unmount(); });
});

test("sans ancre disponible, on affiche « — » plutôt qu'un chiffre inventé", async () => {
  const { root, text } = await mount({ anchor: null });
  const t = text();
  assert.match(t, /ρ implicite: —/, 'pas d\'ancre → pas de valeur affichée');
  assert.match(t, /Prime ρ: —/, 'pas de prime calculable sans les deux termes');
  await React.act(async () => { root.unmount(); });
});
