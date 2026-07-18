// Barrière d'erreur : une erreur de rendu ne doit plus détruire l'application.
// Contexte — la Synthèse du Builder levait un ReferenceError et React perdait tout
// l'arbre : écran figé, navigation morte, rafraîchissement forcé. La barrière doit
// contenir le dégât ET laisser une porte de sortie.
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

// React journalise l'erreur attrapée : on tait ce bruit attendu, sans masquer
// les vraies erreurs inattendues (elles feraient échouer l'assertion).
const quiet = async fn => {
  const err = console.error;
  console.error = () => {};
  try { return await fn(); } finally { console.error = err; }
};

function loadBoundary() {
  const win = { React };
  win.window = win;
  const ctx = vm.createContext({ window: win, React, console, Object, Array, String, Number, Math, JSON });
  const src = readFileSync(new URL('../js/screens/ErrorBoundary.jsx', import.meta.url), 'utf8');
  vm.runInContext(transformSync(src, { presets: ['@babel/preset-react'], babelrc: false, configFile: false }).code, ctx);
  return win.DXErrorBoundary;
}

// Composant qui plante EXACTEMENT comme TradeBrief plantait : au rendu.
const Boom = ({ armed }) => { if (armed) throw new ReferenceError('dxMag is not defined'); return React.createElement('div', null, 'contenu du module'); };

async function mountTree(el) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await quiet(async () => { await React.act(async () => { root.render(el); }); });
  return { container, root, rerender: async next => { await quiet(async () => { await React.act(async () => { root.render(next); }); }); } };
}

test("une erreur de rendu n'emporte plus ce qui l'entoure", async () => {
  const B = loadBoundary();
  const Shell = ({ armed }) => React.createElement('div', null,
    React.createElement('nav', null, 'barre latérale'),
    React.createElement(B, { scope: 'screen', resetKey: 'a' }, React.createElement(Boom, { armed })));

  const { container, root } = await mountTree(React.createElement(Shell, { armed: true }));
  const html = container.innerHTML;

  assert.match(html, /barre latérale/, 'la navigation survit — le point essentiel');
  assert.match(html, /Ce module a rencontré une erreur/);
  assert.match(html, /Réessayer/);
  assert.match(html, /dxMag is not defined/, "le détail technique est consultable");
  await React.act(async () => { root.unmount(); });
});

test('changer d\'écran repart d\'une page saine', async () => {
  const B = loadBoundary();
  const Tree = ({ armed, k }) => React.createElement(B, { scope: 'screen', resetKey: k }, React.createElement(Boom, { armed }));

  const { container, root, rerender } = await mountTree(React.createElement(Tree, { armed: true, k: 'ecran-1' }));
  assert.match(container.innerHTML, /rencontré une erreur/);

  // Navigation vers un autre écran : sans reset, l'erreur resterait collée partout.
  await rerender(React.createElement(Tree, { armed: false, k: 'ecran-2' }));
  assert.match(container.innerHTML, /contenu du module/);
  assert.doesNotMatch(container.innerHTML, /rencontré une erreur/);
  await React.act(async () => { root.unmount(); });
});

test('« Réessayer » re-rend le module', async () => {
  const B = loadBoundary();
  // `armed` passe à false entre-temps : le nouveau rendu doit réussir.
  let armed = true;
  const Flaky = () => { if (armed) throw new Error('panne passagère'); return React.createElement('div', null, 'module réparé'); };
  const { container, root } = await mountTree(React.createElement(B, { scope: 'screen', resetKey: 'x' }, React.createElement(Flaky)));
  assert.match(container.innerHTML, /rencontré une erreur/);

  armed = false;
  const retry = Array.from(container.querySelectorAll('button')).find(b => /Réessayer/.test(b.textContent));
  await quiet(async () => { await React.act(async () => { retry.click(); }); });

  assert.match(container.innerHTML, /module réparé/);
  await React.act(async () => { root.unmount(); });
});

test('sans erreur, la barrière est parfaitement transparente', async () => {
  const B = loadBoundary();
  const { container, root } = await mountTree(
    React.createElement(B, { scope: 'screen', resetKey: 'a' }, React.createElement(Boom, { armed: false })));
  assert.equal(container.innerHTML.includes('contenu du module'), true);
  assert.doesNotMatch(container.innerHTML, /erreur/);
  await React.act(async () => { root.unmount(); });
});

test('la barrière racine annonce que les données sont sauves', async () => {
  const B = loadBoundary();
  const { container, root } = await mountTree(
    React.createElement(B, { scope: 'root' }, React.createElement(Boom, { armed: true })));
  const html = container.innerHTML;

  assert.match(html, /L'application a rencontré une erreur/);
  assert.match(html, /Recharger la page/);
  assert.doesNotMatch(html, /Réessayer/, 'au niveau racine, seul le rechargement a du sens');
  await React.act(async () => { root.unmount(); });
});
