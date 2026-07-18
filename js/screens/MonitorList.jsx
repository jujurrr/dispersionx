/* ─── Suivi des positions : hub GLOBAL des positions committées (module Pro) ──
   Onglet Pro « Suivi » : rassemble TOUTES les positions suivies (toutes listes
   confondues), plus de vue par liste. On y suit en temps réel l'avancée d'une
   position (grecs au DTE restant, snapshots) depuis PositionDetail.
   Création d'une position : Construction/Builder → Risk Lab → Checklist.

   Rangement (comme « Mes listes ») : Grille (défaut) / Groupes / Chronologique.
   Le groupe est porté par la position : synchronisé cloud via la colonne
   positions.group_name (SUPABASE_SETUP.md §16b), ou en local pour les positions
   hors-ligne. Affectation : DXApi.setPositionGroup. */
function MonitorList({ onNav, addToast, mode, pro, lists }) {
  const { Badge } = window.DispersionXDesignSystem_cb86be;
  const t = window.t || ((s) => s);   // pancarte d'accueil traduite (le reste du module reste en FR)
  const [positions, setPositions] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!pro) { setLoading(false); return; }
    let cancelled = false;
    // Toutes les positions (aucun list_id) — serveur, cloud ou store local.
    const load = () => DXApi.getPositions().catch(() => null).then(posData => {
      if (!cancelled) { setPositions(posData?.positions || posData || []); setLoading(false); }
    });
    load();
    // Rechargement au changement de compte (connexion/déconnexion → cloud scopé)
    // et à toute purge/maj du cache local des positions.
    const onChange = () => load();
    window.addEventListener('dx-auth-change', onChange);
    window.addEventListener('dx-positions-changed', onChange);
    return () => { cancelled = true; window.removeEventListener('dx-auth-change', onChange); window.removeEventListener('dx-positions-changed', onChange); };
  }, [pro]);

  // ── Vue (grille / groupes / chronologique) — préférence mémorisée. ──
  const [view, setView] = React.useState(() => { try { return localStorage.getItem('dx-monitor-view') || 'grid'; } catch { return 'grid'; } });
  React.useEffect(() => { try { localStorage.setItem('dx-monitor-view', view); } catch {} }, [view]);
  const [collapsed, setCollapsed] = React.useState({});        // { [groupe]: bool } — sections repliées
  const [groupFor, setGroupFor] = React.useState(null);        // position en cours d'affectation à un groupe
  const [newGroupName, setNewGroupName] = React.useState('');  // saisie « nouveau groupe » dans la modale

  // group_name est porté par la position (cloud : colonne positions.group_name ;
  // local : champ sur l'objet dx-positions). Rien à décorer côté écran.
  const decorated = positions;

  // Groupes existants (étiquettes distinctes présentes sur les positions), triés.
  const groupNames = React.useMemo(() => {
    const s = new Set();
    decorated.forEach(p => { if (p.group_name) s.add(p.group_name); });
    return Array.from(s).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [decorated]);

  // Affecte une position à un groupe (ou null) — synchronisé cloud (ou local pour
  // les positions hors-ligne « loc-… »). Mise à jour optimiste de l'état.
  async function assignGroup(pos, name) {
    const g = (name || '').trim() || null;
    try {
      await DXApi.setPositionGroup(pos.id, g);
      setPositions(ps => ps.map(p => String(p.id) === String(pos.id) ? { ...p, group_name: g } : p));
      setGroupFor(null); setNewGroupName('');
      addToast && addToast(g ? `« ${pos.name} » rangée dans « ${g} ».` : `« ${pos.name} » retirée de son groupe.`);
    } catch (e) {
      addToast && addToast('Groupes indisponibles — applique la migration Supabase (§16b du guide). ' + (e?.message || ''), 'error');
    }
  }
  const openGroup = (pos) => { setGroupFor(pos); setNewGroupName(''); };

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

  const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 };
  const cardOf = (p) => <PositionCard key={p.id} pos={p} onNav={onNav} lists={lists} onGroup={openGroup} />;
  // Sélecteur de vues — même composant que « Mes listes ».
  const viewBtn = (key, label) => (
    <button key={key} onClick={() => setView(key)}
      style={{
        font: '600 11px/1 var(--font-sans)', padding: '6px 12px', borderRadius: 'var(--radius-pill)', border: 'none', cursor: 'pointer',
        background: view === key ? 'var(--accent)' : 'transparent', color: view === key ? '#fff' : 'var(--text-muted)',
        transition: 'all var(--dur-fast) var(--ease)',
      }}>{label}</button>
  );

  // ── Écran verrouillé (non Pro) : soft-paywall (aperçu flouté + carte) ──
  if (!pro) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <h1 style={{ font: 'var(--type-h1)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: 0 }}>Suivi des positions</h1>
            <Badge tone="accent" size="sm">Pro</Badge>
          </div>
          <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)', margin: 0, maxWidth: 640 }}>
            Suivez l'avancée de vos positions en temps réel — voici un aperçu de ce que Pro débloque.
          </p>
        </div>
        <window.ProLockedPreview context="positions" onNav={onNav} addToast={addToast}>
          {window.ProDemoSuivi()}
        </window.ProLockedPreview>
      </div>
    );
  }

  if (loading) return (
    window.DXLoader ? (
      <window.DXLoader title="Chargement des positions" steps={[
        'Récupération de vos positions suivies…',
        'Grecs recalculés au DTE restant…',
        'Dernier P&L mark-to-market connu…',
      ]} />
    ) : (
      <div style={{ padding: 80, textAlign: 'center', color: 'var(--text-muted)', font: 'var(--type-body)' }}>Chargement des positions…</div>
    )
  );

  const open = decorated.filter(p => p.status === 'open' || p.status === 'sain' || p.status === 'surveiller');
  const closed = decorated.filter(p => p.status === 'closed' || p.status === 'ferme');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {window.DXGuide && (
        <window.DXGuide
          id="monitor"
          title={t('Le Suivi de tes positions')}
          intro={t('Toutes les stratégies que tu as engagées, réunies au même endroit pour suivre leur évolution dans le temps.')}
          steps={[
            [t('Tes positions committées arrivent ici'), t('Une stratégie engagée (Construction → Risk Lab → Checklist) apparaît automatiquement dans le Suivi, toutes listes confondues.')],
            [t('Trois façons de les ranger'), t('Bascule entre Grille, Groupes et Chronologique selon ce que tu veux voir.')],
            [t('Crée tes propres groupes'), t('Range chaque position dans un groupe personnalisé — synchronisé sur tous tes appareils.')],
            [t('Suis grecs et P&L dans le temps'), t('Ouvre une position pour voir ses grecs au DTE restant, ses snapshots et son P&L théorique.')],
          ]}
        />
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <h1 style={{ font: 'var(--type-h1)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: 0 }}>Suivi des positions</h1>
            <Badge tone="accent" size="sm">Pro</Badge>
          </div>
          <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)', margin: 0, maxWidth: 640 }}>
            Toutes vos stratégies committées, suivies en temps réel : grecs au DTE restant, snapshots et P&L théorique.
          </p>
        </div>
        <button onClick={() => onNav('construction')}
          style={{ font: '600 13px/1 var(--font-sans)', padding: '9px 18px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>
          + Construire une stratégie
        </button>
      </div>

      {/* Sélecteur de vues (Grille / Groupes / Chronologique) — comme « Mes listes » */}
      {positions.length > 0 && (
        <div style={{ display: 'flex', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-pill)', padding: 3, alignSelf: 'flex-start' }}>
          {viewBtn('grid', '▦ Grille')}
          {viewBtn('groups', '🗂 Groupes')}
          {viewBtn('chrono', '↕ Chronologique')}
        </div>
      )}

      {positions.length === 0 ? (
        <div style={{ padding: '64px 32px', textAlign: 'center', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ font: 'var(--type-h3)', color: 'var(--text-soft)', marginBottom: 8 }}>Aucune position suivie</div>
          <div style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', maxWidth: 420, margin: '0 auto 20px' }}>
            Pour suivre une position : construisez une stratégie (Construction ou Builder) à partir d'une liste, puis validez sa checklist dans le <strong style={{ color: 'var(--text-soft)' }}>Risk Lab</strong>. Elle apparaîtra ici.
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => onNav('construction')}
              style={{ font: '600 12px/1 var(--font-sans)', padding: '9px 18px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}>
              Construire une stratégie →
            </button>
            <button onClick={() => onNav('lists')}
              style={{ font: '600 12px/1 var(--font-sans)', padding: '9px 18px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>
              Mes listes
            </button>
          </div>
        </div>
      ) : view === 'grid' ? (
        /* ── Vue Grille (par défaut) : sections Ouvertes / Fermées, inchangées ── */
        <>
          {open.length > 0 && (
            <section>
              <h2 style={{ font: 'var(--type-h2)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: '0 0 14px' }}>
                Positions ouvertes <span style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', fontWeight: 400 }}>({open.length})</span>
              </h2>
              <div style={gridStyle}>{open.map(cardOf)}</div>
            </section>
          )}
          {closed.length > 0 && (
            <section>
              <h2 style={{ font: 'var(--type-h2)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: '0 0 14px' }}>
                Positions fermées <span style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', fontWeight: 400 }}>({closed.length})</span>
              </h2>
              <div style={gridStyle}>{closed.map(cardOf)}</div>
            </section>
          )}
        </>
      ) : view === 'groups' ? (
        /* ── Vue Groupes : sections repliables + « Sans groupe » en dernier ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {[...groupNames, ' ungrouped'].map(g => {
            const isUngrouped = g === ' ungrouped';
            const inGroup = decorated.filter(p => isUngrouped ? !p.group_name : p.group_name === g);
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
          const dateOf = (p) => String(p.committed_at || p.opened || '');
          const sorted = [...decorated].sort((a, b) => dateOf(b).localeCompare(dateOf(a)));
          let lastMonth = null, lastDay = null;
          return (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {sorted.map((p, i) => {
                const iso = dateOf(p);
                const ym = iso.slice(0, 7);
                const ymd = iso.slice(0, 10);
                const showMonth = ym && ym !== lastMonth;
                if (showMonth) lastMonth = ym;
                const showDay = ymd && ymd !== lastDay;
                if (showDay) lastDay = ymd;
                return (
                  <React.Fragment key={p.id}>
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
                    <div style={{ display: 'flex', gap: 14, marginBottom: 10 }}>
                      {/* Colonne frise : puce + trait */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 14, flexShrink: 0 }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', marginTop: 18, background: (p.status === 'open' || p.status === 'sain' || p.status === 'surveiller') ? 'var(--pos)' : 'var(--text-dim)', border: '2px solid var(--bg-base)', boxShadow: '0 0 0 2px var(--border)' }} />
                        <span style={{ flex: 1, width: 2, background: 'var(--border-subtle)', marginTop: 2 }} />
                      </div>
                      {/* Carte position réutilisée */}
                      <div style={{ flex: 1, minWidth: 0 }}>{cardOf(p)}</div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          );
        })()
      )}

      {/* Modale : ranger une position dans un groupe (existant ou nouveau) */}
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
    </div>
  );
}

function PositionCard({ pos, onNav, lists, onGroup }) {
  const _fx = window.useCurrency ? window.useCurrency() : null;   // re-render au changement de devise
  const isOpen = pos.status === 'open' || pos.status === 'sain' || pos.status === 'surveiller';
  // P&L affiché : reprise serveur si dispo, sinon dernier P&L mark-to-market connu
  // (snapshots). null = aucun P&L de marché encore relevé.
  const pnl = pos.pnl != null ? pos.pnl : (pos.last_pnl != null ? pos.last_pnl : null);
  const pctBase = pos.entry_prem_gross;   // prime brute engagée → base du %
  const pct = (pnl != null && pctBase > 0) ? (pnl / pctBase * 100) : null;
  const date = (pos.committed_at || pos.opened || '').slice(0, 10);
  // Repère de contexte : le nom de la STRATÉGIE d'origine (propre si renommée,
  // sinon hérité de la liste) — résolu au rendu, donc un renommage se propage
  // ici sans toucher aux positions déjà committées (qui gardent leur `pos.name`).
  const srcList = (lists || []).find(l => String(l.id) === String(pos.list_id));
  let listName = srcList?.name;
  if (pos.list_id && window.DXApi && DXApi.strategyName) {
    try {
      const raw = JSON.parse(localStorage.getItem('dx-strategy-' + pos.list_id) || 'null');
      if (raw) listName = DXApi.strategyName(raw, srcList?.name);
    } catch {}
  }

  return (
    <div
      onClick={() => onNav('position', { positionId: pos.id })}
      style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
        padding: '16px', cursor: 'pointer', transition: 'all var(--dur-fast) var(--ease)',
        borderLeft: `3px solid ${isOpen ? 'var(--pos)' : 'var(--border)'}`,
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-card)'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ font: 'var(--type-title)', color: 'var(--text)' }}>{pos.name}</div>
        <span style={{
          font: '500 10px/1 var(--font-mono)', padding: '3px 8px', borderRadius: 'var(--radius-pill)',
          background: isOpen ? 'var(--pos-soft)' : 'var(--bg-elevated)',
          color: isOpen ? 'var(--pos-bright)' : 'var(--text-muted)',
          border: `1px solid ${isOpen ? 'var(--pos)' : 'var(--border)'}`,
          textTransform: 'uppercase', letterSpacing: '0.04em',
        }}>
          {isOpen ? 'Ouverte' : 'Fermée'}
        </span>
      </div>
      <div style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span>
          {pos.index_symbol || pos.idx} · {pos.strategy_type || 'dispersion'}
          {listName && ` · ${listName}`}
          {date && ` · ouvert le ${date}`}
        </span>
        {pos.group_name && <span style={{ font: '600 9px/1 var(--font-mono)', padding: '2px 7px', borderRadius: 'var(--radius-pill)', background: 'var(--accent-soft)', color: 'var(--accent-hover)', border: '1px solid var(--accent-border)' }}>🗂 {pos.group_name}</span>}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ font: 'var(--type-data)', color: pnl == null ? 'var(--text-muted)' : pnl >= 0 ? 'var(--pos-bright)' : 'var(--neg-bright)' }}>
          {pnl == null ? (pos.dte != null ? pos.dte + ' DTE restant' : '—') : (
            <>
              {window.DXMoney ? window.DXMoney.format(pnl) : ((pnl >= 0 ? '+' : '') + pnl.toLocaleString('fr-FR') + ' $')}
              {pct != null && <span style={{ font: 'var(--type-caption)', fontWeight: 600, marginLeft: 6 }}>{(pct >= 0 ? '+' : '−') + Math.abs(pct).toFixed(1) + '%'}</span>}
            </>
          )}
        </div>
        <div style={{ font: 'var(--type-caption)', color: 'var(--text-dim)' }}>
          {pos.n_snapshots || 0} snapshot(s)
        </div>
      </div>
      {onGroup && (
        <div style={{ display: 'flex', marginTop: 12 }}>
          <button onClick={e => { e.stopPropagation(); onGroup(pos); }}
            title={pos.group_name ? 'Changer de groupe' : 'Ranger dans un groupe'}
            style={{ flex: 1, font: '600 11px/1 var(--font-sans)', padding: '7px 0', borderRadius: 'var(--radius)', border: '1px dashed var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
            🗂 {pos.group_name ? 'Changer de groupe' : 'Ranger dans un groupe'}
          </button>
        </div>
      )}
    </div>
  );
}

window.MonitorList = MonitorList;
