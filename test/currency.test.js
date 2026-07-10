// Devise d'affichage (js/lib/currency.js) : garantit qu'en USD rien ne change
// (aucune régression sur les dollars), que la conversion EUR est correcte, et que
// le fail-safe retombe sur l'USD quand aucun taux n'est disponible.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../js/lib/currency.js';   // side-effect → globalThis.DXMoney

const M = globalThis.DXMoney;

// Reproduction FIDÈLE de la fonction dxUsd d'origine (PositionDetail.jsx) — la
// référence à ne pas casser. On compare via toLocaleString pour ne pas dépendre
// du caractère de séparateur (espace insécable selon l'environnement).
function dxUsdOrig(n, sign = true) {
  if (n == null || !isFinite(n)) return '—';
  const r = Math.round(n);
  const s = r < 0 ? '−' : (sign ? '+' : '');
  return s + Math.abs(r).toLocaleString('fr-FR');
}

test('USD : value() est IDENTIQUE à dxUsd (aucune régression dollars)', () => {
  for (const n of [0, 1, -1, 42, -42, 1234, -5678, 1234567, 999.6, -0.4, null, NaN, Infinity]) {
    assert.equal(M.value(n), dxUsdOrig(n), 'écart sur ' + n);
  }
  assert.equal(M.value(1234, { sign: false }), dxUsdOrig(1234, false));
  assert.equal(M.symbol(), '$');
  assert.equal(M.format(1234), dxUsdOrig(1234) + ' $');
  assert.equal(M.effective(), 'USD');
});

test('fail-safe : EUR demandé SANS taux valide → USD forcé', () => {
  // À ce stade aucun setRate() n'a été appelé → state.rate reste null.
  M.setCurrency('EUR');
  assert.equal(M.effective(), 'USD');                       // pas de taux → USD
  assert.equal(M.value(1000), dxUsdOrig(1000));             // valeur NON convertie
  assert.equal(M.symbol(), '$');
  M.setCurrency('USD');
});

test('EUR : conversion par le taux + symbole €', () => {
  M.setRate(0.9);              // 1 USD = 0,90 EUR
  M.setCurrency('EUR');
  assert.equal(M.effective(), 'EUR');
  assert.equal(M.convert(1000), 900);
  assert.equal(M.value(1000), '+' + (900).toLocaleString('fr-FR'));
  assert.equal(M.symbol(), '€');
  assert.equal(M.format(1000), '+' + (900).toLocaleString('fr-FR') + ' €');
  // Retour USD → montant d'origine, symbole $.
  M.setCurrency('USD');
  assert.equal(M.value(1000), dxUsdOrig(1000));
  assert.equal(M.symbol(), '$');
});

test('setRate ignore les taux invalides (0, négatif, NaN)', () => {
  const before = M.getState().rate;
  M.setRate(0); M.setRate(-1); M.setRate(NaN);
  assert.equal(M.getState().rate, before);   // inchangé
});
