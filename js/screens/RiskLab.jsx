/* ─── Risk Lab: Greeks, scenarios, P&L heatmap ──────────────────── */
function RiskLab({ listId, onNav, mode }) {
  const { MetricCard, RiskBadge, WarningPanel } = window.DispersionXDesignSystem_cb86be;
  const [riskData, setRiskData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [scenario, setScenario] = React.useState(1);

  React.useEffect(() => {
    const load = listId
      ? DXApi.getRisk(listId).catch(() => window.DXMock?.risk)
      : Promise.resolve(null);
    load.then(d => { setRiskData(d); setLoading(false); });
  }, [listId]);

  if (loading) return <div style={{ padding: 80, textAlign: 'center', color: 'var(--text-muted)', font: 'var(--type-body)' }}>Chargement…</div>;

  const D = window.DXData || {};
  const greeks = D.greeks || [
    { label: 'Δ net', value: '−0.08', hint: 'Quasi-neutre', accent: 'var(--pos)' },
    { label: 'Γ net', value: '+0.003', hint: 'Long gamma', accent: 'var(--accent)' },
    { label: 'Vega net', value: '−48', hint: 'Quasi-neutre', accent: 'var(--pos)' },
    { label: 'Θ /jour', value: '+96 $', hint: 'Positif', accent: 'var(--warn)' },
    { label: 'Rho', value: '−12', hint: 'Sensible taux', accent: 'var(--info)' },
    { label: 'Prime nette', value: '+1 240 $', hint: 'Crédit reçu', accent: 'var(--accent)' },
  ];

  const scenarios = D.scenarios || [
    { name: 'Dispersion forte', pnl: '+2 840', up: true, risk: 'faible' },
    { name: 'Sell-off corrélé', pnl: '−3 420', up: false, risk: 'critique' },
    { name: 'Marché range', pnl: '+920', up: true, risk: 'faible' },
    { name: 'Vol crush', pnl: '−840', up: false, risk: 'modéré' },
    { name: 'Gap directionnel', pnl: '−1 100', up: false, risk: 'élevé' },
    { name: 'Theta decay', pnl: '+480', up: true, risk: 'faible' },
  ];

  const pnlByName = D.pnlByName || [
    { t: 'AAPL', pnl: -820 }, { t: 'MSFT', pnl: 240 }, { t: 'NVDA', pnl: -340 },
    { t: 'GOOGL', pnl: 180 }, { t: 'META', pnl: 120 },
  ];
  const pnlBySector = D.pnlBySector || [
    { s: 'Technology', pnl: -640 }, { s: 'Communication', pnl: 300 }, { s: 'Consumer', pnl: -180 },
  ];

  function Attribution({ title, rows }) {
    const max = Math.max(...rows.map((r) => Math.abs(r.pnl)));
    return (
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 16 }}>
        <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 14 }}>{title}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {rows.map((r) => {
            const pos = r.pnl >= 0;
            const w = (Math.abs(r.pnl) / max) * 50;
            return (
              <div key={r.label || r.t || r.s} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 70px', gap: 10, alignItems: 'center' }}>
                <span style={{ font: 'var(--type-data-sm)', color: 'var(--text-soft)' }}>{r.label || r.t || r.s}</span>
                <div style={{ position: 'relative', height: 12, display: 'flex', alignItems: 'center' }}>
                  <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'var(--border-strong)' }} />
                  <div style={{ position: 'absolute', left: pos ? '50%' : `${50 - w}%`, width: `${w}%`, height: 8, borderRadius: 2, background: pos ? 'var(--pos)' : 'var(--neg)' }} />
                </div>
                <span style={{ font: 'var(--type-data-sm)', color: pos ? 'var(--pos-bright)' : 'var(--neg-bright)', textAlign: 'right' }}>{pos ? '+' : ''}{r.pnl} $</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function Heatmap() {
    const rows = 6, cols = 9;
    const cell = (r, c) => {
      const x = (c - cols / 2) / (cols / 2);
      const y = (r - rows / 2) / (rows / 2);
      return 1 - (x * x + y * y) * 1.6 - x * 0.4;
    };
    const color = (v) => {
      if (v > 0.4) return 'var(--pos)';
      if (v > 0.1) return 'rgba(38,166,154,0.45)';
      if (v > -0.2) return 'var(--bg-elevated)';
      if (v > -0.6) return 'rgba(239,83,80,0.4)';
      return 'var(--neg)';
    };
    return (
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 3 }}>
          {Array.from({ length: rows * cols }).map((_, i) => {
            const r = Math.floor(i / cols), c = i % cols;
            return <div key={i} style={{ aspectRatio: '1', borderRadius: 2, background: color(cell(r, c)) }} />;
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
          <span>Spot −8% → +8%</span><span>IV −/+</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ font: 'var(--type-h1)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: '0 0 6px' }}>Risk Lab</h1>
          <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)', margin: 0, maxWidth: 640 }}>
            Les risques de la stratégie, rendus visibles avant toute validation. Un portefeuille vega-neutral n'est pas un portefeuille sans risque.
          </p>
        </div>
        {listId && onNav && (
          <button onClick={() => onNav('checklist', { listId })}
            style={{ font: '600 12px/1 var(--font-sans)', padding: '8px 16px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}>
            Checklist & Suivi →
          </button>
        )}
      </div>

      {/* Greeks */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 }}>
          <div>
            <h2 style={{ font: 'var(--type-h2)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: 0 }}>Grecs agrégés</h2>
            <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: '4px 0 0' }}>Position nette indice + composants</p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
          {greeks.map((g, i) => <MetricCard key={g.label} {...g} style={{ animationDelay: (i * 60) + 'ms' }} />)}
        </div>
      </section>

      {/* Scenarios */}
      <section>
        <div style={{ marginBottom: 14 }}>
          <h2 style={{ font: 'var(--type-h2)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: 0 }}>Scénarios rapides</h2>
          <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: '4px 0 0' }}>P&L estimé sous chaque choc de marché</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {scenarios.map((s, i) => {
            const on = scenario === i;
            return (
              <button key={s.name} onClick={() => setScenario(i)} style={{
                textAlign: 'left', cursor: 'pointer', background: on ? 'var(--bg-elevated)' : 'var(--bg-card)',
                border: `1px solid ${on ? 'var(--border-strong)' : 'var(--border)'}`, borderRadius: 'var(--radius-lg)',
                padding: 16, boxShadow: on ? 'var(--shadow)' : 'none',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ font: 'var(--type-title)', color: 'var(--text)' }}>{s.name}</span>
                  <RiskBadge level={s.risk} size="sm" />
                </div>
                <div style={{ font: 'var(--type-data-lg)', color: s.up ? 'var(--pos-bright)' : 'var(--neg-bright)' }}>
                  {s.pnl} <span style={{ font: 'var(--type-caption)', color: 'var(--text-muted)' }}>$</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <WarningPanel tone="neg" title="Scénario le plus défavorable">
        Le scénario le plus défavorable actuellement est un <strong style={{ color: 'var(--neg-bright)' }}>sell-off corrélé</strong> : l'indice baisse, sa volatilité monte, et les composants se déplacent dans la même direction. C'est le principal risque d'une dispersion classique.
      </WarningPanel>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>
        <section>
          <div style={{ marginBottom: 14 }}>
            <h2 style={{ font: 'var(--type-h2)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: 0 }}>P&L · spot × volatilité</h2>
          </div>
          <Heatmap />
        </section>
        <section>
          <div style={{ marginBottom: 14 }}>
            <h2 style={{ font: 'var(--type-h2)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: 0 }}>Warnings</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <WarningPanel tone="warn" title="Theta élevé">La position perd de la valeur temps rapidement à l'approche de l'échéance.</WarningPanel>
            <WarningPanel tone="warn" title="Concentration secteur">62% du panier en Technology.</WarningPanel>
            <WarningPanel tone="neg" title="Coût bid/ask">L'aller-retour estimé absorbe ~25% de l'Edge.</WarningPanel>
          </div>
        </section>
      </div>

      {/* P&L attribution */}
      <section>
        <div style={{ marginBottom: 14 }}>
          <h2 style={{ font: 'var(--type-h2)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: 0 }}>Attribution du P&L</h2>
          <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: '4px 0 0' }}>Décomposition sous le scénario sélectionné — {scenarios[scenario]?.name}</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 16, alignItems: 'start' }}>
          <Attribution title="Par sous-jacent" rows={pnlByName.map(r => ({ label: r.t, pnl: r.pnl }))} />
          <Attribution title="Par secteur" rows={pnlBySector.map(r => ({ label: r.s, pnl: r.pnl }))} />
        </div>
      </section>
    </div>
  );
}

window.RiskLab = RiskLab;
