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
  assert.equal(r.format, 'flat');
  assert.equal(r.legs.length, 2);
  const s = IMP.toStraddles(r.legs);
  assert.equal(s.AAPL.price, 8);
});

test('en-têtes OFFICIELS avec espaces (« Underlying Symbol », « Trade Price »)', () => {
  // La doc IBKR est explicite : « les noms varient ». Le Flex Query exporte
  // « Underlying Symbol » / « Trade Price » / « IB Commission » AVEC espaces —
  // chercher « UnderlyingSymbol » sans espace échouait sur les vrais fichiers.
  const officiel = [
    'Symbol,Underlying Symbol,Expiry,Strike,Put/Call,Quantity,Trade Price,IB Commission,Asset Class,Buy/Sell',
    'AAPL 250815C00230000,AAPL,20250815,230,C,3,4.25,-2.25,OPT,BUY',
    'AAPL 250815P00230000,AAPL,20250815,230,P,3,3.75,-2.25,OPT,BUY',
    'SPY,SPY,,,,100,480.10,-1.00,STK,BUY',
  ].join('\n');
  const r = IMP.parse(officiel);
  assert.equal(r.legs.length, 2, 'les deux jambes doivent être lues');
  const s = IMP.toStraddles(r.legs);
  assert.equal(s.AAPL.price, 8);
  assert.equal(s.AAPL.comm, 4.5);
});

test("un rapport contenant l'ALLER-RETOUR garde le prix d'ENTRÉE", () => {
  // Piège majeur : si le fichier couvre aussi la clôture, tout agréger donnerait
  // une moyenne entre le prix d'entrée et celui de sortie — ni l'un ni l'autre.
  const roundTrip = [
    'Symbol,Underlying Symbol,Put/Call,Quantity,Trade Price,IB Commission,Asset Class,Buy/Sell',
    'AAPL,AAPL,C,3,4.25,-2.25,OPT,BUY',      // ouverture (achat)
    'AAPL,AAPL,P,3,3.75,-2.25,OPT,BUY',
    'AAPL,AAPL,C,-3,9.00,-2.25,OPT,SELL',    // clôture (vente, bien plus cher)
    'AAPL,AAPL,P,-3,1.00,-2.25,OPT,SELL',
  ].join('\n');
  const s = IMP.toStraddles(IMP.parse(roundTrip).legs);
  assert.equal(s.AAPL.roundTrip, true, "l'aller-retour est détecté");
  assert.equal(s.AAPL.buy.price, 8, "prix d'ouverture isolé");
  assert.equal(s.AAPL.sell.price, 10, 'prix de clôture isolé');

  // Le rapprochement doit retenir le sens de la JAMBE : un composant est acheté.
  const strategy = { index: 'NDX', indexEtf: 'QQQ', nIndex: 1,
    components: [{ ticker: 'AAPL', nContracts: 3, premium: 2200 }], portfolio: { idxPrem: 1000 } };
  const row = IMP.matchStrategy(s, strategy, 100).rows.find(r => r.ticker === 'AAPL');
  assert.equal(row.realPrice, 8, "c'est le prix d'ENTRÉE qui compte, pas la moyenne des deux");
});

test('la jambe indice retient bien le sens VENDU', () => {
  const mixed = [
    'Symbol,Underlying Symbol,Put/Call,Quantity,Trade Price,IB Commission,Asset Class,Buy/Sell',
    'QQQ,QQQ,C,-2,9.10,-1.50,OPT,SELL',      // ouverture de la jambe indice
    'QQQ,QQQ,P,-2,8.40,-1.50,OPT,SELL',
    'QQQ,QQQ,C,2,3.00,-1.50,OPT,BUY',        // rachat de clôture
    'QQQ,QQQ,P,2,2.00,-1.50,OPT,BUY',
  ].join('\n');
  const s = IMP.toStraddles(IMP.parse(mixed).legs);
  const strategy = { index: 'NDX', indexEtf: 'QQQ', nIndex: 2, components: [], portfolio: { idxPrem: 3400 } };
  const row = IMP.matchStrategy(s, strategy, 100).rows.find(r => r.ticker === 'QQQ');
  assert.equal(row.realPrice, 17.5, 'le prix retenu est celui de la VENTE initiale');
});

test('export du Trade Log TWS : ses propres noms de colonnes', () => {
  // Le Trade Log nomme autrement : Underlying / Price / Action / Commission /
  // Type / Right. Trois exports IBKR, trois vocabulaires pour la même donnée.
  const tradeLog = [
    'Date,Time,Underlying,Symbol,Right,Strike,Expiry,Quantity,Price,Action,Commission,Type',
    '2026-07-15,10:31:22,AAPL,AAPL 250815C00230000,C,230,20250815,3,4.25,BOT,2.25,OPT',
    '2026-07-15,10:31:24,AAPL,AAPL 250815P00230000,P,230,20250815,3,3.75,BOT,2.25,OPT',
  ].join('\n');
  const r = IMP.parse(tradeLog);
  assert.equal(r.legs.length, 2);
  assert.equal(IMP.toStraddles(r.legs).AAPL.price, 8);
});

test('séparateur AUTRE que la virgule (le Trade Log le laisse configurer)', () => {
  // L'export du Trade Log est un .txt dont le séparateur est réglable. Imposer
  // la virgule aurait fait échouer l'import sans rien expliquer.
  const semi = [
    'Underlying;Right;Quantity;Price;Action;Commission;Type',
    'AAPL;C;3;4.25;BOT;2.25;OPT',
    'AAPL;P;3;3.75;BOT;2.25;OPT',
  ].join('\n');
  const r = IMP.parse(semi);
  assert.equal(r.delim, ';', 'le séparateur doit être détecté');
  assert.equal(IMP.toStraddles(r.legs).AAPL.price, 8);

  const tab = semi.replace(/;/g, '\t');
  const rt = IMP.parse(tab);
  assert.equal(rt.delim, '\t');
  assert.equal(IMP.toStraddles(rt.legs).AAPL.price, 8);
});

test('« BOT » / « SLD » sont compris comme achat / vente', () => {
  // Le Trade Log écrit BOT et SLD, là où le Flex Query écrit BUY et SELL.
  const log = [
    'Underlying,Right,Quantity,Price,Action,Commission,Type',
    'QQQ,C,2,9.10,SLD,1.50,OPT',
    'QQQ,P,2,8.40,SLD,1.50,OPT',
  ].join('\n');
  const s = IMP.toStraddles(IMP.parse(log).legs);
  assert.equal(s.QQQ.sell.complete, true, 'les deux jambes doivent être classées en VENTE');
  assert.equal(s.QQQ.sell.price, 17.5);
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

// ── Risk Navigator : le SEUL export disponible en What-If ───────────────────
// En What-If aucun ordre n'est passé, donc aucune transaction n'existe. Le
// rapport de risque est alors la seule façon de faire revenir les chiffres
// d'IBKR : positions valorisées au marché + grecs. Il ne mesure PAS un coût
// d'exécution — il permet de confronter nos maths à celles d'un outil pro.
const RISKNAV = [
  'Financial Instrument,Position,Price,Delta,Gamma,Vega,Theta',
  'AAPL 15AUG25 230 C,3,4.25,0.52,0.021,14.2,-3.1',
  'AAPL 15AUG25 230 P,3,3.75,-0.48,0.021,14.0,-3.0',
  'QQQ 15AUG25 480 C,-2,9.10,-0.51,-0.008,-31.0,6.2',
  'QQQ 15AUG25 480 P,-2,8.40,0.49,-0.008,-30.5,6.0',
  'AAPL,0,230.00,,,,',
].join('\n');

test('Risk Navigator : reconnu comme rapport de RISQUE, pas comme exécutions', () => {
  const r = IMP.parse(RISKNAV);
  assert.equal(r.kind, 'risk', "la présence des grecs distingue les deux natures de fichier");
  assert.equal(r.legs.length, 4, 'la ligne de sous-total du sous-jacent est ignorée');
});

test('Risk Navigator : les grecs du straddle sont la SOMME des deux jambes', () => {
  const s = IMP.toStraddles(IMP.parse(RISKNAV).legs);
  assert.equal(s.AAPL.price, 8, 'prix de marché du straddle');
  assert.equal(Math.round(s.AAPL.greeks.vega * 10) / 10, 28.2, 'vega call + put');
  // Delta d'un straddle ATM ≈ 0 : call +0,52 et put −0,48.
  assert.equal(Math.round(s.AAPL.greeks.delta * 100) / 100, 0.04);
  assert.equal(s.QQQ.sell.complete, true, 'la jambe vendue est classée en vente (position négative)');
});

test('Risk Navigator : nos grecs sont confrontés aux leurs', () => {
  const strategy = {
    index: 'NDX', indexEtf: 'QQQ', nIndex: 2,
    components: [{ ticker: 'AAPL', nContracts: 3, premium: 2200, vega: 2820, theta: -610, gamma: 4200 }],
    portfolio: { idxPrem: 3400, idxVega: 6150, idxTheta: 1220, idxGamma: 1600 },
  };
  const s = IMP.toStraddles(IMP.parse(RISKNAV).legs);
  const row = IMP.matchStrategy(s, strategy, 100).rows.find(r => r.ticker === 'AAPL');
  assert.ok(row.greeks, "les grecs d'IBKR sont remontés");
  assert.ok(row.plan, 'les nôtres aussi, pour comparaison');
  assert.equal(row.plan.vega, 2820);
  // Le RAPPORT est ce qui compte : ~100 ici, donc IBKR publie un vega par action
  // là où nous raisonnons par contrat. C'est l'écart d'échelle qu'on veut voir,
  // pas une conversion supposée qui l'aurait masqué.
  assert.equal(Math.round(row.plan.vega / row.greeks.vega), 100);
});

test("en-tête PRÉCÉDÉ d'un préambule (cas Risk Navigator)", () => {
  // Un export Risk Navigator commence souvent par un titre, une date, un nom de
  // portefeuille. Supposer que l'en-tête est la ligne 0 faisait échouer l'import
  // alors que les colonnes se trouvaient deux lignes plus bas.
  const withPreamble = [
    'Risk Navigator Report',
    'Portfolio: What-If 1,Date: 2026-07-18',
    '',
    'Financial Instrument,Position,Last,Delta,Gamma,Vega,Theta',
    'AAPL 15AUG25 230 C,3,4.25,0.52,0.021,14.2,-3.1',
    'AAPL 15AUG25 230 P,3,3.75,-0.48,0.021,14.0,-3.0',
  ].join('\n');
  const r = IMP.parse(withPreamble);
  assert.equal(r.legs.length, 2, "l'en-tête doit être trouvé malgré le préambule");
  assert.equal(IMP.toStraddles(r.legs).AAPL.price, 8);
});

test('rapport de risque un WEEK-END : grecs « N/A » mais nature reconnue', () => {
  // Marchés fermés → IBKR ne calcule pas les grecs. Se fier aux VALEURS
  // classerait le fichier comme un relevé d'exécutions, ce qu'il n'est pas.
  const weekend = [
    'Financial Instrument,Position,Last,Delta,Gamma,Vega,Theta',
    'AAPL 15AUG25 230 C,3,4.25,N/A,N/A,N/A,N/A',
    'AAPL 15AUG25 230 P,3,3.75,N/A,N/A,N/A,N/A',
  ].join('\n');
  const r = IMP.parse(weekend);
  assert.equal(r.kind, 'risk', 'la nature se lit sur les COLONNES, pas sur les valeurs');
  assert.equal(r.legs.length, 2, 'les positions restent lisibles');
  assert.equal(IMP.toStraddles(r.legs).AAPL.price, 8);
});

test('un échec RESTITUE les colonnes lues, pour diagnostiquer', () => {
  const inconnu = 'Instrument,Truc,Machin\nAAPL 15AUG25 230 C,1,2';
  const r = IMP.parse(inconnu);
  assert.equal(r.legs.length, 0);
  assert.ok(Array.isArray(r.columns) && r.columns.length, 'les colonnes doivent être remontées');
  assert.match(r.warnings.join(' '), /Colonnes lues/);
});

test('BOM UTF-8 en tête de fichier', () => {
  // Excel et TWS en produisent : le BOM colle au premier nom de colonne et le
  // rend méconnaissable (« ﻿Symbol » ≠ « Symbol »).
  const bom = '﻿' + [
    'Underlying,Right,Quantity,Price,Action,Type',
    'AAPL,C,3,4.25,BOT,OPT',
    'AAPL,P,3,3.75,BOT,OPT',
  ].join('\n');
  assert.equal(IMP.toStraddles(IMP.parse(bom).legs).AAPL.price, 8);
});

// ── Risk Navigator en FRANÇAIS, agrégé par sous-jacent ─────────────────────
// Colonnes réelles remontées par un utilisateur (TWS en français). Trois pièges
// cumulés : en-têtes traduits, accents, et un rapport REPLIÉ par sous-jacent —
// donc sans call/put ni strike, et sans prix unitaire (« Évalué » est un TOTAL).
const RN_FR = [
  'Profondeur de Sous-jacent,Sous-jacent,Position,Évalué,P&L non réalisé,DeltaDollars,VaR,Delta (Δ),Gamma (Γ),Vega (ν),Theta (Θ),Trade',
  '0,AAPL,6,2404.50,0,120,-450,0.04,0.042,28.2,-6.1,',
  '0,QQQ,-4,-3497.00,0,-80,-820,-0.02,-0.016,-61.5,12.2,',
].join('\n');

test('Risk Navigator FR : en-têtes traduits et accentués reconnus', () => {
  const r = IMP.parse(RN_FR);
  assert.equal(r.legs.length, 2, 'les deux sous-jacents doivent être lus');
  assert.equal(r.kind, 'risk');
  assert.deepEqual(r.warnings, [], 'aucun avertissement sur un fichier valide');
});

test("Risk Navigator FR : « Évalué » est une VALEUR totale, pas un prix unitaire", () => {
  // La confondre avec un prix aurait faussé la comparaison d'un facteur qty × 100.
  const s = IMP.toStraddles(IMP.parse(RN_FR).legs);
  assert.equal(s.AAPL.aggregate, true);
  assert.equal(s.AAPL.price, null, 'aucun prix unitaire dans ce rapport');
  assert.equal(s.AAPL.value, 2404.5);

  const strategy = { index: 'NDX', indexEtf: 'QQQ', nIndex: 2,
    components: [{ ticker: 'AAPL', nContracts: 3, premium: 2200, vega: 2820 }],
    portfolio: { idxPrem: 3400, idxVega: 6150 } };
  const row = IMP.matchStrategy(s, strategy, 100).rows.find(r => r.ticker === 'AAPL');
  assert.equal(row.realTotal, 2404.5, 'la valeur est reprise telle quelle');
  assert.equal(Math.round(row.ecart * 10) / 10, 204.5);
});

test('Risk Navigator FR : les grecs remontent pour comparaison', () => {
  const s = IMP.toStraddles(IMP.parse(RN_FR).legs);
  assert.equal(s.AAPL.greeks.vega, 28.2);
  assert.equal(s.QQQ.greeks.vega, -61.5, 'la jambe vendue garde son signe négatif');

  const strategy = { index: 'NDX', indexEtf: 'QQQ', nIndex: 2,
    components: [{ ticker: 'AAPL', nContracts: 3, premium: 2200, vega: 2820 }],
    portfolio: { idxPrem: 3400, idxVega: 6150 } };
  const row = IMP.matchStrategy(s, strategy, 100).rows.find(r => r.ticker === 'AAPL');
  assert.equal(row.greeks.vega, 28.2);
  assert.equal(row.plan.vega, 2820);
});

test('un rapport agrégé N\'EST PAS confondu avec un aller-retour', () => {
  // Position négative = jambe vendue, pas une clôture. Confondre les deux
  // écarterait la jambe indice du rapprochement.
  const s = IMP.toStraddles(IMP.parse(RN_FR).legs);
  assert.equal(s.QQQ.roundTrip, false);
  const strategy = { index: 'NDX', indexEtf: 'QQQ', nIndex: 2, components: [], portfolio: { idxPrem: 3400 } };
  const row = IMP.matchStrategy(s, strategy, 100).rows.find(r => r.ticker === 'QQQ');
  assert.equal(row.matched, true, 'la jambe vendue doit être rapprochée');
  assert.equal(row.realTotal, 3497);
});
