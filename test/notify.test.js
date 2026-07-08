// Décisions de notifications « intelligentes » — fonctions pures.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { grossPremium, deltaDriftNotif, pnlNotif, subscriptionNotif, correlationNotif } from '../api/_lib/notify.js';

const strat = { portfolio: { idxPrem: 10000 }, components: [{ premium: 4000 }, { premium: 6000 }] };
const pos = { id: 'p1', name: 'Tech NDX', strategy: strat };   // prime brute = 20000

test('grossPremium : somme des primes de straddle', () => {
  assert.equal(grossPremium(strat), 20000);
  assert.equal(grossPremium(null), 0);
});

test('deltaDriftNotif : déclenche au-delà du seuil (fraction de prime)', () => {
  // seuil = max(150, 0.15*20000=3000) = 3000
  assert.equal(deltaDriftNotif(pos, { delta_dollar: { current: 2000 } }), null, 'sous le seuil → rien');
  const n = deltaDriftNotif(pos, { delta_dollar: { current: 4200 } });
  assert.ok(n && n.kind === 'greek_drift' && n.tone === 'warn');
  assert.match(n.body, /haussier/);
  assert.equal(n.ref, 'pos:p1:delta');
  const nb = deltaDriftNotif(pos, { delta_dollar: { current: -5000 } });
  assert.match(nb.body, /baissier/);
});

test('deltaDriftNotif : plancher absolu quand la prime est faible', () => {
  const small = { id: 'x', strategy: { portfolio: { idxPrem: 100 }, components: [] } };  // gross=100 → seuil=floor 150
  assert.equal(deltaDriftNotif(small, { delta_dollar: { current: 120 } }), null);
  assert.ok(deltaDriftNotif(small, { delta_dollar: { current: 200 } }));
});

test('pnlNotif : gain et perte notables, signes corrects', () => {
  assert.equal(pnlNotif(pos, { total_pnl: 3000 }), null, '+15% → rien');
  const win = pnlNotif(pos, { total_pnl: 11000 });   // +55%
  assert.ok(win && win.tone === 'pos' && win.ref === 'pos:p1:pnlwin');
  const loss = pnlNotif(pos, { total_pnl: -7000 });  // -35%
  assert.ok(loss && loss.tone === 'neg' && loss.ref === 'pos:p1:pnlloss');
});

test('subscriptionNotif : paliers 7/3/1 j, ton par urgence', () => {
  // end légèrement SOUS N jours pleins → ceil((end-now)/jour) = N (fenêtre du palier).
  const mk = (days, status) => ({ current_period_end: new Date(Date.now() + days * 86400000 - 3600000).toISOString(), status });
  assert.equal(subscriptionNotif(mk(5)), null, '5 j hors palier → rien');
  assert.equal(subscriptionNotif(mk(7)).tone, 'pos');
  assert.equal(subscriptionNotif(mk(3)).tone, 'warn');
  assert.equal(subscriptionNotif(mk(1)).tone, 'neg');
  assert.equal(subscriptionNotif(mk(-2)), null, 'déjà expiré → rien');
  assert.match(subscriptionNotif(mk(3, 'canceled')).body, /Réactive/);
});

test('correlationNotif : structure + ref par indice', () => {
  const n = correlationNotif({ index: 'NDX', percentile: 84, verdict: 'Élevée' });
  assert.ok(n && n.kind === 'correlation' && n.tone === 'pos' && n.ref === 'corr:NDX');
  assert.equal(correlationNotif({ index: 'NDX' }), null);
});
