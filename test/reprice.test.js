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
    // indexPrice = prix de l'ETF négociable (SPY), PAS le niveau d'indice.
    index: 'SPX', indexEtf: 'SPY', indexPrice: 500, nIndex: 1, duration: 30,
    builtAt: new Date().toISOString(),
    portfolio: { idxPrem: 20000, idxIV: 20, netVega: -50, netTheta: 100 },
    components: [
      { ticker: 'AAPL', price: 200, iv: 30, premium: 6000, nContracts: 3 },
      { ticker: 'MSFT', price: 400, iv: 25, premium: 4000, nContracts: 2 },
    ],
  };
  // Marché mocké (base ETF, sans mise à l'échelle) : SPY spot inchangé IV 20→22 ;
  // AAPL IV 30→33 ; MSFT indisponible.
  const market = {
    SPY:  { spot: 500, iv: 22 },
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

test('repriceStrategy : gamma net + delta $ couvert + P&L de couverture', async () => {
  const strategy = {
    index: 'SPX', indexEtf: 'SPY', indexPrice: 500, nIndex: 1, duration: 30,
    builtAt: new Date().toISOString(), deltaHedge: 'legs',
    portfolio: { idxPrem: 20000, idxIV: 20, netVega: -50, netTheta: 100, netGamma: 8000, netDeltaRaw: 200, netDelta: 0 },
    components: [{ ticker: 'AAPL', price: 200, iv: 30, premium: 6000, nContracts: 3, hedgeShares: -150 }],
  };
  // SPY inchangé ; AAPL spot +5 % (IV inchangée).
  const getMarket = async (sym) => ({ SPY: { spot: 500, iv: 20 }, AAPL: { spot: 210, iv: 30 } }[sym] || null);
  const v = await repriceStrategy(strategy, getMarket);

  // Gamma net exposé (entrée) + mis à l'échelle (actuel).
  assert.equal(v.greeks.entry.gamma, 8000);
  assert.ok(Math.abs(v.greeks.current.gamma - 8200) < 5, `gamma actuel ~8200, obtenu ${v.greeks.current.gamma}`);
  // Delta marqué couvert.
  assert.equal(v.delta_dollar.hedged, true);
  // AAPL long +5 % → straddle +300 ; couverture short 150 actions → −1500.
  assert.ok(Math.abs(v.straddle_pnl - 300) < 1, `straddle ${v.straddle_pnl}`);
  assert.ok(Math.abs(v.hedge_pnl - (-1500)) < 1, `hedge ${v.hedge_pnl}`);
  assert.ok(Math.abs(v.total_pnl - (-1200)) < 2, `total ${v.total_pnl}`);
});

test('repriceStrategy : gamma null si non stocké (rétro-compat)', async () => {
  const strategy = {
    index: 'SPX', indexEtf: 'SPY', indexPrice: 500, nIndex: 1, duration: 30,
    builtAt: new Date().toISOString(),
    portfolio: { idxPrem: 20000, idxIV: 20, netVega: -50, netTheta: 100 },   // pas de netGamma
    components: [{ ticker: 'AAPL', price: 200, iv: 30, premium: 6000, nContracts: 3 }],
  };
  const getMarket = async (sym) => ({ SPY: { spot: 500, iv: 20 }, AAPL: { spot: 200, iv: 30 } }[sym] || null);
  const v = await repriceStrategy(strategy, getMarket);
  assert.equal(v.greeks.entry.gamma, null);
  assert.equal(v.greeks.current.gamma, null);
  assert.equal(v.hedge_pnl, 0);                 // pas de couverture → 0
  assert.equal(v.total_pnl, v.straddle_pnl);    // total = straddles seuls
});

test('repriceStrategy : jambe indice NON mise à l’échelle proxy (régression)', async () => {
  // Bug historique : le spot ETF (SPY ~550) était multiplié par l’échelle proxy
  // (×10) alors que la prime d’entrée est calculée sur le prix ETF → prime
  // actuelle ×10 et P&L indice de plusieurs centaines de k$. Ici, spot et IV
  // strictement inchangés → le P&L de l’indice doit être ~0 (pas ×10).
  const strategy = {
    index: 'SPX', indexEtf: 'SPY', indexPrice: 550, nIndex: 2, duration: 30,
    builtAt: new Date().toISOString(),
    portfolio: { idxPrem: 60000, idxIV: 18, netVega: 0, netTheta: 0 },
    components: [{ ticker: 'AAPL', price: 200, iv: 30, premium: 6000, nContracts: 1 }],
  };
  const getMarket = async (sym) => ({ SPY: { spot: 550, iv: 18 }, AAPL: { spot: 200, iv: 30 } }[sym] || null);
  const v = await repriceStrategy(strategy, getMarket);
  const idx = v.legs.find(l => l.role === 'index');
  assert.ok(idx.covered);
  assert.ok(Math.abs(idx.pnl) < 1, `P&L indice attendu ~0, obtenu ${idx.pnl}`);
  assert.ok(Math.abs(idx.current_prem - 60000) < 1, `prime actuelle attendue ~60000, obtenue ${idx.current_prem}`);
});
