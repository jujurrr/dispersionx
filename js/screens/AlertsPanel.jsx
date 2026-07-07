/* ─── Panneau Alertes de corrélation (intégré aux Opportunités, Pro) ───
   Crée/gère des alertes « préviens-moi quand la corrélation implicite d'un
   indice dépasse le Xe percentile » — le moment où une dispersion devient
   attractive. Stockées côté cloud (RLS), évaluées par le cron /api/alerts/run.
   Notification par e-mail (si Resend configuré) et visible ici dans tous les cas. */

const DX_INDICES = ['SPX', 'NDX', 'DJI', 'CAC', 'DAX'];

async function gatherTickers(index) {
  try {
    await window.DXStore.loadIndex(index);
    const d = window.DXStore.getIndexData(index) || {};
    return (d.components || []).map(c => c.ticker).filter(Boolean).slice(0, 20);
  } catch { return []; }
}

function AlertsPanel({ index, addToast }) {
  const DS = window.DispersionXDesignSystem_cb86be;
  const { Button, Badge } = DS;
  const C = window.DXCloud;
  const canCloud = !!(C && C.enabled && C.alerts);

  const [items, setItems] = React.useState(null);
  const [idx, setIdx] = React.useState(index || 'SPX');
  const [threshold, setThreshold] = React.useState(80);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => { setIdx(index || 'SPX'); }, [index]);
  React.useEffect(() => { if (canCloud) refresh(); /* eslint-disable-next-line */ }, [canCloud]);

  async function refresh() {
    try { setItems(await C.alerts.list()); } catch { setItems([]); }
  }
  async function create() {
    setBusy(true);
    try {
      const tickers = await gatherTickers(idx);
      await C.alerts.create({ index: idx, threshold, tickers });
      addToast && addToast('Alerte créée.', 'ok');
      await refresh();
    } catch (e) { addToast && addToast('Création impossible : ' + (e && e.message ? e.message : ''), 'error'); }
    finally { setBusy(false); }
  }
  async function toggle(a) {
    try { await C.alerts.setActive(a.id, !a.active); await refresh(); } catch {}
  }
  async function remove(a) {
    try { await C.alerts.remove(a.id); await refresh(); } catch {}
  }

  const box = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden' };
  const header = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-hover)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
      <span style={{ font: 'var(--type-title)', color: 'var(--text)' }}>Alertes de corrélation</span>
      {items && items.length > 0 && <span style={{ marginLeft: 'auto', font: 'var(--type-caption)', color: 'var(--text-muted)' }}>{items.filter(a => a.active).length} active(s)</span>}
    </div>
  );

  if (!canCloud) {
    return (
      <div style={box}>
        {header}
        <div style={{ padding: '18px 20px', font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}>
          Connectez-vous pour créer des alertes et être prévenu quand la corrélation d'un indice devient attractive.
        </div>
      </div>
    );
  }

  const inputStyle = { background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 10px', color: 'var(--text)', font: 'var(--type-body-sm)', outline: 'none' };

  function statusOf(a) {
    if (!a.active) return { txt: 'En pause', tone: 'neutral' };
    if (a.triggered_at) {
      const d = new Date(a.triggered_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
      return { txt: `Déclenchée le ${d}${a.last_percentile != null ? ` · ${a.last_percentile}e pct` : ''}`, tone: 'pos' };
    }
    return { txt: a.last_percentile != null ? `Armée · actuellement ${a.last_percentile}e pct` : 'Armée', tone: 'accent' };
  }

  return (
    <div style={box}>
      {header}
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}>
          Recevez une alerte quand la <strong style={{ color: 'var(--text-soft)' }}>corrélation implicite</strong> d'un indice dépasse un percentile — le signal qu'une dispersion devient attractive.
        </div>

        {/* Création */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', font: 'var(--type-body-sm)', color: 'var(--text-soft)' }}>
          <span>M'alerter quand</span>
          <select value={idx} onChange={e => setIdx(e.target.value)} style={inputStyle}>
            {DX_INDICES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <span>dépasse le</span>
          <input type="number" min={1} max={99} value={threshold} onChange={e => setThreshold(e.target.value)} style={{ ...inputStyle, width: 68, textAlign: 'center' }} />
          <span>e percentile</span>
          <Button variant="primary" size="md" onClick={create} disabled={busy || !(threshold >= 1 && threshold <= 99)}>
            {busy ? 'Création…' : 'Créer l\'alerte'}
          </Button>
        </div>

        {/* Liste */}
        {items && items.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map(a => {
              const st = statusOf(a);
              return (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                  <span style={{ font: '700 12px/1 var(--font-mono)', color: 'var(--text)', width: 44 }}>{a.index_symbol}</span>
                  <span style={{ font: 'var(--type-body-sm)', color: 'var(--text-soft)' }}>≥ {a.threshold}<sup>e</sup> pct</span>
                  <Badge tone={st.tone} size="sm">{st.txt}</Badge>
                  <button onClick={() => toggle(a)} title={a.active ? 'Mettre en pause' : 'Réactiver'}
                    style={{ marginLeft: 'auto', font: '600 11px/1 var(--font-sans)', padding: '5px 10px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>
                    {a.active ? 'Pause' : 'Activer'}
                  </button>
                  <button onClick={() => remove(a)} title="Supprimer" aria-label="Supprimer"
                    style={{ font: '600 12px/1 var(--font-mono)', padding: '5px 9px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
                </div>
              );
            })}
          </div>
        )}
        {items && items.length === 0 && (
          <div style={{ font: 'var(--type-caption)', color: 'var(--text-dim)' }}>Aucune alerte pour l'instant.</div>
        )}
      </div>
    </div>
  );
}

window.AlertsPanel = AlertsPanel;
