// Import des exécutions IBKR — lecture des VRAIS prix payés.
//
// Symétrique de l'export : celui-ci écrit deux lignes par straddle (Call + Put),
// celui-là doit les retrouver et les recoller. Le parsing est la partie fragile
// (formats multiples, virgules dans les champs, exécutions partielles) : il est
// testé sur des extraits fidèles aux fichiers que TWS produit réellement.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const win = {};
new Function('window', readFileSync(new URL('../js/lib/ibkr-import.js', import.meta.url), 'utf8'))(win);
const IMP = win.DXIbkrImport;

// ── Relevé d'activité : fichier à SECTIONS, dates contenant une virgule ──
const ACTIVITY = [
  'Statement,Header,Field Name,Field Value',
  'Statement,Data,BrokerName,Interactive Brokers',
  'Trades,Header,DataDiscriminator,Asset Category,Currency,Symbol,Date/Time,Quantity,T. Price,Comm/Fee',
  'Trades,Data,Order,Equity and Index Options,USD,AAPL 15AUG25 230 C,"2026-07-15, 10:31:22",3,4.25,-2.25',
  'Trades,Data,Order,Equity and Index Options,USD,AAPL 15AUG25 230 P,"2026-07-15, 10:31:24",3,3.75,-2.25',
  'Trades,Data,Order,Equity and Index Options,USD,QQQ 15AUG25 480 C,"2026-07-15, 10:30:02",-2,9.10,-1.50',
  'Trades,Data,Order,Equity and Index Options,USD,QQQ 15AUG25 480 P,"2026-07-15, 10:30:04",-2,8.40,-1.50',
  'Trades,Data,Order,Stocks,USD,QQQ,"2026-07-15, 10:35:00",-120,480.10,-1.00',
].join('\n');

test('relevé d\'activité : les exécutions d\'options sont lues, les actions ignorées', () => {
  const r = IMP.parse(ACTIVITY);
  assert.equal(r.format, 'activity');
  assert.equal(r.legs.length, 4, 'la ligne action ne doit pas être comptée comme une option');
  assert.deepEqual(r.warnings, []);
  const aapl = r.legs.find(l => l.underlying === 'AAPL' && l.right === 'C');
  assert.equal(aapl.price, 4.25);
  assert.equal(aapl.qty, 3);
  assert.equal(aapl.expiry, '2025-08-15');
  assert.equal(aapl.strike, 230);
});

test('la virgule dans « "2026-07-15, 10:31:22" » ne décale pas les colonnes', () => {
  // Un simple split(',') casserait toutes les colonnes suivantes : le prix lu
  // serait celui d'une autre colonne, sans que rien ne le signale.
  const r = IMP.parse(ACTIVITY);
  for (const l of r.legs) {
    assert.ok(l.price > 0 && l.price < 100, `prix aberrant ${l.price} — colonnes décalées`);
    assert.ok(Math.abs(l.qty) <= 10);
  }
});

test('les straddles sont recollés à partir des deux jambes', () => {
  const s = IMP.toStraddles(IMP.parse(ACTIVITY).legs);
  assert.equal(s.AAPL.complete, true);
  assert.equal(s.AAPL.price, 8, 'prix du straddle = call + put (4,25 + 3,75)');
  assert.equal(s.AAPL.qty, 3);
  assert.equal(s.AAPL.comm, 4.5, 'commissions cumulées, en valeur absolue');
  assert.equal(s.QQQ.price, 17.5, 'la jambe vendue se recolle aussi (9,10 + 8,40)');
  assert.equal(s.QQQ.qty, 2, 'quantité en valeur absolue, le sens vient de la stratégie');
});

test('exécutions PARTIELLES : moyenne pondérée par la quantité', () => {
  // Deux fills sur le call à des prix différents. Une moyenne simple donnerait
  // 4,50 ; la bonne réponse est 4,75 (1×4 + 3×5)/4.
  const partial = [
    'Trades,Header,DataDiscriminator,Asset Category,Currency,Symbol,Date/Time,Quantity,T. Price,Comm/Fee',
    'Trades,Data,Order,Equity and Index Options,USD,MSFT 15AUG25 400 C,"2026-07-15, 10:00:00",1,4.00,-1.00',
    'Trades,Data,Order,Equity and Index Options,USD,MSFT 15AUG25 400 C,"2026-07-15, 10:05:00",3,5.00,-1.00',
    'Trades,Data,Order,Equity and Index Options,USD,MSFT 15AUG25 400 P,"2026-07-15, 10:05:01",4,3.00,-1.00',
  ].join('\n');
  const s = IMP.toStraddles(IMP.parse(partial).legs);
  assert.equal(s.MSFT.callPrice, 4.75);
  assert.equal(s.MSFT.price, 7.75);
  assert.equal(s.MSFT.qty, 4);
});

test('une jambe manquante ne produit PAS un demi-straddle', () => {
  // Call seul : livrer un « prix de straddle » serait faux de moitié.
  const half = [
    'Trades,Header,DataDiscriminator,Asset Category,Currency,Symbol,Date/Time,Quantity,T. Price,Comm/Fee',
    'Trades,Data,Order,Equity and Index Options,USD,NVDA 15AUG25 120 C,"2026-07-15, 10:00:00",2,6.00,-1.00',
  ].join('\n');
  const s = IMP.toStraddles(IMP.parse(half).legs);
  assert.equal(s.NVDA.complete, false);
  assert.equal(s.NVDA.price, null, 'aucun prix de straddle sans les deux jambes');
});

test('quantités call/put déséquilibrées : signalées', () => {
  const unb = [
    'Trades,Header,DataDiscriminator,Asset Category,Currency,Symbol,Date/Time,Quantity,T. Price,Comm/Fee',
    'Trades,Data,Order,Equity and Index Options,USD,AMD 15AUG25 150 C,"2026-07-15, 10:00:00",3,2.00,-1.00',
    'Trades,Data,Order,Equity and Index Options,USD,AMD 15AUG25 150 P,"2026-07-15, 10:00:01",2,1.50,-1.00',
  ].join('\n');
  const s = IMP.toStraddles(IMP.parse(unb).legs);
  assert.equal(s.AMD.unbalanced, true);
  assert.equal(s.AMD.qty, 2, 'on retient la quantité réellement appariée');
});

test('Flex Query : colonnes nommées, actions ignorées', () => {
  const flex = [
    'Symbol,UnderlyingSymbol,Expiry,Strike,Put/Call,Quantity,TradePrice,IBCommission',
    'AAPL  250815C00230000,AAPL,20250815,230,C,3,4.25,-2.25',
    'AAPL  250815P00230000,AAPL,20250815,230,P,3,3.75,-2.25',
    'SPY,SPY,,,,,100,480.10,-1.00',
  ].join('\n');
  const r = IMP.parse(flex);
  assert.equal(r.format, 'flex');
  assert.equal(r.legs.length, 2);
  const s = IMP.toStraddles(r.legs);
  assert.equal(s.AAPL.price, 8);
});

test('format OCC reconnu', () => {
  const m = IMP.parseOptionSymbol('AAPL  250815C00230000');
  assert.equal(m.underlying, 'AAPL');
  assert.equal(m.right, 'C');
  assert.equal(m.strike, 230);
  assert.equal(m.expiry, '2025-08-15');
});

test('un symbole non reconnu est SIGNALÉ, jamais deviné', () => {
  const weird = [
    'Trades,Header,DataDiscriminator,Asset Category,Currency,Symbol,Date/Time,Quantity,T. Price,Comm/Fee',
    'Trades,Data,Order,Equity and Index Options,USD,???BIZARRE???,"2026-07-15, 10:00:00",1,1.00,0',
  ].join('\n');
  const r = IMP.parse(weird);
  assert.equal(r.legs.length, 0);
  assert.match(r.warnings.join(' '), /non reconnu/);
});

test('fichier hors sujet : message clair, aucun plantage', () => {
  const r = IMP.parse('nom,prenom\nDupont,Jean');
  assert.equal(r.legs.length, 0);
  assert.ok(r.warnings.length, "l'utilisateur doit savoir pourquoi rien n'a été lu");
});

test('rapprochement avec la stratégie : payé vs prévu, jambe par jambe', () => {
  const strategy = {
    index: 'NDX', indexEtf: 'QQQ', nIndex: 2,
    components: [{ ticker: 'AAPL', nContracts: 3, premium: 2200 }, { ticker: 'ABSENT', nContracts: 1, premium: 500 }],
    portfolio: { idxPrem: 3400 },
  };
  const s = IMP.toStraddles(IMP.parse(ACTIVITY).legs);
  const { rows, unmatched } = IMP.matchStrategy(s, strategy, 100);

  const aapl = rows.find(r => r.ticker === 'AAPL');
  assert.equal(aapl.matched, true);
  // Jambe ACHETÉE : 8,00 × 3 × 100 + 4,50 de commissions = 2 404,50 payés contre 2 200 prévus.
  assert.equal(aapl.realTotal, 2404.5);
  assert.equal(Math.round(aapl.ecart * 100) / 100, 204.5, "payé de plus que prévu → écart positif");

  // Jambe VENDUE : on encaisse 17,50 × 2 × 100 = 3 500, MOINS 3 $ de commissions
  // = 3 497 reçus contre 3 400 prévus → on a encaissé PLUS, donc écart FAVORABLE.
  const qqq = rows.find(r => r.ticker === 'QQQ');
  assert.equal(qqq.side, 'sell');
  assert.equal(qqq.realTotal, 3497);
  assert.equal(qqq.ecart, -97, 'encaissé plus que prévu → écart négatif (favorable)');

  const abs = rows.find(r => r.ticker === 'ABSENT');
  assert.equal(abs.matched, false, 'une jambe sans exécution est signalée, pas inventée');
  assert.deepEqual(unmatched, [], 'toutes les exécutions du fichier ont trouvé leur jambe');
});

test('exécutions du fichier sans jambe correspondante : remontées', () => {
  const strategy = { index: 'NDX', indexEtf: 'QQQ', nIndex: 1, components: [], portfolio: {} };
  const s = IMP.toStraddles(IMP.parse(ACTIVITY).legs);
  const { unmatched } = IMP.matchStrategy(s, strategy, 100);
  assert.deepEqual(unmatched, ['AAPL'], "on ne fait pas disparaître une exécution qu'on n'a pas su rattacher");
});
