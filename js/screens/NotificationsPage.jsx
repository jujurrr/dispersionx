/* ─── Page Notifications : vue détaillée des notifications « intelligentes »
   + activité (audit), avec liens cliquables vers le contexte. Ouverte depuis la
   cloche de la barre du haut. Plus détaillée que le petit onglet en bas à gauche.
   Notifications = store partagé window.DXNotifStore (cohérent avec la cloche). */

// Libellé + destination lisible d'une notification, selon son type.
function dxNotifMeta(kind) {
  switch (kind) {
    case 'greek_drift': return { label: 'Grecs', cta: 'Voir la position' };
    case 'pnl':         return { label: 'P&L', cta: 'Voir la position' };
    case 'subscription':return { label: 'Abonnement', cta: 'Gérer l’abonnement' };
    case 'correlation': return { label: 'Corrélation', cta: 'Ouvrir Marché Pro' };
    default:            return { label: 'Info', cta: 'Ouvrir' };
  }
}

function NotificationsPage({ onNav, lists }) {
  const A = window.DXActivity;
  const store = window.DXNotifStore;
  const cloudOn = !!(window.DXCloud && window.DXCloud.enabled);
  const isMobile = window.useIsMobile ? window.useIsMobile() : false;   // 2 colonnes sur grand écran, empilé sinon
  const [, force] = React.useState(0);
  const [audit, setAudit] = React.useState([]);

  // Notifications (store partagé) + « tout lu » à l'ouverture → réinitialise la cloche.
  React.useEffect(() => {
    if (!store) return;
    const h = () => force(x => x + 1);
    window.addEventListener('dx-notif-store', h);
    store.start();
    store.refresh();
    store.markSeen();
    return () => window.removeEventListener('dx-notif-store', h);
  }, []);

  // Activité (audit) — fenêtre large pour la vue détaillée.
  React.useEffect(() => {
    if (!cloudOn) return;
    window.DXApi.getGlobalActivity(200).then(list => { if (Array.isArray(list)) setAudit(list); }).catch(() => {});
  }, [cloudOn]);

  const go = (target) => { if (target) { A.go(target); } };

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
  const nameMap = {}; (lists || []).forEach(l => { nameMap[l.id] = l.name; });
  const sectionCard = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' };
  const sectionHead = { padding: '13px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 };
  const headLabel = { font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' };

  return (
    <div style={{ maxWidth: isMobile ? 820 : 1160, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div>
        <h1 style={{ font: 'var(--type-h1)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: '0 0 6px' }}>Notifications</h1>
        <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)', margin: 0 }}>Alertes de tes positions et de ton compte, et activité partagée. Clique une entrée pour aller au bon endroit.</p>
      </div>

      {/* Deux colonnes sur grand écran (notifs | activité partagée), empilé sur mobile. */}
      <div style={{ display: isMobile ? 'flex' : 'grid', flexDirection: 'column', gridTemplateColumns: isMobile ? undefined : '1.15fr 0.85fr', gap: 22, alignItems: 'start' }}>

      {/* ── Notifications « intelligentes » ── */}
      <section style={sectionCard}>
        <div style={sectionHead}>
          <span style={headLabel}>Notifications {notifs.length > 0 && <span style={{ color: 'var(--text-dim)' }}>· {notifs.length}</span>}</span>
          {notifs.length > 0 && <button onClick={() => store.markSeen()} style={{ font: '600 11px/1 var(--font-sans)', padding: '5px 10px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>Tout marquer comme lu</button>}
        </div>
        {notifs.length === 0 ? (
          <div style={{ padding: '34px 20px', textAlign: 'center', color: 'var(--text-dim)', font: 'var(--type-body-sm)' }}>Aucune notification. Elles apparaîtront ici (dérive des grecs, P&L, abonnement, corrélation).</div>
        ) : notifs.map(n => {
          const col = A.toneColor(n.tone);
          const meta = dxNotifMeta(n.kind);
          const target = A.notifTarget(n);
          return (
            <div key={n.id} onClick={target ? () => go(target) : undefined}
              style={{ display: 'flex', gap: 12, padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)', borderLeft: `3px solid ${col}`, background: A.toneSoft(n.tone), cursor: target ? 'pointer' : 'default' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: col, flexShrink: 0, marginTop: 5, boxShadow: `0 0 0 3px ${A.toneSoft(n.tone)}` }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ font: '600 10px/1 var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '2px 7px', borderRadius: 999, background: 'var(--bg-elevated)', color: col, border: `1px solid ${col}` }}>{meta.label}</span>
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

      {/* ── Activité partagée (audit collaboratif) ── */}
      <section style={sectionCard}>
        <div style={sectionHead}><span style={headLabel}>Activité partagée {audit.length > 0 && <span style={{ color: 'var(--text-dim)' }}>· {audit.length}</span>}</span></div>
        {audit.length === 0 ? (
          <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--text-dim)', font: 'var(--type-body-sm)' }}>Aucune activité récente.</div>
        ) : (
          <div style={{ maxHeight: 460, overflowY: 'auto' }}>
            {audit.map((e, i) => {
              const tone = A.tone(e.action);
              const who = A.who(e.actor_email);
              const listName = (e.list_id && nameMap[e.list_id]) || (e.detail && e.detail.name) || null;
              const target = A.auditTarget(e);
              return (
                <div key={e.id ?? i} onClick={target ? () => go(target) : undefined}
                  style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 20px', borderBottom: i < audit.length - 1 ? '1px solid var(--border-subtle)' : 'none', cursor: target ? 'pointer' : 'default' }}>
                  <span style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-elevated)', border: `1.5px solid ${tone}`, color: tone, font: '700 12px/1 var(--font-mono)', textTransform: 'uppercase' }}>{(who || '?').slice(0, 1)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ font: 'var(--type-body-sm)', color: 'var(--text)' }}>
                      <strong>{who}</strong> <span style={{ color: 'var(--text-soft)' }}>{A.sentence(e)}</span>{target && <span style={{ color: 'var(--accent-hover)', fontWeight: 700, marginLeft: 5 }}>→</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 3 }}>
                      {listName && <span style={{ padding: '2px 9px', borderRadius: 999, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-soft)', font: '10px/1.5 var(--font-sans)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{listName}</span>}
                      <span style={{ font: 'var(--type-caption)', color: 'var(--text-muted)' }}>{A.timeAgo(e.created_at)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      </div>
    </div>
  );
}

window.NotificationsPage = NotificationsPage;
