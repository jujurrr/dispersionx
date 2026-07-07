/* ─── Position Detail: live P&L tracking for a position ────────── */
function PositionDetail({ positionId, onNav, addToast, mode }) {
  const { MetricCard, WarningPanel, Badge } = window.DispersionXDesignSystem_cb86be;
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [snapLoading, setSnapLoading] = React.useState(false);
  // Reprise LIVE (affichage seul, non persistée) — chiffres frais (≤ 15 min) à
  // chaque ouverture. Le cron, lui, persiste l'historique.
  const [live, setLive] = React.useState(null);
  const [liveLoading, setLiveLoading] = React.useState(false);
  // Édition du nom de la position.
  const [editingName, setEditingName] = React.useState(false);
  const [nameInput, setNameInput] = React.useState('');
  const [renaming, setRenaming] = React.useState(false);
  // Confirmation in-app (ConfirmDialog) — plus de popup navigateur.
  const [dialog, setDialog] = React.useState(null);
  const [dialogBusy, setDialogBusy] = React.useState(false);
  async function runDialog() {
    if (!dialog?.onConfirm) return;
    setDialogBusy(true);
    try { await dialog.onConfirm(); } finally { setDialogBusy(false); setDialog(null); }
  }

  function load() {
    setLoading(true);
    // Position réelle (serveur ou store local dx-positions) — pas de démo.
    DXApi.getPosition(positionId).then(d => {
      setData(d || null);
      setLoading(false);
    }).catch(() => { setData(null); setLoading(false); });
  }

  React.useEffect(() => { load(); }, [positionId]);

  // Reprise live à chaque (re)chargement d'une position OUVERTE disposant d'une
  // stratégie brute. Affichage seul : aucun snapshot n'est créé.
  function refreshLive(strategy) {
    const s = strategy || (data && data.strategy);
    if (!s || !Array.isArray(s.components)) return Promise.resolve();
    setLiveLoading(true);
    return DXApi.reprice(s)
      .then(v => { if (v && typeof v.total_pnl === 'number') setLive(v); })
      .catch(() => {})
      .finally(() => setLiveLoading(false));
  }
  React.useEffect(() => {
    setLive(null);
    const st = data && data.position && data.position.status;
    const open = st === 'open' || st === 'sain' || st === 'surveiller';
    if (data && data.strategy && open) refreshLive(data.strategy);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  async function handleSnapshot() {
    setSnapLoading(true);
    try {
      const r = await DXApi.snapshotPosition(positionId);
      addToast && addToast(r.total_pnl != null ? `Snapshot pris : P&L ${r.total_pnl.toLocaleString('fr-FR')} $.` : 'Snapshot enregistré (grecs au DTE restant).', 'ok');
      load();
    } catch (err) {
      addToast && addToast(`Erreur : ${err.message}`, 'error');
    } finally {
      setSnapLoading(false);
    }
  }

  async function handleRename() {
    setRenaming(true);
    try {
      const r = await DXApi.renamePosition(positionId, nameInput);
      addToast && addToast('Nom mis à jour.', 'ok');
      setEditingName(false);
      load();
    } catch (err) {
      addToast && addToast(`Erreur : ${err.message}`, 'error');
    } finally {
      setRenaming(false);
    }
  }

  function handleClose() {
    setDialog({
      title: 'Clôturer la position ?',
      message: 'La position sera marquée comme fermée. Vous pourrez toujours la consulter.',
      confirmLabel: 'Clôturer', tone: 'default',
      onConfirm: async () => {
        try { await DXApi.closePosition(positionId); addToast && addToast('Position clôturée.', 'ok'); load(); }
        catch (err) { addToast && addToast(`Erreur : ${err.message}`, 'error'); }
      },
    });
  }

  function handleDelete() {
    setDialog({
      title: 'Supprimer la position ?',
      message: 'Cette action supprime définitivement la position et ses snapshots.',
      confirmLabel: 'Supprimer', tone: 'danger',
      onConfirm: async () => {
        try {
          await DXApi.deletePosition(positionId);
          addToast && addToast('Position supprimée.', 'ok');
          onNav('positions');
        } catch (err) { addToast && addToast(`Erreur : ${err.message}`, 'error'); }
      },
    });
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
  const cg = m.current_greeks || {};
  const eg = m.entry_greeks || {};
  const gc = m.greek_changes || {};

  // Valeurs affichées : la reprise LIVE prime quand elle est disponible, sinon
  // le dernier snapshot mark-to-market persisté, sinon le suivi théorique.
  const liveOn = !!(live && typeof live.total_pnl === 'number');
  const totalPnl = liveOn ? live.total_pnl : (m.total_pnl ?? pos.pnl ?? null);
  const dailyPnl = liveOn
    ? (data.last_mtm_pnl != null ? Math.round((live.total_pnl - data.last_mtm_pnl) * 100) / 100 : null)
    : m.daily_pnl;
  const dteVal    = liveOn ? live.dte : (data.mtm ? data.mtm.dte : null);
  const coverage  = liveOn ? live.coverage : (data.mtm ? data.mtm.coverage : null);
  const curVega   = liveOn && live.net_vega  != null ? live.net_vega  : cg.vega;
  const curTheta  = liveOn && live.net_theta != null ? live.net_theta : cg.theta;
  const asof      = liveOn ? live.asof : (data.mtm ? data.mtm.asof : null);
  const liveLegs  = liveOn ? live.legs : null;
  const legs = m.legs || pos.legs || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          {editingName ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <input
                autoFocus
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setEditingName(false); }}
                placeholder="Nom de la position"
                maxLength={80}
                style={{ font: '600 20px/1.2 var(--font-sans)', minWidth: 260, padding: '6px 10px', background: 'var(--bg-base)', border: '1px solid var(--accent)', borderRadius: 'var(--radius)', color: 'var(--text)', outline: 'none' }}
              />
              <button onClick={handleRename} disabled={renaming}
                style={{ font: '600 12px/1 var(--font-sans)', padding: '8px 14px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}>
                {renaming ? '…' : 'Enregistrer'}
              </button>
              <button onClick={() => setEditingName(false)}
                style={{ font: '600 12px/1 var(--font-sans)', padding: '8px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>
                Annuler
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <h1 style={{ font: 'var(--type-h1)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: 0 }}>
                {pos.name || 'Position'}
              </h1>
              <button onClick={() => { setNameInput(pos.name || ''); setEditingName(true); }} title="Renommer la position"
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" /></svg>
              </button>
            </div>
          )}
          <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)', margin: 0 }}>
            {pos.index_symbol || pos.idx} · {pos.strategy_type || 'dispersion'} · {isOpen ? 'Ouverte' : 'Fermée'}
            {(pos.committed_at || pos.opened) && ` · depuis le ${(pos.committed_at || pos.opened).slice(0, 10)}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {isOpen && data.strategy && (
            <button onClick={() => refreshLive()} disabled={liveLoading} title="Recalculer au marché réel (Cboe, différé 15 min)"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, font: '600 12px/1 var(--font-sans)', padding: '8px 14px', borderRadius: 'var(--radius)', border: `1px solid ${liveOn ? 'var(--pos)' : 'var(--border)'}`, background: liveOn ? 'var(--pos-soft)' : 'transparent', color: liveOn ? 'var(--pos-bright)' : 'var(--text-soft)', cursor: liveLoading ? 'default' : 'pointer' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: liveLoading ? 'var(--warn)' : liveOn ? 'var(--pos)' : 'var(--text-dim)', animation: liveLoading ? 'pulse 1.2s infinite' : 'none' }} />
              {liveLoading ? 'Actualisation…' : liveOn ? 'En direct' : 'Actualiser'}
            </button>
          )}
          <button onClick={handleSnapshot} disabled={snapLoading} title="Enregistrer un point dans l'historique"
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

      {/* Bannière suivi théorique : grecs au DTE restant, pas de P&L de marché */}
      {!liveOn && data.theoretical && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 16px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderLeft: '3px solid var(--info)', borderRadius: 'var(--radius-lg)' }}>
          <span style={{ color: 'var(--info)', font: '700 13px/1 var(--font-mono)', flexShrink: 0 }}>i</span>
          <span style={{ font: 'var(--type-body-sm)', color: 'var(--text-soft)' }}>
            {liveLoading
              ? 'Reprise au marché réel en cours (Cboe, différé 15 min)…'
              : 'Suivi théorique — grecs recalculés au DTE restant. Le P&L de marché apparaît dès qu’une reprise réussit (bouton « Actualiser ») ou via le relevé automatique.'}
          </span>
        </div>
      )}

      {/* Bannière suivi réel : P&L mark-to-market piloté par spot + IV Cboe.
          « En direct » (live) prime sur le dernier relevé persisté (mtm). */}
      {(liveOn || (!liveOn && data.mtm)) && (() => {
        const cov = coverage;
        return (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 16px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderLeft: '3px solid var(--pos)', borderRadius: 'var(--radius-lg)', flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--pos-bright)', font: '700 13px/1 var(--font-mono)', flexShrink: 0 }}>✓</span>
            <span style={{ font: 'var(--type-body-sm)', color: 'var(--text-soft)' }}>
              {liveOn ? 'En direct' : 'Suivi mark-to-market'} — P&L théorique au mid <strong style={{ color: 'var(--text)' }}>piloté par le spot et l'IV réels</strong> (Cboe, différé 15 min).
              {cov && ` ${cov.priced}/${cov.total} jambes valorisées au marché.`}
              {asof && ` ${liveOn ? 'À' : 'Dernier relevé'} ${asof.slice(0, 16).replace('T', ' ')}.`}
            </span>
            {cov && cov.priced < cov.total && (
              <span style={{ font: 'var(--type-caption)', color: 'var(--warn)' }}>
                ⚠ Jambes non couvertes (ex. composants européens sans options US) estimées en décroissance temporelle.
              </span>
            )}
          </div>
        );
      })()}

      {/* P&L summary — P&L réel (vs entrée) + variation depuis le dernier relevé */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <MetricCard label="P&L total (vs entrée)" value={totalPnl != null ? (totalPnl >= 0 ? '+' : '') + totalPnl.toLocaleString('fr-FR') : '—'} unit={totalPnl != null ? '$' : ''} accent={totalPnl == null ? 'var(--info)' : totalPnl >= 0 ? 'var(--pos)' : 'var(--neg)'} />
        <MetricCard label="P&L depuis dernier relevé" value={dailyPnl != null ? (dailyPnl >= 0 ? '+' : '') + dailyPnl.toLocaleString('fr-FR') : '—'} unit={dailyPnl != null ? '$' : ''} accent={dailyPnl == null ? 'var(--info)' : dailyPnl >= 0 ? 'var(--pos)' : 'var(--neg)'} />
        <MetricCard label="DTE restant" value={dteVal != null ? String(dteVal) : '—'} unit={dteVal != null ? 'j' : ''} accent="var(--info)" />
        <MetricCard label="Jambes valorisées (réel)" value={coverage ? `${coverage.priced}/${coverage.total}` : (m.n_legs_priced != null ? `${m.n_legs_priced}/${m.n_legs_total}` : String(legs.length))} accent="var(--info)" />
      </div>

      {/* Évolution du P&L — courbe des snapshots mark-to-market */}
      {(() => {
        const pts = snaps.filter(s => s.mtm && typeof s.total_pnl === 'number').map(s => ({ t: (s.taken_at || '').slice(0, 10), v: s.total_pnl }));
        if (pts.length < 2) return null;
        const vals = pts.map(p => p.v);
        const min = Math.min(0, ...vals), max = Math.max(0, ...vals);
        const span = (max - min) || 1;
        const W = 640, H = 120, pad = 6;
        const x = i => pad + (i / (pts.length - 1)) * (W - 2 * pad);
        const y = v => H - pad - ((v - min) / span) * (H - 2 * pad);
        const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
        const last = vals[vals.length - 1];
        const zeroY = y(0);
        return (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Évolution du P&L</span>
              <span style={{ font: 'var(--type-caption)', color: 'var(--text-dim)' }}>{pts.length} points · depuis l'entrée</span>
            </div>
            <div style={{ padding: 16 }}>
              <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: 'block' }}>
                <line x1={pad} y1={zeroY} x2={W - pad} y2={zeroY} stroke="var(--border-strong)" strokeWidth="1" strokeDasharray="3 3" />
                <path d={`${d} L${x(pts.length - 1).toFixed(1)},${zeroY.toFixed(1)} L${x(0).toFixed(1)},${zeroY.toFixed(1)} Z`} fill={last >= 0 ? 'var(--pos-soft)' : 'var(--neg-soft)'} opacity="0.5" />
                <path d={d} fill="none" stroke={last >= 0 ? 'var(--pos-bright)' : 'var(--neg-bright)'} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
              </svg>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, font: 'var(--type-caption)', color: 'var(--text-dim)' }}>
                <span>{pts[0].t}</span>
                <span>{pts[pts.length - 1].t}</span>
              </div>
            </div>
          </div>
        );
      })()}

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

      {/* Legs P&L — jambes réelles (primes de straddle) quand une reprise mark-to-
          market est disponible, sinon repli théorique. */}
      {liveLegs && liveLegs.length > 0 ? (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)', font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
            P&L par jambe <span style={{ textTransform: 'none', color: 'var(--text-dim)' }}>· straddle ATM, prime au mid</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', font: 'var(--type-body-sm)' }}>
            <thead>
              <tr style={{ background: 'var(--bg-elevated)' }}>
                {['Jambe', 'Sens', 'Qté', 'Prime entrée', 'Prime actuelle', 'IV (Δ)', 'P&L'].map((h, i) => (
                  <th key={h} style={{ textAlign: i === 0 ? 'left' : 'right', font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', padding: '10px 16px', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {liveLegs.map((l, i) => {
                const lpnlPos = (l.pnl || 0) >= 0;
                return (
                  <tr key={l.symbol || i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '11px 16px' }}>
                      <span style={{ font: 'var(--type-ticker)', color: 'var(--text)' }}>{l.symbol}</span>
                      {l.role === 'index' && <span style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', marginLeft: 6 }}>INDICE</span>}
                      {!l.covered && <span style={{ font: 'var(--type-caption)', color: 'var(--warn)', marginLeft: 6 }} title="Pas d'options US — estimée en décroissance temporelle">est.</span>}
                    </td>
                    <td style={{ padding: '11px 16px', textAlign: 'right' }}>
                      <span style={{ color: l.side === 'short' ? 'var(--neg-bright)' : 'var(--pos-bright)', font: '600 11px/1 var(--font-sans)', textTransform: 'uppercase' }}>{l.side}</span>
                    </td>
                    <td style={{ padding: '11px 16px', textAlign: 'right', font: 'var(--type-data-sm)', color: 'var(--text-soft)' }}>{l.qty ?? '—'}</td>
                    <td style={{ padding: '11px 16px', textAlign: 'right', font: 'var(--type-data-sm)', color: 'var(--text-muted)' }}>{l.entry_prem != null ? Math.round(l.entry_prem).toLocaleString('fr-FR') : '—'}</td>
                    <td style={{ padding: '11px 16px', textAlign: 'right', font: 'var(--type-data-sm)', color: 'var(--text-soft)' }}>{l.current_prem != null ? Math.round(l.current_prem).toLocaleString('fr-FR') : '—'}</td>
                    <td style={{ padding: '11px 16px', textAlign: 'right', font: 'var(--type-data-sm)', color: 'var(--text-soft)' }}>
                      {l.current_iv != null ? l.current_iv + '%' : '—'}
                      {l.iv_change != null && <span style={{ color: l.iv_change >= 0 ? 'var(--pos-bright)' : 'var(--neg-bright)', marginLeft: 6, fontSize: 10 }}>{l.iv_change > 0 ? '+' : ''}{l.iv_change}</span>}
                    </td>
                    <td style={{ padding: '11px 16px', textAlign: 'right', font: 'var(--type-data)', color: l.pnl == null ? 'var(--text-muted)' : lpnlPos ? 'var(--pos-bright)' : 'var(--neg-bright)', fontWeight: 600 }}>
                      {l.pnl != null ? (l.pnl >= 0 ? '+' : '') + Math.round(l.pnl).toLocaleString('fr-FR') + ' $' : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {coverage && coverage.priced < coverage.total && (
            <div style={{ padding: '10px 16px', font: 'var(--type-caption)', color: 'var(--warn)' }}>
              ⚠ {coverage.total - coverage.priced} jambe(s) sans options US — estimée(s) en décroissance temporelle.
            </div>
          )}
        </div>
      ) : legs.length > 0 && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)', font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
            Jambes de la stratégie
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', font: 'var(--type-body-sm)' }}>
            <thead>
              <tr style={{ background: 'var(--bg-elevated)' }}>
                {['Jambe', 'Sens', 'Qté', 'IV entrée'].map((h, i) => (
                  <th key={h} style={{ textAlign: i === 0 ? 'left' : 'right', font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', padding: '10px 16px', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {legs.map((l, i) => (
                <tr key={l.symbol || i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '11px 16px' }}>
                    <span style={{ font: 'var(--type-ticker)', color: 'var(--text)' }}>{l.symbol}</span>
                    {l.role === 'index_leg' && <span style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', marginLeft: 6 }}>INDICE</span>}
                  </td>
                  <td style={{ padding: '11px 16px', textAlign: 'right' }}>
                    <span style={{ color: l.side === 'short' ? 'var(--neg-bright)' : 'var(--pos-bright)', font: '600 11px/1 var(--font-sans)', textTransform: 'uppercase' }}>{l.side}</span>
                  </td>
                  <td style={{ padding: '11px 16px', textAlign: 'right', font: 'var(--type-data-sm)', color: 'var(--text-soft)' }}>{l.quantity ?? '—'}</td>
                  <td style={{ padding: '11px 16px', textAlign: 'right', font: 'var(--type-data-sm)', color: 'var(--text-soft)' }}>{l.current_iv != null ? l.current_iv + '%' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: '10px 16px', font: 'var(--type-caption)', color: 'var(--text-dim)' }}>
            P&L par jambe disponible après une reprise au marché (« Actualiser » ou relevé automatique).
          </div>
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
                  <td style={{ padding: '10px 16px', font: 'var(--type-body-sm)', color: 'var(--text-soft)' }}>{(s.taken_at || '').slice(0, 16).replace('T', ' ')}{s.dte != null ? ` · ${s.dte} DTE` : ''}</td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', font: 'var(--type-data-sm)', color: s.total_pnl == null ? 'var(--text-muted)' : s.total_pnl >= 0 ? 'var(--pos-bright)' : 'var(--neg-bright)' }}>{s.total_pnl != null ? s.total_pnl.toLocaleString('fr-FR') + ' $' : (s.netVega != null ? 'vega ' + s.netVega + ' $' : '—')}</td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', font: 'var(--type-data-sm)', color: s.daily_pnl == null ? 'var(--text-muted)' : s.daily_pnl >= 0 ? 'var(--pos-bright)' : 'var(--neg-bright)' }}>{s.daily_pnl != null ? s.daily_pnl.toLocaleString('fr-FR') + ' $' : (s.netTheta != null ? 'theta ' + s.netTheta + ' $/j' : '—')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', padding: '10px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
        Suivi live : prix et IV re-récupérés en direct à chaque visite (feed indicatif, approximations). Le P&L est théorique au mid, hors frais réels.
      </div>

      <window.ConfirmDialog open={!!dialog} title={dialog?.title} message={dialog?.message} confirmLabel={dialog?.confirmLabel} tone={dialog?.tone} busy={dialogBusy}
        onCancel={() => !dialogBusy && setDialog(null)} onConfirm={runDialog} />
    </div>
  );
}

window.PositionDetail = PositionDetail;
