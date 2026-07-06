/* ─── ActivityFeed : activité GLOBALE (journal d'audit) en bas de la sidebar ──
   Onglet dépliable (5 lignes visibles + molette pour le reste) + popup discret
   en bas à gauche quand quelque chose change (auto-effacé). Cloud uniquement. */

// Phrase lisible + temps relatif (fr) — partagés (window.DXActivity), aussi
// utilisés par le journal par-liste de ListDetail.
function dxAuditSentence(e) {
  const d = e.detail || {};
  const role = r => r === 'editor' ? 'modif.' : 'lecture';
  switch (e.action) {
    case 'item_added':   return `a ajouté ${d.ticker}`;
    case 'item_removed': return `a retiré ${d.ticker}`;
    case 'list_created': return 'a créé la liste';
    case 'list_renamed': return `a renommé la liste en « ${d.to} »`;
    case 'list_deleted': return 'a supprimé la liste';
    case 'shared':       return `a partagé avec ${d.with}${d.role ? ` (${role(d.role)})` : ''}`;
    case 'role_changed': return `a changé le rôle de ${d.with} en ${role(d.role)}`;
    case 'unshared':     return `a retiré l'accès de ${d.with}`;
    default:             return e.action;
  }
}
function dxAuditTimeAgo(iso) {
  const t = new Date(iso).getTime();
  if (isNaN(t)) return '';
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return "à l'instant";
  const m = Math.floor(s / 60); if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60); if (h < 24) return `il y a ${h} h`;
  const j = Math.floor(h / 24); if (j < 30) return `il y a ${j} j`;
  return new Date(iso).toLocaleDateString('fr-FR');
}
window.DXActivity = { sentence: dxAuditSentence, timeAgo: dxAuditTimeAgo };

const dxWho = (email) => (email || 'Quelqu’un').split('@')[0];

const ActivityIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
);

function ActivityFeed() {
  const cloudOn = !!(window.DXCloud && window.DXCloud.enabled);
  const [open, setOpen] = React.useState(false);
  const [rows, setRows] = React.useState([]);
  const [popup, setPopup] = React.useState(null);
  const seenRef = React.useRef(null);        // plus grand id vu (baseline anti-spam au 1er chargement)
  const popupTimer = React.useRef(null);

  const poll = React.useCallback(() => {
    if (!(window.DXCloud && window.DXCloud.enabled)) { setRows([]); return; }
    DXApi.getGlobalActivity(50).then(list => {
      setRows(list);
      if (!list.length) return;
      const maxId = list[0].id;              // liste triée du plus récent au plus ancien
      if (seenRef.current == null) { seenRef.current = maxId; return; }   // baseline : pas de popup pour l'historique
      const fresh = list.filter(e => e.id > seenRef.current);
      if (fresh.length) {
        seenRef.current = maxId;
        setPopup(fresh[0]);
        clearTimeout(popupTimer.current);
        popupTimer.current = setTimeout(() => setPopup(null), 5000);
      }
    }).catch(() => {});
  }, []);

  React.useEffect(() => {
    if (!cloudOn) return;
    poll();
    const id = setInterval(poll, 20000);                         // sondage doux toutes les 20 s
    const onChg = () => poll();                                  // + réaction immédiate à mes propres actions
    window.addEventListener('dx-lists-changed', onChg);
    window.addEventListener('dx-strategies-changed', onChg);
    return () => {
      clearInterval(id);
      window.removeEventListener('dx-lists-changed', onChg);
      window.removeEventListener('dx-strategies-changed', onChg);
      clearTimeout(popupTimer.current);
    };
  }, [cloudOn, poll]);

  if (!cloudOn) return null;                 // audit = comptes cloud uniquement

  const A = window.DXActivity;
  return (
    <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
      {/* Onglet Activité */}
      <button onClick={() => setOpen(o => !o)} title="Activité récente"
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
          background: open ? 'var(--bg-hover)' : 'transparent', border: 'none', cursor: 'pointer',
          color: 'var(--text-soft)', font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        <span style={{ display: 'inline-flex', color: 'var(--accent-hover)' }}>{ActivityIcon}</span>
        <span style={{ flex: 1, textAlign: 'left' }}>Activité</span>
        {rows.length > 0 && (
          <span style={{ font: '500 10px/1 var(--font-mono)', padding: '2px 6px', borderRadius: 8, background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>{rows.length}</span>
        )}
        <span style={{ fontSize: 8, color: 'var(--text-dim)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform var(--dur-fast) var(--ease)' }}>▾</span>
      </button>

      {/* Liste déroulante — 5 lignes visibles, molette pour le reste */}
      {open && (
        <div style={{ maxHeight: 190, overflowY: 'auto', borderTop: '1px solid var(--border-subtle)' }}>
          {rows.length === 0 ? (
            <div style={{ padding: '14px', textAlign: 'center', color: 'var(--text-dim)', font: 'var(--type-caption)' }}>Aucune activité pour l'instant.</div>
          ) : rows.map(e => (
            <div key={e.id} style={{ padding: '8px 14px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ font: '11px/1.4 var(--font-sans)', color: 'var(--text-soft)' }}>
                <strong style={{ color: 'var(--text)' }}>{dxWho(e.actor_email)}</strong> {A.sentence(e)}
              </div>
              <div style={{ font: '9px/1.2 var(--font-sans)', color: 'var(--text-dim)', marginTop: 2 }}>{A.timeAgo(e.created_at)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Popup discret en bas à gauche (auto-effacé après ~5 s) */}
      {popup && (
        <div style={{ position: 'fixed', left: 14, bottom: 96, zIndex: 1200, maxWidth: 236,
          background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderLeft: '3px solid var(--accent)',
          borderRadius: 'var(--radius-lg)', padding: '9px 12px', boxShadow: 'var(--shadow-lg)',
          animation: 'dx-rise var(--dur) var(--ease) both' }}>
          <div style={{ font: 'var(--type-body-sm)', color: 'var(--text)' }}>
            <strong>{dxWho(popup.actor_email)}</strong> <span style={{ color: 'var(--text-soft)' }}>{A.sentence(popup)}</span>
          </div>
          <div style={{ font: 'var(--type-caption)', color: 'var(--text-dim)', marginTop: 2 }}>{A.timeAgo(popup.created_at)}</div>
        </div>
      )}
    </div>
  );
}

window.ActivityFeed = ActivityFeed;
