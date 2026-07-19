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
  // Délai avant de retenter le calcul de la corrélation implicite d'un indice.
  // Sans réessai, un seul échec réseau figeait l'indice sur le repli 0,65 et
  // rendait ses scores incomparables à ceux des autres indices.
  const RHO_RETRY_MS = 60000;
  // Sous ce nombre de noms, ρ_impl s'effondre MÉCANIQUEMENT : son terme Σwᵢ²σᵢ²
  // décroît en 1/N et finit par absorber la variance de l'indice (ρ tombe au
  // clamp 0,05). On refuse alors de produire une ancre plutôt que d'en fabriquer
  // une fausse. Ne mord jamais sur un indice complet — c'est un garde-fou, pas
  // un aiguillage.
  const MIN_ANCHOR_NAMES = 12;

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

  /* ── ANCRE CANONIQUE : ρ implicite de l'INDICE (durée donnée) ──────────────
     LA référence de tout le scoring du site. Un score de dispersion répond à
     « ce titre est-il un bon composant pour une dispersion sur l'indice X à
     l'horizon D ? » : il doit donc être une fonction de (indice, titre, durée)
     et de RIEN d'autre. L'ancre ρ_impl est le prix que le marché met sur la
     corrélation de l'INDICE — une propriété de l'indice, pas du panier qu'on
     regarde. La calculer sur le sous-panier d'une liste donnait au MÊME titre
     un score différent selon l'écran (≈ 23 points d'écart mesurés).

     Calculée une fois par (indice, durée), sur le panier COMPLET de l'indice,
     mémoïsée, dédoublonnée, réessayée après RHO_RETRY_MS. Retour null = pas
     d'ancre fiable → l'appelant laisse le fail-safe serveur (0,65) s'appliquer,
     mais alors il s'applique PARTOUT pareil. */
  function resolveRhoImpl(symbol, dur) {
    dur = dur || PRELOAD_DUR;
    const d = ensure(symbol);
    if (!d.rhoImpl) { d.rhoImpl = {}; d.rhoImplMeta = {}; d.rhoImplTried = {}; d.rhoImplFallback = {}; }
    if (!d.rhoImplTried) { d.rhoImplTried = {}; d.rhoImplFallback = {}; }
    if (!d._rhoInflight) d._rhoInflight = {};

    if (d.rhoImpl[dur] != null) return Promise.resolve(d.rhoImpl[dur]);   // déjà résolue
    if (d._rhoInflight[dur]) return d._rhoInflight[dur];                  // calcul en cours → on l'attend

    /* Délai de garde : un échec persistant ne doit pas marteler l'API. On rend
       null tout de suite plutôt que de retenter à chaque appel. */
    const now = Date.now();
    if ((now - (d.rhoImplTried[dur] || 0)) <= RHO_RETRY_MS) return Promise.resolve(null);
    d.rhoImplTried[dur] = now;
    if (d.rhoImpl[dur] === undefined) d.rhoImpl[dur] = null;

    const p = (async () => {
      try {
        // L'ancre doit être calculable sans être passé par l'écran Indices : une
        // liste ouverte directement (lien partagé, marque-page) a besoin de la
        // MÊME ancre que la table de l'indice.
        if (!d.loaded) await loadIndex(symbol);
        const comps = d.components || [];
        if (comps.length < MIN_ANCHOR_NAMES) return null;
        const allT = comps.map(c => c.ticker).filter(Boolean);
        const allW = comps.map(c => (c.weight != null ? c.weight : null));
        const impl = await Promise.race([
          DXApi.impliedCorrelation(symbol, allT, allW, dur),
          new Promise(res => setTimeout(() => res(null), 12000)),
        ]);
        if (impl && impl.rho_impl != null) {
          d.rhoImpl[dur] = impl.rho_impl; d.rhoImplMeta[dur] = impl;
          return impl.rho_impl;
        }
      } catch {}
      return null;
    })();
    const done = p.then(v => { delete d._rhoInflight[dur]; return v; },
                        () => { delete d._rhoInflight[dur]; return null; });
    d._rhoInflight[dur] = done;
    return done;
  }

  /* ── Scoring de tous les composants d'un indice (durée donnée) ─ */
  function scoreIndex(symbol, dur) {
    dur = dur || PRELOAD_DUR;
    const d = state.data[symbol];
    if (!d || !d.components.length) return Promise.resolve();
    if (!d._scoreRun) d._scoreRun = {};
    /* Scoring déjà en cours pour cette durée : on RENVOIE sa promesse au lieu de
       rendre la main tout de suite. Un appelant qui `await` (l'auto-chercheur)
       repartait sinon avec une table de scores à moitié vide et cherchait ses
       paniers sur un univers partiel — donc un résultat qui dépendait de l'ordre
       d'ouverture des écrans, pas des données. */
    if (d._scoreRun[dur]) return d._scoreRun[dur];
    const run = _scoreIndexRun(symbol, dur);
    const p = run.then(() => { delete d._scoreRun[dur]; },
                       () => { delete d._scoreRun[dur]; });
    d._scoreRun[dur] = p;
    return p;
  }

  async function _scoreIndexRun(symbol, dur) {
    const d = state.data[symbol];
    if (!d.scores[dur]) d.scores[dur] = {};
    const scores = d.scores[dur];

    /* Raccourci « tout est déjà scoré » — MAIS pas quand les scores en place ont
       été calculés sans la vraie ancre. Sinon l'indice sortait ici avant même
       d'atteindre la logique de réessai, et restait figé sur le repli 0,65 pour
       toujours : le correctif du réessai n'aurait jamais été atteint. */
    const pending = d.components.map(c => c.ticker).filter(t => scores[t] == null);
    if (!pending.length && !(d.rhoImplFallback && d.rhoImplFallback[dur])) {
      d.scoring[dur] = false; emitIndex(symbol); return;
    }

    d.scoring[dur] = true;

    /* Ancre canonique de l'indice — même fonction que celle qu'utilisent les
       listes et le détail d'un titre, donc même chiffre partout. Réessayée tant
       qu'elle n'est pas résolue : avant, un seul échec réseau figeait l'indice
       sur le repli 0,65 pour toute la session, et la même action scorait ~65 sur
       l'indice retombé au repli contre ~0 sur celui qui avait la vraie ρ. */
    const rhoImpl = await resolveRhoImpl(symbol, dur);

    /* L'ancre vient d'arriver alors que des scores avaient été calculés SANS elle :
       ils reposent sur le repli 0,65 et ne sont pas comparables aux nouveaux. On
       les jette pour qu'ils soient recalculés — garder un mélange des deux, c'est
       exactement ce qui rendait les scores incohérents d'un indice à l'autre. */
    if (rhoImpl != null && d.rhoImplFallback[dur]) {
      d.rhoImplFallback[dur] = false;
      // Vidage SUR PLACE : `scores` est une référence prise plus haut. Réaffecter
      // `d.scores[dur] = {}` laisserait cette référence sur l'ancien objet, et le
      // recalcul ne se déclencherait jamais — le correctif serait inopérant sans
      // que rien ne le signale.
      for (const k of Object.keys(scores)) delete scores[k];
    }
    // Scores calculés sans ancre : marqués comme provisoires, à refaire.
    if (rhoImpl == null) d.rhoImplFallback[dur] = true;

    // Recalculé APRÈS l'ancre : le nettoyage ci-dessus a pu vider les scores.
    const tickers = d.components.map(c => c.ticker).filter(t => scores[t] == null);
    if (!tickers.length) { d.scoring[dur] = false; emitIndex(symbol); return; }

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
    // Lecture SYNCHRONE de l'ancre déjà résolue (null si pas encore calculée) —
    // pour les chemins qui ne peuvent pas attendre (clé de cache, rendu).
    getRhoImpl: (symbol, dur) => {
      const d = state.data[symbol];
      return (d && d.rhoImpl && d.rhoImpl[dur || PRELOAD_DUR] != null) ? d.rhoImpl[dur || PRELOAD_DUR] : null;
    },
    // Résolution ASYNCHRONE de l'ancre canonique (charge l'indice au besoin).
    // À utiliser par tout écran qui s'apprête à scorer : c'est ce qui garantit
    // qu'une liste, une table d'indice et le détail d'un titre parlent du même
    // score. Ne calcule JAMAIS d'ancre sur un sous-panier.
    resolveRhoImpl,
    isScoring: (symbol, dur) => !!(state.data[symbol] && state.data[symbol].scoring[dur || PRELOAD_DUR]),
    getProgress: () => ({ queued: state.progress.queued, done: state.progress.done }),
    DEFAULT_DUR: PRELOAD_DUR,
  };
})();
