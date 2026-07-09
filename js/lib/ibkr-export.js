/* ─── Export IBKR : CSV importable dans le Risk Navigator (What-If) de TWS ───
   Reconstitue TOUTE la stratégie construite (mode Construction) sous forme
   d'ordres Buy/Sell — jambes options (SHORT straddle indice + LONG straddles
   composants) + jambes de couverture en ACTIONS (delta hedge) — au format CSV
   attendu par « Portfolio ▸ Import » du Risk Navigator. Les positions s'ouvrent
   en What-If : RIEN n'est exécuté tant que l'utilisateur ne transmet pas d'ordre.

   Colonnes officielles IBKR (l'ordre est libre, mais les EN-TÊTES doivent être
   EXACTES sinon l'import échoue) :
     Action,Quantity,Symbol,SecType,LastTradingDayOrContractMonth,Strike,Right,Exchange,Currency
   • Action = Buy/Sell   • SecType = STK/OPT   • Right = Call/Put
   • LastTradingDayOrContractMonth = YYYYMMDD (dernier jour de négociation)
   • STK : Strike / Right / échéance laissés VIDES.

   FIDÉLITÉ D'IMPORT — un contrat n'est accepté par TWS que s'il existe vraiment
   (bon strike ET bonne échéance). Deux garde-fous :
     1) Échéance MENSUELLE standard (3ᵉ vendredi) la plus proche : cotée pour
        TOUTE action optionnable, alors que les weeklies manquent à beaucoup de
        valeurs → évite les rejets « échéance inconnue ».
     2) Strike sur la grille STANDARD OCC (2,5 $ / 5 $ / 10 $ selon le prix) :
        garantie d'exister, contrairement aux pas fins (1 $) absents de nombreuses
        chaînes → évite les rejets « strike inconnu ».
   Quand c'est possible on VALIDE en plus contre la vraie chaîne d'options (Cboe,
   via /api/options/contracts) : strike ATM et échéance réellement listés. Le
   résultat de cette validation est passé en 2ᵉ argument (`resolved`) ; en son
   absence (repli réseau / composants non-US) l'heuristique ci-dessus prend le
   relais. Logique pure (aucun DOM sauf download/resolve) → window.DXIbkr. */
(function () {
  const HEADER = ['Action', 'Quantity', 'Symbol', 'SecType', 'LastTradingDayOrContractMonth', 'Strike', 'Right', 'Exchange', 'Currency'];

  // Suffixe Yahoo → devise. Les sous-jacents US n'ont pas de suffixe → USD.
  const CUR_BY_SUFFIX = { DE: 'EUR', PA: 'EUR', AS: 'EUR', MI: 'EUR', MC: 'EUR', BR: 'EUR', LS: 'EUR', HE: 'EUR', VI: 'EUR', IR: 'EUR', F: 'EUR', L: 'GBP', SW: 'CHF', VX: 'CHF', ST: 'SEK', OL: 'NOK', CO: 'DKK', HK: 'HKD', T: 'JPY' };
  function symMeta(ticker) {
    const raw = String(ticker || '').trim().toUpperCase();
    const dot = raw.lastIndexOf('.');
    if (dot > 0) return { symbol: raw.slice(0, dot), currency: CUR_BY_SUFFIX[raw.slice(dot + 1)] || 'USD' };
    return { symbol: raw, currency: 'USD' };
  }

  // Strike ATM ≈ prix courant, arrondi à la grille STANDARD OCC (guaranteed) :
  //   2,5 $ sous 25 $ · 5 $ jusqu'à 200 $ · 10 $ au-delà.
  // Ces intervalles sont ceux garantis pour les échéances mensuelles de toute
  // action optionnable — les pas plus fins (1 $) n'existent pas partout.
  function roundStrike(p) {
    const x = Math.abs(+p) || 0;
    const step = x < 25 ? 2.5 : x < 200 ? 5 : 10;
    const r = Math.round(x / step) * step;
    return fmtStrike(r);
  }
  // Formatage d'un strike numérique : entier sans décimale, demi-strike avec « .5 ».
  function fmtStrike(x) {
    const n = Number(x);
    return n % 1 === 0 ? String(n) : n.toFixed(n % 0.5 === 0 ? 1 : 2);
  }

  // 3ᵉ vendredi (échéance mensuelle standard) d'un mois donné, en ms UTC.
  function thirdFridayMs(y, mIdx) {
    const first = new Date(Date.UTC(y, mIdx, 1));
    const firstFri = 1 + ((5 - first.getUTCDay() + 7) % 7);   // 5 = vendredi
    return Date.UTC(y, mIdx, firstFri + 14);
  }
  // Échéance EXPORTÉE = celle de la stratégie (`s.expiry`), STRICTEMENT identique
  // à ce que le reste du site affiche/utilise (construction, DTE, reprise/suivi)
  // → aucune divergence CSV ↔ site. Repli sur la mensuelle la plus proche
  // UNIQUEMENT si la stratégie n'a pas d'échéance stockée (durée seule).
  function exportExp8(s) {
    if (s && s.expiry) {
      const d = String(s.expiry).slice(0, 10).replace(/-/g, '');
      if (/^\d{8}$/.test(d)) return d;
    }
    return monthlyExp8(s);
  }

  // Échéance MENSUELLE (YYYYMMDD) la plus proche de l'échéance/durée visée par
  // la stratégie — universellement cotée, contrairement aux weeklies. Sert de
  // repli quand aucune `expiry` n'est stockée. NB : depuis que la construction
  // ne propose QUE des mensuelles (js/data.js), `s.expiry` est déjà une mensuelle.
  function monthlyExp8(s) {
    let t;
    if (s && s.expiry) t = new Date(String(s.expiry).slice(0, 10) + 'T00:00:00Z').getTime();
    if (t == null || !isFinite(t)) t = Date.now() + (((s && s.duration) || 30) * 86400000);
    const d = new Date(t), y = d.getUTCFullYear(), m = d.getUTCMonth();
    const cands = [thirdFridayMs(y, m - 1), thirdFridayMs(y, m), thirdFridayMs(y, m + 1)];
    const floor = Date.now() - 86400000;   // ne jamais choisir une échéance passée
    let best = null, bestD = Infinity;
    for (const c of cands) { if (c < floor) continue; const dd = Math.abs(c - t); if (dd < bestD) { bestD = dd; best = c; } }
    if (best == null) best = thirdFridayMs(y, m + 1);
    const bd = new Date(best);
    return `${bd.getUTCFullYear()}${String(bd.getUTCMonth() + 1).padStart(2, '0')}${String(bd.getUTCDate()).padStart(2, '0')}`;
  }

  // Contrat (strike + échéance) pour un symbole : la validation réelle prime,
  // sinon l'heuristique (mensuelle standard + grille OCC).
  function contractFor(sym, price, resolved, fallbackE) {
    const r = resolved && resolved.bySymbol && resolved.bySymbol[sym];
    if (r && r.strike != null && r.expiry) return { E: String(r.expiry), K: fmtStrike(r.strike), real: true };
    return { E: fallbackE, K: roundStrike(price), real: false };
  }

  // Reconstitue la stratégie en lignes d'ordres (objets clés = HEADER).
  // `resolved` (optionnel) = { targetExp8, bySymbol:{ SYM:{expiry,strike,spot} } }
  // issu de resolveContracts() → contrats validés sur la vraie chaîne d'options.
  function buildRows(s, resolved) {
    if (!s) return [];
    const rows = [];
    const fallbackE = (resolved && resolved.targetExp8) || exportExp8(s);
    const etf = String(s.indexEtf || s.index || '').toUpperCase();
    const opt = (action, qty, sym, strike, right, cur, E) => rows.push({ Action: action, Quantity: qty, Symbol: sym, SecType: 'OPT', LastTradingDayOrContractMonth: E, Strike: strike, Right: right, Exchange: 'SMART', Currency: cur });
    const stk = (action, qty, sym, cur) => rows.push({ Action: action, Quantity: qty, Symbol: sym, SecType: 'STK', LastTradingDayOrContractMonth: '', Strike: '', Right: '', Exchange: 'SMART', Currency: cur });

    // 1) Jambe indice : SHORT straddle sur l'ETF négocié (call + put ATM).
    const nIdx = Math.max(1, Math.round(s.nIndex || 1));
    if (etf) {
      const c = contractFor(etf, s.indexPrice, resolved, fallbackE);
      opt('SELL', nIdx, etf, c.K, 'Call', 'USD', c.E);
      opt('SELL', nIdx, etf, c.K, 'Put', 'USD', c.E);
    }

    // 2) Composants : LONG straddle par composant (call + put ATM).
    (s.components || []).forEach(cp => {
      const n = Math.round(cp.nContracts || 0);
      if (n < 1) return;
      const m = symMeta(cp.ticker);
      const c = contractFor(m.symbol, cp.price, resolved, fallbackE);
      opt('BUY', n, m.symbol, c.K, 'Call', m.currency, c.E);
      opt('BUY', n, m.symbol, c.K, 'Put', m.currency, c.E);
    });

    // 3) Couverture du delta en actions — selon le mode retenu à la construction.
    if (s.deltaHedge === 'legs') {
      (s.components || []).forEach(cp => {
        const sh = Math.round(Math.abs(cp.hedgeShares || 0));
        if (sh < 1) return;
        const m = symMeta(cp.ticker);
        stk(cp.hedgeShares >= 0 ? 'BUY' : 'SELL', sh, m.symbol, m.currency);
      });
    }
    // 'index' : hedge global en actions ETF ; 'legs' : couverture de la jambe indice.
    if (s.deltaHedge === 'index' || s.deltaHedge === 'legs') {
      const shares = Math.round(Math.abs(s.hedgeUnits || 0) * 100);
      if (shares >= 1 && etf) stk(s.hedgeUnits >= 0 ? 'BUY' : 'SELL', shares, etf, 'USD');
    }
    return rows;
  }

  function toCsv(s, resolved) {
    const line = obj => HEADER.map(h => (obj[h] == null ? '' : String(obj[h]))).join(',');
    return [HEADER.join(','), ...buildRows(s, resolved).map(line)].join('\r\n') + '\r\n';
  }

  function summary(s, resolved) {
    const rows = buildRows(s, resolved);
    const opts = rows.filter(r => r.SecType === 'OPT');
    const R = (resolved && resolved.bySymbol) || {};
    const targetExp8 = (resolved && resolved.targetExp8) || exportExp8(s);
    const optSyms = [...new Set(opts.map(r => r.Symbol))];
    const validated = optSyms.filter(sym => R[sym] && R[sym].strike != null).length;
    // Sous-jacents validés dont l'échéance cotée la plus proche DIFFÈRE de celle
    // de la stratégie (la date ne « convient » pas telle quelle → ajustée).
    const expiryAdjusted = optSyms.filter(sym => R[sym] && R[sym].expiry && String(R[sym].expiry) !== targetExp8).length;
    return {
      rows: rows.length,
      optionLegs: opts.length,
      stockLegs: rows.filter(r => r.SecType === 'STK').length,
      contracts: opts.reduce((a, r) => a + (+r.Quantity || 0), 0),
      hedged: !!(s && s.deltaHedge && s.deltaHedge !== 'none'),
      foreign: rows.some(r => r.Currency && r.Currency !== 'USD'),
      optionSymbols: optSyms.length,
      validated,                                  // symboles validés sur la vraie chaîne
      approximated: optSyms.length - validated,   // symboles laissés au strike standard
      targetExp8,                                 // échéance visée = celle de la stratégie
      expiryAdjusted,                             // symboles dont l'échéance a dû être ajustée
    };
  }

  // Valide strikes + échéance contre la vraie chaîne d'options (Cboe) via
  // /api/options/contracts. Best-effort : toute erreur → {} (repli heuristique).
  // Renvoie { targetExp8, bySymbol:{ SYM:{expiry,strike,spot} } }.
  function resolveContracts(s, opts) {
    opts = opts || {};
    const fetchFn = opts.fetch || (typeof fetch !== 'undefined' ? fetch : null);
    const origin = opts.origin || '';
    const targetExp8 = exportExp8(s);
    const base = { targetExp8, bySymbol: {} };
    if (!s || !fetchFn) return Promise.resolve(base);
    // Symboles US uniquement (les composants étrangers n'ont pas d'options US).
    const syms = new Set();
    const etf = String(s.indexEtf || s.index || '').toUpperCase();
    if (etf) syms.add(etf);
    (s.components || []).forEach(c => { const m = symMeta(c.ticker); if (m.currency === 'USD' && Math.round(c.nContracts || 0) >= 1) syms.add(m.symbol); });
    if (!syms.size) return Promise.resolve(base);
    const url = `${origin}/api/options/contracts?symbols=${encodeURIComponent([...syms].join(','))}&expiry=${targetExp8}`;
    return Promise.resolve(fetchFn(url))
      .then(r => (r && r.ok ? r.json() : null))
      .then(d => {
        const out = { targetExp8, bySymbol: {} };
        const c = d && d.contracts;
        if (c) for (const k in c) if (c[k] && c[k].strike != null && c[k].expiry) out.bySymbol[k] = c[k];
        return out;
      })
      .catch(() => base);
  }

  function filename(s) { return `dx-ibkr-whatif-${(s && s.index) || 'strat'}-${exportExp8(s)}.csv`; }

  function download(s, resolved) {
    const blob = new Blob([toCsv(s, resolved)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename(s);
    a.click();
    URL.revokeObjectURL(a.href);
  }

  window.DXIbkr = { HEADER, buildRows, toCsv, summary, filename, download, roundStrike, symMeta, monthlyExp8, exportExp8, resolveContracts };
})();
