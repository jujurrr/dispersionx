// Correlation Lab — the intellectual core. ρ matrix + implied vs realized history.
function CorrelationLab({ mode }) {
  const D = window.DXData;
  const { MetricCard, Badge, CorrelationGauge, WarningPanel, BeginnerExplanationBox } = window.DispersionXDesignSystem_cb86be;
  const C = D.corr;

  // teal (low ρ, good for dispersion) → red (high ρ, risk)
  const cellColor = (v) => {
    if (v >= 0.999) return 'var(--bg-elevated)';
    const t = Math.max(0, Math.min(1, (v - 0.3) / 0.5));
    return t < 0.5
      ? `rgba(38,166,154,${0.5 - t * 0.6 + 0.18})`
      : `rgba(239,83,80,${(t - 0.5) * 1.2 + 0.12})`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ font: 'var(--type-h1)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: '0 0 6px' }}>Correlation Lab</h1>
        <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)', margin: 0, maxWidth: 660 }}>
          Le cœur de la stratégie : ce que le marché price (ρ implicite) face à ce qui a été observé (ρ̂ réalisée). L'écart est la prime de corrélation — un signal à analyser.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        <MetricCard label="ρ implicite" value="0.61" hint="Pricé via les options d'indice" accent="var(--accent)" />
        <MetricCard label="ρ̂ réalisée" value="0.48" hint="Observée sur les composants" accent="var(--info)" />
        <MetricCard label="Prime de corrélation" value="+6.4" unit="pts" delta="+1.2 vs J-15" accent="var(--pos)" />
        <MetricCard label="Lecture" value="Favorable" accent="var(--pos)" />
      </div>

      {mode === 'Débutant' && (
        <BeginnerExplanationBox>
          Une dispersion classique cherche une corrélation implicite supérieure à la réalisée : l'indice price une synchronisation plus forte que celle observée récemment. Plus la matrice est « froide » (ρ faibles, teintes teal), plus les composants bougent indépendamment.
        </BeginnerExplanationBox>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 16, alignItems: 'start' }}>
        {/* Heatmap matrix */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ font: 'var(--type-h3)', color: 'var(--text)', margin: 0 }}>Matrice de corrélation réalisée</h3>
            <Badge tone="neutral" size="sm">60 jours</Badge>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: `48px repeat(${C.matrixTickers.length}, 1fr)`, gap: 3 }}>
            <div />
            {C.matrixTickers.map((t) => (
              <div key={t} style={{ font: '600 9px/1 var(--font-mono)', color: 'var(--text-muted)', textAlign: 'center', paddingBottom: 4 }}>{t}</div>
            ))}
            {C.matrix.map((row, i) => (
              <React.Fragment key={i}>
                <div style={{ font: '600 9px/1 var(--font-mono)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>{C.matrixTickers[i]}</div>
                {row.map((v, j) => (
                  <div key={j} title={`${C.matrixTickers[i]} · ${C.matrixTickers[j]} = ${v.toFixed(2)}`} style={{
                    aspectRatio: '1', borderRadius: 3, background: cellColor(v),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    font: '600 10px/1 var(--font-mono)', color: i === j ? 'var(--text-dim)' : 'var(--text)',
                  }}>{v.toFixed(2)}</div>
                ))}
              </React.Fragment>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, font: 'var(--type-caption)', color: 'var(--text-muted)' }}>
            <span style={{ color: 'var(--pos-bright)' }}>● ρ faible (dispersion favorable)</span>
            <span style={{ color: 'var(--neg-bright)' }}>● ρ élevée (risque corrélé)</span>
          </div>
        </div>

        {/* Gauge + reading */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20, display: 'flex', justifyContent: 'center' }}>
            <CorrelationGauge implied={0.61} realized={0.48} size={240} />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Badge tone="pos" dot>Prime élevée</Badge>
            <Badge tone="warn">ρ̂ réalisée en légère hausse</Badge>
            <Badge tone="neg">Risque sell-off corrélé</Badge>
          </div>
        </div>
      </div>

      {/* History */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <h3 style={{ font: 'var(--type-h3)', color: 'var(--text)', margin: 0 }}>Historique ρ implicite vs réalisée</h3>
          <div style={{ display: 'flex', gap: 16, font: 'var(--type-caption)' }}>
            <span style={{ color: 'var(--accent-hover)' }}>● implicite</span>
            <span style={{ color: 'var(--info)' }}>● réalisée</span>
          </div>
        </div>
        <p style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', margin: '0 0 8px' }}>L'écart entre les deux courbes est la prime de corrélation — elle s'est élargie sur les 30 derniers jours.</p>
        <History data={C.history} />
      </div>

      <WarningPanel tone="neg" title="Le risque à garder en tête">
        Si la corrélation réalisée rejoint brutalement l'implicite — typiquement lors d'un sell-off corrélé — la prime se referme et la dispersion perd. La prime positive est un point d'entrée potentiel, jamais une garantie.
      </WarningPanel>
    </div>
  );

  function History({ data }) {
    const w = 860, h = 200, padX = 36, padY = 24;
    const all = data.flatMap((p) => [p.impl, p.real]);
    const min = Math.min(...all) - 0.04, max = Math.max(...all) + 0.04;
    const xs = (i) => padX + (i / (data.length - 1)) * (w - padX * 2);
    const ys = (v) => h - padY - ((v - min) / (max - min)) * (h - padY * 2);
    const line = (key) => data.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xs(i)} ${ys(p[key])}`).join(' ');
    return (
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} style={{ display: 'block' }}>
        <defs><linearGradient id="prem" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="rgba(38,166,154,0.22)" /><stop offset="100%" stopColor="rgba(38,166,154,0.02)" /></linearGradient></defs>
        {[0, 0.25, 0.5, 0.75, 1].map((g) => {
          const v = min + (max - min) * g;
          return <g key={g}><line x1={padX} y1={ys(v)} x2={w - padX} y2={ys(v)} stroke="var(--border-subtle)" /><text x={4} y={ys(v) + 3} fontSize="9" fontFamily="var(--font-mono)" fill="var(--text-dim)">{v.toFixed(2)}</text></g>;
        })}
        {/* premium fill between curves */}
        <path d={`${line('impl')} L ${xs(data.length - 1)} ${ys(data[data.length - 1].real)} ${[...data].reverse().map((p, i) => `L ${xs(data.length - 1 - i)} ${ys(p.real)}`).join(' ')} Z`} fill="url(#prem)" />
        <path d={line('real')} fill="none" stroke="var(--info)" strokeWidth="2.5" />
        <path d={line('impl')} fill="none" stroke="var(--accent-hover)" strokeWidth="2.5" />
        {data.map((p, i) => <g key={i}><circle cx={xs(i)} cy={ys(p.impl)} r="3" fill="var(--accent-hover)" /><circle cx={xs(i)} cy={ys(p.real)} r="3" fill="var(--info)" /><text x={xs(i)} y={h - 6} fontSize="9" fontFamily="var(--font-mono)" fill="var(--text-dim)" textAnchor="middle">{p.d}</text></g>)}
      </svg>
    );
  }
}

Object.assign(window, { CorrelationLab });
