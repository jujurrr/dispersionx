/* ─── Index Detail: Components table with search, sort, quotes ── */
function IndexDetail({ symbol, onNav, onScore, duration, onDuration, mode }) {
  const { Badge, ScoreBadge } = window.DispersionXDesignSystem_cb86be;
  const [index, setIndex] = React.useState(null);
  const [snap, setSnap] = React.useState(null);
  const [components, setComponents] = React.useState([]);
  const [quotes, setQuotes] = React.useState({});
  const [search, setSearch] = React.useState('');
  const [sort, setSort] = React.useState({ key: null, dir: 0 }); // dir: 0=none, 1=asc, -1=desc
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setLoading(true);
    Promise.all([
      DXApi.getIndex(symbol),
      DXApi.getSnapshot(symbol),
      DXApi.getComponents(symbol),
    ]).then(([idx, sn, comps]) => {
      setIndex(idx);
      setSnap(sn);
      setComponents(comps);
      setLoading(false);
      // Load quotes in chunks of 40
      const tickers = comps.map(c => c.ticker);
      for (let i = 0; i < tickers.length; i += 40) {
        DXApi.batchQuotes(tickers.slice(i, i + 40), true, true).then(q => {
          setQuotes(prev => {
            const next = { ...prev };
            q.forEach(r => { next[r.ticker] = r; });
            return next;
          });
        }).catch(() => {});
      }
    }).catch(() => setLoading(false));
  }, [symbol]);

  // Filter
  const q = search.toLowerCase().trim();
  const filtered = components.filter(c =>
    !q || c.ticker.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
  );

  // Score effectif (déterministe) — identique à celui du ScoreModal
  const effScore = (c) => c.score != null ? c.score : (window.DXMock && window.DXMock.scoreFor ? window.DXMock.scoreFor(c.ticker) : null);

  // Sort
  const getSortVal = (c) => {
    if (sort.key === 'score') return effScore(c);
    if (sort.key === 'price' || sort.key === 'day' || sort.key === 'week') {
      const q = quotes[c.ticker];
      return q ? parseFloat(q[sort.key]) : null;
    }
    return c[sort.key];
  };
  const sorted = sort.dir === 0 ? filtered : [...filtered].sort((a, b) => {
    const av = getSortVal(a) ?? (sort.dir > 0 ? Infinity : -Infinity);
    const bv = getSortVal(b) ?? (sort.dir > 0 ? Infinity : -Infinity);
    return typeof av === 'string' ? av.localeCompare(bv) * sort.dir : (av - bv) * sort.dir;
  });

  function cycleSort(key) {
    setSort(s => {
      if (s.key !== key) return { key, dir: 1 };
      if (s.dir === 1) return { key, dir: -1 };
      return { key: null, dir: 0 };
    });
  }
  function sortArrow(key) {
    if (sort.key !== key || sort.dir === 0) return <span style={{ color: 'var(--text-dim)', marginLeft: 4 }}>⇅</span>;
    return <span style={{ color: 'var(--accent-hover)', marginLeft: 4 }}>{sort.dir === 1 ? '↑' : '↓'}</span>;
  }

  const pctColor = (v) => v >= 0 ? 'var(--pos-bright)' : 'var(--neg-bright)';
  const liq2color = (l) => l === 'Élevée' ? 'var(--pos-bright)' : l === 'Bonne' ? 'var(--accent-hover)' : 'var(--warn)';

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80, color: 'var(--text-muted)', font: 'var(--type-body)' }}>
      Chargement de {symbol}…
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Index header */}
      {index && snap && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 36 }}>{index.country_flag}</span>
            <div>
              <h1 style={{ font: 'var(--type-h1)', margin: 0, color: 'var(--text)' }}>{index.name}</h1>
              <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                {[index.symbol, index.currency, `${index.n_components} composants`, index.etf_proxy && `ETF ${index.etf_proxy}`, index.options_liquid && 'Options liquides'].filter(Boolean).map((tag, i) => (
                  <span key={i} style={{ font: '600 10px/1 var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '4px 8px', borderRadius: 'var(--radius-pill)', background: i === 4 ? 'var(--pos-soft)' : 'var(--bg-elevated)', border: `1px solid ${i === 4 ? 'var(--pos)' : 'var(--border)'}`, color: i === 4 ? 'var(--pos-bright)' : 'var(--text-muted)' }}>{tag}</span>
                ))}
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ font: '800 26px/1 var(--font-mono)', color: 'var(--text)' }}>
              {index.currency === 'EUR' ? '€' : '$'}{Number(snap.price).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ font: '600 13px/1 var(--font-mono)', color: pctColor(snap.change), marginTop: 6 }}>
              {snap.change >= 0 ? '▲' : '▼'} {Math.abs(snap.change).toFixed(2)}%
            </div>
          </div>
        </div>
      )}

      {/* Snapshot strip */}
      {snap && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
          {[
            { l: 'HV 30j', v: snap.hv30?.toFixed(1) + '%' },
            { l: 'HV 1 an', v: snap.hv1y?.toFixed(1) + '%' },
            { l: (snap.iv_source === 'alpaca' || snap.iv_source === 'yahoo') ? 'IV ATM' : 'IV est.', v: snap.iv_est?.toFixed(1) + '%' },
            { l: '5 jours', v: (snap.perf5d >= 0 ? '+' : '') + snap.perf5d?.toFixed(1) + '%', up: snap.perf5d },
            { l: '30 jours', v: (snap.perf30d >= 0 ? '+' : '') + snap.perf30d?.toFixed(1) + '%', up: snap.perf30d },
            { l: 'YTD', v: (snap.ytd >= 0 ? '+' : '') + snap.ytd?.toFixed(1) + '%', up: snap.ytd },
          ].map(m => (
            <div key={m.l} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '12px 14px' }}>
              <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 7 }}>{m.l}</div>
              <div style={{ font: '700 18px/1 var(--font-mono)', color: m.up != null ? pctColor(m.up) : 'var(--text)' }}>{m.v}</div>
            </div>
          ))}
        </div>
      )}

      {/* Duration pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <span style={{ font: '600 11px/1 var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Durée stratégie</span>
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-pill)', padding: 3 }}>
          {[14, 30, 45, 60, 90].map(d => (
            <button key={d} onClick={() => onDuration(d)} style={{
              font: '600 12px/1 var(--font-mono)', padding: '6px 13px', borderRadius: 'var(--radius-pill)', border: 'none',
              background: duration === d ? 'var(--accent)' : 'transparent',
              color: duration === d ? '#fff' : 'var(--text-muted)', cursor: 'pointer',
              transition: 'all var(--dur-fast) var(--ease)',
            }}>{d}j</button>
          ))}
        </div>
        <span style={{ marginLeft: 'auto', font: 'var(--type-caption)', color: 'var(--text-dim)' }}>
          {mode === 'Débutant' ? 'Recommandé : 30–45j pour apprendre' : 'Alimente le scoring des composants'}
        </span>
      </div>

      {/* Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0 14px' }}
        ref={el => el && el.addEventListener('focusin', () => el.style.borderColor = 'var(--accent)', true)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher une action par ticker ou nom…"
          style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text)', font: 'var(--type-body)', padding: '11px 0' }} />
        <span style={{ font: 'var(--type-data-sm)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{filtered.length} / {components.length}</span>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-elevated)' }}>
              {[
                { label: 'Action', key: 'ticker', align: 'left' },
                { label: 'Poids', key: 'weight', align: 'right' },
                { label: 'Prix', key: 'price', align: 'right' },
                { label: 'Jour', key: 'day', align: 'right' },
                { label: 'Semaine', key: 'week', align: 'right' },
                { label: 'Secteur', key: 'sector', align: 'left' },
                { label: 'Score', key: 'score', align: 'right' },
                { label: '', key: null, align: 'right' },
              ].map(h => (
                <th key={h.label + (h.key || '')} onClick={h.key ? () => cycleSort(h.key) : undefined}
                  style={{ font: '600 10px/1 var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', padding: '11px 14px', textAlign: h.align, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', cursor: h.key ? 'pointer' : 'default', userSelect: 'none' }}>
                  {h.label}{h.key && sortArrow(h.key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map(c => {
              const q = quotes[c.ticker];
              return (
                <tr key={c.ticker}
                  onClick={() => onScore(symbol, c.ticker, duration)}
                  style={{ borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer', transition: 'background var(--dur-fast) var(--ease)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  {/* Stock cell */}
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <div style={{ width: 26, height: 26, borderRadius: 6, background: 'var(--bg-elevated)', border: '1px solid var(--border)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {c.logo
                          ? <img src={c.logo} alt="" style={{ width: 22, height: 22, objectFit: 'contain' }}
                              onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.insertAdjacentHTML('afterend', `<span style="font:700 8px/1 var(--font-mono);color:var(--text-soft)">${c.ticker.slice(0,3)}</span>`); }} />
                          : <span style={{ font: '700 8px/1 var(--font-mono)', color: 'var(--text-soft)' }}>{c.ticker.slice(0, 3)}</span>
                        }
                      </div>
                      <div>
                        <div style={{ font: 'var(--type-ticker)', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          {c.ticker}
                          {c.earnings && <span style={{ font: '600 9px/1 var(--font-sans)', padding: '2px 5px', borderRadius: 3, background: 'var(--warn-soft)', border: '1px solid var(--warn)', color: 'var(--warn)' }}>EARN</span>}
                        </div>
                        <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', marginTop: 1 }}>{c.name}</div>
                      </div>
                    </div>
                  </td>
                  {/* Weight */}
                  <td style={{ padding: '10px 14px', textAlign: 'right', font: 'var(--type-data-sm)', color: 'var(--text-soft)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 7 }}>
                      <div style={{ width: 54, height: 5, borderRadius: 3, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: Math.min(100, c.weight * 5) + '%', background: 'var(--accent)' }} />
                      </div>
                      {c.weight?.toFixed(1)}%
                    </div>
                  </td>
                  {/* Price */}
                  <td style={{ padding: '10px 14px', textAlign: 'right', font: 'var(--type-data-sm)', color: q ? 'var(--text)' : 'var(--text-dim)' }}>
                    {q ? '$' + Number(q.price).toLocaleString() : '···'}
                  </td>
                  {/* Day */}
                  <td style={{ padding: '10px 14px', textAlign: 'right', font: 'var(--type-data-sm)', color: q ? pctColor(parseFloat(q.day)) : 'var(--text-dim)' }}>
                    {q ? (parseFloat(q.day) >= 0 ? '▲' : '▼') + ' ' + Math.abs(parseFloat(q.day)).toFixed(2) + '%' : '···'}
                  </td>
                  {/* Week */}
                  <td style={{ padding: '10px 14px', textAlign: 'right', font: 'var(--type-data-sm)', color: q && q.week != null ? pctColor(parseFloat(q.week)) : 'var(--text-dim)' }}>
                    {q && q.week != null ? (parseFloat(q.week) >= 0 ? '▲' : '▼') + ' ' + Math.abs(parseFloat(q.week)).toFixed(2) + '%' : '···'}
                  </td>
                  {/* Sector */}
                  <td style={{ padding: '10px 14px', textAlign: 'left' }}>
                    <span style={{ font: '600 10px/1 var(--font-sans)', padding: '3px 7px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                      {c.sector}
                    </span>
                  </td>
                  {/* Score */}
                  <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                    {(() => {
                      const sc = effScore(c);
                      if (sc == null) return null;
                      return (
                        <span style={{
                          font: '700 12px/1 var(--font-mono)', padding: '4px 8px', borderRadius: 'var(--radius)',
                          background: sc >= 75 ? 'var(--pos-soft)' : sc >= 55 ? 'var(--warn-soft)' : 'var(--neg-soft)',
                          color: sc >= 75 ? 'var(--pos-bright)' : sc >= 55 ? 'var(--warn)' : 'var(--neg-bright)',
                          border: `1px solid ${sc >= 75 ? 'var(--pos)' : sc >= 55 ? 'var(--warn)' : 'var(--neg)'}`,
                        }}>{sc}</span>
                      );
                    })()}
                  </td>
                  {/* Action */}
                  <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                    <button onClick={e => { e.stopPropagation(); onScore(symbol, c.ticker, duration); }}
                      style={{ font: '600 11px/1 var(--font-sans)', padding: '6px 11px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--accent)', background: 'var(--accent)', color: '#fff', cursor: 'pointer', transition: 'background var(--dur-fast) var(--ease)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-hover)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent)'; }}
                    >▶ Score</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {sorted.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', font: 'var(--type-body)', color: 'var(--text-muted)' }}>
            Aucun composant trouvé pour « {search} »
          </div>
        )}
      </div>

      {mode === 'Débutant' && (
        <div style={{ padding: '14px 16px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', font: 'var(--type-body-sm)', color: 'var(--text-soft)' }}>
          <strong style={{ color: 'var(--accent-hover)' }}>En clair :</strong> Cliquez sur « ▶ Score » pour voir le détail complet d'un composant : liquidité, ratio IV/HV, corrélation, coûts d'exécution et recommandation.
        </div>
      )}
    </div>
  );
}

window.IndexDetail = IndexDetail;
