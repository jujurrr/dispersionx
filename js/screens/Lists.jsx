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

  const load = React.useCallback(() => {
    DXApi.getLists().then(data => {
      setLists(data);
      setLoading(false);
      onListsChange && onListsChange(data);
    }).catch(() => setLoading(false));
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

  async function handleDelete(list) {
    if (!confirm(`Supprimer « ${list.name} » ? Cette action est irréversible.`)) return;
    try {
      await DXApi.deleteList(list.id);
      addToast && addToast(`Liste « ${list.name} » supprimée.`);
      load();
    } catch { addToast && addToast('Erreur lors de la suppression.', 'error'); }
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
    } catch { addToast && addToast('Erreur lors de l\'import.', 'error'); }
    e.target.value = '';
  }

  const scoreColor = (s) => s >= 70 ? 'var(--pos-bright)' : s >= 50 ? 'var(--warn)' : 'var(--neg-bright)';

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

      {/* Lists grid */}
      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', font: 'var(--type-body)' }}>Chargement…</div>
      ) : lists.length === 0 ? (
        <EmptyState icon="lists" title="Aucune liste" description="Créez votre première liste pour commencer à construire une stratégie de dispersion.">
          <button onClick={() => setShowCreate(true)} style={{ font: '600 12px/1 var(--font-sans)', padding: '9px 20px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', marginTop: 12 }}>Créer une liste</button>
        </EmptyState>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {lists.map(list => (
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
              <div style={{ display: 'flex', gap: 10, font: 'var(--type-caption)', color: 'var(--text-muted)' }}>
                <span>{list.n_items} actions</span>
                <span>·</span>
                <span>{list.created_at}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button onClick={e => { e.stopPropagation(); onNav('list-detail', { listId: list.id }); }}
                  style={{ flex: 1, font: '600 11px/1 var(--font-sans)', padding: '7px 0', borderRadius: 'var(--radius)', border: '1px solid var(--accent)', background: 'transparent', color: 'var(--accent-hover)', cursor: 'pointer' }}>Ouvrir</button>
                <button onClick={e => handleExport(list, e)}
                  style={{ font: '600 11px/1 var(--font-sans)', padding: '7px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>↓</button>
                <button onClick={e => { e.stopPropagation(); handleDelete(list); }}
                  style={{ font: '600 11px/1 var(--font-sans)', padding: '7px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--neg)', background: 'transparent', color: 'var(--neg-bright)', cursor: 'pointer' }}>×</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

window.Lists = Lists;
