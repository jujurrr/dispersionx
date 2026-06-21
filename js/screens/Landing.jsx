/* ─── Landing / page de présentation — sections complètes + nav ancrée ─── */
function Landing() {
  const DS = window.DispersionXDesignSystem_cb86be;
  const { Button, Badge, MetricCard } = DS;
  const Icon = window.Icon;

  // ── Style helpers (cohérents avec le reste de l'app) ──
  const wrap = { maxWidth: 1140, width: '100%', margin: '0 auto' };
  const eyebrow = { font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent-hover)', marginBottom: 14 };
  const h2 = { font: 'var(--type-hero)', fontSize: 34, letterSpacing: 'var(--track-tight)', color: 'var(--text)', margin: 0, textWrap: 'balance' };
  const lede = { font: 'var(--type-body)', fontSize: 17, lineHeight: 1.6, color: 'var(--text-muted)', maxWidth: 680, margin: 0 };
  const sectionPad = { padding: '84px 32px', scrollMarginTop: 80 };

  const LINKS = [
    ['comprendre', 'Comprendre'],
    ['pourquoi', 'Pourquoi'],
    ['workflow', 'Workflow'],
    ['risques', 'Risques'],
    ['execution', 'Exécution'],
  ];
  function scrollTo(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ════════════════════════════ NAV ════════════════════════════
  function Nav() {
    return (
      <header style={{ position: 'sticky', top: 0, zIndex: 20, background: 'color-mix(in srgb, var(--bg-base) 82%, transparent)', backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ ...wrap, display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64, padding: '0 32px' }}>
          <span onClick={() => window.location.reload()} style={{ display: 'inline-flex', alignItems: 'center', gap: 11, cursor: 'pointer' }}>
            <window.Logo size={30} wordmark={false} />
            <span style={{ font: '800 16px/1 var(--font-sans)', letterSpacing: '-0.01em', color: 'var(--text)' }}>
              Dispersion<span style={{ color: 'var(--accent-hover)' }}>X</span>
            </span>
          </span>
          <nav style={{ display: 'flex', gap: 26, alignItems: 'center' }} className="dx-landing-nav">
            {LINKS.map(([id, label]) => (
              <a key={id} onClick={() => scrollTo(id)} style={{ font: 'var(--type-body-sm)', color: 'var(--text-soft)', cursor: 'pointer' }}>{label}</a>
            ))}
          </nav>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {window.SectionToggle ? <window.SectionToggle to="app" /> : null}
            {window.ThemeToggle ? <window.ThemeToggle /> : null}
            <Button variant="ghost" size="md" onClick={() => window.__dxNav && window.__dxNav('login')}>Connexion</Button>
            <Button variant="primary" size="md" onClick={() => window.__dxGo ? window.__dxGo('builder', 'Espace de création') : window.__dxNav && window.__dxNav('builder')}>Créer une stratégie</Button>
          </div>
        </div>
      </header>
    );
  }

  // ════════════════════════════ HERO ════════════════════════════
  function Hero() {
    return (
      <section style={{ position: 'relative', overflow: 'hidden', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 60% at 70% 0%, var(--accent-soft), transparent 60%), radial-gradient(ellipse 50% 50% at 10% 30%, var(--pos-soft), transparent 60%)' }} />
        <div style={{ ...wrap, position: 'relative', padding: '92px 32px 80px', display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 48, alignItems: 'center' }}>
          <div>
            <Badge tone="accent" size="md">Analyse de dispersion d'options</Badge>
            <h1 style={{ font: 'var(--type-hero)', fontSize: 48, letterSpacing: 'var(--track-tight)', color: 'var(--text)', margin: '20px 0 0', textWrap: 'balance' }}>
              Construisez des stratégies de dispersion avec une lecture claire de la volatilité et de la corrélation.
            </h1>
            <p style={{ ...lede, fontSize: 19, marginTop: 22 }}>
              Analysez un indice, sélectionnez ses composants, mesurez la prime de corrélation, construisez une stratégie vega-neutral et testez vos risques avant exécution.
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 32, flexWrap: 'wrap' }}>
              <Button variant="primary" size="lg" onClick={() => window.__dxGo ? window.__dxGo('builder', 'Espace de création') : window.__dxNav && window.__dxNav('builder')}>Créer une stratégie</Button>
              <Button variant="outline" size="lg" onClick={() => scrollTo('comprendre')}>Comprendre la dispersion</Button>
            </div>
            <div style={{ display: 'flex', gap: 24, marginTop: 30, font: 'var(--type-caption)', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
              <span>5 indices · SPX, NDX, DJI, CAC 40, DAX 40</span>
              <span>Mode Débutant & Avancé</span>
            </div>
          </div>
          <PayoffCard />
        </div>
      </section>
    );
  }

  function PayoffCard() {
    return (
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--neg)' }} />
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--warn)' }} />
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--pos)' }} />
          <span style={{ marginLeft: 8, font: 'var(--type-data-sm)', color: 'var(--text-muted)' }}>SPX · 31 DTE · dispersion</span>
        </div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 14 }}>
            <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 8 }}>Payoff estimé</div>
            <svg viewBox="0 0 320 90" width="100%" height="80">
              <defs><linearGradient id="pfL" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="rgba(38,166,154,0.35)" /><stop offset="100%" stopColor="rgba(38,166,154,0)" /></linearGradient></defs>
              <path d="M0 70 Q80 72 130 40 Q160 22 190 40 Q240 72 320 70" fill="none" stroke="var(--pos-bright)" strokeWidth="2" />
              <path d="M0 70 Q80 72 130 40 Q160 22 190 40 Q240 72 320 70 L320 90 L0 90 Z" fill="url(#pfL)" />
              <line x1="0" y1="70" x2="320" y2="70" stroke="var(--border)" strokeDasharray="3 3" />
            </svg>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <MetricCard label="Prime ρ" value="+6.4" unit="pts" accent="var(--pos)" />
            <MetricCard label="Vega net" value="−180" accent="var(--warn)" />
          </div>
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

  // ═══════════════════════ 1. COMPRENDRE ═══════════════════════
  const CAPTURE = [
    { icon: 'M3 3v18h18', t: 'Prime de corrélation', d: 'Comparer la corrélation implicite pricée par le marché à la corrélation réalisée observée sur les composants.' },
    { icon: 'M3 12h7l3-9 4 18 3-9h1', t: 'Écart indice / composants', d: "Identifier si la volatilité de l'indice est chère ou bon marché face à celle des single names." },
    { icon: 'M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M19 5l-3 3M8 16l-3 3', t: 'Mouvements idiosyncratiques', d: "Chercher des composants capables de bouger indépendamment de l'indice, moteur de la dispersion." },
  ];
  function Comprendre() {
    return (
      <section id="comprendre" style={{ ...sectionPad, ...wrap }}>
        <div style={eyebrow}>Comprendre la dispersion</div>
        <h2 style={h2}>Les options ne pricent pas que la volatilité.</h2>
        <p style={{ ...lede, fontSize: 18, marginTop: 18 }}>
          Les options d'indice et les options sur actions individuelles pricent aussi la <strong style={{ color: 'var(--text)' }}>corrélation</strong> entre les composants. Une stratégie de dispersion cherche à exploiter l'écart entre la volatilité de l'indice et celle des actions qui le composent.
        </p>
        <p style={{ ...lede, fontSize: 18, marginTop: 14 }}>
          Quand les actions bougent beaucoup individuellement mais que leurs mouvements se compensent, l'indice reste relativement stable. C'est précisément cette différence que la dispersion mesure et cherche à monétiser.
        </p>

        {/* Formule centrale */}
        <div style={{ marginTop: 28, background: 'var(--bg-card)', border: '1px solid var(--accent-border)', borderRadius: 'var(--radius-lg)', padding: '24px 28px', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ font: '700 26px/1.3 var(--font-mono)', color: 'var(--text)', whiteSpace: 'nowrap' }}>
            ρ<sub style={{ fontSize: 14, color: 'var(--info)' }}>implicite</sub> − ρ̂<sub style={{ fontSize: 14, color: 'var(--info)' }}>réalisée</sub>
            <span style={{ color: 'var(--text-dim)' }}> = </span>
            <span style={{ color: 'var(--pos-bright)' }}>prime de corrélation</span>
          </div>
          <div style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', flex: 1, minWidth: 240 }}>
            Une prime <strong style={{ color: 'var(--pos-bright)' }}>positive</strong> signifie que le marché price une synchronisation plus forte que celle réellement observée : un contexte historiquement favorable à la dispersion.
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginTop: 28 }}>
          {CAPTURE.map(c => (
            <div key={c.t} className="dx-ico-hover dx-lift" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24 }}>
              <div style={{ width: 40, height: 40, borderRadius: 'var(--radius)', background: 'var(--accent-soft)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-hover)', marginBottom: 16 }}>
                <Icon d={c.icon} />
              </div>
              <h3 style={{ font: 'var(--type-h3)', color: 'var(--text)', margin: '0 0 8px' }}>{c.t}</h3>
              <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: 0 }}>{c.d}</p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  // ═══════════════════════ 2. POURQUOI ═══════════════════════
  const WHY = [
    ['Analyse structurée', 'La stratégie est examinée sous plusieurs angles avant toute décision.'],
    ['Meilleure compréhension du risque', 'Grecs, theta, scénarios de stress et coûts rendus visibles.'],
    ['Construction vega-neutral', 'Équilibrage entre la jambe indice et le panier de composants.'],
    ['Scénarios de stress', 'Sell-off corrélé, vol crush, hausse IV — testés avant exécution.'],
    ['Lecture pédagogique', 'Explications « en clair » et tooltips pour les débutants sérieux.'],
    ['Outil avancé', 'Matrices, formules et exports pour les utilisateurs expérimentés.'],
  ];
  function Pourquoi() {
    return (
      <section id="pourquoi" style={{ background: 'var(--bg-surface)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ ...sectionPad, ...wrap }}>
          <div style={eyebrow}>Pourquoi cette approche est utile</div>
          <h2 style={{ ...h2, marginBottom: 14 }}>Elle oblige à analyser sous plusieurs angles.</h2>
          <p style={{ ...lede, marginBottom: 36 }}>Volatilité implicite, volatilité historique, corrélation, liquidité, grecs, theta, scénario de stress et coût d'exécution — chaque dimension est mesurée, jamais supposée.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            {WHY.map(([t, d]) => (
              <div key={t} className="dx-lift" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 22 }}>
                <h3 style={{ font: 'var(--type-title)', color: 'var(--text)', margin: '0 0 8px' }}>{t}</h3>
                <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: 0, lineHeight: 1.55 }}>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // ═══════════════════════ 3. WORKFLOW ═══════════════════════
  const STEPS = [
    ['1', 'Choisir un indice', 'SPX, NDX, DJI, CAC 40, DAX 40 — liquidité et caractéristiques.'],
    ['2', 'Analyser les composants', 'Score décomposé, IV/HV, β, filtres et avertissements earnings.'],
    ['3', 'Construire la liste', 'Constituer le panier, suivre le score pondéré et l\'edge moyen.'],
    ['4', 'Mesurer la corrélation', 'ρ implicite vs ρ̂ réalisée, prime, z-score et contributions.'],
    ['5', 'Construire la stratégie', 'Sizing vega-neutral entre la jambe indice et le panier.'],
    ['6', 'Tester le risque', 'Scénarios de stress, grecs, heatmap et coût bid/ask.'],
    ['7', 'Checklist & suivi', 'Valider, committer la position, snapshots et P&L en direct.'],
  ];
  function Workflow() {
    return (
      <section id="workflow" style={{ ...sectionPad, ...wrap }}>
        <div style={eyebrow}>Comment ça fonctionne</div>
        <h2 style={{ ...h2, marginBottom: 36 }}>De l'analyse à la stratégie, en sept étapes.</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {STEPS.map(([n, t, d]) => (
            <div key={n} style={{ position: 'relative', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '700 13px/1 var(--font-mono)', marginBottom: 14 }}>{n}</div>
              <div style={{ font: 'var(--type-title)', color: 'var(--text)', marginBottom: 6 }}>{t}</div>
              <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', lineHeight: 1.5 }}>{d}</div>
            </div>
          ))}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10, padding: 18 }}>
            <Button variant="primary" size="md" full onClick={() => window.__dxGo ? window.__dxGo('builder', 'Espace de création') : window.__dxNav && window.__dxNav('builder')}>Lancer le Builder</Button>
            <Button variant="outline" size="md" full onClick={() => window.__dxNav && window.__dxNav('docs')}>Voir les formules</Button>
          </div>
        </div>
      </section>
    );
  }

  // ═══════════════════════ 4. RISQUES ═══════════════════════
  const RISKS = [
    ['Sell-off corrélé', 'L\'indice baisse, sa volatilité monte et les composants suivent dans la même direction — le principal risque de la dispersion.'],
    ['Vol crush', 'La volatilité réalisée des composants s\'effondre ; les jambes long perdent leur valeur temps rapidement.'],
    ['Theta & échéance', 'À l\'approche de l\'expiration, la position peut perdre sa valeur temps plus vite qu\'anticipé.'],
    ['Coût d\'exécution', 'Le bid/ask aller-retour peut absorber une part significative de l\'edge théorique.'],
  ];
  const BOUNDARIES = ['Ne donne pas de conseil financier', 'Ne garantit aucune performance', 'Ne remplace pas Risk Navigator ni une validation humaine', "N'exécute jamais automatiquement sans contrôle"];
  function Risques() {
    return (
      <section id="risques" style={{ background: 'var(--bg-surface)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ ...sectionPad, ...wrap }}>
          <div style={eyebrow}>Les risques, rendus visibles</div>
          <h2 style={{ ...h2, marginBottom: 14 }}>Un portefeuille vega-neutral n'est pas sans risque.</h2>
          <p style={{ ...lede, marginBottom: 32 }}>La plateforme met en avant les scénarios défavorables avant toute validation. Comprendre où la stratégie peut perdre est aussi important que mesurer son edge.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
            {RISKS.map(([t, d]) => (
              <div key={t} style={{ display: 'flex', gap: 14, background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: '3px solid var(--neg)', borderRadius: 'var(--radius)', padding: '16px 18px' }}>
                <span style={{ color: 'var(--neg-bright)', flexShrink: 0, marginTop: 2 }}><Icon d="M12 2 2 7v6c0 5 4 8 10 9 6-1 10-4 10-9V7L12 2Z" size={18} /></span>
                <div>
                  <div style={{ font: 'var(--type-title)', color: 'var(--text)', marginBottom: 4 }}>{t}</div>
                  <div style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', lineHeight: 1.55 }}>{d}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'center' }}>
            <div>
              <div style={eyebrow}>Ce que le site ne fait pas</div>
              <h3 style={{ font: 'var(--type-h2)', color: 'var(--text)', margin: 0 }}>Un outil d'analyse, pas une promesse.</h3>
              <p style={{ ...lede, marginTop: 14 }}>DispersionX sert à analyser, construire, simuler et comprendre. L'exécution et la décision restent sous votre contrôle.</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {BOUNDARIES.map(t => (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px 16px' }}>
                  <span style={{ color: 'var(--neg-bright)', flexShrink: 0 }}><Icon d="M18 6 6 18M6 6l12 12" size={17} /></span>
                  <span style={{ font: 'var(--type-body-sm)', color: 'var(--text-soft)' }}>{t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // ═══════════════════════ 5. EXÉCUTION ═══════════════════════
  function Execution() {
    return (
      <section id="execution" style={{ ...sectionPad, ...wrap, textAlign: 'center' }}>
        <div style={{ ...eyebrow, textAlign: 'center' }}>Où exécuter la stratégie</div>
        <h2 style={{ ...h2, maxWidth: 720, margin: '0 auto 18px' }}>La construction ici, l'exécution sous votre contrôle.</h2>
        <p style={{ ...lede, margin: '0 auto', textAlign: 'center' }}>
          La stratégie peut être reproduite manuellement sur des plateformes d'options multi-jambes — notamment IBKR TWS ou OptionTrader. DispersionX reste agnostique : il prépare l'analyse et la construction, vous gardez la main sur l'exécution.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 26, flexWrap: 'wrap' }}>
          {['IBKR TWS', 'IBKR OptionTrader', 'Options multi-jambes'].map(p => (
            <Badge key={p} tone="neutral" size="md">{p}</Badge>
          ))}
        </div>
      </section>
    );
  }

  // ═══════════════════════ CTA FINAL + FOOTER ═══════════════════════
  function FinalCTA() {
    return (
      <section style={{ ...wrap, padding: '90px 32px', textAlign: 'center' }}>
        <h2 style={{ font: 'var(--type-hero)', fontSize: 40, letterSpacing: 'var(--track-tight)', color: 'var(--text)', maxWidth: 760, margin: '0 auto 28px', textWrap: 'balance' }}>
          Passez d'une idée de volatilité à une stratégie construite et testée.
        </h2>
        <Button variant="primary" size="lg" onClick={() => window.__dxGo ? window.__dxGo('builder', 'Espace de création') : window.__dxNav && window.__dxNav('builder')}>Lancer le Strategy Builder</Button>
      </section>
    );
  }

  function Footer() {
    return (
      <footer style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
        <div style={{ ...wrap, padding: '28px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <window.Logo size={24} wordmark={false} />
            <span style={{ font: '700 13px/1 var(--font-sans)', color: 'var(--text-soft)' }}>DispersionX</span>
          </span>
          <span style={{ font: 'var(--type-caption)', color: 'var(--text-muted)' }}>Outil d'analyse — ne constitue pas un conseil en investissement.</span>
        </div>
      </footer>
    );
  }

  return (
    <div>
      <Nav />
      <Hero />
      <Comprendre />
      <Pourquoi />
      <Workflow />
      <Risques />
      <Execution />
      <FinalCTA />
      <Footer />
    </div>
  );
}

window.Landing = Landing;
