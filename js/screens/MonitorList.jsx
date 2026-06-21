/* ─── MonitorList: committed positions for a specific list ───── */
function MonitorList({ listId, onNav, addToast, mode }) {
  const { Badge } = window.DispersionXDesignSystem_cb86be;
  const [positions, setPositions] = React.useState([]);
  const [listName, setListName] = React.useState('');
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    Promise.all([
      DXApi.getList(listId).catch(() => ({ name: `Liste ${listId}` })),
      DXApi.getPositions(listId).catch(() => null),
    ]).then(([list, posData]) => {
      setListName(list?.name || `Liste ${listId}`);
      const pos = posData?.positions || posData || [];
      // Fallback to mock if empty
      if (!pos.length) {
        setPositions(window.DXMock?.positions?.map(p => ({
          ...p,
          index_symbol: p.idx || p.index_symbol || 'SPX',
          strategy_type: p.strategy_type || 'dispersion',
          committed_at: p.opened || '',
          n_snapshots: 2,
          list_id: listId,
          list_name: list?.name || '',
          status: p.status === 'sain' ? 'open' : p.status,
        })) || []);
      } else {
        setPositions(pos);
      }
      setLoading(false);
    });
  }, [listId]);

  if (loading) return (
    <div style={{ padding: 80, textAlign: 'center', color: 'var(--text-muted)', font: 'var(--type-body)' }}>Chargement des positions…</div>
  );

  const open = positions.filter(p => p.status === 'open' || p.status === 'sain' || p.status === 'surveiller');
  const closed = positions.filter(p => p.status === 'closed' || p.status === 'ferme');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ font: 'var(--type-h1)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: '0 0 6px' }}>
            Suivi — {listName}
          </h1>
          <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)', margin: 0 }}>
            Stratégies committées et suivies pour cette liste.
          </p>
        </div>
        <button onClick={() => onNav('checklist', { listId })}
          style={{ font: '600 13px/1 var(--font-sans)', padding: '9px 18px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}>
          + Nouvelle position (checklist)
        </button>
      </div>

      {positions.length === 0 ? (
        <div style={{ padding: '64px 32px', textAlign: 'center', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ font: 'var(--type-h3)', color: 'var(--text-soft)', marginBottom: 8 }}>Aucune position suivie</div>
          <div style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', maxWidth: 360, margin: '0 auto 20px' }}>
            Construisez une stratégie, validez la checklist, et committez-la pour la suivre ici.
          </div>
          <button onClick={() => onNav('checklist', { listId })}
            style={{ font: '600 12px/1 var(--font-sans)', padding: '9px 18px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}>
            Aller à la checklist
          </button>
        </div>
      ) : (
        <>
          {open.length > 0 && (
            <section>
              <h2 style={{ font: 'var(--type-h2)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: '0 0 14px' }}>
                Positions ouvertes <span style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', fontWeight: 400 }}>({open.length})</span>
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                {open.map(p => <PositionCard key={p.id} pos={p} onNav={onNav} />)}
              </div>
            </section>
          )}

          {closed.length > 0 && (
            <section>
              <h2 style={{ font: 'var(--type-h2)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: '0 0 14px' }}>
                Positions fermées <span style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', fontWeight: 400 }}>({closed.length})</span>
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                {closed.map(p => <PositionCard key={p.id} pos={p} onNav={onNav} />)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function PositionCard({ pos, onNav }) {
  const isOpen = pos.status === 'open' || pos.status === 'sain' || pos.status === 'surveiller';
  const pnl = pos.pnl || 0;
  const date = (pos.committed_at || pos.opened || '').slice(0, 10);

  return (
    <div
      onClick={() => onNav('position', { positionId: pos.id })}
      style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
        padding: '16px', cursor: 'pointer', transition: 'all var(--dur-fast) var(--ease)',
        borderLeft: `3px solid ${isOpen ? 'var(--pos)' : 'var(--border)'}`,
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-card)'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ font: 'var(--type-title)', color: 'var(--text)' }}>{pos.name}</div>
        <span style={{
          font: '500 10px/1 var(--font-mono)', padding: '3px 8px', borderRadius: 'var(--radius-pill)',
          background: isOpen ? 'var(--pos-soft)' : 'var(--bg-elevated)',
          color: isOpen ? 'var(--pos-bright)' : 'var(--text-muted)',
          border: `1px solid ${isOpen ? 'var(--pos)' : 'var(--border)'}`,
          textTransform: 'uppercase', letterSpacing: '0.04em',
        }}>
          {isOpen ? 'Ouverte' : 'Fermée'}
        </span>
      </div>
      <div style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', marginBottom: 10 }}>
        {pos.index_symbol || pos.idx} · {pos.strategy_type || 'dispersion'}
        {date && ` · ouvert le ${date}`}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ font: 'var(--type-data)', color: pnl >= 0 ? 'var(--pos-bright)' : 'var(--neg-bright)' }}>
          {pnl >= 0 ? '+' : ''}{pnl.toLocaleString('fr-FR')} $
        </div>
        <div style={{ font: 'var(--type-caption)', color: 'var(--text-dim)' }}>
          {pos.n_snapshots || 0} snapshot(s)
        </div>
      </div>
    </div>
  );
}

window.MonitorList = MonitorList;
