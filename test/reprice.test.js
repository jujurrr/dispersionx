// Fonctions PURES de la reprise mark-to-market (pas d'appel réseau) :
// facteur de straddle ATM, IV d'entrée implicite, DTE restant, et P&L par jambe
// via un marché injecté (getMarket mocké).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { straddleFactor, impliedEntryIv, remainingDte, repriceStrategy, compactSnapshots, BRENNER } from '../api/_lib/reprice.js';

test('straddleFactor : produit spot × IV × √temps quand couvert', () => {
  // spot +10 %, IV ×1.2, temps inchangé → 1.1 × 1.2 = 1.32
  const f = straddleFactor({ spotNow: 110, spotEntry: 100, ivNow: 24, ivEntry: 20, dteNow: 30, dteEntry: 30, covered: true });
  assert.ok(Math.abs(f - 1.32) < 1e-9);
});

test('straddleFactor : non couvert → seulement la décroissance temporelle (√T)', () => {
  // moitié du temps restant → √(15/30) ≈ 0.7071, indépendant de spot/IV
  const f = straddleFactor({ spotNow: 200, spotEntry: 100, ivNow: 99, ivEntry: 20, dteNow: 15, dteEntry: 30, covered: false });
  assert.ok(Math.abs(f - Math.sqrt(0.5)) < 1e-9);
});

test('impliedEntryIv : inverse de Brenner (P ≈ 0.8·S·σ·√T·100·qty)', () => {
  const S = 5000, ivPct = 20, dteYears = 30 / 365, qty = 1;
  const prem = BRENNER * S * (ivPct / 100) * Math.sqrt(dteYears) * 100 * qty;
  const iv = impliedEntryIv(prem, S, dteYears, qty);
  assert.ok(Math.abs(iv - ivPct) < 1e-6);
});

test('remainingDte : repli durée − jours écoulés sans échéance', () => {
  const built = new Date(Date.now() - 10 * 86400000).toISOString();
  assert.equal(remainingDte({ duration: 30, builtAt: built }), 20);
});

test('compactSnapshots : tout le jour courant + 1 clôture par jour antérieur', () => {
  const now = Date.parse('2026-07-07T20:00:00Z');
  const snaps = [
    { taken_at: '2026-07-05T14:00:00Z', total_pnl: 1 },
    { taken_at: '2026-07-05T20:00:00Z', total_pnl: 2 },   // clôture 05 → conservée
    { taken_at: '2026-07-06T15:00:00Z', total_pnl: 3 },
    { taken_at: '2026-07-06T21:00:00Z', total_pnl: 4 },   // clôture 06 → conservée
    { taken_at: '2026-07-07T13:00:00Z', total_pnl: 5 },   // aujourd'hui → tout gardé
    { taken_at: '2026-07-07T13:15:00Z', total_pnl: 6 },
    { taken_at: '2026-07-07T13:30:00Z', total_pnl: 7 },
  ];
  const out = compactSnapshots(snaps, now);
  assert.deepEqual(out.map(s => s.total_pnl), [2, 4, 5, 6, 7]);
});

test('compactSnapshots : plafonne les points intraday du jour', () => {
  const now = Date.parse('2026-07-07T20:00:00Z');
  const snaps = Array.from({ length: 50 }, (_, i) => ({ taken_at: `2026-07-07T${String(6 + Math.floor(i / 4)).padStart(2, '0')}:${String((i % 4) * 15).padStart(2, '0')}:00Z`, total_pnl: i }));
  const out = compactSnapshots(snaps, now, 40);
  assert.equal(out.length, 40);
  assert.equal(out[out.length - 1].total_pnl, 49);   // garde les plus récents
});

test('repriceStrategy : P&L signé par jambe + couverture partielle', async () => {
  const strategy = {
    index: 'SPX', indexPrice: 5000, nIndex: 1, duration: 30,
    builtAt: new Date().toISOString(),
    portfolio: { idxPrem: 20000, idxIV: 20, netVega: -50, netTheta: 100 },
    components: [
      { ticker: 'AAPL', price: 200, iv: 30, premium: 6000, nContracts: 3 },
      { ticker: 'MSFT', price: 400, iv: 25, premium: 4000, nContracts: 2 },
    ],
  };
  // Marché mocké : SPX via proxy SPY (×10) IV 20→22 ; AAPL IV 30→33 ; MSFT indisponible.
  const market = {
    SPY:  { spot: 500, iv: 22 },   // 500 × 10 = 5000 (spot inchangé), IV +2 pts
    AAPL: { spot: 200, iv: 33 },
  };
  const getMarket = async (sym) => market[sym] || null;

  const v = await repriceStrategy(strategy, getMarket);

  const idx = v.legs.find(l => l.role === 'index');
  const aapl = v.legs.find(l => l.symbol === 'AAPL');
  const msft = v.legs.find(l => l.symbol === 'MSFT');

  // Indice SHORT : IV monte (20→22, ×1.1) → prime 22000 → P&L = −(22000−20000) = −2000
  assert.ok(idx.covered);
  assert.ok(Math.abs(idx.pnl - (-2000)) < 1);
  // AAPL LONG : IV monte (30→33, ×1.1) → prime 6600 → P&L = +600
  assert.ok(aapl.covered);
  assert.ok(Math.abs(aapl.pnl - 600) < 1);
  // MSFT non couvert : temps ≈ inchangé → P&L ≈ 0, marqué non couvert
  assert.equal(msft.covered, false);
  assert.ok(Math.abs(msft.pnl) < 1);

  assert.equal(v.coverage.priced, 2);
  assert.equal(v.coverage.total, 3);
  assert.ok(Math.abs(v.total_pnl - (-1400)) < 2);
});
