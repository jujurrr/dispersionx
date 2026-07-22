/* ─── List Detail: basket analysis + sortable items + score modal ─ */
// Journal d'audit : phrases/temps partagés via window.DXActivity (ActivityFeed.jsx).
function ListDetail({ listId, onNav, onScore, addToast, mode, scoreCache, duration }) {
  // Horizon du site (sélecteur de l'écran Indices). Un score dépend de l'échéance :
  // afficher 30 j ici pendant que la table de l'indice affiche 45 j, c'est comparer
  // deux grandeurs différentes en les appelant du même nom.
  const dur = duration || (window.DXStore ? window.DXStore.DEFAULT_DUR : 30);
  const _fx = window.useCurrency ? window.useCurrency() : null;   // re-render au changement de devise
  const dxSym = () => window.DXMoney ? window.DXMoney.symbol() : '$';
  const { MetricCard, ScoreBadge, WarningPanel, EmptyState, BeginnerExplanationBox } = window.DispersionXDesignSystem_cb86be;
  const isProUser = !!(window.DXCloud && window.DXCloud.pro);   // export réservé à Pro (comme le partage)
  const [list, setList]       = React.useState(null);
  const [editingName, setEditingName] = React.useState(false);
  const [nameDraft, setNameDraft]     = React.useState('');
  const [analysis, setAnalysis] = React.useState(null);
  const [quotes, setQuotes]   = React.useState({});
  const [volData, setVolData] = React.useState({});
  const [loading, setLoading] = React.useState(true);
  const [rescoring, setRescoring] = React.useState(false);
  const [sort, setSort]       = React.useState({ key: 'added', dir: -1 });
  const [dialog, setDialog] = React.useState(null);          // confirmation in-app (ConfirmDialog)
  const [dialogBusy, setDialogBusy] = React.useState(false);
  const [showAudit, setShowAudit] = React.useState(false);   // journal d'activité (déroulé)
  const [auditRows, setAuditRows] = React.useState(null);
  // Scores recalculés dans CETTE session, sur l'ancre canonique et l'horizon courant.
  // Ils priment sur `score_data` figé à l'ajout (ancre/horizon/modèle d'alors).
  const [liveScores, setLiveScores] = React.useState({});
  const [basketRho, setBasketRho] = React.useState(null);   // ρ̂ réalisée MESURÉE du panier
  const [anchorRho, setAnchorRho] = React.useState(null);   // ancre d'indice ayant servi à scorer
  const autoScoredRef = React.useRef(null);

  const load = React.useCallback(() => {
    DXApi.getList(listId).then((l) => {
      setList(l);

      // Le score moyen n'est PLUS figé ici : il est dérivé au rendu à partir de la
      // même précédence que la colonne « Score » (cf. scoreOf). Le calculer à deux
      // endroits, c'était la garantie qu'un jour la moyenne affichée ne corresponde
      // plus aux lignes du tableau.
      const items = l?.items || [];
      setAnalysis({ n_items: items.length });

      setLoading(false);

      // Cotations live + IV/HV + corrélation, en parallèle. Chaque bloc est ISOLÉ :
      // une source indisponible ne doit pas emporter les autres avec elle (elles
      // partageaient un seul try implicite, et le premier throw coupait la suite).
      const tickers = items.map(i => i.ticker).filter(Boolean);
      const indexSym = l?.index_symbol || 'SPX';
      const safe = (fn) => { try { const p = fn(); if (p && p.catch) p.catch(() => {}); } catch {} };
      if (tickers.length > 0) {
        /* ── Corrélation RÉELLE du panier ────────────────────────────────────
           Ces chiffres venaient de DXApi.getListAnalysis(), qui appelle un
           endpoint /lists/:id/analysis INEXISTANT : l'appel échouait toujours et
           retombait sur des constantes de démonstration. Toute liste, quel que
           soit son contenu, affichait donc « Edge moyen +11,2 · ρ implicite 0,52
           · ρ̂ réalisée 0,45 », un signal « FAVORABLE » et des recommandations
           parlant d'un résultat AAPL — à côté de scores, eux, bien réels.
           On mesure maintenant ρ̂ réalisée sur le vrai panier, et on la compare à
           l'ANCRE qui a servi à scorer ces mêmes actions : l'en-tête explique
           enfin les scores au lieu de les contredire. */
        safe(() => DXApi.getCorrelation(listId, tickers, indexSym).then(c => {
          if (c && c.rho_real != null) setBasketRho(Number(c.rho_real));
        }));
        // Cotations live
        safe(() => DXApi.batchQuotes(tickers).then(results => {
          const m = {};
          (results || []).forEach(r => { if (r?.ticker) m[r.ticker] = r; });
          setQuotes(m);
        }));

        // IV/HV réelles depuis le risk endpoint (Yahoo Finance + MarketData)
        safe(() => fetch('/api/risk/portfolio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tickers, index: indexSym, duration: dur }),
        }).then(r => r.ok ? r.json() : null).then(d => {
          if (d?.per_ticker) {
            const vm = {};
            d.per_ticker.forEach(t => { if (t.ticker) vm[t.ticker] = { iv: t.iv, hv: t.hv, beta: t.beta, src: t.iv_src }; });
            setVolData(vm);
          }
        }));
      }
    }).catch(() => setLoading(false));
  }, [listId, dur]);   // `dur` est capturé (IV/HV du bon horizon) → il doit figurer ici

  React.useEffect(() => { load(); autoScoredRef.current = null; setLiveScores({}); }, [listId, dur]);

  // Ancre de l'indice pour l'en-tête. Résolue INDÉPENDAMMENT du re-scoring, qui
  // ne tourne pas sur une liste partagée en lecture seule : sans ça, ces listes
  // n'auraient affiché ni ρ implicite ni prime.
  React.useEffect(() => {
    if (!list || !window.DXStore || !window.DXStore.resolveRhoImpl) return;
    let cancelled = false;
    window.DXStore.resolveRhoImpl(list.index_symbol || 'SPX', dur)
      .then(r => { if (!cancelled && r != null) setAnchorRho(r); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [list?.index_symbol, dur]);
  // Changer d'horizon change le score : les valeurs de l'ancien horizon ne sont
  // plus valables, on les jette et on relance le calcul plutôt que d'afficher un
  // mélange de deux échéances.
  React.useEffect(() => { autoScoredRef.current = null; setLiveScores({}); }, [dur]);

  // Bascule du modèle de score (Préférences V2 ⇆ ALT) : re-lire les scores du store dans la
  // liste déjà ouverte, sans re-scorer — cohérence immédiate avec les tableaux d'indice.
  React.useEffect(() => {
    if (!list) return;
    const onView = () => {
      const idx = list.index_symbol || 'SPX';
      const ss = (window.DXStore && window.DXStore.getScores) ? window.DXStore.getScores(idx, dur) : {};
      setLiveScores(prev => { const n = { ...prev }; (list.items || []).forEach(it => { if (it.ticker && ss[it.ticker] != null) n[it.ticker] = ss[it.ticker]; }); return n; });
    };
    window.addEventListener('dx-score-view-changed', onView);
    return () => window.removeEventListener('dx-score-view-changed', onView);
  }, [list, dur]);

  // Rafraîchissement des prix toutes les 60 s (tick global) — on ne recharge que
  // les cotations, pas toute la liste ni le re-scoring.
  React.useEffect(() => {
    const onTick = () => {
      const tickers = (list?.items || []).map(i => i.ticker).filter(Boolean);
      if (!tickers.length) return;
      DXApi.batchQuotes(tickers).then(results => {
        const m = {}; (results || []).forEach(r => { if (r?.ticker) m[r.ticker] = r; });
        setQuotes(m);
      }).catch(() => {});
    };
    window.addEventListener('dx-price-tick', onTick);
    return () => window.removeEventListener('dx-price-tick', onTick);
  }, [list]);

  // Auto-rescore all items once per list load (background, batches de 4)
  React.useEffect(() => {
    const runKey = listId + '|' + dur;
    if (!list || autoScoredRef.current === runKey) return;
    if (list.shared && list.role !== 'editor') return;   // lecture seule : pas de ré-écriture
    const items = list.items || [];
    if (items.length === 0) return;
    autoScoredRef.current = runKey;

    const indexSym = list.index_symbol || 'SPX';
    const BATCH = 4;

    async function rescoreAll() {
      setRescoring(true);
      // ANCRE CANONIQUE DE L'INDICE — la même que la table de l'indice et que le détail
      // d'un titre. Elle n'est PAS recalculée sur le sous-panier de la liste : ρ_impl est
      // le prix que le marché met sur la corrélation de l'INDICE, pas une propriété des
      // quelques noms qu'on a mis dans une liste. La calculer sur le sous-panier donnait
      // au même titre deux scores différents selon l'écran (≈ 23 points), et sous 12 noms
      // elle n'était même pas tentée → fail-safe 0,65 → scores systématiquement gonflés.
      const rhoImpl = (window.DXStore && window.DXStore.resolveRhoImpl)
        ? await window.DXStore.resolveRhoImpl(indexSym, dur).catch(() => null)
        : null;
      setAnchorRho(rhoImpl);   // l'en-tête affiche l'ancre RÉELLEMENT utilisée ci-dessous
      // Le score AFFICHÉ doit être celui du modèle de VUE (V2, ou rang ALT cross-sectionnel), COHÉRENT
      // avec les tableaux d'indice. ALT n'existe pas par action isolée (c'est un rang dans l'indice) :
      // on s'assure donc que le store a scoré l'indice (idempotent, souvent déjà fait au préchargement),
      // puis on lit SON score par nom au lieu du placeholder par-action renvoyé par l'API.
      if (window.DXStore && window.DXStore.scoreIndex) { try { await window.DXStore.scoreIndex(indexSym, dur); } catch {} }
      const storeScores = (window.DXStore && window.DXStore.getScores) ? window.DXStore.getScores(indexSym, dur) : {};
      for (let i = 0; i < items.length; i += BATCH) {
        const batch = items.slice(i, i + BATCH);
        await Promise.allSettled(batch.map(async item => {
          const result = await DXApi.autoScore(indexSym, item.ticker, dur, false, rhoImpl);
          if (result?.scoring?.score != null) {
            // Store (modèle de vue) prioritaire ; repli sur le score serveur si le nom n'est pas dans
            // l'univers de l'indice (liste hors composants, cas rare). Affichage immédiat sans attendre
            // l'aller-retour de persistance.
            const shown = storeScores[item.ticker] != null ? storeScores[item.ticker] : result.scoring.score;
            setLiveScores(prev => ({ ...prev, [item.ticker]: shown }));
            await DXApi.addListItem(listId, item.ticker, { ...result.scoring, score: shown });
          }
        }));
      }
      setRescoring(false);
      // Recharger la liste (scores persistés à jour). La moyenne, elle, suit le rendu.
      DXApi.getList(listId).then(l => {
        if (!l) return;
        setList(l);
        setAnalysis(prev => ({ ...prev, n_items: (l.items || []).length }));
      });
    }

    rescoreAll();
  }, [list, listId, dur]);

  const notify = (msg) => addToast && addToast(msg);
  async function saveName() {
    const nm = nameDraft.trim();
    if (!nm || nm === list.name) { setEditingName(false); return; }
    try {
      await DXApi.renameList(list.id, nm);
      setList(l => ({ ...l, name: nm }));
      setEditingName(false);
      addToast && addToast('Liste renommée.');
      window.dispatchEvent(new CustomEvent('dx-activity-poke'));   // rafraîchit sidebar/classements
    } catch (e) {
      addToast && addToast('Renommage impossible : ' + (e?.message || 'erreur') + '.', 'error');
    }
  }
  async function runDialog() {
    if (!dialog?.onConfirm) return;
    setDialogBusy(true);
    try { await dialog.onConfirm(); } finally { setDialogBusy(false); setDialog(null); }
  }
  // Confirmations in-app (ConfirmDialog), plus de popup navigateur.
  async function doRemove(ticker) {
    try {
      await DXApi.removeListItem(listId, ticker);
      addToast && addToast(`${ticker} retiré.`);
      load();
      if (showAudit) refreshAudit();
    } catch { addToast && addToast('Erreur.', 'error'); }
  }
  function askRemove(ticker) {
    setDialog({
      title: 'Retirer une action ?',
      message: <>Voulez-vous vraiment retirer <strong style={{ color: 'var(--text)' }}>{ticker}</strong> de la liste « {list.name} » ? Vous pourrez la rajouter plus tard.</>,
      confirmLabel: 'Retirer',
      onConfirm: () => doRemove(ticker),
    });
  }
  // Journal d'audit (déroulé à la demande).
  function refreshAudit() { DXApi.getListAudit(listId).then(setAuditRows).catch(() => setAuditRows([])); }
  function toggleAudit() { const next = !showAudit; setShowAudit(next); if (next) refreshAudit(); }

  async function handleExport() {
    if (!isProUser) {
      addToast && addToast("Télécharger une liste est réservé à l'offre Pro.", 'info');
      onNav && onNav('pricing');
      return;
    }
    const blob = await DXApi.exportList(listId);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `dispersion_${(list?.name || 'liste').replace(/\s+/g,'_')}.json`;
    a.click(); URL.revokeObjectURL(url);
    addToast && addToast('Export téléchargé.');
  }

  function handleDelete() {
    if (list && list.shared) return notify('Seul le propriétaire peut supprimer cette liste.');
    setDialog({
      title: 'Supprimer la liste ?',
      message: <>Voulez-vous vraiment supprimer « <strong style={{ color: 'var(--text)' }}>{list?.name}</strong> » ? Cette action est irréversible.</>,
      confirmLabel: 'Supprimer',
      onConfirm: async () => {
        try { await DXApi.deleteList(listId); addToast && addToast('Liste supprimée.'); onNav('lists'); }
        catch { addToast && addToast('Erreur.', 'error'); }
      },
    });
  }

  function cycleSort(key) {
    setSort(s => s.key !== key ? { key, dir: 1 } : s.dir === 1 ? { key, dir: -1 } : { key: 'added', dir: -1 });
  }
  function sortArrow(key) {
    if (sort.key !== key) return <span style={{ color: 'var(--text-dim)', marginLeft: 3 }}>⇅</span>;
    return <span style={{ color: 'var(--accent-hover)', marginLeft: 3 }}>{sort.dir === 1 ? '↑' : '↓'}</span>;
  }

  const pctColor  = v => parseFloat(v) >= 0 ? 'var(--pos-bright)' : 'var(--neg-bright)';
  const scoreColor = s => s >= 75 ? 'var(--pos-bright)' : s >= 55 ? 'var(--warn)' : 'var(--neg-bright)';

  const items = list?.items || [];

  /* ── Précédence UNIQUE du score affiché, utilisée par la colonne, le tri et la
     moyenne. Toute divergence entre ces trois-là serait le même bug qu'avant, en
     plus petit.
       1) recalcul de cette session — ancre canonique de l'indice + horizon courant ;
       2) cache mémoïsé de l'API pour ce même (indice, titre, horizon) ;
       3) valeur PERSISTÉE à l'ajout — figée, possiblement d'un autre horizon ou
          d'une ancre d'alors : repli d'affichage, jamais une référence. */
  const listIndex = list?.index_symbol || 'SPX';
  const scoreOf = (item) => {
    if (liveScores[item.ticker] != null) return liveScores[item.ticker];
    const cached = (window.DXApi && window.DXApi.getCachedScore)
      ? window.DXApi.getCachedScore(listIndex, item.ticker, dur) : null;
    if (cached != null) return cached;
    return item.score_data?.score ?? item.score ?? scoreCache?.[[listIndex, item.ticker, dur].join('|')] ?? null;
  };
  // Score « figé » : plus aucune source fraîche, on n'affiche donc pas ce chiffre
  // avec la même autorité qu'un score recalculé.
  const isStale = (item) => liveScores[item.ticker] == null
    && !(window.DXApi && window.DXApi.getCachedScore && window.DXApi.getCachedScore(listIndex, item.ticker, dur) != null)
    && (item.score_data?.score ?? item.score) != null;

  const listScores = items.map(scoreOf).filter(s => s != null);
  const avgScore = listScores.length
    ? Number((listScores.reduce((x, y) => x + y, 0) / listScores.length).toFixed(1))
    : null;

  /* Prime de dispersion du panier — MÊME convention que le score de chaque ligne
     (ancre de l'indice − corrélation réalisée) et que l'auto-chercheur. Affichée
     seulement quand les deux termes sont mesurés. */
  const basketPrime = (anchorRho != null && basketRho != null)
    ? Number(((anchorRho - basketRho) * 100).toFixed(1))
    : null;

  const sorted = [...items].sort((a, b) => {
    if (sort.key === 'score') {
      const av = scoreOf(a) ?? (sort.dir > 0 ? Infinity : -Infinity);
      const bv = scoreOf(b) ?? (sort.dir > 0 ? Infinity : -Infinity);
      return (av - bv) * sort.dir;
    }
    const av = a[sort.key] ?? (sort.dir > 0 ? Infinity : -Infinity);
    const bv = b[sort.key] ?? (sort.dir > 0 ? Infinity : -Infinity);
    return typeof av === 'string' ? av.localeCompare(bv) * sort.dir : (av - bv) * sort.dir;
  });

  if (loading) return window.DXLoader
    ? <window.DXLoader title="Chargement de la liste" steps={['Récupération des actions de la liste…', 'Cours et scores…']} />
    : <div style={{ padding: 80, textAlign: 'center', color: 'var(--text-muted)', font: 'var(--type-body)' }}>Chargement…</div>;
  if (!list) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--neg)', font: 'var(--type-body)' }}>Liste introuvable.</div>;

  // Partage : liste partagée AVEC moi ; lecture seule si le rôle n'est pas 'editor'.
  const isShared = !!list.shared;
  const readOnly = isShared && list.role !== 'editor';
  const ROMSG = 'Liste partagée en lecture seule — modification impossible.';
  const cloudOn = !!(window.DXCloud && window.DXCloud.enabled);   // audit = cloud uniquement

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <button onClick={() => onNav('lists')} style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>← Mes listes</button>
            <span style={{ color: 'var(--text-dim)' }}>›</span>
            <span style={{ font: 'var(--type-caption)', color: 'var(--accent-hover)' }}>{list.index_symbol}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {editingName ? (
              <>
                <input value={nameDraft} onChange={e => setNameDraft(e.target.value)} autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') saveName(); else if (e.key === 'Escape') setEditingName(false); }}
                  style={{ font: 'var(--type-h1)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', background: 'var(--bg-input)', border: '1px solid var(--accent)', borderRadius: 'var(--radius)', padding: '2px 10px', outline: 'none', maxWidth: 440 }} />
                <button onClick={saveName} title="Enregistrer" style={{ font: '600 13px/1 var(--font-sans)', padding: '8px 12px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}>✓</button>
                <button onClick={() => setEditingName(false)} title="Annuler" style={{ font: '600 13px/1 var(--font-sans)', padding: '8px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>✕</button>
              </>
            ) : (
              <>
                <h1 style={{ font: 'var(--type-h1)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: '0 0 4px' }}>{list.name}</h1>
                {!readOnly && <button onClick={() => { setNameDraft(list.name); setEditingName(true); }} title="Renommer la liste" style={{ font: '14px/1 var(--font-sans)', padding: '5px 9px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>✎</button>}
              </>
            )}
            {rescoring && <span style={{ font: 'var(--type-caption)', color: 'var(--accent-hover)', animation: 'pulse 1.2s infinite' }}>⟳ Scoring…</span>}
          </div>
          {list.description && <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)', margin: 0 }}>{list.description}</p>}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
          <button onClick={() => readOnly ? notify(ROMSG) : onNav('index-detail', { symbol: list.index_symbol })}
            title={readOnly ? ROMSG : undefined}
            style={{ font: '600 12px/1 var(--font-sans)', padding: '8px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: readOnly ? 'var(--text-dim)' : 'var(--text-soft)', cursor: readOnly ? 'not-allowed' : 'pointer', opacity: readOnly ? 0.5 : 1 }}>+ Ajouter</button>
          <button onClick={() => onNav('corr', { listId })}
            style={{ font: '600 12px/1 var(--font-sans)', padding: '8px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>Corrélation</button>
          {/* Placé entre Corrélation et Construction : c'est son rang réel dans le
              parcours (il détermine la structure AVANT le dimensionnement), le même
              que dans la barre latérale, le Builder et l'auto-chercheur. */}
          <button onClick={() => onNav('regime', { listId })} title="Régime de marché et structure de dispersion recommandée"
            style={{ font: '600 12px/1 var(--font-sans)', padding: '8px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>Régime & Structure</button>
          <button onClick={() => onNav('risk', { listId })}
            style={{ font: '600 12px/1 var(--font-sans)', padding: '8px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>Risk Lab</button>
          <button onClick={() => onNav('construction', { listId })}
            style={{ font: '600 12px/1 var(--font-sans)', padding: '8px 16px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}>Construction</button>
          {cloudOn && (
            <button onClick={toggleAudit}
              style={{ font: '600 12px/1 var(--font-sans)', padding: '8px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: showAudit ? 'var(--bg-hover)' : 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>Activité</button>
          )}
          <button onClick={handleExport}
            title={isProUser ? 'Télécharger (JSON)' : "Téléchargement réservé à l'offre Pro"}
            style={{ font: '600 12px/1 var(--font-sans)', padding: '8px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: isProUser ? 'var(--text-soft)' : 'var(--text-dim)', opacity: isProUser ? 1 : 0.75, cursor: 'pointer' }}>{isProUser ? '↓' : '🔒 ↓'}</button>
          <button onClick={handleDelete}
            title={isShared ? 'Seul le propriétaire peut supprimer cette liste.' : undefined}
            style={{ font: '600 12px/1 var(--font-sans)', padding: '8px 12px', borderRadius: 'var(--radius)', border: `1px solid ${isShared ? 'var(--border)' : 'var(--neg)'}`, background: 'transparent', color: isShared ? 'var(--text-dim)' : 'var(--neg-bright)', cursor: isShared ? 'not-allowed' : 'pointer', opacity: isShared ? 0.5 : 1 }}>Supprimer</button>
        </div>
      </div>

      {/* Bandeau lecture seule (liste partagée sans droit de modification) */}
      {readOnly && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 16px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderLeft: '3px solid var(--info)', borderRadius: 'var(--radius-lg)' }}>
          <span style={{ color: 'var(--info)', font: '700 13px/1 var(--font-mono)', flexShrink: 0 }}>i</span>
          <span style={{ font: 'var(--type-body-sm)', color: 'var(--text-soft)' }}>
            Liste partagée en <strong style={{ color: 'var(--text)' }}>lecture seule</strong>{list.owner_email ? ` par ${list.owner_email}` : ''} — vous pouvez la consulter et l'analyser, mais pas la modifier.
          </span>
        </div>
      )}

      {/* Journal d'activité (audit) */}
      {showAudit && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '11px 16px', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Activité de la liste</span>
            <button onClick={refreshAudit} style={{ font: 'var(--type-caption)', background: 'none', border: 'none', color: 'var(--accent-hover)', cursor: 'pointer' }}>↻ Rafraîchir</button>
          </div>
          {auditRows == null ? (
            window.DXLoader ? <window.DXLoader title="Chargement de l’activité…" pad={16} size={20} /> : <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', font: 'var(--type-body-sm)' }}>Chargement…</div>
          ) : auditRows.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-dim)', font: 'var(--type-body-sm)' }}>Aucune activité enregistrée pour l'instant.</div>
          ) : (
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {auditRows.map((e, i) => (
                <div key={e.id ?? i} style={{ display: 'flex', gap: 12, alignItems: 'baseline', padding: '9px 16px', borderBottom: i < auditRows.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                  <span style={{ font: 'var(--type-body-sm)', color: 'var(--text-soft)', flex: 1, minWidth: 0 }}>
                    <strong style={{ color: 'var(--text)' }}>{e.actor_email || 'Quelqu’un'}</strong> {window.DXActivity.sentence(e)}
                  </span>
                  <span style={{ font: 'var(--type-caption)', color: 'var(--text-dim)', whiteSpace: 'nowrap', flexShrink: 0 }}>{window.DXActivity.timeAgo(e.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Analyse du panier — MESURÉE, et cohérente avec le scoring des lignes.
          « — » quand la donnée n'est pas encore là : un tiret est honnête, une
          constante de démonstration ne l'est pas. */}
      {analysis && (
        <section>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 12 }}>
            {[
              { label: 'Score pondéré', value: avgScore != null ? avgScore.toFixed(1) : '—', accent: scoreColor(avgScore),
                hint: `Moyenne des scores affichés ci-dessous (horizon ${dur} j).` },
              { label: 'Prime ρ', value: basketPrime != null ? (basketPrime >= 0 ? '+' : '') + basketPrime.toFixed(1) + ' pts' : '—',
                accent: basketPrime == null ? 'var(--text-soft)' : basketPrime >= 0 ? 'var(--pos)' : 'var(--neg)',
                hint: "Prime de dispersion = ρ implicite de l'indice − ρ̂ réalisée du panier. Positive = le marché price la corrélation plus cher que celle observée." },
              { label: 'ρ implicite', value: anchorRho != null ? anchorRho.toFixed(2) : '—', accent: 'var(--info)',
                hint: `Corrélation implicite de ${list.index_symbol} à ${dur} j (formule CBOE, IV vega-pondérées). C'est l'ancre qui a servi à scorer chaque action de cette liste.` },
              { label: 'ρ̂ réalisée', value: basketRho != null ? basketRho.toFixed(2) : '—', accent: 'var(--info)',
                hint: 'Corrélation réalisée moyenne entre les actions du panier, mesurée sur 60 jours de clôtures.' },
              { label: 'Actions', value: String(analysis.n_items), accent: 'var(--text-soft)' },
            ].map(m => <MetricCard key={m.label} {...m} />)}
          </div>
          {basketPrime != null && (
            <div style={{ padding: '10px 16px', borderLeft: `3px solid ${basketPrime >= 2 ? 'var(--pos)' : basketPrime >= 0 ? 'var(--warn)' : 'var(--neg)'}`, background: 'var(--bg-card)', borderRadius: '0 var(--radius) var(--radius) 0', font: 'var(--type-body-sm)', color: 'var(--text-soft)' }}>
              <strong style={{ font: 'var(--type-title)', color: basketPrime >= 2 ? 'var(--pos)' : basketPrime >= 0 ? 'var(--warn)' : 'var(--neg)' }}>
                {basketPrime >= 2 ? 'FAVORABLE' : basketPrime >= 0 ? 'NEUTRE' : 'DÉFAVORABLE'}
              </strong>
              {' — '}
              {basketPrime >= 0
                ? `le marché price la corrélation ${basketPrime.toFixed(1)} points au-dessus de celle réalisée par ce panier : c'est le sens favorable à une dispersion (vendre l'indice, acheter les composants).`
                : `la corrélation réalisée de ce panier dépasse celle que price le marché de ${Math.abs(basketPrime).toFixed(1)} points : la prime joue contre une dispersion en ce moment.`}
              <span style={{ color: 'var(--text-dim)' }}> Mesuré, pas garanti — la prime peut se retourner.</span>
            </div>
          )}
        </section>
      )}

      {mode === 'Débutant' && items.length > 0 && (
        <BeginnerExplanationBox>
          Cette liste représente votre panier de composants. Le score pondéré synthétise l'attractivité globale de la dispersion sur cet ensemble d'actions. Un score élevé ({'>'} 70) avec une prime de corrélation positive est un contexte favorable pour construire une stratégie.
        </BeginnerExplanationBox>
      )}

      {/* Items table */}
      {items.length === 0 ? (
        /* EmptyState rend la prop `action` (PAS les enfants) et `icon` comme NŒUD,
           pas comme nom d'icône : en enfant, le bouton était silencieusement perdu,
           et icon="lists" affichait le mot « lists ». */
        <EmptyState icon="📋" title="Liste vide" description="Ajoutez des actions depuis l'Index Detail pour commencer."
          action={<button onClick={() => onNav('index-detail', { symbol: list.index_symbol })}
            style={{ font: '600 12px/1 var(--font-sans)', padding: '9px 20px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}>Ajouter des actions</button>} />
      ) : (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-elevated)' }}>
                {[
                  { l: 'Action',   k: 'ticker', al: 'left'  },
                  { l: 'Prix',     k: null,      al: 'right' },
                  { l: 'Var. J',   k: null,      al: 'right' },
                  { l: 'Var. 5j',  k: null,      al: 'right' },
                  { l: 'IV / HV',  k: null,      al: 'right' },
                  { l: 'β',        k: null,      al: 'right' },
                  { l: 'Score',    k: 'score',   al: 'right' },
                  { l: 'Ajouté',   k: 'added',   al: 'right' },
                  { l: '',         k: null,      al: 'right' },
                ].map((h, i) => (
                  <th key={h.l + i} onClick={h.k ? () => cycleSort(h.k) : undefined}
                    style={{ font: '600 10px/1 var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', padding: '11px 14px', textAlign: h.al, borderBottom: '1px solid var(--border)', cursor: h.k ? 'pointer' : 'default', userSelect: 'none', whiteSpace: 'nowrap' }}>
                    {h.l}{h.k && sortArrow(h.k)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map(item => {
                const comp = (window.DXMock.getComponents(list.index_symbol) || []).find(c => c.ticker === item.ticker) || {};
                const q    = quotes[item.ticker];

                // IV/HV/beta : données temps réel (risk/portfolio) > comp mock
                const vol  = volData[item.ticker];
                const iv   = vol?.iv   ?? comp.iv   ?? null;
                const hv   = vol?.hv   ?? comp.hv   ?? null;
                const beta = vol?.beta ?? comp.beta ?? null;
                // Score : précédence unique (cf. scoreOf) — recalcul de session > cache
                // mémoïsé > valeur persistée à l'ajout.
                const displayScore = scoreOf(item);
                const scoreFallback = item.score_data?.is_fallback === true;   // score de secours (données non chargées)
                const scoreStale = isStale(item);

                return (
                  <tr key={item.ticker}
                    onClick={() => onScore(list.index_symbol, item.ticker, dur)}
                    style={{ borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer', transition: 'background var(--dur-fast) var(--ease)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    {/* Action + logo */}
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--bg-elevated)', border: '1px solid var(--border)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <img
                            src={`https://assets.parqet.com/logos/symbol/${item.ticker.split('.')[0]}`}
                            alt=""
                            style={{ width: 22, height: 22, objectFit: 'contain' }}
                            onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.insertAdjacentHTML('afterend', `<span style="font:700 8px/1 var(--font-mono);color:var(--text-soft)">${item.ticker.slice(0,3)}</span>`); }}
                          />
                        </div>
                        <div>
                          <div style={{ font: 'var(--type-ticker)', color: 'var(--text)' }}>{item.ticker}</div>
                          {comp.name && <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)' }}>{comp.name}</div>}
                        </div>
                      </div>
                    </td>

                    {/* Prix live */}
                    <td style={{ padding: '10px 14px', textAlign: 'right', font: 'var(--type-data-sm)', color: 'var(--text)' }}>
                      {q?.price != null ? dxSym() + (window.DXMoney ? window.DXMoney.convert(parseFloat(q.price)) : parseFloat(q.price)).toFixed(2) : <span style={{ color: 'var(--text-dim)' }}>···</span>}
                    </td>

                    {/* Variation journalière */}
                    <td style={{ padding: '10px 14px', textAlign: 'right', font: 'var(--type-data-sm)', color: q?.day != null ? pctColor(q.day) : 'var(--text-dim)' }}>
                      {q?.day != null
                        ? (parseFloat(q.day) >= 0 ? '▲ ' : '▼ ') + Math.abs(parseFloat(q.day)).toFixed(2) + '%'
                        : '···'}
                    </td>

                    {/* Variation 5 jours */}
                    <td style={{ padding: '10px 14px', textAlign: 'right', font: 'var(--type-data-sm)', color: q?.week != null ? pctColor(q.week) : 'var(--text-dim)' }}>
                      {q?.week != null
                        ? (parseFloat(q.week) >= 0 ? '▲ ' : '▼ ') + Math.abs(parseFloat(q.week)).toFixed(2) + '%'
                        : '···'}
                    </td>

                    {/* IV / HV */}
                    <td style={{ padding: '10px 14px', textAlign: 'right', font: 'var(--type-data-sm)', color: 'var(--text-soft)' }}>
                      {iv != null && hv != null
                        ? <span>{iv.toFixed(1)}<span style={{ color: 'var(--text-dim)' }}> / </span>{hv.toFixed(1)}</span>
                        : <span style={{ color: 'var(--text-dim)' }}>—</span>}
                    </td>

                    {/* Beta */}
                    <td style={{ padding: '10px 14px', textAlign: 'right', font: 'var(--type-data-sm)', color: 'var(--text-soft)' }}>
                      {beta != null ? beta.toFixed(2) : <span style={{ color: 'var(--text-dim)' }}>—</span>}
                    </td>

                    {/* Score */}
                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                      {displayScore != null && (
                        <span title={scoreFallback ? 'Score estimé — données non chargées (recharge pour le vrai calcul)'
                          : scoreStale ? `Score enregistré lors de l'ajout — recalcul en cours pour l'horizon ${dur} j.` : undefined}
                          style={{ font: '700 12px/1 var(--font-mono)', padding: '3px 7px', borderRadius: 'var(--radius)', background: displayScore >= 75 ? 'var(--pos-soft)' : displayScore >= 55 ? 'var(--warn-soft)' : 'var(--neg-soft)', color: scoreColor(displayScore), border: `1px solid ${displayScore >= 75 ? 'var(--pos)' : displayScore >= 55 ? 'var(--warn)' : 'var(--neg)'}`, opacity: (scoreFallback || scoreStale) ? 0.55 : 1 }}>
                          {scoreFallback ? '≈' : ''}{displayScore}
                        </span>
                      )}
                    </td>

                    {/* Date ajout */}
                    <td style={{ padding: '10px 14px', textAlign: 'right', font: 'var(--type-caption)', color: 'var(--text-muted)' }}>{item.added}</td>

                    {/* Supprimer */}
                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                      <button onClick={e => { e.stopPropagation(); readOnly ? notify(ROMSG) : askRemove(item.ticker); }}
                        title={readOnly ? ROMSG : 'Retirer de la liste'}
                        style={{ font: '600 12px/1', padding: '4px 8px', borderRadius: 'var(--radius-sm)', border: `1px solid ${readOnly ? 'var(--border)' : 'var(--neg)'}`, background: 'transparent', color: readOnly ? 'var(--text-dim)' : 'var(--neg-bright)', cursor: readOnly ? 'not-allowed' : 'pointer', opacity: readOnly ? 0.5 : 1 }}>×</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Source indicator */}
          <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border-subtle)', font: 'var(--type-caption)', color: 'var(--text-dim)', display: 'flex', gap: 16 }}>
            <span>Prix : {Object.keys(quotes).length > 0 ? '● live · Finnhub/Alpaca' : '○ chargement…'}</span>
            <span>IV/HV : {Object.keys(volData).length > 0 ? '● MarketData/Yahoo Finance' : '○ chargement…'}</span>
          </div>
        </div>
      )}

      <window.ConfirmDialog open={!!dialog} title={dialog?.title} message={dialog?.message} confirmLabel={dialog?.confirmLabel} tone={dialog?.tone} busy={dialogBusy}
        onCancel={() => !dialogBusy && setDialog(null)} onConfirm={runDialog} />
    </div>
  );
}

window.ListDetail = ListDetail;
