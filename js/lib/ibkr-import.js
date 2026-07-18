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

  // ── Lecture d'un relevé d'activité (fichier à sections) ───────────────────
  function parseActivityStatement(lines) {
    const legs = [], warnings = [];
    let header = null;
    for (const raw of lines) {
      if (!raw.startsWith('Trades,')) continue;
      const f = splitCsv(raw);
      if (f[1] === 'Header') { header = f; continue; }
      if (f[1] !== 'Data' || !header) continue;
      const col = name => { const i = header.indexOf(name); return i >= 0 ? f[i] : null; };
      const cat = (col('Asset Category') || '').toLowerCase();
      if (!cat.includes('option')) continue;                      // actions de couverture : hors périmètre ici
      const meta = parseOptionSymbol(col('Symbol'));
      if (!meta) { warnings.push(`symbole non reconnu : « ${col('Symbol')} »`); continue; }
      const qty = num(col('Quantity')), price = num(col('T. Price'));
      if (qty == null || price == null || qty === 0) continue;
      legs.push({ ...meta, qty, price, comm: Math.abs(num(col('Comm/Fee')) || 0) });
    }
    return { legs, warnings };
  }

  // ── Lecture d'un Flex Query (CSV plat) ────────────────────────────────────
  function parseFlex(lines) {
    const legs = [], warnings = [];
    const header = splitCsv(lines[0]);
    const idx = n => header.findIndex(h => h.toLowerCase() === n.toLowerCase());
    const iUnd = idx('UnderlyingSymbol'), iPC = idx('Put/Call') >= 0 ? idx('Put/Call') : idx('PutCall');
    const iQty = idx('Quantity'), iPx = idx('TradePrice'), iCom = idx('IBCommission');
    const iExp = idx('Expiry'), iK = idx('Strike'), iSym = idx('Symbol');
    if (iQty < 0 || iPx < 0) return { legs, warnings: ['colonnes Quantity / TradePrice absentes'] };

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const f = splitCsv(lines[i]);
      let meta = null;
      if (iUnd >= 0 && iPC >= 0 && f[iUnd]) {
        const r = String(f[iPC] || '').trim().toUpperCase()[0];
        if (r !== 'C' && r !== 'P') continue;                     // ligne action : ignorée
        meta = { underlying: f[iUnd].toUpperCase(), right: r,
          expiry: iExp >= 0 ? f[iExp] : null, strike: iK >= 0 ? num(f[iK]) : null };
      } else if (iSym >= 0) {
        meta = parseOptionSymbol(f[iSym]);
      }
      if (!meta) continue;
      const qty = num(f[iQty]), price = num(f[iPx]);
      if (qty == null || price == null || qty === 0) continue;
      legs.push({ ...meta, qty, price, comm: Math.abs(iCom >= 0 ? (num(f[iCom]) || 0) : 0) });
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
  function toStraddles(legs) {
    const acc = {};
    for (const l of legs) {
      const k = l.underlying;
      acc[k] = acc[k] || { underlying: k, C: { q: 0, notional: 0 }, P: { q: 0, notional: 0 }, comm: 0, expiries: new Set(), strikes: new Set() };
      const side = acc[k][l.right];
      if (!side) continue;
      const q = Math.abs(l.qty);
      side.q += q; side.notional += q * l.price;
      acc[k].comm += l.comm || 0;
      if (l.expiry) acc[k].expiries.add(String(l.expiry).slice(0, 10));
      if (l.strike != null) acc[k].strikes.add(l.strike);
    }
    const out = {};
    for (const [k, a] of Object.entries(acc)) {
      const cP = a.C.q > 0 ? a.C.notional / a.C.q : null;
      const pP = a.P.q > 0 ? a.P.notional / a.P.q : null;
      // Un straddle exige les DEUX jambes. Une seule → on le dit plutôt que de
      // livrer un demi-prix qui passerait pour un straddle.
      const complete = cP != null && pP != null;
      out[k] = {
        underlying: k, complete,
        callPrice: cP, putPrice: pP,
        price: complete ? cP + pP : null,                 // prix du straddle, par contrat
        qty: complete ? Math.min(a.C.q, a.P.q) : (a.C.q || a.P.q),
        unbalanced: complete && a.C.q !== a.P.q,          // call et put en quantités différentes
        comm: a.comm,
        expiries: [...a.expiries], strikes: [...a.strikes],
      };
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
      const f = straddles[String(ticker || '').toUpperCase()];
      if (!f) { rows.push({ ticker, role, side, planQty, planTotal, matched: false }); return; }
      seen.add(f.underlying);
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
