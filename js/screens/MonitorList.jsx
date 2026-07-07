/* ─── Suivi des positions : hub GLOBAL des positions committées (module Pro) ──
   Onglet Pro « Suivi » : rassemble TOUTES les positions suivies (toutes listes
   confondues), plus de vue par liste. On y suit en temps réel l'avancée d'une
   position (grecs au DTE restant, snapshots) depuis PositionDetail.
   Création d'une position : Construction/Builder → Risk Lab → Checklist. */
function MonitorList({ onNav, addToast, mode, pro, lists }) {
  const { Badge } = window.DispersionXDesignSystem_cb86be;
  const [positions, setPositions] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!pro) { setLoading(false); return; }
    // Toutes les positions (aucun list_id) — serveur, cloud ou store local.
    DXApi.getPositions().catch(() => null).then(posData => {
      setPositions(posData?.positions || posData || []);
      setLoading(false);
    });
  }, [pro]);

  // ── Écran verrouillé (non Pro) : soft-paywall (aperçu flouté + carte) ──
  if (!pro) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <h1 style={{ font: 'var(--type-h1)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: 0 }}>Suivi des positions</h1>
            <Badge tone="accent" size="sm">Pro</Badge>
          </div>
          <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)', margin: 0, maxWidth: 640 }}>
            Suivez l'avancée de vos positions en temps réel — voici un aperçu de ce que Pro débloque.
          </p>
        </div>
        <window.ProLockedPreview context="positions" onNav={onNav} addToast={addToast}>
          {window.ProDemoSuivi()}
        </window.ProLockedPreview>
      </div>
    );
  }

  if (loading) return (
    <div style={{ padding: 80, textAlign: 'center', color: 'var(--text-muted)', font: 'var(--type-body)' }}>Chargement des positions…</div>
  );

  const open = positions.filter(p => p.status === 'open' || p.status === 'sain' || p.status === 'surveiller');
  const closed = positions.filter(p => p.status === 'closed' || p.status === 'ferme');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <h1 style={{ font: 'var(--type-h1)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: 0 }}>Suivi des positions</h1>
            <Badge tone="accent" size="sm">Pro</Badge>
          </div>
          <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)', margin: 0, maxWidth: 640 }}>
            Toutes vos stratégies committées, suivies en temps réel : grecs au DTE restant, snapshots et P&L théorique.
          </p>
        </div>
        <button onClick={() => onNav('construction')}
          style={{ font: '600 13px/1 var(--font-sans)', padding: '9px 18px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>
          + Construire une stratégie
        </button>
      </div>

      {positions.length === 0 ? (
        <div style={{ padding: '64px 32px', textAlign: 'center', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ font: 'var(--type-h3)', color: 'var(--text-soft)', marginBottom: 8 }}>Aucune position suivie</div>
          <div style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', maxWidth: 420, margin: '0 auto 20px' }}>
            Pour suivre une position : construisez une stratégie (Construction ou Builder) à partir d'une liste, puis validez sa checklist dans le <strong style={{ color: 'var(--text-soft)' }}>Risk Lab</strong>. Elle apparaîtra ici.
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => onNav('construction')}
              style={{ font: '600 12px/1 var(--font-sans)', padding: '9px 18px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}>
              Construire une stratégie →
            </button>
            <button onClick={() => onNav('lists')}
              style={{ font: '600 12px/1 var(--font-sans)', padding: '9px 18px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>
              Mes listes
            </button>
          </div>
        </div>
      ) : (
        <>
          {open.length > 0 && (
            <section>
              <h2 style={{ font: 'var(--type-h2)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: '0 0 14px' }}>
                Positions ouvertes <span style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', fontWeight: 400 }}>({open.length})</span>
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                {open.map(p => <PositionCard key={p.id} pos={p} onNav={onNav} lists={lists} />)}
              </div>
            </section>
          )}

          {closed.length > 0 && (
            <section>
              <h2 style={{ font: 'var(--type-h2)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: '0 0 14px' }}>
                Positions fermées <span style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', fontWeight: 400 }}>({closed.length})</span>
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                {closed.map(p => <PositionCard key={p.id} pos={p} onNav={onNav} lists={lists} />)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function PositionCard({ pos, onNav, lists }) {
  const isOpen = pos.status === 'open' || pos.status === 'sain' || pos.status === 'surveiller';
  const pnl = pos.pnl;   // null = P&L de marché non disponible (position locale)
  const date = (pos.committed_at || pos.opened || '').slice(0, 10);
  // Nom de la liste d'origine (si la position en vient) — repère de contexte.
  const listName = (lists || []).find(l => String(l.id) === String(pos.list_id))?.name;

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
        {listName && ` · ${listName}`}
        {date && ` · ouvert le ${date}`}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ font: 'var(--type-data)', color: pnl == null ? 'var(--text-muted)' : pnl >= 0 ? 'var(--pos-bright)' : 'var(--neg-bright)' }}>
          {pnl == null ? (pos.dte != null ? pos.dte + ' DTE restant' : '—') : (pnl >= 0 ? '+' : '') + pnl.toLocaleString('fr-FR') + ' $'}
        </div>
        <div style={{ font: 'var(--type-caption)', color: 'var(--text-dim)' }}>
          {pos.n_snapshots || 0} snapshot(s)
        </div>
      </div>
    </div>
  );
}

window.MonitorList = MonitorList;
