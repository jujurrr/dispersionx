// « + Nouvelle » dans la fiche de score (ScoreModal) fermait la fiche et émettait
// `dx-new-list` — un événement que SEUL l'écran « Mes listes » écoutait, alors
// qu'il n'est pas monté quand on ouvre la fiche depuis un indice. L'événement
// tombait dans le vide : la fiche se fermait et aucune liste n'était créée.
//
// La fiche crée désormais la liste elle-même. Ce test monte réellement le
// composant (jsdom) et déroule le parcours complet : ouvrir le formulaire,
// saisir un nom + une note, valider — puis vérifie que l'appel est le MÊME que
// celui du module Listes (DXApi.createList) et que le site est prévenu par
// `dx-lists-changed`, l'événement qu'écoutent l'App, le Dashboard, l'Activité,
// les Notifications et le cloud.
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
  ScoreBadge: ({ children }) => React.createElement('span', null, children),
  WarningPanel: ({ children }) => React.createElement('div', null, children),
  BeginnerExplanationBox: ({ children }) => React.createElement('div', null, children),
};

// Réponse minimale d'auto-score : de quoi atteindre le bas de la fiche (vue V2,
// ni IV-rank ni grecs → blocs optionnels ignorés).
const SCORE_DATA = {
  stock: { symbol: 'AAPL', beta: 1.2, iv_source: 'ibkr' },
  index: { symbol: 'NDX' },
  scoring: { score: 71, signal: 'FORT', signal_color: 'green', recommendation: 'Bon candidat.', subscores: {}, v2_parts: {} },
};

// Charge la fiche dans son propre « window », comme dans le navigateur, en
// enregistrant les événements qu'elle émet.
function loadScoreModal(api) {
  const events = [];
  const win = {
    React,
    addEventListener() {}, removeEventListener() {},
    dispatchEvent(e) { events.push(e); return true; },
    CustomEvent: class { constructor(type, opts) { this.type = type; this.detail = opts && opts.detail; } },
    DispersionXDesignSystem_cb86be: DS,
    DXApi: api,
  };
  win.window = win;
  const ctx = vm.createContext({
    window: win, React, console, DXApi: api, CustomEvent: win.CustomEvent,
    setTimeout: (f) => { f(); return 0; }, clearTimeout: () => {},
    Date, JSON, Math, String, Number, Object, Array, Boolean, isFinite, isNaN,
    parseFloat, parseInt, Set, Map, Promise, Error,
  });
  const src = readFileSync(new URL('../js/screens/ScoreModal.jsx', import.meta.url), 'utf8');
  vm.runInContext(transformSync(src, { presets: ['@babel/preset-react'], babelrc: false, configFile: false }).code, ctx);
  return { ScoreModal: win.ScoreModal, events };
}

async function flush() {
  await React.act(async () => { await Promise.resolve(); });
  await React.act(async () => { await new Promise(r => setTimeout(r, 0)); });
}

const byText = (root, sel, txt) => Array.from(root.querySelectorAll(sel)).find(el => el.textContent.trim() === txt);
const click = async (el) => { await React.act(async () => { el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); }); };

// Champ contrôlé React : passer par le setter natif puis émettre « input ».
async function type(el, value) {
  const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set;
  await React.act(async () => {
    setter.call(el, value);
    el.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  });
}

async function openModal(api, props) {
  const { ScoreModal, events } = loadScoreModal(api);
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await React.act(async () => {
    root.render(React.createElement(ScoreModal, {
      indexSymbol: 'NDX', stockTicker: 'AAPL', duration: 30, lists: [],
      onClose: () => {}, onAddedToList: () => {}, addToast: () => {}, mode: 'Avancé',
      ...props,
    }));
  });
  await flush();
  return { container, root, events };
}

test('ScoreModal · « + Nouvelle » ouvre un formulaire SANS fermer la fiche', async () => {
  let closed = 0;
  const { container, root, events } = await openModal({
    autoScore: () => Promise.resolve(SCORE_DATA),
  }, { onClose: () => { closed++; } });

  const btn = byText(container, 'button', '+ Nouvelle');
  assert.ok(btn, 'le bouton « + Nouvelle » doit être rendu');
  assert.equal(container.querySelector('form'), null, 'aucun formulaire avant le clic');

  await click(btn);

  assert.equal(closed, 0, 'la fiche ne doit PAS se fermer — c\'était tout le bug');
  assert.ok(container.querySelector('form'), 'le formulaire de création doit apparaître');
  assert.equal(events.filter(e => e.type === 'dx-new-list').length, 0,
    'plus aucun événement `dx-new-list` : personne ne l\'écoutait depuis un indice');

  await React.act(async () => { root.unmount(); });
});

test('ScoreModal · le formulaire crée la liste sur l\'indice de l\'action, avec sa note', async () => {
  const created = [], added = [];
  const { container, root, events } = await openModal({
    autoScore: () => Promise.resolve(SCORE_DATA),
    createList: (name, index_symbol, description) => {
      created.push({ name, index_symbol, description });
      return Promise.resolve({ id: 'L-new', name, index_symbol, description, group_name: null, n_items: 0, avg_score: 0, items: [] });
    },
    addListItem: (id, ticker) => { added.push({ id, ticker }); return Promise.resolve({ success: true }); },
  });

  await click(byText(container, 'button', '+ Nouvelle'));
  const inputs = container.querySelectorAll('form input');
  await type(inputs[0], 'Panier NDX');
  await type(inputs[1], 'Ma note');

  await React.act(async () => {
    container.querySelector('form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  });
  await flush();

  assert.deepEqual(created, [{ name: 'Panier NDX', index_symbol: 'NDX', description: 'Ma note' }],
    'même appel que le module Listes, avec l\'indice de l\'action pré-sélectionné');
  assert.deepEqual(added, [{ id: 'L-new', ticker: 'AAPL' }],
    'la case cochée par défaut ajoute l\'action à la liste tout juste créée');
  assert.ok(events.some(e => e.type === 'dx-lists-changed'),
    'le site entier doit être prévenu, comme pour toute autre création de liste');

  // La liste apparaît TOUT DE SUITE dans le sélecteur, sans attendre que l'App
  // recharge la prop `lists`, et elle est sélectionnée.
  const select = container.querySelector('select');
  assert.match(select.innerHTML, /Panier NDX/, 'la liste créée doit être proposée immédiatement');
  assert.equal(select.value, 'L-new', 'et être sélectionnée');
  assert.equal(container.querySelector('form'), null, 'le formulaire se referme après création');

  await React.act(async () => { root.unmount(); });
});

test('ScoreModal · sans liste sur cet indice, le sélecteur le dit au lieu de rester muet', async () => {
  const { container, root } = await openModal({ autoScore: () => Promise.resolve(SCORE_DATA) });
  assert.match(container.querySelector('select').innerHTML, /Aucune liste NDX/);
  await React.act(async () => { root.unmount(); });
});

test('ScoreModal · une création qui échoue laisse la fiche ouverte et prévient', async () => {
  const toasts = [];
  const { container, root, events } = await openModal({
    autoScore: () => Promise.resolve(SCORE_DATA),
    createList: () => Promise.reject(new Error('hors ligne')),
  }, { addToast: (m, kind) => toasts.push({ m, kind }) });

  await click(byText(container, 'button', '+ Nouvelle'));
  await type(container.querySelectorAll('form input')[0], 'Panier NDX');
  await React.act(async () => {
    container.querySelector('form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  });
  await flush();

  assert.ok(toasts.some(t => t.kind === 'error' && /hors ligne/.test(t.m)), 'le motif réel doit être affiché');
  assert.ok(container.querySelector('form'), 'le formulaire reste ouvert — la saisie n\'est pas perdue');
  assert.equal(events.filter(e => e.type === 'dx-lists-changed').length, 0,
    'aucune annonce de changement si rien n\'a été créé');

  await React.act(async () => { root.unmount(); });
});
