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

function Topbar({ crumbs, mode, onMode, activeList, onNav, user }) {
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

/* ─── ModuleCtxPicker : sélecteur de liste/ticker affiché quand aucun contexte n'est défini ─── */
function ModuleCtxPicker({ lists, onCtx, title, subtitle }) {
  const [tickerInput, setTickerInput] = React.useState('');
  const [indexInput, setIndexInput]   = React.useState('SPX');
  const [hover, setHover] = React.useState(null);

  function submitTicker(e) {
    e.preventDefault();
    const t = tickerInput.trim().toUpperCase();
    if (!t) return;
    onCtx({ ticker: t, listId: null, listName: null, listIndex: indexInput, index: indexInput });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32, maxWidth: 780, margin: '0 auto', padding: '48px 0 24px' }}>
      <div>
        <h1 style={{ font: 'var(--type-h1)', color: 'var(--text)', margin: '0 0 8px', letterSpacing: 'var(--track-snug)' }}>{title || 'Choisir un contexte'}</h1>
        <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)', margin: 0, maxWidth: 520 }}>{subtitle || 'Sélectionnez une liste sauvegardée ou entrez un ticker pour analyser un actif individuel.'}</p>
      </div>

      {/* Listes */}
      {lists && lists.length > 0 ? (
        <div>
          <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 12 }}>Mes listes</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {lists.map(list => (
              <button key={list.id}
                onClick={() => onCtx({ listId: list.id, listName: list.name, listIndex: list.index_symbol || 'SPX', index: list.index_symbol || 'SPX', ticker: null })}
                onMouseEnter={() => setHover(list.id)} onMouseLeave={() => setHover(null)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6,
                  padding: '14px 16px', borderRadius: 'var(--radius-lg)', cursor: 'pointer',
                  background: hover === list.id ? 'var(--bg-hover)' : 'var(--bg-card)',
                  border: `1px solid ${hover === list.id ? 'var(--accent-border)' : 'var(--border)'}`,
                  color: 'var(--text)', transition: 'all var(--dur-fast) var(--ease)', textAlign: 'left',
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: (list.avg_score || 0) > 60 ? 'var(--pos)' : 'var(--warn)' }} />
                  <span style={{ font: '600 13px/1 var(--font-sans)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{list.name}</span>
                </div>
                <div style={{ display: 'flex', gap: 10, font: 'var(--type-caption)', color: 'var(--text-muted)' }}>
                  <span>{list.n_items || 0} actions</span>
                  <span>·</span>
                  <span>{list.index_symbol || 'SPX'}</span>
                  {list.avg_score && <span>· score {list.avg_score.toFixed(0)}</span>}
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

      {/* Ticker input */}
      <form onSubmit={submitTicker} style={{ display: 'flex', gap: 8 }}>
        <input
          value={tickerInput}
          onChange={e => setTickerInput(e.target.value.toUpperCase())}
          placeholder="Ex: AAPL, NVDA, META…"
          style={{
            flex: 1, padding: '10px 14px', font: '500 14px/1 var(--font-mono)',
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', color: 'var(--text)', outline: 'none',
          }}
          onFocus={e => { e.target.style.borderColor = 'var(--accent)'; }}
          onBlur={e => { e.target.style.borderColor = 'var(--border)'; }}
        />
        <select value={indexInput} onChange={e => setIndexInput(e.target.value)}
          style={{
            padding: '10px 12px', font: '500 13px/1 var(--font-mono)',
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', color: 'var(--text)', cursor: 'pointer',
          }}>
          {['SPX', 'NDX', 'DJI', 'CAC', 'DAX'].map(idx => <option key={idx} value={idx}>{idx}</option>)}
        </select>
        <button type="submit" style={{
          padding: '10px 20px', font: '600 13px/1 var(--font-sans)',
          background: tickerInput.trim() ? 'var(--accent)' : 'var(--bg-elevated)',
          color: tickerInput.trim() ? '#fff' : 'var(--text-muted)',
          border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer',
          transition: 'all var(--dur-fast) var(--ease)',
        }}>Analyser →</button>
      </form>
    </div>
  );
}

/* ─── ModuleCtxBar : barre compacte en haut des modules quand un contexte est actif ─── */
function ModuleCtxBar({ ctx, lists, onCtx, onClear }) {
  const [open, setOpen] = React.useState(false);

  const label = ctx.ticker
    ? ctx.ticker + (ctx.index ? ' / ' + ctx.index : '')
    : ctx.listName || 'Liste sélectionnée';

  const subLabel = ctx.ticker
    ? 'Actif individuel'
    : (lists?.find(l => l.id === ctx.listId)?.n_items || '—') + ' actions · ' + (ctx.listIndex || ctx.index || 'SPX');

  return (
    <div style={{ position: 'relative', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', flexWrap: 'wrap' }}>
        {/* Contexte actif */}
        <div style={{ display: 'flex', align: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          <span style={{ font: '10px/1 var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Contexte</span>
          <span style={{ font: '600 13px/1 var(--font-mono)', color: 'var(--accent-hover)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
          <span style={{ font: 'var(--type-caption)', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{subLabel}</span>
        </div>

        {/* Boutons */}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={() => setOpen(o => !o)} style={{
            font: '600 11px/1 var(--font-sans)', padding: '5px 10px',
            background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
            color: 'var(--text-soft)', cursor: 'pointer',
          }}>⇄ Changer</button>
          {onClear && <button onClick={onClear} style={{
            font: '600 11px/1 var(--font-sans)', padding: '5px 8px',
            background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
            color: 'var(--text-dim)', cursor: 'pointer',
          }}>×</button>}
        </div>
      </div>

      {/* Dropdown de sélection rapide */}
      {open && lists && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200, marginTop: 4,
          background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)', padding: 12, display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          {lists.map(list => (
            <button key={list.id} onClick={() => {
              onCtx({ listId: list.id, listName: list.name, listIndex: list.index_symbol || 'SPX', index: list.index_symbol || 'SPX', ticker: null });
              setOpen(false);
            }} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
              borderRadius: 'var(--radius)', background: list.id === ctx.listId ? 'var(--accent-soft)' : 'transparent',
              border: `1px solid ${list.id === ctx.listId ? 'var(--accent-border)' : 'transparent'}`,
              color: list.id === ctx.listId ? 'var(--accent-hover)' : 'var(--text-soft)',
              cursor: 'pointer', font: '500 13px/1 var(--font-sans)', textAlign: 'left',
            }}>
              <span style={{ flex: 1 }}>{list.name}</span>
              <span style={{ font: 'var(--type-caption)', color: 'var(--text-dim)' }}>{list.n_items} · {list.index_symbol || 'SPX'}</span>
            </button>
          ))}
          <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
          <div style={{ font: '11px/1 var(--font-sans)', color: 'var(--text-dim)', padding: '4px 12px' }}>ou entrez un ticker</div>
          <form onSubmit={e => {
            e.preventDefault();
            const t = e.target.elements.t.value.trim().toUpperCase();
            if (!t) return;
            onCtx({ ticker: t, listId: null, listName: null, index: ctx.index || 'SPX', listIndex: ctx.index || 'SPX' });
            setOpen(false);
          }} style={{ display: 'flex', gap: 6, padding: '0 4px' }}>
            <input name="t" placeholder="AAPL, NVDA…" style={{
              flex: 1, padding: '7px 10px', font: '500 13px/1 var(--font-mono)',
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', color: 'var(--text)',
            }} />
            <button type="submit" style={{
              padding: '7px 12px', font: '600 11px/1 var(--font-sans)',
              background: 'var(--accent)', color: '#fff',
              border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer',
            }}>→</button>
          </form>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { Icon, ICONS, Logo, ThemeToggle, SectionToggle, Sidebar, Topbar, Toast, useToasts, ModuleCtxPicker, ModuleCtxBar });
