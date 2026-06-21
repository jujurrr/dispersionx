// Risk Lab — make risks visible before validation. Risk Navigator, simplified.
function RiskLab({ mode }) {
  const D = window.DXData;
  const { MetricCard, RiskBadge, WarningPanel, Button, Badge } = window.DispersionXDesignSystem_cb86be;
  const [scenario, setScenario] = React.useState(1); // Sell-off corrélé

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
      <div>
        <h1 style={{ font: 'var(--type-h1)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: '0 0 6px' }}>Risk Lab</h1>
        <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)', margin: 0, maxWidth: 640 }}>
          Les risques de la stratégie, rendus visibles avant toute validation. Un portefeuille vega-neutral n'est pas un portefeuille sans risque.
        </p>
      </div>

      {/* Greeks */}
      <section>
        <window.SectionHead title="Grecs agrégés" sub="Position nette indice + composants" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 12 }}>
          {D.greeks.map((g, i) => <MetricCard key={g.label} {...g} glass style={{ animationDelay: (i * 60) + 'ms' }} />)}
        </div>
      </section>

      {/* Scenarios */}
      <section>
        <window.SectionHead title="Scénarios rapides" sub="P&L estimé sous chaque choc de marché" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
          {D.scenarios.map((s, i) => {
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

      {/* Worst case explainer */}
      <WarningPanel tone="neg" title="Scénario le plus défavorable">
        Le scénario le plus défavorable actuellement est un <strong style={{ color: 'var(--neg-bright)' }}>sell-off corrélé</strong> : l'indice baisse, sa volatilité monte, et les composants se déplacent dans la même direction. C'est le principal risque d'une dispersion classique — la jambe short indice perd pendant que la corrélation réalisée rejoint l'implicite.
      </WarningPanel>

      {/* P&L heatmap placeholder + warnings */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>
        <section>
          <window.SectionHead title="P&L · spot × volatilité" />
          <Heatmap />
        </section>
        <section>
          <window.SectionHead title="Warnings" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <WarningPanel tone="warn" title="Theta élevé">La position perd de la valeur temps rapidement à l'approche de l'échéance.</WarningPanel>
            <WarningPanel tone="warn" title="Concentration secteur">62% du panier en Technology.</WarningPanel>
            <WarningPanel tone="neg" title="Coût bid/ask">L'aller-retour estimé absorbe ~25% de l'Edge.</WarningPanel>
          </div>
        </section>
      </div>

      {/* P&L attribution */}
      <section>
        <window.SectionHead title="Attribution du P&L" sub="Décomposition sous le scénario sélectionné — sell-off corrélé" />
        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 16, alignItems: 'start' }}>
          <Attribution title="Par sous-jacent" rows={D.pnlByName.map((r) => ({ label: r.t, pnl: r.pnl }))} />
          <Attribution title="Par secteur" rows={D.pnlBySector.map((r) => ({ label: r.s, pnl: r.pnl }))} />
        </div>
      </section>
    </div>
  );

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
              <div key={r.label} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 70px', gap: 10, alignItems: 'center' }}>
                <span style={{ font: 'var(--type-data-sm)', color: 'var(--text-soft)' }}>{r.label}</span>
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
      // synthetic P&L surface: loss bottom-left (sell-off), gain center
      const x = (c - cols / 2) / (cols / 2);
      const y = (r - rows / 2) / (rows / 2);
      const v = 1 - (x * x + y * y) * 1.6 - x * 0.4;
      return v;
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
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols},1fr)`, gap: 3 }}>
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
}

Object.assign(window, { RiskLab });
