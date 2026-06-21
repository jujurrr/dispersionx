// DispersionX marketing landing page. Composes DS primitives (Button, Badge).
// Read the bundle namespace at render time (not module-eval) to avoid a load race.
const DS = () => window.DispersionXDesignSystem_cb86be;

const wrap = { maxWidth: 1100, margin: '0 auto', padding: '0 32px' };
const eyebrow = { font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: 'var(--track-label)', color: 'var(--accent-hover)', marginBottom: 14 };
const h2 = { font: 'var(--type-display)', letterSpacing: 'var(--track-tight)', color: 'var(--text)', margin: 0 };
const lede = { font: 'var(--type-body)', fontSize: 16, lineHeight: 1.6, color: 'var(--text-soft)', maxWidth: 620 };

function Icon({ d, size = 20, color = 'currentColor' }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;
}

function Logo({ size = 30, height }) {
  const s = height || size;
  return (
    <span className="dx-logo" style={{ display: 'inline-flex', alignItems: 'center', gap: 11, cursor: 'pointer' }}>
      <span style={{ width: s, height: s, borderRadius: s * 0.22, background: 'var(--bg-elevated)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span className="dx-logo-arcs" style={{ display: 'inline-flex', transformOrigin: '50% 50%' }}>
          <svg width={s * 0.66} height={s * 0.66} viewBox="0 0 32 32" fill="none">
            <path d="M16 25 A9 9 0 0 1 16 7" stroke="var(--pos-bright)" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M16 27 A11 11 0 0 0 16 5" stroke="var(--accent-hover)" strokeWidth="2.4" strokeLinecap="round" />
            <circle cx="16" cy="16" r="2.8" fill="var(--text)" />
          </svg>
        </span>
      </span>
      <span style={{ font: '800 ' + (s * 0.6) + 'px/1 var(--font-sans)', letterSpacing: '-0.02em', color: 'var(--text)' }}>Dispersion<span style={{ color: 'var(--accent-hover)' }}>X</span></span>
    </span>
  );
}

function MktThemeToggle() {
  const [theme, setTheme] = React.useState(typeof window !== 'undefined' && window.DXTheme ? window.DXTheme.get() : 'dark');
  const [hover, setHover] = React.useState(false);
  const isDark = theme === 'dark';
  return (
    <button
      onClick={() => setTheme(window.DXTheme.toggle())}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      title={isDark ? 'Passer en thème clair (Café)' : 'Passer en thème sombre'}
      aria-label="Changer de thème"
      style={{
        width: 34, height: 34, borderRadius: 'var(--radius)', cursor: 'pointer',
        background: hover ? 'var(--bg-hover)' : 'transparent', border: '1px solid var(--border)',
        color: hover ? 'var(--accent-hover)' : 'var(--text-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all var(--dur-fast) var(--ease)',
      }}
    >
      <span style={{ display: 'inline-flex', transition: 'transform var(--dur) var(--ease)', transform: isDark ? 'none' : 'rotate(-90deg)' }}>
        {isDark
          ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
          : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>}
      </span>
    </button>
  );
}

function Nav() {
  const { Button } = DS();
  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 10, background: 'color-mix(in srgb, var(--bg-base) 82%, transparent)', backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--border-subtle)' }}>
      <div style={{ ...wrap, display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
        <Logo height={30} />
        <nav style={{ display: 'flex', gap: 26, alignItems: 'center' }}>
          {['Comprendre', 'Fonctionnalités', 'Workflow', 'Risques', 'Exécution'].map((l) => (
            <a key={l} style={{ font: 'var(--type-body-sm)', color: 'var(--text-soft)', cursor: 'pointer' }}>{l}</a>
          ))}
        </nav>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <MktThemeToggle />
          <Button variant="ghost" size="md">Connexion</Button>
          <Button variant="primary" size="md">Créer une stratégie</Button>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  const { Badge, Button } = DS();
  return (
    <section style={{ position: 'relative', overflow: 'hidden', borderBottom: '1px solid var(--border-subtle)' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 60% at 70% 0%, var(--accent-soft), transparent 60%), radial-gradient(ellipse 50% 50% at 10% 30%, var(--pos-soft), transparent 60%)' }} />
      <div style={{ ...wrap, position: 'relative', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center', padding: '72px 32px 80px' }}>
        <div>
          <div style={{ display: 'inline-flex' }}><Badge tone="accent" dot>Analyse de volatilité &amp; corrélation</Badge></div>
          <h1 style={{ font: 'var(--type-hero)', letterSpacing: 'var(--track-tight)', color: 'var(--text)', margin: '18px 0 0', textWrap: 'balance' }}>
            Construisez des stratégies de dispersion avec une lecture claire de la volatilité et de la corrélation.
          </h1>
          <p style={{ ...lede, margin: '20px 0 0' }}>
            Analysez un indice, sélectionnez ses composants, mesurez la prime de corrélation, construisez une stratégie vega-neutral et testez vos risques avant exécution.
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 30 }}>
            <Button variant="primary" size="lg">Créer une stratégie</Button>
            <Button variant="outline" size="lg">Comprendre la dispersion</Button>
          </div>
          <div style={{ display: 'flex', gap: 20, marginTop: 28, font: 'var(--type-caption)', color: 'var(--text-muted)' }}>
            <span>· 5 indices · SPX, NDX, DJI, CAC 40, DAX 40</span>
            <span>· Exécution manuelle compatible IBKR</span>
          </div>
        </div>
        <HeroMockup />
      </div>
    </section>
  );
}

function HeroMockup() {
  const { MetricCard } = DS();
  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--neg)' }} />
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--warn)' }} />
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--pos)' }} />
        <span style={{ marginLeft: 8, font: 'var(--type-data-sm)', color: 'var(--text-muted)' }}>SPX · 31 DTE · dispersion</span>
      </div>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* payoff curve */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 14 }}>
          <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 8 }}>Payoff estimé</div>
          <svg viewBox="0 0 320 90" width="100%" height="80">
            <defs><linearGradient id="pf" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="rgba(38,166,154,0.35)" /><stop offset="100%" stopColor="rgba(38,166,154,0)" /></linearGradient></defs>
            <path d="M0 70 Q80 72 130 40 Q160 22 190 40 Q240 72 320 70" fill="none" stroke="var(--pos-bright)" strokeWidth="2" />
            <path d="M0 70 Q80 72 130 40 Q160 22 190 40 Q240 72 320 70 L320 90 L0 90 Z" fill="url(#pf)" />
            <line x1="0" y1="70" x2="320" y2="70" stroke="var(--border)" strokeDasharray="3 3" />
          </svg>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <MetricCard label="Prime ρ" value="+6.4" unit="pts" accent="var(--pos)" />
          <MetricCard label="Vega net" value="−180" accent="var(--warn)" />
        </div>
        {/* mini components */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          {[['NVDA', '7.3%', '84'], ['TSLA', '1.9%', '88'], ['META', '2.9%', '82']].map((r, i) => (
            <div key={r[0]} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 14px', borderBottom: i < 2 ? '1px solid var(--border-subtle)' : 'none' }}>
              <span style={{ font: 'var(--type-ticker)', color: 'var(--text)' }}>{r[0]}</span>
              <span style={{ font: 'var(--type-data-sm)', color: 'var(--text-muted)' }}>{r[1]}</span>
              <span style={{ font: 'var(--type-data-sm)', color: 'var(--pos-bright)' }}>{r[2]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Problem() {
  return (
    <section style={{ ...wrap, padding: '80px 32px' }}>
      <div style={eyebrow}>Le problème</div>
      <h2 style={h2}>Les options ne pricent pas que la volatilité.</h2>
      <p style={{ ...lede, fontSize: 18, marginTop: 18 }}>
        Les options d'indice et les options sur actions individuelles pricent aussi la <strong style={{ color: 'var(--text)' }}>corrélation</strong> entre les composants. Une stratégie de dispersion cherche à analyser et exploiter l'écart entre la volatilité de l'indice et celle des actions qui le composent.
      </p>
      <p style={{ ...lede, fontSize: 18, marginTop: 16, color: 'var(--text-muted)' }}>
        Quand les actions bougent beaucoup individuellement mais que leurs mouvements se compensent, l'indice peut rester relativement stable. La dispersion cherche à mesurer cette différence.
      </p>
    </section>
  );
}

const CAPTURE = [
  { icon: 'M3 3v18h18', t: 'Prime de corrélation', d: 'Comparer la corrélation implicite du marché à la corrélation réalisée observée.' },
  { icon: 'M3 12h7l3-9 4 18 3-9h1', t: 'Écart indice / composants', d: "Identifier si la volatilité de l'indice est chère ou bon marché face aux single names." },
  { icon: 'M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M19 5l-3 3M8 16l-3 3', t: 'Mouvements idiosyncratiques', d: "Chercher des composants capables de bouger indépendamment de l'indice." },
];

function Capture() {
  const { Badge } = DS();
  return (
    <section style={{ background: 'var(--bg-surface)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
      <div style={{ ...wrap, padding: '72px 32px' }}>
        <div style={eyebrow}>Ce que la stratégie cherche à capter</div>
        <h2 style={{ ...h2, marginBottom: 36 }}>Trois angles, une même question.</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
          {CAPTURE.map((c) => (
            <div key={c.t} className="dx-ico-hover dx-lift" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24 }}>
              <div style={{ width: 40, height: 40, borderRadius: 'var(--radius)', background: 'var(--accent-soft)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-hover)', marginBottom: 16 }}>
                <Icon d={c.icon} />
              </div>
              <h3 style={{ font: 'var(--type-h3)', color: 'var(--text)', margin: '0 0 8px' }}>{c.t}</h3>
              <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: 0 }}>{c.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  ['1', 'Choisir un indice', 'SPX, NDX, DJI, CAC 40, DAX 40'],
  ['2', 'Choisir une échéance', '7 à 90 jours · DTE, theta, vega'],
  ['3', 'Sélectionner les composants', 'Score décomposé, filtres, warnings'],
  ['4', 'Calculer la prime', 'ρ implicite vs ρ̂ réalisée'],
  ['5', 'Construire & tester', 'Vega-neutral, scénarios de risque'],
];

function Workflow() {
  return (
    <section style={{ ...wrap, padding: '80px 32px' }}>
      <div style={eyebrow}>Comment ça fonctionne</div>
      <h2 style={{ ...h2, marginBottom: 36 }}>De l'analyse à la stratégie, en cinq étapes.</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12 }}>
        {STEPS.map(([n, t, d], i) => (
          <div key={n} style={{ position: 'relative', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '700 13px/1 var(--font-mono)', marginBottom: 14 }}>{n}</div>
            <div style={{ font: 'var(--type-title)', color: 'var(--text)', marginBottom: 6 }}>{t}</div>
            <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)' }}>{d}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

const WHY = [
  ['Analyse structurée', "La stratégie est examinée sous plusieurs angles avant toute décision."],
  ['Meilleure compréhension du risque', 'Grecs, theta, scénarios de stress et coûts rendus visibles.'],
  ['Construction vega-neutral', "Équilibrage entre la jambe indice et le panier de composants."],
  ['Scénarios de stress', 'Sell-off corrélé, vol crush, hausse IV — testés avant exécution.'],
  ['Lecture pédagogique', 'Explications « en clair » et tooltips pour les débutants sérieux.'],
  ['Outil avancé', 'Matrices, formules et exports pour les utilisateurs expérimentés.'],
];

function Why() {
  const { Badge } = DS();
  return (
    <section style={{ background: 'var(--bg-surface)', borderTop: '1px solid var(--border-subtle)' }}>
      <div style={{ ...wrap, padding: '72px 32px' }}>
        <div style={eyebrow}>Pourquoi cette approche est utile</div>
        <h2 style={{ ...h2, marginBottom: 14 }}>Elle oblige à analyser sous plusieurs angles.</h2>
        <p style={{ ...lede, marginBottom: 36 }}>Volatilité implicite, volatilité historique, corrélation, liquidité, grecs, theta, scénario de stress et coût d'exécution — chaque dimension est mesurée, jamais supposée.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
          {WHY.map(([t, d]) => (
            <div key={t} style={{ display: 'flex', gap: 12 }}>
              <div style={{ flexShrink: 0, marginTop: 2, color: 'var(--pos-bright)' }}><Icon d="M20 6 9 17l-5-5" size={18} /></div>
              <div>
                <div style={{ font: 'var(--type-title)', color: 'var(--text)', marginBottom: 5 }}>{t}</div>
                <div style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}>{d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Boundaries() {
  const items = [
    'Ne donne pas de conseil financier',
    'Ne garantit aucune performance',
    'Ne remplace pas Risk Navigator ni une validation humaine',
    "N'exécute jamais automatiquement sans contrôle",
  ];
  return (
    <section style={{ ...wrap, padding: '80px 32px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'center' }}>
        <div>
          <div style={eyebrow}>Ce que le site ne fait pas</div>
          <h2 style={h2}>Un outil d'analyse, pas une promesse.</h2>
          <p style={{ ...lede, marginTop: 18 }}>DispersionX sert à analyser, construire, simuler et comprendre. L'exécution et la décision restent sous votre contrôle.</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((t) => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px 16px' }}>
              <span style={{ color: 'var(--neg-bright)', flexShrink: 0 }}><Icon d="M18 6 6 18M6 6l12 12" size={17} /></span>
              <span style={{ font: 'var(--type-body-sm)', color: 'var(--text-soft)' }}>{t}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Execution() {
  const { Badge } = DS();
  return (
    <section style={{ background: 'var(--bg-surface)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
      <div style={{ ...wrap, padding: '72px 32px', textAlign: 'center' }}>
        <div style={{ ...eyebrow, textAlign: 'center' }}>Où exécuter la stratégie</div>
        <h2 style={{ ...h2, maxWidth: 720, margin: '0 auto 18px' }}>La construction ici, l'exécution sous votre contrôle.</h2>
        <p style={{ ...lede, margin: '0 auto', textAlign: 'center' }}>
          La stratégie peut être reproduite manuellement sur des plateformes d'options multi-jambes — notamment IBKR TWS ou OptionTrader. DispersionX reste agnostique : il prépare l'analyse et la construction, vous gardez la main sur l'exécution.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 26, flexWrap: 'wrap' }}>
          {['IBKR TWS', 'IBKR OptionTrader', 'Options multi-jambes'].map((p) => (
            <Badge key={p} tone="neutral" size="md">{p}</Badge>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  const { Button } = DS();
  return (
    <section style={{ ...wrap, padding: '90px 32px', textAlign: 'center' }}>
      <h2 style={{ font: 'var(--type-hero)', fontSize: 40, letterSpacing: 'var(--track-tight)', color: 'var(--text)', maxWidth: 760, margin: '0 auto 28px', textWrap: 'balance' }}>
        Passez d'une idée de volatilité à une stratégie construite et testée.
      </h2>
      <Button variant="primary" size="lg">Lancer le Strategy Builder</Button>
    </section>
  );
}

function Footer() {
  return (
    <footer style={{ background: 'var(--bg-surface)', borderTop: '1px solid var(--border-subtle)' }}>
      <div style={{ ...wrap, padding: '40px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 24 }}>
        <div style={{ maxWidth: 420 }}>
          <Logo height={30} />
          <p style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', marginTop: 14, lineHeight: 1.6 }}>
            Outil d'aide à la décision, pas un conseil financier. La dispersion peut perdre fortement en sell-off corrélé. Un portefeuille vega-neutral n'est pas sans risque.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 56 }}>
          {[['Produit', ['Fonctionnalités', 'Workflow', 'Risques', 'Exécution']], ['Ressources', ['Comprendre la dispersion', 'Formules & méthode', 'Connexion']]].map(([h, ls]) => (
            <div key={h}>
              <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 12 }}>{h}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {ls.map((l) => <a key={l} style={{ font: 'var(--type-body-sm)', color: 'var(--text-soft)', cursor: 'pointer' }}>{l}</a>)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}

function Landing() {
  return (
    <div>
      <Nav /><Hero /><Problem /><Capture /><Workflow /><Why /><Boundaries /><Execution /><FinalCTA /><Footer />
    </div>
  );
}
// Gate the mount until the DS bundle global is populated (avoids load race).
(function mount() {
  const ns = window.DispersionXDesignSystem_cb86be;
  if (!ns || !ns.Button || !ns.Badge || !ns.MetricCard) { return setTimeout(mount, 30); }
  ReactDOM.createRoot(document.getElementById('root')).render(<Landing />);
})();
