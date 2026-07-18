/* ─── Mes stratégies : recensement des stratégies construites ──────────
   Même interface que « Mes listes » (grille / groupes / chronologique), mais
   sur les stratégies issues du Builder / de la Construction, stockées en
   localStorage sous 'dx-strategy-<listId>' (write-through cloud).

   Nom : une stratégie HÉRITE du nom de sa liste source tant qu'elle n'a pas de
   nom propre — résolu au rendu par DXApi.strategyName, donc un renommage de
   liste s'y propage. Dès qu'on la renomme ici, son `name` propre prend le
   dessus et se propage partout (Strategy Monitor, Suivi) puisque tous les
   écrans passent par la même résolution.

   Groupes : stockés DANS le blob de stratégie (pas de colonne Supabase) → ils
   suivent le write-through cloud sans migration, et marchent hors compte. */
function Strategies({ onNav, lists, addToast }) {
  const { EmptyState } = window.DispersionXDesignSystem_cb86be;
  const _fx = window.useCurrency ? window.useCurrency() : null;   // re-render au changement de devise
  // Lecture SYNCHRONE (localStorage) → initialiseur paresseux plutôt qu'un effet :
  // le premier rendu porte déjà les stratégies, pas d'écran de chargement inutile.
  const read = () => (window.DXApi && DXApi.localStrategies) ? (DXApi.localStrategies(lists) || []) : [];
  const [strats, setStrats] = React.useState(read);

  const load = React.useCallback(() => { setStrats(read()); }, [lists]);   // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    load();
    window.addEventListener('dx-strategies-changed', load);
    return () => window.removeEventListener('dx-strategies-changed', load);
  }, [load]);

  // ── Vue (grille / groupes / chronologique) — préférence mémorisée, comme les listes. ──
  const [view, setView] = React.useState(() => { try { return localStorage.getItem('dx-strategies-view') || 'grid'; } catch { return 'grid'; } });
  React.useEffect(() => { try { localStorage.setItem('dx-strategies-view', view); } catch {} }, [view]);
  const [groupFor, setGroupFor] = React.useState(null);       // stratégie en cours d'affectation
  const [newGroupName, setNewGroupName] = React.useState('');
  const [collapsed, setCollapsed] = React.useState({});
  const [editing, setEditing] = React.useState(null);         // listId en cours de renommage
  const [nameDraft, setNameDraft] = React.useState('');
  const [dialog, setDialog] = React.useState(null);
  const [dialogBusy, setDialogBusy] = React.useState(false);
  async function runDialog() {
    if (!dialog?.onConfirm) return;
    setDialogBusy(true);
    try { await dialog.onConfirm(); } finally { setDialogBusy(false); setDialog(null); }
  }

  const rows = (strats || []).map(s => ({ s, m: DXApi.strategyMetrics(s) }));

  const statusColor = (st) => st === 'sain' ? 'var(--pos-bright)' : st === 'surveiller' ? 'var(--warn)' : 'var(--neg-bright)';
  const statusLabel = { sain: 'Sain', surveiller: 'À surveiller', risque: 'Risque' };
  const fmtMoney = n => window.DXMoney ? window.DXMoney.value(n) : ((n >= 0 ? '+' : '−') + Math.abs(Math.round(n)).toLocaleString('fr-FR'));

  // Groupes existants (étiquettes distinctes présentes sur les stratégies), triés.
  const groupNames = React.useMemo(() => {
    const g = new Set();
    (strats || []).forEach(s => { if (s.group_name) g.add(s.group_name); });
    return Array.from(g).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [strats]);

  function assignGroup(s, name) {
    try {
      DXApi.setStrategyGroup(s.listId, name || null);
      setGroupFor(null); setNewGroupName('');
      addToast && addToast(name ? `« ${s.displayName} » déplacée dans « ${name} ».` : `« ${s.displayName} » retirée de son groupe.`);
      load();
    } catch (e) {
      addToast && addToast('Impossible de ranger cette stratégie : ' + (e?.message || 'erreur') + '.', 'error');
    }
  }

  function saveName(s) {
    const nm = nameDraft.trim();
    if (!nm || nm === s.displayName) { setEditing(null); return; }
    try {
      DXApi.renameStrategy(s.listId, nm);
      setEditing(null);
      addToast && addToast('Stratégie renommée.');
      load();
    } catch (e) {
      addToast && addToast('Renommage impossible : ' + (e?.message || 'erreur') + '.', 'error');
    }
  }
  // Retour à l'héritage : efface le nom propre → la stratégie reprend le nom de sa liste.
  function resetName(s) {
    try { DXApi.renameStrategy(s.listId, null); setEditing(null); addToast && addToast('Nom réinitialisé sur la liste source.'); load(); }
    catch { addToast && addToast('Réinitialisation impossible.', 'error'); }
  }

  function handleDelete(s) {
    setDialog({
      title: 'Supprimer la stratégie ?',
      message: <>Voulez-vous vraiment supprimer « <strong style={{ color: 'var(--text)' }}>{s.displayName}</strong> » ? La liste source « {s.listName || '—'} » n'est pas affectée.</>,
      confirmLabel: 'Supprimer',
      onConfirm: async () => {
        try { DXApi.deleteLocalStrategy(s.listId); addToast && addToast(`Stratégie « ${s.displayName} » supprimée.`); load(); }
        catch { addToast && addToast('Erreur lors de la suppression.', 'error'); }
      },
    });
  }

  const monthLabel = (ym) => {
    const d = new Date(ym + '-01T00:00:00');
    if (isNaN(d)) return ym;
    return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  };
  const dayLabel = (ymd) => {
    const d = new Date(ymd + 'T00:00:00');
    if (isNaN(d)) return ymd;
    const t = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    return t.charAt(0).toUpperCase() + t.slice(1);
  };

  // Titre éditable (inline) — même UX que le renommage de liste dans ListDetail.
  const nameBlock = (s) => editing === s.listId ? (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={e => e.stopPropagation()}>
      <input value={nameDraft} onChange={e => setNameDraft(e.target.value)} autoFocus maxLength={60}
        onKeyDown={e => { if (e.key === 'Enter') saveName(s); else if (e.key === 'Escape') setEditing(null); }}
        style={{ flex: 1, minWidth: 0, font: 'var(--type-title)', color: 'var(--text)', background: 'var(--bg-input)', border: '1px solid var(--accent)', borderRadius: 'var(--radius)', padding: '3px 8px', outline: 'none' }} />
      <button onClick={() => saveName(s)} title="Enregistrer" style={{ font: '600 12px/1 var(--font-sans)', padding: '6px 9px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}>✓</button>
      <button onClick={() => setEditing(null)} title="Annuler" style={{ font: '600 12px/1 var(--font-sans)', padding: '6px 9px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>✕</button>
      {s.name && <button onClick={() => resetName(s)} title="Reprendre le nom de la liste source" style={{ font: '600 12px/1 var(--font-sans)', padding: '6px 9px', borderRadius: 'var(--radius)', border: '1px dashed var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>↺</button>}
    </div>
  ) : (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
      <span style={{ font: 'var(--type-title)', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.displayName}</span>
      <button onClick={e => { e.stopPropagation(); setNameDraft(s.displayName); setEditing(s.listId); }} title="Renommer la stratégie"
        style={{ font: '12px/1 var(--font-sans)', padding: '4px 7px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0 }}>✎</button>
    </div>
  );

  // Carte de stratégie (réutilisée par les vues Grille et Groupes).
  const cardOf = ({ s, m }) => (
    <div key={s.listId} className="dx-glass dx-lift" style={{ borderRadius: 'var(--radius-lg)', padding: 18, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 12 }}
      onClick={() => onNav('strategy-detail', { listId: s.listId })}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ font: 'var(--type-ticker)', color: 'var(--accent-hover)', marginBottom: 4 }}>{s.index || '—'}</div>
          {nameBlock(s)}
          <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', marginTop: 3 }}>
            {m.nComp} composants · {s.duration || 30}j
            {s.sizingMethod && ` · ${String(s.sizingMethod).replace(/_/g, '-')}`}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ font: '700 20px/1 var(--font-mono)', color: statusColor(m.status) }}>{m.dte}</div>
          <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', marginTop: 2 }}>DTE</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, font: 'var(--type-caption)', color: 'var(--text-muted)', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ color: statusColor(m.status) }}>● {statusLabel[m.status] || m.status}</span>
        <span>·</span>
        <span>vega {m.netVega}</span>
        <span>·</span>
        <span>prime {fmtMoney(m.netPremium)}</span>
        {s.group_name && <span style={{ font: '600 10px/1 var(--font-mono)', padding: '2px 7px', borderRadius: 'var(--radius-pill)', background: 'var(--accent-soft)', color: 'var(--accent-hover)', border: '1px solid var(--accent-border)' }}>🗂 {s.group_name}</span>}
      </div>
      {m.alert && <div style={{ font: 'var(--type-caption)', color: 'var(--warn)' }}>⚠ {m.alert}</div>}
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button onClick={e => { e.stopPropagation(); onNav('strategy-detail', { listId: s.listId }); }}
          style={{ flex: 1, font: '600 11px/1 var(--font-sans)', padding: '7px 0', borderRadius: 'var(--radius)', border: '1px solid var(--accent)', background: 'transparent', color: 'var(--accent-hover)', cursor: 'pointer' }}>Ouvrir</button>
        <button onClick={e => { e.stopPropagation(); setGroupFor(s); setNewGroupName(''); }}
          style={{ flex: 1, font: '600 11px/1 var(--font-sans)', padding: '7px 0', borderRadius: 'var(--radius)', border: '1px dashed var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
          🗂 {s.group_name ? 'Changer de groupe' : 'Ranger'}
        </button>
        <button onClick={e => { e.stopPropagation(); handleDelete(s); }}
          style={{ font: '600 11px/1 var(--font-sans)', padding: '7px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--neg)', background: 'transparent', color: 'var(--neg-bright)', cursor: 'pointer' }}>×</button>
      </div>
      {s.listName && (
        <button onClick={e => { e.stopPropagation(); onNav('list-detail', { listId: s.listId }); }}
          style={{ font: 'var(--type-caption)', color: 'var(--text-dim)', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
          liste source : {s.listName} ↗
        </button>
      )}
    </div>
  );

  const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 };
  const smallBtn = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 'var(--radius)', background: 'transparent', cursor: 'pointer', font: '600 13px/1 var(--font-sans)', flexShrink: 0 };
  const rowActions = (s) => (
    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
      <button title="Renommer" onClick={e => { e.stopPropagation(); setNameDraft(s.displayName); setEditing(s.listId); }}
        style={{ ...smallBtn, border: '1px solid var(--border)', color: 'var(--text-soft)' }}>✎</button>
      <button title={s.group_name ? 'Changer de groupe' : 'Ranger dans un groupe'} onClick={e => { e.stopPropagation(); setGroupFor(s); setNewGroupName(''); }}
        style={{ ...smallBtn, border: '1px dashed var(--border)', color: 'var(--text-muted)' }}>🗂</button>
      <button title="Supprimer" onClick={e => { e.stopPropagation(); handleDelete(s); }}
        style={{ ...smallBtn, border: '1px solid var(--neg)', color: 'var(--neg-bright)' }}>×</button>
    </div>
  );
  const viewBtn = (key, label) => (
    <button key={key} onClick={() => setView(key)}
      style={{
        font: '600 11px/1 var(--font-sans)', padding: '6px 12px', borderRadius: 'var(--radius-pill)', border: 'none', cursor: 'pointer',
        background: view === key ? 'var(--accent)' : 'transparent', color: view === key ? '#fff' : 'var(--text-muted)',
        transition: 'all var(--dur-fast) var(--ease)',
      }}>{label}</button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ font: 'var(--type-h1)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: '0 0 6px' }}>Mes stratégies</h1>
          <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)', margin: 0 }}>Vos dispersions construites : composition, échéance et grecs. Le nom se propage au Strategy Monitor et au Suivi.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
          <button onClick={() => onNav('monitor')} style={{ font: '600 12px/1 var(--font-sans)', padding: '8px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>Strategy Monitor →</button>
          <button onClick={() => onNav('builder')} style={{ font: '600 12px/1 var(--font-sans)', padding: '8px 16px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}>+ Nouvelle stratégie</button>
        </div>
      </div>

      {/* Sélecteur de vues (Grille / Groupes / Chronologique) */}
      {rows.length > 0 && (
        <div style={{ display: 'flex', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-pill)', padding: 3, alignSelf: 'flex-start' }}>
          {viewBtn('grid', '▦ Grille')}
          {viewBtn('groups', '🗂 Groupes')}
          {viewBtn('chrono', '↕ Chronologique')}
        </div>
      )}

      {/* Contenu principal — bascule selon la vue */}
      {rows.length === 0 ? (
        /* EmptyState rend `action` (pas les enfants) et `icon` comme NŒUD, pas comme nom d'icône. */
        <EmptyState icon="🧱" title="Aucune stratégie construite"
          description="Construisez une dispersion depuis le Strategy Builder : elle apparaîtra ici, renommable et rangeable en groupes."
          action={<button onClick={() => onNav('builder')} style={{ font: '600 12px/1 var(--font-sans)', padding: '9px 20px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}>Ouvrir le Strategy Builder</button>} />
      ) : view === 'grid' ? (
        /* ── Vue Grille (par défaut) ── */
        <div style={gridStyle}>{rows.map(cardOf)}</div>
      ) : view === 'groups' ? (
        /* ── Vue Groupes : sections repliables + « Sans groupe » en dernier ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {[...groupNames, ' ungrouped'].map(g => {
            const isUngrouped = g === ' ungrouped';
            const inGroup = rows.filter(r => isUngrouped ? !r.s.group_name : r.s.group_name === g);
            if (!inGroup.length) return null;
            const label = isUngrouped ? 'Sans groupe' : g;
            const isCol = !!collapsed[label];
            return (
              <section key={label} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <button onClick={() => setCollapsed(c => ({ ...c, [label]: !c[label] }))}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
                  <span style={{ font: '10px/1 var(--font-mono)', color: 'var(--text-dim)', transform: isCol ? 'rotate(-90deg)' : 'none', transition: 'transform var(--dur-fast) var(--ease)' }}>▼</span>
                  <span style={{ font: 'var(--type-h3)', letterSpacing: 'var(--track-snug)', color: isUngrouped ? 'var(--text-muted)' : 'var(--text)' }}>
                    {isUngrouped ? label : `🗂 ${label}`}
                  </span>
                  <span style={{ font: '600 11px/1 var(--font-mono)', padding: '2px 8px', borderRadius: 'var(--radius-pill)', background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>{inGroup.length}</span>
                </button>
                {!isCol && <div style={gridStyle}>{inGroup.map(cardOf)}</div>}
              </section>
            );
          })}
        </div>
      ) : (
        /* ── Vue Chronologique : frise verticale par date de CONSTRUCTION (builtAt) ── */
        (() => {
          const sorted = [...rows].sort((a, b) => String(b.s.builtAt || '').localeCompare(String(a.s.builtAt || '')));
          let lastMonth = null, lastDay = null;
          return (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {sorted.map(({ s, m }, i) => {
                const ym = String(s.builtAt || '').slice(0, 7);
                const ymd = String(s.builtAt || '').slice(0, 10);
                const showMonth = ym && ym !== lastMonth;
                if (showMonth) lastMonth = ym;
                const showDay = ymd && ymd !== lastDay;
                if (showDay) lastDay = ymd;
                return (
                  <React.Fragment key={s.listId}>
                    {showMonth && (
                      <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', margin: (i === 0 ? '0' : '22px') + ' 0 4px', paddingLeft: 2 }}>
                        {monthLabel(ym)}
                      </div>
                    )}
                    {showDay && (
                      <div style={{ font: '700 18px/1.3 var(--font-sans)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: (showMonth ? '6px' : '16px') + ' 0 10px', paddingBottom: 8, borderBottom: '1px solid var(--border-subtle)' }}>
                        {dayLabel(ymd)}
                      </div>
                    )}
                    <div onClick={() => onNav('strategy-detail', { listId: s.listId })}
                      style={{ display: 'flex', gap: 14, cursor: 'pointer' }}
                      onMouseEnter={e => { e.currentTarget.querySelector('[data-row]').style.background = 'var(--bg-hover)'; }}
                      onMouseLeave={e => { e.currentTarget.querySelector('[data-row]').style.background = 'var(--bg-card)'; }}>
                      {/* Colonne frise : puce + trait */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 14, flexShrink: 0 }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', marginTop: 16, background: statusColor(m.status), border: '2px solid var(--bg-base)', boxShadow: '0 0 0 2px var(--border)' }} />
                        <span style={{ flex: 1, width: 2, background: 'var(--border-subtle)', marginTop: 2 }} />
                      </div>
                      {/* Contenu */}
                      <div data-row style={{ flex: 1, marginBottom: 8, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, transition: 'background var(--dur-fast) var(--ease)' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            {nameBlock(s)}
                            {s.group_name && <span style={{ font: '600 9px/1 var(--font-mono)', padding: '2px 6px', borderRadius: 'var(--radius-pill)', background: 'var(--accent-soft)', color: 'var(--accent-hover)', border: '1px solid var(--accent-border)' }}>🗂 {s.group_name}</span>}
                          </div>
                          <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', marginTop: 3 }}>{s.index || '—'} · {m.nComp} composants · {s.duration || 30}j</div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ font: '700 17px/1 var(--font-mono)', color: statusColor(m.status) }}>{m.dte}</div>
                          <div style={{ font: 'var(--type-caption)', color: 'var(--text-dim)', marginTop: 2 }}>DTE</div>
                        </div>
                        {rowActions(s)}
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          );
        })()
      )}

      {/* Modale : ranger une stratégie dans un groupe (existant ou nouveau) */}
      {groupFor && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) { setGroupFor(null); setNewGroupName(''); } }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-lg)', padding: 26, width: '100%', maxWidth: 440, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ font: 'var(--type-h3)', color: 'var(--text)' }}>Ranger dans un groupe</div>
              <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', marginTop: 4 }}>« {groupFor.displayName} »{groupFor.group_name ? ` · actuellement dans « ${groupFor.group_name} »` : ''}</div>
            </div>
            {groupNames.length > 0 && (
              <div>
                <label style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>Groupes existants</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {groupNames.map(g => {
                    const cur = g === groupFor.group_name;
                    return (
                      <button key={g} onClick={() => assignGroup(groupFor, g)}
                        style={{ font: '600 12px/1 var(--font-sans)', padding: '8px 12px', borderRadius: 'var(--radius-pill)', cursor: 'pointer',
                          background: cur ? 'var(--accent)' : 'var(--bg-elevated)', color: cur ? '#fff' : 'var(--text-soft)',
                          border: `1px solid ${cur ? 'var(--accent)' : 'var(--border)'}` }}>🗂 {g}</button>
                    );
                  })}
                </div>
              </div>
            )}
            <div>
              <label style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Nouveau groupe</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="Ex : Court terme, Tech, Test…" maxLength={40}
                  onKeyDown={e => { if (e.key === 'Enter' && newGroupName.trim()) assignGroup(groupFor, newGroupName.trim()); }}
                  style={{ flex: 1, background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text)', font: 'var(--type-body)', padding: '9px 12px', outline: 'none', boxSizing: 'border-box' }} />
                <button onClick={() => newGroupName.trim() && assignGroup(groupFor, newGroupName.trim())} disabled={!newGroupName.trim()}
                  style={{ font: '600 12px/1 var(--font-sans)', padding: '8px 16px', borderRadius: 'var(--radius)', border: 'none', background: newGroupName.trim() ? 'var(--accent)' : 'var(--bg-elevated)', color: newGroupName.trim() ? '#fff' : 'var(--text-dim)', cursor: newGroupName.trim() ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap' }}>Créer & ranger</button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
              {groupFor.group_name
                ? <button onClick={() => assignGroup(groupFor, null)} style={{ font: '600 12px/1 var(--font-sans)', padding: '8px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>Retirer du groupe</button>
                : <span />}
              <button onClick={() => { setGroupFor(null); setNewGroupName(''); }} style={{ font: '600 12px/1 var(--font-sans)', padding: '8px 16px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>Fermer</button>
            </div>
          </div>
        </div>
      )}

      <window.ConfirmDialog open={!!dialog} title={dialog?.title} message={dialog?.message} confirmLabel={dialog?.confirmLabel} tone={dialog?.tone} busy={dialogBusy}
        onCancel={() => !dialogBusy && setDialog(null)} onConfirm={runDialog} />
    </div>
  );
}

window.Strategies = Strategies;
