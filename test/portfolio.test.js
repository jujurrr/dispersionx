// Cœur financier serveur : grecs Black-Scholes ATM + limiteur de concurrence.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bsAtm, normCDF, mapLimit } from '../api/risk/portfolio.js';

test('normCDF : valeurs de référence', () => {
  assert.ok(Math.abs(normCDF(0) - 0.5) < 1e-6);
  assert.ok(normCDF(3) > 0.99 && normCDF(3) < 1);
  assert.ok(normCDF(-3) > 0 && normCDF(-3) < 0.01);
});

test('bsAtm : signes des grecs d’un straddle ATM long', () => {
  const g = bsAtm(100, 0.20, 30 / 365);   // spot 100, IV 20 %, 30 jours
  assert.ok(g.premium > 0, 'prime positive');
  assert.ok(g.vega > 0, 'vega long positif');
  assert.ok(g.gamma > 0, 'gamma long positif');
  assert.ok(g.theta < 0, 'theta négatif (perte de valeur temps)');
});

test('bsAtm : le vega grandit avec l’échéance (∝ √T)', () => {
  const court = bsAtm(100, 0.20, 30 / 365);
  const long  = bsAtm(100, 0.20, 90 / 365);
  assert.ok(long.vega > court.vega);
});

test('bsAtm : entrées invalides → null', () => {
  assert.equal(bsAtm(100, 0.2, 0), null);
  assert.equal(bsAtm(100, 0, 0.1), null);
  assert.equal(bsAtm(0, 0.2, 0.1), null);
});

test('mapLimit : préserve l’ordre des résultats', async () => {
  const out = await mapLimit([1, 2, 3, 4, 5], 2, async (n) => n * 10);
  assert.deepEqual(out, [10, 20, 30, 40, 50]);
});

test('mapLimit : ne dépasse jamais la concurrence maximale', async () => {
  let active = 0, max = 0;
  const task = async () => {
    active++; max = Math.max(max, active);
    await new Promise(r => setTimeout(r, 5));
    active--;
    return true;
  };
  await mapLimit(Array.from({ length: 12 }, () => task), 3, (fn) => fn());
  assert.ok(max <= 3, `concurrence observée ${max} ≤ 3`);
});
