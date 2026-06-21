// App shell — sidebar + topbar. Pure presentational.
const ICONS = {
  dashboard: 'M3 13h8V3H3v10Zm0 8h8v-6H3v6Zm10 0h8V11h-8v10Zm0-18v6h8V3h-8Z',
  builder: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z',
  corr: 'M3 3v18h18M7 14l3-3 3 3 5-6',
  vol: 'M3 12h4l3 8 4-16 3 8h4',
  risk: 'M12 2 2 7v6c0 5 4 8 10 9 6-1 10-4 10-9V7L12 2Z',
  screener: 'M3 6h18M7 12h10M10 18h4',
  monitor: 'M3 3h18v14H3zM8 21h8M12 17v4',
  journal: 'M4 4h13l3 3v13H4zM8 4v16M8 9h12',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8-3a8 8 0 0 0-.2-1.8l2-1.5-2-3.4-2.3 1a8 8 0 0 0-3-1.7L14 1h-4l-.5 2.3a8 8 0 0 0-3 1.7l-2.3-1-2 3.4 2 1.5A8 8 0 0 0 4 12a8 8 0 0 0 .2 1.8l-2 1.5 2 3.4 2.3-1a8 8 0 0 0 3 1.7L10 23h4l.5-2.3a8 8 0 0 0 3-1.7l2.3 1 2-3.4-2-1.5A8 8 0 0 0 20 12Z',
  book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z',
};
function Icon({ d, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.85 }}>
      <path d={d} />
    </svg>
  );
}

const NAV = [
  { group: 'Workflow', items: [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'builder', label: 'Strategy Builder', icon: 'builder', badge: '8' },
  ]},
  { group: 'Analyse', items: [
    { id: 'corr', label: 'Correlation Lab', icon: 'corr' },
    { id: 'vol', label: 'Volatility Lab', icon: 'vol' },
    { id: 'risk', label: 'Risk Lab', icon: 'risk' },
    { id: 'screener', label: 'Screener', icon: 'screener' },
  ]},
  { group: 'Suivi', items: [
    { id: 'monitor', label: 'Strategy Monitor', icon: 'monitor' },
    { id: 'journal', label: 'Journal', icon: 'journal' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ]},
];

function Sidebar({ active, onNav }) {
  return (
    <aside style={{
      background: 'var(--bg-surface)', borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '16px 18px 18px', borderBottom: '1px solid var(--border-subtle)' }}>
        <Logo size={32} wordmark={false} />
        <div style={{ lineHeight: 1.15 }}>
          <div style={{ font: '800 14px/1 var(--font-sans)', letterSpacing: '-0.01em', color: 'var(--text)' }}>Dispersion<span style={{ color: 'var(--accent-hover)' }}>X</span></div>
          <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginTop: 3 }}>Volatility desk</div>
        </div>
      </div>
      <nav style={{ flex: 1, overflowY: 'auto', padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {NAV.map((sec) => (
          <div key={sec.group} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ padding: '0 10px 6px', font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>{sec.group}</div>
            {sec.items.map((it) => {
              const on = active === it.id;
              return (
                <a key={it.id} onClick={() => onNav(it.id)} className="dx-ico-hover" style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 'var(--radius)',
                  color: on ? 'var(--accent-hover)' : 'var(--text-soft)', font: '500 13px/1 var(--font-sans)', cursor: 'pointer',
                  background: on ? 'var(--accent-soft)' : 'transparent', border: `1px solid ${on ? 'var(--accent-border)' : 'transparent'}`,
                  transition: 'all var(--dur-fast) var(--ease)',
                }}>
                  <Icon d={ICONS[it.icon]} />
                  <span>{it.label}</span>
                  {it.badge && <span style={{
                    marginLeft: 'auto', font: '500 10px/1 var(--font-mono)', padding: '2px 6px', borderRadius: 8,
                    background: on ? 'var(--accent)' : 'var(--bg-elevated)', color: on ? '#fff' : 'var(--text-muted)',
                    border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
                  }}>{it.badge}</span>}
                </a>
              );
            })}
          </div>
        ))}
      </nav>
      <div style={{ padding: 14, borderTop: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-soft)' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--pos)', boxShadow: '0 0 0 3px var(--pos-soft)' }} />
          Données connectées
        </div>
        <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
          {['yfinance', 'FMP', 'IBKR'].map((s, i) => (
            <span key={s} style={{
              font: '9px/1 var(--font-mono)', padding: '3px 6px', borderRadius: 3, textTransform: 'uppercase', letterSpacing: '0.04em',
              background: i < 2 ? 'var(--pos-soft)' : 'var(--bg-elevated)', border: `1px solid ${i < 2 ? 'var(--pos)' : 'var(--border)'}`,
              color: i < 2 ? 'var(--pos-bright)' : 'var(--text-muted)',
            }}>{s}</span>
          ))}
        </div>
      </div>
    </aside>
  );
}

function Topbar({ crumbs, mode, onMode }) {
  return (
    <header style={{
      height: 'var(--topbar-h)', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', flexShrink: 0,
    }}>      <div style={{ display: 'flex', alignItems: 'center', gap: 8, font: '500 13px/1 var(--font-sans)', color: 'var(--text-muted)' }}>
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>›</span>}
            <span style={{ color: i === crumbs.length - 1 ? 'var(--text)' : 'var(--text-soft)', fontWeight: i === crumbs.length - 1 ? 600 : 500 }}>{c}</span>
          </React.Fragment>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, font: 'var(--type-data-sm)', color: 'var(--text-muted)' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--pos)' }} />
          Marché ouvert · USD
        </div>
        <div style={{ display: 'flex', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-pill)', padding: 2 }}>
          {['Débutant', 'Avancé'].map((m) => (
            <button key={m} onClick={() => onMode(m)} style={{
              font: '600 11px/1 var(--font-sans)', padding: '5px 12px', borderRadius: 'var(--radius-pill)', border: 'none',
              cursor: 'pointer', background: mode === m ? 'var(--accent)' : 'transparent', color: mode === m ? '#fff' : 'var(--text-muted)',
            }}>{m}</button>
          ))}
        </div>
        <ThemeToggle />
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-elevated)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '600 11px/1 var(--font-mono)', color: 'var(--text-soft)' }}>JD</div>
      </div>
    </header>
  );
}

function ThemeToggle() {
  const [theme, setTheme] = React.useState(typeof window !== 'undefined' && window.DXTheme ? window.DXTheme.get() : 'dark');
  const [hover, setHover] = React.useState(false);
  const isDark = theme === 'dark';
  const toggle = () => { const n = window.DXTheme.toggle(); setTheme(n); };
  return (
    <button
      onClick={toggle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={isDark ? 'Passer en thème clair (Café)' : 'Passer en thème sombre'}
      aria-label="Changer de thème"
      style={{
        width: 30, height: 30, borderRadius: 'var(--radius)', cursor: 'pointer',
        background: hover ? 'var(--bg-hover)' : 'var(--bg-elevated)',
        border: '1px solid var(--border)', color: hover ? 'var(--accent-hover)' : 'var(--text-soft)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all var(--dur-fast) var(--ease)', position: 'relative', overflow: 'hidden',
      }}
    >
      <span style={{ display: 'inline-flex', transition: 'transform var(--dur) var(--ease)', transform: isDark ? 'rotate(0deg)' : 'rotate(-90deg) scale(0.9)' }}>
        {isDark ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
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

function Logo({ size = 32, wordmark = true }) {
  return (
    <span className="dx-logo" style={{ display: 'inline-flex', alignItems: 'center', gap: 11, cursor: 'pointer' }}>
      <span style={{ width: size, height: size, borderRadius: size * 0.22, background: 'var(--bg-elevated)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span className="dx-logo-arcs" style={{ display: 'inline-flex', transformOrigin: '50% 50%' }}>
          <svg width={size * 0.66} height={size * 0.66} viewBox="0 0 32 32" fill="none">
            <path d="M16 25 A9 9 0 0 1 16 7" stroke="var(--pos-bright)" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M16 27 A11 11 0 0 0 16 5" stroke="var(--accent-hover)" strokeWidth="2.4" strokeLinecap="round" />
            <circle cx="16" cy="16" r="2.8" fill="var(--text)" />
          </svg>
        </span>
      </span>
      {wordmark && <span style={{ font: '800 ' + (size * 0.5) + 'px/1 var(--font-sans)', letterSpacing: '-0.02em', color: 'var(--text)' }}>Dispersion<span style={{ color: 'var(--accent-hover)' }}>X</span></span>}
    </span>
  );
}

Object.assign(window, { Icon, ICONS, Sidebar, Topbar, ThemeToggle, Logo });
