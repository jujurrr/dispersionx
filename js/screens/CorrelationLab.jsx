/* ─── Gauge de prime de corrélation — remplace le composant bundle ─ */
function PrimeGauge({ implied, realized, size = 240 }) {
  const premium  = (implied - realized) * 100;
  // norm : -20pts → 0, 0pts → 0.5, +20pts → 1
  const target   = Math.max(0, Math.min(1, (premium + 20) / 40));
  const [anim, setAnim] = React.useState(0);

  React.useEffect(() => {
    const t = setTimeout(() => setAnim(target), 80);
    return () => clearTimeout(t);
  }, [target]);

  let tone, verdict;
  if (premium >= 6)       { tone = '#26a69a'; verdict = 'Favorable'; }
  else if (premium >= 0)  { tone = '#ffa726'; verdict = 'Neutre'; }
  else                    { tone = '#ef5350'; verdict = 'Défavorable'; }

  const W = 200, CX = 100, CY = 100, R = 76;
  // Angle du centre du repère : norm=0 → 180°, norm=1 → 0°
  const deg = 180 * (1 - anim);

  // Arc semicercle de gauche (π) vers droite (0)
  const arcD = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`;

  // Labels de bord sur l'arc
  const arcLabel = (norm, txt) => {
    const a = Math.PI * (1 - norm);
    return { x: CX + (R + 14) * Math.cos(a), y: CY - (R + 14) * Math.sin(a), txt };
  };
  const labels = [arcLabel(0, '−20'), arcLabel(0.5, '0'), arcLabel(1, '+20')];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: size }}>
      <svg viewBox={`0 0 ${W} 118`} width={size} height={size * 118/W} style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          {/* Gradient horizontal rouge → jaune → vert */}
          <linearGradient id="pgGrad" x1={CX - R} y1="0" x2={CX + R} y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#ef5350" />
            <stop offset="48%"  stopColor="#ffa726" />
            <stop offset="55%"  stopColor="#ffc107" />
            <stop offset="100%" stopColor="#26a69a" />
          </linearGradient>
        </defs>

        {/* Piste de fond */}
        <path d={arcD} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="13" strokeLinecap="round" />

        {/* Arc coloré */}
        <path d={arcD} fill="none" stroke="url(#pgGrad)" strokeWidth="13" strokeLinecap="round" opacity="0.9" />

        {/* Ticks */}
        {[0, 0.25, 0.5, 0.75, 1].map(n => {
          const a = Math.PI * (1 - n);
          const ix = CX + (R - 7) * Math.cos(a), iy = CY - (R - 7) * Math.sin(a);
          const ox = CX + (R + 7) * Math.cos(a), oy = CY - (R + 7) * Math.sin(a);
          return <line key={n} x1={ix} y1={iy} x2={ox} y2={oy} stroke="rgba(0,0,0,0.25)" strokeWidth={n === 0.5 ? 2 : 1} />;
        })}

        {/* Labels arc */}
        {labels.map(l => (
          <text key={l.txt} x={l.x} y={l.y} textAnchor="middle" dominantBaseline="middle"
            fontSize="8" fontFamily="var(--font-mono)" fill="var(--text-dim)">{l.txt}</text>
        ))}

        {/* Aiguille animée */}
        <g style={{ transform: `rotate(${deg}deg)`, transformOrigin: `${CX}px ${CY}px`, transition: 'transform 1s cubic-bezier(0.34,1.4,0.64,1)' }}>
          <line x1={CX + 10} y1={CY} x2={CX + R - 4} y2={CY} stroke={tone} strokeWidth="2.5" strokeLinecap="round" />
          <circle cx={CX + R - 4} cy={CY} r="4" fill={tone} />
        </g>

        {/* Hub central */}
        <circle cx={CX} cy={CY} r="7" fill="var(--bg-card)" stroke={tone} strokeWidth="2.5" />

        {/* Valeur numérique sous le centre */}
        <text x={CX} y={CY + 20} textAnchor="middle" fontSize="11" fontFamily="var(--font-mono)"
          fontWeight="700" fill={tone}>
          {premium >= 0 ? '+' : ''}{premium.toFixed(1)} pts
        </text>
      </svg>

      {/* Libellés sous le graphe */}
      <div style={{ textAlign: 'center', marginTop: 4 }}>
        <div style={{ font: '700 11px/1 var(--font-sans)', color: tone, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>{verdict}</div>
        <div style={{ display: 'flex', gap: 20 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ font: '10px/1 var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 3 }}>ρ implicite</div>
            <div style={{ font: '700 15px/1 var(--font-mono)', color: 'var(--accent-hover)' }}>{implied.toFixed(2)}</div>
          </div>
          <div style={{ width: 1, background: 'var(--border)' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ font: '10px/1 var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 3 }}>ρ̂ réalisée</div>
            <div style={{ font: '700 15px/1 var(--font-mono)', color: 'var(--info)' }}>{realized.toFixed(2)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Correlation Lab: ρ matrix + implied vs realized history ───── */
function CorrelationLab({ listId, onNav, mode }) {
  const { MetricCard, Badge, WarningPanel, BeginnerExplanationBox } = window.DispersionXDesignSystem_cb86be;
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  const DEMO_TICKERS = ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'META', 'AMZN'];

  React.useEffect(() => {
    const resolve = listId
      ? DXApi.getList(listId).then(list => {
          const tickers = (list?.items || []).map(i => i.ticker).filter(Boolean);
          const index   = list?.index_symbol || 'SPX';
          if (tickers.length < 2) return DXApi.getCorrelation(null, DEMO_TICKERS, index);
          return DXApi.getCorrelation(listId, tickers, index);
        })
      : DXApi.getCorrelation(null, DEMO_TICKERS, 'SPX');

    resolve.then(d => { setData(d); setLoading(false); }).catch(() => {
      setData(window.DXData?.corr);
      setLoading(false);
    });
  }, [listId]);

  const cellColor = (v) => {
    if (v >= 0.999) return 'var(--bg-elevated)';
    const t = Math.max(0, Math.min(1, (v - 0.3) / 0.5));
    return t < 0.5
      ? `rgba(38,166,154,${0.5 - t * 0.6 + 0.18})`
      : `rgba(239,83,80,${(t - 0.5) * 1.2 + 0.12})`;
  };

  if (loading) return <div style={{ padding: 80, textAlign: 'center', color: 'var(--text-muted)', font: 'var(--type-body)' }}>Chargement…</div>;

  const C = data || {};
  const rhoImpl = C.rho_impl ?? 0.61;
  const rhoReal = C.rho_real ?? 0.48;
  const prime = ((rhoImpl - rhoReal) * 100).toFixed(1);
  // Normalize matrix: support both {tickers,values} shape and direct 2D array
  const matrixTickers = C.matrixTickers || (C.matrix?.tickers) || ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'META'];
  const rawMatrix = C.matrix;
  const matrix = Array.isArray(rawMatrix) ? rawMatrix : (rawMatrix?.values || matrixTickers.map((_, i) => matrixTickers.map((_, j) => i === j ? 1 : 0.3 + Math.random() * 0.4)));
  const history = C.history || Array.from({ length: 8 }, (_, i) => ({ d: `S-${7-i}`, impl: 0.58 + i * 0.004, real: 0.45 + i * 0.003 }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ font: 'var(--type-h1)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: '0 0 6px' }}>Correlation Lab</h1>
          <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)', margin: 0, maxWidth: 660 }}>
            Le cœur de la stratégie : ce que le marché price (ρ implicite) face à ce qui a été observé (ρ̂ réalisée). L'écart est la prime de corrélation.
          </p>
        </div>
        {listId && (
          <button onClick={() => onNav('list-detail', { listId })}
            style={{ font: '600 12px/1 var(--font-sans)', padding: '8px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>← Liste</button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <MetricCard label="ρ implicite" value={rhoImpl.toFixed(2)} hint="Pricé via les options d'indice" accent="var(--accent)" />
        <MetricCard label="ρ̂ réalisée" value={rhoReal.toFixed(2)} hint="Observée sur les composants" accent="var(--info)" />
        <MetricCard label="Prime de corrélation" value={(prime >= 0 ? '+' : '') + prime} unit="pts" delta={C.delta || '+1.2 vs J-15'} accent="var(--pos)" />
        <MetricCard label="Lecture" value={parseFloat(prime) > 3 ? 'Favorable' : parseFloat(prime) > 0 ? 'Neutre' : 'Défavorable'} accent={parseFloat(prime) > 3 ? 'var(--pos)' : parseFloat(prime) > 0 ? 'var(--warn)' : 'var(--neg)'} />
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
          <div style={{ display: 'grid', gridTemplateColumns: `48px repeat(${matrixTickers.length}, 1fr)`, gap: 3 }}>
            <div />
            {matrixTickers.map((t) => (
              <div key={t} style={{ font: '600 9px/1 var(--font-mono)', color: 'var(--text-muted)', textAlign: 'center', paddingBottom: 4 }}>{t}</div>
            ))}
            {matrix.map((row, i) => (
              <React.Fragment key={i}>
                <div style={{ font: '600 9px/1 var(--font-mono)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>{matrixTickers[i]}</div>
                {row.map((v, j) => (
                  <div key={j} title={`${matrixTickers[i]} · ${matrixTickers[j]} = ${v.toFixed(2)}`} style={{
                    aspectRatio: '1', borderRadius: 3, background: cellColor(v),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    font: '600 10px/1 var(--font-mono)', color: i === j ? 'var(--text-dim)' : 'var(--text)',
                  }}>{v.toFixed(2)}</div>
                ))}
              </React.Fragment>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, font: 'var(--type-caption)', color: 'var(--text-muted)' }}>
            <span style={{ color: 'var(--pos-bright)' }}>● ρ faible (favorable)</span>
            <span style={{ color: 'var(--neg-bright)' }}>● ρ élevée (risque)</span>
          </div>
        </div>

        {/* Gauge + reading */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20, display: 'flex', justifyContent: 'center' }}>
            <PrimeGauge implied={rhoImpl} realized={rhoReal} size={240} />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {parseFloat(prime) > 3 && <Badge tone="pos" dot>Prime élevée</Badge>}
            <Badge tone="warn">ρ̂ réalisée en légère hausse</Badge>
            <Badge tone="neg">Risque sell-off corrélé</Badge>
          </div>
        </div>
      </div>

      {/* History chart */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <h3 style={{ font: 'var(--type-h3)', color: 'var(--text)', margin: 0 }}>Historique ρ implicite vs réalisée</h3>
          <div style={{ display: 'flex', gap: 16, font: 'var(--type-caption)' }}>
            <span style={{ color: 'var(--accent-hover)' }}>● implicite</span>
            <span style={{ color: 'var(--info)' }}>● réalisée</span>
          </div>
        </div>
        <p style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', margin: '0 0 8px' }}>L'écart entre les deux courbes est la prime de corrélation.</p>
        <HistoryChart data={history} />
      </div>

      <WarningPanel tone="neg" title="Le risque à garder en tête">
        Si la corrélation réalisée rejoint brutalement l'implicite — typiquement lors d'un sell-off corrélé — la prime se referme et la dispersion perd. La prime positive est un point d'entrée potentiel, jamais une garantie.
      </WarningPanel>
    </div>
  );
}

function HistoryChart({ data }) {
  const w = 860, h = 200, padX = 36, padY = 24;
  const all = data.flatMap((p) => [p.impl, p.real]);
  const min = Math.min(...all) - 0.04, max = Math.max(...all) + 0.04;
  const xs = (i) => padX + (i / (data.length - 1)) * (w - padX * 2);
  const ys = (v) => h - padY - ((v - min) / (max - min)) * (h - padY * 2);
  const line = (key) => data.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xs(i)} ${ys(p[key])}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} style={{ display: 'block' }}>
      <defs>
        <linearGradient id="corrPremGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(38,166,154,0.22)" />
          <stop offset="100%" stopColor="rgba(38,166,154,0.02)" />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((g) => {
        const v = min + (max - min) * g;
        return (
          <g key={g}>
            <line x1={padX} y1={ys(v)} x2={w - padX} y2={ys(v)} stroke="var(--border-subtle)" />
            <text x={4} y={ys(v) + 3} fontSize="9" fontFamily="var(--font-mono)" fill="var(--text-dim)">{v.toFixed(2)}</text>
          </g>
        );
      })}
      <path
        d={`${line('impl')} L ${xs(data.length - 1)} ${ys(data[data.length - 1].real)} ${[...data].reverse().map((p, i) => `L ${xs(data.length - 1 - i)} ${ys(p.real)}`).join(' ')} Z`}
        fill="url(#corrPremGrad)"
      />
      <path d={line('real')} fill="none" stroke="var(--info)" strokeWidth="2.5" />
      <path d={line('impl')} fill="none" stroke="var(--accent-hover)" strokeWidth="2.5" />
      {data.map((p, i) => (
        <g key={i}>
          <circle cx={xs(i)} cy={ys(p.impl)} r="3" fill="var(--accent-hover)" />
          <circle cx={xs(i)} cy={ys(p.real)} r="3" fill="var(--info)" />
          <text x={xs(i)} y={h - 6} fontSize="9" fontFamily="var(--font-mono)" fill="var(--text-dim)" textAnchor="middle">{p.d}</text>
        </g>
      ))}
    </svg>
  );
}

window.CorrelationLab = CorrelationLab;
