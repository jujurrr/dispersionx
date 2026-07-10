/* ─── Sélection des composants (module-level pour conserver l'état de
   recherche/filtre entre les re-renders du Builder) ──────────────────── */
function StepComposants({ components, index, selected, onToggle, onAdd, onSelectAll, onClearAll, onShowScore, mode }) {
  const { ScoreBadge, BeginnerExplanationBox } = window.DispersionXDesignSystem_cb86be;
  const adv = mode === 'Avancé';
  // Colonnes triables (clé de tri ; num = tri numérique).
  const colDefs = adv
    ? [{ l: 'Ticker', k: 't' }, { l: 'Secteur', k: 'sec' }, { l: 'Poids ' + index, k: 'w' }, { l: 'IV', k: 'iv' }, { l: 'HV', k: 'hv' }, { l: 'ρ', k: 'rho' }, { l: 'Vega', k: 'vega' }, { l: 'Score', k: 'score' }, { l: '', k: null }]
    : [{ l: 'Ticker', k: 't' }, { l: 'Secteur', k: 'sec' }, { l: 'Poids ' + index, k: 'w' }, { l: 'IV / HV', k: 'iv' }, { l: 'ρ', k: 'rho' }, { l: 'Score', k: 'score' }, { l: '', k: null }];
  const [q, setQ] = React.useState('');
  const [onlySel, setOnlySel] = React.useState(false);
  const [sortKey, setSortKey] = React.useState(null);   // null = tri par défaut
  const [sortDir, setSortDir] = React.useState('desc');
  const up = q.trim().toUpperCase();

  // Recherche dans les constituants de l'indice + ajout de tout symbole tapé.
  const suggestions = up ? components.filter(c => c.t.includes(up) || (c.n || '').toUpperCase().includes(up)).slice(0, 6) : [];
  const known = components.some(c => c.t === up);
  const canAdd = up && /^[A-Z0-9.\-]{1,8}$/.test(up) && !known;
  function add(t) { onAdd(t); setQ(''); }

  // Clic sur un en-tête : trie par cette colonne (toggle asc/desc).
  function setSort(k) {
    if (!k) return;
    if (sortKey === k) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(k); setSortDir(k === 't' || k === 'sec' ? 'asc' : 'desc'); }
  }
  const valOf = (c, k) => {
    switch (k) {
      case 't':   return c.t || '';
      case 'sec': return c.sec || '';
      case 'w':   return c.weights[index] != null ? c.weights[index] : -1;
      case 'iv':  return c.iv ?? 0;
      case 'hv':  return c.hv ?? 0;
      case 'rho': return c.rho ?? 0;
      case 'vega': return -(parseFloat(c.iv) || 0) * 1.4;
      case 'score': return c.score ?? 0;
      default: return 0;
    }
  };

  // Filtre + tri (colonne choisie, sinon constituants d'abord puis poids/score).
  let rows = [...components];
  if (onlySel) rows = rows.filter(c => selected.has(c.t));
  if (sortKey) {
    rows.sort((a, b) => {
      const av = valOf(a, sortKey), bv = valOf(b, sortKey);
      const cmp = (typeof av === 'string') ? av.localeCompare(bv) : (av - bv);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  } else {
    rows.sort((a, b) => {
      const am = a.member ? 1 : 0, bm = b.member ? 1 : 0;
      return bm - am || (b.weights[index] || 0) - (a.weights[index] || 0) || (b.score || 0) - (a.score || 0);
    });
  }

  return (
    <>
      {mode === 'Débutant' && (
        <BeginnerExplanationBox>
          Cherchez et ajoutez n'importe quelle action (tapez son symbole), ou cochez parmi les composants connus. Privilégiez des titres à ρ plus faible et une IV correctement valorisée ; évitez les earnings proches.
        </BeginnerExplanationBox>
      )}

      {/* Recherche / ajout de ticker (tous indices, ou symbole libre) */}
      <div style={{ position: 'relative' }}>
        <input value={q} onChange={e => setQ(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && canAdd) add(up); }}
          placeholder="Rechercher ou ajouter un ticker (ex. AAPL, NVDA, ASML…)"
          style={{ width: '100%', padding: '11px 14px', font: '500 13px/1 var(--font-mono)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text)', outline: 'none', boxSizing: 'border-box' }} />
        {(suggestions.length > 0 || canAdd) && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, marginTop: 4, background: 'var(--bg-card)', border: '1px solid var(--accent)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>
            {suggestions.map(s => (
              <button key={s.t} onMouseDown={e => { e.preventDefault(); if (!selected.has(s.t)) onToggle(s.t); setQ(''); }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer', textAlign: 'left' }}>
                <span style={{ font: '700 12px/1 var(--font-mono)', color: 'var(--text)' }}>{s.t}</span>
                <span style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.n}</span>
                {(s.indices || []).slice(0, 3).map(ix => <span key={ix} style={{ font: '9px/1 var(--font-mono)', padding: '1px 5px', borderRadius: 3, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-dim)' }}>{ix}</span>)}
                {selected.has(s.t) && <span style={{ font: '700 11px/1 var(--font-mono)', color: 'var(--accent-hover)' }}>✓</span>}
              </button>
            ))}
            {canAdd && (
              <button onMouseDown={e => { e.preventDefault(); add(up); }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 12px', background: 'var(--bg-elevated)', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                <span style={{ font: '700 12px/1 var(--font-mono)', color: 'var(--accent-hover)' }}>+ Ajouter {up}</span>
                <span style={{ font: 'var(--type-caption)', color: 'var(--text-dim)' }}>symbole hors base — données estimées</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Actions de sélection + filtre + compteur */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={onSelectAll} style={{ font: '600 11px/1 var(--font-sans)', padding: '6px 12px', background: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 'var(--radius)', color: '#fff', cursor: 'pointer' }}>Tout sélectionner ({components.length})</button>
        <button onClick={onClearAll} style={{ font: '600 11px/1 var(--font-sans)', padding: '6px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-soft)', cursor: 'pointer' }}>Aucun</button>
        <button onClick={() => setOnlySel(s => !s)} style={{ font: '600 11px/1 var(--font-sans)', padding: '6px 12px', background: onlySel ? 'var(--accent)' : 'var(--bg-elevated)', border: `1px solid ${onlySel ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 'var(--radius)', color: onlySel ? '#fff' : 'var(--text-soft)', cursor: 'pointer' }}>Sélectionnés ({selected.size})</button>
        <span style={{ marginLeft: 'auto', font: 'var(--type-caption)', color: 'var(--text-muted)' }}>{rows.length} action(s) · {index}</span>
      </div>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', font: 'var(--type-body-sm)' }}>
          <thead>
            <tr style={{ background: 'var(--bg-elevated)' }}>
              {colDefs.map((d, i) => (
                <th key={d.l + i} onClick={() => setSort(d.k)} style={{ textAlign: i === 0 || i === 1 ? 'left' : 'right', font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: sortKey === d.k && d.k ? 'var(--accent-hover)' : 'var(--text-muted)', padding: '10px 14px', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', cursor: d.k ? 'pointer' : 'default', userSelect: 'none' }}>
                  {d.l}{sortKey === d.k && d.k ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.t} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '11px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span onClick={() => onShowScore && onShowScore(c.t)} title={onShowScore ? 'Voir le résumé du score' : ''} style={{ font: 'var(--type-ticker)', color: onShowScore ? 'var(--accent-hover)' : 'var(--text)', cursor: onShowScore ? 'pointer' : 'default', textDecoration: onShowScore ? 'underline' : 'none', textUnderlineOffset: 2 }}>{c.t}</span>
                    {c.earnings && <span title="Earnings proche" style={{ color: 'var(--warn)' }}>●</span>}
                    {!c.member && <span style={{ font: '9px/1 var(--font-mono)', padding: '1px 5px', borderRadius: 3, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-dim)' }}>ajouté</span>}
                  </div>
                  <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)' }}>{c.n}</div>
                </td>
                <td style={{ padding: '11px 14px', font: 'var(--type-caption)', color: 'var(--text-muted)' }}>{c.sec}</td>
                <td style={{ padding: '11px 14px', textAlign: 'right', font: 'var(--type-data-sm)', color: c.weights[index] != null ? 'var(--text-soft)' : 'var(--text-dim)' }}>{c.weights[index] != null ? c.weights[index] + '%' : '—'}</td>
                {adv ? <>
                  <td style={{ padding: '11px 14px', textAlign: 'right', font: 'var(--type-data-sm)', color: 'var(--text-soft)' }}>{c.iv}</td>
                  <td style={{ padding: '11px 14px', textAlign: 'right', font: 'var(--type-data-sm)', color: 'var(--text-muted)' }}>{c.hv}</td>
                </> : (
                  <td style={{ padding: '11px 14px', textAlign: 'right', font: 'var(--type-data-sm)', color: 'var(--text-soft)' }}>{c.iv} / {c.hv}</td>
                )}
                <td style={{ padding: '11px 14px', textAlign: 'right', font: 'var(--type-data-sm)', color: (c.rho ?? 0.5) < 0.5 ? 'var(--pos-bright)' : 'var(--text-soft)' }}>{(c.rho ?? 0.5).toFixed(2)}</td>
                {adv && <td style={{ padding: '11px 14px', textAlign: 'right', font: 'var(--type-data-sm)', color: 'var(--text-soft)' }}>−{(parseFloat(c.iv) * 1.4).toFixed(0)}</td>}
                <td style={{ padding: '11px 14px', textAlign: 'right' }}>
                  <div onClick={() => onShowScore && onShowScore(c.t)} title={onShowScore ? 'Voir le résumé du score' : ''} style={{ display: 'inline-block', cursor: onShowScore ? 'pointer' : 'default' }}><ScoreBadge score={c.score} max={0} label="" /></div>
                </td>
                <td style={{ padding: '11px 14px', textAlign: 'right' }}>
                  <input type="checkbox" checked={selected.has(c.t)} onChange={() => onToggle(c.t)} style={{ accentColor: 'var(--accent)', width: 15, height: 15 }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// Brouillon du Builder conservé EN MÉMOIRE : survit aux changements de page /
// module pendant la session (l'écran est démonté/remonté à chaque navigation)
// → on ne perd ni l'étape ni la sélection en quittant puis revenant. Repart à
// zéro au rechargement complet de la page. Ignoré si on entre avec un listId
// ciblé (on charge alors cette liste, pas le brouillon).
let _builderDraft = null;

/* ─── Strategy Builder: 8-step wizard ──────────────────────────── */
function Builder({ listId, onNav, onScore, mode, lists, moduleCtx, onModuleCtx, pro }) {
  const _fx = window.useCurrency ? window.useCurrency() : null;   // re-render au changement de devise
  const dxSym = () => window.DXMoney ? window.DXMoney.symbol() : '$';
  const dxA   = (n, o) => window.DXMoney ? window.DXMoney.value(n, o) : ((n >= 0 ? '+' : '−') + Math.abs(Math.round(n)).toLocaleString('fr-FR'));
  const dxMag = n => window.DXMoney ? window.DXMoney.value(Math.abs(n), { sign: false }) : Math.abs(Math.round(n)).toLocaleString('fr-FR');
  const { Stepper, Badge, ScoreBadge, MetricCard, CorrelationGauge, WarningPanel, BeginnerExplanationBox } = window.DispersionXDesignSystem_cb86be;
  const STEPS = ['Indice', 'Échéance', 'Source', 'Composants', 'Corrélation', 'Construction', 'Risque', 'Synthèse'];
  const d0 = listId ? null : _builderDraft;   // brouillon à restaurer (hors entrée ciblée)
  const [step, setStep] = React.useState(d0 ? d0.step : (listId ? 3 : 0));
  const [list, setList] = React.useState(null);
  const [stratData, setStratData] = React.useState(null);
  const [selectedIndex, setSelectedIndex] = React.useState(d0 ? d0.selectedIndex : 'SPX');
  const [selectedDuration, setSelectedDuration] = React.useState(d0 ? d0.selectedDuration : 30);
  const [idxComps, setIdxComps] = React.useState([]);  // constituants réels (objets) de l'indice
  const [scoreTick, setScoreTick] = React.useState(0); // re-render quand le store met les scores à jour
  const [selectedItems, setSelectedItems] = React.useState(() => new Set(d0 ? d0.selectedItems : []));
  const [extraTickers, setExtraTickers] = React.useState(() => new Set(d0 ? d0.extraTickers : []));  // tickers ajoutés à la recherche (hors base)
  const [sourceListId, setSourceListId] = React.useState(d0 ? d0.sourceListId : null);       // liste existante choisie comme source
  const [draftListId, setDraftListId] = React.useState(d0 ? d0.draftListId : null);     // liste-brouillon créée depuis le Builder
  const [creatingDraft, setCreatingDraft] = React.useState(false);
  const lastDraftRef = React.useRef(null);                        // dernier brouillon (pour le supprimer au remplacement)
  const [building, setBuilding] = React.useState(false);
  const [nIndexContracts, setNIndexContracts] = React.useState(d0 ? d0.nIndexContracts : 1);
  const [buildError, setBuildError] = React.useState(null);

  // Sauvegarde continue du brouillon (hors entrée ciblée sur un listId) → l'état
  // est restauré à l'identique si on quitte puis revient sur le Builder.
  React.useEffect(() => {
    if (listId) return;
    _builderDraft = { step, selectedIndex, selectedDuration, selectedItems, extraTickers, sourceListId, draftListId, nIndexContracts };
  }, [listId, step, selectedIndex, selectedDuration, selectedItems, extraTickers, sourceListId, draftListId, nIndexContracts]);

  React.useEffect(() => {
    if (listId) {
      DXApi.getList(listId).then(l => {
        setList(l);
        setSelectedIndex(l.index_symbol || 'SPX');
        if (l.items) setSelectedItems(new Set(l.items.map(i => i.ticker)));
      }).catch(() => {});
    }
  }, [listId]);

  // Changement d'indice → panier vidé (les actions sont propres à l'indice).
  // Le ref garde le clear pour qu'il NE s'applique PAS au montage/restauration
  // (sinon on effacerait la sélection restaurée du brouillon). Ignoré si une
  // liste (ciblée ou source) pilote la sélection.
  const prevIndexRef = React.useRef(selectedIndex);
  React.useEffect(() => {
    if (prevIndexRef.current === selectedIndex) return;   // montage / restauration
    prevIndexRef.current = selectedIndex;
    if (!listId && !sourceListId) { setSelectedItems(new Set()); setExtraTickers(new Set()); }
  }, [selectedIndex]);   // eslint-disable-line react-hooks/exhaustive-deps

  // Constituants RÉELS et COMPLETS de l'indice sélectionné via l'endpoint
  // /api/indices/:symbol/components (FMP → repli statique → base mock). Peuple
  // l'étape Composants avec TOUTES les actions de l'indice choisi (et lui seul).
  React.useEffect(() => {
    let cancelled = false;
    DXApi.getComponents(selectedIndex).then(arr => {
      if (cancelled) return;
      const comps = Array.isArray(arr) ? arr.filter(c => c && c.ticker) : [];
      setIdxComps(comps);
      // Aucune pré-sélection : le panier démarre VIDE, l'utilisateur choisit
      // lui-même les actions (tout reste listé ; « Tout sélectionner » dispo).
    }).catch(() => { if (!cancelled) setIdxComps([]); });
    return () => { cancelled = true; };
  }, [selectedIndex]);

  // Scores RÉELS depuis le store global (mêmes que l'onglet Indices / ScoreModal,
  // mémoïsés via autoScore). On garantit leur calcul pour l'indice + la durée.
  React.useEffect(() => {
    if (!window.DXStore) return;
    window.DXStore.loadIndex(selectedIndex).then(() => window.DXStore.scoreIndex(selectedIndex, selectedDuration)).catch(() => {});
  }, [selectedIndex, selectedDuration]);

  React.useEffect(() => {
    const onUpd = (e) => { if (!e.detail || e.detail.symbol === selectedIndex) setScoreTick(t => t + 1); };
    window.addEventListener('dx-index-update', onUpd);
    return () => window.removeEventListener('dx-index-update', onUpd);
  }, [selectedIndex]);

  // Liste effective : celle passée en contexte, une liste choisie comme source,
  // ou un brouillon créé à la volée — pour que les modules embarqués
  // (Corrélation / Construction / Risque) aient toujours un vrai contexte.
  const effectiveListId = listId || sourceListId || draftListId;

  // Choisir une liste existante comme point de départ : on charge ses composants.
  function pickSourceList(l) {
    setSourceListId(l.id);
    setDraftListId(null);
    setSelectedIndex(l.index_symbol || 'SPX');
    DXApi.getList(l.id).then(d => {
      setSelectedItems(new Set((d?.items || []).map(i => i.ticker).filter(Boolean)));
    }).catch(() => {});
  }
  // Repartir de zéro : panier vide, aucune liste source.
  function startScratch() {
    setSourceListId(null);
    setDraftListId(null);
    setSelectedItems(new Set());
    setExtraTickers(new Set());
  }
  // Toute édition de la sélection détache de la liste source ET invalide le
  // brouillon déjà créé, pour que les modules repartent du panier à jour
  // (sinon ils restent figés sur le 1ᵉʳ panier construit).
  function detach() { setSourceListId(null); setDraftListId(null); }
  // Ajouter un ticker depuis la recherche (n'importe quel symbole).
  function addTicker(t) {
    const sym = String(t || '').toUpperCase().trim();
    if (!sym) return;
    detach();
    setExtraTickers(s => new Set(s).add(sym));
    setSelectedItems(s => new Set(s).add(sym));
  }
  // Cocher/décocher un composant.
  function toggleItem(t) {
    detach();
    setSelectedItems(s => { const n = new Set(s); n.has(t) ? n.delete(t) : n.add(t); return n; });
  }

  // Dès qu'on entre dans les étapes d'analyse sans liste, on matérialise les
  // composants sélectionnés en une liste-brouillon réelle (donc un listId).
  React.useEffect(() => {
    if (step < 4 || effectiveListId || creatingDraft) return;
    const tickers = Array.from(selectedItems);
    if (!tickers.length) return;
    setCreatingDraft(true);
    (async () => {
      try {
        const stamp = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
        const l = await DXApi.createList(`Brouillon ${selectedIndex} · ${stamp}`, selectedIndex, 'Créé par le Strategy Builder');
        for (const t of tickers) { try { await DXApi.addListItem(l.id, t, null); } catch {} }
        // Supprimer le brouillon précédent (évite l'accumulation à chaque édition).
        if (lastDraftRef.current && lastDraftRef.current !== l.id) {
          DXApi.deleteList(lastDraftRef.current).catch(() => {});
        }
        lastDraftRef.current = l.id;
        setDraftListId(l.id);
      } catch {} finally { setCreatingDraft(false); }
    })();
  }, [step, effectiveListId, creatingDraft, selectedItems, selectedIndex]);

  const D = window.DXData;

  // Univers = TOUS les constituants de l'indice sélectionné (et lui seul),
  // enrichis par la base connue (poids/score réels) ou via synthVol, plus les
  // tickers ajoutés à la recherche.
  const components = React.useMemo(() => {
    const map = {};
    // Base mock (rho/beta riches) pour enrichir les noms connus.
    const known = {};
    (window.DXMock?.getComponents(selectedIndex) || []).forEach(c => { if (c.ticker) known[c.ticker] = c; });
    // Score RÉEL : store global (autoScore mémoïsé, = onglet Indices/ScoreModal),
    // puis cache API, puis score statique connu — JAMAIS le hash arbitraire.
    const storeScores = (window.DXStore && window.DXStore.getScores(selectedIndex, selectedDuration)) || {};
    const scoreOf = (t, knownScore) => {
      if (storeScores[t] != null) return storeScores[t];
      const cached = (window.DXApi && window.DXApi.getCachedScore) ? window.DXApi.getCachedScore(selectedIndex, t, selectedDuration) : null;
      if (cached != null) return cached;
      return knownScore != null ? knownScore : null;
    };
    const enrich = (t, member, idxTag) => {
      const k = known[t];
      const v = (window.DXMock && window.DXMock.synthVol) ? window.DXMock.synthVol(t) : {};
      return {
        t, n: v.name || (k && k.name) || t,
        sec: (k && k.sector) || v.sector || 'Autre',
        iv: (k && k.iv != null ? k.iv : v.iv_est),
        hv: (k && k.hv != null ? k.hv : v.hv30),
        rho: (k && k.rho != null ? k.rho : (v.correlation ?? 0.5)),
        score: scoreOf(t, k && k.score != null ? k.score : null),
        earnings: !!(k && k.earnings),
        beta: (k && k.beta != null ? k.beta : v.beta),
        member, indices: [idxTag], weights: {},
      };
    };
    // Constituants réels (objets de l'endpoint : ticker/name/sector/weight).
    (idxComps.length ? idxComps : (window.DXMock?.getComponents(selectedIndex) || [])).forEach(c => {
      const t = c.ticker; if (!t || map[t]) return;
      const e = enrich(t, true, selectedIndex);
      if (c.name) e.n = c.name;
      if (c.sector) e.sec = c.sector;
      e.weights[selectedIndex] = (c.weight != null ? c.weight : (known[t] ? known[t].weight : null));
      map[t] = e;
    });
    // Tickers ajoutés à la recherche / sélectionnés hors constituants.
    const extras = new Set([
      ...((list?.items || []).map(i => i.ticker)),
      ...extraTickers,
      ...selectedItems,
    ].filter(Boolean));
    extras.forEach(t => { if (!map[t]) map[t] = enrich(t, false, 'Ajouté'); });
    return Object.values(map);
  }, [selectedIndex, selectedDuration, idxComps, list, extraTickers, selectedItems, scoreTick]);

  const DEMO_TICKERS = ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'META'];
  const CONTRACT = 100;

  function handleBuild() {
    setBuilding(true);
    setBuildError(null);
    try {
      // La stratégie est dimensionnée dans l'étape Construction (module embarqué),
      // qui la sauvegarde. On la relit ici pour générer le Trade Brief.
      let strategy = stratData?.strategy || null;
      if (!strategy && effectiveListId) {
        try { const raw = localStorage.getItem('dx-strategy-' + effectiveListId); if (raw) strategy = JSON.parse(raw); } catch {}
      }
      if (!strategy) {
        setBuildError("Dimensionnez d'abord la position à l'étape « Construction » (le module enregistre la répartition des contrats), puis revenez ici.");
        setBuilding(false);
        return;
      }
      setStratData({ strategy });
      setStep(7);
    } catch (err) {
      setBuildError('Erreur — ' + (err?.message || 'inattendue') + '.');
    } finally {
      setBuilding(false);
    }
  }

  if (step === 7) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '6px 10px' }}>
          <Stepper steps={STEPS} current={step} onStepClick={setStep} />
        </div>
        <TradeBrief data={stratData} onNav={onNav} pro={pro} />
      </div>
    );
  }

  const lead = {
    0: ['Choisir un indice', "Sélectionnez l'indice ou l'ETF proxy. La liquidité des options et la taille notionnelle conditionnent l'exécution."],
    1: ['Choisir l\'échéance', 'La durée détermine le profil de risque : plus court = theta élevé, plus long = coût supérieur.'],
    2: ['Point de départ', 'Partez d\'une de vos listes existantes, ou construisez de zéro.'],
    3: ['Sélectionner les composants', 'Cherchez et ajoutez n\'importe quelle action (tous indices), ou cochez parmi les composants connus. Ces actions composeront la jambe single-name long straddle.'],
    4: ['Corrélation et prime', "Comparez ce que le marché price (ρ implicite) à ce qui a été observé (ρ̂ réalisée). L'écart est la prime de corrélation."],
    5: ['Construction', 'Définissez les quantités et équilibrez le vega de la position.'],
    6: ['Évaluation du risque', 'Visualisez les scénarios de risque avant de valider la stratégie.'],
  }[step] || [STEPS[step], 'Étape du parcours de construction.'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '6px 10px' }}>
        <Stepper steps={STEPS} current={step} onStepClick={setStep} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ font: 'var(--type-h1)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: '0 0 6px' }}>{lead[0]}</h1>
          <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)', margin: 0, maxWidth: 640 }}>{lead[1]}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} style={{ font: '600 12px/1 var(--font-sans)', padding: '9px 16px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>← Retour</button>
          )}
          {step < 6 ? (
            <button onClick={() => setStep(s => Math.min(6, s + 1))} style={{ font: '600 12px/1 var(--font-sans)', padding: '9px 20px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}>Continuer →</button>
          ) : (
            <button onClick={handleBuild} disabled={building} style={{ font: '600 12px/1 var(--font-sans)', padding: '9px 20px', borderRadius: 'var(--radius)', border: 'none', background: building ? 'var(--text-dim)' : 'var(--accent)', color: '#fff', cursor: building ? 'not-allowed' : 'pointer' }}>
              {building ? '⏳ Calcul en cours…' : 'Construire la stratégie →'}
            </button>
          )}
        </div>
      </div>

      {step === 0 && <StepIndice selected={selectedIndex} onSelect={setSelectedIndex} />}
      {step === 1 && <StepDuration selected={selectedDuration} onSelect={setSelectedDuration} />}
      {step === 2 && <StepSource lists={lists} sourceListId={sourceListId} onPickList={pickSourceList} onScratch={startScratch} />}
      {step === 3 && <StepComposants components={components} index={selectedIndex} selected={selectedItems} onToggle={toggleItem} onAdd={addTicker} onSelectAll={() => { detach(); setSelectedItems(new Set(components.map(c => c.t))); }} onClearAll={() => { detach(); setSelectedItems(new Set()); }} onShowScore={onScore ? (t => onScore(selectedIndex, t, selectedDuration)) : null} mode={mode} />}

      {/* Étapes reliées aux vrais modules du site (embarqués), pilotées par la
          liste effective (contexte ou brouillon créé depuis les composants). */}
      {step === 4 && (effectiveListId
        ? <window.CorrelationLab embedded listId={effectiveListId} onNav={onNav} mode={mode} lists={lists} moduleCtx={{ listId: effectiveListId, listIndex: selectedIndex, index: selectedIndex }} onModuleCtx={onModuleCtx} />
        : <NoListYet target="le Correlation Lab" />)}

      {buildError && <div style={{ padding: '12px 16px', background: 'var(--neg-soft)', border: '1px solid var(--neg)', borderRadius: 'var(--radius)', font: 'var(--type-body-sm)', color: 'var(--neg-bright)' }}>{buildError}</div>}

      {step === 5 && (effectiveListId
        ? <window.Construction embedded listId={effectiveListId} onNav={onNav} mode={mode} lists={lists} moduleCtx={{ listId: effectiveListId, listIndex: selectedIndex, index: selectedIndex }} onModuleCtx={onModuleCtx} indexOverride={selectedIndex} durationOverride={selectedDuration} onSaved={s => setStratData({ strategy: s })} />
        : <NoListYet target="la Construction (répartition des contrats)" />)}

      {step === 6 && (effectiveListId
        ? <window.RiskLab embedded listId={effectiveListId} onNav={onNav} mode={mode} lists={lists} moduleCtx={{ listId: effectiveListId, listIndex: selectedIndex, index: selectedIndex }} onModuleCtx={onModuleCtx} />
        : <NoListYet target="le Risk Lab" />)}
    </div>
  );

  // Étape d'analyse sans liste effective : on prépare un brouillon, on invite à
  // choisir des composants, ou (échec) on propose de sélectionner une liste.
  function NoListYet({ target }) {
    if (creatingDraft) return (
      <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)', font: 'var(--type-body)' }}>
        Préparation de {target}… (création de la liste de travail)
      </div>
    );
    if (selectedItems.size === 0) return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)', padding: 24 }}>
        <div style={{ font: 'var(--type-title)', color: 'var(--text)' }}>Sélectionnez d'abord des composants</div>
        <div style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}>{target} s'appuie sur votre panier. Revenez à l'étape « Composants » et cochez au moins une action.</div>
        <button onClick={() => setStep(3)} style={{ alignSelf: 'flex-start', font: '600 12px/1 var(--font-sans)', padding: '9px 16px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}>← Choisir les composants</button>
      </div>
    );
    return <PickListInline target={target} />;
  }

  // Repli : aucune liste et la création a échoué — on propose une liste existante.
  function PickListInline({ target }) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)', padding: 24 }}>
        <div>
          <div style={{ font: 'var(--type-title)', color: 'var(--text)', marginBottom: 4 }}>Choisissez une liste de composants</div>
          <div style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}>
            Cette étape ouvre {target} sur des données réelles. Sélectionnez une liste existante, ou créez-en une dans « Mes listes ».
          </div>
        </div>
        {(lists && lists.length > 0) ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {lists.map(l => (
              <button key={l.id} onClick={() => onNav('builder', { listId: l.id })} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6, padding: '12px 14px',
                borderRadius: 'var(--radius)', cursor: 'pointer', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text)', textAlign: 'left',
              }}>
                <span style={{ font: '600 13px/1 var(--font-sans)' }}>{l.name}</span>
                <span style={{ font: 'var(--type-caption)', color: 'var(--text-muted)' }}>{l.n_items || 0} actions · {l.index_symbol || 'SPX'}</span>
              </button>
            ))}
          </div>
        ) : (
          <button onClick={() => onNav('lists')} style={{ alignSelf: 'flex-start', font: '600 12px/1 var(--font-sans)', padding: '9px 16px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}>Aller à Mes listes →</button>
        )}
      </div>
    );
  }

  function StepIndice({ selected, onSelect }) {
    // Les 5 vrais indices du site (mêmes données que le reste de la plateforme).
    const indices = (window.DXMock && window.DXMock.indices) || [];
    const diffTone = { 'débutant': 'pos', 'intermédiaire': 'info', 'avancé': 'warn' };
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {indices.map((c) => {
          const on = selected === c.symbol;
          return (
            <div key={c.symbol} onClick={() => onSelect(c.symbol)} style={{
              background: 'var(--bg-card)', border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-lg)', padding: 18, position: 'relative',
              boxShadow: on ? '0 0 0 3px var(--accent-soft)' : 'none', cursor: 'pointer',
            }}>
              <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: on ? 'var(--accent)' : 'transparent', borderRadius: '8px 0 0 8px' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ font: '800 18px/1 var(--font-mono)', color: 'var(--text)' }}>{c.country_flag} {c.symbol}</span>
                <Badge tone={c.options_liquid ? 'pos' : (diffTone[c.difficulty] || 'neutral')}>{c.options_liquid ? 'Options liquides' : 'Liquidité variable'}</Badge>
              </div>
              <div style={{ font: 'var(--type-title)', color: 'var(--text-soft)' }}>{c.name} · {c.n_components} composants · {c.currency}</div>
              <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: '8px 0 0' }}>{c.description}</p>
              <div style={{ font: 'var(--type-caption)', color: 'var(--text-dim)', marginTop: 8 }}>ETF proxy : {c.etf_proxy} · niveau {c.difficulty}</div>
            </div>
          );
        })}
      </div>
    );
  }

  function StepDuration({ selected, onSelect }) {
    // Vraies dates d'expiration options (vendredis) proches de chaque durée
    // cible — l'étape Construction convertira le choix en date précise.
    const expiries = window.DXExpiry ? window.DXExpiry.expiriesFor([14, 30, 45, 60]) : [];
    const durations = [
      { d: 14, desc: 'Theta élevé, décision rapide.' },
      { d: 30, desc: 'Équilibre standard. Recommandé.' },
      { d: 45, desc: 'Plus de temps, coût supérieur.' },
      { d: 60, desc: 'Long terme, adapté aux positions larges.' },
    ].map(item => {
      const exp = expiries.reduce((best, o) => (!best || Math.abs(o.target - item.d) < Math.abs(best.target - item.d) ? o : best), null);
      return { ...item, exp };
    });
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {durations.map((item) => {
          const on = selected === item.d;
          return (
            <div key={item.d} onClick={() => onSelect(item.d)} style={{
              background: 'var(--bg-card)', border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-lg)', padding: 18, cursor: 'pointer', textAlign: 'center',
              boxShadow: on ? '0 0 0 3px var(--accent-soft)' : 'none',
            }}>
              <div style={{ font: '800 28px/1 var(--font-mono)', color: on ? 'var(--accent-hover)' : 'var(--text)', marginBottom: 8 }}>{item.exp ? item.exp.dte : item.d}</div>
              <div style={{ font: 'var(--type-title)', color: 'var(--text-soft)', marginBottom: 6 }}>{item.exp ? item.exp.dte + ' jours' : item.d + ' jours'}</div>
              {item.exp && (
                <div style={{ font: '600 11px/1.4 var(--font-mono)', color: on ? 'var(--accent-hover)' : 'var(--text-muted)', marginBottom: 6 }}>
                  exp. {window.DXExpiry.fmtExpiry(item.exp.date)}
                </div>
              )}
              <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)' }}>{item.desc}</div>
            </div>
          );
        })}
      </div>
    );
  }

  function StepSource({ lists, sourceListId, onPickList, onScratch }) {
    const scratch = !sourceListId;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div onClick={onScratch} style={{
          cursor: 'pointer', background: 'var(--bg-card)',
          border: `1px solid ${scratch ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 'var(--radius-lg)', padding: 18, boxShadow: scratch ? '0 0 0 3px var(--accent-soft)' : 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ font: 'var(--type-title)', color: 'var(--text)' }}>Construire de zéro</span>
            {scratch && <Badge tone="info">Sélectionné</Badge>}
          </div>
          <div style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}>
            Panier vide. À l'étape suivante, recherchez et ajoutez n'importe quelle action (tous indices), ou cochez parmi les composants connus.
          </div>
        </div>

        <div>
          <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 10 }}>… ou partir d'une de vos listes</div>
          {(lists && lists.length) ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 10 }}>
              {lists.map(l => {
                const on = sourceListId === l.id;
                return (
                  <button key={l.id} onClick={() => onPickList(l)} style={{
                    textAlign: 'left', cursor: 'pointer',
                    background: on ? 'var(--accent-soft)' : 'var(--bg-card)',
                    border: `1px solid ${on ? 'var(--accent-border)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-lg)', padding: '12px 14px', color: 'var(--text)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: (l.avg_score || 0) > 60 ? 'var(--pos)' : 'var(--warn)' }} />
                      <span style={{ font: '600 13px/1 var(--font-sans)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.name}</span>
                      {on && <span style={{ font: '700 11px/1 var(--font-mono)', color: 'var(--accent-hover)' }}>✓</span>}
                    </div>
                    <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)' }}>{l.n_items || 0} actions · {l.index_symbol || 'SPX'}</div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 18, font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}>
              Aucune liste — créez-en une dans « Mes listes », ou construisez de zéro ci-dessus.
            </div>
          )}
        </div>
      </div>
    );
  }

  // StepComposants est défini au niveau module (au-dessus) pour conserver son
  // état de recherche/filtre entre les re-renders du Builder.

  function StepCorrelation({ index }) {
    const corr = window.DXMock?.correlation || {};
    const rhoImpl = corr.rho_impl ?? 0.52;
    const rhoReal = corr.rho_real ?? 0.45;
    const prime = ((rhoImpl - rhoReal) * 100).toFixed(1);
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 18, alignItems: 'start' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 22, display: 'flex', justifyContent: 'center' }}>
          <CorrelationGauge implied={rhoImpl} realized={rhoReal} size={250} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            <MetricCard label="Corrélation implicite" value={rhoImpl.toFixed(2)} hint="Ce que le marché price via les options" accent="var(--accent)" />
            <MetricCard label="Corrélation réalisée" value={rhoReal.toFixed(2)} hint="Observée historiquement sur les composants" accent="var(--info)" />
            <MetricCard label="Prime de corrélation" value={(prime >= 0 ? '+' : '') + prime} unit="pts" accent="var(--pos)" />
            <MetricCard label="Lecture stratégique" value={parseFloat(prime) > 3 ? 'Favorable' : 'Neutre'} accent={parseFloat(prime) > 3 ? 'var(--pos)' : 'var(--warn)'} />
          </div>
          <WarningPanel tone="info" title="Lecture">
            La corrélation implicite ({rhoImpl.toFixed(2)}) est {parseFloat(prime) > 0 ? 'supérieure' : 'inférieure'} à la réalisée ({rhoReal.toFixed(2)}) — contexte {parseFloat(prime) > 3 ? 'favorable' : 'neutre'} à une dispersion classique.
          </WarningPanel>
        </div>
      </div>
    );
  }

}

/* ─── Trade Brief inlined (shown at step 7) ─────────────────────── */
function TradeBrief({ data, onNav, pro }) {
  const isPro = pro != null ? !!pro : !!(window.DXCloud && window.DXCloud.pro);
  const { Badge, MetricCard, RiskBadge, WarningPanel, ScoreBadge } = window.DispersionXDesignSystem_cb86be;
  const D        = data || window.DXData || {};
  const strategy = D.strategy || null;
  const CONTRACT = 100;

  // Build legs from strategy if available, else fall back to static
  let L;
  if (strategy?.components) {
    const port = strategy.portfolio || {};
    L = {
      index: {
        t:      (strategy.indexEtf && strategy.indexEtf !== strategy.index ? strategy.indexEtf + ' (' + strategy.index + ')' : strategy.index) || 'SPX',
        strike: 'ATM',
        prime:  '−' + dxMag(port.idxPrem || 0) + ' ' + dxSym(),
        vega:   '−' + dxMag(port.idxVega || 0) + ' ' + dxSym() + '/1%',
        theta:  '+' + dxMag(port.idxTheta || 0) + ' ' + dxSym() + '/j',
        qty:    strategy.nIndex,
        action: 'Vendre straddle',
        exp:    strategy.expiry && window.DXExpiry ? `exp. ${window.DXExpiry.fmtExpiry(strategy.expiry)} (${strategy.duration} DTE)` : strategy.duration + ' DTE',
      },
      basket: strategy.components.map(c => ({
        t:     c.ticker,
        prime: '+' + dxMag(c.premium || 0) + ' ' + dxSym(),
        vega:  '+' + dxMag(c.vega || 0) + ' ' + dxSym() + '/1%',
        theta: dxA(c.theta || 0, { sign: false }) + ' ' + dxSym() + '/j',
        qty:   c.nContracts,
      })),
    };
  } else {
    L = D.legs || { index: { t: 'SPX', strike: 'ATM', prime: '−', vega: '−', theta: '+', qty: 1, action: 'Vendre straddle', exp: '30 DTE' }, basket: [] };
  }

  const Section = ({ n, title, children }) => (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ font: 'var(--type-data-sm)', color: 'var(--text-dim)' }}>{n}</span>
        <h2 style={{ font: 'var(--type-h2)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: 0 }}>{title}</h2>
      </div>
      {children}
    </section>
  );

  const LegRow = ({ cols, head }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr repeat(4,1fr)', gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)', alignItems: 'center' }}>
      {cols.map((c, i) => (
        <span key={i} style={{
          font: head ? 'var(--type-label)' : (i === 0 ? 'var(--type-ticker)' : 'var(--type-data-sm)'),
          textTransform: head ? 'uppercase' : 'none', letterSpacing: head ? '0.06em' : 0,
          color: head ? 'var(--text-muted)' : (i === 0 ? 'var(--text)' : 'var(--text-soft)'),
          textAlign: i === 0 ? 'left' : 'right',
        }}>{c}</span>
      ))}
    </div>
  );

  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div style={{ maxWidth: 940, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 30 }}>
      {/* Report header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, borderBottom: '1px solid var(--border)', paddingBottom: 20 }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ font: 'var(--type-h1)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: 0, whiteSpace: 'nowrap' }}>Trade Brief</h1>
            <Badge tone="info">Brouillon</Badge>
          </div>
          <div style={{ font: 'var(--type-data-sm)', color: 'var(--text-muted)', marginTop: 8 }}>
            {strategy?.index || D.index_symbol || 'SPX'} · dispersion · {strategy?.duration || D.duration || 30} DTE · généré le {today}
          </div>
        </div>
        {D.score ? <ScoreBadge score={D.score} size="lg" /> : null}
      </div>
      {strategy && (
        <div style={{ padding: '10px 14px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderLeft: '3px solid var(--pos)', borderRadius: 'var(--radius)', display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ color: 'var(--pos-bright)', font: '700 13px/1 var(--font-mono)' }}>✓</span>
          <span style={{ font: 'var(--type-body-sm)', color: 'var(--text-soft)' }}>
            Stratégie calculée — {strategy.nIndex} contrat(s) {strategy.index} · {(strategy.components || []).length} composants · sizing {strategy.sizingMethod === 'vega_neutral' ? 'vega-neutre' : 'poids égaux'} · Vega net <strong style={{ color: 'var(--pos-bright)' }}>{dxA(strategy.portfolio?.netVega || 0, { sign: false })} {dxSym()}/1%</strong>{strategy.deltaHedge && strategy.deltaHedge !== 'none' ? <> · Δ couvert <strong style={{ color: 'var(--pos-bright)' }}>({strategy.deltaHedge === 'index' ? 'par l\'indice' : 'par sous-jacent'})</strong></> : ''}
          </span>
        </div>
      )}

      {/* Résumé */}
      <Section n="01" title="Résumé">
        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderLeft: '3px solid var(--accent)', borderRadius: 'var(--radius)', padding: '16px 18px', font: 'var(--type-body)', fontSize: 16, lineHeight: 1.6, color: 'var(--text-soft)' }}>
          Vous <strong style={{ color: 'var(--text)' }}>vendez la volatilité de l'indice</strong> (short straddle {D.index_symbol || 'SPX'}) et <strong style={{ color: 'var(--text)' }}>achetez la volatilité des composants</strong> (long straddles). La stratégie est approximativement <strong style={{ color: 'var(--pos-bright)' }}>vega-neutre</strong> et <strong style={{ color: 'var(--text)' }}>short corrélation</strong> : elle profite si les composants se dispersent davantage que ce que l'indice price.
        </div>
      </Section>

      {/* Construction */}
      <Section n="02" title="Construction">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: 16, alignItems: 'start' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', background: 'var(--bg-elevated)', font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--neg-bright)' }}>Jambe indice · short</div>
            <LegRow head cols={['', 'Prime', 'Vega', 'Theta', 'Qté']} />
            <LegRow cols={[`${L.index.t} ${L.index.strike}`, L.index.prime, L.index.vega, L.index.theta, L.index.qty]} />
            <div style={{ padding: '12px 14px', font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}>{L.index.action} · {L.index.exp}</div>
          </div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', background: 'var(--bg-elevated)', font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--pos-bright)' }}>Panier composants · long</div>
            <LegRow head cols={['', 'Prime', 'Vega', 'Theta', 'Qté']} />
            {(L.basket || []).map((b) => <LegRow key={b.t} cols={[b.t, b.prime, b.vega, b.theta, b.qty]} />)}
          </div>
        </div>
        {/* Vega balance */}
        {(() => {
          const idxV  = strategy ? Math.abs(strategy.portfolio?.idxVega || 0)  : 620;
          const compV = strategy ? Math.abs(strategy.portfolio?.compVega || 0) : 572;
          const netV  = strategy ? Math.round(strategy.portfolio?.netVega || 0) : -48;
          const total = idxV + compV || 1;
          const idxPct  = (idxV  / total * 48).toFixed(1);
          const compPct = (compV / total * 48).toFixed(1);
          return (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 16, marginTop: 14 }}>
              <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 12 }}>Équilibrage vega</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ font: 'var(--type-data-sm)', color: 'var(--neg-bright)', width: 130 }}>Indice −{dxMag(idxV)}</span>
                <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'var(--bg-elevated)', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: idxPct + '%', background: 'var(--neg)' }} />
                  <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: compPct + '%', background: 'var(--pos)' }} />
                  <div style={{ position: 'absolute', left: '50%', top: -2, bottom: -2, width: 2, background: 'var(--text)' }} />
                </div>
                <span style={{ font: 'var(--type-data-sm)', color: 'var(--pos-bright)', width: 140, textAlign: 'right' }}>Composants +{dxMag(compV)}</span>
              </div>
              <div style={{ textAlign: 'center', marginTop: 10 }}>
                <span style={{ font: '700 11px/1 var(--font-mono)', padding: '3px 8px', borderRadius: 'var(--radius)', background: 'var(--pos-soft)', border: '1px solid var(--pos)', color: 'var(--pos-bright)' }}>
                  Vega net {dxA(netV)} {dxSym()}/1% · {Math.abs(netV) < 30 ? 'quasi-neutre' : Math.abs(netV) < 80 ? 'légèrement déséquilibré' : 'déséquilibré'}
                </span>
              </div>
            </div>
          );
        })()}
      </Section>

      {/* Pourquoi / risques */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <Section n="03" title="Pourquoi ce trade ?">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {['Prime de corrélation mesurée à l\'étape Corrélation', 'ρ implicite > ρ̂ réalisée observé sur le panier', 'Composants à faible corrélation disponibles', 'Position quasi vega-neutre'].map((t) => (
              <div key={t} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--pos-bright)', marginTop: 2, flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                </span>
                <span style={{ font: 'var(--type-body-sm)', color: 'var(--text-soft)' }}>{t}</span>
              </div>
            ))}
          </div>
        </Section>
        <Section n="04" title="Ce qui peut mal se passer">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {[['Sell-off corrélé', 'critique'], ['Vol crush sur les composants', 'élevé'], ['Theta négatif sur le panier', 'modéré'], ['Earnings pendant la vie du trade', 'modéré']].map(([t, lv]) => (
              <div key={t} style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ font: 'var(--type-body-sm)', color: 'var(--text-soft)' }}>{t}</span>
                <RiskBadge level={lv} size="sm" />
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* Données clés */}
      <Section n="05" title="Données clés">
        {(() => {
          const port = strategy?.portfolio;
          const netV = port ? Math.round(port.netVega || 0)  : -48;
          const netT = port ? Math.round(port.netTheta || 0) : 96;
          const netP = port ? Math.round(port.netPremium || 0) : 1240;
          const nW   = (L.basket || []).length || 5;
          const dur  = strategy?.duration || D.duration || 30;
          return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              <MetricCard label="Vega net" value={dxA(netV)} unit={dxSym() + '/1%'} accent="var(--pos)" hint={strategy ? 'Position réelle' : 'Estimé'} />
              <MetricCard label="Theta /jour" value={dxA(netT)} unit={dxSym()} accent="var(--warn)" hint={strategy ? 'Position réelle' : 'Estimé'} />
              <MetricCard label="Prime nette" value={dxA(netP)} unit={dxSym()} accent="var(--accent)" />
              <MetricCard label="Composants" value={String(nW)} accent="var(--info)" hint={strategy?.sizingMethod === 'vega_neutral' ? 'Lots calculés (vega-neutre)' : '1 lot chacun'} />
              <MetricCard label="Contrats indice" value={String(strategy?.nIndex || 1)} accent="var(--info)" hint={'Short straddle ' + (strategy?.index || 'SPX')} />
              <MetricCard label="Durée" value={String(dur)} unit="DTE" accent="var(--info)" />
              <MetricCard label="Pire scénario" value="Sell-off corrélé" accent="var(--neg)" hint="À chiffrer dans le Risk Lab" />
              <MetricCard label="Données" value={strategy ? 'Prix réels' : 'Estimées'} accent={strategy ? 'var(--pos)' : 'var(--warn)'} hint={strategy ? 'IV estimée depuis la HV' : 'HV estimée'} />
            </div>
          );
        })()}
      </Section>

      {/* Checklist */}
      <Section n="06" title="Checklist avant exécution">
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '6px 16px' }}>
          {['IV vérifiée sur source réelle (IBKR) — actuellement estimée', 'Aucun earnings non désiré dans la fenêtre', 'Spread bid/ask acceptable sur chaque jambe', 'Vega net dans la tolérance cible', 'Scénario sell-off corrélé compris et accepté', 'Taille de position validée'].map((t, i) => (
            <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: i < 5 ? '1px solid var(--border-subtle)' : 'none', cursor: 'pointer' }}>
              <input type="checkbox" defaultChecked={i > 0 && i < 4} style={{ accentColor: 'var(--accent)', width: 16, height: 16 }} />
              <span style={{ font: 'var(--type-body-sm)', color: 'var(--text-soft)' }}>{t}</span>
            </label>
          ))}
        </div>
        <WarningPanel tone="warn" title="Avant tout trade" style={{ marginTop: 12 }}>
          L'IV est actuellement estimée depuis la HV. Branchez IBKR pour des valeurs réelles avant de préparer l'exécution. Outil d'aide à la décision, pas un conseil financier.
        </WarningPanel>
      </Section>

      {/* Export */}
      <Section n="07" title="Export & suite">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {strategy && onNav && (
            <button onClick={() => onNav('risk', { listId: strategy.listId })} style={{ font: '600 13px/1 var(--font-sans)', padding: '10px 20px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}>Voir le Risk Lab →</button>
          )}
          {/* Suivi de stratégie (Pro) : cliquable si Pro → onglet Suivi ; sinon verrouillé → page Pro. */}
          {onNav && (isPro ? (
            <button onClick={() => onNav('positions')} style={{ font: '600 13px/1 var(--font-sans)', padding: '10px 20px', borderRadius: 'var(--radius)', border: '1px solid var(--accent)', background: 'transparent', color: 'var(--accent-hover)', cursor: 'pointer' }}>Suivi de stratégie →</button>
          ) : (
            <button onClick={() => onNav('pricing')} title="Réservé à l'offre Pro — cliquez pour la découvrir"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, font: '600 13px/1 var(--font-sans)', padding: '10px 16px', borderRadius: 'var(--radius)', border: '1px dashed var(--border-strong)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
              🔒 Suivi de stratégie
              <span style={{ font: '600 9px/1 var(--font-mono)', padding: '2px 6px', borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent-hover)', border: '1px solid var(--accent-border)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pro</span> →
            </button>
          ))}
          <button style={{ font: '600 12px/1 var(--font-sans)', padding: '9px 16px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>Préparer pour exécution manuelle</button>
          <button style={{ font: '600 12px/1 var(--font-sans)', padding: '9px 16px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>Sauvegarder</button>
          <button onClick={() => onNav && onNav('monitor')} style={{ font: '600 12px/1 var(--font-sans)', padding: '9px 16px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>Ouvrir dans le monitor</button>
        </div>
        {!isPro && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 10, font: 'var(--type-caption)', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            <span style={{ flexShrink: 0 }}>🔒</span>
            <span>Le <strong style={{ color: 'var(--text-soft)' }}>suivi en temps réel</strong> de vos stratégies (P&amp;L au marché, grecs, snapshots quotidiens) est réservé à l'offre <strong style={{ color: 'var(--accent-hover)' }}>Pro</strong>. Cliquez sur « Suivi de stratégie » pour la découvrir.</span>
          </div>
        )}
      </Section>
    </div>
  );
}

window.Builder = Builder;
window.TradeBrief = TradeBrief;
