// Générateur CSV IBKR (Risk Navigator / What-If) — window.DXIbkr.
// Le fichier client s'enregistre sur window : on pointe window → globalThis.
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
await import('../js/lib/ibkr-export.js');
const DX = globalThis.DXIbkr;

const STRAT = {
  index: 'SPX', indexEtf: 'SPY', indexPrice: 598.4,
  expiry: '2026-08-21', duration: 44, nIndex: 2,
  deltaHedge: 'legs', hedgeUnits: 0.37,
  components: [
    { ticker: 'AAPL',   price: 192.3, nContracts: 3, hedgeShares: -140 },
    { ticker: 'MSFT',   price: 431.7, nContracts: 2, hedgeShares: 88 },
    { ticker: 'SAP.DE', price: 178.2, nContracts: 1, hedgeShares: -25 },
  ],
};

test('en-têtes exactement conformes à IBKR', () => {
  assert.deepEqual(DX.HEADER, ['Action', 'Quantity', 'Symbol', 'SecType', 'LastTradingDayOrContractMonth', 'Strike', 'Right', 'Exchange', 'Currency']);
});

test('strike ATM sur la grille STANDARD OCC (2,5 / 5 / 10)', () => {
  assert.equal(DX.roundStrike(598.4), '600');   // ≥200 → pas de 10
  assert.equal(DX.roundStrike(192.3), '190');   // 25–200 → pas de 5
  assert.equal(DX.roundStrike(431.7), '430');   // ≥200 → pas de 10
  assert.equal(DX.roundStrike(47.2), '45');     // 25–200 → pas de 5 (plus de pas de 1 !)
  assert.equal(DX.roundStrike(57.9), '60');     // ex-FITB « 58 » → 60 (strike réellement coté)
  assert.equal(DX.roundStrike(12.4), '12.5');   // <25 → pas de 2,5
  assert.equal(DX.roundStrike(22.4), '22.5');   // demi-strike coté
});

test('échéance CSV = celle de la stratégie (cohérence stricte avec le reste du site)', () => {
  // L'échéance stockée est reprise TELLE QUELLE dans le CSV — jamais re-calculée
  // ni re-snappée : le site (affichage, DTE, reprise) et le CSV coïncident.
  assert.equal(DX.exportExp8({ expiry: '2026-08-21' }), '20260821');
  assert.equal(DX.exportExp8({ expiry: '2026-09-04' }), '20260904');   // reprise à l'identique
  const rows = DX.buildRows({ ...STRAT, expiry: '2026-09-04' });
  rows.filter(r => r.SecType === 'OPT').forEach(r => assert.equal(r.LastTradingDayOrContractMonth, '20260904'));
  // Repli mensuel UNIQUEMENT sans échéance stockée (durée seule) — et c'est un vendredi.
  const e = DX.exportExp8({ duration: 30 });
  const d = new Date(`${e.slice(0, 4)}-${e.slice(4, 6)}-${e.slice(6, 8)}T00:00:00Z`);
  assert.equal(d.getUTCDay(), 5);
});

test('monthlyExp8 (repli durée) : 3ᵉ vendredi mensuel le plus proche', () => {
  assert.equal(DX.monthlyExp8({ expiry: '2026-08-21' }), '20260821');   // déjà un 3ᵉ vendredi
  assert.equal(DX.monthlyExp8({ expiry: '2026-08-14' }), '20260821');   // weekly → mensuelle voisine
});

test('validation chaîne réelle : échéance COMMUNE unique + strikes réels (repli standard sinon)', () => {
  // Échéance commune imposée = date sélectionnée → toutes les jambes s'alignent.
  const resolved = { targetExp8: '20260821', selectedExp8: '20260821', bySymbol: {
    SPY:  { expiry: '20260821', strike: 600 },
    AAPL: { expiry: '20260821', strike: 195 },
    // MSFT + SAP absents → strike standard, MAIS même échéance commune
  } };
  const rows = DX.buildRows(STRAT, resolved);
  // TOUTES les jambes d'options partagent l'échéance commune.
  rows.filter(r => r.SecType === 'OPT').forEach(r => assert.equal(r.LastTradingDayOrContractMonth, '20260821'));
  rows.filter(r => r.Symbol === 'SPY'  && r.SecType === 'OPT').forEach(r => assert.equal(r.Strike, '600'));
  rows.filter(r => r.Symbol === 'AAPL' && r.SecType === 'OPT').forEach(r => assert.equal(r.Strike, '195'));   // strike réel
  rows.filter(r => r.Symbol === 'MSFT' && r.SecType === 'OPT').forEach(r => assert.equal(r.Strike, '430'));   // repli standard
  const sum = DX.summary(STRAT, resolved);
  assert.equal(sum.optionSymbols, 4);   // SPY, AAPL, MSFT, SAP
  assert.equal(sum.validated, 2);       // SPY + AAPL
  assert.equal(sum.approximated, 2);
  assert.equal(sum.expiryAdjusted, false);   // date commune == date sélectionnée
});

test('échéance commune ajustée signalée quand ≠ date sélectionnée', () => {
  // La date sélectionnée (20260807) n'est pas cotée par tous → commune = 20260821.
  const resolved = { targetExp8: '20260821', selectedExp8: '20260807', bySymbol: {
    SPY:  { expiry: '20260821', strike: 600 },
    AAPL: { expiry: '20260821', strike: 190 },
  } };
  const rows = DX.buildRows(STRAT, resolved);
  rows.filter(r => r.SecType === 'OPT').forEach(r => assert.equal(r.LastTradingDayOrContractMonth, '20260821'));
  const sum = DX.summary(STRAT, resolved);
  assert.equal(sum.usedExp8, '20260821');
  assert.equal(sum.selectedExp8, '20260807');
  assert.equal(sum.expiryAdjusted, true);
});

test('suffixe → devise + symbole IBKR de base', () => {
  assert.deepEqual(DX.symMeta('AAPL'), { symbol: 'AAPL', currency: 'USD' });
  assert.deepEqual(DX.symMeta('SAP.DE'), { symbol: 'SAP', currency: 'EUR' });
  assert.deepEqual(DX.symMeta('MC.PA'), { symbol: 'MC', currency: 'EUR' });
});

test('jambe indice = SHORT straddle (call + put) sur l\'ETF', () => {
  const rows = DX.buildRows(STRAT);
  const idx = rows.filter(r => r.Symbol === 'SPY' && r.SecType === 'OPT');
  assert.equal(idx.length, 2);
  idx.forEach(r => {
    assert.equal(r.Action, 'SELL');
    assert.equal(r.Quantity, 2);
    assert.equal(r.LastTradingDayOrContractMonth, '20260821');
    assert.equal(r.Strike, '600');
    assert.equal(r.Currency, 'USD');
  });
  assert.deepEqual(idx.map(r => r.Right).sort(), ['Call', 'Put']);
});

test('composants = LONG straddle chacun, devise selon le marché', () => {
  const rows = DX.buildRows(STRAT);
  const aapl = rows.filter(r => r.Symbol === 'AAPL' && r.SecType === 'OPT');
  assert.equal(aapl.length, 2);
  aapl.forEach(r => { assert.equal(r.Action, 'BUY'); assert.equal(r.Quantity, 3); assert.equal(r.Strike, '190'); assert.equal(r.Currency, 'USD'); });
  const sap = rows.filter(r => r.Symbol === 'SAP' && r.SecType === 'OPT');
  assert.equal(sap.length, 2);
  sap.forEach(r => { assert.equal(r.Currency, 'EUR'); assert.equal(r.Strike, '180'); });
});

test('couverture par jambe = actions (sens correct) + jambe indice', () => {
  const rows = DX.buildRows(STRAT);
  const stk = rows.filter(r => r.SecType === 'STK');
  // 3 composants couverts + 1 jambe indice
  assert.equal(stk.length, 4);
  const aapl = stk.find(r => r.Symbol === 'AAPL');
  assert.equal(aapl.Action, 'SELL'); assert.equal(aapl.Quantity, 140);
  assert.equal(aapl.Strike, ''); assert.equal(aapl.Right, ''); assert.equal(aapl.LastTradingDayOrContractMonth, '');
  const msft = stk.find(r => r.Symbol === 'MSFT');
  assert.equal(msft.Action, 'BUY'); assert.equal(msft.Quantity, 88);
  const sap = stk.find(r => r.Symbol === 'SAP');
  assert.equal(sap.Action, 'SELL'); assert.equal(sap.Quantity, 25); assert.equal(sap.Currency, 'EUR');
  const spy = stk.find(r => r.Symbol === 'SPY');   // jambe indice : 0.37 lot → 37 actions, achat
  assert.equal(spy.Action, 'BUY'); assert.equal(spy.Quantity, 37);
});

test('deltaHedge=none → aucune ligne d\'actions', () => {
  const rows = DX.buildRows({ ...STRAT, deltaHedge: 'none' });
  assert.equal(rows.filter(r => r.SecType === 'STK').length, 0);
});

test('deltaHedge=index → une seule ligne d\'actions ETF (hedge global)', () => {
  const rows = DX.buildRows({ ...STRAT, deltaHedge: 'index', hedgeUnits: -1.5 });
  const stk = rows.filter(r => r.SecType === 'STK');
  assert.equal(stk.length, 1);
  assert.equal(stk[0].Symbol, 'SPY'); assert.equal(stk[0].Action, 'SELL'); assert.equal(stk[0].Quantity, 150);
});

test('résumé cohérent (options, contrats, actions)', () => {
  const s = DX.summary(STRAT);
  assert.equal(s.optionLegs, 8);          // 2 indice + 3×2 composants
  assert.equal(s.contracts, 16);          // 2+2 + 3+3 + 2+2 + 1+1
  assert.equal(s.stockLegs, 4);
  assert.equal(s.hedged, true);
  assert.equal(s.foreign, true);          // SAP.DE en EUR
});

test('CSV : en-tête en 1re ligne, CRLF, STK avec cellules vides', () => {
  const csv = DX.toCsv(STRAT);
  const lines = csv.split('\r\n');
  assert.equal(lines[0], 'Action,Quantity,Symbol,SecType,LastTradingDayOrContractMonth,Strike,Right,Exchange,Currency');
  assert.ok(csv.includes('SELL,140,AAPL,STK,,,,SMART,USD'));
  assert.ok(csv.includes('SELL,2,SPY,OPT,20260821,600,Call,SMART,USD'));
});
