/* ─── ActivityFeed : activité GLOBALE (journal d'audit) en bas de la sidebar ──
   Onglet dépliable (5 lignes visibles + molette pour le reste). Quand quelque
   chose change, l'onglet se soulève légèrement et la dernière modif apparaît
   DESSOUS de façon discrète, puis se referme. À la (re)connexion, un badge +
   une bannière signalent les modifs faites par d'autres depuis la dernière
   visite. Expose aussi window.ActivityPanel (liste détaillée, DA ronde) et
   window.DXActivity (helpers partagés). Cloud uniquement. */

// Phrase lisible + temps relatif (fr) — partagés (window.DXActivity), aussi
// utilisés par ListDetail et le Dashboard.
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
function dxActionTone(action) {
  switch (action) {
    case 'item_added': case 'list_created': case 'shared':      return 'var(--pos)';
    case 'item_removed': case 'list_deleted': case 'unshared':  return 'var(--neg)';
    case 'list_renamed': case 'role_changed':                   return 'var(--warn)';
    default:                                                    return 'var(--accent)';
  }
}
const dxWho = (email) => (email || 'Quelqu’un').split('@')[0];
// Couleur d'un ton de notification « intelligente » — variantes VIVES pour rester
// bien visibles, y compris le vert (demande explicite).
function dxToneColor(tone) {
  switch (tone) {
    case 'pos': return 'var(--pos-bright)';
    case 'neg': return 'var(--neg-bright)';
    case 'warn': return 'var(--warn)';
    default:    return 'var(--accent-hover)';
  }
}
// Fond teinté discret assorti au ton (pour les notifs, « bien visibles »).
function dxToneSoft(tone) {
  switch (tone) {
    case 'pos': return 'var(--pos-soft)';
    case 'neg': return 'var(--neg-soft)';
    case 'warn': return 'var(--warn-soft)';
    default:    return 'var(--accent-soft)';
  }
}
window.DXActivity = { sentence: dxAuditSentence, timeAgo: dxAuditTimeAgo, tone: dxActionTone, who: dxWho, toneColor: dxToneColor, toneSoft: dxToneSoft, notifTarget: dxNotifTarget, auditTarget: dxAuditTarget, go: dxGo };

// ── Cible de navigation d'une notification / d'un événement d'audit ──
// On déduit la destination du `kind` + `ref` (ex. « pos:<id>:delta »). Renvoie
// { screen, params } | null. La nav passe par window.__dxNav (défini par l'app).
function dxNotifTarget(n) {
  const ref = (n && n.ref) || '';
  switch (n && n.kind) {
    case 'subscription':
      // Activation → module Pro concret (Opportunités) pour découvrir ce qui est
      // débloqué. Les autres (renouvellement/résiliation) → section Abonnement.
      return ref === 'sub:activated' ? { screen: 'opportunities' } : { screen: 'preferences' };
    case 'correlation':  return { screen: 'market-pro' };                  // baromètre ρ (Pro)
    case 'greek_drift':
    case 'pnl': {
      const m = ref.match(/^pos:(.+):[^:]+$/);
      return m ? { screen: 'position', params: { positionId: m[1] } } : { screen: 'positions' };
    }
    default: return null;
  }
}
function dxAuditTarget(e) {
  // Ajout/retrait d'action, création/renommage/partage → la liste concernée.
  if (e && e.list_id && e.action !== 'list_deleted') return { screen: 'list-detail', params: { listId: e.list_id } };
  return null;
}
function dxGo(target) {
  if (target && window.__dxNav) window.__dxNav(target.screen, target.params || {});
}
// Petite flèche de lien en fin de texte.
function DxArrow() {
  return <span aria-hidden="true" style={{ color: 'var(--accent-hover)', fontWeight: 700, marginLeft: 5 }}>→</span>;
}

const DX_ACT_LIMIT = 200;                    // on récupère jusqu'à 200 entrées…
const DX_ACT_WINDOW_MS = 30 * 86400000;      // …mais on n'affiche que les 30 derniers jours

/* ─── ActivityPanel : liste détaillée d'activité (DA ronde) — Dashboard ─── */
function ActivityPanel({ title, subtitle, entries, nameMap }) {
  const A = window.DXActivity;
  const rows = entries || [];
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 22, overflow: 'hidden' }}>
      <div style={{ padding: '15px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ font: 'var(--type-title)', color: 'var(--text)' }}>{title}</div>
        {subtitle && <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</div>}
      </div>
      {rows.length === 0 ? (
        <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--text-dim)', font: 'var(--type-body-sm)' }}>Aucune activité récente.</div>
      ) : (
        <div style={{ maxHeight: 340, overflowY: 'auto' }}>
          {rows.map((e, i) => {
            const tone = A.tone(e.action);
            const listName = (e.list_id && nameMap && nameMap[e.list_id]) || (e.detail && e.detail.name) || null;
            const who = A.who(e.actor_email);
            return (
              <div key={e.id ?? i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '13px 20px', borderBottom: i < rows.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                <span style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-elevated)', border: `1.5px solid ${tone}`, color: tone, font: '700 13px/1 var(--font-mono)', textTransform: 'uppercase' }}>
                  {(who || '?').slice(0, 1)}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: 'var(--type-body-sm)', color: 'var(--text)' }}>
                    <strong>{who}</strong> <span style={{ color: 'var(--text-soft)' }}>{A.sentence(e)}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 4 }}>
                    {listName && (
                      <span style={{ padding: '2px 10px', borderRadius: 999, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-soft)', font: '10px/1.5 var(--font-sans)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{listName}</span>
                    )}
                    <span style={{ font: 'var(--type-caption)', color: 'var(--text-muted)' }} title={new Date(e.created_at).toLocaleString('fr-FR')}>{A.timeAgo(e.created_at)}</span>
                    {e.actor_email && <span style={{ font: 'var(--type-caption)', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>· {e.actor_email}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
window.ActivityPanel = ActivityPanel;

const ActivityIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
);

function ActivityFeed() {
  const cloudOn = !!(window.DXCloud && window.DXCloud.enabled);
  const meEmail = (window.DXCloud && window.DXCloud.user && window.DXCloud.user.email) || '';
  const uid = (window.DXCloud && window.DXCloud.user && window.DXCloud.user.id) || 'anon';
  const seenKey = 'dx-activity-seen-' + uid;
  const store = window.DXNotifStore;   // notifications : source unique partagée (cloche + page)

  const [open, setOpen] = React.useState(false);
  const [rows, setRows] = React.useState([]);
  const [reveal, setReveal] = React.useState(null);   // dernière modif « live » à révéler
  const [shown, setShown] = React.useState(false);
  const [auditUnseen, setAuditUnseen] = React.useState(0);   // modifs par d'autres non vues (audit)
  const [, forceStore] = React.useState(0);                  // re-render quand le store notifs change
  const [loginNotice, setLoginNotice] = React.useState(0);   // bannière persistante à la (re)connexion

  const seenRef = React.useRef(null);        // baseline session (révélations live)
  const lastSeenRef = React.useRef(null);    // dernier id audit vu, PERSISTÉ
  const latestMaxRef = React.useRef(0);
  const firstRef = React.useRef(true);
  const revealTimers = React.useRef([]);
  const pokeTimer = React.useRef(null);
  const clearRevealTimers = () => { revealTimers.current.forEach(clearTimeout); revealTimers.current = []; };

  const showReveal = React.useCallback((entry) => {
    clearRevealTimers();
    setReveal(entry);
    revealTimers.current.push(setTimeout(() => setShown(true), 20));
    revealTimers.current.push(setTimeout(() => setShown(false), 3800));
    revealTimers.current.push(setTimeout(() => setReveal(null), 4200));
  }, []);

  const markSeen = React.useCallback(() => {
    lastSeenRef.current = latestMaxRef.current;
    try { localStorage.setItem(seenKey, String(latestMaxRef.current)); } catch {}
    setAuditUnseen(0); setLoginNotice(0);
    if (store) store.markSeen();   // notifications : réinitialise aussi la cloche (cohérence)
  }, [seenKey, store]);

  const poll = React.useCallback(() => {
    if (!(window.DXCloud && window.DXCloud.enabled)) { setRows([]); return; }
    if (lastSeenRef.current == null) {
      const raw = (() => { try { return localStorage.getItem(seenKey); } catch { return null; } })();
      lastSeenRef.current = raw != null ? (parseInt(raw, 10) || 0) : 0;
    }
    const cutoff = Date.now() - DX_ACT_WINDOW_MS;
    // Audit collaboratif (les notifications « intelligentes » viennent du store).
    DXApi.getGlobalActivity(DX_ACT_LIMIT).then(alist => {
      if (!Array.isArray(alist)) return;
      setRows(alist.filter(e => new Date(e.created_at).getTime() >= cutoff));   // fenêtre 30 j
      if (!alist.length) return;
      const maxId = alist.reduce((mx, e) => Math.max(mx, Number(e.id) || 0), 0);
      latestMaxRef.current = maxId;
      const au = alist.filter(e => Number(e.id) > lastSeenRef.current && e.actor_email && e.actor_email !== meEmail).length;
      setAuditUnseen(au);
      const notifUnseen = store ? store.unseen() : 0;
      if (seenRef.current == null) {
        seenRef.current = maxId;
        if (firstRef.current && (au + notifUnseen) > 0) setLoginNotice(au + notifUnseen);
        firstRef.current = false;
      } else {
        const fresh = alist.filter(e => Number(e.id) > seenRef.current);
        if (fresh.length) { seenRef.current = maxId; showReveal(fresh.reduce((a, b) => (Number(b.id) > Number(a.id) ? b : a))); }
      }
    }).catch(() => {});
  }, [showReveal, meEmail, seenKey, store]);

  React.useEffect(() => {
    if (!cloudOn) return;
    poll();
    if (store) store.start();
    const id = setInterval(poll, 20000);
    const onPoke = () => { poll(); clearTimeout(pokeTimer.current); pokeTimer.current = setTimeout(poll, 1200); };
    const onStore = () => forceStore(x => x + 1);   // notifs du store changées → re-render (badge + fil)
    window.addEventListener('dx-activity-poke', onPoke);
    window.addEventListener('dx-lists-changed', onPoke);
    window.addEventListener('dx-strategies-changed', onPoke);
    window.addEventListener('dx-notif-store', onStore);
    return () => {
      clearInterval(id);
      window.removeEventListener('dx-activity-poke', onPoke);
      window.removeEventListener('dx-lists-changed', onPoke);
      window.removeEventListener('dx-strategies-changed', onPoke);
      window.removeEventListener('dx-notif-store', onStore);
      clearRevealTimers();
      clearTimeout(pokeTimer.current);
    };
  }, [cloudOn, poll, store]);

  if (!cloudOn) return null;

  const A = window.DXActivity;
  const toggle = () => setOpen(o => { const n = !o; if (n) markSeen(); return n; });
  const lifting = ((loginNotice > 0) || (reveal && shown)) && !open;

  // Notifications = store partagé ; non-vu total = audit d'autrui + notifs non vues.
  const notifs = store ? store.getNotifs() : [];
  const unseen = auditUnseen + (store ? store.unseen() : 0);

  // Fil fusionné : notifications « intelligentes » + audit collaboratif, trié récent→ancien.
  const feed = [
    ...notifs.map(n => ({ type: 'notif', key: 'n' + n.id, ts: n.created_at, n })),
    ...rows.map(e => ({ type: 'audit', key: 'a' + e.id, ts: e.created_at, e })),
  ].sort((a, b) => new Date(b.ts) - new Date(a.ts));

  return (
    <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
      {/* Onglet Activité — se soulève légèrement quand il y a du neuf */}
      <button onClick={toggle} title="Activité récente"
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
          background: open ? 'var(--bg-hover)' : 'transparent', border: 'none', cursor: 'pointer',
          color: 'var(--text-soft)', font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.05em',
          transform: lifting ? 'translateY(-2px)' : 'none',
          transition: 'transform 0.3s var(--ease), background var(--dur-fast) var(--ease)' }}>
        <span style={{ display: 'inline-flex', color: 'var(--accent-hover)' }}>{ActivityIcon}</span>
        <span style={{ flex: 1, textAlign: 'left' }}>Activité</span>
        {/* Badge = NON-VU uniquement → se remet à 0 dès qu'on ouvre le menu (plus de total figé). */}
        {unseen > 0 ? (
          <span className="dx-pulse" style={{ font: '600 10px/1 var(--font-mono)', padding: '3px 7px', borderRadius: 999, background: 'var(--accent)', color: '#fff', border: '1px solid var(--accent)' }}>{unseen} nouveau{unseen > 1 ? 'x' : ''}</span>
        ) : feed.length > 0 ? (
          <span title="Aucune nouveauté" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--border-strong)', flexShrink: 0 }} />
        ) : null}
        <span style={{ fontSize: 8, color: 'var(--text-dim)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform var(--dur-fast) var(--ease)' }}>▾</span>
      </button>

      {/* Bannière (re)connexion : modifs par d'autres depuis la dernière visite (persistante) */}
      {loginNotice > 0 && !open && (
        <button onClick={toggle} style={{ width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer', padding: '9px 14px', background: 'var(--accent-soft)', borderTop: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
          <span style={{ font: '10px/1.35 var(--font-sans)', color: 'var(--accent-hover)' }}>
            {loginNotice} modification{loginNotice > 1 ? 's' : ''} depuis votre dernière visite — voir
          </span>
        </button>
      )}

      {/* Révélation « live » — SOUS l'onglet (masquée si la bannière est là) */}
      {reveal && !open && loginNotice === 0 && (
        <div style={{ overflow: 'hidden', transition: 'max-height 0.35s var(--ease), opacity 0.3s var(--ease)', maxHeight: shown ? 46 : 0, opacity: shown ? 1 : 0 }}>
          <div style={{ padding: '7px 14px', background: 'var(--bg-elevated)', borderTop: '1px solid var(--border-subtle)' }}>
            <div style={{ font: '10px/1.35 var(--font-sans)', color: 'var(--text-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <strong style={{ color: 'var(--text)' }}>{dxWho(reveal.actor_email)}</strong> {A.sentence(reveal)}
            </div>
          </div>
        </div>
      )}

      {/* Liste déroulante — notifications colorées + audit, molette pour le reste */}
      {open && (
        <div style={{ maxHeight: 220, overflowY: 'auto', borderTop: '1px solid var(--border-subtle)' }}>
          {feed.length === 0 ? (
            <div style={{ padding: '14px', textAlign: 'center', color: 'var(--text-dim)', font: 'var(--type-caption)' }}>Aucune activité récente.</div>
          ) : feed.map(item => {
            if (item.type === 'notif') {
              const n = item.n;
              const col = A.toneColor(n.tone);
              const target = dxNotifTarget(n);
              // Clic → navigation (si cible) + retrait définitif de la notif + ferme.
              const dismiss = () => { if (window.DXNotifStore) window.DXNotifStore.dismiss(n.id); };
              const go = () => { if (target) dxGo(target); dismiss(); setOpen(false); };
              return (
                <div key={item.key} onClick={go} title={target ? 'Ouvrir' : 'Retirer'}
                  style={{ display: 'flex', gap: 9, padding: '9px 14px', borderBottom: '1px solid var(--border-subtle)', borderLeft: `3px solid ${col}`, background: A.toneSoft(n.tone), cursor: 'pointer' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: col, flexShrink: 0, marginTop: 4, boxShadow: `0 0 0 2px ${A.toneSoft(n.tone)}` }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ font: '600 11px/1.35 var(--font-sans)', color: 'var(--text)' }}>{n.title}{!n.body && target && <DxArrow />}</div>
                    {n.body && <div style={{ font: '10px/1.4 var(--font-sans)', color: 'var(--text-soft)', marginTop: 2 }}>{n.body}{target && <DxArrow />}</div>}
                    <div style={{ font: '9px/1.2 var(--font-sans)', color: 'var(--text-dim)', marginTop: 3 }}>{A.timeAgo(n.created_at)}</div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); dismiss(); }} aria-label="Retirer" title="Retirer"
                    style={{ flexShrink: 0, alignSelf: 'flex-start', width: 18, height: 18, borderRadius: 4, border: 'none', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', font: '700 11px/1 var(--font-mono)' }}>✕</button>
                </div>
              );
            }
            const e = item.e;
            const eTarget = dxAuditTarget(e);
            const eGo = eTarget ? () => { dxGo(eTarget); setOpen(false); } : undefined;
            return (
              <div key={item.key} onClick={eGo} title={eTarget ? 'Ouvrir la liste' : undefined}
                style={{ display: 'flex', gap: 9, padding: '8px 14px', borderBottom: '1px solid var(--border-subtle)', cursor: eTarget ? 'pointer' : 'default' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: A.tone(e.action), flexShrink: 0, marginTop: 4 }} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ font: '11px/1.4 var(--font-sans)', color: 'var(--text-soft)' }}>
                    <strong style={{ color: 'var(--text)' }}>{dxWho(e.actor_email)}</strong> {A.sentence(e)}{eTarget && <DxArrow />}
                  </div>
                  <div style={{ font: '9px/1.2 var(--font-sans)', color: 'var(--text-dim)', marginTop: 2 }}>{A.timeAgo(e.created_at)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

window.ActivityFeed = ActivityFeed;
