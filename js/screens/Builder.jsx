/* ─── Strategy Builder: 8-step wizard ──────────────────────────── */
function Builder({ listId, onNav, mode }) {
  const { Stepper, Badge, ScoreBadge, MetricCard, CorrelationGauge, WarningPanel, BeginnerExplanationBox } = window.DispersionXDesignSystem_cb86be;
  const STEPS = ['Indice', 'Échéance', 'Univers', 'Composants', 'Corrélation', 'Construction', 'Risque', 'Synthèse'];
  const [step, setStep] = React.useState(listId ? 3 : 0);
  const [list, setList] = React.useState(null);
  const [stratData, setStratData] = React.useState(null);
  const [selectedIndex, setSelectedIndex] = React.useState('SPX');
  const [selectedDuration, setSelectedDuration] = React.useState(30);
  const [selectedItems, setSelectedItems] = React.useState(new Set());
  const [building, setBuilding] = React.useState(false);

  React.useEffect(() => {
    if (listId) {
      DXApi.getList(listId).then(l => {
        setList(l);
        setSelectedIndex(l.index_symbol);
        if (l.items) setSelectedItems(new Set(l.items.map(i => i.ticker)));
      }).catch(() => {});
    }
  }, [listId]);

  const D = window.DXData;
  const components = D?.components || [];

  async function handleBuild() {
    setBuilding(true);
    try {
      const res = await DXApi.buildStrategy(listId, 'dispersion', 'vega_neutral', 1, selectedDuration, false);
      setStratData(res);
      setStep(7);
    } catch {
      setStratData(window.DXMock?.strategy);
      setStep(7);
    } finally {
      setBuilding(false);
    }
  }

  if (step === 7) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '6px 10px' }}>
          <Stepper steps={STEPS} current={step} onStepClick={setStep} />
        </div>
        <TradeBrief data={stratData} onNav={onNav} />
      </div>
    );
  }

  const lead = {
    0: ['Choisir un indice', "Sélectionnez l'indice ou l'ETF proxy. La liquidité des options et la taille notionnelle conditionnent l'exécution."],
    1: ['Choisir l\'échéance', 'La durée détermine le profil de risque : plus court = theta élevé, plus long = coût supérieur.'],
    2: ['Définir l\'univers', 'Filtrez les composants eligibles selon liquidité, secteur, et corrélation.'],
    3: ['Sélectionner les composants', 'Ces actions composeront la jambe single-name long straddle. Le score décompose liquidité, volatilité, dispersion, event risk et exécution.'],
    4: ['Corrélation et prime', "Comparez ce que le marché price (ρ implicite) à ce qui a été observé (ρ̂ réalisée). L'écart est la prime de corrélation."],
    5: ['Construction', 'Définissez les quantités et équilibrez le vega de la position.'],
    6: ['Évaluation du risque', 'Visualisez les scénarios de risque avant de valider la stratégie.'],
  }[step] || [STEPS[step], 'Étape du parcours de construction.'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '6px 10px' }}>
        <Stepper steps={STEPS} current={step} onStepClick={setStep} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ font: 'var(--type-h1)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: '0 0 6px' }}>{lead[0]}</h1>
          <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)', margin: 0, maxWidth: 640 }}>{lead[1]}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} style={{ font: '600 12px/1 var(--font-sans)', padding: '9px 16px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>← Retour</button>
          )}
          {step < 6 ? (
            <button onClick={() => setStep(s => Math.min(6, s + 1))} style={{ font: '600 12px/1 var(--font-sans)', padding: '9px 20px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}>Continuer →</button>
          ) : (
            <button onClick={handleBuild} disabled={building} style={{ font: '600 12px/1 var(--font-sans)', padding: '9px 20px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}>
              {building ? 'Construction…' : 'Construire la stratégie →'}
            </button>
          )}
        </div>
      </div>

      {step === 0 && <StepIndice selected={selectedIndex} onSelect={setSelectedIndex} />}
      {step === 1 && <StepDuration selected={selectedDuration} onSelect={setSelectedDuration} />}
      {step === 2 && <StepUniverse index={selectedIndex} />}
      {step === 3 && <StepComposants components={components} selected={selectedItems} onToggle={t => setSelectedItems(s => { const n = new Set(s); n.has(t) ? n.delete(t) : n.add(t); return n; })} mode={mode} />}
      {step === 4 && <StepCorrelation index={selectedIndex} />}
      {[5, 6].includes(step) && (
        <div style={{ background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)', padding: 48, textAlign: 'center', font: 'var(--type-body)', color: 'var(--text-muted)' }}>
          Étape « {STEPS[step]} » — configurez les paramètres puis continuez.
        </div>
      )}
    </div>
  );

  function StepIndice({ selected, onSelect }) {
    const cards = [
      { t: 'SPY', n: 'S&P 500 ETF', d: 'Plus accessible, options liquides, taille plus petite.', tag: ['Débutant recommandé', 'pos'] },
      { t: 'SPX', n: 'Indice S&P 500', d: 'Très liquide, cash-settled, taille notionnelle élevée.', tag: ['Institutionnel', 'info'] },
      { t: 'QQQ', n: 'Nasdaq 100 ETF', d: 'Exposition croissance / tech.', tag: ['Tech', 'neutral'] },
    ];
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {cards.map((c) => {
          const on = selected === c.t;
          return (
            <div key={c.t} onClick={() => onSelect(c.t)} style={{
              background: 'var(--bg-card)', border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-lg)', padding: 18, position: 'relative',
              boxShadow: on ? '0 0 0 3px var(--accent-soft)' : 'none', cursor: 'pointer',
            }}>
              <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: on ? 'var(--accent)' : 'transparent', borderRadius: '8px 0 0 8px' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ font: '800 18px/1 var(--font-mono)', color: 'var(--text)' }}>{c.t}</span>
                <Badge tone={c.tag[1]}>{c.tag[0]}</Badge>
              </div>
              <div style={{ font: 'var(--type-title)', color: 'var(--text-soft)' }}>{c.n}</div>
              <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: '8px 0 0' }}>{c.d}</p>
            </div>
          );
        })}
      </div>
    );
  }

  function StepDuration({ selected, onSelect }) {
    const durations = [
      { d: 14, label: '14 jours', desc: 'Theta élevé, décision rapide.' },
      { d: 30, label: '30 jours', desc: 'Équilibre standard. Recommandé.' },
      { d: 45, label: '45 jours', desc: 'Plus de temps, coût supérieur.' },
      { d: 60, label: '60 jours', desc: 'Long terme, adapté aux positions larges.' },
    ];
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {durations.map((item) => {
          const on = selected === item.d;
          return (
            <div key={item.d} onClick={() => onSelect(item.d)} style={{
              background: 'var(--bg-card)', border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-lg)', padding: 18, cursor: 'pointer', textAlign: 'center',
              boxShadow: on ? '0 0 0 3px var(--accent-soft)' : 'none',
            }}>
              <div style={{ font: '800 28px/1 var(--font-mono)', color: on ? 'var(--accent-hover)' : 'var(--text)', marginBottom: 8 }}>{item.d}</div>
              <div style={{ font: 'var(--type-title)', color: 'var(--text-soft)', marginBottom: 6 }}>{item.label}</div>
              <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)' }}>{item.desc}</div>
            </div>
          );
        })}
      </div>
    );
  }

  function StepUniverse({ index }) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['Exclure earnings proches', 'Spread max', 'Liquidité min', 'Secteur', 'ρ max'].map((f) => (
            <button key={f} style={{ font: '500 12px/1 var(--font-sans)', padding: '7px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-soft)', cursor: 'pointer' }}>{f} ▾</button>
          ))}
        </div>
        <div style={{ padding: 24, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', textAlign: 'center', color: 'var(--text-muted)', font: 'var(--type-body)' }}>
          Univers filtré : {index} — {(window.DXMock?.getComponents(index) || []).length || 10} composants eligibles après filtres.
        </div>
      </div>
    );
  }

  function StepComposants({ components, selected, onToggle, mode }) {
    const adv = mode === 'Avancé';
    const cols = adv
      ? ['Ticker', 'Secteur', 'Poids', 'IV', 'HV', 'ρ', 'Vega', 'Score', '']
      : ['Ticker', 'Secteur', 'Poids', 'IV / HV', 'ρ', 'Score', ''];
    return (
      <>
        {mode === 'Débutant' && (
          <BeginnerExplanationBox>
            Cherchez des composants capables de bouger indépendamment de l'indice (ρ plus faible) avec une IV correctement valorisée. Évitez les earnings proches : ils faussent le signal.
          </BeginnerExplanationBox>
        )}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['Exclure earnings proches', 'Spread max', 'Liquidité min', 'Secteur', 'ρ max'].map((f) => (
            <button key={f} style={{ font: '500 12px/1 var(--font-sans)', padding: '7px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-soft)', cursor: 'pointer' }}>{f} ▾</button>
          ))}
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', font: 'var(--type-body-sm)' }}>
            <thead>
              <tr style={{ background: 'var(--bg-elevated)' }}>
                {cols.map((h, i) => (
                  <th key={h + i} style={{ textAlign: i === 0 || i === 1 ? 'left' : 'right', font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', padding: '10px 14px', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {components.map((c) => (
                <tr key={c.t} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ font: 'var(--type-ticker)', color: 'var(--text)' }}>{c.t}{c.earnings && <span title="Earnings proche" style={{ color: 'var(--warn)', marginLeft: 6 }}>●</span>}</div>
                    <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)' }}>{c.n}</div>
                  </td>
                  <td style={{ padding: '11px 14px', font: 'var(--type-caption)', color: 'var(--text-muted)' }}>{c.sec}</td>
                  <td style={{ padding: '11px 14px', textAlign: 'right', font: 'var(--type-data-sm)', color: 'var(--text-soft)' }}>{c.w}%</td>
                  {adv ? <>
                    <td style={{ padding: '11px 14px', textAlign: 'right', font: 'var(--type-data-sm)', color: 'var(--text-soft)' }}>{c.iv}</td>
                    <td style={{ padding: '11px 14px', textAlign: 'right', font: 'var(--type-data-sm)', color: 'var(--text-muted)' }}>{c.hv}</td>
                  </> : (
                    <td style={{ padding: '11px 14px', textAlign: 'right', font: 'var(--type-data-sm)', color: 'var(--text-soft)' }}>{c.iv} / {c.hv}</td>
                  )}
                  <td style={{ padding: '11px 14px', textAlign: 'right', font: 'var(--type-data-sm)', color: (c.rho ?? 0.5) < 0.5 ? 'var(--pos-bright)' : 'var(--text-soft)' }}>{(c.rho ?? 0.5).toFixed(2)}</td>
                  {adv && <td style={{ padding: '11px 14px', textAlign: 'right', font: 'var(--type-data-sm)', color: 'var(--text-soft)' }}>−{(parseFloat(c.iv) * 1.4).toFixed(0)}</td>}
                  <td style={{ padding: '11px 14px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-block' }}><ScoreBadge score={c.score} max={0} label="" /></div>
                  </td>
                  <td style={{ padding: '11px 14px', textAlign: 'right' }}>
                    <input type="checkbox" checked={selected.has(c.t)} onChange={() => onToggle(c.t)} style={{ accentColor: 'var(--accent)', width: 15, height: 15 }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  }

  function StepCorrelation({ index }) {
    const corr = window.DXMock?.correlation || {};
    const rhoImpl = corr.rho_impl ?? 0.61;
    const rhoReal = corr.rho_real ?? 0.48;
    const prime = ((rhoImpl - rhoReal) * 100).toFixed(1);
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 18, alignItems: 'start' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 22, display: 'flex', justifyContent: 'center' }}>
          <CorrelationGauge implied={rhoImpl} realized={rhoReal} size={250} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            <MetricCard label="Corrélation implicite" value={rhoImpl.toFixed(2)} hint="Ce que le marché price via les options" accent="var(--accent)" />
            <MetricCard label="Corrélation réalisée" value={rhoReal.toFixed(2)} hint="Observée historiquement sur les composants" accent="var(--info)" />
            <MetricCard label="Prime de corrélation" value={(prime >= 0 ? '+' : '') + prime} unit="pts" accent="var(--pos)" />
            <MetricCard label="Lecture stratégique" value={parseFloat(prime) > 3 ? 'Favorable' : 'Neutre'} accent={parseFloat(prime) > 3 ? 'var(--pos)' : 'var(--warn)'} />
          </div>
          <WarningPanel tone="info" title="Lecture">
            La corrélation implicite ({rhoImpl.toFixed(2)}) est {parseFloat(prime) > 0 ? 'supérieure' : 'inférieure'} à la réalisée ({rhoReal.toFixed(2)}) — contexte {parseFloat(prime) > 3 ? 'favorable' : 'neutre'} à une dispersion classique.
          </WarningPanel>
        </div>
      </div>
    );
  }
}

/* ─── Trade Brief inlined (shown at step 7) ─────────────────────── */
function TradeBrief({ data, onNav }) {
  const { Badge, MetricCard, RiskBadge, WarningPanel, ScoreBadge } = window.DispersionXDesignSystem_cb86be;
  const D = data || window.DXData || {};
  const L = D.legs || { index: { t: 'SPX', strike: '5300', prime: '−18.4', vega: '−620', theta: '+96', qty: '1', action: 'Sell straddle', exp: '21 Nov 2025' }, basket: [] };

  const Section = ({ n, title, children }) => (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ font: 'var(--type-data-sm)', color: 'var(--text-dim)' }}>{n}</span>
        <h2 style={{ font: 'var(--type-h2)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: 0 }}>{title}</h2>
      </div>
      {children}
    </section>
  );

  const LegRow = ({ cols, head }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr repeat(4,1fr)', gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)', alignItems: 'center' }}>
      {cols.map((c, i) => (
        <span key={i} style={{
          font: head ? 'var(--type-label)' : (i === 0 ? 'var(--type-ticker)' : 'var(--type-data-sm)'),
          textTransform: head ? 'uppercase' : 'none', letterSpacing: head ? '0.06em' : 0,
          color: head ? 'var(--text-muted)' : (i === 0 ? 'var(--text)' : 'var(--text-soft)'),
          textAlign: i === 0 ? 'left' : 'right',
        }}>{c}</span>
      ))}
    </div>
  );

  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div style={{ maxWidth: 940, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 30 }}>
      {/* Report header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, borderBottom: '1px solid var(--border)', paddingBottom: 20 }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ font: 'var(--type-h1)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: 0, whiteSpace: 'nowrap' }}>Trade Brief</h1>
            <Badge tone="info">Brouillon</Badge>
          </div>
          <div style={{ font: 'var(--type-data-sm)', color: 'var(--text-muted)', marginTop: 8 }}>
            {D.index_symbol || 'SPX'} · dispersion · {D.duration || 30} DTE · généré le {today}
          </div>
        </div>
        <ScoreBadge score={D.score || 82} size="lg" />
      </div>

      {/* Résumé */}
      <Section n="01" title="Résumé">
        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderLeft: '3px solid var(--accent)', borderRadius: 'var(--radius)', padding: '16px 18px', font: 'var(--type-body)', fontSize: 16, lineHeight: 1.6, color: 'var(--text-soft)' }}>
          Vous <strong style={{ color: 'var(--text)' }}>vendez la volatilité de l'indice</strong> (short straddle {D.index_symbol || 'SPX'}) et <strong style={{ color: 'var(--text)' }}>achetez la volatilité des composants</strong> (long straddles). La stratégie est approximativement <strong style={{ color: 'var(--pos-bright)' }}>vega-neutral</strong> et <strong style={{ color: 'var(--text)' }}>short corrélation</strong> : elle profite si les composants se dispersent davantage que ce que l'indice price.
        </div>
      </Section>

      {/* Construction */}
      <Section n="02" title="Construction">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: 16, alignItems: 'start' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', background: 'var(--bg-elevated)', font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--neg-bright)' }}>Jambe indice · short</div>
            <LegRow head cols={['', 'Prime', 'Vega', 'Theta', 'Qté']} />
            <LegRow cols={[`${L.index.t} ${L.index.strike}`, L.index.prime, L.index.vega, L.index.theta, L.index.qty]} />
            <div style={{ padding: '12px 14px', font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}>{L.index.action} · {L.index.exp}</div>
          </div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', background: 'var(--bg-elevated)', font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--pos-bright)' }}>Panier composants · long</div>
            <LegRow head cols={['', 'Prime', 'Vega', 'Theta', 'Qté']} />
            {(L.basket || []).map((b) => <LegRow key={b.t} cols={[b.t, b.prime, b.vega, b.theta, b.qty]} />)}
          </div>
        </div>
        {/* Vega balance */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 16, marginTop: 14 }}>
          <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 12 }}>Équilibrage vega</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ font: 'var(--type-data-sm)', color: 'var(--neg-bright)', width: 110 }}>Indice −620</span>
            <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'var(--bg-elevated)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '49%', background: 'var(--neg)' }} />
              <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '46%', background: 'var(--pos)' }} />
              <div style={{ position: 'absolute', left: '50%', top: -2, bottom: -2, width: 2, background: 'var(--text)' }} />
            </div>
            <span style={{ font: 'var(--type-data-sm)', color: 'var(--pos-bright)', width: 130, textAlign: 'right' }}>Composants +572</span>
          </div>
          <div style={{ textAlign: 'center', marginTop: 10 }}>
            <span style={{ font: '700 11px/1 var(--font-mono)', padding: '3px 8px', borderRadius: 'var(--radius)', background: 'var(--pos-soft)', border: '1px solid var(--pos)', color: 'var(--pos-bright)' }}>Vega net −48 · quasi-neutre</span>
          </div>
        </div>
      </Section>

      {/* Pourquoi / risques */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <Section n="03" title="Pourquoi ce trade ?">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {['Prime de corrélation positive (+6.4 pts)', 'ρ implicite (0.61) > ρ̂ réalisée (0.48)', 'Composants à faible ρ disponibles', 'Position quasi vega-neutral'].map((t) => (
              <div key={t} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--pos-bright)', marginTop: 2, flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                </span>
                <span style={{ font: 'var(--type-body-sm)', color: 'var(--text-soft)' }}>{t}</span>
              </div>
            ))}
          </div>
        </Section>
        <Section n="04" title="Ce qui peut mal se passer">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {[['Sell-off corrélé', 'critique'], ['Vol crush sur les composants', 'élevé'], ['Theta négatif sur le panier', 'modéré'], ['Earnings pendant la vie du trade', 'modéré']].map(([t, lv]) => (
              <div key={t} style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ font: 'var(--type-body-sm)', color: 'var(--text-soft)' }}>{t}</span>
                <RiskBadge level={lv} size="sm" />
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* Données clés */}
      <Section n="05" title="Données clés">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <MetricCard label="Prime ρ" value="+6.4" unit="pts" accent="var(--pos)" />
          <MetricCard label="Vega net" value="−48" accent="var(--pos)" />
          <MetricCard label="Theta /jour" value="+96" unit="$" accent="var(--warn)" />
          <MetricCard label="Prime nette" value="+1 240" unit="$" accent="var(--accent)" />
          <MetricCard label="Composants" value={String((L.basket || []).length || 5)} accent="var(--info)" />
          <MetricCard label="Couverture indice" value="21" unit="%" accent="var(--info)" />
          <MetricCard label="Coût estimé" value="−310" unit="$" accent="var(--neg)" />
          <MetricCard label="Pire scénario" value="−3 420" unit="$" accent="var(--neg)" />
        </div>
      </Section>

      {/* Checklist */}
      <Section n="06" title="Checklist avant exécution">
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '6px 16px' }}>
          {['IV vérifiée sur source réelle (IBKR) — actuellement estimée', 'Aucun earnings non désiré dans la fenêtre', 'Spread bid/ask acceptable sur chaque jambe', 'Vega net dans la tolérance cible', 'Scénario sell-off corrélé compris et accepté', 'Taille de position validée'].map((t, i) => (
            <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: i < 5 ? '1px solid var(--border-subtle)' : 'none', cursor: 'pointer' }}>
              <input type="checkbox" defaultChecked={i > 0 && i < 4} style={{ accentColor: 'var(--accent)', width: 16, height: 16 }} />
              <span style={{ font: 'var(--type-body-sm)', color: 'var(--text-soft)' }}>{t}</span>
            </label>
          ))}
        </div>
        <WarningPanel tone="warn" title="Avant tout trade" style={{ marginTop: 12 }}>
          L'IV est actuellement estimée depuis la HV. Branchez IBKR pour des valeurs réelles avant de préparer l'exécution. Outil d'aide à la décision, pas un conseil financier.
        </WarningPanel>
      </Section>

      {/* Export */}
      <Section n="07" title="Export & suite">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button style={{ font: '600 13px/1 var(--font-sans)', padding: '10px 20px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}>Préparer pour exécution manuelle</button>
          <button style={{ font: '600 12px/1 var(--font-sans)', padding: '9px 16px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>Sauvegarder</button>
          <button onClick={() => onNav && onNav('monitor')} style={{ font: '600 12px/1 var(--font-sans)', padding: '9px 16px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>Ouvrir dans le monitor</button>
        </div>
      </Section>
    </div>
  );
}

window.Builder = Builder;
window.TradeBrief = TradeBrief;
