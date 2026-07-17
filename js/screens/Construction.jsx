/* ─── Construction : répartition des contrats (sizing de la position) ───
   Module indépendant. À partir d'une liste (composants choisis), il calcule
   le nombre de contrats par jambe d'une dispersion : SHORT straddle indice +
   LONG straddles composants, dimensionnée vega-neutre. Sauvegarde la
   stratégie que le Risk Lab analyse ensuite (clé localStorage dx-strategy-<id>).
   Les grecs sont calculés localement (mêmes formules que le Risk Lab via
   window.DXRisk) → fonctionne hors-ligne, sur de vrais prix/IV, sans aléatoire.
   ───────────────────────────────────────────────────────────────────────── */
// Persiste la stratégie de la liste : via DXApi (write-through cloud si connecté,
// voir js/api.js + src/cloud.js), avec repli localStorage direct si l'API n'est
// pas encore chargée.
function persistStrategy(listId, s) {
  if (window.DXApi && DXApi.saveStrategy) return DXApi.saveStrategy(listId, s);
  try { localStorage.setItem('dx-strategy-' + listId, JSON.stringify(s)); } catch {}
}
// Cache SESSION des données marché/grecs de base, par liste : évite de tout
// refetcher en re-entrant tant que (liste, indice, durée, composants) n'ont pas
// changé. Recalcul si la signature change ou après 15 min (fraîcheur marché).
const _constrCache = {};
const CONSTR_TTL = 15 * 60 * 1000;

function Construction({ listId: listIdParam, onNav, mode, lists, moduleCtx, onModuleCtx, embedded, indexOverride, durationOverride, onSaved, addToast }) {
  const _fx = window.useCurrency ? window.useCurrency() : null;   // re-render au changement de devise
  const { MetricCard, WarningPanel, BeginnerExplanationBox } = window.DispersionXDesignSystem_cb86be;
  const CONTRACT  = (window.DXRisk && window.DXRisk.CONTRACT) || 100;
  const fmtMoney  = (window.DXRisk && window.DXRisk.fmtMoney) || (n => Math.round(n).toLocaleString('fr-FR') + ' $');
  const fmtNot    = v => { const c = window.DXMoney ? window.DXMoney.convert(v) : v; const y = window.DXMoney ? window.DXMoney.symbol() : '$'; return Math.abs(c) >= 1e6 ? (c / 1e6).toFixed(2) + ' M' + y : Math.round(c / 1000) + ' k' + y; };
  const fmtS      = n => { const v = window.DXMoney ? window.DXMoney.convert(n) : n; return (v >= 0 ? '+' : '−') + Math.abs(Math.round(v)); };
  const dxSym     = () => window.DXMoney ? window.DXMoney.symbol() : '$';
  const dxN       = n => Math.round(window.DXMoney ? window.DXMoney.convert(n) : n);   // magnitude convertie
  const fmtQty    = q => { const a = Math.abs(q); return a >= 0.01 ? a.toFixed(2) : a.toFixed(3); };

  const listId  = listIdParam || moduleCtx?.listId || null;
  const ctx     = moduleCtx || {};
  const hasCtx  = !!listId;
  const indexSym = indexOverride || ctx.listIndex || ctx.index || 'SPX';

  const [loading,  setLoading]  = React.useState(true);
  const [base,     setBase]     = React.useState(null);
  const [nIndex,   setNIndex]   = React.useState(1);
  const [sizing,   setSizing]   = React.useState('vega_neutral');
  const [weightBasis, setWeightBasis] = React.useState('capped');  // capped (défaut) | index (w_i) | variance (w_i²) | equal
  // Échéances proposées : les 4 dates réelles (les plus proches de 15/30/45/60 j)
  // COTÉES PAR TOUS les sous-jacents du panier — calculées une fois au chargement
  // (voir l'effet plus bas). Repli calendaire (vendredis) tant que la chaîne
  // n'a pas répondu ou en cas d'indisponibilité. On stocke la DATE (expiry) ;
  // duration = DTE jusqu'à elle → tout le site suit cette date unique.
  const TARGETS = [15, 30, 45, 60];
  const calendarOpts = React.useMemo(() => (window.DXExpiry ? window.DXExpiry.expiriesFor(TARGETS) : []), []);
  const [expiryOpts, setExpiryOpts] = React.useState(calendarOpts);
  const [expiryCommon, setExpiryCommon] = React.useState(false);   // true = options cotées par TOUS (chaîne réelle)
  const nearestOpt = (days, opts) => (opts || expiryOpts).reduce((best, o) => (!best || Math.abs(o.dte - days) < Math.abs(best.dte - days) ? o : best), null);
  const initOpt = nearestOpt(durationOverride || 30, calendarOpts);
  const [duration, setDuration] = React.useState(initOpt ? initOpt.dte : (durationOverride || 30));
  const [expiry,   setExpiry]   = React.useState(initOpt ? initOpt.date : null);
  const [deltaHedge, setDeltaHedge] = React.useState('none');      // none | index | legs
  // Qualité d'exécution : fraction du spread bid/ask réellement payée. 1 = on traverse (ordre au
  // marché) — l'hypothèse de nos backtests, donc la BORNE HAUTE du coût. C'est le seul levier de
  // coût qu'un particulier contrôle, et la littérature le désigne comme l'endroit où vit l'edge.
  const [fill, setFill] = React.useState(1);
  const [implRho, setImplRho] = React.useState(null);              // ρ implicite du panier (source unifiée du site)
  const [savedTick, setSavedTick] = React.useState(0);
  const [importMsg, setImportMsg] = React.useState(null);
  const [shareOpen, setShareOpen] = React.useState(false);
  const [ibkrOpen, setIbkrOpen] = React.useState(false);   // export IBKR (What-If) — Pro
  const [expiryChecking, setExpiryChecking] = React.useState(false);   // calcul des échéances communes en cours
  // Partage de la construction = partage de sa liste (cloud uniquement).
  const canShare = !!(window.DXCloud && window.DXCloud.enabled) && !!listId;
  const isProUser = !!(window.DXCloud && window.DXCloud.pro);   // partage réservé à Pro
  const shareList = listId ? { id: listId, name: (lists || []).find(l => l.id === listId)?.name || (moduleCtx && moduleCtx.listName) || 'la construction' } : null;

  function pickExpiry(o) { if (!o) return; setExpiry(o.date); setDuration(Math.max(1, o.dte)); }

  // Préremplir depuis une stratégie déjà construite pour cette liste
  React.useEffect(() => {
    if (!listId) return;
    try {
      const raw = localStorage.getItem('dx-strategy-' + listId);
      if (raw) {
        const s = JSON.parse(raw);
        if (s) {
          setNIndex(s.nIndex || 1); setSizing(s.sizingMethod || 'vega_neutral');
          if (s.weightBasis) setWeightBasis(s.weightBasis);
          if (s.deltaHedge) setDeltaHedge(s.deltaHedge);
          if (!durationOverride) {
            // Reprendre l'échéance réelle si encore dans le futur, sinon défaut
            const dte = s.expiry && window.DXExpiry ? window.DXExpiry.dteTo(s.expiry) : null;
            if (dte != null && dte > 0) { setExpiry(s.expiry); setDuration(dte); }
            else pickExpiry(nearestOpt(s.duration || 30));
          }
        }
      }
    } catch {}
  }, [listId]);

  React.useEffect(() => { if (durationOverride) pickExpiry(nearestOpt(durationOverride)); }, [durationOverride]);

  // Synchronise la barre de contexte (haut de page) avec la liste RÉELLEMENT
  // ouverte : arrivée depuis Opportunités avec un nouveau listId, ou liste
  // renommée ailleurs → le sélecteur affiche la bonne liste et son nom courant.
  React.useEffect(() => {
    if (embedded || !onModuleCtx || !listId) return;
    const l = (lists || []).find(x => x.id === listId);
    if (!l) return;   // liste pas encore chargée → on retentera au prochain lists
    if (moduleCtx?.listId !== listId || moduleCtx?.listName !== l.name) {
      onModuleCtx({ listId, listName: l.name, listIndex: l.index_symbol || 'SPX', index: l.index_symbol || 'SPX', ticker: null });
    }
  }, [listId, lists, embedded]);   // eslint-disable-line react-hooks/exhaustive-deps

  // Charger données marché + grecs locaux (recalcul si durée change)
  React.useEffect(() => {
    if (!hasCtx) return;
    let cancelled = false; setLoading(true);
    (async () => {
      const sg = window.DXRisk && window.DXRisk.straddleGreeks;
      if (!sg) { if (!cancelled) setLoading(false); return; }
      let tickers = []; const weightMap = {};
      try {
        const list = await DXApi.getList(listId);
        const items = list?.items || [];
        tickers = items.map(i => i.ticker).filter(Boolean);
        items.forEach(i => { if (i.ticker) weightMap[i.ticker] = i.weight ?? null; });
      } catch {}
      if (!tickers.length) tickers = ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'META'];

      // Cache : signature basée sur la liste RÉELLE (composants + poids) + indice
      // + durée. Si identique et fraîche (< 15 min), on réutilise → on saute le
      // fetch COÛTEUX (prix, market caps, vol). La liste (léger) est déjà chargée.
      const _sig = listId + '|' + indexSym + '|' + duration + '|' + tickers.map(t => t + ':' + (weightMap[t] ?? '')).join(',');
      const _cached = _constrCache[listId];
      if (_cached && _cached.sig === _sig && Date.now() - _cached.at < CONSTR_TTL) {
        if (!cancelled) { setBase(_cached.base); setLoading(false); }
        return;
      }

      // Prix négociable de l'indice = ETF proxy (QQQ, SPY…), pas le niveau
      // d'indice synthétique : primes, notionnels et hedge collent au broker.
      let indexPrice = 600, indexIV = 18, indexEtf = indexSym, indexSpreadPct = null;
      try {
        const sn = await DXApi.getSnapshot(indexSym);
        if (sn) {
          indexIV = sn.iv_est || indexIV;
          // Spread bid/ask réel du straddle ATM de l'ETF proxy — la jambe BON MARCHÉ de la
          // dispersion. Sert au panneau « Coût réel ». null si non coté → repli sur la table.
          indexSpreadPct = sn.atm_spread_pct ?? null;
          const tr = window.DXProxy ? window.DXProxy.tradableIndex(sn, indexSym) : null;
          if (tr && tr.price) { indexPrice = tr.price; indexEtf = tr.etf; }
          else if (sn.price) indexPrice = sn.price;
        }
      } catch {}

      // Prix + capitalisations boursières + volatilités réelles (en parallèle).
      // La vol vient de la même source que le Volatility Lab (HV Yahoo) — repli
      // synthVol si l'endpoint est indisponible : mêmes chiffres partout.
      const priceMap = {}, mcapMap = {}, volLive = {};
      const [quotes, mcaps, volBatch, impl] = await Promise.all([
        DXApi.batchQuotes(tickers).catch(() => null),
        DXApi.getMarketCaps(tickers).catch(() => null),
        DXApi.getBatchVol(tickers, indexSym).catch(() => null),
        // IV d'option RÉELLE Cboe par composant (même source que le reprix du suivi & le score).
        // Sert d'IV d'entrée → le mark-to-market compare enfin réel↔réel, plus proxy-HV↔réel.
        (DXApi.impliedCorrelation ? DXApi.impliedCorrelation(indexSym, tickers, null, duration).catch(() => null) : Promise.resolve(null)),
      ]);
      (quotes || []).forEach(r => { if (r?.ticker) priceMap[r.ticker] = parseFloat(r.price) || null; });
      (mcaps || []).forEach(r => { if (r?.ticker && r.mcap != null && r.mcap > 0) mcapMap[r.ticker] = r.mcap; });
      (volBatch?.results || []).forEach(r => { if (r?.ticker && !r.error) volLive[r.ticker] = r; });
      // Vraie IV d'option Cboe par nom (repli sur le proxy HV si absente — non-cassant).
      const realIvMap = {};
      if (impl && Array.isArray(impl.per_name)) impl.per_name.forEach(p => { if (p && p.ticker && p.iv > 0) realIvMap[p.ticker] = p.iv; });

      // Poids indice connu (composition réelle) — repli quand pas de market cap.
      const idxComps = window.DXMock?.getComponents ? window.DXMock.getComponents(indexSym) : [];
      const idxWeights = {}; idxComps.forEach(c => { if (c.ticker && c.weight != null) idxWeights[c.ticker] = c.weight; });

      const idxG = sg(indexPrice, indexIV, duration);
      const perTicker = tickers.map(t => {
        const v = window.DXMock?.synthVol ? window.DXMock.synthVol(t, indexSym) : {};
        const live = volLive[t];
        if (live) ['iv_est', 'hv30', 'beta'].forEach(k => { if (live[k] != null) v[k] = live[k]; });
        const price = priceMap[t] || 100;
        // IV = vraie IV d'option Cboe (réelle, comme le suivi/le score) ; repli proxy HV si absente.
        const iv = realIvMap[t] != null ? realIvMap[t] : (v.iv_est != null ? v.iv_est : 30);
        const hv = v.hv30  != null ? v.hv30  : 27;
        const beta = v.beta != null ? v.beta : 1.0;
        const mcap = mcapMap[t] != null ? mcapMap[t] : null;
        const weight = (weightMap[t] != null ? weightMap[t] : (idxWeights[t] != null ? idxWeights[t] : null));
        // spread_pct = spread bid/ask RÉEL du straddle ATM (% du mid), mesuré sur la chaîne Cboe
        // à ~30 j. null si le nom n'est pas coté → le panneau de coût se replie sur DXCostComp.
        return { ticker: t, price, iv, hv, beta, mcap, sector: v.sector || 'Autre', weight, g: sg(price, iv, duration), spreadPct: live?.spread_pct ?? null };
      });
      if (!cancelled) { const _b = { indexSym, indexEtf, indexPrice, indexIV, indexSpreadPct, idxG, perTicker }; _constrCache[listId] = { sig: _sig, base: _b, at: Date.now() }; setBase(_b); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [listId, indexSym, duration]);

  // Dimensionnement : chaque jambe reçoit une part du vega indice selon la
  // base de pondération choisie, puis on convertit cette cible de vega en
  // nombre de contrats entiers.
  // Mesure de taille (priorité) : capitalisation boursière réelle (cap-weighted,
  // valable pour tout ticker) → sinon poids réel de l'indice → sinon estimé par
  // la plus petite taille connue du panier. L'action participe toujours, jamais
  // de valeur aléatoire.
  const sized = React.useMemo(() => {
    if (!base) return null;
    const haveMcap = base.perTicker.some(t => t.mcap > 0);
    // sizeOf renvoie une mesure de taille homogène (cap si dispo, sinon poids idx)
    const sizeRaw = base.perTicker.map(t => haveMcap ? (t.mcap > 0 ? t.mcap : null)
                                                     : (t.weight != null && t.weight > 0 ? t.weight : null));
    const known   = sizeRaw.filter(s => s != null && s > 0);
    const estS    = known.length ? Math.min(...known) : 1;     // titre hors base ≈ plus petit connu
    const resolveW = sizeRaw.map(s => ({ w: (s != null && s > 0) ? s : estS, est: !(s != null && s > 0) }));
    const sumLin   = resolveW.reduce((a, r) => a + r.w, 0) || 1;  // pour le poids % affiché (linéaire)
    // Pondération « Capée » : capitalisation plafonnée à 20 % du vega total
    // par jambe (comme un indice capped) — l'excédent des méga-caps est
    // redistribué proportionnellement aux autres. Évite qu'une dispersion
    // devienne un pari sur 2-3 titres. Si N ≤ 5, le plafond devient 1/N
    // (équipondération, seule répartition possible).
    function capWeights(wNorm, cap) {
      let out = wNorm.slice();
      for (let iter = 0; iter < 20; iter++) {
        const over = out.map(x => x > cap + 1e-9);
        const excess = out.reduce((s, x, i) => s + (over[i] ? x - cap : 0), 0);
        if (excess < 1e-9) break;
        const freeSum = out.reduce((s, x, i) => s + (over[i] ? 0 : x), 0);
        if (freeSum <= 0) break;
        out = out.map((x, i) => (over[i] ? cap : x + excess * (x / freeSum)));
      }
      return out;
    }
    let wNormArr;
    if (weightBasis === 'capped') {
      const lin = resolveW.map(r => r.w);
      const s = lin.reduce((a, b) => a + b, 0) || 1;
      wNormArr = capWeights(lin.map(x => x / s), Math.max(0.20, 1 / lin.length));
    } else {
      const rawW = resolveW.map(r => {
        if (weightBasis === 'equal') return 1;
        return weightBasis === 'variance' ? r.w * r.w : r.w;
      });
      const sumW = rawW.reduce((a, b) => a + b, 0) || 1;
      wNormArr = rawW.map(x => x / sumW);
    }
    const targetVega = base.idxG.vega * nIndex;          // vega à neutraliser
    const comps = base.perTicker.map((t, i) => {
      const wNorm = wNormArr[i];
      const n = (sizing === 'vega_neutral' && t.g.vega > 0)
        ? Math.max(1, Math.round(targetVega * wNorm / t.g.vega))
        : 1;
      return {
        ...t, weightUsed: resolveW[i].w / sumLin * 100, weightEst: resolveW[i].est, share: wNorm * 100,
        nContracts: n, vega: t.g.vega * n, theta: t.g.theta * n, premium: t.g.premium * n,
        delta: t.g.delta1pct * n, gamma: t.g.gammaK * n, notional: t.price * CONTRACT * n,
        // Couverture par jambe : actions du sous-jacent à trader pour annuler
        // le delta de ce straddle (long straddle → delta positif → vendre).
        hedgeShares: -(t.g.deltaSh * CONTRACT * n),
        hedgeNotional: Math.abs(t.g.deltaSh * CONTRACT * n) * t.price,
      };
    });
    const compVega  = comps.reduce((s, c) => s + c.vega, 0);
    const compTheta = comps.reduce((s, c) => s + c.theta, 0);
    const compGamma = comps.reduce((s, c) => s + c.gamma, 0);
    const compPrem  = comps.reduce((s, c) => s + c.premium, 0);
    const compDelta = comps.reduce((s, c) => s + c.delta, 0);
    const idxVega      = base.idxG.vega * nIndex;         // magnitude (jambe short)
    const idxThetaGain = -base.idxG.theta * nIndex;       // short → theta positif
    const idxGamma     = base.idxG.gammaK * nIndex;       // convexité de la jambe indice (short)
    const idxPrem      = base.idxG.premium * nIndex;
    const idxDelta     = -base.idxG.delta1pct * nIndex;   // short → delta opposé
    const netDelta     = compDelta + idxDelta;
    // Couverture : $ delta par contrat de future indice (≈ sous-jacent) pour +1%
    const idxUnitDelta = base.indexPrice * 0.01 * CONTRACT;
    const hedgeUnits   = idxUnitDelta ? -netDelta / idxUnitDelta : 0;  // contrats future indice à trader
    // Couverture par jambe : la jambe indice se neutralise avec son propre future
    const idxLegHedgeUnits  = idxUnitDelta ? -idxDelta / idxUnitDelta : 0;
    const legsHedgeNotional = comps.reduce((s, c) => s + c.hedgeNotional, 0)
      + Math.abs(idxLegHedgeUnits) * base.indexPrice * CONTRACT;
    return {
      comps, compVega, compTheta, compPrem, compDelta,
      idxVega, idxThetaGain, idxPrem, idxDelta, netDelta,
      idxUnitDelta, hedgeUnits, idxLegHedgeUnits, legsHedgeNotional,
      indexHedgeNotional: Math.abs(hedgeUnits) * base.indexPrice * CONTRACT,
      nEstimated: comps.filter(c => c.weightEst).length,
      weightSource: base.perTicker.some(t => t.mcap > 0) ? 'cap' : 'idx',
      // Concentration : part du vega composants portée par la plus grosse jambe
      topComp: comps.reduce((a, c) => (c.vega > (a ? a.vega : -1) ? c : a), null),
      topVegaShare: compVega > 0 ? Math.max(...comps.map(c => c.vega)) / compVega : 0,
      netVega: compVega - idxVega,
      netTheta: compTheta + idxThetaGain,
      // Gamma net $ : long composants (+convexité) − short indice (−convexité).
      compGamma, idxGamma, netGamma: compGamma - idxGamma,
      netPremium: idxPrem - compPrem,
      idxNotional: base.indexPrice * CONTRACT * nIndex,
      compNotional: comps.reduce((s, c) => s + c.notional, 0),
      totalLots: comps.reduce((s, c) => s + c.nContracts, 0),
    };
  }, [base, nIndex, sizing, weightBasis]);

  // ── ρ implicite du panier (source unifiée du site : formule CBOE sur IV réelles, vega-pondérée
  //    — la même que le Correlation Lab, le score et l'auto-chercheur). Sert au seuil de
  //    rentabilité plus bas. Non-bloquant : indisponible → le panneau masque le break-even. ──
  const rhoKey = sized ? sized.comps.map(c => c.ticker).join(',') : '';
  React.useEffect(() => {
    if (!rhoKey || !DXApi.impliedCorrelation) return;
    let cancelled = false;
    DXApi.impliedCorrelation(indexSym, rhoKey.split(','), null, duration)
      .then(r => { if (!cancelled && r && r.rho_impl != null) setImplRho(r.rho_impl); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [rhoKey, indexSym, duration]);

  // ── COÛT RÉEL D'EXÉCUTION (brique 3) ────────────────────────────────────────
  // Le chiffre décisif de toute la recherche : la dispersion est structurellement LONGUE la jambe
  // chère (composants, spread médian ~11,8 % du straddle ATM à 30 j) et COURTE la jambe bon marché
  // (SPY ~0,6 %) — ~19× d'asymétrie sur ce qu'on trade. Mesuré sur vrais spreads ThetaData
  // 2022-2026, krachs inclus (backtest/NETCOST_REPORT.md). On le rend visible AVANT le trade.
  //
  // Source du spread, par ordre de préférence :
  //   1. RÉEL du jour — chaîne Cboe (base.perTicker[].spreadPct, ~30 j)
  //   2. Historique — window.DXCostComp (médiane 2022-2026) si le nom n'est pas coté
  //   3. Rien — la jambe est marquée non chiffrable et le total n'est PAS affiché (jamais de
  //      coût sous-estimé : l'utilisateur en tirerait la conclusion inverse de la bonne).
  const costModel = React.useMemo(() => {
    if (!base || !sized || !window.DXCost) return null;
    const { legCost, basketCost, rhoBreakeven } = window.DXCost;
    const TAB = window.DXCostComp || {};
    // La table porte les tenors [30,60,90] ; le spread live est mesuré à ~30 j quel que soit le
    // DTE choisi. On corrige donc le live par la déformation MESURÉE du spread avec l'échéance
    // (sp[tenor]/sp[30]) : sans ça, un trade à 60 j verrait son coût surestimé de ~30 %.
    const ti = duration <= 45 ? 0 : duration <= 75 ? 1 : 2;
    const tenorLabel = [30, 60, 90][ti];
    const spreadOf = (ticker, live) => {
      const tab = TAB[ticker];
      if (live != null && live > 0) {
        const scale = (tab && tab.sp[0] > 0) ? tab.sp[ti] / tab.sp[0] : 1;
        return { sp: live * scale, src: 'live' };
      }
      if (tab && tab.sp[ti] > 0) return { sp: tab.sp[ti], src: 'hist' };
      return { sp: null, src: null };
    };

    const legs = sized.comps.map(c => {
      const { sp, src } = spreadOf(c.ticker, c.spreadPct);
      return { ticker: c.ticker, sp, src, cost: legCost({ spreadPct: sp, straddlePremium: c.g.premium, contracts: c.nContracts, fill }) };
    });
    const idxSpread = spreadOf(base.indexEtf || base.indexSym, base.indexSpreadPct);
    const idxCost = legCost({ spreadPct: idxSpread.sp, straddlePremium: base.idxG.premium, contracts: nIndex, fill });
    if (idxCost == null || legs.some(l => l.cost == null)) {
      return { unpriced: legs.filter(l => l.cost == null).map(l => l.ticker).concat(idxCost == null ? [base.indexEtf || base.indexSym] : []) };
    }

    const bc = basketCost({ compLegs: legs, indexCost: idxCost, vegaIndex: sized.idxVega });
    if (!bc) return null;

    // ── Coût d'exécution de la COUVERTURE Δ (spread des actions/future) ──
    // Petit vs les options, mais réel : on franchit aussi le bid/ask sur l'ETF (mode indice)
    // ou les actions (mode par jambe) de couverture. Spread equity ≈ 4 bps aller-retour sur
    // sous-jacents liquides — estimation honnête, faute de flux equity live. 0 si pas de couverture.
    const HEDGE_SPREAD = 0.0004;
    const hedgeNotional = deltaHedge === 'index' ? (sized.indexHedgeNotional || 0)
                        : deltaHedge === 'legs'  ? (sized.legsHedgeNotional || 0) : 0;
    const hedgeCost = Number((hedgeNotional * HEDGE_SPREAD).toFixed(1));
    const totalAll = Number((bc.total + hedgeCost).toFixed(1));

    // Seuil de rentabilité : jusqu'où la corrélation réalisée doit tomber, sous ce que le marché
    // price, pour que le trade couvre juste son spread. Poids = ceux du trade (répartition du vega
    // choisie), σ = les IV réelles → cohérent avec le panier réellement construit.
    const names = sized.comps.map(c => ({ w: c.share / 100, sigma: c.iv / 100 }));

    // ── Représentativité du panier (garde-fou) ──
    // La formule CBOE ne vaut que pour un panier qui RÉPLIQUE l'indice. Son terme B = Σwᵢ²σᵢ²
    // décroît en 1/N : sur un petit panier B approche σ_I², et ρ_impl s'effondre MÉCANIQUEMENT
    // (σ_I 14 %, composants ~28 % → ρ_impl = 0,22 à 30 noms, 0,17 à 10, 0,06 à 5, clamp à 3).
    // Sans ce garde-fou, une liste de 5 noms afficherait « rentabilité inatteignable » à cause
    // d'un artefact de formule, pas du marché — le faux verdict que ce panneau doit combattre.
    // Mesure : nombre EFFECTIF de noms (Herfindahl inverse), qui pénalise aussi la concentration —
    // 30 noms dont un pèse 80 % ne réplique pas davantage l'indice. Nos backtests : 29-30 noms.
    const nEff = 1 / names.reduce((s, n) => s + n.w * n.w, 0);
    const REPRESENTATIVE_MIN = 12;   // sous ce seuil, le biais dépasse ~20 % → on n'affiche pas
    const representative = nEff >= REPRESENTATIVE_MIN;

    // ── Neutralité vega (2ᵉ garde-fou) ──
    // Tout ce modèle exprime le P&L par $1 de vega INDICE : le gain de dispersion vient du short
    // indice qui réalise moins que son implicite quand la corrélation baisse. Ça ne tient que si
    // le vega des composants compense celui de l'indice. Si le panier est net long vega (cas
    // courant : `nContracts` a un plancher à 1 contrat, donc 30 jambes contre 1 lot d'indice
    // pèsent ~10× le vega indice), le P&L est piloté par la volatilité des composants et plus du
    // tout par la corrélation → le seuil de rentabilité, lui, deviendrait faux.
    const vegaBalanced = Math.abs(sized.netVega) <= 0.25 * sized.idxVega;
    const be = (implRho != null && representative && vegaBalanced)
      ? rhoBreakeven({ rhoImpl: implRho, names, vegaIndex: sized.idxVega, cost: totalAll }) : null;
    // Marge MAXIMALE théoriquement captable : la vol que l'indice perdrait si la corrélation
    // passait de ce que le marché price à zéro (le meilleur cas absolu d'une dispersion). Si le
    // spread dépasse ça, le trade est perdant par construction — le chiffre qui le dit.
    const sImpl = implRho != null ? window.DXCost.sigmaIndexAt(implRho, names) : null;
    const maxCapturePts = (sImpl != null && be) ? sImpl * 100 - be.floorSigmaPts : null;
    // Prime de corrélation à capturer (en points) = ce que ρ doit céder rien que pour rentrer dans
    // ses frais. On la situe dans SON histoire via la même baseline que le panneau Régime du
    // Correlation Lab → « ce trade exige une prime au Xᵉ percentile juste pour couvrir le spread ».
    const bl = (window.DXCorrBaseline || {})[(indexSym || 'SPX').toUpperCase()];
    const needPremiumPts = (be && be.reachable && implRho != null) ? (implRho - be.rho) * 100 : null;
    let needPct = null;
    if (bl && needPremiumPts != null) {
      const q = bl.premiumPts;
      if (needPremiumPts <= q[0]) needPct = 0;
      else if (needPremiumPts >= q[q.length - 1]) needPct = 100;
      else for (let i = 0; i < q.length - 1; i++) {
        if (needPremiumPts >= q[i] && needPremiumPts <= q[i + 1]) {
          const span = q[i + 1] - q[i];
          needPct = i * 5 + (span > 0 ? (needPremiumPts - q[i]) / span * 5 : 0);
          break;
        }
      }
    }
    const nLive = legs.filter(l => l.src === 'live').length;
    return {
      legs, idxSpread, ...bc, total: totalAll, optionCost: bc.total, hedgeCost, be, needPremiumPts, needPct, tenorLabel, maxCapturePts,
      nEff, representative, REPRESENTATIVE_MIN, vegaBalanced,
      medianPremiumPts: bl ? bl.premiumPts[10] : null,
      baseline: bl,
      nLive, nHist: legs.length - nLive,
      // % de la prime nette encaissée que le spread (options + couverture Δ) consomme.
      premiumBurn: sized.netPremium > 0 ? totalAll / sized.netPremium : null,
    };
  }, [base, sized, duration, fill, nIndex, implRho, indexSym, deltaHedge]);

  // ── Échéances COMMUNES à tous les sous-jacents, calculées 1× au chargement ──
  // Dès que le panier est prêt, on récupère (sur la vraie chaîne d'options Cboe)
  // les échéances cotées par TOUTES les actions, et on propose les 4 dates les
  // plus proches de 15/30/45/60 j. L'utilisateur choisit alors parmi des dates
  // déjà valables pour tout le monde → aucune vérification/ajustement ailleurs :
  // `s.expiry` est universelle et tout le site (suivi, monitor, DTE, reprise,
  // export IBKR) suit. Une seule requête par panier (garde `optsRef`).
  // Non-cassant : indisponible → repli calendaire (vendredis). Vaut aussi pour
  // le Builder (Construction embarquée avec durationOverride).
  const compKey = sized ? sized.comps.map(c => c.ticker).join(',') : '';
  const optsRef = React.useRef('');   // panier déjà résolu → une seule requête
  React.useEffect(() => {
    if (!base || !compKey || optsRef.current === compKey || !(window.DXIbkr && window.DXIbkr.resolveCommonExpiries)) { setExpiryChecking(false); return; }
    let cancelled = false;
    setExpiryChecking(true);
    const symbols = [base.indexEtf || base.indexSym, ...compKey.split(',')];
    window.DXIbkr.resolveCommonExpiries(symbols).then(list => {
      if (cancelled) return;
      setExpiryChecking(false);
      optsRef.current = compKey;
      const opts = (list && list.length && window.DXExpiry) ? window.DXExpiry.optionsFromDates(list, TARGETS) : [];
      if (!opts.length) return;                       // indispo → on garde le repli calendaire
      setExpiryOpts(opts);
      setExpiryCommon(true);
      // Cale l'échéance courante sur une option universelle (la plus proche de
      // la durée visée) si elle n'en fait pas déjà partie.
      if (!opts.some(o => o.date === expiry)) {
        const target = durationOverride || duration || 30;
        const pick = opts.reduce((b, o) => (!b || Math.abs(o.dte - target) < Math.abs(b.dte - target) ? o : b), null);
        if (pick) { setExpiry(pick.date); setDuration(pick.dte); }
      }
    }).catch(() => { if (!cancelled) setExpiryChecking(false); });
    return () => { cancelled = true; };
  }, [base, compKey]);   // eslint-disable-line react-hooks/exhaustive-deps

  function buildStrategy() {
    if (!base || !sized) return null;
    return {
      listId, listName: (lists || []).find(l => l.id === listId)?.name || (moduleCtx && moduleCtx.listName) || null,
      index: base.indexSym, indexEtf: base.indexEtf, indexPrice: base.indexPrice,
      duration, expiry, builtAt: new Date().toISOString(),
      nIndex, sizingMethod: sizing, weightBasis, deltaHedge,
      // Contrats de future indice à trader : couverture globale (index) ou de la
      // seule jambe indice (legs — les composants sont couverts en actions).
      hedgeUnits: deltaHedge === 'index' ? sized.hedgeUnits : (deltaHedge === 'legs' ? sized.idxLegHedgeUnits : 0),
      hedgeNotional: deltaHedge === 'index' ? sized.indexHedgeNotional : (deltaHedge === 'legs' ? sized.legsHedgeNotional : 0),
      components: sized.comps.map(c => ({
        ticker: c.ticker, price: c.price, iv: c.iv, hv: c.hv, beta: c.beta,
        sector: c.sector, weight: c.weightUsed, weightEst: c.weightEst, nContracts: c.nContracts,
        vega: c.vega, theta: c.theta, premium: c.premium, delta: c.delta,
        hedgeShares: deltaHedge === 'legs' ? c.hedgeShares : 0,
      })),
      portfolio: {
        idxVega: sized.idxVega, idxTheta: sized.idxThetaGain, idxPrem: sized.idxPrem,
        compVega: sized.compVega, compTheta: sized.compTheta, compPrem: sized.compPrem,
        netVega: sized.netVega, netTheta: sized.netTheta, netGamma: sized.netGamma, netPremium: sized.netPremium,
        idxDelta: sized.idxDelta, compDelta: sized.compDelta,
        netDelta: deltaHedge !== 'none' ? 0 : sized.netDelta,
        netDeltaRaw: sized.netDelta,
        idxVegaPerLot: base.idxG.vega, idxThetaPerLot: -base.idxG.theta, idxPremPerLot: base.idxG.premium,
        idxIV: base.indexIV,   // IV d'entrée de l'indice — pour la reprise réelle (mark-to-market)
      },
    };
  }

  function save(goRisk) {
    const s = buildStrategy();
    if (!s || !listId) return;
    persistStrategy(listId, s);
    setSavedTick(t => t + 1);
    if (onSaved) onSaved(s);
    if (goRisk && onNav) onNav('risk', { listId });
  }

  // Export : télécharge la stratégie courante en .json (ré-importable).
  function exportStrategy() {
    if (!isProUser) { addToast && addToast("Le téléchargement de stratégie est réservé à l'offre Pro.", 'info'); onNav && onNav('pricing'); return; }
    const s = buildStrategy();
    if (!s) return;
    const blob = new Blob([JSON.stringify(s, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `dx-strategie-${s.index}-${(s.expiry || '').replace(/-/g, '') || s.duration + 'j'}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // Import : recharge une stratégie exportée dans la liste courante — les
  // réglages (contrats, sizing, pondération, couverture, échéance) sont
  // adoptés et la stratégie est enregistrée telle quelle pour cette liste.
  function importStrategy(file) {
    if (!isProUser) { addToast && addToast("L'import de stratégie est réservé à l'offre Pro.", 'info'); onNav && onNav('pricing'); return; }
    if (!file || !listId) return;
    file.text().then(txt => {
      let s = null;
      try { s = JSON.parse(txt); } catch {}
      if (!s || !Array.isArray(s.components) || !s.portfolio) {
        setImportMsg({ tone: 'err', text: 'Fichier invalide — attendu : un export de stratégie DispersionX (.json).' });
        return;
      }
      s.listId = listId;   // la stratégie importée s'applique à la liste courante
      persistStrategy(listId, s);
      setNIndex(s.nIndex || 1);
      setSizing(s.sizingMethod || 'vega_neutral');
      if (s.weightBasis) setWeightBasis(s.weightBasis);
      setDeltaHedge(s.deltaHedge || 'none');
      if (!durationOverride) {
        const dte = s.expiry && window.DXExpiry ? window.DXExpiry.dteTo(s.expiry) : null;
        if (dte != null && dte > 0) { setExpiry(s.expiry); setDuration(dte); }
        else pickExpiry(nearestOpt(s.duration || 30));
      }
      setSavedTick(t => t + 1);
      if (onSaved) onSaved(s);
      setImportMsg({ tone: 'ok', text: `Stratégie importée (${s.index} · ${(s.components || []).length} composants) — réglages adoptés et enregistrés pour cette liste.` });
    }).catch(() => setImportMsg({ tone: 'err', text: 'Lecture du fichier impossible.' }));
  }

  // Embarqué dans le Builder : on persiste automatiquement à chaque ajustement,
  // pour que l'étape de synthèse dispose toujours de la stratégie courante.
  React.useEffect(() => {
    if (!embedded || !sized || !listId) return;
    const s = buildStrategy();
    if (!s) return;
    persistStrategy(listId, s);
    if (onSaved) onSaved(s);
  }, [embedded, sized, listId, deltaHedge, expiry]);

  // ── États sans contexte ──
  if (!hasCtx) {
    if (embedded) {
      return (
        <div style={{ padding: 28, textAlign: 'center', background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)', color: 'var(--text-muted)', font: 'var(--type-body-sm)' }}>
          Sélectionnez une liste de composants pour dimensionner la position.
        </div>
      );
    }
    return (
      <window.ModuleCtxPicker
        lists={lists}
        onCtx={upd => onModuleCtx && onModuleCtx(upd)}
        title="Construction"
        subtitle="Répartissez les contrats de votre dispersion : short straddle indice + long straddles composants, dimensionnés vega-neutre. La stratégie alimente ensuite le Risk Lab."
      />
    );
  }

  if (loading || !sized) return (
    window.DXLoader ? (
      <window.DXLoader title="Construction de la stratégie" steps={[
        'Récupération des cours et de la volatilité réelle (Cboe)…',
        'Calcul des grecs de chaque jambe (indice + composants)…',
        'Dimensionnement vega-neutre du panier…',
        'Recherche des échéances cotées par tous les sous-jacents…',
      ]} />
    ) : (
      <div style={{ padding: 80, textAlign: 'center', color: 'var(--text-muted)', font: 'var(--type-body)' }}>Calcul du dimensionnement…</div>
    )
  );

  // Libellé de la jambe indice : l'ETF réellement tradé (QQQ, SPY…) + l'indice
  const idxLabel = base.indexEtf && base.indexEtf !== base.indexSym ? `${base.indexEtf} (${base.indexSym})` : base.indexSym;

  const BtnStyle = { width: 34, height: 34, borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text)', font: '700 18px/1 var(--font-mono)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: embedded ? 16 : 24 }}>

      {!embedded && lists && onModuleCtx && ctx.listId && (
        <window.ModuleCtxBar ctx={ctx} lists={lists}
          onCtx={upd => { onModuleCtx(upd); if (upd.listId && upd.listId !== listId && onNav) onNav('construction', { listId: upd.listId }); }}
          onClear={() => { onModuleCtx({ listId: null, listName: null }); if (onNav) onNav('construction'); }} />
      )}

      {!embedded && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ font: 'var(--type-h1)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: '0 0 6px' }}>Construction</h1>
            <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)', margin: 0, maxWidth: 660 }}>
              Combien de contrats par jambe ? On fixe le short straddle indice, puis on dimensionne les long straddles composants pour neutraliser le vega. Quasi delta-neutre (straddles ATM) — le résidu directionnel se mesure et se couvre plus bas.
            </p>
          </div>
        </div>
      )}

      {mode === 'Débutant' && !embedded && (
        <BeginnerExplanationBox>
          La position est <strong>quasi delta-neutre</strong> (straddles ATM, peu sensibles à un petit mouvement directionnel) — le résidu se couvre dans la section « Neutraliser le delta ». Le sizing <strong>vega-neutre</strong> ajuste le nombre de contrats composants pour que leur sensibilité à la volatilité compense celle de la jambe indice short — il ne reste que le pari sur la <strong>dispersion</strong> et la corrélation.
        </BeginnerExplanationBox>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.25fr', gap: 18, alignItems: 'start' }}>
        {/* ── Config ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Jambe indice */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
            <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 12 }}>Jambe indice · short straddle {idxLabel}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <button onClick={() => setNIndex(n => Math.max(1, n - 1))} style={BtnStyle}>−</button>
              <input type="number" min={1} max={999} value={nIndex}
                onChange={e => { const v = parseInt(e.target.value, 10); setNIndex(isNaN(v) ? 1 : Math.max(1, Math.min(999, v))); }}
                style={{ font: '800 38px/1 var(--font-mono)', color: 'var(--text)', width: 96, textAlign: 'center', background: 'transparent', border: 'none', borderBottom: '2px solid var(--border)', outline: 'none', MozAppearance: 'textfield' }} />
              <button onClick={() => setNIndex(n => Math.min(999, n + 1))} style={BtnStyle}>+</button>
              <div style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', marginLeft: 4 }}>contrat{nIndex > 1 ? 's' : ''} <span style={{ color: 'var(--text-dim)' }}>(saisie directe possible · max 999)</span></div>
            </div>
            <div style={{ marginTop: 12, padding: '8px 10px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius)', font: 'var(--type-caption)', color: 'var(--text-muted)' }}>
              Vega short : <strong style={{ color: 'var(--neg-bright)' }}>−{dxN(sized.idxVega)} {dxSym()}/1%</strong> · Theta : <strong style={{ color: 'var(--pos-bright)' }}>+{dxN(sized.idxThetaGain)} {dxSym()}/j</strong> · Notionnel {fmtNot(sized.idxNotional)}
            </div>
          </div>

          {/* Échéance — vraies dates d'expiration options (vendredis) */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
            <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 4 }}>Échéance{durationOverride ? ' (définie dans le Builder)' : ''}</div>
            <div style={{ font: 'var(--type-caption)', color: 'var(--text-dim)', marginBottom: 12 }}>
              {expiryCommon
                ? <>Dates les plus proches de 15/30/45/60 j <strong style={{ color: 'var(--pos-bright)' }}>cotées par TOUS les sous-jacents</strong> — exécutables à la même échéance. Le DTE, le suivi et l'export IBKR sont comptés par rapport à cette date.</>
                : <>Vendredis d'expiration proches de 15/30/45/60 j.{expiryChecking ? ' Recherche des dates cotées par tous les sous-jacents…' : ''} Le DTE et le suivi sont comptés par rapport à cette date.</>}
            </div>
            {expiryChecking && (
              <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8, font: 'var(--type-caption)', color: 'var(--text-muted)' }}>
                <span className="dx-pulse" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--warn)', flexShrink: 0 }} />
                Calcul des échéances cotées par tous les sous-jacents…
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {expiryOpts.map(o => {
                const on = expiry === o.date;
                return (
                  <button key={o.date} onClick={() => !durationOverride && pickExpiry(o)} disabled={!!durationOverride}
                    style={{ flex: 1, minWidth: 84, padding: '9px 4px', borderRadius: 'var(--radius)', border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}`, background: on ? 'var(--accent-soft)' : 'transparent', color: on ? 'var(--accent-hover)' : 'var(--text-soft)', cursor: durationOverride ? 'default' : 'pointer', textAlign: 'center' }}>
                    <div style={{ font: '700 12px/1 var(--font-mono)' }}>{window.DXExpiry ? window.DXExpiry.fmtExpiry(o.date).replace(/ \d{4}$/, '') : o.date}</div>
                    <div style={{ font: '9px/1.4 var(--font-mono)', color: expiryCommon ? 'var(--pos-bright)' : (o.monthly ? 'var(--pos-bright)' : 'var(--text-dim)'), marginTop: 3 }}>{o.dte} DTE{expiryCommon ? '' : (o.monthly ? ' · mensuel ✓' : ' · hebdo')}</div>
                  </button>
                );
              })}
            </div>
            {expiry && (
              <div style={{ marginTop: 10, font: 'var(--type-caption)', color: 'var(--text-muted)' }}>
                Expiration : <strong style={{ color: 'var(--text)' }}>{window.DXExpiry ? window.DXExpiry.fmtExpiry(expiry) : expiry}</strong> · {duration} jours restants{expiryCommon ? <span style={{ color: 'var(--pos-bright)' }}> · cotée par tous les sous-jacents</span> : null}
              </div>
            )}
          </div>

          {/* Sizing */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
            <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 12 }}>Méthode de sizing</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { v: 'vega_neutral', label: 'Vega-neutre', desc: 'n_i = round(vega_indice × poids_i / vega_i). Sensibilité IV des composants ≈ celle de l\'indice short.' },
                { v: 'equal_weight', label: 'Poids égaux · 1 lot', desc: '1 contrat par composant. Simple, mais vega déséquilibré si les IV diffèrent.' },
              ].map(opt => (
                <div key={opt.v} onClick={() => setSizing(opt.v)} style={{ display: 'flex', gap: 10, padding: '12px 14px', borderRadius: 'var(--radius)', border: `1px solid ${sizing === opt.v ? 'var(--accent)' : 'var(--border)'}`, background: sizing === opt.v ? 'var(--bg-elevated)' : 'transparent', cursor: 'pointer' }}>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${sizing === opt.v ? 'var(--accent)' : 'var(--text-dim)'}`, marginTop: 1, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {sizing === opt.v && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }} />}
                  </div>
                  <div>
                    <div style={{ font: 'var(--type-title)', color: 'var(--text)', marginBottom: 2 }}>{opt.label}</div>
                    <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)' }}>{opt.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pondération du panier */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 18, opacity: sizing === 'vega_neutral' ? 1 : 0.5 }}>
            <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 4 }}>Pondération du panier</div>
            <div style={{ font: 'var(--type-caption)', color: 'var(--text-dim)', marginBottom: 12 }}>Comment répartir le vega entre composants. « Capée 20 % » (recommandée) : par {sized.weightSource === 'cap' ? 'capitalisation' : 'poids indice'} mais plafonnée à 20 % par jambe — les méga-caps ne monopolisent pas la dispersion. Vega-neutre uniquement.</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { v: 'capped', label: 'Capée 20 %', sub: 'min(w_i, 20 %)' },
                { v: 'index', label: sized.weightSource === 'cap' ? 'Capitalisation' : 'Poids indice', sub: 'w_i' },
                { v: 'variance', label: 'Variance', sub: 'w_i²' },
                { v: 'equal', label: 'Égale', sub: '1/N' },
              ].map(opt => {
                const on = weightBasis === opt.v;
                return (
                  <button key={opt.v} onClick={() => sizing === 'vega_neutral' && setWeightBasis(opt.v)} disabled={sizing !== 'vega_neutral'}
                    style={{ flex: 1, padding: '10px 6px', borderRadius: 'var(--radius)', border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}`, background: on ? 'var(--accent-soft)' : 'transparent', color: on ? 'var(--accent-hover)' : 'var(--text-soft)', cursor: sizing === 'vega_neutral' ? 'pointer' : 'default', textAlign: 'center' }}>
                    <div style={{ font: '600 12px/1 var(--font-sans)' }}>{opt.label}</div>
                    <div style={{ font: '9px/1.4 var(--font-mono)', color: 'var(--text-dim)', marginTop: 3 }}>{opt.sub}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Aperçu des quantités ── */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '11px 16px', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
            <span style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Répartition des contrats · {sized.comps.length} composants · poids {sized.weightSource === 'cap' ? 'capitalisation réelle' : 'indice'}{sized.nEstimated > 0 ? ` (${sized.nEstimated} estimé${sized.nEstimated > 1 ? 's' : ''})` : ''}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 58px 50px 74px 86px', padding: '7px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
            {['Composant', 'Poids', 'Lots', 'Vega/lot', 'Total vega'].map(h => (
              <span key={h} style={{ font: '600 9px/1 var(--font-mono)', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em', textAlign: h === 'Composant' ? 'left' : 'right' }}>{h}</span>
            ))}
          </div>
          {sized.comps.map((c, i) => (
            <div key={c.ticker} style={{ display: 'grid', gridTemplateColumns: '1fr 58px 50px 74px 86px', padding: '9px 16px', borderBottom: i < sized.comps.length - 1 ? '1px solid var(--border-subtle)' : 'none', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                <div style={{ width: 18, height: 18, borderRadius: 4, background: 'var(--bg-elevated)', border: '1px solid var(--border)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={`https://assets.parqet.com/logos/symbol/${c.ticker.split('.')[0]}`} alt="" style={{ width: 13, height: 13, objectFit: 'contain' }} onError={e => { e.currentTarget.style.display = 'none'; }} />
                </div>
                <span style={{ font: '600 12px/1 var(--font-mono)', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.ticker}</span>
              </div>
              <span style={{ font: '11px/1 var(--font-mono)', color: c.weightEst ? 'var(--text-dim)' : 'var(--text-soft)', textAlign: 'right' }} title={c.weightEst ? 'Poids estimé (hors base connue) — plus petite taille connue du panier' : (sized.weightSource === 'cap' ? 'Poids réel par capitalisation' : 'Poids réel dans l\'indice')}>{(c.weightEst ? '~' : '') + c.weightUsed.toFixed(1) + '%'}</span>
              <span style={{ font: '700 13px/1 var(--font-mono)', color: 'var(--accent)', textAlign: 'right' }}>{c.nContracts}</span>
              <span style={{ font: '11px/1 var(--font-mono)', color: 'var(--text-muted)', textAlign: 'right' }}>+{dxN(c.g.vega)} {dxSym()}</span>
              <span style={{ font: '600 11px/1 var(--font-mono)', color: 'var(--pos-bright)', textAlign: 'right' }}>+{dxN(c.vega)} {dxSym()}/1%</span>
            </div>
          ))}
          {/* Totaux */}
          <div style={{ padding: '11px 16px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', font: 'var(--type-caption)', color: 'var(--text-muted)' }}>
              <span>Vega composants (long)</span><span style={{ color: 'var(--pos-bright)', fontWeight: 700 }}>+{dxN(sized.compVega)} {dxSym()}/1%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', font: 'var(--type-caption)', color: 'var(--text-muted)' }}>
              <span>Vega indice (short · {nIndex} lot{nIndex > 1 ? 's' : ''})</span><span style={{ color: 'var(--neg-bright)', fontWeight: 700 }}>−{dxN(sized.idxVega)} {dxSym()}/1%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', font: '700 12px/1 var(--font-mono)', marginTop: 3, paddingTop: 7, borderTop: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-soft)' }}>Vega net</span>
              <span style={{ color: Math.abs(sized.netVega) < 60 ? 'var(--pos-bright)' : 'var(--warn-bright)' }}>{fmtS(sized.netVega)} {dxSym()}/1% {Math.abs(sized.netVega) < 60 ? '· neutre ✓' : ''}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Récap grecs ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
        <MetricCard label="Vega net" value={fmtS(sized.netVega) + ' $/1%'} hint={Math.abs(sized.netVega) < 60 ? 'Quasi-neutre ✓' : 'À rééquilibrer'} accent={Math.abs(sized.netVega) < 60 ? 'var(--pos)' : 'var(--warn)'} />
        <MetricCard label="Delta net" value={fmtS(deltaHedge !== 'none' ? 0 : sized.netDelta) + ' $/1%'} hint={deltaHedge === 'index' ? 'Couvert · ETF indice' : deltaHedge === 'legs' ? 'Couvert · par jambe' : (Math.abs(sized.netDelta) < 50 ? 'Résidu faible' : 'Non couvert')} accent={deltaHedge !== 'none' || Math.abs(sized.netDelta) < 50 ? 'var(--pos)' : 'var(--warn)'} />
        <MetricCard label="Theta net /jour" value={fmtS(sized.netTheta) + ' $'} hint={sized.netTheta >= 0 ? 'Portage positif' : 'Coût de portage'} accent="var(--warn)" />
        <MetricCard label="Prime nette" value={fmtMoney(sized.netPremium)} hint={sized.netPremium >= 0 ? 'Crédit net' : 'Débit net'} accent="var(--accent)" />
        <MetricCard label="Lots composants" value={String(sized.totalLots)} hint={'Notionnel ' + fmtNot(sized.compNotional)} accent="var(--info)" />
      </div>

      {/* Note poids estimés */}
      {sized.nEstimated > 0 && (
        <div style={{ font: 'var(--type-caption)', color: 'var(--text-dim)', display: 'flex', gap: 6, alignItems: 'baseline' }}>
          <span style={{ color: 'var(--warn)', fontWeight: 700 }}>~</span>
          <span>{sized.nEstimated} composant(s) hors base de poids connue : poids estimé (plus petit poids connu du panier) — jamais ignoré dans le sizing. Pour un poids exact, partez d'une liste issue d'un indice, ou choisissez la base « Égale ».</span>
        </div>
      )}

      {/* Alerte de concentration : une jambe domine le vega composants */}
      {sizing === 'vega_neutral' && sized.topVegaShare > 0.35 && sized.topComp && (
        <WarningPanel tone="warn" title="Concentration du vega">
          <strong>{sized.topComp.ticker}</strong> porte {Math.round(sized.topVegaShare * 100)} % du vega composants — la « dispersion » repose surtout sur ce titre (un seul earnings domine le P&L).
          {weightBasis !== 'capped' ? ' Passez à la pondération « Capée 20 % » pour répartir le pari.' : ' Ajoutez des composants pour mieux répartir le pari.'}
        </WarningPanel>
      )}

      {/* ── Delta de la stratégie / couverture ── */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
          <div style={{ maxWidth: 460 }}>
            <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Delta de la stratégie</div>
            <div style={{ font: 'var(--type-caption)', color: 'var(--text-dim)', marginTop: 3 }}>Exposition directionnelle nette ($ de P&L pour +1 % du sous-jacent). Les straddles ATM sont quasi delta-neutres, mais un résidu subsiste (vol des composants ≠ vol indice) — on peut l'annuler.</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ font: '800 22px/1 var(--font-mono)', color: Math.abs(deltaHedge !== 'none' ? 0 : sized.netDelta) < 50 ? 'var(--pos-bright)' : 'var(--warn-bright)' }}>{fmtS(deltaHedge !== 'none' ? 0 : sized.netDelta)} {dxSym()}/1%</div>
            <div style={{ font: 'var(--type-caption)', color: 'var(--text-dim)' }}>delta net {deltaHedge === 'index' ? '· couvert (ETF indice)' : deltaHedge === 'legs' ? '· couvert (par jambe)' : 'global'}</div>
          </div>
        </div>

        {/* Décomposition par jambe */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${deltaHedge !== 'none' ? 5 : 3}, 1fr)`, gap: 10, marginBottom: 16 }}>
          {[
            { l: 'Composants (long)', v: sized.compDelta, c: 'var(--pos-bright)' },
            { l: 'Indice (short)', v: sized.idxDelta, c: 'var(--neg-bright)' },
            { l: 'Net (avant couverture)', v: sized.netDelta, c: Math.abs(sized.netDelta) < 50 ? 'var(--pos-bright)' : 'var(--warn-bright)' },
            ...(deltaHedge !== 'none' ? [
              { l: deltaHedge === 'index' ? 'Couverture (ETF)' : 'Couverture (par jambe)', v: -sized.netDelta, c: 'var(--info)' },
              { l: 'Net final (couvert)', v: 0, c: 'var(--pos-bright)' },
            ] : []),
          ].map(d => (
            <div key={d.l} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 10px' }}>
              <div style={{ font: '9px/1 var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', marginBottom: 5 }}>{d.l}</div>
              <div style={{ font: '700 13px/1 var(--font-mono)', color: d.c }}>{fmtS(d.v)} {dxSym()}/1%</div>
            </div>
          ))}
        </div>

        {/* Choix de couverture */}
        <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 8 }}>Neutraliser le delta</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: deltaHedge !== 'none' ? 12 : 0 }}>
          {[
            { v: 'none', label: 'Aucune', sub: 'garder le résidu' },
            { v: 'index', label: 'Par l\'indice', sub: 'ETF indice · global' },
            { v: 'legs', label: 'Par sous-jacent', sub: 'actions + future · par jambe' },
          ].map(opt => {
            const on = deltaHedge === opt.v;
            return (
              <button key={opt.v} onClick={() => setDeltaHedge(opt.v)}
                style={{ flex: 1, padding: '10px 6px', borderRadius: 'var(--radius)', border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}`, background: on ? 'var(--accent-soft)' : 'transparent', color: on ? 'var(--accent-hover)' : 'var(--text-soft)', cursor: 'pointer', textAlign: 'center' }}>
                <div style={{ font: '600 12px/1 var(--font-sans)' }}>{opt.label}</div>
                <div style={{ font: '9px/1.4 var(--font-mono)', color: 'var(--text-dim)', marginTop: 3 }}>{opt.sub}</div>
              </button>
            );
          })}
        </div>

        {deltaHedge === 'index' && (
          <div style={{ padding: '10px 12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius)', font: 'var(--type-body-sm)', color: 'var(--text-soft)' }}>
            {Math.abs(sized.hedgeUnits * CONTRACT) < 0.5 ? (
              <>Le delta net est déjà quasi nul — aucune couverture à trader.</>
            ) : (
              <>Ordre de couverture : <strong style={{ color: 'var(--text)' }}>{sized.hedgeUnits >= 0 ? 'acheter' : 'vendre'} {Math.round(Math.abs(sized.hedgeUnits) * CONTRACT)} action(s) {base.indexEtf}</strong> (≈ {fmtNot(sized.indexHedgeNotional)} de notionnel, soit {fmtQty(sized.hedgeUnits)} lot(s) de {CONTRACT}) pour annuler le delta net de {fmtS(sized.netDelta)} {dxSym()}/1% → <strong style={{ color: 'var(--pos-bright)' }}>delta net final ≈ 0</strong>. La couverture est intégrée à la stratégie enregistrée et reprise par le Risk Lab.</>
            )}
          </div>
        )}
        {deltaHedge === 'legs' && (
          <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
            <div style={{ padding: '10px 12px', font: 'var(--type-body-sm)', color: 'var(--text-soft)', borderBottom: '1px solid var(--border-subtle)' }}>
              Couverture <strong>jambe par jambe</strong> : chaque straddle est neutralisé par son propre sous-jacent (actions pour les composants, future pour l'indice) → <strong style={{ color: 'var(--pos-bright)' }}>delta net ≈ 0</strong>. Total ≈ <strong style={{ color: 'var(--text)' }}>{fmtNot(sized.legsHedgeNotional)}</strong> de notionnel directionnel. Intégrée à la stratégie enregistrée et reprise par le Risk Lab.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 110px', padding: '7px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
              {['Jambe', 'Ordre', 'Notionnel'].map(h => (
                <span key={h} style={{ font: '600 9px/1 var(--font-mono)', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em', textAlign: h === 'Jambe' ? 'left' : 'right' }}>{h}</span>
              ))}
            </div>
            {sized.comps.map(c => (
              <div key={c.ticker} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 110px', padding: '7px 12px', borderBottom: '1px solid var(--border-subtle)', alignItems: 'center' }}>
                <span style={{ font: '600 11px/1 var(--font-mono)', color: 'var(--text)' }}>{c.ticker} <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>· actions</span></span>
                <span style={{ font: '600 11px/1 var(--font-mono)', color: c.hedgeShares >= 0 ? 'var(--pos-bright)' : 'var(--neg-bright)', textAlign: 'right' }}>{c.hedgeShares >= 0 ? 'Acheter' : 'Vendre'} {Math.round(Math.abs(c.hedgeShares)) || '<1'}</span>
                <span style={{ font: '11px/1 var(--font-mono)', color: 'var(--text-muted)', textAlign: 'right' }}>{fmtNot(c.hedgeNotional)}</span>
              </div>
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 110px', padding: '7px 12px', alignItems: 'center' }}>
              <span style={{ font: '600 11px/1 var(--font-mono)', color: 'var(--text)' }}>{base.indexEtf} <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>· ETF indice</span></span>
              <span style={{ font: '600 11px/1 var(--font-mono)', color: sized.idxLegHedgeUnits >= 0 ? 'var(--pos-bright)' : 'var(--neg-bright)', textAlign: 'right' }}>{sized.idxLegHedgeUnits >= 0 ? 'Acheter' : 'Vendre'} {Math.round(Math.abs(sized.idxLegHedgeUnits) * CONTRACT) || '<1'}</span>
              <span style={{ font: '11px/1 var(--font-mono)', color: 'var(--text-muted)', textAlign: 'right' }}>{fmtNot(Math.abs(sized.idxLegHedgeUnits) * base.indexPrice * CONTRACT)}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Coût réel d'exécution & seuil de rentabilité (brique 3) ── */}
      {costModel && (costModel.unpriced ? (
        <WarningPanel tone="warn" title="Coût d'exécution non chiffrable">
          Pas de spread bid/ask disponible pour {costModel.unpriced.slice(0, 4).join(', ')}{costModel.unpriced.length > 4 ? ` et ${costModel.unpriced.length - 4} autre(s)` : ''} —
          ni en cotation du jour, ni dans notre historique. On préfère ne rien afficher plutôt qu'un coût sous-estimé : il vous ferait conclure l'inverse de la réalité.
        </WarningPanel>
      ) : (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
            <div style={{ maxWidth: 520 }}>
              <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Coût réel d'exécution</div>
              <div style={{ font: 'var(--type-caption)', color: 'var(--text-dim)', marginTop: 3 }}>
                Le spread bid/ask que vous payez pour entrer <em>et</em> sortir. Une dispersion est structurellement <strong>longue la jambe chère</strong> (les composants) et <strong>courte la jambe bon marché</strong> (l'indice) — c'est le facteur qui décide du résultat, avant tout modèle.
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ font: '800 22px/1 var(--font-mono)', color: 'var(--neg-bright)' }}>−{dxN(costModel.total)} {dxSym()}</div>
              {/* Les « points de vol » normalisent le coût par le vega indice : l'unité de nos
                  backtests, mais elle n'a de sens que si le trade est vega-neutre — sinon on
                  divise par un vega qui ne représente plus la position (on lirait 25 pts au lieu
                  de 3). Trade déséquilibré → on s'en tient aux dollars, qui restent vrais. */}
              <div style={{ font: 'var(--type-caption)', color: 'var(--text-dim)' }}>aller-retour{costModel.vegaBalanced && costModel.volPts != null ? ` · ${costModel.volPts.toFixed(2)} pts de vol` : ''}</div>
            </div>
          </div>

          {/* Qualité d'exécution — le seul levier de coût réellement à la main de l'utilisateur */}
          <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 6 }}>Qualité d'exécution</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
            {[
              { v: 1, label: 'Au marché', sub: 'tout le spread' },
              { v: 0.5, label: 'Ordre travaillé', sub: 'moitié du spread' },
              { v: 0, label: 'Au mid', sub: 'spread nul' },
            ].map(opt => {
              const on = fill === opt.v;
              return (
                <button key={opt.v} onClick={() => setFill(opt.v)}
                  style={{ flex: 1, padding: '10px 6px', borderRadius: 'var(--radius)', border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}`, background: on ? 'var(--accent-soft)' : 'transparent', color: on ? 'var(--accent-hover)' : 'var(--text-soft)', cursor: 'pointer', textAlign: 'center' }}>
                  <div style={{ font: '600 12px/1 var(--font-sans)' }}>{opt.label}</div>
                  <div style={{ font: '9px/1.4 var(--font-mono)', color: 'var(--text-dim)', marginTop: 3 }}>{opt.sub}</div>
                </button>
              );
            })}
          </div>
          <div style={{ font: 'var(--type-caption)', color: 'var(--text-dim)', marginBottom: 14 }}>
            {fill === 1 && <>Hypothèse de nos backtests : vous traversez le spread aux deux bouts. C'est une <strong>borne haute</strong> — le pire cas réaliste.</>}
            {fill === 0.5 && <>Vous placez des ordres limite et obtenez la moitié du spread. Réaliste sur des sous-jacents liquides, avec de la patience.</>}
            {fill === 0 && <>Exécution parfaite au milieu du marché. C'est le privilège du <strong>teneur de marché</strong> : il <em>encaisse</em> le spread au lieu de le payer. Hors de portée en retail — utile comme référence de ce que coûte réellement votre exécution.</>}
          </div>

          {/* Décomposition par jambe : l'asymétrie rendue visible */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
            {[
              { l: `Composants (${costModel.legs.length} jambes, long)`, v: costModel.comp, c: 'var(--neg-bright)' },
              { l: `Indice · ${base.indexEtf || base.indexSym} (short)`, v: costModel.index, c: 'var(--text-soft)' },
              { l: 'Asymétrie', v: null, c: 'var(--warn-bright)', txt: costModel.ratio != null ? `${costModel.ratio.toFixed(0)}× plus cher` : '—' },
            ].map(d => (
              <div key={d.l} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 10px' }}>
                <div style={{ font: '9px/1.3 var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', marginBottom: 5 }}>{d.l}</div>
                <div style={{ font: '700 13px/1 var(--font-mono)', color: d.c }}>{d.txt || `−${dxN(d.v)} ${dxSym()}`}</div>
              </div>
            ))}
          </div>

          {/* Coût de la couverture Δ (spread actions/future) — inclus dans le total, petit mais réel. */}
          {costModel.hedgeCost > 0 && (
            <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', margin: '-4px 0 14px' }}>
              Dont <strong style={{ color: 'var(--text-soft)' }}>couverture Δ</strong> : −{dxN(costModel.hedgeCost)} {dxSym()} <span style={{ color: 'var(--text-dim)' }}>(spread des actions/future de couverture · ~4 bps estimé — faible mais réel, désormais compté)</span>
            </div>
          )}

          {/* ── LE seuil de rentabilité ── */}
          {costModel.be && implRho != null ? (
            costModel.be.reachable ? (() => {
              const pct = costModel.needPct;
              const tone = pct == null ? 'var(--text-soft)' : pct >= 80 ? 'var(--neg-bright)' : pct >= 50 ? 'var(--warn-bright)' : 'var(--pos-bright)';
              return (
                <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 14 }}>
                  <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 8 }}>Seuil de rentabilité</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', font: 'var(--type-body-sm)', color: 'var(--text-soft)', marginBottom: 5 }}>
                    <span>Le marché price la corrélation à</span>
                    <strong style={{ font: '600 12px/1 var(--font-mono)', color: 'var(--text)' }}>{implRho.toFixed(3)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', font: 'var(--type-body-sm)', color: 'var(--text-soft)', marginBottom: 5 }}>
                    <span>Pour couvrir le spread, elle doit se réaliser sous</span>
                    <strong style={{ font: '600 12px/1 var(--font-mono)', color: tone }}>{costModel.be.rho.toFixed(3)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', font: '700 12px/1 var(--font-mono)', marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border-subtle)' }}>
                    <span style={{ color: 'var(--text-soft)' }}>Prime de corrélation à capturer</span>
                    <span style={{ color: tone }}>{costModel.needPremiumPts.toFixed(1)} pts</span>
                  </div>
                  {pct != null && costModel.baseline && (
                    <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.5 }}>
                      {pct >= 80
                        ? <>C'est une prime au <strong style={{ color: tone }}>~{Math.round(pct)}ᵉ percentile</strong> de son historique {costModel.baseline.window} — il faudrait un régime de corrélation <strong>exceptionnellement généreux</strong> rien que pour rentrer dans vos frais. La prime médiane est de {costModel.medianPremiumPts} pts.</>
                        : pct >= 50
                          ? <>C'est une prime au <strong style={{ color: tone }}>~{Math.round(pct)}ᵉ percentile</strong> de son historique {costModel.baseline.window} — au-dessus de la médiane ({costModel.medianPremiumPts} pts) : le spread exige un régime plus favorable que la normale.</>
                          : <>C'est une prime au <strong style={{ color: tone }}>~{Math.round(pct)}ᵉ percentile</strong> de son historique {costModel.baseline.window} — sous la médiane ({costModel.medianPremiumPts} pts) : le coût reste franchissable dans un régime ordinaire.</>}
                      {' '}<button onClick={() => onNav && onNav('correlation')} style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline' }}>Voir la prime du jour dans le Correlation Lab →</button>
                    </div>
                  )}
                </div>
              );
            })() : (
              <WarningPanel tone="neg" title="Le spread ne peut pas être couvert">
                Même si la corrélation tombait à <strong>zéro</strong> — les composants bougeant chacun totalement de leur côté, le meilleur cas absolu pour une dispersion — l'indice ne perdrait que <strong>{costModel.maxCapturePts != null ? costModel.maxCapturePts.toFixed(1) : '—'} points de volatilité</strong>, alors que votre spread en coûte <strong>{costModel.volPts.toFixed(1)}</strong>.
                Ce panier, à cette échéance et avec cette exécution, est perdant <strong>par construction</strong> : aucun scénario de marché ne le rend gagnant.
                {' '}Les trois leviers : allonger l'échéance (le spread d'un composant se resserre de ~12 % à 30 j à ~7 % à 90 j), ne garder que les noms les plus liquides, et travailler vos ordres au lieu de traverser le marché.
              </WarningPanel>
            )
          ) : !costModel.representative ? (
            /* Ordre volontaire : la représentativité passe AVANT la neutralité vega. Un panier de
               5 noms est aussi, presque toujours, déséquilibré en vega — mais lui conseiller de
               rééquilibrer l'enverrait sur une fausse piste : même parfaitement neutre, son ρ_impl
               resterait au clamp. On énonce d'abord la contrainte structurelle, puis le réglage. */
            <WarningPanel tone="warn" title="Panier trop concentré pour un seuil de rentabilité fiable">
              Votre panier compte <strong>{costModel.nEff.toFixed(1)} noms effectifs</strong> (une mesure qui tient compte de la concentration : {sized.comps.length} composants, mais les poids sont inégaux). En dessous d'une douzaine, la corrélation implicite s'effondre <strong>mécaniquement</strong> — un artefact de la formule, pas un signal du marché — et tout seuil de rentabilité calculé dessus serait faux.
              {' '}Le coût ci-dessus, lui, est bien réel.
              <div style={{ marginTop: 8 }}>
                Plus profondément : short indice contre une poignée de titres n'est pas une dispersion, c'est un pari sur ces titres-là. Une vraie dispersion veut un panier qui <strong>réplique l'indice</strong> — nos backtests en utilisent une trentaine. Ajoutez des composants ou répartissez les poids pour rendre ce seuil calculable.
              </div>
            </WarningPanel>
          ) : !costModel.vegaBalanced ? (
            <WarningPanel tone="warn" title="Rééquilibrez le vega pour obtenir un seuil de rentabilité">
              Le vega net de la position est de <strong>{fmtS(sized.netVega)} {dxSym()}/1%</strong> face à {dxN(sized.idxVega)} {dxSym()}/1% sur la jambe indice : le panier est loin d'être neutre. Son P&L serait piloté par la <strong>volatilité des composants</strong>, pas par la corrélation — la dispersion n'est plus le pari.
              {' '}Le seuil de rentabilité, qui mesure ce que la corrélation doit vous rapporter, n'aurait donc aucun sens ici.
              <div style={{ marginTop: 8 }}>
                Cause habituelle : chaque jambe reçoit au minimum 1 contrat, donc {sized.comps.length} composants face à {nIndex} lot{nIndex > 1 ? 's' : ''} d'indice pèsent bien plus lourd que lui. <strong>Augmentez le nombre de lots indice</strong> (vers {Math.max(1, Math.round(sized.compVega / (sized.idxVega / Math.max(1, nIndex))))} environ) jusqu'à ce que le vega net repasse près de zéro.
              </div>
            </WarningPanel>
          ) : (
            <div style={{ font: 'var(--type-caption)', color: 'var(--text-dim)' }}>
              Seuil de rentabilité indisponible : la corrélation implicite du panier n'a pas pu être calculée.
            </div>
          )}

          {/* Provenance — le coût affiché est-il réel ou historique ? */}
          <div style={{ font: 'var(--type-caption)', color: 'var(--text-dim)', marginTop: 10, lineHeight: 1.5 }}>
            Spreads : <strong style={{ color: costModel.nLive > 0 ? 'var(--pos-bright)' : 'var(--text-dim)' }}>{costModel.nLive} réel{costModel.nLive > 1 ? 's' : ''} (chaîne Cboe du jour)</strong>
            {costModel.nHist > 0 && <> · {costModel.nHist} estimé{costModel.nHist > 1 ? 's' : ''} sur notre historique 2022-2026 (nom non coté aujourd'hui)</>}.
            {' '}Mesurés à ~30 j puis rapportés à {duration} j par la déformation constatée du spread avec l'échéance.
            {costModel.premiumBurn != null && costModel.premiumBurn > 0 && <> Ce coût représente <strong style={{ color: 'var(--warn-bright)' }}>{Math.round(costModel.premiumBurn * 100)} %</strong> de la prime nette encaissée.</>}
          </div>

          {mode === 'Débutant' && (
            <div style={{ marginTop: 12 }}>
              <BeginnerExplanationBox>
                Le <strong>spread</strong> est l'écart entre le prix d'achat et le prix de vente d'une option : c'est la commission invisible du teneur de marché. Sur un indice comme {base.indexEtf || base.indexSym} il est minuscule (~0,6 % du prix du straddle), mais sur une action individuelle il est bien plus large (~12 % en moyenne). Or une dispersion <strong>achète</strong> les options chères à traiter et <strong>vend</strong> l'option bon marché — vous franchissez donc l'écart dans le mauvais sens sur chaque jambe. Le « seuil de rentabilité » vous dit combien la corrélation doit vous donner rien que pour rembourser ça.
              </BeginnerExplanationBox>
            </div>
          )}
        </div>
      ))}

      {/* ── Actions (mode autonome ; en embarqué le Builder gère le flux) ── */}
      {embedded ? (
        <div style={{ font: 'var(--type-caption)', color: 'var(--text-dim)' }}>
          La répartition est enregistrée automatiquement — l'étape « Risque » et le Risk Lab l'utiliseront.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => save(false)} style={{ font: '600 13px/1 var(--font-sans)', padding: '11px 22px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}>
              Enregistrer la stratégie
            </button>
            <button onClick={() => save(true)} style={{ font: '600 13px/1 var(--font-sans)', padding: '11px 18px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>
              Enregistrer puis ouvrir le Risk Lab →
            </button>
            {/* Télécharger / importer une stratégie (.json) — réservé Pro (comme le
                partage : sinon le fichier contourne le partage réservé à Pro). */}
            {isProUser ? (
              <button onClick={exportStrategy} style={{ font: '600 13px/1 var(--font-sans)', padding: '11px 18px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>
                ↓ Télécharger (.json)
              </button>
            ) : (
              <button onClick={() => onNav && onNav('pricing')} title="Téléchargement réservé à l'offre Pro"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, font: '600 13px/1 var(--font-sans)', padding: '11px 16px', borderRadius: 'var(--radius)', border: '1px dashed var(--border-strong)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
                🔒 Télécharger (.json)
                <span style={{ font: '600 9px/1 var(--font-mono)', padding: '2px 6px', borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent-hover)', border: '1px solid var(--accent-border)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pro</span>
              </button>
            )}
            {isProUser ? (
              <label style={{ font: '600 13px/1 var(--font-sans)', padding: '11px 18px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>
                ↑ Importer une stratégie
                <input type="file" accept=".json,application/json" style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files && e.target.files[0]; if (f) importStrategy(f); e.target.value = ''; }} />
              </label>
            ) : (
              <button onClick={() => onNav && onNav('pricing')} title="Import réservé à l'offre Pro"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, font: '600 13px/1 var(--font-sans)', padding: '11px 16px', borderRadius: 'var(--radius)', border: '1px dashed var(--border-strong)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
                🔒 Importer une stratégie
                <span style={{ font: '600 9px/1 var(--font-mono)', padding: '2px 6px', borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent-hover)', border: '1px solid var(--accent-border)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pro</span>
              </button>
            )}
            {/* Export IBKR (Risk Navigator · What-If) — réservé Pro */}
            {isProUser ? (
              <button onClick={() => { save(false); setIbkrOpen(true); }} title="Générer un CSV importable dans le Risk Navigator de TWS (What-If)"
                style={{ font: '600 13px/1 var(--font-sans)', padding: '11px 18px', borderRadius: 'var(--radius)', border: '1px solid var(--accent)', background: 'transparent', color: 'var(--accent-hover)', cursor: 'pointer' }}>
                ⇪ Exporter vers IBKR (What-If)
              </button>
            ) : (
              <button onClick={() => onNav && onNav('pricing')} title="Export IBKR réservé à l'offre Pro — cliquez pour la découvrir"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, font: '600 13px/1 var(--font-sans)', padding: '11px 16px', borderRadius: 'var(--radius)', border: '1px dashed var(--border-strong)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
                🔒 Exporter vers IBKR
                <span style={{ font: '600 9px/1 var(--font-mono)', padding: '2px 6px', borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent-hover)', border: '1px solid var(--accent-border)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pro</span>
              </button>
            )}
            {canShare && (isProUser ? (
              <button onClick={() => { save(false); setShareOpen(true); }}
                style={{ font: '600 13px/1 var(--font-sans)', padding: '11px 18px', borderRadius: 'var(--radius)', border: '1px solid var(--accent)', background: 'transparent', color: 'var(--accent-hover)', cursor: 'pointer' }}>
                🔗 Partager la construction
              </button>
            ) : (
              <button onClick={() => onNav && onNav('pricing')} title="Partage réservé à l'offre Pro — cliquez pour la découvrir"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, font: '600 13px/1 var(--font-sans)', padding: '11px 16px', borderRadius: 'var(--radius)', border: '1px dashed var(--border-strong)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
                🔒 Partager la construction
                <span style={{ font: '600 9px/1 var(--font-mono)', padding: '2px 6px', borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent-hover)', border: '1px solid var(--accent-border)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pro</span>
              </button>
            ))}
            {savedTick > 0 && !importMsg && (
              <span style={{ font: 'var(--type-body-sm)', color: 'var(--pos-bright)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ font: '700 13px/1 var(--font-mono)' }}>✓</span> Stratégie enregistrée — le Risk Lab l'utilisera.
              </span>
            )}
          </div>
          {importMsg && (
            <div style={{ font: 'var(--type-body-sm)', color: importMsg.tone === 'ok' ? 'var(--pos-bright)' : 'var(--neg-bright)' }}>
              {importMsg.tone === 'ok' ? '✓ ' : '✗ '}{importMsg.text}
            </div>
          )}
        </div>
      )}

      {/* Prime de risque / queue de krach — tout en bas, une fois le trade dimensionné : c'est le
          moment où l'utilisateur décide, donc le moment où il doit savoir ce qu'il vend. Masqué en
          embarqué (le Builder a son propre fil de lecture). */}
      {!embedded && window.DXTailWarning && <window.DXTailWarning mode={mode} />}

      {shareOpen && window.ShareDialog && shareList && (
        <window.ShareDialog list={shareList} kind="construction" onClose={() => setShareOpen(false)} addToast={addToast} />
      )}
      {ibkrOpen && window.IbkrExportDialog && (
        <window.IbkrExportDialog strategy={buildStrategy()} onClose={() => setIbkrOpen(false)} />
      )}
    </div>
  );
}

window.Construction = Construction;
