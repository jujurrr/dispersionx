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
   Logique pure (aucun DOM sauf download) → réutilisable partout via window.DXIbkr. */
(function () {
  const HEADER = ['Action', 'Quantity', 'Symbol', 'SecType', 'LastTradingDayOrContractMonth', 'Strike', 'Right', 'Exchange', 'Currency'];

  // Suffixe Yahoo → devise. Les sous-jacents US n'ont pas de suffixe → USD.
  // Best-effort pour les composants européens (CAC/DAX…) : la devise est posée,
  // l'utilisateur ajuste éventuellement la place de cotation dans TWS.
  const CUR_BY_SUFFIX = { DE: 'EUR', PA: 'EUR', AS: 'EUR', MI: 'EUR', MC: 'EUR', BR: 'EUR', LS: 'EUR', HE: 'EUR', VI: 'EUR', IR: 'EUR', F: 'EUR', L: 'GBP', SW: 'CHF', VX: 'CHF', ST: 'SEK', OL: 'NOK', CO: 'DKK', HK: 'HKD', T: 'JPY' };
  function symMeta(ticker) {
    const raw = String(ticker || '').trim().toUpperCase();
    const dot = raw.lastIndexOf('.');
    if (dot > 0) return { symbol: raw.slice(0, dot), currency: CUR_BY_SUFFIX[raw.slice(dot + 1)] || 'USD' };
    return { symbol: raw, currency: 'USD' };
  }

  // Strike ATM ≈ prix courant, arrondi à l'incrément standard le plus proche
  // pour tomber sur un strike réellement coté (sinon TWS rejette la ligne).
  function roundStrike(p) {
    const x = Math.abs(+p) || 0;
    const step = x < 25 ? 0.5 : x < 100 ? 1 : x < 500 ? 5 : 10;
    const r = Math.round(x / step) * step;
    return step < 1 ? r.toFixed(1) : String(Math.round(r));
  }

  // Échéance au format YYYYMMDD à partir de la date d'expiration réelle stockée.
  function exp8(s) {
    if (s && s.expiry) return String(s.expiry).replace(/-/g, '').slice(0, 8);
    const days = (s && s.duration) || 30;
    return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10).replace(/-/g, '');
  }

  // Reconstitue la stratégie en lignes d'ordres (objets clés = HEADER).
  function buildRows(s) {
    if (!s) return [];
    const rows = [];
    const E = exp8(s);
    const etf = String(s.indexEtf || s.index || '').toUpperCase();
    const opt = (action, qty, sym, strike, right, cur) => rows.push({ Action: action, Quantity: qty, Symbol: sym, SecType: 'OPT', LastTradingDayOrContractMonth: E, Strike: strike, Right: right, Exchange: 'SMART', Currency: cur });
    const stk = (action, qty, sym, cur) => rows.push({ Action: action, Quantity: qty, Symbol: sym, SecType: 'STK', LastTradingDayOrContractMonth: '', Strike: '', Right: '', Exchange: 'SMART', Currency: cur });

    // 1) Jambe indice : SHORT straddle sur l'ETF négocié (call + put ATM).
    const nIdx = Math.max(1, Math.round(s.nIndex || 1));
    const kIdx = roundStrike(s.indexPrice);
    if (etf) { opt('SELL', nIdx, etf, kIdx, 'Call', 'USD'); opt('SELL', nIdx, etf, kIdx, 'Put', 'USD'); }

    // 2) Composants : LONG straddle par composant (call + put ATM).
    (s.components || []).forEach(c => {
      const n = Math.round(c.nContracts || 0);
      if (n < 1) return;
      const m = symMeta(c.ticker), k = roundStrike(c.price);
      opt('BUY', n, m.symbol, k, 'Call', m.currency);
      opt('BUY', n, m.symbol, k, 'Put', m.currency);
    });

    // 3) Couverture du delta en actions — selon le mode retenu à la construction.
    if (s.deltaHedge === 'legs') {
      (s.components || []).forEach(c => {
        const sh = Math.round(Math.abs(c.hedgeShares || 0));
        if (sh < 1) return;
        const m = symMeta(c.ticker);
        stk(c.hedgeShares >= 0 ? 'BUY' : 'SELL', sh, m.symbol, m.currency);
      });
    }
    // 'index' : hedge global en actions ETF ; 'legs' : couverture de la jambe indice.
    if (s.deltaHedge === 'index' || s.deltaHedge === 'legs') {
      const shares = Math.round(Math.abs(s.hedgeUnits || 0) * 100);
      if (shares >= 1 && etf) stk(s.hedgeUnits >= 0 ? 'BUY' : 'SELL', shares, etf, 'USD');
    }
    return rows;
  }

  function toCsv(s) {
    const line = obj => HEADER.map(h => (obj[h] == null ? '' : String(obj[h]))).join(',');
    return [HEADER.join(','), ...buildRows(s).map(line)].join('\r\n') + '\r\n';
  }

  function summary(s) {
    const rows = buildRows(s);
    const opts = rows.filter(r => r.SecType === 'OPT');
    return {
      rows: rows.length,
      optionLegs: opts.length,
      stockLegs: rows.filter(r => r.SecType === 'STK').length,
      contracts: opts.reduce((a, r) => a + (+r.Quantity || 0), 0),
      hedged: !!(s && s.deltaHedge && s.deltaHedge !== 'none'),
      foreign: rows.some(r => r.Currency && r.Currency !== 'USD'),
    };
  }

  function filename(s) { return `dx-ibkr-whatif-${(s && s.index) || 'strat'}-${exp8(s)}.csv`; }

  function download(s) {
    const blob = new Blob([toCsv(s)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename(s);
    a.click();
    URL.revokeObjectURL(a.href);
  }

  window.DXIbkr = { HEADER, buildRows, toCsv, summary, filename, download, roundStrike, symMeta };
})();
