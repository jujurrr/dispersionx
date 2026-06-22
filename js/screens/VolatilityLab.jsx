/* ─── Volatility Lab: IV/HV, term structure, skew ───────────────── */
function VolatilityLab({ mode }) {
  const { MetricCard, Badge, BeginnerExplanationBox } = window.DispersionXDesignSystem_cb86be;
  const [volData, setVolData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const adv = mode === 'Avancé';

  React.useEffect(() => {
    fetch('/api/vol/spx')
      .then(r => r.ok ? r.json() : null)
      .then(d => { setVolData(d); setLoading(false); })
      .catch(() => { setVolData(null); setLoading(false); });
  }, []);

  const D = volData || {};
  const ivAtm = D.iv_atm ?? 18.2;
  const hv30v = D.hv30  ?? 15.6;
  const ivMhv = D.iv_minus_hv ?? Number((ivAtm - hv30v).toFixed(1));
  const term = (D.term && D.term.length >= 2) ? D.term : [
    { dte: 14, iv: 19.8 }, { dte: 21, iv: 18.6 }, { dte: 30, iv: 18.2 },
    { dte: 45, iv: 17.8 }, { dte: 60, iv: 17.4 }, { dte: 90, iv: 17.1 },
  ];
  const skew = D.skew || [
    { k: '80%', iv: 23.4 }, { k: '85%', iv: 21.8 }, { k: '90%', iv: 20.2 },
    { k: '95%', iv: 19.1 }, { k: '100%', iv: 18.2 }, { k: '105%', iv: 17.8 },
    { k: '110%', iv: 17.6 }, { k: '115%', iv: 17.4 }, { k: '120%', iv: 17.3 },
  ];

  // Historique IV vs HV sur la term (points des DTE disponibles)
  const ivPoints = term.map(p => ({ iv: p.iv }));

  function Panel({ title, hint, children, help }) {
    return (
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <h3 style={{ font: 'var(--type-h3)', color: 'var(--text)', margin: 0 }}>{title}</h3>
          {hint && <Badge tone="neutral" size="sm">{hint}</Badge>}
        </div>
        {help && <p style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', margin: '0 0 14px' }}>{help}</p>}
        {children}
      </div>
    );
  }

  function LineChart({ points, w = 320, h = 110, color = 'var(--accent-hover)', fill = true, labels }) {
    const ivs = points.map((p) => p.iv);
    const min = Math.min(...ivs) - 1, max = Math.max(...ivs) + 1;
    const xs = (i) => (i / (points.length - 1)) * (w - 20) + 10;
    const ys = (v) => h - 18 - ((v - min) / (max - min)) * (h - 30);
    const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xs(i)} ${ys(p.iv)}`).join(' ');
    const gradId = 'vg' + Math.round(w);
    return (
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(65,120,255,0.28)" />
            <stop offset="100%" stopColor="rgba(65,120,255,0)" />
          </linearGradient>
        </defs>
        {fill && <path d={`${d} L ${xs(points.length - 1)} ${h - 18} L ${xs(0)} ${h - 18} Z`} fill={`url(#${gradId})`} />}
        <path d={d} fill="none" stroke={color} strokeWidth="2" />
        {points.map((p, i) => <circle key={i} cx={xs(i)} cy={ys(p.iv)} r="2.5" fill={color} />)}
        {labels && points.map((p, i) => (
          <text key={i} x={xs(i)} y={h - 4} fontSize="9" fontFamily="var(--font-mono)" fill="var(--text-dim)" textAnchor="middle">{labels(p)}</text>
        ))}
      </svg>
    );
  }

  if (loading) return <div style={{ padding: 80, textAlign: 'center', color: 'var(--text-muted)', font: 'var(--type-body)' }}>Chargement…</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ font: 'var(--type-h1)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: '0 0 6px' }}>Volatility Lab</h1>
        <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)', margin: 0, maxWidth: 640 }}>
          Comprendre la volatilité du SPX : implicite vs historique, structure par terme, skew. Chaque lecture explique pourquoi un composant est retenu ou écarté.
        </p>
      </div>

      {/* Top metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
        <MetricCard label="IV ATM" value={ivAtm != null ? ivAtm.toFixed(1) : '···'} unit="%" accent="var(--accent)" hint={D.source === 'marketdata+yahoo' ? 'MarketData · SPY 30j' : D.source === 'yahoo_hv' ? 'Est. HV×1.12' : undefined} />
        <MetricCard label="HV 30j" value={hv30v != null ? hv30v.toFixed(1) : '···'} unit="%" accent="var(--info)" hint="Yahoo Finance · SPY" />
        <MetricCard label="IV − HV" value={ivMhv != null ? (ivMhv >= 0 ? '+' : '') + ivMhv.toFixed(1) : '···'} unit="pts" accent={ivMhv > 0 ? 'var(--pos)' : 'var(--neg)'} />
        <MetricCard label="IV Rank" value="—" unit="%" hint="Requiert données historiques" accent="var(--warn)" />
        <MetricCard label="HV 252j" value={D.hv252 != null ? D.hv252.toFixed(1) : '···'} unit="%" accent="var(--warn)" hint="Annualisée" />
      </div>

      {mode === 'Débutant' && (
        <BeginnerExplanationBox>
          Quand l'IV (ce que le marché anticipe) dépasse la HV (ce qui s'est réellement produit), la volatilité est « chère ». Un IV Rank élevé indique une IV haute par rapport à l'année écoulée — souvent un meilleur moment pour vendre de la volatilité indice.
        </BeginnerExplanationBox>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Panel title="IV vs HV" hint="60 jours" help="L'écart entre volatilité implicite et réalisée.">
          <LineChart points={ivPoints} />
          <div style={{ display: 'flex', gap: 16, marginTop: 6, font: 'var(--type-caption)' }}>
            <span style={{ color: 'var(--accent-hover)' }}>● IV implicite</span>
            <span style={{ color: 'var(--info)' }}>● HV réalisée</span>
          </div>
        </Panel>

        <Panel title="Structure par terme" hint="ATM IV / DTE" help="IV ATM selon l'échéance — backwardation ou contango.">
          <LineChart points={term} color="var(--pos-bright)" labels={(p) => p.dte + 'j'} />
        </Panel>

        <Panel title="Skew" hint="par strike" help="À gauche du spot : puts OTM. À droite : calls OTM.">
          <LineChart points={skew} color="var(--warn)" labels={(p) => p.k} />
          {mode === 'Débutant' && (
            <p style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', margin: '10px 0 0' }}>
              L'IV plus élevée à gauche reflète la demande de protection à la baisse (puts).
            </p>
          )}
        </Panel>

        <Panel title="Open interest" hint={adv ? 'détaillé' : 'résumé'} help="Liquidité par strike sur l'échéance retenue.">
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 110, padding: '8px 0' }}>
            {[30, 52, 74, 96, 68, 88, 60, 44, 28].map((v, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: '100%', height: v, borderRadius: '2px 2px 0 0', background: i === 4 ? 'var(--accent)' : 'var(--border-strong)' }} />
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', font: 'var(--type-caption)', color: 'var(--text-muted)' }}>ATM au centre</div>
        </Panel>
      </div>

      {adv && (
        <Panel title="Multi-expiry skew" hint="mode avancé" help="Surface IV par strike × échéance.">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 3 }}>
            {Array.from({ length: 5 * 5 }).map((_, i) => {
              const r = Math.floor(i / 5), c = i % 5;
              const v = 16 + (4 - c) * 1.6 + r * 0.4;
              const t = (v - 16) / 8;
              return (
                <div key={i} title={v.toFixed(1) + '%'} style={{
                  aspectRatio: '2.4', borderRadius: 2,
                  background: `rgba(255,152,0,${0.12 + t})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  font: '9px/1 var(--font-mono)', color: 'var(--text-soft)',
                }}>{v.toFixed(0)}</div>
              );
            })}
          </div>
        </Panel>
      )}
    </div>
  );
}

window.VolatilityLab = VolatilityLab;
