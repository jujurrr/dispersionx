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
  function splitCsv(line) {
    const out = [];
    let cur = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (q && line[i + 1] === '"') { cur += '"'; i++; }   // guillemet échappé
        else q = !q;
      } else if (ch === ',' && !q) { out.push(cur); cur = ''; }
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
  const norm = h => String(h || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const ALIASES = {
    symbol:     ['symbol', 'description'],
    underlying: ['underlyingsymbol', 'underlying'],
    right:      ['putcall', 'right', 'putorcall'],
    strike:     ['strike', 'strikeprice'],
    expiry:     ['expiry', 'expirationdate', 'lasttradingdayorcontractmonth', 'maturity'],
    qty:        ['quantity', 'qty'],
    price:      ['tradeprice', 'tprice', 'price'],
    comm:       ['ibcommission', 'commfee', 'commission', 'commissions'],
    asset:      ['assetclass', 'assetcategory'],
    side:       ['buysell', 'side'],
  };
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

    let meta = null;
    const und = rd.get(f, 'underlying'), rightRaw = rd.get(f, 'right');
    const r = String(rightRaw || '').trim().toUpperCase()[0];
    if (und && (r === 'C' || r === 'P')) {
      meta = { underlying: String(und).toUpperCase(), right: r,
        expiry: rd.get(f, 'expiry') || null, strike: num(rd.get(f, 'strike')) };
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
    const sideCol = String(rd.get(f, 'side') || '').trim().toUpperCase();
    const dir = sideCol.startsWith('SELL') ? -1 : sideCol.startsWith('BUY') ? 1 : (qty < 0 ? -1 : 1);
    legs.push({ ...meta, qty: Math.abs(qty) * dir, price, comm: Math.abs(num(rd.get(f, 'comm')) || 0) });
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

  // Flex Query : CSV plat, en-tête en première ligne.
  function parseFlex(lines) {
    const legs = [], warnings = [];
    const rd = columnReader(splitCsv(lines[0]));
    if (rd.map.qty < 0 || rd.map.price < 0) {
      return { legs, warnings: ['colonnes « Quantity » et « Trade Price » introuvables — ajoutez-les au Flex Query.'] };
    }
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      readRow(rd, splitCsv(lines[i]), legs, warnings);
    }
    return { legs, warnings };
  }

  // ── Point d'entrée : texte du fichier → jambes d'options ──────────────────
  function parse(text) {
    const lines = String(text || '').split(/\r?\n/).filter(l => l.length);
    if (!lines.length) return { legs: [], warnings: ['fichier vide'] };
    const isActivity = lines.some(l => l.startsWith('Trades,Header,') || l.startsWith('Trades,Data,'));
    const r = isActivity ? parseActivityStatement(lines) : parseFlex(lines);
    if (!r.legs.length && !r.warnings.length) {
      r.warnings.push("aucune exécution d'option trouvée — vérifiez qu'il s'agit bien d'un relevé d'activité ou d'un Flex Query « Trades ».");
    }
    return { ...r, format: isActivity ? 'activity' : 'flex' };
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
    const blank = () => ({ C: { q: 0, notional: 0 }, P: { q: 0, notional: 0 }, comm: 0 });
    for (const l of legs) {
      const k = l.underlying;
      acc[k] = acc[k] || { underlying: k, buy: blank(), sell: blank(), expiries: new Set(), strikes: new Set() };
      const bag = acc[k][l.qty < 0 ? 'sell' : 'buy'];
      const leg = bag[l.right];
      if (!leg) continue;
      const q = Math.abs(l.qty);
      leg.q += q; leg.notional += q * l.price;
      bag.comm += l.comm || 0;
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
        unbalanced: complete && b.C.q !== b.P.q, comm: b.comm };
    };
    const out = {};
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
      const dir = side === 'sell' ? rec.sell : rec.buy;
      const f = (dir && dir.qty > 0) ? { ...rec, ...dir } : rec;
      // Les commissions sont un coût dans les DEUX sens : elles s'ajoutent à ce
      // qu'on paie, et se retranchent de ce qu'on encaisse.
      const gross = f.complete ? f.price * f.qty * CS : null;
      const realTotal = gross == null ? null : (side === 'sell' ? gross - f.comm : gross + f.comm);
      const ecart = (realTotal != null && planTotal != null)
        ? (side === 'sell' ? planTotal - realTotal : realTotal - planTotal)
        : null;
      rows.push({
        ticker, role, side, planQty, planTotal, matched: true,
        realQty: f.qty, realPrice: f.price, realTotal, gross,
        comm: f.comm, complete: f.complete, unbalanced: f.unbalanced,
        qtyMismatch: planQty != null && f.qty !== planQty,
        ecart,
      });
    };
    if (strategy) {
      const idxSym = strategy.indexEtf || strategy.index;
      const p = strategy.portfolio || {};
      add(idxSym, strategy.nIndex || 1, p.idxPrem != null ? Math.abs(p.idxPrem) : null, 'index', 'sell');
      for (const c of strategy.components || []) add(c.ticker, c.nContracts, c.premium != null ? Math.abs(c.premium) : null, 'composant', 'buy');
    }
    for (const k of Object.keys(straddles)) if (!seen.has(k)) unmatched.push(k);
    return { rows, unmatched };
  }

  window.DXIbkrImport = { parse, toStraddles, matchStrategy, parseOptionSymbol, splitCsv };
})();
