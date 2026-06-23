/* ─── List Detail: basket analysis + sortable items + score modal ─ */
function ListDetail({ listId, onNav, onScore, addToast, mode, scoreCache }) {
  const { MetricCard, ScoreBadge, WarningPanel, EmptyState, BeginnerExplanationBox } = window.DispersionXDesignSystem_cb86be;
  const [list, setList]       = React.useState(null);
  const [analysis, setAnalysis] = React.useState(null);
  const [quotes, setQuotes]   = React.useState({});
  const [volData, setVolData] = React.useState({});
  const [loading, setLoading] = React.useState(true);
  const [rescoring, setRescoring] = React.useState(false);
  const [sort, setSort]       = React.useState({ key: 'added', dir: -1 });
  const autoScoredRef = React.useRef(null);

  const load = React.useCallback(() => {
    Promise.all([DXApi.getList(listId), DXApi.getListAnalysis(listId)]).then(([l, a]) => {
      setList(l);

      // Analyse calculée à partir des vrais items (pas du mock figé)
      // Préférer score_data.score (autoScore réel) si disponible
      const items  = l?.items || [];
      const scores = items.map(i => i.score_data?.score ?? i.score).filter(s => s != null);
      setAnalysis({
        ...a,
        avg_score: scores.length ? Number((scores.reduce((x, y) => x + y, 0) / scores.length).toFixed(1)) : (a?.avg_score ?? null),
        n_items:   items.length,
      });

      setLoading(false);

      // Cotations live + IV/HV en parallèle
      const tickers = items.map(i => i.ticker).filter(Boolean);
      const indexSym = l?.index_symbol || 'SPX';
      if (tickers.length > 0) {
        // Cotations live
        DXApi.batchQuotes(tickers).then(results => {
          const m = {};
          (results || []).forEach(r => { if (r?.ticker) m[r.ticker] = r; });
          setQuotes(m);
        }).catch(() => {});

        // IV/HV réelles depuis le risk endpoint (Yahoo Finance + MarketData)
        fetch('/api/risk/portfolio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tickers, index: indexSym, duration: 30 }),
        }).then(r => r.ok ? r.json() : null).then(d => {
          if (d?.per_ticker) {
            const vm = {};
            d.per_ticker.forEach(t => { if (t.ticker) vm[t.ticker] = { iv: t.iv, hv: t.hv, beta: t.beta, src: t.iv_src }; });
            setVolData(vm);
          }
        }).catch(() => {});
      }
    }).catch(() => setLoading(false));
  }, [listId]);

  React.useEffect(() => { load(); autoScoredRef.current = null; }, [listId]);

  // Auto-rescore all items once per list load (background, batches de 4)
  React.useEffect(() => {
    if (!list || autoScoredRef.current === listId) return;
    const items = list.items || [];
    if (items.length === 0) return;
    autoScoredRef.current = listId;

    const indexSym = list.index_symbol || 'SPX';
    const BATCH = 4;

    async function rescoreAll() {
      setRescoring(true);
      for (let i = 0; i < items.length; i += BATCH) {
        const batch = items.slice(i, i + BATCH);
        await Promise.allSettled(batch.map(async item => {
          const result = await DXApi.autoScore(indexSym, item.ticker, 30);
          if (result?.scoring?.score != null) {
            await DXApi.addListItem(listId, item.ticker, result.scoring);
          }
        }));
      }
      setRescoring(false);
      // Recharger la liste pour afficher les scores mis à jour
      DXApi.getList(listId).then(l => {
        if (!l) return;
        setList(l);
        const scores = (l.items || []).map(i => i.score_data?.score ?? i.score).filter(s => s != null);
        setAnalysis(prev => ({
          ...prev,
          avg_score: scores.length ? Number((scores.reduce((x, y) => x + y, 0) / scores.length).toFixed(1)) : prev?.avg_score,
          n_items: (l.items || []).length,
        }));
      });
    }

    rescoreAll();
  }, [list, listId]);

  async function handleRemove(ticker) {
    if (!confirm(`Retirer ${ticker} de la liste ?`)) return;
    try {
      await DXApi.removeListItem(listId, ticker);
      addToast && addToast(`${ticker} retiré.`);
      load();
    } catch { addToast && addToast('Erreur.', 'error'); }
  }

  async function handleExport() {
    const blob = await DXApi.exportList(listId);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `dispersion_${(list?.name || 'liste').replace(/\s+/g,'_')}.json`;
    a.click(); URL.revokeObjectURL(url);
    addToast && addToast('Export téléchargé.');
  }

  async function handleDelete() {
    if (!confirm(`Supprimer « ${list?.name} » ? Cette action est irréversible.`)) return;
    try {
      await DXApi.deleteList(listId);
      addToast && addToast('Liste supprimée.');
      onNav('lists');
    } catch { addToast && addToast('Erreur.', 'error'); }
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
  const sigColors  = { FAVORABLE: 'var(--pos)', NEUTRE: 'var(--warn)', DÉFAVORABLE: 'var(--neg)' };

  const items = list?.items || [];
  const sorted = [...items].sort((a, b) => {
    const av = a[sort.key] ?? (sort.dir > 0 ? Infinity : -Infinity);
    const bv = b[sort.key] ?? (sort.dir > 0 ? Infinity : -Infinity);
    return typeof av === 'string' ? av.localeCompare(bv) * sort.dir : (av - bv) * sort.dir;
  });

  if (loading) return <div style={{ padding: 80, textAlign: 'center', color: 'var(--text-muted)', font: 'var(--type-body)' }}>Chargement…</div>;
  if (!list) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--neg)', font: 'var(--type-body)' }}>Liste introuvable.</div>;

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
            <h1 style={{ font: 'var(--type-h1)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: '0 0 4px' }}>{list.name}</h1>
            {rescoring && <span style={{ font: 'var(--type-caption)', color: 'var(--accent-hover)', animation: 'pulse 1.2s infinite' }}>⟳ Scoring…</span>}
          </div>
          {list.description && <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)', margin: 0 }}>{list.description}</p>}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
          <button onClick={() => onNav('index-detail', { symbol: list.index_symbol })}
            style={{ font: '600 12px/1 var(--font-sans)', padding: '8px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>+ Ajouter</button>
          <button onClick={() => onNav('corr', { listId })}
            style={{ font: '600 12px/1 var(--font-sans)', padding: '8px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>Corrélation</button>
          <button onClick={() => onNav('risk', { listId })}
            style={{ font: '600 12px/1 var(--font-sans)', padding: '8px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>Risk Lab</button>
          <button onClick={() => onNav('builder', { listId })}
            style={{ font: '600 12px/1 var(--font-sans)', padding: '8px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>Stratégie</button>
          <button onClick={() => onNav('monitor-list', { listId })}
            style={{ font: '600 12px/1 var(--font-sans)', padding: '8px 16px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}>Positions →</button>
          <button onClick={handleExport}
            style={{ font: '600 12px/1 var(--font-sans)', padding: '8px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>↓</button>
          <button onClick={handleDelete}
            style={{ font: '600 12px/1 var(--font-sans)', padding: '8px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--neg)', background: 'transparent', color: 'var(--neg-bright)', cursor: 'pointer' }}>Supprimer</button>
        </div>
      </div>

      {/* Analysis metrics — calculés depuis les vrais items */}
      {analysis && (
        <section>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 12 }}>
            {[
              { label: 'Score pondéré', value: analysis.avg_score?.toFixed(1), accent: scoreColor(analysis.avg_score) },
              { label: 'Edge moyen',    value: (analysis.avg_edge >= 0 ? '+' : '') + analysis.avg_edge?.toFixed(1), accent: 'var(--pos)' },
              { label: 'ρ implicite',  value: analysis.rho_impl?.toFixed(2), accent: 'var(--info)' },
              { label: 'ρ̂ réalisée',  value: analysis.rho_real?.toFixed(2), accent: 'var(--info)' },
              { label: 'Dispersion',   value: (analysis.dispersion * 1e4)?.toFixed(1) + ' ×10⁻⁴', accent: 'var(--accent)' },
              { label: 'Actions',      value: String(analysis.n_items), accent: 'var(--text-soft)' },
            ].map(m => <MetricCard key={m.label} {...m} />)}
          </div>
          {analysis.signal && (
            <div style={{ padding: '10px 16px', borderLeft: `3px solid ${sigColors[analysis.signal] || 'var(--border)'}`, background: 'var(--bg-card)', borderRadius: '0 var(--radius) var(--radius) 0', marginBottom: 10 }}>
              <span style={{ font: 'var(--type-title)', color: sigColors[analysis.signal] || 'var(--text-muted)' }}>{analysis.signal}</span>
            </div>
          )}
          {analysis.recommendations?.length > 0 && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '12px 16px' }}>
              {analysis.recommendations.map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, padding: '6px 0', borderBottom: i < analysis.recommendations.length - 1 ? '1px solid var(--border-subtle)' : 'none', font: 'var(--type-body-sm)', color: 'var(--text-soft)' }}>
                  <span style={{ color: 'var(--accent-hover)', flexShrink: 0 }}>›</span>{r}
                </div>
              ))}
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
        <EmptyState icon="lists" title="Liste vide" description="Ajoutez des actions depuis l'Index Detail pour commencer.">
          <button onClick={() => onNav('index-detail', { symbol: list.index_symbol })}
            style={{ font: '600 12px/1 var(--font-sans)', padding: '9px 20px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', marginTop: 12 }}>Ajouter des actions</button>
        </EmptyState>
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
                // Score : préférer score_data.score (autoScore réel) > item.score (stocké) > cache modal
                const displayScore = item.score_data?.score ?? item.score ?? scoreCache?.[item.ticker];

                return (
                  <tr key={item.ticker}
                    onClick={() => onScore(list.index_symbol, item.ticker, 30)}
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
                      {q?.price != null ? '$' + parseFloat(q.price).toFixed(2) : <span style={{ color: 'var(--text-dim)' }}>···</span>}
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
                        <span style={{ font: '700 12px/1 var(--font-mono)', padding: '3px 7px', borderRadius: 'var(--radius)', background: displayScore >= 75 ? 'var(--pos-soft)' : displayScore >= 55 ? 'var(--warn-soft)' : 'var(--neg-soft)', color: scoreColor(displayScore), border: `1px solid ${displayScore >= 75 ? 'var(--pos)' : displayScore >= 55 ? 'var(--warn)' : 'var(--neg)'}` }}>{displayScore}</span>
                      )}
                    </td>

                    {/* Date ajout */}
                    <td style={{ padding: '10px 14px', textAlign: 'right', font: 'var(--type-caption)', color: 'var(--text-muted)' }}>{item.added}</td>

                    {/* Supprimer */}
                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                      <button onClick={e => { e.stopPropagation(); handleRemove(item.ticker); }}
                        style={{ font: '600 12px/1', padding: '4px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--neg)', background: 'transparent', color: 'var(--neg-bright)', cursor: 'pointer' }}>×</button>
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
    </div>
  );
}

window.ListDetail = ListDetail;
