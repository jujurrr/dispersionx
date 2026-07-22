// Cluster C (briques 5 et 9) : les deux sections pédagogiques des Docs.
// On rend l'écran pour de vrai et on vérifie que les affirmations CHIFFRÉES
// correspondent aux rapports de recherche (backtest/*.md) — une fiche « vérité »
// dont les chiffres dérivent serait pire que pas de fiche du tout.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { transformSync } from '@babel/core';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import vm from 'node:vm';

const url = p => new URL(p, import.meta.url);

function renderDocs(mode) {
  const win = {
    React,
    DispersionXDesignSystem_cb86be: {
      BeginnerExplanationBox: ({ children }) => React.createElement('div', null, children),
    },
  };
  win.window = win;
  const ctx = vm.createContext({ window: win, React, console, Object, Array, String, Number, Math, JSON });
  const src = readFileSync(url('../js/screens/Docs.jsx'), 'utf8');
  vm.runInContext(transformSync(src, { presets: ['@babel/preset-react'], babelrc: false, configFile: false }).code, ctx);
  return renderToStaticMarkup(React.createElement(win.Docs, { mode }));
}

test('Docs · brique 5 : la chaîne économique de la prime est expliquée', () => {
  const html = renderDocs('Avancé');

  assert.match(html, /Comprendre la prime de corrélation/);
  // Le mécanisme : autocallables → banque exposée → rachat de corrélation → fonds.
  assert.match(html, /autocallables/i);
  assert.match(html, /racheter de la corrélation/i);
  // Les 4 maillons de la chaîne de valeur (ECONOMIE_CORRELATION.md §2).
  for (const acteur of ['Le particulier', 'La banque', 'Les fonds de dispersion', 'Les teneurs de marché']) {
    assert.ok(html.includes(acteur), `maillon manquant : ${acteur}`);
  }
  // Taille du marché et cadre réglementaire — les deux faits chiffrés de la section.
  assert.ok(html.includes('127 Md$'), 'taille du marché autocallable');
  assert.match(html, /Bâle III/);
  // Le point qui protège l'utilisateur : il est l'entrepôt du risque, pas un arbitragiste.
  assert.match(html, /entrepôt/i);
});

test('Docs · brique 9 : la fiche vérité annonce le verdict et ses chiffres', () => {
  const html = renderDocs('Avancé');

  assert.match(html, /La fiche vérité de la dispersion/);
  // Le verdict doit être explicite, pas noyé.
  assert.match(html, /aucun gain net robuste/i);
  // Les 4 angles testés (DISPERSION_SYNTHESE.md) et leur tueur respectif.
  for (const angle of ['À la monnaie', 'Skew', 'Flux', 'Structure par terme']) {
    assert.ok(html.includes(angle), `angle manquant : ${angle}`);
  }
  // Chiffres qui doivent correspondre aux rapports :
  assert.ok(html.includes('19×'), "asymétrie de spread (DATA_AUDIT : ~19× sur le straddle 30 j)");
  assert.ok(html.includes('0,62 %') && html.includes('11,8 %'), 'spreads ETF vs composant médian');
  assert.ok(html.includes('0,44') && html.includes('0,17'), 'skew : ρ implicite 0,44 vs réalisé 0,17');
  assert.ok(html.includes('0,34') && html.includes('0,82'), 'Sharpe publié 0,34-0,82');
  assert.ok(html.includes('501'), 'univers testé : 501 titres');
  // L'aveu qui rend la fiche honnête : la fenêtre ne contient aucun krach.
  assert.match(html, /aucun krach de corrélation/i);
  assert.match(html, /y compris les nôtres/i);
});

test('Docs · fiche ALT : présentée comme expérimentale et couverte net sur l’indice', () => {
  const html = renderDocs('Avancé');

  assert.match(html, /Le modèle ALT/);
  // Ce qu'il note : vol idio réalisée − coût, SANS prime de corrélation.
  assert.match(html, /vol idiosyncratique réalisée/i);
  assert.match(html, /sans prime de corrélation/i);
  // Le complément indispensable : hedge NET sur l'indice, pas jambe par jambe.
  // (on évite l'apostrophe dans la regex — l'échappement HTML des apostrophes varie.)
  assert.match(html, /delta-hedgé NET sur l/i);
  assert.match(html, /pas jambe par jambe/i);
  // Le cadrage honnête doit rester : facteur expérimental, pas une promesse.
  assert.match(html, /expérimental/i);
  assert.match(html, /facteur régime-sensible/i);
  assert.match(html, /jamais comme un signal d/i);
});

test('Docs · les sections pédagogiques viennent après la référence technique', () => {
  const html = renderDocs('Avancé');
  const at = n => { const i = html.indexOf(n); assert.notEqual(i, -1, `introuvable : ${n}`); return i; };
  // La page reste d'abord une référence ; l'éducation la prolonge, sans la noyer.
  assert.ok(at('Formules fondamentales') < at('Comprendre la prime de corrélation'));
  assert.ok(at('Comprendre la prime de corrélation') < at('La fiche vérité de la dispersion'));
});

test('Docs · le mode Débutant reste rendu (valeur "Débutant", accentuée)', () => {
  // Piège réel : la convention de l'app est 'Débutant' avec majuscule ET accent.
  assert.match(renderDocs('Débutant'), /cœur du signal de dispersion/);
  assert.doesNotMatch(renderDocs('Avancé'), /cœur du signal de dispersion/);
});
