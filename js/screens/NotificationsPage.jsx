/* ─── Page Notifications : notifications « intelligentes » (cliquables, détaillées)
   + activité récente reprise TELLE QUELLE du Dashboard (2 panneaux : compte vs
   partagé, via window.ActivityPanel). Ouverte depuis la cloche de la barre du haut.
   Notifications = store partagé window.DXNotifStore (cohérent avec l'onglet). */

// Libellé + CTA lisibles d'une notification, selon son type.
function dxNotifMeta(kind, ref) {
  switch (kind) {
    case 'greek_drift': return { label: 'Grecs', cta: 'Voir la position' };
    case 'pnl':         return { label: 'P&L', cta: 'Voir la position' };
    case 'subscription':return ref === 'sub:activated'
      ? { label: 'Abonnement', cta: 'Découvrir le Pro' }         // notif d'activation → avantages Pro
      : { label: 'Abonnement', cta: 'Gérer l’abonnement' };
    case 'correlation': return { label: 'Corrélation', cta: 'Ouvrir Marché Pro' };
    default:            return { label: 'Info', cta: 'Ouvrir' };
  }
}

function NotificationsPage({ onNav, lists }) {
  const A = window.DXActivity;
  const store = window.DXNotifStore;
  const cloudOn = !!(window.DXCloud && window.DXCloud.enabled);
  const [, force] = React.useState(0);
  const [activity, setActivity] = React.useState(null);   // { account, shared, nameMap } — comme le Dashboard

  // Notifications (store partagé) + « tout lu » à l'ouverture → réinitialise la cloche.
  // On CAPTURE le dernier id vu AVANT markSeen : les notifs déjà vues s'affichent en
  // neutre (le bandeau coloré ne revient pas), les nouvelles gardent leur couleur.
  const seenAtOpen = React.useRef(0);
  React.useEffect(() => {
    if (!store) return;
    seenAtOpen.current = store.getSeenId ? store.getSeenId() : 0;
    const h = () => force(x => x + 1);
    window.addEventListener('dx-notif-store', h);
    store.start();
    store.refresh();
    store.markSeen();
    return () => window.removeEventListener('dx-notif-store', h);
  }, []);

  // Activité récente : global (RLS) partitionné en « compte » (mes listes) et
  // « partagé » (listes partagées avec moi) — MÊME logique que le Dashboard.
  const loadActivity = React.useCallback(() => {
    if (!(window.DXCloud && window.DXCloud.enabled)) { setActivity(null); return; }
    Promise.all([DXApi.getGlobalActivity(200), DXApi.getSharedLists().catch(() => [])]).then(([acts, shared]) => {
      const nameMap = {};
      (lists || []).forEach(l => { if (l && l.id) nameMap[l.id] = l.name; });
      (shared || []).forEach(l => { if (l && l.id) nameMap[l.id] = l.name; });
      const sharedIds = new Set((shared || []).map(l => l.id));
      const account = [], shr = [];
      (acts || []).forEach(e => { (sharedIds.has(e.list_id) ? shr : account).push(e); });
      setActivity({ account, shared: shr, nameMap });
    }).catch(() => setActivity({ account: [], shared: [], nameMap: {} }));
  }, [lists]);

  React.useEffect(() => {
    if (!cloudOn) return;
    loadActivity();
    const onChg = () => loadActivity();
    window.addEventListener('dx-activity-poke', onChg);
    window.addEventListener('dx-lists-changed', onChg);
    return () => { window.removeEventListener('dx-activity-poke', onChg); window.removeEventListener('dx-lists-changed', onChg); };
  }, [cloudOn, loadActivity]);

  if (!cloudOn) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <h1 style={{ font: 'var(--type-h1)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: 0 }}>Notifications</h1>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '40px 28px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ font: '30px/1' }}>🔔</div>
          <div style={{ font: 'var(--type-h3)', color: 'var(--text)' }}>Connecte-toi pour tes notifications</div>
          <div style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', maxWidth: 420 }}>
            Les notifications (dérive des grecs, P&L, abonnement, corrélation) sont liées à ton compte.
          </div>
          <button onClick={() => onNav('login')} style={{ font: '600 12px/1 var(--font-sans)', padding: '10px 20px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', marginTop: 6 }}>Se connecter / créer un compte</button>
        </div>
      </div>
    );
  }

  const notifs = store ? store.getNotifs() : [];
  const sectionCard = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' };
  const sectionHead = { padding: '13px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 };
  const headLabel = { font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' };

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ font: 'var(--type-h1)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: '0 0 6px' }}>Notifications</h1>
        <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)', margin: 0 }}>Alertes de tes positions et de ton compte, et activité récente. Clique une entrée pour aller au bon endroit.</p>
      </div>

      {/* ── Notifications « intelligentes » (cliquables) ── */}
      <section style={sectionCard}>
        <div style={sectionHead}>
          <span style={headLabel}>Notifications {notifs.length > 0 && <span style={{ color: 'var(--text-dim)' }}>· {notifs.length}</span>}</span>
          {notifs.length > 0 && <button onClick={() => store.markSeen()} style={{ font: '600 11px/1 var(--font-sans)', padding: '5px 10px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>Tout marquer comme lu</button>}
        </div>
        {notifs.length === 0 ? (
          <div style={{ padding: '34px 20px', textAlign: 'center', color: 'var(--text-dim)', font: 'var(--type-body-sm)' }}>Aucune notification. Elles apparaîtront ici (dérive des grecs, P&L, abonnement, corrélation).</div>
        ) : notifs.map(n => {
          const col = A.toneColor(n.tone);
          const meta = dxNotifMeta(n.kind, n.ref);
          const target = A.notifTarget(n);
          // La notif reste 30 j dans le fil. Une fois VUE (id ≤ dernier id vu à
          // l'ouverture), elle passe en NEUTRE (plus de bandeau coloré) et le reste.
          const isNew = Number(n.id) > seenAtOpen.current;
          return (
            <div key={n.id} onClick={target ? () => A.go(target) : undefined}
              style={{ display: 'flex', gap: 12, padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)', borderLeft: `3px solid ${isNew ? col : 'var(--border)'}`, background: isNew ? A.toneSoft(n.tone) : 'transparent', cursor: target ? 'pointer' : 'default' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: isNew ? col : 'var(--text-dim)', flexShrink: 0, marginTop: 5, boxShadow: isNew ? `0 0 0 3px ${A.toneSoft(n.tone)}` : 'none' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ font: '600 10px/1 var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '2px 7px', borderRadius: 999, background: 'var(--bg-elevated)', color: isNew ? col : 'var(--text-muted)', border: `1px solid ${isNew ? col : 'var(--border)'}` }}>{meta.label}</span>
                  <span style={{ font: 'var(--type-title)', color: 'var(--text)' }}>{n.title}</span>
                </div>
                {n.body && <div style={{ font: 'var(--type-body-sm)', color: 'var(--text-soft)', marginTop: 5, lineHeight: 1.5 }}>{n.body}</div>}
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 7, flexWrap: 'wrap' }}>
                  <span style={{ font: 'var(--type-caption)', color: 'var(--text-muted)' }} title={new Date(n.created_at).toLocaleString('fr-FR')}>{A.timeAgo(n.created_at)}</span>
                  {target && <span style={{ font: '600 11px/1 var(--font-sans)', color: 'var(--accent-hover)' }}>{meta.cta} →</span>}
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* ── Activité récente : compte vs partagé — IDENTIQUE au Dashboard ── */}
      {activity && window.ActivityPanel && (
        <section>
          <div style={{ marginBottom: 14 }}>
            <h2 style={{ font: 'var(--type-h2)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: 0 }}>Activité récente</h2>
            <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: '4px 0 0' }}>Qui a modifié quoi, et quand — sur vos listes et celles partagées avec vous (30 derniers jours).</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, alignItems: 'start' }}>
            <window.ActivityPanel title="Activité du compte" subtitle="Modifications sur vos listes" entries={activity.account} nameMap={activity.nameMap} />
            <window.ActivityPanel title="Activité partagée" subtitle="Modifications sur les listes partagées avec vous" entries={activity.shared} nameMap={activity.nameMap} />
          </div>
        </section>
      )}
    </div>
  );
}

window.NotificationsPage = NotificationsPage;
