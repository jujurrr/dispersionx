// App root — shell + screen routing
function App() {
  const [active, setActive] = React.useState('dashboard');
  const [mode, setMode] = React.useState('Débutant');

  const crumbMap = {
    dashboard: ['Dashboard'],
    builder: ['Strategy Builder', 'Composants'],
    risk: ['Risk Lab'],
    vol: ['Volatility Lab'],
    corr: ['Correlation Lab'],
    monitor: ['Strategy Monitor'],
    brief: ['Strategy Builder', 'Trade Brief'],
  };
  const crumbs = crumbMap[active] || [({ vol: 'Volatility Lab', screener: 'Screener', monitor: 'Strategy Monitor', journal: 'Journal', settings: 'Settings' })[active] || 'DispersionX'];

  let screen;
  if (active === 'dashboard') screen = <window.Dashboard mode={mode} />;
  else if (active === 'builder') screen = <window.Builder mode={mode} />;
  else if (active === 'risk') screen = <window.RiskLab mode={mode} />;
  else if (active === 'vol') screen = <window.VolatilityLab mode={mode} />;
  else if (active === 'corr') screen = <window.CorrelationLab mode={mode} />;
  else if (active === 'monitor') screen = <window.StrategyMonitor mode={mode} />;
  else if (active === 'brief') screen = <window.TradeBrief />;
  else screen = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', textAlign: 'center' }}>
      <div style={{ opacity: 0.6, marginBottom: 16 }}><window.Logo size={42} wordmark={false} /></div>
      <div style={{ font: 'var(--type-h3)', color: 'var(--text-soft)' }}>{crumbs[crumbs.length - 1]}</div>
      <div style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', maxWidth: 320, marginTop: 6 }}>
        Module de la plateforme — mêmes composants, mêmes conventions de lecture.
      </div>
    </div>
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'var(--sidebar-w) 1fr', height: '100vh', overflow: 'hidden' }}>
      <window.Sidebar active={active} onNav={setActive} />
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-base)' }}>
        <window.Topbar crumbs={crumbs} mode={mode} onMode={setMode} />
        <main style={{
          flex: 1, overflowY: 'auto', padding: '24px 28px 64px',
          backgroundImage: 'radial-gradient(ellipse 70% 50% at 80% -5%, var(--accent-soft), transparent 60%), radial-gradient(ellipse 50% 40% at 0% 10%, var(--pos-soft), transparent 55%)',
        }}>{screen}</main>
      </div>
    </div>
  );
}
// Idempotent mount — reuse the root across re-evaluations so the React tree
// is never torn down mid-animation (avoids the createRoot-twice warning and
// stalled entrance/count-up animations in bundled/standalone builds).
(function mountApp() {
  var el = document.getElementById('root');
  if (!window.__dxAppRoot) window.__dxAppRoot = ReactDOM.createRoot(el);
  window.__dxAppRoot.render(<App />);
})();
