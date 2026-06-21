/* ─── List Detail: basket analysis + sortable items + score modal ─ */
function ListDetail({ listId, onNav, onScore, addToast, mode }) {
  const { MetricCard, ScoreBadge, WarningPanel, EmptyState, BeginnerExplanationBox } = window.DispersionXDesignSystem_cb86be;
  const [list, setList] = React.useState(null);
  const [analysis, setAnalysis] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [sort, setSort] = React.useState({ key: 'added', dir: -1 });

  const load = React.useCallback(() => {
    Promise.all([DXApi.getList(listId), DXApi.getListAnalysis(listId)]).then(([l, a]) => {
      setList(l); setAnalysis(a); setLoading(false);
    }).catch(() => setLoading(false));
  }, [listId]);

  React.useEffect(() => { load(); }, [listId]);

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

  const pctColor = v => v >= 0 ? 'var(--pos-bright)' : 'var(--neg-bright)';
  const scoreColor = s => s >= 70 ? 'var(--pos-bright)' : s >= 50 ? 'var(--warn)' : 'var(--neg-bright)';
  const sigColors = { FAVORABLE: 'var(--pos)', NEUTRE: 'var(--warn)', DÉFAVORABLE: 'var(--neg)' };

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
          <h1 style={{ font: 'var(--type-h1)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: '0 0 4px' }}>{list.name}</h1>
          {list.description && <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)', margin: 0 }}>{list.description}</p>}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
          <button onClick={() => onNav('index-detail', { symbol: list.index_symbol })}
            style={{ font: '600 12px/1 var(--font-sans)', padding: '8px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>+ Ajouter</button>
          <button onClick={() => onNav('corr', { listId })}
            style={{ font: '600 12px/1 var(--font-sans)', padding: '8px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>Corrélation</button>
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

      {/* Analysis metrics */}
      {analysis && (
        <section>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 12 }}>
            {[
              { label: 'Score pondéré', value: analysis.avg_score?.toFixed(1), accent: scoreColor(analysis.avg_score) },
              { label: 'Edge moyen', value: (analysis.avg_edge >= 0 ? '+' : '') + analysis.avg_edge?.toFixed(1), accent: 'var(--pos)' },
              { label: 'ρ implicite', value: analysis.rho_impl?.toFixed(2), accent: 'var(--info)' },
              { label: 'ρ̂ réalisée', value: analysis.rho_real?.toFixed(2), accent: 'var(--info)' },
              { label: 'Dispersion', value: (analysis.dispersion * 1e4)?.toFixed(1) + ' ×10⁻⁴', accent: 'var(--accent)' },
              { label: 'Actions', value: String(analysis.n_items), accent: 'var(--text-soft)' },
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
          Cette liste représente votre panier de composants. Le score pondéré synthétise l'attractivité globale de la dispersion sur cet ensemble d'actions. Un score élevé (> 70) avec une prime de corrélation positive est un contexte favorable pour construire une stratégie.
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
                  { l: 'Action', k: 'ticker', al: 'left' },
                  { l: 'Poids', k: 'weight', al: 'right' },
                  { l: 'IV/HV', k: null, al: 'right' },
                  { l: 'β', k: null, al: 'right' },
                  { l: 'Edge', k: 'score', al: 'right' },
                  { l: 'Score', k: 'score', al: 'right' },
                  { l: 'Ajouté', k: 'added', al: 'right' },
                  { l: '', k: null, al: 'right' },
                ].map((h, i) => (
                  <th key={h.l+i} onClick={h.k ? () => cycleSort(h.k) : undefined}
                    style={{ font: '600 10px/1 var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', padding: '11px 14px', textAlign: h.al, borderBottom: '1px solid var(--border)', cursor: h.k ? 'pointer' : 'default', userSelect: 'none', whiteSpace: 'nowrap' }}>
                    {h.l}{h.k && sortArrow(h.k)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map(item => {
                const comp = (window.DXMock.getComponents(list.index_symbol) || []).find(c => c.ticker === item.ticker) || {};
                return (
                  <tr key={item.ticker}
                    onClick={() => onScore(list.index_symbol, item.ticker, 30)}
                    style={{ borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer', transition: 'background var(--dur-fast) var(--ease)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 26, height: 26, borderRadius: 6, background: 'var(--bg-elevated)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '700 8px/1 var(--font-mono)', color: 'var(--text-soft)', flexShrink: 0 }}>{item.ticker.slice(0,3)}</div>
                        <div>
                          <div style={{ font: 'var(--type-ticker)', color: 'var(--text)' }}>{item.ticker}</div>
                          {comp.name && <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)' }}>{comp.name}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', font: 'var(--type-data-sm)', color: 'var(--text-soft)' }}>{comp.weight?.toFixed(1) ?? '—'}%</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', font: 'var(--type-data-sm)', color: 'var(--text-soft)' }}>
                      {comp.iv ? `${comp.iv?.toFixed(1)} / ${comp.hv?.toFixed(1)}` : '—'}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', font: 'var(--type-data-sm)', color: 'var(--text-soft)' }}>{comp.beta?.toFixed(2) ?? '—'}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', font: 'var(--type-data-sm)', color: 'var(--pos-bright)' }}>—</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                      {item.score != null && (
                        <span style={{ font: '700 12px/1 var(--font-mono)', padding: '3px 7px', borderRadius: 'var(--radius)', background: item.score >= 70 ? 'var(--pos-soft)' : item.score >= 50 ? 'var(--warn-soft)' : 'var(--neg-soft)', color: scoreColor(item.score), border: `1px solid ${item.score >= 70 ? 'var(--pos)' : item.score >= 50 ? 'var(--warn)' : 'var(--neg)'}` }}>{item.score}</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', font: 'var(--type-caption)', color: 'var(--text-muted)' }}>{item.added}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                      <button onClick={e => { e.stopPropagation(); handleRemove(item.ticker); }}
                        style={{ font: '600 12px/1', padding: '4px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--neg)', background: 'transparent', color: 'var(--neg-bright)', cursor: 'pointer' }}>×</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

window.ListDetail = ListDetail;
