// Fonctions PURES du pipeline Cboe (pas d'appel réseau) : mapping de symbole
// et interpolation d'IV par terme.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cboeSymbol, ivAtDte } from '../api/_lib/cboe.js';

test('cboeSymbol : indices purs préfixés, ETF proxy pour CAC/DAX', () => {
  assert.equal(cboeSymbol('SPX'), '_SPX');
  assert.equal(cboeSymbol('NDX'), '_NDX');
  assert.equal(cboeSymbol('DJI'), '_DJX');
  assert.equal(cboeSymbol('CAC'), 'EWQ');
  assert.equal(cboeSymbol('DAX'), 'EWG');
  assert.equal(cboeSymbol('aapl'), 'AAPL');   // action ordinaire : inchangée (majuscule)
});

test('ivAtDte : renvoie l’IV exacte à un point connu', () => {
  const term = [{ dte: 7, iv: 20 }, { dte: 30, iv: 18 }, { dte: 60, iv: 17 }];
  assert.equal(ivAtDte(term, 30), 18);
});

test('ivAtDte : interpole entre deux échéances (en variance)', () => {
  const term = [{ dte: 30, iv: 20 }, { dte: 60, iv: 20 }];
  // IV plate → l’interpolation doit rester ~20 au milieu.
  assert.equal(ivAtDte(term, 45), 20);
});

test('ivAtDte : liste vide → null', () => {
  assert.equal(ivAtDte([], 30), null);
  assert.equal(ivAtDte(null, 30), null);
});

test('ivAtDte : au-delà des bornes, se rabat sur l’extrémité', () => {
  const term = [{ dte: 30, iv: 18 }];
  assert.equal(ivAtDte(term, 5), 18);
  assert.equal(ivAtDte(term, 200), 18);
});
