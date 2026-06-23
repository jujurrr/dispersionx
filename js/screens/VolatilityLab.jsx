/* ─── Volatility Lab: IV/HV par liste ou actif isolé ─────────────── */

/* ── Mini graphe lignes ──────────────────────────────────────────── */
function VLine({ points, w = 420, h = 130, color = 'var(--accent-hover)', fill = true, labels, refLine }) {
  if (!points || points.length < 2) return null;
  const vals = points.map(p => (typeof p === 'number' ? p : p.v));
  const allVals = refLine != null ? [...vals, refLine] : vals;
  const lo = Math.min(...allVals) * 0.96, hi = Math.max(...allVals) * 1.04;
  const xs = i => 8 + (i / (points.length - 1)) * (w - 16);
  const ys = v => h - 18 - ((v - lo) / (hi - lo || 1)) * (h - 28);
  const d = vals.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xs(i)} ${ys(v)}`).join(' ');
  const gId = 'vl' + Math.round(w + h);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={gId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      {fill && <path d={`${d} L ${xs(vals.length - 1)} ${h - 18} L ${xs(0)} ${h - 18} Z`} fill={`url(#${gId})`} />}
      {refLine != null && (
        <line x1={8} y1={ys(refLine)} x2={w - 8} y2={ys(refLine)}
          stroke="var(--warn)" strokeWidth="1.5" strokeDasharray="4 3" />
      )}
      <path d={d} fill="none" stroke={color} strokeWidth="2" />
      {labels && vals.map((v, i) => (
        <text key={i} x={xs(i)} y={h - 4} fontSize="9" fontFamily="var(--font-mono)" fill="var(--text-dim)" textAnchor="middle">{typeof points[i] === 'object' ? points[i].l : i}</text>
      ))}
      <circle cx={xs(vals.length - 1)} cy={ys(vals[vals.length - 1])} r="3" fill={color} />
    </svg>
  );
}

/* ── Vue ticker unique ───────────────────────────────────────────── */
function SingleTickerView({ ctx, onCtx, lists, mode }) {
  const { MetricCard, Badge, BeginnerExplanationBox } = window.DispersionXDesignSystem_cb86be;
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  const ticker = ctx.ticker;
  const index  = ctx.index || ctx.listIndex || 'SPX';

  React.useEffect(() => {
    setLoading(true); setData(null);
    DXApi.getTickerVol(ticker, index)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [ticker, index]);

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)', font: 'var(--type-body)' }}>Chargement {ticker}…</div>;

  const D = data || {};
  const hv30  = D.hv30  ?? null;
  const hv60  = D.hv60  ?? null;
  const hv90  = D.hv90  ?? null;
  const hv252 = D.hv252 ?? null;
  const ivEst = D.iv_est ?? null;
  const ivAtm = D.iv_atm ?? null;
  const spread = D.iv_minus_hv ?? null;
  const beta   = D.beta ?? null;
  const corr   = D.correlation ?? null;
  const hvHist = D.hv_history || [];
  const term   = D.term || null;
  const src    = D.source === 'marketdata+yahoo' ? 'MarketData · IV réelle' : 'Yahoo Finance · IV estimée (×1.12)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <window.ModuleCtxBar ctx={ctx} lists={lists} onCtx={onCtx} onClear={() => onCtx({ ticker: null })} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ font: 'var(--type-h1)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: '0 0 4px' }}>
            Volatility Lab — <span style={{ color: 'var(--accent-hover)' }}>{ticker}</span>
          </h1>
          <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)' }}>vs {index} · {src}</div>
        </div>
        <Badge tone="neutral" size="sm">{D.source === 'marketdata+yahoo' ? 'IV réelle' : 'IV estimée'}</Badge>
      </div>

      {/* Métriques */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 10 }}>
        <MetricCard label="HV 30j"  value={hv30  != null ? hv30.toFixed(1) : '···'}  unit="%" accent="var(--info)" />
        <MetricCard label="HV 60j"  value={hv60  != null ? hv60.toFixed(1) : '···'}  unit="%" accent="var(--info)" />
        <MetricCard label="HV 90j"  value={hv90  != null ? hv90.toFixed(1) : '···'}  unit="%" accent="var(--info)" />
        <MetricCard label="HV 252j" value={hv252 != null ? hv252.toFixed(1) : '···'} unit="%" accent="var(--text-muted)" hint="Annualisé" />
        <MetricCard label={ivAtm ? 'IV ATM' : 'IV Est.'} value={ivEst != null ? ivEst.toFixed(1) : '···'} unit="%" accent="var(--warn)" />
        <MetricCard label="IV − HV 30j" value={spread != null ? (spread >= 0 ? '+' : '') + spread.toFixed(1) : '···'} unit="pts" accent={spread != null ? (spread > 0 ? 'var(--pos)' : 'var(--neg)') : 'var(--text-muted)'} />
        <MetricCard label="β / ρ" value={beta != null ? beta.toFixed(2) : '···'} hint={corr != null ? 'ρ ' + corr.toFixed(2) : undefined} accent="var(--accent)" />
      </div>

      {mode === 'Débutant' && (
        <BeginnerExplanationBox>
          La HV (historique) mesure la volatilité réellement observée. L'IV (implicite) est ce que le marché anticipe. Quand IV &gt; HV, la volatilité est «&nbsp;chère&nbsp;» — les vendeurs d'options sont avantagés. L'écart IV−HV est la prime de risque de vol.
        </BeginnerExplanationBox>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16 }}>
        {/* Graphique HV rolling 30j */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <h3 style={{ font: 'var(--type-h3)', color: 'var(--text)', margin: 0 }}>HV 30j rolling vs IV</h3>
            <Badge tone="neutral" size="sm">90 jours</Badge>
          </div>
          <p style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', margin: '0 0 12px' }}>
            Ligne orange pointillée = IV actuelle{ivAtm ? ' (MarketData)' : ' (estimée)'}. Zone bleue = prime de vol.
          </p>
          {hvHist.length >= 5
            ? <VLine points={hvHist} color="var(--info)" refLine={ivEst} h={150} />
            : <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-dim)', font: 'var(--type-caption)' }}>Données insuffisantes</div>
          }
          <div style={{ display: 'flex', gap: 16, marginTop: 8, font: 'var(--type-caption)' }}>
            <span style={{ color: 'var(--info)' }}>— HV 30j (rolling)</span>
            {ivEst && <span style={{ color: 'var(--warn)' }}>-- IV actuelle {ivEst.toFixed(1)}%</span>}
          </div>
        </div>

        {/* Term structure si disponible */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <h3 style={{ font: 'var(--type-h3)', color: 'var(--text)', margin: 0 }}>Structure par terme</h3>
            <Badge tone="neutral" size="sm">{term ? 'MarketData' : 'Estimé'}</Badge>
          </div>
          <p style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', margin: '0 0 12px' }}>IV ATM selon l'échéance.</p>
          {term
            ? <VLine points={term.map(p => ({ v: p.iv, l: p.dte + 'j' }))} color="var(--pos-bright)" labels h={150} />
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '10px 0' }}>
                {[{ d: '14j', v: hv30 ? hv30 * 1.18 : null }, { d: '30j', v: ivEst }, { d: '60j', v: ivEst ? ivEst * 0.97 : null }, { d: '90j', v: ivEst ? ivEst * 0.94 : null }]
                  .filter(p => p.v != null)
                  .map(p => (
                    <div key={p.d} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 28, font: 'var(--type-caption)', color: 'var(--text-dim)', textAlign: 'right' }}>{p.d}</span>
                      <div style={{ flex: 1, height: 8, background: 'var(--bg-elevated)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ width: Math.min(100, p.v) + '%', height: '100%', background: 'var(--pos-bright)', opacity: 0.75 }} />
                      </div>
                      <span style={{ width: 40, font: 'var(--type-data-sm)', color: 'var(--pos-bright)', textAlign: 'right' }}>{p.v.toFixed(1)}%</span>
                    </div>
                  ))}
                <p style={{ font: 'var(--type-caption)', color: 'var(--text-dim)', margin: '4px 0 0' }}>Structure estimée (MarketData non configuré)</p>
              </div>
            )
          }
        </div>
      </div>

      {/* Comparaison HV vs indice */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
        <h3 style={{ font: 'var(--type-h3)', color: 'var(--text)', margin: '0 0 14px' }}>Profil de volatilité vs {index}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {[
            { label: 'Beta (90j)', value: beta != null ? beta.toFixed(2) : '—', sub: 'sensibilité directionnelle vs ' + index, color: Math.abs(beta - 1) < 0.2 ? 'var(--pos)' : 'var(--warn)' },
            { label: 'Corrélation', value: corr != null ? corr.toFixed(2) : '—', sub: 'coefficient Pearson 90j vs ' + index, color: corr != null && corr > 0.7 ? 'var(--neg)' : 'var(--pos)' },
            { label: 'Vol relative', value: hv30 != null ? (hv30 > 20 ? 'Élevée' : hv30 > 12 ? 'Modérée' : 'Faible') : '—', sub: 'HV30 = ' + (hv30?.toFixed(1) ?? '—') + '%', color: hv30 > 20 ? 'var(--neg)' : 'var(--pos)' },
            { label: 'Prime IV', value: spread != null ? (spread > 0 ? 'Positive' : 'Négative') : '—', sub: 'IV ' + (spread > 0 ? '>' : '<') + ' HV : vol ' + (spread > 0 ? 'chère' : 'bon marché'), color: spread > 2 ? 'var(--pos)' : spread > 0 ? 'var(--warn)' : 'var(--neg)' },
          ].map(item => (
            <div key={item.label} style={{ padding: '14px 16px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
              <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 6 }}>{item.label}</div>
              <div style={{ font: '700 20px/1 var(--font-mono)', color: item.color, marginBottom: 4 }}>{item.value}</div>
              <div style={{ font: 'var(--type-caption)', color: 'var(--text-dim)' }}>{item.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Vue liste : tableau comparatif ─────────────────────────────── */
function ListVolView({ ctx, onCtx, lists, mode }) {
  const { Badge, MetricCard } = window.DispersionXDesignSystem_cb86be;
  const [rows, setRows]       = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [sortKey, setSortKey] = React.useState('spread');
  const [listMeta, setListMeta] = React.useState(null);

  const listId = ctx.listId;
  const index  = ctx.listIndex || ctx.index || 'SPX';

  React.useEffect(() => {
    setLoading(true); setRows([]);
    DXApi.getList(listId)
      .then(list => {
        setListMeta(list);
        const tickers = (list?.items || []).map(i => i.ticker).filter(Boolean);
        if (!tickers.length) { setLoading(false); return; }
        return DXApi.getBatchVol(tickers, list?.index_symbol || index);
      })
      .then(d => {
        if (d?.results) setRows(d.results.filter(r => !r.error));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [listId]);

  const sorted = [...rows].sort((a, b) => {
    if (sortKey === 'spread') return (b.spread ?? -99) - (a.spread ?? -99);
    if (sortKey === 'hv30')   return (b.hv30   ?? 0)  - (a.hv30   ?? 0);
    if (sortKey === 'iv')     return (b.iv_est  ?? 0)  - (a.iv_est  ?? 0);
    if (sortKey === 'beta')   return (b.beta    ?? 0)  - (a.beta    ?? 0);
    if (sortKey === 'corr')   return (b.correlation ?? 0) - (a.correlation ?? 0);
    return 0;
  });

  const avgHV   = rows.length ? rows.reduce((s, r) => s + (r.hv30 || 0), 0) / rows.length : null;
  const avgIV   = rows.length ? rows.reduce((s, r) => s + (r.iv_est || 0), 0) / rows.length : null;
  const avgSprd = rows.length ? rows.reduce((s, r) => s + (r.spread || 0), 0) / rows.length : null;

  const ThBtn = ({ k, label }) => (
    <th onClick={() => setSortKey(k)} style={{
      padding: '7px 10px', font: '600 10px/1 var(--font-mono)', textTransform: 'uppercase',
      letterSpacing: '0.06em', color: sortKey === k ? 'var(--accent-hover)' : 'var(--text-muted)',
      cursor: 'pointer', userSelect: 'none', textAlign: 'right', whiteSpace: 'nowrap',
    }}>{label} {sortKey === k ? '↓' : ''}</th>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <window.ModuleCtxBar ctx={ctx} lists={lists} onCtx={onCtx} onClear={() => onCtx({ listId: null, listName: null })} />

      <div>
        <h1 style={{ font: 'var(--type-h1)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: '0 0 4px' }}>
          Volatility Lab — <span style={{ color: 'var(--accent-hover)' }}>{listMeta?.name || '…'}</span>
        </h1>
        <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)', margin: 0 }}>
          HV calculée sur Yahoo Finance · IV estimée = HV×1.12 · Cliquez sur un ticker pour l'analyser en détail.
        </p>
      </div>

      {/* Résumé */}
      {!loading && rows.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          <MetricCard label="Tickers analysés" value={rows.length} accent="var(--accent)" />
          <MetricCard label="HV 30j moy." value={avgHV?.toFixed(1) ?? '···'} unit="%" accent="var(--info)" hint="Volatilité réalisée" />
          <MetricCard label="IV moy. (est.)" value={avgIV?.toFixed(1) ?? '···'} unit="%" accent="var(--warn)" hint="IV ≈ HV×1.12" />
          <MetricCard label="Prime IV moy." value={avgSprd != null ? (avgSprd >= 0 ? '+' : '') + avgSprd.toFixed(1) : '···'} unit="pts" accent={avgSprd > 0 ? 'var(--pos)' : 'var(--neg)'} />
        </div>
      )}

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)', font: 'var(--type-body)' }}>Calcul des volatilités…</div>
      ) : rows.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', font: 'var(--type-body)' }}>Aucune donnée disponible pour cette liste.</div>
      ) : (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '7px 16px', font: '600 10px/1 var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', textAlign: 'left' }}>Ticker</th>
                <ThBtn k="hv30"  label="HV 30j" />
                <ThBtn k="hv60"  label="HV 60j" />
                <ThBtn k="iv"    label="IV Est." />
                <ThBtn k="spread" label="Spread IV−HV" />
                <ThBtn k="beta"  label="Beta" />
                <ThBtn k="corr"  label="ρ vs idx" />
                <th style={{ padding: '7px 10px', color: 'transparent' }}>—</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => {
                const pos = (r.spread ?? 0) >= 0;
                return (
                  <tr key={r.ticker} style={{ borderBottom: i < sorted.length - 1 ? '1px solid var(--border-subtle)' : 'none', background: i % 2 === 0 ? 'transparent' : 'var(--bg-elevated)' }}>
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 22, height: 22, borderRadius: 5, background: 'var(--bg-elevated)', border: '1px solid var(--border)', overflow: 'hidden', display:'flex', alignItems:'center', justifyContent:'center', flexShrink: 0 }}>
                          <img src={`https://assets.parqet.com/logos/symbol/${r.ticker.split('.')[0]}`} alt="" style={{ width: 16, height: 16, objectFit: 'contain' }}
                            onError={e => { e.currentTarget.style.display = 'none'; }} />
                        </div>
                        <span style={{ font: '600 12px/1 var(--font-mono)', color: 'var(--text)' }}>{r.ticker}</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 10px', font: 'var(--type-data)', color: 'var(--info)', textAlign: 'right' }}>{r.hv30?.toFixed(1) ?? '—'}%</td>
                    <td style={{ padding: '10px 10px', font: 'var(--type-data)', color: 'var(--text-soft)', textAlign: 'right' }}>{r.hv60?.toFixed(1) ?? '—'}%</td>
                    <td style={{ padding: '10px 10px', font: 'var(--type-data)', color: 'var(--warn)', textAlign: 'right' }}>{r.iv_est?.toFixed(1) ?? '—'}%</td>
                    <td style={{ padding: '10px 10px', textAlign: 'right' }}>
                      <span style={{ font: '700 12px/1 var(--font-mono)', color: pos ? 'var(--pos-bright)' : 'var(--neg-bright)' }}>
                        {r.spread != null ? (pos ? '+' : '') + r.spread.toFixed(1) : '—'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 10px', font: 'var(--type-data)', color: 'var(--text-soft)', textAlign: 'right' }}>{r.beta?.toFixed(2) ?? '—'}</td>
                    <td style={{ padding: '10px 10px', font: 'var(--type-data)', color: 'var(--text-soft)', textAlign: 'right' }}>{r.correlation?.toFixed(2) ?? '—'}</td>
                    <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                      <button onClick={() => onCtx({ ticker: r.ticker, listId, listName: listMeta?.name, index: listMeta?.index_symbol || index, listIndex: listMeta?.index_symbol || index })}
                        style={{
                          font: '600 10px/1 var(--font-sans)', padding: '4px 8px',
                          background: 'transparent', border: '1px solid var(--border)',
                          borderRadius: 'var(--radius)', color: 'var(--text-soft)', cursor: 'pointer',
                        }}>Isoler →</button>
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

/* ─── Volatility Lab ─────────────────────────────────────────────── */
function VolatilityLab({ mode, lists, moduleCtx, onModuleCtx, onNav }) {
  const ctx = moduleCtx || {};
  const hasCtx = !!(ctx.ticker || ctx.listId);

  function handleCtx(upd) {
    onModuleCtx(upd);
  }

  // Mode sans contexte → picker
  if (!hasCtx) {
    return (
      <window.ModuleCtxPicker
        lists={lists}
        onCtx={handleCtx}
        title="Volatility Lab"
        subtitle="Comparez IV / HV sur une liste entière ou isolez un actif pour analyser sa courbe de vol, sa structure par terme et son beta."
      />
    );
  }

  // Mode ticker isolé
  if (ctx.ticker) {
    return <SingleTickerView ctx={ctx} onCtx={handleCtx} lists={lists} mode={mode} />;
  }

  // Mode liste
  return <ListVolView ctx={ctx} onCtx={handleCtx} lists={lists} mode={mode} />;
}

window.VolatilityLab = VolatilityLab;
