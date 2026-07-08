/* ─── Position Detail: live P&L tracking for a position ────────── */
// Format $ cohérent partout : entier, séparateur fr-FR, signe explicite.
function dxUsd(n, { sign = true } = {}) {
  if (n == null || !isFinite(n)) return '—';
  const r = Math.round(n);
  const s = r < 0 ? '−' : (sign ? '+' : '');
  return s + Math.abs(r).toLocaleString('fr-FR');
}
// Évolution en % d'un P&L rapporté à une base (prime engagée). null si incalculable.
function dxPct(n, base, { sign = true, dp = 1 } = {}) {
  if (n == null || !isFinite(n) || !(Math.abs(base) > 0)) return null;
  const p = n / Math.abs(base) * 100;
  const s = p < 0 ? '−' : (sign ? '+' : '');
  return s + Math.abs(p).toFixed(dp) + '%';
}
// Horodatage UTC (taken_at/asof en ISO) → heure LOCALE de l'utilisateur.
function dxLocalDateTime(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
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

  // Grecs & delta $ de la reprise réelle (sinon repli théorique de _positionDetail).
  const gEntry = liveOn && live.greeks ? live.greeks.entry : { vega: eg.vega, theta: eg.theta, gamma: null };
  const gCur   = liveOn && live.greeks ? live.greeks.current : { vega: cg.vega, theta: cg.theta, gamma: null };
  const deltaInfo = liveOn && live.delta_dollar ? live.delta_dollar : null;
  const rebalance = liveOn && live.rebalance ? live.rebalance : null;
  const hedgePnl  = liveOn && typeof live.hedge_pnl === 'number' ? live.hedge_pnl : null;
  const straddlePnl = liveOn && typeof live.straddle_pnl === 'number' ? live.straddle_pnl : null;
  const hasGreeks = gEntry.vega != null || gEntry.theta != null || gEntry.gamma != null;

  // Base des %  : prime brute engagée à l'entrée (Σ des primes de straddle). Constante
  // dans le temps → sert de dénominateur cohérent pour le total et l'historique.
  const strat = data.strategy || {};
  const sport = strat.portfolio || {};
  const grossPrem = (liveLegs && liveLegs.length)
    ? liveLegs.reduce((a, l) => a + Math.abs(l.entry_prem || 0), 0)
    : (Math.abs(sport.idxPrem || 0) + (strat.components || []).reduce((a, c) => a + Math.abs(c.premium || 0), 0));
  const pctBase = grossPrem > 0 ? grossPrem : null;

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
              {asof && ` ${liveOn ? 'À' : 'Dernier relevé'} ${dxLocalDateTime(asof)}.`}
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
        <MetricCard label="P&L total (vs entrée)" value={dxUsd(totalPnl)} unit={totalPnl != null ? '$' : ''}
          delta={dxPct(totalPnl, pctBase)} deltaTone={totalPnl == null ? 'neutral' : totalPnl >= 0 ? 'pos' : 'neg'}
          hint="Évolution en % de la prime brute engagée à l'entrée (somme des primes de straddle)."
          accent={totalPnl == null ? 'var(--info)' : totalPnl >= 0 ? 'var(--pos)' : 'var(--neg)'} />
        <MetricCard label="P&L depuis dernier relevé" value={dxUsd(dailyPnl)} unit={dailyPnl != null ? '$' : ''}
          delta={dxPct(dailyPnl, pctBase)} deltaTone={dailyPnl == null ? 'neutral' : dailyPnl >= 0 ? 'pos' : 'neg'}
          accent={dailyPnl == null ? 'var(--info)' : dailyPnl >= 0 ? 'var(--pos)' : 'var(--neg)'} />
        <MetricCard label="DTE restant" value={dteVal != null ? String(dteVal) : '—'} unit={dteVal != null ? 'j' : ''} accent="var(--info)" />
        <MetricCard label="Jambes valorisées (réel)" value={coverage ? `${coverage.priced}/${coverage.total}` : (m.n_legs_priced != null ? `${m.n_legs_priced}/${m.n_legs_total}` : String(legs.length))} accent="var(--info)" />
      </div>

      {/* Décomposition P&L : straddles + couverture Δ (actions/future) */}
      {(straddlePnl != null && hedgePnl != null && Math.abs(hedgePnl) >= 1) && (
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', font: 'var(--type-body-sm)', color: 'var(--text-muted)', padding: '4px 2px' }}>
          <span>Straddles : <strong style={{ color: straddlePnl >= 0 ? 'var(--pos-bright)' : 'var(--neg-bright)' }}>{dxUsd(straddlePnl)} $</strong>{pctBase && <span style={{ color: 'var(--text-dim)' }}> ({dxPct(straddlePnl, pctBase)})</span>}</span>
          <span>· Couverture Δ (actions) : <strong style={{ color: hedgePnl >= 0 ? 'var(--pos-bright)' : 'var(--neg-bright)' }}>{dxUsd(hedgePnl)} $</strong>{pctBase && <span style={{ color: 'var(--text-dim)' }}> ({dxPct(hedgePnl, pctBase)})</span>}</span>
          <span>· Total : <strong style={{ color: 'var(--text)' }}>{dxUsd(totalPnl)} $</strong>{pctBase && <span style={{ color: 'var(--text-dim)' }}> ({dxPct(totalPnl, pctBase)})</span>}</span>
        </div>
      )}

      {/* Évolution du P&L — hauteur fixe, axes en HTML (pas de distorsion ni chevauchement) */}
      {(() => {
        // Fenêtre cohérente : 30 derniers relevés (intraday du jour + jours récents).
        const raw = snaps.filter(s => s.mtm && typeof s.total_pnl === 'number').map(s => ({ t: s.taken_at, v: s.total_pnl })).slice(-30);
        if (raw.length < 2) return null;
        const vals = raw.map(p => p.v);
        let lo = Math.min(0, ...vals), hi = Math.max(0, ...vals);
        const pad0 = (hi - lo) * 0.14 || 1; lo -= pad0; hi += pad0;
        const span = (hi - lo) || 1;
        const PH = 150, VW = 1000;                         // hauteur px fixe ; largeur viewBox
        const x = i => (i / (raw.length - 1)) * VW;
        const y = v => (hi - v) / span * PH;
        const ticks = Array.from({ length: 4 }, (_, i) => hi - (i / 3) * span);   // haut → bas
        const axisFmt = v => Math.round(v).toLocaleString('fr-FR');
        const days = new Set(raw.map(p => (p.t || '').slice(0, 10)));
        const fmtX = iso => { const dd = new Date(iso); if (isNaN(dd)) return ''; return days.size <= 1 ? dd.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : dd.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }); };
        let xIdx = raw.length <= 2 ? [0, raw.length - 1] : [0, Math.floor((raw.length - 1) / 2), raw.length - 1];
        xIdx = [...new Set(xIdx)];                          // dédup → pas de dates superposées
        const d = raw.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
        const last = vals[vals.length - 1];
        const col = last >= 0 ? 'var(--pos-bright)' : 'var(--neg-bright)';
        return (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Évolution du P&L ($)</span>
              <span style={{ font: 'var(--type-caption)', color: 'var(--text-dim)' }}>
                {raw.length} points · depuis l'entrée
                {pctBase && dxPct(last, pctBase) && <span style={{ color: last >= 0 ? 'var(--pos-bright)' : 'var(--neg-bright)', fontWeight: 600, marginLeft: 6 }}>· {dxPct(last, pctBase)}</span>}
              </span>
            </div>
            <div style={{ padding: '12px 16px 10px' }}>
              <div style={{ display: 'flex' }}>
                {/* Axe Y (HTML) */}
                <div style={{ position: 'relative', width: 52, height: PH, flexShrink: 0 }}>
                  {ticks.map((tv, i) => (
                    <span key={i} style={{ position: 'absolute', right: 8, top: y(tv), transform: 'translateY(-50%)', font: '10px/1 var(--font-mono)', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{axisFmt(tv)}</span>
                  ))}
                </div>
                {/* Tracé (SVG, hauteur fixe) */}
                <div style={{ position: 'relative', flex: 1, height: PH }}>
                  <svg viewBox={`0 0 ${VW} ${PH}`} width="100%" height={PH} preserveAspectRatio="none" style={{ display: 'block' }}>
                    <defs>
                      <linearGradient id="dxpnl" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={col} stopOpacity="0.26" />
                        <stop offset="100%" stopColor={col} stopOpacity="0.02" />
                      </linearGradient>
                    </defs>
                    {ticks.map((tv, i) => (
                      <line key={i} x1="0" y1={y(tv)} x2={VW} y2={y(tv)} stroke="var(--border-subtle)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                    ))}
                    <line x1="0" y1={y(0)} x2={VW} y2={y(0)} stroke="var(--border-strong)" strokeWidth="1" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
                    <path d={`${d} L${VW},${y(0).toFixed(1)} L0,${y(0).toFixed(1)} Z`} fill="url(#dxpnl)" />
                    <path d={d} fill="none" stroke={col} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                  </svg>
                  {/* Dernier point (HTML → pas d'ellipse) */}
                  <span style={{ position: 'absolute', left: '100%', top: y(last), transform: 'translate(-50%, -50%)', width: 9, height: 9, borderRadius: '50%', background: col, border: '2px solid var(--bg-card)' }} />
                </div>
              </div>
              {/* Axe X (HTML) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginLeft: 52, marginTop: 8, font: '10px/1 var(--font-mono)', color: 'var(--text-dim)' }}>
                {xIdx.map((idx, i) => (
                  <span key={i} style={{ textAlign: i === 0 ? 'left' : i === xIdx.length - 1 ? 'right' : 'center' }}>{fmtX(raw[idx].t)}</span>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Grecs nets — delta (dérive), vega, theta, gamma — actuels vs entrée */}
      {hasGreeks && (() => {
        const rows = [
          { label: 'Delta', hint: '$ / +1 %', e: deltaInfo ? deltaInfo.entry : null, c: deltaInfo ? deltaInfo.current : null, tag: deltaInfo && deltaInfo.hedged ? 'couvert' : null },
          { label: 'Vega', hint: '$ / +1 pt IV', e: gEntry.vega, c: gCur.vega },
          { label: 'Theta', hint: '$ / jour', e: gEntry.theta, c: gCur.theta },
          { label: 'Gamma', hint: '$ · convexité', e: gEntry.gamma, c: gCur.gamma },
        ];
        return (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)', font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
              Grecs nets — actuels vs entrée <span style={{ textTransform: 'none', color: 'var(--text-dim)' }}>· Black-Scholes, strike fixe</span>
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
                {rows.map(({ label, hint, e, c, tag }) => {
                  const chg = (e != null && c != null) ? c - e : null;
                  return (
                    <tr key={label} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '11px 16px', color: 'var(--text)' }}>
                        {label} <span style={{ font: 'var(--type-caption)', color: 'var(--text-dim)' }}>· {hint}</span>
                        {tag && <span style={{ font: 'var(--type-caption)', color: 'var(--pos-bright)', marginLeft: 6 }}>· {tag}</span>}
                      </td>
                      <td style={{ padding: '11px 16px', textAlign: 'right', font: 'var(--type-data-sm)', color: 'var(--text-muted)' }}>{e != null ? dxUsd(e, { sign: false }) : '—'}</td>
                      <td style={{ padding: '11px 16px', textAlign: 'right', font: 'var(--type-data-sm)', color: 'var(--text-soft)' }}>{c != null ? dxUsd(c, { sign: false }) : '—'}</td>
                      <td style={{ padding: '11px 16px', textAlign: 'right', font: 'var(--type-data-sm)', color: chg == null ? 'var(--text-dim)' : chg >= 0 ? 'var(--pos-bright)' : 'var(--neg-bright)' }}>{chg != null ? dxUsd(chg) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ padding: '10px 16px', font: 'var(--type-caption)', color: 'var(--text-muted)', background: 'var(--bg-elevated)' }}>
              Le delta part ~neutre et <strong style={{ color: 'var(--text-soft)' }}>dérive avec le sous-jacent</strong> (gamma){deltaInfo && deltaInfo.hedged ? ', couverture Δ incluse' : ''}.
            </div>
          </div>
        );
      })()}

      {/* Rééquilibrage delta — combien acheter/vendre pour redevenir delta-$ neutre */}
      {(() => {
        if (!rebalance) return null;
        const trade = n => n == null ? '—' : n > 0 ? `Acheter ${Math.abs(n).toLocaleString('fr-FR')}` : n < 0 ? `Vendre ${Math.abs(n).toLocaleString('fr-FR')}` : 'Aucun ajustement';
        const tone = n => n == null ? 'var(--text-dim)' : Math.abs(n) < 1 ? 'var(--text-dim)' : n > 0 ? 'var(--pos-bright)' : 'var(--neg-bright)';
        const rows = rebalance.mode === 'legs'
          ? (rebalance.legs || []).filter(l => l.shares != null)
          : (rebalance.shares != null ? [{ symbol: rebalance.symbol, shares: rebalance.shares, side: 'index' }] : []);
        return (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                Rééquilibrage delta <span style={{ textTransform: 'none', color: 'var(--text-dim)' }}>· {rebalance.mode === 'legs' ? 'par composant' : 'par indice'}</span>
              </span>
              <span style={{ font: 'var(--type-caption)', color: 'var(--text-dim)' }}>Delta net {dxUsd(rebalance.net_delta)} $/+1 %</span>
            </div>
            {rows.length === 0 || rows.every(r => Math.abs(r.shares || 0) < 1) ? (
              <div style={{ padding: '14px 20px', font: 'var(--type-body-sm)', color: 'var(--text-soft)' }}>Position déjà ~delta-neutre — aucun ajustement significatif.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', font: 'var(--type-body-sm)' }}>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.symbol || i} style={{ borderBottom: i < rows.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                      <td style={{ padding: '11px 20px' }}>
                        <span style={{ font: 'var(--type-ticker)', color: 'var(--text)' }}>{r.symbol}</span>
                        {r.side === 'index' && <span style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', marginLeft: 6 }}>ETF indice</span>}
                      </td>
                      <td style={{ padding: '11px 20px', textAlign: 'right', font: 'var(--type-data)', color: tone(r.shares), fontWeight: 600 }}>
                        {trade(r.shares)} <span style={{ font: 'var(--type-caption)', color: 'var(--text-dim)', fontWeight: 400 }}>actions</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 20px', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
              <span style={{ color: 'var(--accent-hover)', flexShrink: 0 }}>💡</span>
              <span style={{ font: 'var(--type-caption)', color: 'var(--text-muted)' }}>
                Idéalement, <strong style={{ color: 'var(--text-soft)' }}>rééquilibrez la couverture chaque soir</strong> (après la clôture) pour rester delta‑neutre. Quantités calculées sur le delta réel Black‑Scholes ; arrondir à l'entier le plus proche.
              </span>
            </div>
          </div>
        );
      })()}

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
                {['Jambe', 'Sens', 'Qté', 'Prime entrée', 'Prime actuelle', 'IV (Δ)', 'P&L ($ · %)'].map((h, i) => (
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
                      {l.pnl != null ? dxUsd(l.pnl) + ' $' : '—'}
                      {l.pnl != null && dxPct(l.pnl, l.entry_prem) && (
                        <div style={{ font: 'var(--type-caption)', fontWeight: 500, color: lpnlPos ? 'var(--pos-bright)' : 'var(--neg-bright)', opacity: 0.85 }}>{dxPct(l.pnl, l.entry_prem)}</div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {hedgePnl != null && Math.abs(hedgePnl) >= 1 && (
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
                  <td style={{ padding: '11px 16px', color: 'var(--text)' }}>Couverture Δ <span style={{ font: 'var(--type-caption)', color: 'var(--text-dim)' }}>· actions / future</span></td>
                  <td style={{ padding: '11px 16px', textAlign: 'right' }}><span style={{ color: 'var(--text-muted)', font: '600 11px/1 var(--font-sans)', textTransform: 'uppercase' }}>hedge</span></td>
                  <td colSpan={4} style={{ padding: '11px 16px', textAlign: 'right', font: 'var(--type-caption)', color: 'var(--text-dim)' }}>P&L des actions/future de couverture du delta</td>
                  <td style={{ padding: '11px 16px', textAlign: 'right', font: 'var(--type-data)', color: hedgePnl >= 0 ? 'var(--pos-bright)' : 'var(--neg-bright)', fontWeight: 600 }}>{dxUsd(hedgePnl)} $</td>
                </tr>
              )}
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

      {/* Snapshots history — plus récent en haut, hauteur limitée + molette */}
      {snaps.length > 0 && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Historique des snapshots</span>
            <span style={{ font: 'var(--type-caption)', color: 'var(--text-dim)' }}>{snaps.length} · défiler pour les plus anciens</span>
          </div>
          <div style={{ maxHeight: 420, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', font: 'var(--type-body-sm)' }}>
              <thead>
                <tr style={{ background: 'var(--bg-elevated)' }}>
                  {['Date', 'P&L total', 'P&L quotidien'].map((h, i) => (
                    <th key={h} style={{ textAlign: i === 0 ? 'left' : 'right', font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', padding: '10px 16px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg-elevated)', zIndex: 1 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {snaps.slice().reverse().map((s, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '10px 16px', font: 'var(--type-body-sm)', color: 'var(--text-soft)' }}>{dxLocalDateTime(s.taken_at)}{s.dte != null ? ` · ${s.dte} DTE` : ''}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', font: 'var(--type-data-sm)', color: s.total_pnl == null ? 'var(--text-muted)' : s.total_pnl >= 0 ? 'var(--pos-bright)' : 'var(--neg-bright)' }}>
                      {s.total_pnl != null ? dxUsd(s.total_pnl) + ' $' : (s.netVega != null ? 'vega ' + s.netVega + ' $' : '—')}
                      {s.total_pnl != null && dxPct(s.total_pnl, pctBase) && <div style={{ font: 'var(--type-caption)', color: s.total_pnl >= 0 ? 'var(--pos-bright)' : 'var(--neg-bright)', opacity: 0.85 }}>{dxPct(s.total_pnl, pctBase)}</div>}
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', font: 'var(--type-data-sm)', color: s.daily_pnl == null ? 'var(--text-muted)' : s.daily_pnl >= 0 ? 'var(--pos-bright)' : 'var(--neg-bright)' }}>{s.daily_pnl != null ? dxUsd(s.daily_pnl) + ' $' : (s.netTheta != null ? 'theta ' + s.netTheta + ' $/j' : '—')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
