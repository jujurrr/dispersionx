import test from 'node:test';
import assert from 'node:assert/strict';
import { impliedCorrelation, vegaWeights, vegaShares } from '../api/_lib/dispersion-math.js';

// Panier de référence : 2 noms, poids égaux, σ = 30 % chacun.
//   Σwσ = 0.30, Σw²σ² = 0.045.  Variance indice = Σw²σ² + ρ·(Σwσ² − Σw²σ²).
const NAMES = [{ w: 0.5, sigma: 0.30 }, { w: 0.5, sigma: 0.30 }];

test('ρ_impl ≈ 0.5 quand σ_indice reflète une corrélation de 0.5', () => {
  // σ_I² = 0.045 + 0.5·(0.09 − 0.045) = 0.0675
  const r = impliedCorrelation(Math.sqrt(0.0675), NAMES);
  assert.ok(Math.abs(r - 0.5) < 1e-9, `attendu 0.5, obtenu ${r}`);
});

test('ρ_impl → clamp bas 0.05 quand les composants sont indépendants', () => {
  // ρ réel = 0 → σ_I² = Σw²σ² = 0.045
  assert.equal(impliedCorrelation(Math.sqrt(0.045), NAMES), 0.05);
});

test('ρ_impl → clamp haut 0.95 quand σ_indice = Σwσ (parfaitement corrélé)', () => {
  assert.equal(impliedCorrelation(0.30, NAMES), 0.95);
});

test('ρ_impl monotone : σ_indice plus élevé → corrélation implicite plus élevée', () => {
  const lo = impliedCorrelation(0.24, NAMES);
  const hi = impliedCorrelation(0.27, NAMES);
  assert.ok(hi > lo, `${hi} devrait être > ${lo}`);
});

test('ρ_impl null si moins de 2 composants valides', () => {
  assert.equal(impliedCorrelation(0.2, [{ w: 1, sigma: 0.3 }]), null);
  assert.equal(impliedCorrelation(0.2, [{ w: 0.5, sigma: 0 }, { w: 0.5, sigma: 0.3 }]), null);
});

test('ρ_impl null si σ_indice invalide', () => {
  assert.equal(impliedCorrelation(0, NAMES), null);
  assert.equal(impliedCorrelation(null, NAMES), null);
});

test('ρ_impl insensible à l\'échelle des poids (10/10 ≡ 0.5/0.5)', () => {
  const a = impliedCorrelation(Math.sqrt(0.0675), NAMES);
  const b = impliedCorrelation(Math.sqrt(0.0675), [{ w: 10, sigma: 0.30 }, { w: 10, sigma: 0.30 }]);
  assert.ok(Math.abs(a - b) < 1e-12);
});

test('vegaWeights : plus de vega → plus de poids, somme = 1', () => {
  const vw = vegaWeights([
    { ticker: 'A', w: 0.5, sigma: 0.3, vega: 10 },
    { ticker: 'B', w: 0.5, sigma: 0.3, vega: 30 },
  ]);
  assert.ok(Math.abs(vw[0].w + vw[1].w - 1) < 1e-12);
  assert.ok(vw[1].w > vw[0].w, 'le nom à plus de vega doit peser davantage');
  assert.ok(Math.abs(vw[1].w - 0.75) < 1e-9);   // 30/(10+30)
});

test('vegaWeights null si vega manquant', () => {
  assert.equal(vegaWeights([{ ticker: 'A', w: 0.5, sigma: 0.3 }, { ticker: 'B', w: 0.5, sigma: 0.3 }]), null);
});

test('vegaShares : dictionnaire ticker→part normalisée', () => {
  const s = vegaShares([
    { ticker: 'A', w: 0.5, sigma: 0.3, vega: 10 },
    { ticker: 'B', w: 0.5, sigma: 0.3, vega: 30 },
  ]);
  assert.ok(Math.abs(s.A + s.B - 1) < 1e-12);
  assert.ok(Math.abs(s.B - 0.75) < 1e-9);
});
