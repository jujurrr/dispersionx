/* ─── ActivityFeed : activité GLOBALE (journal d'audit) en bas de la sidebar ──
   Onglet dépliable (5 lignes visibles + molette pour le reste). Quand quelque
   chose change, l'onglet se soulève légèrement et la dernière modif apparaît
   DESSOUS de façon discrète, puis se referme. Cloud uniquement. */

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
    case 'list_deleted': return `a supprimé la liste${d.name ? ` « ${d.name} »` : ''}`;
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
const DX_ACT_LIMIT = 200;                    // on récupère jusqu'à 200 entrées…
const DX_ACT_WINDOW_MS = 30 * 86400000;      // …mais on n'affiche que les 30 derniers jours

const ActivityIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
);

function ActivityFeed() {
  const cloudOn = !!(window.DXCloud && window.DXCloud.enabled);
  const [open, setOpen] = React.useState(false);
  const [rows, setRows] = React.useState([]);
  const [reveal, setReveal] = React.useState(null);   // dernière modif à révéler
  const [shown, setShown] = React.useState(false);     // ouverture de la révélation (transition douce)
  const seenRef = React.useRef(null);                  // plus grand id vu (baseline anti-spam au 1er chargement)
  const revealTimers = React.useRef([]);
  const pokeTimer = React.useRef(null);
  const clearRevealTimers = () => { revealTimers.current.forEach(clearTimeout); revealTimers.current = []; };

  const showReveal = React.useCallback((entry) => {
    clearRevealTimers();
    setReveal(entry);
    revealTimers.current.push(setTimeout(() => setShown(true), 20));      // se soulève
    revealTimers.current.push(setTimeout(() => setShown(false), 3800));   // se referme
    revealTimers.current.push(setTimeout(() => setReveal(null), 4200));
  }, []);

  const poll = React.useCallback(() => {
    if (!(window.DXCloud && window.DXCloud.enabled)) { setRows([]); return; }
    DXApi.getGlobalActivity(DX_ACT_LIMIT).then(list => {
      if (!Array.isArray(list)) return;
      // Affichage : fenêtre glissante (30 j) → « se réinitialise » avec le temps.
      const cutoff = Date.now() - DX_ACT_WINDOW_MS;
      setRows(list.filter(e => new Date(e.created_at).getTime() >= cutoff));
      if (!list.length) return;
      // VRAI maximum d'id (pas list[0] : plusieurs lignes d'une même transaction
      // partagent le created_at, donc l'ordre entre elles n'est pas garanti).
      const maxId = list.reduce((mx, e) => Math.max(mx, Number(e.id) || 0), 0);
      if (seenRef.current == null) { seenRef.current = maxId; return; }   // baseline : pas de révélation de l'historique
      const fresh = list.filter(e => Number(e.id) > seenRef.current);
      if (fresh.length) {
        seenRef.current = maxId;
        const newest = fresh.reduce((a, b) => (Number(b.id) > Number(a.id) ? b : a));
        showReveal(newest);
      }
    }).catch(() => {});
  }, [showReveal]);

  React.useEffect(() => {
    if (!cloudOn) return;
    poll();
    const id = setInterval(poll, 20000);               // filet de sécurité
    const onPoke = () => { poll(); clearTimeout(pokeTimer.current); pokeTimer.current = setTimeout(poll, 1200); };  // réactif après une mutation
    window.addEventListener('dx-activity-poke', onPoke);
    window.addEventListener('dx-lists-changed', onPoke);
    window.addEventListener('dx-strategies-changed', onPoke);
    return () => {
      clearInterval(id);
      window.removeEventListener('dx-activity-poke', onPoke);
      window.removeEventListener('dx-lists-changed', onPoke);
      window.removeEventListener('dx-strategies-changed', onPoke);
      clearRevealTimers();
      clearTimeout(pokeTimer.current);
    };
  }, [cloudOn, poll]);

  if (!cloudOn) return null;                            // audit = comptes cloud uniquement

  const A = window.DXActivity;
  const lifting = reveal && shown && !open;
  return (
    <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
      {/* Onglet Activité — se soulève légèrement quand une modif est révélée */}
      <button onClick={() => setOpen(o => !o)} title="Activité récente"
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
          background: open ? 'var(--bg-hover)' : 'transparent', border: 'none', cursor: 'pointer',
          color: 'var(--text-soft)', font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.05em',
          transform: lifting ? 'translateY(-2px)' : 'none',
          transition: 'transform 0.3s var(--ease), background var(--dur-fast) var(--ease)' }}>
        <span style={{ display: 'inline-flex', color: 'var(--accent-hover)' }}>{ActivityIcon}</span>
        <span style={{ flex: 1, textAlign: 'left' }}>Activité</span>
        {rows.length > 0 && (
          <span style={{ font: '500 10px/1 var(--font-mono)', padding: '2px 6px', borderRadius: 8, background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>{rows.length}</span>
        )}
        <span style={{ fontSize: 8, color: 'var(--text-dim)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform var(--dur-fast) var(--ease)' }}>▾</span>
      </button>

      {/* Révélation discrète — SOUS l'onglet */}
      {reveal && !open && (
        <div style={{ overflow: 'hidden', transition: 'max-height 0.35s var(--ease), opacity 0.3s var(--ease)', maxHeight: shown ? 46 : 0, opacity: shown ? 1 : 0 }}>
          <div style={{ padding: '7px 14px', background: 'var(--bg-elevated)', borderTop: '1px solid var(--border-subtle)' }}>
            <div style={{ font: '10px/1.35 var(--font-sans)', color: 'var(--text-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <strong style={{ color: 'var(--text)' }}>{dxWho(reveal.actor_email)}</strong> {A.sentence(reveal)}
            </div>
          </div>
        </div>
      )}

      {/* Liste déroulante — 5 lignes visibles, molette pour le reste */}
      {open && (
        <div style={{ maxHeight: 190, overflowY: 'auto', borderTop: '1px solid var(--border-subtle)' }}>
          {rows.length === 0 ? (
            <div style={{ padding: '14px', textAlign: 'center', color: 'var(--text-dim)', font: 'var(--type-caption)' }}>Aucune activité récente.</div>
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
    </div>
  );
}

window.ActivityFeed = ActivityFeed;
