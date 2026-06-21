// Strategy Monitor — track open dispersion positions: P&L, greeks, prime drift, alerts.
function StrategyMonitor({ mode }) {
  const D = window.DXData;
  const { MetricCard, Badge, RiskBadge, Button, WarningPanel } = window.DispersionXDesignSystem_cb86be;
  const P = D.positions;
  const [sel, setSel] = React.useState(0);

  const totalPnl = P.reduce((a, p) => a + p.pnl, 0);
  const winners = P.filter((p) => p.pnl > 0).length;
  const statusTone = { sain: 'pos', surveiller: 'warn', risque: 'neg' };
  const statusRisk = { sain: 'faible', surveiller: 'modéré', risque: 'élevé' };

  const pos = P[sel];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ font: 'var(--type-h1)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: '0 0 6px' }}>Strategy Monitor</h1>
          <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)', margin: 0, maxWidth: 640 }}>
            Suivi des stratégies de dispersion ouvertes : P&L, grecs, dérive de la prime et alertes. Aucune exécution automatique.
          </p>
        </div>
        <Button variant="outline">Exporter le suivi</Button>
      </div>

      {/* Portfolio summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        <MetricCard label="P&L total ouvert" value={(totalPnl >= 0 ? '+' : '') + totalPnl.toLocaleString('fr-FR')} unit="$" deltaTone={totalPnl >= 0 ? 'pos' : 'neg'} accent="var(--accent)" />
        <MetricCard label="Positions" value={P.length} accent="var(--info)" />
        <MetricCard label="Gagnantes" value={`${winners}/${P.length}`} accent="var(--pos)" />
        <MetricCard label="Alertes actives" value={P.filter((p) => p.alert).length} accent="var(--warn)" />
      </div>

      {/* Positions table */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', font: 'var(--type-body-sm)' }}>
          <thead><tr style={{ background: 'var(--bg-elevated)' }}>
            {['Stratégie', 'DTE', 'Prime entrée', 'Prime actuelle', 'Vega', 'Theta', 'P&L', 'État'].map((hh, i) => (
              <th key={hh} style={{ textAlign: i === 0 ? 'left' : 'right', font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', padding: '11px 16px', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{hh}</th>
            ))}
          </tr></thead>
          <tbody>
            {P.map((p, i) => {
              const drift = parseFloat(p.primeNow) - parseFloat(p.primeIn);
              return (
                <tr key={p.name} onClick={() => setSel(i)} style={{ borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer', background: sel === i ? 'var(--bg-hover)' : 'transparent' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ font: 'var(--type-title)', color: 'var(--text)' }}>{p.name}</div>
                    <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', marginTop: 2 }}>Ouvert {p.opened}{p.alert && <span style={{ color: 'var(--warn)' }}> · {p.alert}</span>}</div>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', font: 'var(--type-data-sm)', color: p.dte < 12 ? 'var(--neg-bright)' : 'var(--text-soft)' }}>{p.dte}j</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', font: 'var(--type-data-sm)', color: 'var(--text-muted)' }}>{p.primeIn} pts</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', font: 'var(--type-data-sm)' }}>
                    <span style={{ color: 'var(--text-soft)' }}>{p.primeNow}</span>
                    <span style={{ color: drift >= 0 ? 'var(--pos-bright)' : 'var(--neg-bright)', marginLeft: 6, fontSize: 11 }}>{drift >= 0 ? '▲' : '▼'}{Math.abs(drift).toFixed(1)}</span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', font: 'var(--type-data-sm)', color: Math.abs(p.vega) > 100 ? 'var(--warn)' : 'var(--text-soft)' }}>{p.vega >= 0 ? '+' : ''}{p.vega}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', font: 'var(--type-data-sm)', color: 'var(--text-soft)' }}>+{p.theta}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', font: 'var(--type-data)', color: p.pnl >= 0 ? 'var(--pos-bright)' : 'var(--neg-bright)' }}>{p.pnl >= 0 ? '+' : ''}{p.pnl.toLocaleString('fr-FR')} $</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}><Badge tone={statusTone[p.status]} dot>{p.status}</Badge></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Selected position detail */}
      <section>
        <window.SectionHead title="Détail de la position" sub={pos.name} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, alignItems: 'start' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            <MetricCard label="P&L" value={(pos.pnl >= 0 ? '+' : '') + pos.pnl.toLocaleString('fr-FR')} unit="$" deltaTone={pos.pnl >= 0 ? 'pos' : 'neg'} accent="var(--accent)" />
            <MetricCard label="Prime entrée → actuelle" value={`${pos.primeIn} → ${pos.primeNow}`} accent="var(--info)" />
            <MetricCard label="DTE restant" value={pos.dte} unit="j" accent={pos.dte < 12 ? 'var(--neg)' : 'var(--warn)'} />
            <MetricCard label="Vega net" value={(pos.vega >= 0 ? '+' : '') + pos.vega} accent={Math.abs(pos.vega) > 100 ? 'var(--warn)' : 'var(--pos)'} />
            <MetricCard label="Theta /jour" value={'+' + pos.theta} unit="$" accent="var(--warn)" />
            <MetricCard label="Risque" value={statusRisk[pos.status]} accent={`var(--${statusTone[pos.status] === 'pos' ? 'pos' : statusTone[pos.status] === 'warn' ? 'warn' : 'neg'})`} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pos.alert
              ? <WarningPanel tone={pos.status === 'risque' ? 'neg' : 'warn'} title="Alerte">{pos.alert} — réévaluer ou préparer un ajustement manuel.</WarningPanel>
              : <WarningPanel tone="pos" title="Position saine">Prime stable ou en progression, grecs dans la tolérance. Aucune action requise.</WarningPanel>}
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="outline" size="sm" full>Ouvrir le Trade Brief</Button>
              <Button variant="ghost" size="sm" full>Clôturer</Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

Object.assign(window, { StrategyMonitor });
