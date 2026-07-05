// Échelles ETF proxy → niveau d'indice : la source unique doit rester stable
// (une erreur ici fausse le sizing vega-neutre indice dans le Risk Lab).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PROXY_SCALE, proxyEtf, proxyScale } from '../api/_lib/proxy-scale.js';

test('valeurs canoniques des ETF proxy', () => {
  assert.equal(proxyEtf('SPX'), 'SPY');
  assert.equal(proxyEtf('NDX'), 'QQQ');
  assert.equal(proxyEtf('CAC'), 'EWQ');
  assert.equal(proxyEtf('DAX'), 'EWG');
});

test('échelles canoniques (les anciennes valeurs 40/250/600 sont des régressions)', () => {
  assert.equal(proxyScale('NDX'), 41);
  assert.equal(proxyScale('CAC'), 196);
  assert.equal(proxyScale('DAX'), 565);
  assert.equal(proxyScale('SPX'), 10);
});

test('repli sûr pour un symbole inconnu', () => {
  assert.equal(proxyEtf('ZZZ'), 'ZZZ');
  assert.equal(proxyScale('ZZZ'), 1);
});

test('insensible à la casse', () => {
  assert.equal(proxyEtf('cac'), 'EWQ');
  assert.equal(proxyScale('ndx'), 41);
});

test('les 5 indices attendus sont présents', () => {
  assert.deepEqual(Object.keys(PROXY_SCALE).sort(), ['CAC', 'DAX', 'DJI', 'NDX', 'SPX']);
});
