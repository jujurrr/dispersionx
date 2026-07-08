/* ─── Lists: CRUD + import/export ────────────────────────────── */
function Lists({ onNav, onListsChange, addToast }) {
  const { EmptyState, Button } = window.DispersionXDesignSystem_cb86be;
  const [lists, setLists] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [showCreate, setShowCreate] = React.useState(false);
  const [newName, setNewName] = React.useState('');
  const [newIndex, setNewIndex] = React.useState('SPX');
  const [newDesc, setNewDesc] = React.useState('');
  const [creating, setCreating] = React.useState(false);
  const importRef = React.useRef();
  // Partage (tranche 3) — cloud + Pro uniquement. Modale = window.ShareDialog.
  const cloudOn = !!(window.DXCloud && window.DXCloud.enabled);
  const isProUser = !!(window.DXCloud && window.DXCloud.pro);   // partage réservé à Pro
  const [shared, setShared] = React.useState([]);          // listes partagées AVEC moi
  const [shareFor, setShareFor] = React.useState(null);    // liste en cours de partage (modal)
  // Confirmation in-app générique (ConfirmDialog).
  const [dialog, setDialog] = React.useState(null);
  const [dialogBusy, setDialogBusy] = React.useState(false);
  async function runDialog() {
    if (!dialog?.onConfirm) return;
    setDialogBusy(true);
    try { await dialog.onConfirm(); } finally { setDialogBusy(false); setDialog(null); }
  }

  const load = React.useCallback(() => {
    DXApi.getLists().then(data => {
      setLists(data);
      setLoading(false);
      onListsChange && onListsChange(data);
    }).catch(() => setLoading(false));
    DXApi.getSharedLists().then(setShared).catch(() => setShared([]));
  }, []);

  React.useEffect(() => { load(); }, []);

  // Listen for new-list events from score modal
  React.useEffect(() => {
    const h = (e) => { setNewIndex(e.detail?.indexSymbol || 'SPX'); setShowCreate(true); };
    window.addEventListener('dx-new-list', h);
    return () => window.removeEventListener('dx-new-list', h);
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await DXApi.createList(newName.trim(), newIndex, newDesc.trim());
      addToast && addToast(`Liste « ${newName} » créée.`);
      setShowCreate(false); setNewName(''); setNewDesc('');
      load();
    } catch { addToast && addToast('Erreur lors de la création.', 'error'); }
    finally { setCreating(false); }
  }

  function handleDelete(list) {
    setDialog({
      title: 'Supprimer la liste ?',
      message: <>Voulez-vous vraiment supprimer « <strong style={{ color: 'var(--text)' }}>{list.name}</strong> » ? Cette action est irréversible.</>,
      confirmLabel: 'Supprimer',
      onConfirm: async () => {
        try { await DXApi.deleteList(list.id); addToast && addToast(`Liste « ${list.name} » supprimée.`); load(); }
        catch { addToast && addToast('Erreur lors de la suppression.', 'error'); }
      },
    });
  }

  async function handleExport(list, e) {
    e.stopPropagation();
    const blob = await DXApi.exportList(list.id);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `dispersion_${list.name.replace(/\s+/g, '_')}.json`;
    a.click(); URL.revokeObjectURL(url);
    addToast && addToast('Export téléchargé.');
  }

  async function handleExportAll() {
    const blob = await DXApi.exportAllLists();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `dispersion_listes_${new Date().toISOString().slice(0,10)}.json`;
    a.click(); URL.revokeObjectURL(url);
    addToast && addToast('Bundle exporté.');
  }

  async function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const res = await DXApi.importLists(file);
      addToast && addToast(`${res.message || res.imported + ' liste(s) importée(s)'}.`);
      load();
    } catch (err) { addToast && addToast('Erreur lors de l\'import : ' + (err?.message || 'inconnue'), 'error'); }
    e.target.value = '';
  }

  // ── Partage ── (modale réutilisable window.ShareDialog)
  function openShare(list, e) { e && e.stopPropagation(); setShareFor(list); }

  const scoreColor = (s) => s >= 70 ? 'var(--pos-bright)' : s >= 50 ? 'var(--warn)' : 'var(--neg-bright)';

  // ── Vue (grille / groupes / chronologique) — préférence mémorisée. ──
  const [view, setView] = React.useState(() => { try { return localStorage.getItem('dx-lists-view') || 'grid'; } catch { return 'grid'; } });
  React.useEffect(() => { try { localStorage.setItem('dx-lists-view', view); } catch {} }, [view]);
  const [groupFor, setGroupFor] = React.useState(null);      // liste en cours d'affectation à un groupe
  const [newGroupName, setNewGroupName] = React.useState(''); // saisie « nouveau groupe » dans la modale
  const [collapsed, setCollapsed] = React.useState({});       // { [groupe]: bool } — sections repliées

  // Les groupes (synchronisés cloud) nécessitent un compte connecté. En mode
  // invité on grise l'action et on invite à se connecter / créer un compte.
  const guest = !cloudOn;
  function needAccount() {
    if (!guest) return false;
    addToast && addToast('Connectez-vous ou créez un compte (gratuit) pour organiser vos listes en groupes.', 'info');
    return true;
  }

  // Groupes existants (étiquettes distinctes présentes sur les listes), triés.
  const groupNames = React.useMemo(() => {
    const s = new Set();
    lists.forEach(l => { if (l.group_name) s.add(l.group_name); });
    return Array.from(s).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [lists]);

  // Affecte une liste à un groupe (ou null). Erreur cloud → invite à la migration.
  async function assignGroup(list, name) {
    try {
      await DXApi.setListGroup(list.id, name || null);
      setGroupFor(null); setNewGroupName('');
      addToast && addToast(name ? `« ${list.name} » déplacée dans « ${name} ».` : `« ${list.name} » retirée de son groupe.`);
      load();
    } catch (e) {
      addToast && addToast('Groupes indisponibles — applique la migration Supabase (§16 du guide). ' + (e?.message || ''), 'error');
    }
  }

  // Format mois (« juillet 2026 ») à partir d'un ISO YYYY-MM(-DD).
  const monthLabel = (ym) => {
    const d = new Date(ym + '-01T00:00:00');
    if (isNaN(d)) return ym;
    return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  };
  // Format jour, grande date sur une ligne (« Lundi 8 juillet ») à partir d'un ISO YYYY-MM-DD.
  const dayLabel = (ymd) => {
    const d = new Date(ymd + 'T00:00:00');
    if (isNaN(d)) return ymd;
    const s = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  // Carte de liste (réutilisée par les vues Grille et Groupes).
  const cardOf = (list) => (
    <div key={list.id} className="dx-glass dx-lift" style={{ borderRadius: 'var(--radius-lg)', padding: 18, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 12 }}
      onClick={() => onNav('list-detail', { listId: list.id })}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ font: 'var(--type-ticker)', color: 'var(--accent-hover)', marginBottom: 4 }}>{list.index_symbol}</div>
          <div style={{ font: 'var(--type-title)', color: 'var(--text)' }}>{list.name}</div>
          {list.description && <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', marginTop: 3 }}>{list.description}</div>}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ font: '700 20px/1 var(--font-mono)', color: scoreColor(list.avg_score) }}>{list.avg_score}</div>
          <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', marginTop: 2 }}>score moy.</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, font: 'var(--type-caption)', color: 'var(--text-muted)', alignItems: 'center', flexWrap: 'wrap' }}>
        <span>{list.n_items} actions</span>
        <span>·</span>
        <span>{list.created_at}</span>
        {list.group_name && <span style={{ font: '600 10px/1 var(--font-mono)', padding: '2px 7px', borderRadius: 'var(--radius-pill)', background: 'var(--accent-soft)', color: 'var(--accent-hover)', border: '1px solid var(--accent-border)' }}>🗂 {list.group_name}</span>}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button onClick={e => { e.stopPropagation(); onNav('list-detail', { listId: list.id }); }}
          style={{ flex: 1, font: '600 11px/1 var(--font-sans)', padding: '7px 0', borderRadius: 'var(--radius)', border: '1px solid var(--accent)', background: 'transparent', color: 'var(--accent-hover)', cursor: 'pointer' }}>Ouvrir</button>
        <button onClick={e => handleExport(list, e)}
          style={{ font: '600 11px/1 var(--font-sans)', padding: '7px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>↓</button>
        <button onClick={e => { e.stopPropagation(); handleDelete(list); }}
          style={{ font: '600 11px/1 var(--font-sans)', padding: '7px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--neg)', background: 'transparent', color: 'var(--neg-bright)', cursor: 'pointer' }}>×</button>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={e => { e.stopPropagation(); if (needAccount()) { onNav('login'); return; } setGroupFor(list); setNewGroupName(''); }}
          title={guest ? 'Réservé aux comptes connectés' : undefined}
          style={{ flex: 1, font: '600 11px/1 var(--font-sans)', padding: '7px 0', borderRadius: 'var(--radius)', border: '1px dashed var(--border)', background: 'transparent', color: guest ? 'var(--text-dim)' : 'var(--text-muted)', cursor: 'pointer', opacity: guest ? 0.6 : 1 }}>
          {guest ? '🔒 Groupes — compte requis' : `🗂 ${list.group_name ? 'Changer de groupe' : 'Ranger dans un groupe'}`}
        </button>
        {cloudOn && (isProUser ? (
          <button onClick={e => openShare(list, e)}
            style={{ flex: 1, font: '600 11px/1 var(--font-sans)', padding: '7px 0', borderRadius: 'var(--radius)', border: '1px dashed var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>⤳ Partager</button>
        ) : (
          <button onClick={e => { e.stopPropagation(); onNav('pricing'); }} title="Partage réservé à l'offre Pro"
            style={{ flex: 1, font: '600 11px/1 var(--font-sans)', padding: '7px 0', borderRadius: 'var(--radius)', border: '1px dashed var(--border)', background: 'transparent', color: 'var(--text-dim)', opacity: 0.7, cursor: 'pointer' }}>🔒 Partager · Pro</button>
        ))}
      </div>
    </div>
  );

  const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 };

  // Actions compactes d'une liste (ranger, télécharger, partager, supprimer) —
  // réutilisées dans la vue Chronologique. stopPropagation pour ne pas ouvrir la liste.
  const smallBtn = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 'var(--radius)', background: 'transparent', cursor: 'pointer', font: '600 13px/1 var(--font-sans)', flexShrink: 0 };
  const rowActions = (list) => (
    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
      <button title={guest ? 'Groupes — compte requis' : (list.group_name ? 'Changer de groupe' : 'Ranger dans un groupe')}
        onClick={e => { e.stopPropagation(); if (needAccount()) { onNav('login'); return; } setGroupFor(list); setNewGroupName(''); }}
        style={{ ...smallBtn, border: '1px dashed var(--border)', color: guest ? 'var(--text-dim)' : 'var(--text-muted)', opacity: guest ? 0.6 : 1 }}>{guest ? '🔒' : '🗂'}</button>
      <button title="Télécharger (JSON)" onClick={e => handleExport(list, e)}
        style={{ ...smallBtn, border: '1px solid var(--border)', color: 'var(--text-soft)' }}>↓</button>
      {cloudOn && (isProUser ? (
        <button title="Partager" onClick={e => openShare(list, e)}
          style={{ ...smallBtn, border: '1px dashed var(--border)', color: 'var(--text-muted)' }}>⤳</button>
      ) : (
        <button title="Partage réservé à l'offre Pro" onClick={e => { e.stopPropagation(); onNav('pricing'); }}
          style={{ ...smallBtn, border: '1px dashed var(--border)', color: 'var(--text-dim)', opacity: 0.7 }}>🔒</button>
      ))}
      <button title="Supprimer" onClick={e => { e.stopPropagation(); handleDelete(list); }}
        style={{ ...smallBtn, border: '1px solid var(--neg)', color: 'var(--neg-bright)' }}>×</button>
    </div>
  );
  // `locked` → bouton grisé qui invite à se connecter au lieu de changer de vue.
  const viewBtn = (key, label, locked) => (
    <button key={key} onClick={() => { if (locked) { needAccount(); return; } setView(key); }}
      title={locked ? 'Réservé aux comptes connectés' : undefined}
      style={{
        font: '600 11px/1 var(--font-sans)', padding: '6px 12px', borderRadius: 'var(--radius-pill)', border: 'none', cursor: 'pointer',
        background: view === key && !locked ? 'var(--accent)' : 'transparent', color: view === key && !locked ? '#fff' : 'var(--text-muted)',
        opacity: locked ? 0.5 : 1, transition: 'all var(--dur-fast) var(--ease)',
      }}>{locked ? '🔒 ' + label : label}</button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ font: 'var(--type-h1)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: '0 0 6px' }}>Mes listes</h1>
          <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)', margin: 0 }}>Paniers d'actions nommés pour construire et suivre vos stratégies.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
          <input ref={importRef} type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
          <button onClick={() => importRef.current.click()} style={{ font: '600 12px/1 var(--font-sans)', padding: '8px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>↑ Importer</button>
          <button onClick={handleExportAll} style={{ font: '600 12px/1 var(--font-sans)', padding: '8px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>↓ Tout exporter</button>
          <button onClick={() => setShowCreate(true)} style={{ font: '600 12px/1 var(--font-sans)', padding: '8px 16px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}>+ Nouvelle liste</button>
        </div>
      </div>

      {/* Sélecteur de vues (Grille / Groupes / Chronologique) */}
      {!loading && lists.length > 0 && (
        <div style={{ display: 'flex', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-pill)', padding: 3, alignSelf: 'flex-start' }}>
          {viewBtn('grid', '▦ Grille')}
          {viewBtn('groups', '🗂 Groupes', guest)}
          {viewBtn('chrono', '↕ Chronologique')}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) setShowCreate(false); }}>
          <form onSubmit={handleCreate} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-lg)', padding: 28, width: '100%', maxWidth: 440, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ font: 'var(--type-h3)', color: 'var(--text)', marginBottom: 4 }}>Nouvelle liste</div>
            {[
              { label: 'Nom', type: 'text', val: newName, set: setNewName, placeholder: 'Ex : Tech SPX Core', required: true },
              { label: 'Description', type: 'text', val: newDesc, set: setNewDesc, placeholder: 'Optionnel' },
            ].map(f => (
              <div key={f.label}>
                <label style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>{f.label}</label>
                <input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.placeholder} required={f.required} style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text)', font: 'var(--type-body)', padding: '9px 12px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            ))}
            <div>
              <label style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Indice</label>
              <select value={newIndex} onChange={e => setNewIndex(e.target.value)} style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text)', font: 'var(--type-body)', padding: '9px 12px', outline: 'none', boxSizing: 'border-box' }}>
                {['SPX', 'NDX', 'DJI', 'CAC', 'DAX'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
              <button type="button" onClick={() => setShowCreate(false)} style={{ font: '600 12px/1 var(--font-sans)', padding: '8px 16px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>Annuler</button>
              <button type="submit" disabled={creating} style={{ font: '600 12px/1 var(--font-sans)', padding: '8px 20px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}>{creating ? '…' : 'Créer'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Share modal (réutilisable) */}
      {shareFor && window.ShareDialog && (
        <window.ShareDialog list={shareFor} kind="list" onClose={() => setShareFor(null)} addToast={addToast} />
      )}

      {/* Partagées avec moi */}
      {shared.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 style={{ font: 'var(--type-h2)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: 0 }}>
            Partagées avec moi <span style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', fontWeight: 400 }}>({shared.length})</span>
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
            {shared.map(list => (
              <div key={list.id} className="dx-glass dx-lift" style={{ borderRadius: 'var(--radius-lg)', padding: 18, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 10, borderLeft: '3px solid var(--info)' }}
                onClick={() => onNav('list-detail', { listId: list.id })}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ font: 'var(--type-ticker)', color: 'var(--accent-hover)', marginBottom: 4 }}>{list.index_symbol}</div>
                    <div style={{ font: 'var(--type-title)', color: 'var(--text)' }}>{list.name}</div>
                    <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', marginTop: 3 }}>partagée par {list.owner_email || 'un utilisateur'}</div>
                  </div>
                  <span style={{ font: '500 10px/1 var(--font-mono)', padding: '3px 8px', borderRadius: 'var(--radius-pill)', background: 'var(--bg-elevated)', color: 'var(--info)', border: '1px solid var(--border)', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                    {list.role === 'editor' ? 'Modif.' : 'Lecture'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 10, font: 'var(--type-caption)', color: 'var(--text-muted)' }}>
                  <span>{list.n_items} actions</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Contenu principal — bascule selon la vue */}
      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', font: 'var(--type-body)' }}>Chargement…</div>
      ) : lists.length === 0 ? (
        <EmptyState icon="lists" title="Aucune liste" description="Créez votre première liste pour commencer à construire une stratégie de dispersion.">
          <button onClick={() => setShowCreate(true)} style={{ font: '600 12px/1 var(--font-sans)', padding: '9px 20px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', marginTop: 12 }}>Créer une liste</button>
        </EmptyState>
      ) : view === 'grid' ? (
        /* ── Vue Grille (par défaut) ── */
        <div style={gridStyle}>{lists.map(cardOf)}</div>
      ) : view === 'groups' && guest ? (
        /* ── Vue Groupes en mode invité : informer + inviter à se connecter ── */
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '40px 28px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ font: '30px/1' }}>🔒</div>
          <div style={{ font: 'var(--type-h3)', color: 'var(--text)' }}>Les groupes nécessitent un compte</div>
          <div style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', maxWidth: 420 }}>
            Connectez-vous ou créez un compte (gratuit) pour organiser vos listes en groupes, synchronisés sur tous vos appareils.
          </div>
          <button onClick={() => onNav('login')} style={{ font: '600 12px/1 var(--font-sans)', padding: '10px 20px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', marginTop: 6 }}>Se connecter / créer un compte</button>
        </div>
      ) : view === 'groups' ? (
        /* ── Vue Groupes : sections repliables + « Sans groupe » en dernier ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {[...groupNames, ' ungrouped'].map(g => {
            const isUngrouped = g === ' ungrouped';
            const inGroup = lists.filter(l => isUngrouped ? !l.group_name : l.group_name === g);
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
        /* ── Vue Chronologique : frise verticale, récentes en haut, séparateurs de mois PUIS de jour ── */
        (() => {
          const sorted = [...lists].sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
          let lastMonth = null, lastDay = null;
          return (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {sorted.map((list, i) => {
                const ym = String(list.created_at || '').slice(0, 7);
                const ymd = String(list.created_at || '').slice(0, 10);
                const showMonth = ym && ym !== lastMonth;
                if (showMonth) lastMonth = ym;
                const showDay = ymd && ymd !== lastDay;
                if (showDay) lastDay = ymd;
                return (
                  <React.Fragment key={list.id}>
                    {showMonth && (
                      <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', margin: (i === 0 ? '0' : '22px') + ' 0 4px', paddingLeft: 2 }}>
                        {monthLabel(ym)}
                      </div>
                    )}
                    {showDay && (
                      /* Séparateur de JOUR : grande date sur une seule ligne */
                      <div style={{ font: '700 18px/1.3 var(--font-sans)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: (showMonth ? '6px' : '16px') + ' 0 10px', paddingBottom: 8, borderBottom: '1px solid var(--border-subtle)' }}>
                        {dayLabel(ymd)}
                      </div>
                    )}
                    <div onClick={() => onNav('list-detail', { listId: list.id })}
                      style={{ display: 'flex', gap: 14, cursor: 'pointer' }}
                      onMouseEnter={e => { e.currentTarget.querySelector('[data-row]').style.background = 'var(--bg-hover)'; }}
                      onMouseLeave={e => { e.currentTarget.querySelector('[data-row]').style.background = 'var(--bg-card)'; }}>
                      {/* Colonne frise : puce + trait */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 14, flexShrink: 0 }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', marginTop: 16, background: scoreColor(list.avg_score), border: '2px solid var(--bg-base)', boxShadow: '0 0 0 2px var(--border)' }} />
                        <span style={{ flex: 1, width: 2, background: 'var(--border-subtle)', marginTop: 2 }} />
                      </div>
                      {/* Contenu */}
                      <div data-row style={{ flex: 1, marginBottom: 8, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, transition: 'background var(--dur-fast) var(--ease)' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ font: 'var(--type-title)', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            {list.name}
                            {list.group_name && <span style={{ font: '600 9px/1 var(--font-mono)', padding: '2px 6px', borderRadius: 'var(--radius-pill)', background: 'var(--accent-soft)', color: 'var(--accent-hover)', border: '1px solid var(--accent-border)' }}>🗂 {list.group_name}</span>}
                          </div>
                          <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', marginTop: 3 }}>{list.index_symbol} · {list.n_items} actions</div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ font: '700 17px/1 var(--font-mono)', color: scoreColor(list.avg_score) }}>{list.avg_score}</div>
                          <div style={{ font: 'var(--type-caption)', color: 'var(--text-dim)', marginTop: 2 }}>score</div>
                        </div>
                        {rowActions(list)}
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          );
        })()
      )}

      {/* Modale : ranger une liste dans un groupe (existant ou nouveau) */}
      {groupFor && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) { setGroupFor(null); setNewGroupName(''); } }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-lg)', padding: 26, width: '100%', maxWidth: 440, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ font: 'var(--type-h3)', color: 'var(--text)' }}>Ranger dans un groupe</div>
              <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', marginTop: 4 }}>« {groupFor.name} »{groupFor.group_name ? ` · actuellement dans « ${groupFor.group_name} »` : ''}</div>
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
                <input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="Ex : Tech, Value, Long terme…" maxLength={40}
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

window.Lists = Lists;
