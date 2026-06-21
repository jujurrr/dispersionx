/* ─── Position Detail: live P&L tracking for a position ────────── */
function PositionDetail({ positionId, onNav, addToast, mode }) {
  const { MetricCard, WarningPanel, Badge } = window.DispersionXDesignSystem_cb86be;
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [snapLoading, setSnapLoading] = React.useState(false);

  function load() {
    setLoading(true);
    DXApi.getPosition(positionId).then(d => {
      setData(d);
      setLoading(false);
    }).catch(() => {
      // Fallback mock
      const pos = window.DXMock?.positions?.find(p => p.id === positionId) || window.DXMock?.positions?.[0];
      if (pos) {
        setData(buildMockDetail(pos));
      }
      setLoading(false);
    });
  }

  React.useEffect(() => { load(); }, [positionId]);

  async function handleSnapshot() {
    setSnapLoading(true);
    try {
      const r = await DXApi.snapshotPosition(positionId);
      addToast && addToast(`Snapshot pris : P&L ${(r.total_pnl || 0).toLocaleString('fr-FR')} $.`, 'ok');
      load();
    } catch (err) {
      addToast && addToast(`Erreur : ${err.message}`, 'error');
    } finally {
      setSnapLoading(false);
    }
  }

  async function handleClose() {
    if (!confirm('Clôturer cette position ?')) return;
    try {
      await DXApi.closePosition(positionId);
      addToast && addToast('Position clôturée.', 'ok');
      load();
    } catch (err) {
      addToast && addToast(`Erreur : ${err.message}`, 'error');
    }
  }

  async function handleDelete() {
    if (!confirm('Supprimer définitivement cette position et ses snapshots ?')) return;
    try {
      await DXApi.deletePosition(positionId);
      addToast && addToast('Position supprimée.', 'ok');
      if (data?.position?.list_id) {
        onNav('monitor-list', { listId: data.position.list_id });
      } else {
        onNav('monitor');
      }
    } catch (err) {
      addToast && addToast(`Erreur : ${err.message}`, 'error');
    }
  }

  if (loading) return (
    <div style={{ padding: 80, textAlign: 'center', color: 'var(--text-muted)', font: 'var(--type-body)' }}>Suivi live en cours…</div>
  );

  if (!data) return (
    <div style={{ padding: 80, textAlign: 'center', color: 'var(--text-muted)' }}>Position introuvable.</div>
  );

  const pos = data.position || data;
  const m = data.monitoring || {};
  const cc = data.correlation_change;
  const snaps = data.snapshots || [];
  const isOpen = pos.status === 'open' || pos.status === 'sain' || pos.status === 'surveiller';
  const totalPnl = m.total_pnl ?? pos.pnl ?? 0;
  const cg = m.current_greeks || {};
  const eg = m.entry_greeks || {};
  const gc = m.greek_changes || {};
  const legs = m.legs || pos.legs || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ font: 'var(--type-h1)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: '0 0 6px' }}>
            {pos.name || 'Position'}
          </h1>
          <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)', margin: 0 }}>
            {pos.index_symbol || pos.idx} · {pos.strategy_type || 'dispersion'} · {isOpen ? 'Ouverte' : 'Fermée'}
            {(pos.committed_at || pos.opened) && ` · depuis le ${(pos.committed_at || pos.opened).slice(0, 10)}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={handleSnapshot} disabled={snapLoading}
            style={{ font: '600 12px/1 var(--font-sans)', padding: '8px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>
            {snapLoading ? '…' : 'Snapshot'}
          </button>
          {isOpen && (
            <button onClick={handleClose}
              style={{ font: '600 12px/1 var(--font-sans)', padding: '8px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>
              Clôturer
            </button>
          )}
          <button onClick={handleDelete}
            style={{ font: '600 12px/1 var(--font-sans)', padding: '8px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--neg)', background: 'transparent', color: 'var(--neg-bright)', cursor: 'pointer' }}>
            Supprimer
          </button>
        </div>
      </div>

      {/* P&L summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <MetricCard label="P&L total" value={(totalPnl >= 0 ? '+' : '') + totalPnl.toLocaleString('fr-FR')} unit="$" accent={totalPnl >= 0 ? 'var(--pos)' : 'var(--neg)'} />
        <MetricCard label="Coût sortie estimé" value={m.exit_cost_estimate != null ? '−' + Math.abs(m.exit_cost_estimate).toLocaleString('fr-FR') : '—'} unit="$" accent="var(--neg)" />
        <MetricCard label="P&L net après sortie" value={m.net_pnl_after_exit != null ? (m.net_pnl_after_exit >= 0 ? '+' : '') + m.net_pnl_after_exit.toLocaleString('fr-FR') : '—'} unit="$" accent={(m.net_pnl_after_exit || 0) >= 0 ? 'var(--pos)' : 'var(--neg)'} />
        <MetricCard label="Jambes valorisées" value={m.n_legs_priced != null ? `${m.n_legs_priced}/${m.n_legs_total}` : String(legs.length)} accent="var(--info)" />
      </div>

      {/* Greeks comparison */}
      {(Object.keys(cg).length > 0 || Object.keys(eg).length > 0) && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)', font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
            Grecs — actuels vs entrée
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', font: 'var(--type-body-sm)' }}>
            <thead>
              <tr style={{ background: 'var(--bg-elevated)' }}>
                {['Grec', 'Entrée', 'Actuel', 'Variation'].map((h, i) => (
                  <th key={h} style={{ textAlign: i === 0 ? 'left' : 'right', font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {['delta', 'gamma', 'vega', 'theta'].map(g => {
                const dp = g === 'gamma' ? 2 : 0;
                const chg = gc[g] ?? 0;
                return (
                  <tr key={g} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '11px 16px', font: 'var(--type-body-sm)', color: 'var(--text)', textTransform: 'capitalize' }}>{g}</td>
                    <td style={{ padding: '11px 16px', textAlign: 'right', font: 'var(--type-data-sm)', color: 'var(--text-muted)' }}>{eg[g] != null ? eg[g].toFixed(dp) : '—'}</td>
                    <td style={{ padding: '11px 16px', textAlign: 'right', font: 'var(--type-data-sm)', color: 'var(--text-soft)' }}>{cg[g] != null ? cg[g].toFixed(dp) : '—'}</td>
                    <td style={{ padding: '11px 16px', textAlign: 'right', font: 'var(--type-data-sm)', color: chg >= 0 ? 'var(--pos-bright)' : 'var(--neg-bright)' }}>{chg != null ? (chg >= 0 ? '+' : '') + chg.toFixed(dp) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Correlation premium */}
      {cc && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px 24px' }}>
          <div style={{ font: 'var(--type-title)', color: 'var(--text)', marginBottom: 12 }}>Prime de corrélation — actuelle vs entrée</div>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div><div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', marginBottom: 4 }}>Prime entrée</div><div style={{ font: 'var(--type-data)', color: 'var(--text)' }}>{cc.entry_premium != null ? cc.entry_premium.toFixed(1) : '—'}</div></div>
            <div><div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', marginBottom: 4 }}>Prime actuelle</div><div style={{ font: 'var(--type-data)', color: 'var(--text)' }}>{cc.current_premium != null ? cc.current_premium.toFixed(1) : '—'}</div></div>
            <div><div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', marginBottom: 4 }}>Variation</div><div style={{ font: 'var(--type-data)', color: (cc.premium_change || 0) >= 0 ? 'var(--pos-bright)' : 'var(--neg-bright)' }}>{cc.premium_change != null ? (cc.premium_change > 0 ? '+' : '') + cc.premium_change : '—'}</div></div>
          </div>
          <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', marginTop: 10 }}>
            Si la prime s'est normalisée depuis l'entrée, une partie de l'edge a été capturée — signal possible de sortie.
          </div>
        </div>
      )}

      {/* Legs P&L */}
      {legs.length > 0 && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)', font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
            P&L par jambe
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', font: 'var(--type-body-sm)' }}>
            <thead>
              <tr style={{ background: 'var(--bg-elevated)' }}>
                {['Jambe', 'Sens', 'Qté', 'Mid entrée', 'Mid actuel', 'IV (Δ)', 'P&L'].map((h, i) => (
                  <th key={h} style={{ textAlign: i === 0 ? 'left' : 'right', font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', padding: '10px 16px', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {legs.map((l, i) => {
                const lpnl = l.pnl ?? 0;
                return (
                  <tr key={l.symbol || i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '11px 16px' }}>
                      <span style={{ font: 'var(--type-ticker)', color: 'var(--text)' }}>{l.symbol}</span>
                      {l.role === 'index_leg' && <span style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', marginLeft: 6 }}>INDICE</span>}
                    </td>
                    <td style={{ padding: '11px 16px', textAlign: 'right' }}>
                      <span style={{ color: l.side === 'short' ? 'var(--neg-bright)' : 'var(--pos-bright)', font: '600 11px/1 var(--font-sans)', textTransform: 'uppercase' }}>{l.side}</span>
                    </td>
                    <td style={{ padding: '11px 16px', textAlign: 'right', font: 'var(--type-data-sm)', color: 'var(--text-soft)' }}>{l.quantity ?? '—'}</td>
                    <td style={{ padding: '11px 16px', textAlign: 'right', font: 'var(--type-data-sm)', color: 'var(--text-muted)' }}>{l.entry_mid != null ? l.entry_mid.toFixed(2) : '—'}</td>
                    <td style={{ padding: '11px 16px', textAlign: 'right', font: 'var(--type-data-sm)', color: 'var(--text-soft)' }}>{l.current_mid != null ? l.current_mid.toFixed(2) : '—'}</td>
                    <td style={{ padding: '11px 16px', textAlign: 'right', font: 'var(--type-data-sm)', color: 'var(--text-soft)' }}>
                      {l.current_iv != null ? l.current_iv + '%' : '—'}
                      {l.iv_change != null && <span style={{ color: l.iv_change >= 0 ? 'var(--pos-bright)' : 'var(--neg-bright)', marginLeft: 6, fontSize: 10 }}>{l.iv_change > 0 ? '+' : ''}{l.iv_change}</span>}
                    </td>
                    <td style={{ padding: '11px 16px', textAlign: 'right', font: 'var(--type-data)', color: lpnl >= 0 ? 'var(--pos-bright)' : 'var(--neg-bright)', fontWeight: 600 }}>
                      {lpnl != null ? (lpnl >= 0 ? '+' : '') + lpnl.toLocaleString('fr-FR') + ' $' : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {m.n_legs_priced != null && m.n_legs_priced < m.n_legs_total && (
            <div style={{ padding: '10px 16px', font: 'var(--type-caption)', color: 'var(--warn)' }}>
              ⚠ {m.n_legs_total - m.n_legs_priced} jambe(s) non valorisée(s) — données d'options indisponibles.
            </div>
          )}
        </div>
      )}

      {/* Snapshots history */}
      {snaps.length > 0 && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)', font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
            Historique des snapshots
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', font: 'var(--type-body-sm)' }}>
            <thead>
              <tr style={{ background: 'var(--bg-elevated)' }}>
                {['Date', 'P&L total', 'P&L quotidien'].map((h, i) => (
                  <th key={h} style={{ textAlign: i === 0 ? 'left' : 'right', font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {snaps.map((s, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '10px 16px', font: 'var(--type-body-sm)', color: 'var(--text-soft)' }}>{(s.taken_at || '').slice(0, 16).replace('T', ' ')}</td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', font: 'var(--type-data-sm)', color: (s.total_pnl || 0) >= 0 ? 'var(--pos-bright)' : 'var(--neg-bright)' }}>{(s.total_pnl || 0).toLocaleString('fr-FR')} $</td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', font: 'var(--type-data-sm)', color: (s.daily_pnl || 0) >= 0 ? 'var(--pos-bright)' : 'var(--neg-bright)' }}>{(s.daily_pnl || 0).toLocaleString('fr-FR')} $</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', padding: '10px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
        Suivi live : prix et IV re-récupérés en direct à chaque visite (feed indicatif, approximations). Le P&L est théorique au mid, hors frais réels.
      </div>
    </div>
  );
}

function buildMockDetail(pos) {
  return {
    position: {
      id: pos.id, name: pos.name, index_symbol: pos.idx || 'SPX',
      strategy_type: pos.strategy_type || 'dispersion', status: pos.status,
      committed_at: pos.opened || '', list_id: 1, list_name: 'Demo Liste',
    },
    monitoring: {
      total_pnl: pos.pnl || 0,
      exit_cost_estimate: Math.abs(pos.pnl || 0) * 0.05,
      net_pnl_after_exit: (pos.pnl || 0) - Math.abs(pos.pnl || 0) * 0.05,
      n_legs_priced: 4, n_legs_total: 5,
      current_greeks: { delta: 8, gamma: -0.6, vega: pos.vega || -48, theta: pos.theta || 96 },
      entry_greeks:  { delta: 2, gamma: -0.8, vega: pos.vega ? pos.vega - 12 : -60, theta: pos.theta ? pos.theta - 10 : 86 },
      greek_changes: { delta: 6, gamma: 0.2, vega: 12, theta: 10 },
      legs: [
        { symbol: pos.idx || 'SPX', side: 'short', quantity: 1, entry_mid: 48.20, current_mid: 42.40, current_iv: 18.2, iv_change: -0.4, pnl: Math.round((pos.pnl || 0) * 0.6), role: 'index_leg' },
        { symbol: 'NVDA', side: 'long', quantity: 2, entry_mid: 58.40, current_mid: 64.20, current_iv: 46.2, iv_change: +1.2, pnl: Math.round((pos.pnl || 0) * 0.2), role: 'component' },
        { symbol: 'TSLA', side: 'long', quantity: 1, entry_mid: 82.10, current_mid: 89.60, current_iv: 54.3, iv_change: +2.1, pnl: Math.round((pos.pnl || 0) * 0.12), role: 'component' },
        { symbol: 'META', side: 'long', quantity: 1, entry_mid: 49.80, current_mid: 52.40, current_iv: 38.5, iv_change: +0.6, pnl: Math.round((pos.pnl || 0) * 0.08), role: 'component' },
      ],
    },
    correlation_change: {
      entry_premium: pos.primeIn ?? 5.8,
      current_premium: pos.primeNow ?? 6.4,
      premium_change: +((pos.primeNow ?? 6.4) - (pos.primeIn ?? 5.8)).toFixed(1),
    },
    snapshots: [],
  };
}

window.PositionDetail = PositionDetail;
