/* ─── Home: Indices grid with async snapshots ─────────────────── */
function Home({ onNav, lists, mode }) {
  const { MetricCard, Badge, EmptyState } = window.DispersionXDesignSystem_cb86be;
  const [indices, setIndices] = React.useState([]);
  const [, setTick] = React.useState(0);   // re-render quand le store met un snap à jour
  const [loading, setLoading] = React.useState(true);
  const recent = lists ? lists.slice(0, 4) : [];

  // Le PRIX (et ses variations) vient du STORE global — la MÊME source que la
  // page de détail d'un indice (IndexDetail). Ainsi le prix affiché ici et au
  // clic sur l'indice sont identiques (plus de divergence). Le store est
  // préchargé au démarrage (preloadAll) et rafraîchi au tick global.
  React.useEffect(() => {
    let idxData = [];
    DXApi.getIndices().then(data => {
      idxData = data || [];
      setIndices(idxData);
      setLoading(false);
      idxData.forEach(idx => window.DXStore && window.DXStore.loadIndex(idx.symbol));   // peuple le store (cache si déjà fait)
    }).catch(() => setLoading(false));
    const render = () => setTick(t => t + 1);
    window.addEventListener('dx-index-update', render);
    const onTick = () => idxData.forEach(idx => window.DXStore && window.DXStore.refreshQuotes(idx.symbol));
    window.addEventListener('dx-price-tick', onTick);
    return () => { window.removeEventListener('dx-index-update', render); window.removeEventListener('dx-price-tick', onTick); };
  }, []);
  const snapOf = (symbol) => (window.DXStore && window.DXStore.getIndexData(symbol)?.snap) || null;

  const fmt = (v, decimals = 2) => v == null ? '—' : Number(v).toFixed(decimals);
  const pctColor = (v) => v >= 0 ? 'var(--pos-bright)' : 'var(--neg-bright)';
  const diffBadge = (d) => d === 'débutant' ? 'pos' : d === 'intermédiaire' ? 'accent' : 'warn';

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80, color: 'var(--text-muted)', font: 'var(--type-body)' }}>
      Chargement des indices…
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Hero */}
      <div>
        <h1 style={{ font: 'var(--type-display)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: '0 0 8px' }}>Construisez votre stratégie</h1>
        <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)', margin: 0, maxWidth: 600 }}>
          Choisissez un indice, sélectionnez les composants, mesurez la prime de corrélation, construisez et testez.
        </p>
        {mode === 'Débutant' && (
          <div style={{ marginTop: 14, padding: '12px 16px', background: 'var(--accent-soft)', border: '1px solid var(--accent-border)', borderRadius: 'var(--radius-lg)', font: 'var(--type-body-sm)', color: 'var(--text-soft)', maxWidth: 580 }}>
            <strong style={{ color: 'var(--accent-hover)' }}>En clair :</strong> Commencez par SPX (S&amp;P 500) — c'est l'indice le plus liquide et le plus documenté pour apprendre la dispersion.
          </div>
        )}
      </div>

      {/* Reprendre une liste */}
      {recent.length > 0 && (
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ font: 'var(--type-h2)', color: 'var(--text)', margin: 0 }}>Reprendre une liste</h2>
            <a onClick={() => onNav('lists')} style={{ font: 'var(--type-body-sm)', color: 'var(--accent-hover)', cursor: 'pointer' }}>Toutes les listes →</a>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {recent.map(list => (
              <div key={list.id} onClick={() => onNav('list-detail', { listId: list.id })}
                className="dx-glass dx-lift" style={{ padding: '14px 16px', borderRadius: 'var(--radius-lg)', cursor: 'pointer' }}>
                <div style={{ font: 'var(--type-ticker)', color: 'var(--accent-hover)', marginBottom: 4 }}>{list.index_symbol}</div>
                <div style={{ font: 'var(--type-title)', color: 'var(--text)', marginBottom: 6 }}>{list.name}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', font: 'var(--type-caption)', color: 'var(--text-muted)' }}>
                  <span>{list.n_items} actions</span>
                  <span style={{ color: list.avg_score >= 70 ? 'var(--pos-bright)' : list.avg_score >= 50 ? 'var(--warn)' : 'var(--neg-bright)' }}>
                    Score {list.avg_score}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Indices grid */}
      <section>
        <h2 style={{ font: 'var(--type-h2)', color: 'var(--text)', margin: '0 0 14px' }}>Choisir un indice</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {indices.map((idx, i) => {
            const snap = snapOf(idx.symbol);
            return (
              <div key={idx.symbol} onClick={() => onNav('index-detail', { symbol: idx.symbol })}
                className="dx-glass dx-lift dx-rise" style={{ padding: 20, borderRadius: 'var(--radius-lg)', cursor: 'pointer', animationDelay: (i * 60) + 'ms' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 28 }}>{idx.country_flag}</span>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ font: '800 18px/1 var(--font-mono)', color: 'var(--text)' }}>{idx.symbol}</span>
                        <Badge tone={diffBadge(idx.difficulty)} size="sm">{idx.difficulty}</Badge>
                      </div>
                      <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', marginTop: 3 }}>{idx.name}</div>
                    </div>
                  </div>
                  {snap && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ font: '700 15px/1 var(--font-mono)', color: 'var(--text)' }}>
                        {idx.currency === 'EUR' ? '€' : '$'}{Number(snap.price).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                      </div>
                      <div style={{ font: 'var(--type-data-sm)', color: pctColor(snap.change), marginTop: 4 }}>
                        {snap.change >= 0 ? '▲' : '▼'} {Math.abs(snap.change).toFixed(2)}%
                      </div>
                    </div>
                  )}
                </div>

                {/* Description */}
                <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: '0 0 12px', lineHeight: 1.5 }}>{idx.description}</p>

                {/* Snap metrics */}
                {snap ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {[
                      { l: '5 jours', v: snap.perf5d == null ? '—' : (snap.perf5d >= 0 ? '+' : '') + fmt(snap.perf5d, 1) + '%', up: snap.perf5d == null ? undefined : snap.perf5d >= 0 },
                      { l: 'IV est.', v: fmt(snap.iv_est) + '%' },
                      { l: 'YTD', v: snap.ytd == null ? '—' : (snap.ytd >= 0 ? '+' : '') + fmt(snap.ytd) + '%', up: snap.ytd == null ? undefined : snap.ytd >= 0 },
                    ].map(m => (
                      <div key={m.l} style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius)', padding: '8px 10px' }}>
                        <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 3 }}>{m.l}</div>
                        <div style={{ font: 'var(--type-data-sm)', color: m.up === false ? 'var(--neg-bright)' : m.up === true ? 'var(--pos-bright)' : 'var(--text)' }}>{m.v}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ font: 'var(--type-caption)', color: 'var(--text-dim)' }}>Chargement des données…</div>
                )}

                {/* Tags */}
                <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
                  <span style={{ font: '600 10px/1 var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.04em', padding: '3px 8px', borderRadius: 'var(--radius-pill)', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>{idx.currency}</span>
                  <span style={{ font: '600 10px/1 var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.04em', padding: '3px 8px', borderRadius: 'var(--radius-pill)', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>{idx.n_components} composants</span>
                  {idx.etf_proxy && <span style={{ font: '600 10px/1 var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.04em', padding: '3px 8px', borderRadius: 'var(--radius-pill)', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>ETF: {idx.etf_proxy}</span>}
                  {idx.options_liquid && <span style={{ font: '600 10px/1 var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.04em', padding: '3px 8px', borderRadius: 'var(--radius-pill)', background: 'var(--pos-soft)', border: '1px solid var(--pos)', color: 'var(--pos-bright)' }}>Options liquides</span>}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

window.Home = Home;
