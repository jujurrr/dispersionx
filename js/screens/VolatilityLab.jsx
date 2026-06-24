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

/* ── Nuage IV vs HV (par composant) ──────────────────────────────── */
/* Chaque point = une action. Diagonale IV=HV : au-dessus → volatilité
   « chère » (IV > HV, vendeur d'options avantagé) ; en-dessous → « bon
   marché ». Vue idéale pour repérer les meilleurs candidats dispersion. */
function IvHvScatter({ rows }) {
  const pts = (rows || []).filter(r => r.hv30 != null && r.iv_est != null);
  if (pts.length < 2) return null;
  const w = 560, h = 330, padL = 44, padB = 36, padT = 12, padR = 16;
  const all = pts.flatMap(p => [p.hv30, p.iv_est]);
  const lo = Math.max(0, Math.floor((Math.min(...all) - 4) / 5) * 5);
  const hi = Math.ceil((Math.max(...all) + 4) / 5) * 5;
  const sx = v => padL + (v - lo) / (hi - lo || 1) * (w - padL - padR);
  const sy = v => h - padB - (v - lo) / (hi - lo || 1) * (h - padB - padT);
  const ticks = Array.from({ length: 6 }, (_, i) => Math.round(lo + (hi - lo) / 5 * i));
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} style={{ display: 'block' }}>
      {ticks.map(t => (
        <g key={t}>
          <line x1={sx(t)} y1={padT} x2={sx(t)} y2={h - padB} stroke="var(--border-subtle)" />
          <line x1={padL} y1={sy(t)} x2={w - padR} y2={sy(t)} stroke="var(--border-subtle)" />
          <text x={sx(t)} y={h - padB + 13} fontSize="9" fontFamily="var(--font-mono)" fill="var(--text-dim)" textAnchor="middle">{t}</text>
          <text x={padL - 6} y={sy(t) + 3} fontSize="9" fontFamily="var(--font-mono)" fill="var(--text-dim)" textAnchor="end">{t}</text>
        </g>
      ))}
      {/* Diagonale IV = HV */}
      <line x1={sx(lo)} y1={sy(lo)} x2={sx(hi)} y2={sy(hi)} stroke="var(--warn)" strokeWidth="1.5" strokeDasharray="5 4" />
      <text x={sx(hi) - 4} y={sy(hi) + 13} fontSize="9" fontFamily="var(--font-mono)" fill="var(--warn)" textAnchor="end">IV = HV</text>
      {pts.map(p => {
        const pos = p.iv_est >= p.hv30;
        return (
          <g key={p.ticker}>
            <circle cx={sx(p.hv30)} cy={sy(p.iv_est)} r="5" fill={pos ? 'var(--pos-bright)' : 'var(--neg-bright)'} fillOpacity="0.85" stroke="var(--bg-card)" strokeWidth="1.5" />
            <text x={sx(p.hv30) + 8} y={sy(p.iv_est) + 3} fontSize="9" fontFamily="var(--font-mono)" fill="var(--text-soft)">{p.ticker}</text>
          </g>
        );
      })}
      <text x={(padL + w - padR) / 2} y={h - 1} fontSize="10" fontFamily="var(--font-sans)" fill="var(--text-muted)" textAnchor="middle">HV 30j (%)</text>
      <text x={12} y={(padT + h - padB) / 2} fontSize="10" fontFamily="var(--font-sans)" fill="var(--text-muted)" textAnchor="middle" transform={`rotate(-90 12 ${(padT + h - padB) / 2})`}>IV est. (%)</text>
    </svg>
  );
}

/* ── Barres divergentes : prime de vol (IV − HV) par composant ────── */
function VolPrimeBars({ rows }) {
  const items = (rows || []).filter(r => r.spread != null).sort((a, b) => b.spread - a.spread);
  if (!items.length) return null;
  const maxAbs = Math.max(...items.map(it => Math.abs(it.spread)), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {items.map(it => {
        const pos = it.spread >= 0;
        const bar = Math.abs(it.spread) / maxAbs * 46;
        return (
          <div key={it.ticker} style={{ display: 'grid', gridTemplateColumns: '64px 1fr 52px', gap: 8, alignItems: 'center' }}>
            <span style={{ font: '600 11px/1 var(--font-mono)', color: 'var(--text-soft)' }}>{it.ticker}</span>
            <div style={{ position: 'relative', height: 16, background: 'var(--bg-elevated)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, background: 'var(--border)' }} />
              <div style={{
                position: 'absolute', top: 3, bottom: 3,
                [pos ? 'left' : 'right']: '50%', width: bar + '%',
                background: pos ? 'var(--pos-bright)' : 'var(--neg-bright)',
                borderRadius: 2, opacity: 0.85, transition: 'width 0.7s var(--ease)',
              }} />
            </div>
            <span style={{ font: '700 11px/1 var(--font-mono)', color: pos ? 'var(--pos-bright)' : 'var(--neg-bright)', textAlign: 'right' }}>
              {pos ? '+' : ''}{it.spread.toFixed(1)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* Historique HV moyen du panier (réel si dispo, sinon estimé) ─────── */
function basketHvHistory(rows, avgHV) {
  const withHist = (rows || []).filter(r => Array.isArray(r.hv_history) && r.hv_history.length >= 5);
  if (withHist.length) {
    const len = Math.min(...withHist.map(r => r.hv_history.length));
    return Array.from({ length: len }, (_, i) =>
      withHist.reduce((s, r) => s + r.hv_history[r.hv_history.length - len + i], 0) / withHist.length
    );
  }
  if (avgHV == null) return [];
  return Array.from({ length: 90 }, (_, i) =>
    Math.max(3, avgHV + Math.sin(i * 0.27) * avgHV * 0.10 + Math.cos(i * 0.61) * avgHV * 0.05)
  );
}

/* ── Vue ticker unique ───────────────────────────────────────────── */
function SingleTickerView({ ctx, onCtx, lists, mode }) {
  const { MetricCard, Badge, BeginnerExplanationBox } = window.DispersionXDesignSystem_cb86be;
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  const ticker = ctx.ticker;
  const index  = ctx.index || ctx.listIndex || 'SPX';

  function mockFallback(idx) {
    const comps = window.DXMock?.getComponents?.(idx) || [];
    const c = comps.find(x => x.ticker === ticker);
    if (!c) return null;
    const hv = c.hv || 18;
    // Historique HV synthétique (90 pts) pour que le graphique s'affiche
    const hvHistory = Array.from({ length: 90 }, (_, i) =>
      Math.max(3, hv + Math.sin(i * 0.31) * hv * 0.14 + Math.cos(i * 0.73) * hv * 0.07)
    );
    return {
      ticker, index: idx,
      hv30: c.hv, hv60: c.hv ? +(c.hv * 1.04).toFixed(1) : null,
      hv90: c.hv ? +(c.hv * 1.07).toFixed(1) : null, hv252: null,
      iv_est: c.iv, iv_atm: null,
      iv_minus_hv: (c.iv != null && c.hv != null) ? +(c.iv - c.hv).toFixed(1) : null,
      beta: c.beta ?? null,
      correlation: c.rho ?? null,
      hv_history: hvHistory, term: null,
      source: 'reference',
    };
  }

  React.useEffect(() => {
    if (!ticker) return;
    setLoading(true); setData(null);
    DXApi.getTickerVol(ticker, index)
      .then(d => {
        setData((d && !d.error) ? d : mockFallback(index));
        setLoading(false);
      })
      .catch(() => { setData(mockFallback(index)); setLoading(false); });
  }, [ticker, index]);

  if (loading) return (
    <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)', font: 'var(--type-body)' }}>
      Chargement <strong style={{ color: 'var(--text)' }}>{ticker}</strong>…
    </div>
  );

  if (!data) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <window.ModuleCtxBar ctx={ctx} lists={lists} onCtx={onCtx} onClear={() => onCtx({ ticker: null })} />
      <div style={{ padding: 40, textAlign: 'center', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
        <div style={{ font: 'var(--type-h3)', color: 'var(--text)', marginBottom: 8 }}>{ticker} non disponible pour l'indice {index}</div>
        <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)', maxWidth: 400, margin: '0 auto 16px' }}>
          Ce ticker n'est pas dans l'indice {index}. Essayez un autre indice ou une action connue.
        </p>
        <button onClick={() => onCtx({ ticker: null, listId: null, listName: null, index: null, listIndex: null })}
          style={{ padding: '8px 20px', font: '600 13px/1 var(--font-sans)', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer' }}>
          ← Nouvelle recherche
        </button>
      </div>
    </div>
  );

  const D = data;
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
  const isMock = D.source === 'reference';
  const src    = D.source === 'marketdata+yahoo' ? 'MarketData · IV réelle' : isMock ? 'Données de référence (indices)' : 'Yahoo Finance · IV estimée (×1.12)';

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
        <Badge tone="neutral" size="sm">{D.source === 'marketdata+yahoo' ? 'IV réelle' : isMock ? 'Référence' : 'IV estimée'}</Badge>
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
            { label: 'Beta (90j)', value: beta != null ? beta.toFixed(2) : '—', sub: 'sensibilité directionnelle vs ' + index, color: beta == null ? 'var(--text-muted)' : Math.abs(beta - 1) < 0.2 ? 'var(--pos)' : 'var(--warn)' },
            { label: 'Corrélation', value: corr != null ? corr.toFixed(2) : '—', sub: 'coefficient Pearson 90j vs ' + index, color: corr == null ? 'var(--text-muted)' : corr > 0.7 ? 'var(--neg)' : 'var(--pos)' },
            { label: 'Vol relative', value: hv30 != null ? (hv30 > 20 ? 'Élevée' : hv30 > 12 ? 'Modérée' : 'Faible') : '—', sub: 'HV30 = ' + (hv30?.toFixed(1) ?? '—') + '%', color: hv30 == null ? 'var(--text-muted)' : hv30 > 20 ? 'var(--neg)' : 'var(--pos)' },
            { label: 'Prime IV', value: spread != null ? (spread > 0 ? 'Positive' : 'Négative') : '—', sub: spread == null ? 'Donnée indisponible' : 'IV ' + (spread > 0 ? '>' : '<') + ' HV : vol ' + (spread > 0 ? 'chère' : 'bon marché'), color: spread == null ? 'var(--text-muted)' : spread > 2 ? 'var(--pos)' : spread > 0 ? 'var(--warn)' : 'var(--neg)' },
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

/* ── Vue liste : analyse de volatilité du panier entier ─────────── */
function ListVolView({ ctx, onCtx, lists, mode }) {
  const { Badge, MetricCard, BeginnerExplanationBox } = window.DispersionXDesignSystem_cb86be;
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
        const idx = list?.index_symbol || index;
        if (!tickers.length) { setLoading(false); return; }

        return DXApi.getBatchVol(tickers, idx).then(d => {
          const live = (d?.results || []).filter(r => !r.error);
          if (live.length > 0) {
            setRows(live);
          } else {
            // Fallback : DXMock pour les composantes connues, ligne vide pour les autres
            const comps = window.DXMock?.getComponents?.(idx) || [];
            const mock = tickers.map(t => {
              const c = comps.find(x => x.ticker === t);
              return c ? {
                ticker: t, hv30: c.hv,
                hv60: c.hv ? +(c.hv * 1.04).toFixed(1) : null,
                hv90: c.hv ? +(c.hv * 1.07).toFixed(1) : null,
                iv_est: c.iv,
                spread: (c.iv != null && c.hv != null) ? +(c.iv - c.hv).toFixed(1) : null,
                beta: c.beta ?? null, correlation: c.rho ?? null,
                source: 'reference',
              } : {
                // Ticker absent du mock : on l'affiche quand même avec "—"
                ticker: t, hv30: null, hv60: null, hv90: null, iv_est: null,
                spread: null, beta: null, correlation: null,
                source: 'unavailable',
              };
            });
            setRows(mock);
          }
          setLoading(false);
        });
      })
      .catch(() => setLoading(false));
  }, [listId]);

  const sorted = [...rows].sort((a, b) => {
    if (sortKey === 'spread') return (b.spread ?? -99) - (a.spread ?? -99);
    if (sortKey === 'hv30')   return (b.hv30   ?? 0)  - (a.hv30   ?? 0);
    if (sortKey === 'iv')     return (b.iv_est  ?? 0)  - (a.iv_est  ?? 0);
    if (sortKey === 'hv60')   return (b.hv60   ?? 0)  - (a.hv60   ?? 0);
    if (sortKey === 'beta')   return (b.beta    ?? 0)  - (a.beta    ?? 0);
    if (sortKey === 'corr')   return (b.correlation ?? 0) - (a.correlation ?? 0);
    return 0;
  });

  const hvRows   = rows.filter(r => r.hv30 != null);
  const ivRows   = rows.filter(r => r.iv_est != null);
  const sprdRows = rows.filter(r => r.spread != null);
  const betaRows = rows.filter(r => r.beta != null);
  const corrRows = rows.filter(r => r.correlation != null);
  const avg = (arr, f) => arr.length ? arr.reduce((s, r) => s + f(r), 0) / arr.length : null;
  const avgHV   = avg(hvRows, r => r.hv30);
  const avgIV   = avg(ivRows, r => r.iv_est);
  const avgSprd = avg(sprdRows, r => r.spread);
  const avgBeta = avg(betaRows, r => r.beta);
  const avgCorr = avg(corrRows, r => r.correlation);
  // Ratio IV/HV moyen et % de noms à vol « chère » (prime positive)
  const ratioRows = rows.filter(r => r.hv30 != null && r.iv_est != null && r.hv30 > 0);
  const avgRatio  = avg(ratioRows, r => r.iv_est / r.hv30);
  const pctRich   = sprdRows.length ? Math.round(sprdRows.filter(r => r.spread > 0).length / sprdRows.length * 100) : null;
  // Dispersion de la HV entre composants (écart-type) — clé pour la dispersion
  const hvStd = hvRows.length > 1
    ? Math.sqrt(hvRows.reduce((s, r) => s + Math.pow(r.hv30 - avgHV, 2), 0) / hvRows.length)
    : null;

  // Séries pour les graphiques agrégés du panier
  const basketHist = basketHvHistory(rows, avgHV);
  const termEst = [
    { d: '14j', v: avgHV != null ? +(avgHV * 1.15).toFixed(1) : null },
    { d: '30j', v: avgIV != null ? +avgIV.toFixed(1) : null },
    { d: '60j', v: avgIV != null ? +(avgIV * 0.97).toFixed(1) : null },
    { d: '90j', v: avgIV != null ? +(avgIV * 0.94).toFixed(1) : null },
    { d: '120j', v: avgIV != null ? +(avgIV * 0.92).toFixed(1) : null },
  ].filter(p => p.v != null);

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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ font: 'var(--type-h1)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: '0 0 4px' }}>
            Volatility Lab — <span style={{ color: 'var(--accent-hover)' }}>{listMeta?.name || '…'}</span>
          </h1>
          <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)', margin: 0 }}>
            {rows.some(r => r.source === 'reference')
              ? 'Données de référence (indices) · Cliquez sur un ticker pour l\'analyser en détail.'
              : 'HV calculée sur Yahoo Finance · IV estimée = HV×1.12 · Cliquez sur un ticker pour l\'analyser en détail.'}
          </p>
        </div>
        {rows.some(r => r.source === 'reference') && (
          <div style={{ padding: '5px 10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', font: 'var(--type-caption)', color: 'var(--text-dim)', flexShrink: 0 }}>
            Données de référence
          </div>
        )}
      </div>

      {/* Résumé du panier */}
      {!loading && rows.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
          <MetricCard label="Tickers analysés" value={rows.length} accent="var(--accent)" />
          <MetricCard label="HV 30j moy." value={avgHV?.toFixed(1) ?? '···'} unit="%" accent="var(--info)" hint="Volatilité réalisée" />
          <MetricCard label="IV moy. (est.)" value={avgIV?.toFixed(1) ?? '···'} unit="%" accent="var(--warn)" hint="Volatilité implicite" />
          <MetricCard label="Prime IV moy." value={avgSprd != null ? (avgSprd >= 0 ? '+' : '') + avgSprd.toFixed(1) : '···'} unit="pts" accent={avgSprd == null ? 'var(--text-muted)' : avgSprd > 0 ? 'var(--pos)' : 'var(--neg)'} hint="IV − HV" />
          <MetricCard label="Ratio IV/HV moy." value={avgRatio?.toFixed(2) ?? '···'} accent={avgRatio == null ? 'var(--text-muted)' : avgRatio > 1 ? 'var(--pos)' : 'var(--neg)'} hint="> 1 = vol chère" />
          <MetricCard label="% vol chère" value={pctRich != null ? pctRich : '···'} unit="%" accent={pctRich == null ? 'var(--text-muted)' : pctRich >= 50 ? 'var(--pos)' : 'var(--warn)'} hint="noms IV > HV" />
        </div>
      )}

      {!loading && rows.length > 0 && (
        <React.Fragment>
          {mode === 'Débutant' && (
            <BeginnerExplanationBox>
              Sur un panier, on cherche une <strong>prime de vol moyenne positive</strong> (IV &gt; HV : la vol est «&nbsp;chère&nbsp;», favorable au vendeur d'options) <em>et</em> une <strong>forte dispersion</strong> des volatilités entre composants — c'est ce qui rend une stratégie de dispersion intéressante. Le nuage IV/HV montre quels noms portent la prime ; les points au-dessus de la diagonale sont les plus attractifs.
            </BeginnerExplanationBox>
          )}

          {/* HV rolling du panier + structure par terme agrégée */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16 }}>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <h3 style={{ font: 'var(--type-h3)', color: 'var(--text)', margin: 0 }}>HV 30j moyenne du panier vs IV</h3>
                <Badge tone="neutral" size="sm">90 jours</Badge>
              </div>
              <p style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', margin: '0 0 12px' }}>
                Ligne orange pointillée = IV moyenne du panier. Zone bleue = prime de vol agrégée.
              </p>
              {basketHist.length >= 5
                ? <VLine points={basketHist} color="var(--info)" refLine={avgIV} h={150} />
                : <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-dim)', font: 'var(--type-caption)' }}>Données insuffisantes</div>}
              <div style={{ display: 'flex', gap: 16, marginTop: 8, font: 'var(--type-caption)' }}>
                <span style={{ color: 'var(--info)' }}>— HV 30j moy. (rolling)</span>
                {avgIV != null && <span style={{ color: 'var(--warn)' }}>-- IV moy. {avgIV.toFixed(1)}%</span>}
              </div>
            </div>

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <h3 style={{ font: 'var(--type-h3)', color: 'var(--text)', margin: 0 }}>Structure par terme</h3>
                <Badge tone="neutral" size="sm">Estimé</Badge>
              </div>
              <p style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', margin: '0 0 12px' }}>IV ATM moyenne selon l'échéance.</p>
              {termEst.length >= 2
                ? <VLine points={termEst.map(p => ({ v: p.v, l: p.d }))} color="var(--pos-bright)" labels h={150} />
                : <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-dim)', font: 'var(--type-caption)' }}>Données insuffisantes</div>}
            </div>
          </div>

          {/* Nuage IV vs HV + prime de vol par composant */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 16 }}>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <h3 style={{ font: 'var(--type-h3)', color: 'var(--text)', margin: 0 }}>Nuage IV vs HV</h3>
                <Badge tone="neutral" size="sm">{rows.length} actions</Badge>
              </div>
              <p style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', margin: '0 0 6px' }}>
                Au-dessus de la diagonale = <span style={{ color: 'var(--pos-bright)' }}>vol chère</span> (IV &gt; HV) ·
                en-dessous = <span style={{ color: 'var(--neg-bright)' }}>vol bon marché</span>.
              </p>
              <IvHvScatter rows={rows} />
            </div>

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
              <h3 style={{ font: 'var(--type-h3)', color: 'var(--text)', margin: '0 0 4px' }}>Prime de vol par composant</h3>
              <p style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', margin: '0 0 14px' }}>IV − HV, du plus cher au moins cher.</p>
              <VolPrimeBars rows={rows} />
            </div>
          </div>

          {/* Profil de volatilité agrégé vs indice */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
            <h3 style={{ font: 'var(--type-h3)', color: 'var(--text)', margin: '0 0 14px' }}>Profil de volatilité du panier vs {listMeta?.index_symbol || index}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              {[
                { label: 'Beta moyen', value: avgBeta != null ? avgBeta.toFixed(2) : '—', sub: 'sensibilité directionnelle vs ' + (listMeta?.index_symbol || index), color: avgBeta == null ? 'var(--text-muted)' : Math.abs(avgBeta - 1) < 0.2 ? 'var(--pos)' : 'var(--warn)' },
                { label: 'Corrélation moy.', value: avgCorr != null ? avgCorr.toFixed(2) : '—', sub: 'ρ moyen 90j vs ' + (listMeta?.index_symbol || index), color: avgCorr == null ? 'var(--text-muted)' : avgCorr > 0.7 ? 'var(--neg)' : 'var(--pos)' },
                { label: 'Dispersion HV', value: hvStd != null ? hvStd.toFixed(1) : '—', sub: 'écart-type des HV — élevé = favorable', color: hvStd == null ? 'var(--text-muted)' : hvStd > 8 ? 'var(--pos)' : 'var(--warn)' },
                { label: 'Prime IV', value: avgSprd != null ? (avgSprd > 0 ? 'Positive' : 'Négative') : '—', sub: avgSprd == null ? 'Donnée indisponible' : 'vol ' + (avgSprd > 0 ? 'chère en moyenne' : 'bon marché'), color: avgSprd == null ? 'var(--text-muted)' : avgSprd > 2 ? 'var(--pos)' : avgSprd > 0 ? 'var(--warn)' : 'var(--neg)' },
              ].map(item => (
                <div key={item.label} style={{ padding: '14px 16px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                  <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 6 }}>{item.label}</div>
                  <div style={{ font: '700 20px/1 var(--font-mono)', color: item.color, marginBottom: 4 }}>{item.value}</div>
                  <div style={{ font: 'var(--type-caption)', color: 'var(--text-dim)' }}>{item.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </React.Fragment>
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
                <ThBtn k="hv90"  label="HV 90j" />
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
                    <td style={{ padding: '10px 10px', font: 'var(--type-data)', color: 'var(--text-soft)', textAlign: 'right' }}>{r.hv90?.toFixed(1) ?? '—'}%</td>
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
