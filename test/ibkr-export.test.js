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

test('strike ATM arrondi à l\'incrément coté', () => {
  assert.equal(DX.roundStrike(598.4), '600');   // ≥500 → pas de 10
  assert.equal(DX.roundStrike(192.3), '190');   // 100–500 → pas de 5
  assert.equal(DX.roundStrike(431.7), '430');
  assert.equal(DX.roundStrike(47.2), '47');     // 25–100 → pas de 1
  assert.equal(DX.roundStrike(12.4), '12.5');   // <25 → pas de 0,5
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
