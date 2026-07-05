// Statut d'ouverture des places boursières : week-ends, fériés, clôtures
// anticipées. Le module s'auto-enregistre sur globalThis.DXMarket.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../js/lib/market-hours.js';

const { EXCHANGES, isExchangeOpen } = globalThis.DXMarket;
const ex = (key) => EXCHANGES.find(e => e.key === key);

test('les 4 places sont définies avec le bon libellé', () => {
  assert.deepEqual(EXCHANGES.map(e => e.label), ['NYSE', 'CME', 'Euronext Paris', 'TSE']);
});

test('dimanche : NYSE, Euronext et TSE fermées', () => {
  const dim = new Date('2026-07-05T15:00:00Z');   // dimanche, 11:00 ET / 17:00 CET
  assert.equal(isExchangeOpen(ex('nyse'), dim), false);
  assert.equal(isExchangeOpen(ex('euronext'), dim), false);
  assert.equal(isExchangeOpen(ex('asia'), dim), false);
});

test('lundi en séance US : NYSE ouverte', () => {
  const lun = new Date('2026-07-06T14:00:00Z');   // lundi, 10:00 ET
  assert.equal(isExchangeOpen(ex('nyse'), lun), true);
});

test('jour férié (Noël) : NYSE et CME fermées', () => {
  const noel = new Date('2026-12-25T15:00:00Z');
  assert.equal(isExchangeOpen(ex('nyse'), noel), false);
  assert.equal(isExchangeOpen(ex('cme'), noel), false);
});

test('jour férié Euronext (1er Mai) : Euronext fermée', () => {
  const mai = new Date('2026-05-01T12:00:00Z');   // 14:00 CET
  assert.equal(isExchangeOpen(ex('euronext'), mai), false);
});

test('clôture anticipée NYSE (lendemain de Thanksgiving, 13:00 ET)', () => {
  const avant = new Date('2026-11-27T17:00:00Z');  // 12:00 ET → encore ouvert
  const apres = new Date('2026-11-27T19:00:00Z');  // 14:00 ET → déjà fermé
  assert.equal(isExchangeOpen(ex('nyse'), avant), true);
  assert.equal(isExchangeOpen(ex('nyse'), apres), false);
});

test('CME : fermée le samedi, rouvre le dimanche soir (18:00 ET)', () => {
  assert.equal(isExchangeOpen(ex('cme'), new Date('2026-07-04T15:00:00Z')), false); // samedi
  assert.equal(isExchangeOpen(ex('cme'), new Date('2026-07-05T23:30:00Z')), true);  // dim 18:30 ET
});
