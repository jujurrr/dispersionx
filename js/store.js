/* ═══════════════════════════════════════════════════════════════
   DispersionX — Global data store / preloader
   ----------------------------------------------------------------
   Au démarrage du site, charge EN ARRIÈRE-PLAN l'ensemble des données
   liées aux indices et aux actions (métadonnées, composants, cours,
   scores) et les conserve en mémoire pour toute la session.

   Objectifs :
   • La barre de progression du haut reflète le chargement GLOBAL du
     site (tous les indices), pas seulement l'indice en cours.
   • Quand on change d'onglet puis qu'on revient sur un indice, tout
     est déjà chargé (affichage instantané, pas de recalcul).
   • Les scores sont mémoïsés via DXApi.autoScore → cohérents partout.

   Événements émis sur window :
   • 'dx-data-progress'  detail = { queued, done }   (avancement global)
   • 'dx-index-update'   detail = { symbol }         (données d'un indice MAJ)
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const PRELOAD_DUR = 30; // durée par défaut (= valeur initiale de l'app)
  const QUOTE_CHUNK = 40;
  const SCORE_BATCH = 5;

  const state = {
    started: false,
    indices: null,
    progress: { queued: 0, done: 0 },
    // symbol -> { index, snap, components, quotes, scores:{dur:{ticker:score}}, scoring:{dur:bool}, loaded, loading }
    data: {},
  };

  /* ── Progression globale ─────────────────────────────────────── */
  function emitProgress() {
    window.dispatchEvent(new CustomEvent('dx-data-progress', {
      detail: { queued: state.progress.queued, done: state.progress.done },
    }));
  }
  function queue(n) { state.progress.queued += n; emitProgress(); }
  function markDone(n) { state.progress.done += n; emitProgress(); }
  function emitIndex(symbol) {
    window.dispatchEvent(new CustomEvent('dx-index-update', { detail: { symbol } }));
  }

  function ensure(symbol) {
    if (!state.data[symbol]) {
      state.data[symbol] = {
        index: null, snap: null, components: [], quotes: {},
        scores: {}, scoring: {}, loaded: false, loading: false,
      };
    }
    return state.data[symbol];
  }

  /* ── Cours (quotes) ──────────────────────────────────────────── */
  function loadQuotes(symbol) {
    const d = state.data[symbol];
    if (!d || !d.components.length) return;
    const tickers = d.components.map(c => c.ticker);
    for (let i = 0; i < tickers.length; i += QUOTE_CHUNK) {
      DXApi.batchQuotes(tickers.slice(i, i + QUOTE_CHUNK), true, true).then(q => {
        (q || []).forEach(r => { d.quotes[r.ticker] = r; });
        emitIndex(symbol);
      }).catch(() => {});
    }
  }

  /* ── Métadonnées + composants d'un indice ───────────────────── */
  function loadIndex(symbol) {
    const d = ensure(symbol);
    if (d.loaded) return Promise.resolve(d);
    if (d._loadPromise) return d._loadPromise; // chargement déjà en cours
    d.loading = true;
    d._loadPromise = (async () => {
      try {
        const [idx, snap, comps] = await Promise.all([
          DXApi.getIndex(symbol),
          DXApi.getSnapshot(symbol),
          DXApi.getComponents(symbol),
        ]);
        d.index = idx;
        d.snap = snap;
        d.components = comps || [];
        d.loaded = true;
        emitIndex(symbol);
        loadQuotes(symbol);
      } catch {
        /* l'appelant retombera sur un état vide */
      } finally {
        d.loading = false;
      }
      return d;
    })();
    return d._loadPromise;
  }

  /* ── Rafraîchissement des PRIX d'un indice déjà chargé (tick 30 s) ──
     Re-récupère le snapshot (prix d'indice via ETF live) et les cours des
     composants, puis émet la MAJ. Ne re-score PAS (les scores changent peu). */
  function refreshQuotes(symbol) {
    const d = state.data[symbol];
    if (!d || !d.loaded) return;
    DXApi.getSnapshot(symbol).then(snap => { if (snap) { d.snap = snap; emitIndex(symbol); } }).catch(() => {});
    loadQuotes(symbol);
  }

  /* ── Scoring de tous les composants d'un indice (durée donnée) ─ */
  async function scoreIndex(symbol, dur) {
    dur = dur || PRELOAD_DUR;
    const d = state.data[symbol];
    if (!d || !d.components.length) return;
    if (d.scoring[dur]) return; // scoring déjà en cours pour cette durée
    if (!d.scores[dur]) d.scores[dur] = {};
    const scores = d.scores[dur];

    const tickers = d.components.map(c => c.ticker).filter(t => scores[t] == null);
    if (!tickers.length) { d.scoring[dur] = false; emitIndex(symbol); return; }

    d.scoring[dur] = true;

    // Corrélation implicite RÉELLE du panier (formule CBOE, IV indice vs IV
    // composants) — calculée UNE fois sur tous les composants + poids, puis
    // passée comme ANCRE à chaque score (remplace la constante 0.65). Ce calcul
    // réchauffe aussi le cache IV du panier. Non-bloquant : garde-fou timeout +
    // repli null → les scores retombent proprement sur 0.65.
    if (!d.rhoImpl) { d.rhoImpl = {}; d.rhoImplMeta = {}; }
    if (d.rhoImpl[dur] === undefined) {
      d.rhoImpl[dur] = null;
      try {
        const allT = d.components.map(c => c.ticker).filter(Boolean);
        const allW = d.components.map(c => (c.weight != null ? c.weight : null));
        const impl = await Promise.race([
          DXApi.impliedCorrelation(symbol, allT, allW, dur),
          new Promise(res => setTimeout(() => res(null), 12000)),
        ]);
        if (impl && impl.rho_impl != null) { d.rhoImpl[dur] = impl.rho_impl; d.rhoImplMeta[dur] = impl; }
      } catch {}
    }
    const rhoImpl = d.rhoImpl[dur];

    queue(tickers.length);
    for (let i = 0; i < tickers.length; i += SCORE_BATCH) {
      await Promise.allSettled(tickers.slice(i, i + SCORE_BATCH).map(async t => {
        try {
          const r = await DXApi.autoScore(symbol, t, dur, false, rhoImpl);
          const sc = r?.scoring?.score;
          if (sc != null) scores[t] = sc;
        } catch {}
        markDone(1);
      }));
      emitIndex(symbol);
    }
    d.scoring[dur] = false;
    emitIndex(symbol);
  }

  /* ── Préchargement complet au démarrage ──────────────────────── */
  async function preloadAll(dur) {
    if (state.started) return;
    state.started = true;
    dur = dur || PRELOAD_DUR;

    let indices = [];
    try { indices = await DXApi.getIndices(); } catch {}
    state.indices = indices || [];

    // 1) Métadonnées + composants + cours de tous les indices, en parallèle.
    await Promise.all(state.indices.map(i => loadIndex(i.symbol)));

    // 2) Scoring de chaque indice, l'un après l'autre (évite de saturer
    //    le backend), avec progression globale cumulée.
    for (const i of state.indices) {
      await scoreIndex(i.symbol, dur);
    }
  }

  /* ── API publique ────────────────────────────────────────────── */
  window.DXStore = {
    preloadAll,
    loadIndex,
    scoreIndex,
    loadQuotes,
    refreshQuotes,
    getIndexData: (symbol) => state.data[symbol] || null,
    getScores: (symbol, dur) => (state.data[symbol] && state.data[symbol].scores[dur || PRELOAD_DUR]) || {},
    // ρ implicite RÉELLE du panier de l'indice, déjà calculée une fois par (indice, durée) pour
    // le scoring. L'exposer évite que d'autres écrans (ScoreModal) rescorent sans elle : sans
    // ancre, le serveur applique le fail-safe 0,65 et le MÊME titre obtient un score différent
    // selon le chemin de navigation. null = pas encore calculée → l'appelant laisse le fail-safe.
    getRhoImpl: (symbol, dur) => {
      const d = state.data[symbol];
      return (d && d.rhoImpl && d.rhoImpl[dur || PRELOAD_DUR] != null) ? d.rhoImpl[dur || PRELOAD_DUR] : null;
    },
    isScoring: (symbol, dur) => !!(state.data[symbol] && state.data[symbol].scoring[dur || PRELOAD_DUR]),
    getProgress: () => ({ queued: state.progress.queued, done: state.progress.done }),
    DEFAULT_DUR: PRELOAD_DUR,
  };
})();
