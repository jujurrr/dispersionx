// Strategy Builder — stepped wizard. Renders 3 fully-built steps + the rail.
function Builder({ mode }) {
  const D = window.DXData;
  const { Stepper, Button, Badge, ScoreBadge, RiskBadge, MetricCard, CorrelationGauge, WarningPanel, BeginnerExplanationBox } = window.DispersionXDesignSystem_cb86be;
  const STEPS = ['Indice', 'Échéance', 'Univers', 'Composants', 'Corrélation', 'Construction', 'Risque', 'Synthèse'];
  const [step, setStep] = React.useState(3);

  // Final step renders the Trade Brief report directly
  if (step === 7) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '6px 10px' }}>
          <Stepper steps={STEPS} current={step} onStepClick={setStep} />
        </div>
        <window.TradeBrief />
      </div>
    );
  }

  const lead = {
    0: ['Choisir un indice', "Sélectionnez l'indice ou l'ETF proxy. La liquidité des options et la taille notionnelle conditionnent l'exécution."],
    3: ['Sélectionner les composants', 'Ces actions composeront la jambe single-name long straddle. Le score décompose liquidité, volatilité, dispersion, event risk et exécution.'],
    4: ['Corrélation et prime', "Comparez ce que le marché price (ρ implicite) à ce qui a été observé (ρ̂ réalisée). L'écart est la prime de corrélation — un signal à analyser."],
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
          <Button variant="ghost" size="md">Mode avancé</Button>
          <Button variant="primary" size="md" onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}>Continuer</Button>
        </div>
      </div>

      {step === 0 && <StepIndice D={D} />}
      {step === 3 && <StepComposants D={D} mode={mode} />}
      {step === 4 && <StepCorrelation D={D} mode={mode} />}
      {![0, 3, 4].includes(step) && (
        <div style={{ background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)', padding: 48, textAlign: 'center', font: 'var(--type-body)', color: 'var(--text-muted)' }}>
          Étape « {STEPS[step]} » — zone de sélection et de résultats.
        </div>
      )}
    </div>
  );

  function StepIndice() {
    const cards = [
      { t: 'SPY', n: 'S&P 500 ETF', d: 'Plus accessible, options liquides, taille plus petite.', tag: ['Débutant recommandé', 'pos'] },
      { t: 'SPX', n: 'Indice S&P 500', d: 'Très liquide, cash-settled, taille notionnelle élevée.', tag: ['Institutionnel', 'info'], on: true },
      { t: 'QQQ', n: 'Nasdaq 100 ETF', d: 'Exposition croissance / tech.', tag: ['Tech', 'neutral'] },
    ];
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        {cards.map((c) => (
          <div key={c.t} style={{
            background: 'var(--bg-card)', border: `1px solid ${c.on ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 'var(--radius-lg)', padding: 18, position: 'relative',
            boxShadow: c.on ? '0 0 0 3px var(--accent-soft)' : 'none', cursor: 'pointer',
          }}>
            <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: c.on ? 'var(--accent)' : 'transparent', borderRadius: '8px 0 0 8px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ font: '800 18px/1 var(--font-mono)', color: 'var(--text)' }}>{c.t}</span>
              <Badge tone={c.tag[1]}>{c.tag[0]}</Badge>
            </div>
            <div style={{ font: 'var(--type-title)', color: 'var(--text-soft)' }}>{c.n}</div>
            <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: '8px 0 0' }}>{c.d}</p>
          </div>
        ))}
      </div>
    );
  }

  function StepComposants() {
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
            <thead><tr style={{ background: 'var(--bg-elevated)' }}>
              {cols.map((h, i) => (
                <th key={h+i} style={{ textAlign: i === 0 || i === 1 ? 'left' : 'right', font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', padding: '10px 14px', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {D.components.map((c) => (
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
                  <td style={{ padding: '11px 14px', textAlign: 'right', font: 'var(--type-data-sm)', color: c.rho < 0.5 ? 'var(--pos-bright)' : 'var(--text-soft)' }}>{c.rho.toFixed(2)}</td>
                  {adv && <td style={{ padding: '11px 14px', textAlign: 'right', font: 'var(--type-data-sm)', color: 'var(--text-soft)' }}>−{(c.iv * 1.4).toFixed(0)}</td>}
                  <td style={{ padding: '11px 14px', textAlign: 'right' }}><div style={{ display: 'inline-block' }}><ScoreBadge score={c.score} max={0} label="" /></div></td>
                  <td style={{ padding: '11px 14px', textAlign: 'right' }}>
                    <input type="checkbox" defaultChecked={c.score > 65 && !c.earnings} style={{ accentColor: 'var(--accent)', width: 15, height: 15 }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  }

  function StepCorrelation() {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 18, alignItems: 'start' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 22, display: 'flex', justifyContent: 'center' }}>
          <CorrelationGauge implied={0.61} realized={0.48} size={250} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
            <MetricCard label="Corrélation implicite" value="0.61" hint="Ce que le marché price via les options" accent="var(--accent)" />
            <MetricCard label="Corrélation réalisée" value="0.48" hint="Observée historiquement sur les composants" accent="var(--info)" />
            <MetricCard label="Prime de corrélation" value="+6.4" unit="pts" delta="+1.2 vs 7j" accent="var(--pos)" />
            <MetricCard label="Lecture stratégique" value="Favorable" accent="var(--pos)" />
          </div>
          <WarningPanel tone="info" title="Lecture">
            La corrélation implicite (0.61) est supérieure à la réalisée (0.48) : l'indice price une synchronisation plus forte que celle observée récemment. Contexte favorable à une dispersion classique — un signal à analyser, jamais une garantie.
          </WarningPanel>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Badge tone="pos" dot>Prime élevée</Badge>
            <Badge tone="warn">ρ̂ réalisée en légère hausse</Badge>
            <Badge tone="neg">Risque sell-off corrélé</Badge>
          </div>
        </div>
      </div>
    );
  }
}

Object.assign(window, { Builder });
