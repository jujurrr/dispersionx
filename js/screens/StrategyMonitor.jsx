/* ─── Strategy Monitor: track open dispersion positions ────────── */
function StrategyMonitor({ mode }) {
  const { MetricCard, Badge, RiskBadge, WarningPanel } = window.DispersionXDesignSystem_cb86be;
  const [positions, setPositions] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [sel, setSel] = React.useState(0);

  React.useEffect(() => {
    DXApi.getPositions().then(p => { setPositions(p || []); setLoading(false); })
      .catch(() => { setPositions(window.DXData?.positions || window.DXMock?.positions || []); setLoading(false); });
  }, []);

  if (loading) return <div style={{ padding: 80, textAlign: 'center', color: 'var(--text-muted)', font: 'var(--type-body)' }}>Chargement…</div>;

  const P = positions;
  const totalPnl = P.reduce((a, p) => a + (p.pnl || 0), 0);
  const winners = P.filter((p) => (p.pnl || 0) > 0).length;
  const alertCount = P.filter((p) => p.alert).length;

  const statusTone = { sain: 'pos', surveiller: 'warn', risque: 'neg' };
  const statusRisk = { sain: 'faible', surveiller: 'modéré', risque: 'élevé' };

  const pos = P[sel] || P[0];
  if (!pos) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h1 style={{ font: 'var(--type-h1)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: 0 }}>Strategy Monitor</h1>
      <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', font: 'var(--type-body)' }}>Aucune position ouverte.</div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ font: 'var(--type-h1)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: '0 0 6px' }}>Strategy Monitor</h1>
          <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)', margin: 0, maxWidth: 640 }}>
            Suivi des stratégies de dispersion ouvertes : P&L, grecs, dérive de la prime et alertes. Aucune exécution automatique.
          </p>
        </div>
        <button style={{ font: '600 12px/1 var(--font-sans)', padding: '8px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>Exporter le suivi</button>
      </div>

      {/* Portfolio summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <MetricCard label="P&L total ouvert" value={(totalPnl >= 0 ? '+' : '') + totalPnl.toLocaleString('fr-FR')} unit="$" accent="var(--accent)" />
        <MetricCard label="Positions" value={String(P.length)} accent="var(--info)" />
        <MetricCard label="Gagnantes" value={`${winners}/${P.length}`} accent="var(--pos)" />
        <MetricCard label="Alertes actives" value={String(alertCount)} accent="var(--warn)" />
      </div>

      {/* Positions table */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', font: 'var(--type-body-sm)' }}>
          <thead>
            <tr style={{ background: 'var(--bg-elevated)' }}>
              {['Stratégie', 'DTE', 'Prime entrée', 'Prime actuelle', 'Vega', 'Theta', 'P&L', 'État'].map((hh, i) => (
                <th key={hh} style={{ textAlign: i === 0 ? 'left' : 'right', font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', padding: '11px 16px', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{hh}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {P.map((p, i) => {
              const drift = parseFloat(p.primeNow || p.prime_now || 0) - parseFloat(p.primeIn || p.prime_in || 0);
              const pnl = p.pnl || 0;
              const dte = p.dte || 0;
              const vega = p.vega || 0;
              const theta = p.theta || 0;
              const status = p.status || 'sain';
              return (
                <tr key={p.name || p.id || i} onClick={() => setSel(i)} style={{ borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer', background: sel === i ? 'var(--bg-hover)' : 'transparent', transition: 'background var(--dur-fast) var(--ease)' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ font: 'var(--type-title)', color: 'var(--text)' }}>{p.name || 'Position'}</div>
                    <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', marginTop: 2 }}>
                      Ouvert {p.opened || p.created_at || '—'}{p.alert && <span style={{ color: 'var(--warn)' }}> · {p.alert}</span>}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', font: 'var(--type-data-sm)', color: dte < 12 ? 'var(--neg-bright)' : 'var(--text-soft)' }}>{dte}j</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', font: 'var(--type-data-sm)', color: 'var(--text-muted)' }}>{p.primeIn || p.prime_in || '—'} pts</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', font: 'var(--type-data-sm)' }}>
                    <span style={{ color: 'var(--text-soft)' }}>{p.primeNow || p.prime_now || '—'}</span>
                    {!isNaN(drift) && drift !== 0 && <span style={{ color: drift >= 0 ? 'var(--pos-bright)' : 'var(--neg-bright)', marginLeft: 6, fontSize: 11 }}>{drift >= 0 ? '▲' : '▼'}{Math.abs(drift).toFixed(1)}</span>}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', font: 'var(--type-data-sm)', color: Math.abs(vega) > 100 ? 'var(--warn)' : 'var(--text-soft)' }}>{vega >= 0 ? '+' : ''}{vega}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', font: 'var(--type-data-sm)', color: 'var(--text-soft)' }}>+{theta}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', font: 'var(--type-data)', color: pnl >= 0 ? 'var(--pos-bright)' : 'var(--neg-bright)' }}>{pnl >= 0 ? '+' : ''}{pnl.toLocaleString('fr-FR')} $</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}><Badge tone={statusTone[status] || 'neutral'} dot>{status}</Badge></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Selected position detail */}
      {pos && (
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 }}>
            <div>
              <h2 style={{ font: 'var(--type-h2)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: 0 }}>Détail de la position</h2>
              <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: '4px 0 0' }}>{pos.name}</p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, alignItems: 'start' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <MetricCard label="P&L" value={(pos.pnl >= 0 ? '+' : '') + (pos.pnl || 0).toLocaleString('fr-FR')} unit="$" accent="var(--accent)" />
              <MetricCard label="Prime entrée → actuelle" value={`${pos.primeIn || '—'} → ${pos.primeNow || '—'}`} accent="var(--info)" />
              <MetricCard label="DTE restant" value={String(pos.dte || 0)} unit="j" accent={(pos.dte || 0) < 12 ? 'var(--neg)' : 'var(--warn)'} />
              <MetricCard label="Vega net" value={(pos.vega >= 0 ? '+' : '') + (pos.vega || 0)} accent={Math.abs(pos.vega || 0) > 100 ? 'var(--warn)' : 'var(--pos)'} />
              <MetricCard label="Theta /jour" value={'+' + (pos.theta || 0)} unit="$" accent="var(--warn)" />
              <MetricCard label="Risque" value={statusRisk[pos.status] || 'faible'} accent={`var(--${statusTone[pos.status] === 'pos' ? 'pos' : statusTone[pos.status] === 'warn' ? 'warn' : 'neg'})`} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pos.alert
                ? <WarningPanel tone={pos.status === 'risque' ? 'neg' : 'warn'} title="Alerte">{pos.alert} — réévaluer ou préparer un ajustement manuel.</WarningPanel>
                : <WarningPanel tone="pos" title="Position saine">Prime stable ou en progression, grecs dans la tolérance. Aucune action requise.</WarningPanel>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={{ flex: 1, font: '600 12px/1 var(--font-sans)', padding: '8px 0', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>Ouvrir le Trade Brief</button>
                <button style={{ flex: 1, font: '600 12px/1 var(--font-sans)', padding: '8px 0', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>Clôturer</button>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

window.StrategyMonitor = StrategyMonitor;
