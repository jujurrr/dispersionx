// Résolution de contrats réels pour l'export IBKR — api/options/contracts.js.
// Teste la logique PURE (parsing OCC + choix échéance/strike) sur une chaîne
// Cboe synthétique, sans réseau.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { occParts, resolveOne } from '../api/options/contracts.js';

test('occParts : décode le symbole OCC (YYMMDD + C/P + strike×1000)', () => {
  assert.deepEqual(occParts('AAPL260821C00195000'), {
    exp8: '20260821', expMs: Date.UTC(2026, 7, 21), strike: 195,
  });
  // Demi-strike + underlying court.
  assert.equal(occParts('F260918P00012500').strike, 12.5);
  assert.equal(occParts('pas-un-symbole'), null);
});

// Chaîne synthétique : 2 échéances (mensuelle 20260821 + weekly 20260828),
// grille de strikes espacée. Spot 192.3.
function chain() {
  const opts = [];
  const add = (exp, k) => { opts.push({ option: `AAPL${exp}C${String(k * 1000).padStart(8, '0')}` });
                            opts.push({ option: `AAPL${exp}P${String(k * 1000).padStart(8, '0')}` }); };
  [180, 185, 190, 195, 200].forEach(k => add('260821', k));   // mensuelle
  [190, 195].forEach(k => add('260828', k));                  // weekly (moins de strikes)
  return { spot: 192.3, options: opts };
}

test('resolveOne : échéance cible listée + strike ATM réel le plus proche', () => {
  const r = resolveOne(chain(), '20260821');
  assert.equal(r.expiry, '20260821');
  assert.equal(r.strike, 190);        // le plus proche de 192.3 parmi {180,185,190,195,200}
  assert.equal(r.exactExpiry, true);
});

test('resolveOne : échéance cible NON listée → échéance listée la plus proche', () => {
  // Cible 20260820 (jeudi, non cotée) → l'échéance listée la plus proche = 20260821.
  const r = resolveOne(chain(), '20260820');
  assert.equal(r.expiry, '20260821');
  assert.equal(r.exactExpiry, false);
});

test('resolveOne : chaîne vide → null (le client retombe sur l\'heuristique)', () => {
  assert.equal(resolveOne({ spot: 100, options: [] }, '20260821'), null);
  assert.equal(resolveOne(null, '20260821'), null);
});
