/* ─── Import IBKR : lire ses VRAIS prix d'exécution ────────────────────────
   Symétrique de ibkr-export.js. L'export écrit deux lignes par straddle (Call +
   Put) ; l'import fait le chemin inverse : il lit un rapport IBKR, retrouve les
   deux jambes de chaque straddle et les recolle en un prix par sous-jacent.

   POURQUOI — tout ce que le site dit d'une position repose aujourd'hui sur une
   prime THÉORIQUE (Black-Scholes au milieu du marché). Le prix réellement payé
   n'existe nulle part. Or la recherche désigne l'exécution comme le seul endroit
   où un particulier peut encore gagner quelque chose : encore faut-il la mesurer.

   ⚠ TOUT SE PASSE DANS LE NAVIGATEUR. Un relevé IBKR contient le numéro de
   compte, les soldes et l'ensemble des positions : il ne doit JAMAIS partir sur
   un serveur. Ce fichier ne fait que du texte → objets, aucun réseau.

   FORMATS ACCEPTÉS (les deux que TWS sait produire) :
   1. Activity Statement (Rapports ▸ Relevés ▸ Activité, CSV) — fichier à
      sections ; on ne lit que la section « Trades », lignes « Data ».
        Trades,Data,Order,Equity and Index Options,USD,AAPL 15AUG25 230 C,"…",3,4.25,…
   2. Flex Query (Trades) — CSV plat avec un en-tête nommé ; colonnes
      UnderlyingSymbol / Put-Call / Quantity / TradePrice / IBCommission.

   Le symbole d'option est écrit de plusieurs façons selon le rapport :
     « AAPL 15AUG25 230 C »        (relevé d'activité)
     « AAPL 250815C00230000 »      (OCC, 21 caractères)
   Les deux sont reconnus. Un format non reconnu est SIGNALÉ, jamais deviné. */
(function () {
  'use strict';

  // ── CSV : découpe une ligne en respectant les guillemets ──────────────────
  // Indispensable : IBKR écrit la date sous la forme "2026-07-15, 10:31:22",
  // virgule comprise. Un simple split(',') casserait toutes les colonnes.
  function splitCsv(line, delim) {
    const D = delim || ',';
    const out = [];
    let cur = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (q && line[i + 1] === '"') { cur += '"'; i++; }   // guillemet échappé
        else q = !q;
      } else if (ch === D && !q) { out.push(cur); cur = ''; }
      else cur += ch;
    }
    out.push(cur);
    return out.map(s => s.trim());
  }

  const MONTHS = { JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6, JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12 };
  const num = v => { const n = parseFloat(String(v ?? '').replace(/[\s,]/g, '')); return isFinite(n) ? n : null; };

  /* ── Colonnes : reconnaissance TOLÉRANTE ─────────────────────────────────
     La documentation IBKR est explicite — « les noms varient ». La même donnée
     s'appelle « Trade Price » dans un Flex Query, « T. Price » dans un relevé
     d'activité, parfois « TradePrice » sans espace selon la version. Chercher un
     libellé exact garantissait l'échec sur la moitié des fichiers réels.
     On normalise donc l'en-tête (minuscules, sans espaces ni ponctuation) et on
     accepte tous les alias connus. */
  // Les accents doivent tomber AVANT le filtrage : « Évalué » deviendrait sinon
  // « valu » (le É et le é ne sont pas dans a-z), et aucun alias ne matcherait.
  // TWS existe en français, en allemand, etc. — les en-têtes sont traduits.
  const norm = h => String(h || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')   // é→e, Δ reste hors a-z et sera filtré
    .toLowerCase().replace(/[^a-z0-9]/g, '');
  // Trois exports IBKR différents nomment les mêmes colonnes de trois façons :
  //   Trade Log (TWS)      : Underlying · Price · Action · Commission · Type · Right
  //   Flex Query (portail) : Underlying Symbol · Trade Price · IB Commission · Asset Class · Put/Call
  //   Relevé d'activité    : Symbol · T. Price · Comm/Fee · Asset Category
  const ALIASES = {
    symbol:     ['symbol', 'description', 'contract', 'financialinstrument', 'instrumentfinancier', 'instrument'],
    underlying: ['underlyingsymbol', 'underlying', 'undsymbol', 'sousjacent', 'profondeurdesousjacent'],
    // Valeur TOTALE de la position (« Évalué » du Risk Navigator), à ne pas
    // confondre avec un prix unitaire : elle vaut déjà quantité × 100 × prix.
    // Les mélanger fausserait la comparaison d'un facteur qty × 100.
    value:      ['value', 'marketvalue', 'positionvalue', 'evalue', 'valeur', 'evaluation', 'mktvalue', 'valeurdemarche'],
    right:      ['putcall', 'right', 'putorcall', 'callput'],
    strike:     ['strike', 'strikeprice'],
    expiry:     ['expiry', 'expirationdate', 'lasttradingdayorcontractmonth', 'maturity', 'lasttradingday'],
    qty:        ['quantity', 'qty', 'shares', 'position', 'pos', 'netposition', 'positionquantity', 'currentposition', 'quantite'],
    // Un rapport de RISQUE n'a pas de « prix de transaction » : il valorise au
    // marché. D'où les alias de marque (Last, Mark, Close…), sans lesquels un
    // export Risk Navigator était rejeté faute de colonne de prix.
    price:      ['tradeprice', 'tprice', 'price', 'execprice', 'fillprice', 'avgprice',
      'last', 'lastprice', 'mark', 'markprice', 'marketprice', 'close', 'midpoint', 'mid', 'averageprice', 'avgcost', 'costbasisprice'],
    comm:       ['ibcommission', 'commfee', 'commission', 'commissions', 'comm'],
    asset:      ['assetclass', 'assetcategory', 'securitytype', 'sectype', 'type'],
    side:       ['buysell', 'side', 'action'],
    // Colonnes propres au Risk Navigator (Rapport ▸ Exporter ▸ CSV). Leur présence
    // signale un rapport de RISQUE — des positions valorisées, pas des exécutions.
    delta:      ['delta'],
    gamma:      ['gamma'],
    vega:       ['vega'],
    theta:      ['theta'],
  };

  // Le Trade Log de TWS exporte en .txt avec un séparateur CONFIGURABLE (virgule,
  // point-virgule, tabulation…). Imposer la virgule aurait fait échouer l'import
  // sans rien expliquer. On retient le séparateur qui fait reconnaître le PLUS de
  // colonnes — pas simplement celui qui en produit le plus, sinon un texte libre
  // truffé d'espaces gagnerait.
  const DELIMS = [',', ';', '\t', '|'];
  function pickDelimiter(headerLine) {
    let best = ',', bestScore = -1;
    for (const d of DELIMS) {
      const cols = splitCsv(headerLine, d);
      if (cols.length < 2) continue;
      const known = Object.values(columnReader(cols).map).filter(i => i >= 0).length;
      const score = known * 100 + cols.length;
      if (score > bestScore) { bestScore = score; best = d; }
    }
    return best;
  }
  // Renvoie une fonction `col(nom)` → valeur, quelle que soit l'orthographe.
  function columnReader(header) {
    const idx = {};
    header.forEach((h, i) => { const n = norm(h); if (idx[n] == null) idx[n] = i; });
    const find = key => { for (const a of ALIASES[key]) if (idx[a] != null) return idx[a]; return -1; };
    const map = {}; for (const k of Object.keys(ALIASES)) map[k] = find(k);
    return { map, get: (fields, k) => (map[k] >= 0 ? fields[map[k]] : null) };
  }

  // ── Symbole d'option → { underlying, expiry, strike, right } ──────────────
  function parseOptionSymbol(sym) {
    const s = String(sym || '').trim().toUpperCase().replace(/\s+/g, ' ');
    if (!s) return null;

    // a) « AAPL 15AUG25 230 C »
    let m = s.match(/^([A-Z][A-Z0-9.]*)\s+(\d{1,2})([A-Z]{3})(\d{2})\s+([\d.]+)\s+([CP])$/);
    if (m) {
      const mo = MONTHS[m[3]];
      if (!mo) return null;
      return { underlying: m[1], expiry: `20${m[4]}-${String(mo).padStart(2, '0')}-${m[2].padStart(2, '0')}`,
        strike: num(m[5]), right: m[6] };
    }
    // b) OCC : RACINE + AAMMJJ + C/P + strike sur 8 chiffres (millièmes)
    m = s.replace(/\s+/g, '').match(/^([A-Z][A-Z0-9.]{0,5}?)(\d{6})([CP])(\d{8})$/);
    if (m) {
      return { underlying: m[1], expiry: `20${m[2].slice(0, 2)}-${m[2].slice(2, 4)}-${m[2].slice(4, 6)}`,
        strike: parseInt(m[4], 10) / 1000, right: m[3] };
    }
    return null;
  }

  // ── Lecture d'une ligne, une fois les colonnes reconnues ──────────────────
  // Chemin UNIQUE pour les deux formats : seule la façon de trouver l'en-tête
  // diffère (section « Trades » d'un relevé, ou première ligne d'un Flex Query).
  function readRow(rd, f, legs, warnings) {
    const asset = String(rd.get(f, 'asset') || '').toLowerCase();
    // Filtre actions : soit la colonne le dit, soit on s'appuie sur le symbole.
    if (asset && !asset.includes('option') && !asset.includes('opt')) return;

    const gRaw = k => { const v = num(rd.get(f, k)); return v == null ? undefined : v; };
    const anyGreek = ['delta', 'gamma', 'vega', 'theta'].some(k => gRaw(k) !== undefined);
    const valueTot = num(rd.get(f, 'value'));

    let meta = null;
    const und = rd.get(f, 'underlying'), rightRaw = rd.get(f, 'right');
    const r = String(rightRaw || '').trim().toUpperCase()[0];
    if (und && (r === 'C' || r === 'P')) {
      meta = { underlying: String(und).toUpperCase(), right: r,
        expiry: rd.get(f, 'expiry') || null, strike: num(rd.get(f, 'strike')) };
    } else if (und && (anyGreek || valueTot != null)) {
      /* Ligne AGRÉGÉE PAR SOUS-JACENT — la vue par défaut du Risk Navigator, qui
         replie les jambes sous leur sous-jacent. Il n'y a alors ni call/put, ni
         strike : la ligne EST déjà le total du straddle. C'est exploitable, et
         même directement comparable à nos jambes, qui sont elles aussi un
         straddle par sous-jacent. Exiger un détail par option aurait rejeté le
         rapport le plus courant. */
      const q = num(rd.get(f, 'qty'));
      legs.push({ underlying: String(und).toUpperCase().trim(), right: null, aggregate: true,
        qty: q == null ? 0 : q, price: null, value: valueTot, comm: 0,
        delta: gRaw('delta'), gamma: gRaw('gamma'), vega: gRaw('vega'), theta: gRaw('theta') });
      return;
    } else {
      const sym = rd.get(f, 'symbol');
      if (!sym) return;
      meta = parseOptionSymbol(sym);
      if (!meta) {
        // Une ligne ACTION sans colonne « Asset Class » atterrit ici : ce n'est pas
        // une erreur, on passe en silence. En revanche, si la ligne se DÉCLARE
        // option (ou en a l'allure) et qu'on n'a pas su la lire, il faut le dire :
        // une exécution avalée sans bruit fausserait le coût réel sans prévenir.
        const declaredOption = asset.includes('option') || asset.includes('opt');
        if (declaredOption || /\d{6}[CP]\d{6,8}|\s[CP]$/.test(String(sym).toUpperCase())) {
          warnings.push(`symbole non reconnu : « ${sym} »`);
        }
        return;
      }
    }
    const qty = num(rd.get(f, 'qty'));
    const price = num(rd.get(f, 'price'));
    if (qty == null || price == null || qty === 0) return;
    // Sens : la colonne Buy/Sell fait foi si elle existe, sinon le signe de la
    // quantité. Il SERT à distinguer l'ouverture de la clôture (cf. toStraddles).
    // Le vocabulaire diffère d'un export à l'autre : « BUY / SELL » côté Flex
    // Query, « BOT / SLD » dans le Trade Log de TWS. Ne reconnaître que le premier
    // classait toutes les ventes en achats — donc le prix d'ouverture de la jambe
    // indice devenait celui de son rachat.
    const sideCol = String(rd.get(f, 'side') || '').trim().toUpperCase();
    const isSell = /^(SELL|SLD|S)\b/.test(sideCol) || sideCol === 'SELL';
    const isBuy  = /^(BUY|BOT|B)\b/.test(sideCol) || sideCol === 'BUY';
    const dir = isSell ? -1 : isBuy ? 1 : (qty < 0 ? -1 : 1);
    legs.push({ ...meta, qty: Math.abs(qty) * dir, price, comm: Math.abs(num(rd.get(f, 'comm')) || 0),
      value: valueTot, delta: gRaw('delta'), gamma: gRaw('gamma'), vega: gRaw('vega'), theta: gRaw('theta') });
  }

  // Relevé d'activité : fichier à SECTIONS ; on ne lit que « Trades / Data ».
  function parseActivityStatement(lines) {
    const legs = [], warnings = [];
    let rd = null;
    for (const raw of lines) {
      if (!raw.startsWith('Trades,')) continue;
      const f = splitCsv(raw);
      if (f[1] === 'Header') { rd = columnReader(f); continue; }
      if (f[1] !== 'Data' || !rd) continue;
      readRow(rd, f, legs, warnings);
    }
    return { legs, warnings };
  }

  // Fichier plat à en-tête : Flex Query, Trade Log, ou export Risk Navigator.
  function parseFlat(lines) {
    const legs = [], warnings = [];
    /* L'en-tête n'est PAS toujours la première ligne : un export Risk Navigator
       commence souvent par un titre, une date, un nom de portefeuille. On cherche
       donc la ligne qui fait reconnaître le PLUS de colonnes, dans les premières
       du fichier. Supposer la ligne 0 faisait échouer l'import sans rien
       expliquer — alors que l'en-tête se trouvait deux lignes plus bas. */
    let best = { score: -1, i: 0, delim: ',', cols: [] };
    const LOOK = Math.min(lines.length, 30);
    for (let i = 0; i < LOOK; i++) {
      const delim = pickDelimiter(lines[i]);
      const cols = splitCsv(lines[i], delim);
      if (cols.length < 2) continue;
      const rd = columnReader(cols);
      const score = Object.values(rd.map).filter(x => x >= 0).length;
      if (score > best.score) best = { score, i, delim, cols, rd };
    }
    const { rd, delim, cols } = best;
    /* Un rapport de RISQUE n'a pas de prix de transaction : il porte des grecs et
       une valeur de position. Exiger une colonne de prix rejetait donc l'export
       le plus courant du Risk Navigator. On n'exige le prix que pour un relevé
       d'exécutions — là, sans prix, il n'y a effectivement rien à mesurer. */
    const riskCols = rd && (['delta', 'gamma', 'vega', 'theta'].some(k => rd.map[k] >= 0) || rd.map.value >= 0);
    const missing = !rd || rd.map.qty < 0 || (!riskCols && rd.map.price < 0);
    if (missing) {
      // On RESTITUE les colonnes lues : sans elles, l'utilisateur (et nous) ne
      // pouvons pas savoir ce que contient le fichier. Un message d'échec qui
      // n'aide pas à diagnostiquer est un cul-de-sac.
      return { legs, delim, columns: cols,
        warnings: ['Colonnes de quantité et/ou de prix non reconnues.',
          cols.length ? `Colonnes lues : ${cols.filter(Boolean).slice(0, 20).join(' · ')}` : 'Aucune colonne lisible.'] };
    }
    for (let i = best.i + 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      readRow(rd, splitCsv(lines[i], delim), legs, warnings);
    }
    // Nature du fichier : présence des COLONNES de grecs, pas de leurs valeurs.
    // Un week-end, IBKR n'a pas de données de marché et les grecs sortent en
    // « N/A » : se fier aux valeurs classerait alors le rapport comme un relevé
    // d'exécutions, ce qu'il n'est pas.
    return { legs, warnings, delim, columns: cols, hasGreekCols: !!riskCols };
  }

  // ── Point d'entrée : texte du fichier → jambes d'options ──────────────────
  function parse(text) {
    // Le BOM UTF-8 en tête de fichier colle au premier nom de colonne et le rend
    // méconnaissable (« ﻿Symbol » ≠ « Symbol ») — Excel et TWS en produisent.
    const lines = String(text || '').replace(/^﻿/, '').split(/\r?\n/).filter(l => l.length);
    if (!lines.length) return { legs: [], warnings: ['fichier vide'] };
    const isActivity = lines.some(l => l.startsWith('Trades,Header,') || l.startsWith('Trades,Data,'));
    const r = isActivity ? parseActivityStatement(lines) : parseFlat(lines);

    /* Deux natures de fichier, deux usages — il faut les distinguer, car ils ne
       répondent PAS à la même question :
       · « executions » (Trade History, Flex Query, relevé) : ce que j'ai PAYÉ.
       · « risk » (Risk Navigator ▸ Rapport ▸ Exporter) : des positions VALORISÉES
         au marché, avec les grecs d'IBKR. En What-If, aucun ordre n'est passé —
         il n'existe donc aucune transaction, et c'est le seul export disponible.
       On reconnaît le second à la présence des colonnes de grecs. */
    // La nature se lit sur les COLONNES, pas sur les valeurs : un week-end, les
    // grecs d'IBKR sortent en « N/A » et un rapport de risque serait sinon pris
    // pour un relevé d'exécutions.
    const hasGreeks = r.hasGreekCols || r.legs.some(l => l.vega !== undefined || l.delta !== undefined);
    const kind = hasGreeks ? 'risk' : 'executions';
    if (!r.legs.length && !r.warnings.length) {
      r.warnings.push("aucune option trouvée — pour des exécutions : Trade History en « Extended Form » ; pour un portefeuille What-If : Risk Navigator ▸ Rapport ▸ Exporter ▸ CSV.");
    }
    return { ...r, kind, format: isActivity ? 'activity' : 'flat' };
  }

  // ── Recoller les straddles ────────────────────────────────────────────────
  // Une jambe de dispersion = un CALL + un PUT au même strike. IBKR les rapporte
  // séparément, parfois en plusieurs exécutions partielles à des prix différents :
  // on fait donc une moyenne PONDÉRÉE PAR LA QUANTITÉ, pas une moyenne simple.
  // Le sens compte : un rapport peut contenir l'OUVERTURE et la CLÔTURE de la
  // même position. Tout agréger ensemble mélangerait le prix d'entrée et celui
  // de sortie en une moyenne qui ne serait ni l'un ni l'autre. On accumule donc
  // séparément les achats et les ventes ; le rapprochement choisira ensuite le
  // sens qui correspond à la jambe (composants achetés, indice vendu).
  function toStraddles(legs) {
    const acc = {};
    const blank = () => ({ C: { q: 0, notional: 0 }, P: { q: 0, notional: 0 }, comm: 0, g: {} });
    // Lignes AGRÉGÉES par sous-jacent (Risk Navigator replié) : elles sont déjà
    // le total du straddle, il n'y a rien à réapparier. On les traite à part,
    // sinon la logique call/put les rejetterait faute de `right`.
    const out0 = {};
    for (const l of legs.filter(x => x.aggregate)) {
      const k = l.underlying;
      const g = {};
      for (const key of ['delta', 'gamma', 'vega', 'theta']) if (l[key] !== undefined) g[key] = l[key];
      out0[k] = { underlying: k, aggregate: true, complete: true,
        price: null, value: l.value, qty: Math.abs(l.qty) || null, comm: 0,
        greeks: Object.keys(g).length ? g : null, expiries: [], strikes: [],
        buy: null, sell: null, unbalanced: false, roundTrip: false };
    }

    for (const l of legs.filter(x => !x.aggregate)) {
      const k = l.underlying;
      acc[k] = acc[k] || { underlying: k, buy: blank(), sell: blank(), expiries: new Set(), strikes: new Set() };
      const bag = acc[k][l.qty < 0 ? 'sell' : 'buy'];
      const leg = bag[l.right];
      if (!leg) continue;
      const q = Math.abs(l.qty);
      leg.q += q; leg.notional += q * l.price;
      bag.comm += l.comm || 0;
      // Grecs (Risk Navigator) : un straddle = call + put, donc ses grecs
      // s'ADDITIONNENT sur les deux jambes. On somme tel quel, sans reconvertir :
      // la convention d'unité d'IBKR est affichée telle quelle et comparée à la
      // nôtre par un RAPPORT — c'est le rapport qui révèle un éventuel écart
      // d'échelle, plutôt qu'une conversion supposée qui le masquerait.
      for (const key of ['delta', 'gamma', 'vega', 'theta']) {
        if (l[key] !== undefined) bag.g[key] = (bag.g[key] || 0) + l[key];
      }
      if (l.expiry) acc[k].expiries.add(String(l.expiry).slice(0, 10));
      if (l.strike != null) acc[k].strikes.add(l.strike);
    }
    const shape = b => {
      const cP = b.C.q > 0 ? b.C.notional / b.C.q : null;
      const pP = b.P.q > 0 ? b.P.notional / b.P.q : null;
      // Un straddle exige les DEUX jambes. Une seule → on le dit plutôt que de
      // livrer un demi-prix qui passerait pour un straddle.
      const complete = cP != null && pP != null;
      return { complete, callPrice: cP, putPrice: pP,
        price: complete ? cP + pP : null,                    // prix du straddle, par contrat
        qty: complete ? Math.min(b.C.q, b.P.q) : (b.C.q || b.P.q),
        unbalanced: complete && b.C.q !== b.P.q, comm: b.comm,
        greeks: Object.keys(b.g).length ? b.g : null };
    };
    const out = { ...out0 };   // les agrégats d'abord ; un détail par jambe, s'il existe, les affine
    for (const [k, a] of Object.entries(acc)) {
      const buy = shape(a.buy), sell = shape(a.sell);
      // Vue par défaut : le sens qui a réellement été exécuté (ou l'achat si les
      // deux le sont — la clôture ne doit pas primer sur l'ouverture).
      const main = buy.complete ? buy : (sell.complete ? sell : (buy.qty ? buy : sell));
      out[k] = { underlying: k, buy, sell, ...main, expiries: [...a.expiries], strikes: [...a.strikes],
        roundTrip: buy.complete && sell.complete };
    }
    return out;
  }

  // ── Rapprochement avec une stratégie construite ───────────────────────────
  // Compare, jambe par jambe, ce qui a été PAYÉ à ce que le modèle avait prévu.
  // `premium` de la stratégie est un TOTAL en $ pour la jambe (déjà × contrats
  // × taille de contrat) — même convention que dispersion-cost.js.
  function matchStrategy(straddles, strategy, contractSize) {
    const CS = contractSize || 100;
    const rows = [], unmatched = [];
    const seen = new Set();
    // `ecart` est TOUJOURS orienté « défavorable = positif », quel que soit le sens
    // de la jambe : on paie plus cher que prévu sur une jambe achetée, on encaisse
    // moins que prévu sur la jambe vendue. Sans cette convention, la somme de la
    // colonne n'aurait aucun sens — les deux effets se compenseraient à l'écran
    // alors qu'ils vous coûtent tous les deux.
    const add = (ticker, planQty, planTotal, role, side) => {
      const rec = straddles[String(ticker || '').toUpperCase()];
      if (!rec) { rows.push({ ticker, role, side, planQty, planTotal, matched: false }); return; }
      seen.add(rec.underlying);
      // On retient le sens qui correspond à la jambe : les composants ont été
      // ACHETÉS à l'ouverture, la jambe indice VENDUE. Si le rapport contient
      // aussi la clôture, elle est ainsi écartée du prix d'entrée.
      // Une ligne agrégée n'a pas de sens (ni achat ni vente distincts) : elle est
      // le total tel quel. Sinon on retient le sens qui correspond à la jambe.
      const dir = rec.aggregate ? null : (side === 'sell' ? rec.sell : rec.buy);
      const f = (dir && dir.qty > 0) ? { ...rec, ...dir } : rec;
      // Les commissions sont un coût dans les DEUX sens : elles s'ajoutent à ce
      // qu'on paie, et se retranchent de ce qu'on encaisse.
      // Le rapport de risque donne la VALEUR totale de la position (« Évalué »),
      // pas un prix unitaire. La prendre pour un prix fausserait tout d'un facteur
      // quantité × 100 — on l'utilise donc telle quelle quand le prix manque.
      const gross = (f.price != null && f.qty > 0) ? f.price * f.qty * CS
        : (f.value != null ? Math.abs(f.value) : null);
      const realTotal = gross == null ? null : (side === 'sell' ? gross - f.comm : gross + f.comm);
      const ecart = (realTotal != null && planTotal != null)
        ? (side === 'sell' ? planTotal - realTotal : realTotal - planTotal)
        : null;
      rows.push({
        ticker, role, side, planQty, planTotal, matched: true,
        realQty: f.qty, realPrice: f.price, realTotal, gross,
        comm: f.comm, complete: f.complete, unbalanced: f.unbalanced,
        qtyMismatch: planQty != null && f.qty !== planQty,
        ecart, greeks: f.greeks || null, plan: planGreeks[String(ticker || '').toUpperCase()] || null,
      });
    };
    // Nos grecs, pour la confrontation avec ceux d'IBKR.
    const planGreeks = {};
    if (strategy) {
      const p = strategy.portfolio || {};
      const idxSym = String(strategy.indexEtf || strategy.index || '').toUpperCase();
      if (idxSym) planGreeks[idxSym] = { vega: p.idxVega, theta: p.idxTheta, gamma: p.idxGamma };
      for (const c of strategy.components || []) {
        planGreeks[String(c.ticker).toUpperCase()] = { vega: c.vega, theta: c.theta, gamma: c.gamma, delta: c.delta };
      }
      const idx = strategy.indexEtf || strategy.index;
      add(idx, strategy.nIndex || 1, p.idxPrem != null ? Math.abs(p.idxPrem) : null, 'index', 'sell');
      for (const c of strategy.components || []) add(c.ticker, c.nContracts, c.premium != null ? Math.abs(c.premium) : null, 'composant', 'buy');
    }
    for (const k of Object.keys(straddles)) if (!seen.has(k)) unmatched.push(k);
    return { rows, unmatched };
  }

  window.DXIbkrImport = { parse, toStraddles, matchStrategy, parseOptionSymbol, splitCsv };
})();
