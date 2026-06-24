/* ─── Shell: Sidebar + Topbar + Logo + ThemeToggle ─────────────── */
const ICONS = {
  home:     'M3 12L12 3l9 9M5 10v10a1 1 0 0 0 1 1h4v-5h4v5h4a1 1 0 0 0 1-1V10',
  lists:    'M4 6h16M4 12h16M4 18h10',
  dashboard:'M3 13h8V3H3v10Zm0 8h8v-6H3v6Zm10 0h8V11h-8v10Zm0-18v6h8V3h-8Z',
  builder:  'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z',
  corr:     'M3 3v18h18M7 14l3-3 3 3 5-6',
  vol:      'M3 12h4l3 8 4-16 3 8h4',
  risk:     'M12 2 2 7v6c0 5 4 8 10 9 6-1 10-4 10-9V7L12 2Z',
  monitor:  'M3 3h18v14H3zM8 21h8M12 17v4',
  journal:  'M4 4h13l3 3v13H4zM8 4v16M8 9h12',
  docs:     'M12 2 L2 7v6c0 5 4 8 10 9 6-1 10-4 10-9V7L12 2ZM9 12l2 2 4-4',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8-3a8 8 0 0 0-.2-1.8l2-1.5-2-3.4-2.3 1a8 8 0 0 0-3-1.7L14 1h-4l-.5 2.3a8 8 0 0 0-3 1.7l-2.3-1-2 3.4 2 1.5A8 8 0 0 0 4 12a8 8 0 0 0 .2 1.8l-2 1.5 2 3.4 2.3-1a8 8 0 0 0 3 1.7L10 23h4l.5-2.3a8 8 0 0 0 3-1.7l2.3 1 2-3.4-2-1.5A8 8 0 0 0 20 12Z',
};

function Icon({ d, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.85 }}>
      <path d={d} />
    </svg>
  );
}

function Logo({ size = 32, wordmark = true }) {
  return (
    <span className="dx-logo" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
      <span style={{
        width: size, height: size, borderRadius: size * 0.22,
        background: 'var(--bg-elevated)', border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <span className="dx-logo-arcs" style={{ display: 'inline-flex', transformOrigin: '50% 50%' }}>
          <svg width={size * 0.66} height={size * 0.66} viewBox="0 0 32 32" fill="none">
            <path d="M16 25 A9 9 0 0 1 16 7" stroke="var(--pos-bright)" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M16 27 A11 11 0 0 0 16 5" stroke="var(--accent-hover)" strokeWidth="2.4" strokeLinecap="round" />
            <circle cx="16" cy="16" r="2.8" fill="var(--text)" />
          </svg>
        </span>
      </span>
      {wordmark && (
        <span style={{ font: '800 ' + (size * 0.5) + 'px/1 var(--font-sans)', letterSpacing: '-0.02em', color: 'var(--text)' }}>
          Dispersion<span style={{ color: 'var(--accent-hover)' }}>X</span>
        </span>
      )}
    </span>
  );
}

function ThemeToggle() {
  const [theme, setTheme] = React.useState(
    typeof window !== 'undefined' && window.DXTheme ? window.DXTheme.get() : 'dark'
  );
  const [hover, setHover] = React.useState(false);
  const isDark = theme === 'dark';
  const toggle = () => { const n = window.DXTheme.toggle(); setTheme(n); };

  React.useEffect(() => {
    const handler = (e) => setTheme(e.detail);
    window.addEventListener('dx-theme', handler);
    return () => window.removeEventListener('dx-theme', handler);
  }, []);

  return (
    <button onClick={toggle} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      title={isDark ? 'Thème Café' : 'Thème sombre'} aria-label="Changer de thème"
      style={{
        width: 30, height: 30, borderRadius: 'var(--radius)', cursor: 'pointer',
        background: hover ? 'var(--bg-hover)' : 'var(--bg-elevated)',
        border: '1px solid var(--border)', color: hover ? 'var(--accent-hover)' : 'var(--text-soft)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all var(--dur-fast) var(--ease)',
      }}>
      <span style={{ display: 'inline-flex', transition: 'transform var(--dur) var(--ease)', transform: isDark ? 'rotate(0deg)' : 'rotate(-90deg) scale(0.9)' }}>
        {isDark ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )}
      </span>
    </button>
  );
}

// Toggle between the presentation (Landing) part and the app (creation) part.
// `to` = destination side, controls the icon + tooltip. Action runs window.__dxSwitch.
function SectionToggle({ to = 'landing' }) {
  const [hover, setHover] = React.useState(false);
  const goingToApp = to === 'app';
  const title = goingToApp ? 'Aller à l’espace de création' : 'Aller à la présentation';
  return (
    <button onClick={() => window.__dxSwitch && window.__dxSwitch()}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      title={title} aria-label={title}
      style={{
        width: 30, height: 30, borderRadius: 'var(--radius)', cursor: 'pointer',
        background: hover ? 'var(--bg-hover)' : 'var(--bg-elevated)',
        border: '1px solid var(--border)', color: hover ? 'var(--accent-hover)' : 'var(--text-soft)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all var(--dur-fast) var(--ease)',
      }}>
      <span style={{ display: 'inline-flex', transition: 'transform var(--dur) var(--ease)' }}>
        {goingToApp ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 5h11l4 4v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
            <path d="M15 5v4h4" />
          </svg>
        )}
      </span>
    </button>
  );
}

const NAV = [
  { group: 'Accueil', items: [
    { id: 'home', label: 'Indices', icon: 'home' },
    { id: 'lists', label: 'Mes listes', icon: 'lists' },
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  ]},
  { group: 'Analyse', items: [
    { id: 'corr', label: 'Correlation Lab', icon: 'corr' },
    { id: 'vol', label: 'Volatility Lab', icon: 'vol' },
    { id: 'risk', label: 'Risk Lab', icon: 'risk' },
  ]},
  { group: 'Workflow', items: [
    { id: 'builder', label: 'Strategy Builder', icon: 'builder' },
    { id: 'monitor', label: 'Strategy Monitor', icon: 'monitor' },
  ]},
  { group: 'Aide', items: [
    { id: 'docs', label: 'Formules & Référence', icon: 'docs' },
  ]},
];

function Sidebar({ active, onNav, lists, apiConnected }) {
  const listCount = lists ? lists.length : 0;
  const recent = lists ? lists.slice(0, 5) : [];

  return (
    <aside style={{
      background: 'var(--bg-surface)', borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Logo — clicking navigates to home (indices) */}
      <div onClick={() => onNav('home')} title="Accueil — Indices"
        style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '16px 18px 18px', borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer' }}>
        <Logo size={32} wordmark={false} />
        <div style={{ lineHeight: 1.15 }}>
          <div style={{ font: '800 14px/1 var(--font-sans)', letterSpacing: '-0.01em', color: 'var(--text)' }}>
            Dispersion<span style={{ color: 'var(--accent-hover)' }}>X</span>
          </div>
          <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginTop: 3 }}>Volatility desk</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {NAV.map((sec) => (
          <div key={sec.group} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ padding: '0 10px 6px', font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
              {sec.group}
            </div>
            {sec.items.map((it) => {
              const on = active === it.id
                || (it.id === 'lists' && ['list-detail','checklist','monitor-list','position'].includes(active));
              return (
                <a key={it.id} onClick={() => onNav(it.id)} className="dx-ico-hover" style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                  borderRadius: 'var(--radius)', cursor: 'pointer',
                  color: on ? 'var(--accent-hover)' : 'var(--text-soft)',
                  font: '500 13px/1 var(--font-sans)',
                  background: on ? 'var(--accent-soft)' : 'transparent',
                  border: `1px solid ${on ? 'var(--accent-border)' : 'transparent'}`,
                  transition: 'all var(--dur-fast) var(--ease)',
                }}>
                  <Icon d={ICONS[it.icon]} />
                  <span style={{ flex: 1 }}>{it.label}</span>
                  {it.id === 'lists' && listCount > 0 && (
                    <span style={{
                      font: '500 10px/1 var(--font-mono)', padding: '2px 6px', borderRadius: 8,
                      background: on ? 'var(--accent)' : 'var(--bg-elevated)', color: on ? '#fff' : 'var(--text-muted)',
                      border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
                    }}>{listCount}</span>
                  )}
                </a>
              );
            })}
          </div>
        ))}

        {/* Recent lists */}
        {recent.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ padding: '0 10px 6px', font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Récentes</div>
            {recent.map((list) => (
              <a key={list.id} onClick={() => onNav('list-detail', { listId: list.id })} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px',
                borderRadius: 'var(--radius)', cursor: 'pointer', color: 'var(--text-soft)',
                font: '500 12px/1 var(--font-sans)', transition: 'all var(--dur-fast) var(--ease)',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: list.avg_score > 60 ? 'var(--pos)' : 'var(--warn)' }} />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{list.name}</span>
                <span style={{ font: 'var(--type-caption)', color: 'var(--text-dim)', flexShrink: 0 }}>{list.n_items}</span>
              </a>
            ))}
          </div>
        )}
      </nav>

      {/* Status footer */}
      <div style={{ padding: 14, borderTop: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-soft)' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: apiConnected ? 'var(--pos)' : 'var(--warn)', boxShadow: apiConnected ? '0 0 0 3px var(--pos-soft)' : 'none' }} />
          {apiConnected === null ? 'Vérification…' : apiConnected ? 'Connecté' : 'Mode démo'}
        </div>
        <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
          {['yfinance', 'FMP', 'IBKR'].map((s, i) => (
            <span key={s} style={{
              font: '9px/1 var(--font-mono)', padding: '3px 6px', borderRadius: 3,
              textTransform: 'uppercase', letterSpacing: '0.04em',
              background: (i < 2 && apiConnected) ? 'var(--pos-soft)' : 'var(--bg-elevated)',
              border: `1px solid ${(i < 2 && apiConnected) ? 'var(--pos)' : 'var(--border)'}`,
              color: (i < 2 && apiConnected) ? 'var(--pos-bright)' : 'var(--text-muted)',
            }}>{s}</span>
          ))}
        </div>
      </div>
    </aside>
  );
}

function Topbar({ crumbs, mode, onMode, activeList, onNav, user, dataProgress }) {
  const [apiOn, setApiOn] = React.useState(window.DXApi ? window.DXApi.isConnected() : null);

  React.useEffect(() => {
    const h = (e) => setApiOn(e.detail);
    window.addEventListener('dx-api-status', h);
    return () => window.removeEventListener('dx-api-status', h);
  }, []);

  return (
    <header style={{
      height: 52, borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 28px', flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, font: '500 13px/1 var(--font-sans)', color: 'var(--text-muted)' }}>
        {crumbs.map((c, i) => {
          const isLink = i === 0 && crumbs.length > 1;
          return (
            <React.Fragment key={i}>
              {i > 0 && <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>›</span>}
              <span
                onClick={isLink ? () => onNav && onNav('home') : undefined}
                style={{
                  color: i === crumbs.length - 1 ? 'var(--text)' : 'var(--text-soft)',
                  fontWeight: i === crumbs.length - 1 ? 600 : 500,
                  cursor: isLink ? 'pointer' : 'default',
                  textDecoration: isLink ? 'underline' : 'none',
                  textUnderlineOffset: 3,
                }}
              >
                {c}
              </span>
            </React.Fragment>
          );
        })}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {activeList && (
          <div style={{ font: 'var(--type-data-sm)', color: 'var(--accent-hover)', background: 'var(--accent-soft)', border: '1px solid var(--accent-border)', borderRadius: 'var(--radius-pill)', padding: '3px 10px' }}>
            {activeList.name} ({activeList.n_items})
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, font: 'var(--type-data-sm)', color: 'var(--text-muted)' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: apiOn ? 'var(--pos)' : 'var(--warn)' }} />
          {apiOn ? 'Marché ouvert · USD' : 'Mode démo'}
        </div>

        {/* Indicateur de progression des données — discret */}
        {dataProgress && dataProgress.queued > 0 && (() => {
          const pct = Math.min(100, Math.round(dataProgress.done / dataProgress.queued * 100));
          const done = dataProgress.done >= dataProgress.queued;
          return (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '3px 9px',
              background: 'var(--bg-elevated)',
              border: `1px solid ${done ? 'var(--pos)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-pill)',
              transition: 'border-color 0.5s ease',
            }}>
              {done ? (
                <span style={{ font: '10px/1', color: 'var(--pos-bright)' }}>✓</span>
              ) : (
                <div style={{ width: 36, height: 2, background: 'var(--bg-base)', borderRadius: 1, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: pct + '%', background: 'var(--accent)', borderRadius: 1, transition: 'width 0.35s ease' }} />
                </div>
              )}
              <span style={{
                font: '600 9px/1 var(--font-mono)', letterSpacing: '0.05em',
                color: done ? 'var(--pos-bright)' : 'var(--text-dim)',
                transition: 'color 0.5s ease',
              }}>
                {done ? 'CHARGÉ' : `${pct}%`}
              </span>
            </div>
          );
        })()}
        <div style={{ display: 'flex', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-pill)', padding: 2 }}>
          {['Débutant', 'Avancé'].map((m) => (
            <button key={m} onClick={() => onMode(m)} style={{
              font: '600 11px/1 var(--font-sans)', padding: '5px 12px',
              borderRadius: 'var(--radius-pill)', border: 'none', cursor: 'pointer',
              background: mode === m ? 'var(--accent)' : 'transparent',
              color: mode === m ? '#fff' : 'var(--text-muted)',
              transition: 'all var(--dur-fast) var(--ease)',
            }}>{m}</button>
          ))}
        </div>
        <SectionToggle to="landing" />
        <ThemeToggle />
        <div onClick={() => onNav && onNav('login')} title={user ? `${user.name} — profil` : 'Connexion'}
          style={{ width: 28, height: 28, borderRadius: '50%', cursor: 'pointer',
            background: user ? 'var(--accent-soft)' : 'var(--bg-elevated)',
            border: `1px solid ${user ? 'var(--accent-border)' : 'var(--border)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            font: '600 11px/1 var(--font-mono)', color: user ? 'var(--accent-hover)' : 'var(--text-soft)' }}>
          {user && window.initialsOf ? window.initialsOf(user.name) : 'DX'}
        </div>
      </div>
    </header>
  );
}

// Toast notification system
function Toast({ toasts, remove }) {
  if (!toasts.length) return null;
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: t.type === 'error' ? 'var(--neg-soft)' : t.type === 'warn' ? 'var(--warn-soft)' : 'var(--bg-elevated)',
          border: `1px solid ${t.type === 'error' ? 'var(--neg)' : t.type === 'warn' ? 'var(--warn)' : 'var(--border-strong)'}`,
          borderRadius: 'var(--radius-lg)', padding: '10px 16px', maxWidth: 320,
          font: 'var(--type-body-sm)', color: 'var(--text)', boxShadow: 'var(--shadow-lg)',
          animation: 'dx-rise var(--dur) var(--ease) both',
        }}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

function useToasts() {
  const [toasts, setToasts] = React.useState([]);
  const add = React.useCallback((msg, type = 'ok') => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
  }, []);
  return [toasts, add];
}

/* ─── Autocomplete ticker (partagé par Picker et Bar) ─────────────── */
function useTickerCatalog(lists) {
  return React.useMemo(() => {
    const map = {};

    // 1. Pré-remplir avec TOUS les composants connus des indices (noms inclus)
    const INDEX_SYMS = ['SPX', 'NDX', 'DJI', 'CAC', 'DAX'];
    if (window.DXMock?.getComponents) {
      INDEX_SYMS.forEach(idx => {
        (window.DXMock.getComponents(idx) || []).forEach(c => {
          if (!c.ticker) return;
          if (!map[c.ticker]) {
            map[c.ticker] = { ticker: c.ticker, name: c.name || null, score: c.score ?? null, primaryIndex: idx, indices: [idx], inLists: [] };
          } else {
            if (!map[c.ticker].indices.includes(idx)) map[c.ticker].indices.push(idx);
            if (!map[c.ticker].name && c.name) map[c.ticker].name = c.name;
          }
        });
      });
    }

    // 2. Enrichir / surcharger avec les données des listes utilisateur
    (lists || []).forEach(list => {
      const idx = list.index_symbol || 'SPX';
      (list.items || []).forEach(item => {
        if (!item.ticker) return;
        const t  = item.ticker;
        const sd = item.score_data;
        const name  = sd?.stock?.name || sd?.name || sd?.company || null;
        const score = item.score ?? sd?.composite_score?.score ?? sd?.score ?? null;
        if (!map[t]) {
          map[t] = { ticker: t, name, score, primaryIndex: idx, indices: [idx], inLists: [list.name] };
        } else {
          if (name) map[t].name = name;                     // nom calculé > nom mock
          if (score != null) map[t].score = score;          // score réel > score mock
          if (!map[t].indices.includes(idx)) map[t].indices.push(idx);
          map[t].primaryIndex = idx;                        // indice de la liste utilisateur en priorité
          if (!map[t].inLists.includes(list.name)) map[t].inLists.push(list.name);
        }
      });
    });

    return Object.values(map).sort((a, b) => a.ticker.localeCompare(b.ticker));
  }, [lists]);
}

function filterCatalog(catalog, q) {
  if (!q) return [];
  const up = q.toUpperCase();
  const res = catalog.filter(c =>
    c.ticker.startsWith(up) ||
    c.ticker.includes(up) ||
    (c.name && c.name.toUpperCase().includes(up))
  );
  res.sort((a, b) => {
    const d = (a.ticker.startsWith(up) ? 0 : 1) - (b.ticker.startsWith(up) ? 0 : 1);
    return d !== 0 ? d : a.ticker.localeCompare(b.ticker);
  });
  return res.slice(0, 5);
}

function SuggestionItem({ item, focused, onPick }) {
  const score = item.score;
  const scoreColor = score == null ? 'var(--text-dim)' : score >= 75 ? 'var(--pos-bright)' : score >= 55 ? 'var(--warn)' : 'var(--neg-bright)';
  return (
    <button
      onMouseDown={e => { e.preventDefault(); onPick(item); }}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, width: '100%',
        padding: '9px 14px', background: focused ? 'var(--bg-hover)' : 'transparent',
        border: 'none', borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer',
        textAlign: 'left',
      }}>
      <div style={{ width: 28, height: 28, borderRadius: 5, background: 'var(--bg-elevated)', border: '1px solid var(--border)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <img src={`https://assets.parqet.com/logos/symbol/${item.ticker.split('.')[0]}`} alt=""
          style={{ width: 20, height: 20, objectFit: 'contain' }}
          onError={e => { e.currentTarget.style.display = 'none'; }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ font: '700 13px/1 var(--font-mono)', color: 'var(--text)' }}>{item.ticker}</span>
          {item.name && <span style={{ font: '12px/1 var(--font-sans)', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{item.name}</span>}
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 3 }}>
          {item.indices.map(ix => (
            <span key={ix} style={{ font: '9px/1 var(--font-mono)', padding: '1px 5px', borderRadius: 3, background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-dim)' }}>{ix}</span>
          ))}
          {item.inLists.length > 0 && <span style={{ font: '9px/1 var(--font-sans)', color: 'var(--text-dim)' }}>{item.inLists[0]}{item.inLists.length > 1 ? ` +${item.inLists.length - 1}` : ''}</span>}
        </div>
      </div>
      {score != null && (
        <span style={{ font: '700 12px/1 var(--font-mono)', color: scoreColor, flexShrink: 0 }}>{Math.round(score)}</span>
      )}
    </button>
  );
}

/* ─── ModuleCtxPicker : sélecteur de liste/ticker affiché quand aucun contexte n'est défini ─── */
function ModuleCtxPicker({ lists, onCtx, title, subtitle }) {
  const [q, setQ]               = React.useState('');
  const [showSugg, setShowSugg] = React.useState(false);
  const [focused, setFocused]   = React.useState(-1);
  const [hoverList, setHoverList] = React.useState(null);
  const [selectedIndex, setSelectedIndex] = React.useState('SPX');
  const inputRef  = React.useRef(null);
  const justPicked = React.useRef(false); // empêche le useEffect de rouvrir le dropdown

  const catalog     = useTickerCatalog(lists);
  const suggestions = React.useMemo(() => filterCatalog(catalog, q), [catalog, q]);
  const foundInCatalog = catalog.find(c => c.ticker === q.trim().toUpperCase()) || null;
  const showIndexPicker = q.trim().length > 0;

  React.useEffect(() => {
    if (justPicked.current) { justPicked.current = false; return; } // skip après pick
    setShowSugg(q.trim().length > 0 && suggestions.length > 0);
    setFocused(-1);
  }, [q, suggestions.length]);

  React.useEffect(() => {
    if (foundInCatalog) setSelectedIndex(foundInCatalog.primaryIndex);
  }, [foundInCatalog?.primaryIndex]);

  // Cliquer une suggestion = remplir l'input seulement (ne pas naviguer)
  function pick(item) {
    justPicked.current = true;
    setQ(item.ticker);
    setSelectedIndex(item.primaryIndex);
    setShowSugg(false);
  }

  function submit(e) {
    e?.preventDefault();
    const t = q.trim().toUpperCase();
    if (!t) return;
    onCtx({ ticker: t, listId: null, listName: null, listIndex: selectedIndex, index: selectedIndex });
  }

  function onKeyDown(e) {
    if (!showSugg || !suggestions.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setFocused(i => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setFocused(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && focused >= 0) { e.preventDefault(); pick(suggestions[focused]); }
    else if (e.key === 'Escape') setShowSugg(false);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32, maxWidth: 820, margin: '0 auto', padding: '48px 0 24px' }}>
      <div>
        <h1 style={{ font: 'var(--type-h1)', color: 'var(--text)', margin: '0 0 8px', letterSpacing: 'var(--track-snug)' }}>{title || 'Choisir un contexte'}</h1>
        <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)', margin: 0, maxWidth: 520 }}>{subtitle || 'Sélectionnez une liste ou recherchez un actif pour l\'analyser.'}</p>
      </div>

      {/* Listes */}
      {lists && lists.length > 0 ? (
        <div>
          <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 12 }}>Mes listes</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 10 }}>
            {lists.map(list => (
              <button key={list.id}
                onClick={() => onCtx({ listId: list.id, listName: list.name, listIndex: list.index_symbol || 'SPX', index: list.index_symbol || 'SPX', ticker: null })}
                onMouseEnter={() => setHoverList(list.id)} onMouseLeave={() => setHoverList(null)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6,
                  padding: '14px 16px', borderRadius: 'var(--radius-lg)', cursor: 'pointer',
                  background: hoverList === list.id ? 'var(--bg-hover)' : 'var(--bg-card)',
                  border: `1px solid ${hoverList === list.id ? 'var(--accent-border)' : 'var(--border)'}`,
                  color: 'var(--text)', transition: 'all var(--dur-fast) var(--ease)', textAlign: 'left',
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: (list.avg_score || 0) > 60 ? 'var(--pos)' : 'var(--warn)' }} />
                  <span style={{ font: '600 13px/1 var(--font-sans)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{list.name}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, font: 'var(--type-caption)', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                  <span>{list.n_items || 0} actions</span>
                  <span>·</span>
                  <span style={{ font: '600 10px/1.4 var(--font-mono)', padding: '1px 5px', borderRadius: 3, background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>{list.index_symbol || 'SPX'}</span>
                  {list.avg_score ? <span>· {list.avg_score.toFixed(0)} pts</span> : null}
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24, color: 'var(--text-muted)', font: 'var(--type-body)' }}>
          Aucune liste — créez d'abord une liste dans <strong style={{ color: 'var(--text)' }}>Mes listes</strong>.
        </div>
      )}

      {/* Séparateur */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        <span style={{ font: 'var(--type-caption)', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>ou analyser un actif individuel</span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>

      {/* Recherche avec autocomplete */}
      <div>
        <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 12 }}>Analyser un actif individuel</div>
        <form onSubmit={submit}>
          {/* Champ + bouton */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                ref={inputRef}
                value={q}
                onChange={e => { justPicked.current = false; setQ(e.target.value); }}
                onKeyDown={onKeyDown}
                onBlur={() => setTimeout(() => setShowSugg(false), 180)}
                placeholder="Tapez un ticker ou un nom : AAPL, Nvidia, SAP…"
                autoComplete="off"
                style={{
                  width: '100%', padding: '11px 14px', font: '500 14px/1 var(--font-mono)',
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: showSugg ? 'var(--radius) var(--radius) 0 0' : 'var(--radius)',
                  color: 'var(--text)', outline: 'none', boxSizing: 'border-box',
                  borderColor: showSugg ? 'var(--accent)' : 'var(--border)',
                  transition: 'border-color var(--dur-fast) var(--ease)',
                }}
              />
              {/* Dropdown suggestions */}
              {showSugg && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 400,
                  background: 'var(--bg-card)', border: '1px solid var(--accent)',
                  borderTop: 'none', borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
                  boxShadow: 'var(--shadow-lg)', overflow: 'hidden',
                }}>
                  {suggestions.map((s, i) => (
                    <SuggestionItem key={s.ticker} item={s} focused={i === focused} onPick={pick} />
                  ))}
                  <div style={{ padding: '6px 14px', font: '10px/1 var(--font-sans)', color: 'var(--text-dim)', background: 'var(--bg-elevated)' }}>
                    ↑↓ naviguer · Entrée pour remplir · Esc fermer
                  </div>
                </div>
              )}
            </div>
            <button type="submit"
              disabled={!q.trim()}
              style={{
                padding: '11px 22px', font: '600 13px/1 var(--font-sans)', flexShrink: 0,
                background: q.trim() ? 'var(--accent)' : 'var(--bg-elevated)',
                color: q.trim() ? '#fff' : 'var(--text-muted)',
                border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                cursor: q.trim() ? 'pointer' : 'default',
                transition: 'all var(--dur-fast) var(--ease)',
              }}>Analyser →</button>
          </div>

          {/* Sélecteur d'indice — visible quand on tape.
              Logique : une action ne peut être comparée qu'aux indices dont
              elle fait partie. Si le ticker est connu, on restreint aux
              indices membres ; sinon (ticker inconnu) on propose les 5. */}
          {showIndexPicker && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                Comparer vs :
              </span>
              {(foundInCatalog?.indices?.length ? foundInCatalog.indices : ['SPX', 'NDX', 'DJI', 'CAC', 'DAX']).map(idx => {
                const isSel = selectedIndex === idx;
                return (
                  <button key={idx} type="button"
                    onClick={() => setSelectedIndex(idx)}
                    style={{
                      padding: '5px 12px', font: '700 11px/1 var(--font-mono)',
                      background: isSel ? 'var(--accent)' : 'var(--bg-elevated)',
                      color: isSel ? '#fff' : 'var(--text-soft)',
                      border: `1px solid ${isSel ? 'var(--accent)' : 'var(--border)'}`,
                      borderRadius: 'var(--radius)', cursor: 'pointer',
                      transition: 'all var(--dur-fast) var(--ease)',
                    }}
                  >{idx}</button>
                );
              })}
              {foundInCatalog ? (
                <span style={{ font: 'var(--type-caption)', color: 'var(--text-dim)', marginLeft: 4 }}>
                  {foundInCatalog.name ? `· ${foundInCatalog.name}` : ''}
                  {foundInCatalog.score != null ? ` · score ${Math.round(foundInCatalog.score)}` : ''}
                </span>
              ) : (
                <span style={{ font: 'var(--type-caption)', color: 'var(--text-dim)', marginLeft: 4 }}>
                  · ticker hors catalogue — choisissez un indice
                </span>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

/* ─── ModuleCtxBar : barre compacte en haut des modules quand un contexte est actif ─── */
function ModuleCtxBar({ ctx, lists, onCtx, onClear }) {
  const [open, setOpen]     = React.useState(false);
  const [q, setQ]           = React.useState('');
  const [showSugg, setShowSugg] = React.useState(false);
  const [focused, setFocused]   = React.useState(-1);
  const [selIndex, setSelIndex] = React.useState(null); // indice de comparaison choisi
  const justPicked = React.useRef(false);

  const catalog     = useTickerCatalog(lists);
  const suggestions = React.useMemo(() => filterCatalog(catalog, q), [catalog, q]);
  const foundInCatalog = catalog.find(c => c.ticker === q.trim().toUpperCase()) || null;
  // Indices proposés : uniquement ceux dont le ticker fait partie (logique),
  // sinon (ticker hors catalogue) les 5 indices.
  const availIndices = foundInCatalog?.indices?.length ? foundInCatalog.indices : ['SPX', 'NDX', 'DJI', 'CAC', 'DAX'];

  React.useEffect(() => {
    if (justPicked.current) { justPicked.current = false; return; } // ne pas rouvrir après un pick
    setShowSugg(q.trim().length > 0 && suggestions.length > 0);
    setFocused(-1);
  }, [q, suggestions.length]);

  // Ticker connu → présélectionne son indice principal.
  React.useEffect(() => {
    if (foundInCatalog) setSelIndex(foundInCatalog.primaryIndex);
  }, [foundInCatalog?.primaryIndex]);

  // Choisir une suggestion = remplir le champ (sans valider) : l'utilisateur
  // choisit ensuite l'indice de comparaison avant de confirmer.
  function pick(item) {
    justPicked.current = true;
    setQ(item.ticker);
    setSelIndex(item.primaryIndex);
    setShowSugg(false);
  }

  // Valide le contexte « actif individuel » pour un ticker + un indice.
  function commit(ticker, idx) {
    if (!ticker || !idx) return;
    onCtx({ ticker, listId: null, listName: null, listIndex: idx, index: idx });
    setShowSugg(false); setQ(''); setOpen(false); setSelIndex(null);
  }

  function submitQ(e) {
    e.preventDefault();
    const t = q.trim().toUpperCase();
    if (!t) return;
    const idx = selIndex || (foundInCatalog ? foundInCatalog.primaryIndex : (availIndices[0] || ctx.index || 'SPX'));
    commit(t, idx);
  }

  function onKeyDown(e) {
    if (!showSugg || !suggestions.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setFocused(i => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setFocused(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && focused >= 0) { e.preventDefault(); pick(suggestions[focused]); }
    else if (e.key === 'Escape') { setShowSugg(false); setOpen(false); }
  }

  const label = ctx.ticker
    ? ctx.ticker + (ctx.index ? ' / ' + ctx.index : '')
    : ctx.listName || 'Liste sélectionnée';

  const activeList = lists?.find(l => l.id === ctx.listId);
  const subLabel = ctx.ticker
    ? 'Actif individuel'
    : (activeList?.n_items || '—') + ' actions · ' + (ctx.listIndex || ctx.index || 'SPX');

  return (
    <div style={{ position: 'relative', zIndex: 400, marginBottom: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: open ? 'var(--radius-lg) var(--radius-lg) 0 0' : 'var(--radius-lg)', flexWrap: 'wrap' }}>
        {/* Contexte actif */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          <span style={{ font: '10px/1 var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Contexte</span>
          <span style={{ font: '600 13px/1 var(--font-mono)', color: 'var(--accent-hover)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
          <span style={{ font: 'var(--type-caption)', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{subLabel}</span>
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={() => { setOpen(o => !o); setQ(''); }} style={{
            font: '600 11px/1 var(--font-sans)', padding: '5px 10px',
            background: open ? 'var(--accent-soft)' : 'transparent',
            border: `1px solid ${open ? 'var(--accent-border)' : 'var(--border)'}`,
            borderRadius: 'var(--radius)', color: open ? 'var(--accent-hover)' : 'var(--text-soft)', cursor: 'pointer',
          }}>⇄ Changer</button>
          {onClear && <button onClick={onClear} style={{
            font: '600 11px/1 var(--font-sans)', padding: '5px 8px',
            background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
            color: 'var(--text-dim)', cursor: 'pointer',
          }}>×</button>}
        </div>
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 800, marginTop: 0,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderTop: 'none', borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)', overflow: 'visible',
        }}>
          {/* Listes */}
          {lists && lists.length > 0 && (
            <div style={{ padding: '8px 10px 4px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ font: '9px/1 var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-dim)', padding: '0 4px 6px' }}>Mes listes</div>
              {lists.map(list => (
                <button key={list.id} onClick={() => {
                  onCtx({ listId: list.id, listName: list.name, listIndex: list.index_symbol || 'SPX', index: list.index_symbol || 'SPX', ticker: null });
                  setOpen(false);
                }} style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 12px',
                  borderRadius: 'var(--radius)',
                  background: list.id === ctx.listId ? 'var(--accent-soft)' : 'transparent',
                  border: `1px solid ${list.id === ctx.listId ? 'var(--accent-border)' : 'transparent'}`,
                  color: list.id === ctx.listId ? 'var(--accent-hover)' : 'var(--text-soft)',
                  cursor: 'pointer', font: '500 13px/1 var(--font-sans)', textAlign: 'left', marginBottom: 2,
                }}>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{list.name}</span>
                  <span style={{ font: '9px/1 var(--font-mono)', padding: '2px 5px', borderRadius: 3, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-dim)', flexShrink: 0 }}>{list.index_symbol || 'SPX'}</span>
                  <span style={{ font: 'var(--type-caption)', color: 'var(--text-dim)', flexShrink: 0 }}>{list.n_items || 0}</span>
                </button>
              ))}
            </div>
          )}

          {/* Recherche ticker avec autocomplete */}
          <div style={{ padding: 10 }}>
            <div style={{ font: '9px/1 var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-dim)', padding: '0 4px 6px' }}>Actif individuel</div>
            <form onSubmit={submitQ}>
              <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    value={q}
                    onChange={e => setQ(e.target.value)}
                    onKeyDown={onKeyDown}
                    onBlur={() => setTimeout(() => setShowSugg(false), 160)}
                    onFocus={() => q.trim() && suggestions.length > 0 && setShowSugg(true)}
                    placeholder="Rechercher un ticker ou un nom…"
                    autoComplete="off"
                    style={{
                      flex: 1, padding: '7px 10px', font: '500 13px/1 var(--font-mono)',
                      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                      borderRadius: showSugg ? 'var(--radius) var(--radius) 0 0' : 'var(--radius)',
                      color: 'var(--text)', outline: 'none',
                      borderColor: showSugg ? 'var(--accent)' : 'var(--border)',
                    }}
                  />
                  <button type="submit" style={{
                    padding: '7px 12px', font: '600 11px/1 var(--font-sans)',
                    background: q.trim() ? 'var(--accent)' : 'var(--bg-elevated)',
                    color: q.trim() ? '#fff' : 'var(--text-muted)',
                    border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer',
                  }}>→</button>
                </div>

                {/* Suggestions */}
                {showSugg && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 36, zIndex: 500,
                    background: 'var(--bg-card)', border: '1px solid var(--accent)',
                    borderTop: 'none', borderRadius: '0 0 var(--radius) var(--radius)',
                    boxShadow: 'var(--shadow-lg)', overflow: 'hidden',
                  }}>
                    {suggestions.map((s, i) => (
                      <SuggestionItem key={s.ticker} item={s} focused={i === focused} onPick={pick} />
                    ))}
                  </div>
                )}

                {/* Choix de l'indice de comparaison — logique : on ne propose
                    que les indices dont l'action fait partie. Cliquer un indice
                    valide directement le contexte. */}
                {q.trim().length > 0 && !showSugg && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8, alignItems: 'center' }}>
                    <span style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', alignSelf: 'center', whiteSpace: 'nowrap' }}>Comparer vs :</span>
                    {availIndices.map(idx => {
                      const isSel = (selIndex || foundInCatalog?.primaryIndex) === idx;
                      return (
                        <button key={idx} type="button"
                          onClick={() => commit(q.trim().toUpperCase(), idx)}
                          style={{
                            padding: '4px 10px', font: '700 11px/1 var(--font-mono)',
                            background: isSel ? 'var(--accent)' : 'var(--bg-elevated)',
                            color: isSel ? '#fff' : 'var(--text-soft)',
                            border: `1px solid ${isSel ? 'var(--accent)' : 'var(--border)'}`,
                            borderRadius: 'var(--radius)', cursor: 'pointer',
                            transition: 'all var(--dur-fast) var(--ease)',
                          }}
                          onMouseEnter={e => { if (!isSel) e.currentTarget.style.borderColor = 'var(--accent)'; }}
                          onMouseLeave={e => { if (!isSel) e.currentTarget.style.borderColor = 'var(--border)'; }}
                        >{idx}</button>
                      );
                    })}
                    {foundInCatalog
                      ? <span style={{ font: 'var(--type-caption)', color: 'var(--text-dim)' }}>{foundInCatalog.name || ''}</span>
                      : <span style={{ font: 'var(--type-caption)', color: 'var(--text-dim)' }}>· hors catalogue</span>}
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { Icon, ICONS, Logo, ThemeToggle, SectionToggle, Sidebar, Topbar, Toast, useToasts, ModuleCtxPicker, ModuleCtxBar });
