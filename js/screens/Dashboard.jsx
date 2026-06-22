/* ─── Dashboard: what deserves my attention today? ─────────────── */
function Dashboard({ onNav, lists, mode }) {
  const { MetricCard, ScoreBadge, RiskBadge, Badge, BeginnerExplanationBox } = window.DispersionXDesignSystem_cb86be;
  const [positions, setPositions] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [mktData, setMktData] = React.useState(null);

  React.useEffect(() => {
    DXApi.getPositions().catch(() => window.DXMock?.positions || [])
      .then(pos => { setPositions(pos || []); setLoading(false); });
    // Charger les vraies données de marché
    Promise.all([
      fetch('/api/vol/spx').then(r => r.ok ? r.json() : null).catch(() => null),
      DXApi.getCorrelation(null, ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'META', 'AMZN'], 'SPX').catch(() => null),
    ]).then(([vol, corr]) => setMktData({ vol, corr }));
  }, []);

  const D = window.DXData;
  const opportunities = D?.opportunities || [];
  const alerts = D?.alerts || [
    { t: 'AAPL · earnings dans 6j', tone: 'var(--warn)' },
    { t: 'NDX · ρ̂ réalisée en hausse', tone: 'var(--neg)' },
    { t: 'SPX 30j · theta critique', tone: 'var(--neg)' },
    { t: 'TSLA · vol crush probable', tone: 'var(--warn)' },
  ];

  const vol  = mktData?.vol;
  const corr = mktData?.corr;
  const ivAtm  = vol?.iv_atm ?? null;
  const hv30d  = vol?.hv30   ?? null;
  const rhoI   = corr?.rho_impl ?? null;
  const rhoR   = corr?.rho_real ?? null;
  const prime  = rhoI != null && rhoR != null ? Number(((rhoI - rhoR) * 100).toFixed(1)) : null;
  const signal = prime != null ? (prime > 5 ? 'Favorable' : prime > 0 ? 'Neutre' : 'Défavorable') : '···';
  const sigAccent = prime != null ? (prime > 5 ? 'var(--pos)' : prime > 0 ? 'var(--warn)' : 'var(--neg)') : 'var(--text-muted)';

  const marketCards = [
    { label: 'IV ATM SPX', value: ivAtm != null ? ivAtm.toFixed(1) : '···', unit: '%', accent: 'var(--warn)', hint: vol?.source === 'marketdata+yahoo' ? 'MarketData' : 'Est.' },
    { label: 'ρ implicite SPX', value: rhoI != null ? rhoI.toFixed(2) : '···', accent: 'var(--accent)' },
    { label: 'Prime ρ', value: prime != null ? (prime >= 0 ? '+' : '') + prime : '···', unit: prime != null ? 'pts' : '', accent: prime != null && prime > 0 ? 'var(--pos)' : 'var(--neg)' },
    { label: 'HV 30j SPX', value: hv30d != null ? hv30d.toFixed(1) : '···', unit: '%', accent: 'var(--info)', hint: 'Yahoo Finance' },
    { label: 'Signal global', value: signal, accent: sigAccent },
  ];

  const trackedStrategies = [
    { n: 'SPX 30j · dispersion', pnl: '+1 240 $', up: true, prime: '+6.4 pts', alert: null },
    { n: 'NDX 28j · dispersion', pnl: '−320 $', up: false, prime: '+3.1 pts', alert: 'Vega déséquilibré' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Hero */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <h1 style={{ font: 'var(--type-h1)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: 0 }}>Aujourd'hui</h1>
          <Badge tone="accent" dot>Marché ouvert</Badge>
        </div>
        <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)', margin: 0, maxWidth: 640 }}>
          Lecture du jour : la prime de corrélation reste positive sur le SPX. Un signal à analyser, pas une recommandation.
        </p>
      </div>

      {/* Market Overview */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 }}>
          <div>
            <h2 style={{ font: 'var(--type-h2)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: 0 }}>Market Overview</h2>
            <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: '4px 0 0' }}>Volatilité et corrélation agrégées du marché</p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
          {marketCards.map((m, i) => (
            <MetricCard key={m.label} {...m} style={{ animationDelay: (i * 70) + 'ms' }} />
          ))}
        </div>
      </section>

      {/* Opportunités */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 }}>
          <div>
            <h2 style={{ font: 'var(--type-h2)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: 0 }}>Opportunités</h2>
            <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: '4px 0 0' }}>Indices où l'écart vol/corrélation mérite un examen</p>
          </div>
          <button onClick={() => onNav('home')} style={{ font: '600 12px/1 var(--font-sans)', padding: '7px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>Tout voir</button>
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', font: 'var(--type-body-sm)' }}>
            <thead>
              <tr style={{ background: 'var(--bg-elevated)' }}>
                {['Indice', 'Maturité', 'Prime ρ', 'Score', 'Risque', ''].map((h, i) => (
                  <th key={h + i} style={{ textAlign: i > 0 && i < 5 ? 'right' : 'left', font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {opportunities.map((o) => (
                <tr key={o.idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '12px 16px', font: 'var(--type-ticker)', color: 'var(--text)' }}>{o.idx}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', font: 'var(--type-data-sm)', color: 'var(--text-soft)' }}>{o.dte}j</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', font: 'var(--type-data)', color: 'var(--pos-bright)' }}>{o.prime} pts</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-block' }}><ScoreBadge score={o.score} max={0} label="" /></div>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}><RiskBadge level={o.risk} size="sm" /></td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <button onClick={() => onNav('index-detail', { symbol: o.idx })}
                      style={{ font: '600 11px/1 var(--font-sans)', padding: '6px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>Analyser</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>
        {/* Stratégies suivies */}
        <section>
          <h2 style={{ font: 'var(--type-h2)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: '0 0 14px' }}>Stratégies suivies</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {trackedStrategies.map((s) => (
              <div key={s.n} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '14px 16px' }}>
                <div>
                  <div style={{ font: 'var(--type-title)', color: 'var(--text)' }}>{s.n}</div>
                  <div style={{ font: 'var(--type-data-sm)', color: 'var(--text-muted)', marginTop: 3 }}>Prime entrée → {s.prime}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {s.alert && <Badge tone="warn" pulse>{s.alert}</Badge>}
                  <div style={{ font: 'var(--type-data-lg)', color: s.up ? 'var(--pos-bright)' : 'var(--neg-bright)' }}>{s.pnl}</div>
                </div>
              </div>
            ))}
            <button onClick={() => onNav('monitor')}
              style={{ font: '600 12px/1 var(--font-sans)', padding: '10px 0', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer', width: '100%' }}>
              Voir toutes les positions →
            </button>
          </div>
        </section>

        {/* Alertes */}
        <section>
          <h2 style={{ font: 'var(--type-h2)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: '0 0 14px' }}>Alertes</h2>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            {alerts.map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderBottom: i < alerts.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: a.tone, flexShrink: 0 }} />
                <span style={{ font: 'var(--type-body-sm)', color: 'var(--text-soft)' }}>{a.t}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Pédagogie */}
      {mode === 'Débutant' && (
        <section>
          <h2 style={{ font: 'var(--type-h2)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: '0 0 14px' }}>Comprendre le signal du jour</h2>
          <BeginnerExplanationBox>
            La prime de corrélation est positive : le marché price une synchronisation plus forte que celle observée récemment sur les composants. C'est le contexte favorable à une dispersion classique — à confirmer avec la liquidité, les earnings et le coût d'exécution.
          </BeginnerExplanationBox>
        </section>
      )}
    </div>
  );
}

window.Dashboard = Dashboard;
