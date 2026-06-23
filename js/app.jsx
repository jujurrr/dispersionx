/* ─── DispersionX App: router + global state ─────────────────────── */
const HASH_SCREENS = ['landing', 'home', 'lists', 'dashboard', 'corr', 'vol', 'risk', 'builder', 'monitor', 'docs'];

function App() {
  const [screen, setScreen] = React.useState(() => {
    const hash = window.location.hash.slice(1);
    return HASH_SCREENS.includes(hash) ? hash : 'landing';
  });
  const [params, setParams] = React.useState({});
  const [mode, setMode] = React.useState(() => localStorage.getItem('dx-mode') || 'Débutant');
  const [lists, setLists] = React.useState([]);
  const [scoreModal, setScoreModal] = React.useState(null);
  const [scoreCache, setScoreCache] = React.useState({});
  const [duration, setDuration] = React.useState(30);
  const [splash, setSplash] = React.useState(null);
  const [user, setUser] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem('dx-user') || 'null'); } catch { return null; }
  });
  const [toasts, addToast] = window.useToasts();

  function handleAuth(u) {
    setUser(u);
    if (u) localStorage.setItem('dx-user', JSON.stringify(u));
    else localStorage.removeItem('dx-user');
  }

  // Load lists on mount
  React.useEffect(() => {
    DXApi.getLists().then(data => setLists(data || [])).catch(() => {});
  }, []);

  // Persist mode
  React.useEffect(() => {
    localStorage.setItem('dx-mode', mode);
  }, [mode]);

  function onNav(s, p = {}) {
    setScreen(s);
    setParams(p);
    if (HASH_SCREENS.includes(s)) window.location.hash = s;
    window.scrollTo && window.scrollTo(0, 0);
  }

  // Expose navigation so the marketing Landing page CTAs (in _ds_bundle.js) can route into the app
  window.__dxNav = onNav;

  // Navigate to a screen with the full-screen transition splash.
  function transitionTo(target, label, params) {
    setSplash(label);
    setTimeout(() => onNav(target, params || {}), 480);
    setTimeout(() => setSplash(null), 1150);
  }
  window.__dxGo = transitionTo;

  // Switch between the two parts of the site (presentation ⇆ creation) with a full-screen splash.
  function switchSection() {
    const goingToLanding = screen !== 'landing';
    transitionTo(goingToLanding ? 'landing' : 'home', goingToLanding ? 'Présentation' : 'Espace de création');
  }
  window.__dxSwitch = switchSection;

  function onScore(indexSymbol, stockTicker, duration) {
    setScoreModal({ indexSymbol, stockTicker, duration: duration || 30 });
  }

  function onAddedToList(listId) {
    DXApi.getLists().then(data => setLists(data || [])).catch(() => {});
  }

  const crumbMap = {
    home: ['Accueil'],
    'index-detail': ['Accueil', params.symbol || ''],
    lists: ['Mes listes'],
    'list-detail': ['Mes listes', '…'],
    dashboard: ['Dashboard'],
    corr: ['Correlation Lab'],
    vol: ['Volatility Lab'],
    risk: ['Risk Lab'],
    builder: ['Strategy Builder'],
    monitor: ['Strategy Monitor'],
    checklist: ['Mes listes', '…', 'Checklist'],
    'monitor-list': ['Mes listes', '…', 'Positions'],
    position: ['Mes listes', '…', 'Position'],
    docs: ['Formules & Référence'],
  };
  const crumbs = crumbMap[screen] || ['DispersionX'];

  let screenEl;
  switch (screen) {
    case 'home':
      screenEl = <window.Home onNav={onNav} lists={lists} mode={mode} />;
      break;
    case 'index-detail':
      screenEl = <window.IndexDetail symbol={params.symbol} onNav={onNav} onScore={onScore} duration={duration} onDuration={setDuration} mode={mode} scoreCache={scoreCache} />;
      break;
    case 'lists':
      screenEl = <window.Lists onNav={onNav} onListsChange={setLists} addToast={addToast} />;
      break;
    case 'list-detail':
      screenEl = <window.ListDetail listId={params.listId} onNav={onNav} onScore={onScore} addToast={addToast} mode={mode} />;
      break;
    case 'dashboard':
      screenEl = <window.Dashboard onNav={onNav} lists={lists} mode={mode} />;
      break;
    case 'corr':
      screenEl = <window.CorrelationLab listId={params.listId} onNav={onNav} mode={mode} />;
      break;
    case 'vol':
      screenEl = <window.VolatilityLab mode={mode} />;
      break;
    case 'risk':
      screenEl = <window.RiskLab listId={params.listId} onNav={onNav} mode={mode} />;
      break;
    case 'builder':
      screenEl = <window.Builder listId={params.listId} onNav={onNav} mode={mode} />;
      break;
    case 'monitor':
      screenEl = <window.StrategyMonitor mode={mode} />;
      break;
    case 'checklist':
      screenEl = <window.Checklist listId={params.listId} onNav={onNav} addToast={addToast} mode={mode} />;
      break;
    case 'monitor-list':
      screenEl = <window.MonitorList listId={params.listId} onNav={onNav} addToast={addToast} mode={mode} />;
      break;
    case 'position':
      screenEl = <window.PositionDetail positionId={params.positionId} onNav={onNav} addToast={addToast} mode={mode} />;
      break;
    case 'docs':
      screenEl = <window.Docs mode={mode} />;
      break;
    default:
      screenEl = (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', textAlign: 'center' }}>
          <div style={{ opacity: 0.5, marginBottom: 16 }}><window.Logo size={42} wordmark={false} /></div>
          <div style={{ font: 'var(--type-h3)', color: 'var(--text-soft)' }}>{crumbs[crumbs.length - 1]}</div>
          <div style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', maxWidth: 320, marginTop: 6 }}>
            Module de la plateforme — mêmes composants, mêmes conventions de lecture.
          </div>
        </div>
      );
  }

  const splashEl = splash ? <SectionSplash label={splash} /> : null;

  // Login / profile — standalone full-screen page (no app shell)
  if (screen === 'login') {
    return (
      <React.Fragment>
        <div style={{ height: '100vh', overflowY: 'auto', background: 'var(--bg-base)' }}>
          {window.Auth ? <window.Auth onNav={onNav} user={user} onAuth={handleAuth} /> : null}
        </div>
        {splashEl}
      </React.Fragment>
    );
  }

  // Landing / presentation page — full screen, no app shell (it has its own Nav)
  if (screen === 'landing') {
    return (
      <React.Fragment>
        <div style={{ height: '100vh', overflowY: 'auto', background: 'var(--bg-base)' }}>
          {window.Landing ? <window.Landing /> : null}
        </div>
        {splashEl}
      </React.Fragment>
    );
  }

  return (
    <React.Fragment>
    <div style={{ display: 'grid', gridTemplateColumns: 'var(--sidebar-w, 220px) 1fr', height: '100vh', overflow: 'hidden' }}>
      <window.Sidebar active={screen} onNav={onNav} lists={lists} />
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-base)' }}>
        <window.Topbar crumbs={crumbs} mode={mode} onMode={setMode} onNav={onNav} user={user} />
        <main style={{
          flex: 1, overflowY: 'auto', padding: '24px 28px 64px',
          backgroundImage: 'radial-gradient(ellipse 70% 50% at 80% -5%, var(--accent-soft), transparent 60%), radial-gradient(ellipse 50% 40% at 0% 10%, var(--pos-soft), transparent 55%)',
        }}>
          {screenEl}
        </main>
      </div>

      {/* Score Modal overlay */}
      {scoreModal && (
        <window.ScoreModal
          indexSymbol={scoreModal.indexSymbol}
          stockTicker={scoreModal.stockTicker}
          duration={scoreModal.duration}
          lists={lists}
          onClose={() => setScoreModal(null)}
          onAddedToList={onAddedToList}
          addToast={addToast}
          mode={mode}
          onScoreLoaded={(ticker, score) => score != null && setScoreCache(prev => ({ ...prev, [ticker]: score }))}
        />
      )}

      {/* Toast notifications */}
      <window.Toast toasts={toasts} remove={() => {}} />
    </div>
    {splashEl}
    </React.Fragment>
  );
}

/* ─── Full-screen transition splash between the two parts of the site ─── */
function SectionSplash({ label }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 26,
      background: 'var(--bg-base)',
      backgroundImage: 'radial-gradient(ellipse 70% 50% at 50% 30%, var(--accent-soft), transparent 65%)',
      animation: 'dxSplashWrap 1150ms ease both',
    }}>
      <div style={{ opacity: 0.55 }}><window.Logo size={44} wordmark={false} /></div>
      <div style={{
        font: '800 clamp(30px, 6vw, 58px)/1 var(--font-sans)',
        color: 'var(--text)', textAlign: 'center', padding: '0 20px',
        animation: 'dxSplashTitle 620ms cubic-bezier(0.2, 0.7, 0.2, 1) both',
      }}>{label}</div>
      <div style={{ width: 160, height: 3, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
        <div style={{ height: '100%', background: 'var(--accent)', transformOrigin: 'left', animation: 'dxSplashBar 1000ms ease both' }} />
      </div>
    </div>
  );
}

// Idempotent mount
(function mountApp() {
  const el = document.getElementById('root');
  if (!window.__dxAppRoot) window.__dxAppRoot = ReactDOM.createRoot(el);
  window.__dxAppRoot.render(<App />);
})();
