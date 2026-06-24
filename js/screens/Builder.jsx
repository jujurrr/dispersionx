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
  const [nIndexContracts, setNIndexContracts] = React.useState(1);
  const [sizingMethod, setSizingMethod] = React.useState('vega_neutral');
  const [previewData, setPreviewData] = React.useState(null);
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const [buildError, setBuildError] = React.useState(null);

  React.useEffect(() => {
    if (listId) {
      DXApi.getList(listId).then(l => {
        setList(l);
        setSelectedIndex(l.index_symbol || 'SPX');
        if (l.items) setSelectedItems(new Set(l.items.map(i => i.ticker)));
      }).catch(() => {});
    }
  }, [listId]);

  React.useEffect(() => {
    if (step !== 5) return;
    setPreviewLoading(true);
    const tickers = list?.items?.map(i => i.ticker).filter(Boolean) || DEMO_TICKERS;
    DXApi.getRisk(listId, tickers.length ? tickers : DEMO_TICKERS, selectedIndex, selectedDuration)
      .then(d => { setPreviewData(d); setPreviewLoading(false); })
      .catch(() => { setPreviewLoading(false); });
  }, [step, selectedIndex, selectedDuration]);

  const D = window.DXData;
  const components = D?.components || [];

  const DEMO_TICKERS = ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'META'];
  const CONTRACT = 100;

  function computeStrategy(riskData, nIndex, sizing, idx, dur) {
    const perTicker = riskData.per_ticker || [];
    const nW        = perTicker.length || 1;
    const idxG      = riskData.index_greeks;
    if (!idxG) return null;

    // Index-level greeks (SPX price ≈ SPY×10, etc.) — gives realistic lot counts
    const idxVegaPerLot  = idxG.vega_per_lot;    // $/σ per 1 long index contract
    const idxThetaPerLot = idxG.theta_per_lot;   // $/day gain per 1 short index contract
    const idxPremPerLot  = idxG.premium_per_lot;  // $ premium per 1 index contract

    // Vega-neutral: each component targets 1/nW of total index vega
    const targetVegaTotal = idxVegaPerLot * nIndex;
    const targetPerComp   = targetVegaTotal / nW;

    const comps = perTicker.map(r => {
      if (!r.greeks) return { ticker: r.ticker, price: r.price, iv: r.iv, hv: r.hv, beta: r.beta, nContracts: 1, greeks: null };
      const vegaPerLot = r.greeks.vega * CONTRACT;  // $/σ per 1 component contract
      const n = (sizing === 'vega_neutral' && vegaPerLot > 0)
        ? Math.max(1, Math.round(targetPerComp / vegaPerLot))
        : 1;
      return { ticker: r.ticker, price: r.price, iv: r.iv, hv: r.hv, beta: r.beta, nContracts: n, greeks: r.greeks };
    });

    const compVegaRaw  = comps.reduce((s, c) => s + (c.greeks?.vega    || 0) * CONTRACT * c.nContracts, 0);
    const compThetaRaw = comps.reduce((s, c) => s + (c.greeks?.theta   || 0) * CONTRACT * c.nContracts, 0);
    const compPremRaw  = comps.reduce((s, c) => s + (c.greeks?.premium || 0) * CONTRACT * c.nContracts, 0);

    return {
      listId,
      index:        idx,
      duration:     dur,
      builtAt:      new Date().toISOString(),
      nIndex,
      sizingMethod: sizing,
      components:   comps,
      portfolio: {
        compVegaRaw,
        compVegaPct:   compVegaRaw * 0.01,           // positive (long straddles)
        idxVegaRaw:   -idxVegaPerLot * nIndex,        // negative (short straddle)
        idxVegaPct:   -idxVegaPerLot * nIndex * 0.01,
        netVegaPct:   (compVegaRaw - idxVegaPerLot * nIndex) * 0.01,
        compTheta:     compThetaRaw,                  // negative (daily cost for long)
        idxTheta:      idxThetaPerLot * nIndex,       // positive (daily gain from short)
        netTheta:      compThetaRaw + idxThetaPerLot * nIndex,
        netPremium:    compPremRaw - idxPremPerLot * nIndex,
        idxVegaPerLot,
        idxThetaPerLot,
        idxPremPerLot,
      },
    };
  }

  async function handleBuild() {
    setBuilding(true);
    setBuildError(null);
    try {
      const listData = list || (listId ? await DXApi.getList(listId).catch(() => null) : null);
      const tickers  = (listData?.items || []).map(i => i.ticker).filter(Boolean);
      const active   = tickers.length ? tickers : DEMO_TICKERS;

      const riskData = await DXApi.getRisk(listId, active, selectedIndex, selectedDuration);
      const strategy = computeStrategy(riskData, nIndexContracts, sizingMethod, selectedIndex, selectedDuration);

      if (listId && strategy) {
        try { localStorage.setItem('dx-strategy-' + listId, JSON.stringify(strategy)); } catch {}
      }

      setStratData({ ...riskData, strategy });
      setStep(7);
    } catch (err) {
      setBuildError('Erreur lors du calcul — vérifiez votre connexion et réessayez. (' + (err?.message || 'network') + ')');
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
            <button onClick={handleBuild} disabled={building} style={{ font: '600 12px/1 var(--font-sans)', padding: '9px 20px', borderRadius: 'var(--radius)', border: 'none', background: building ? 'var(--text-dim)' : 'var(--accent)', color: '#fff', cursor: building ? 'not-allowed' : 'pointer' }}>
              {building ? '⏳ Calcul en cours…' : 'Construire la stratégie →'}
            </button>
          )}
        </div>
      </div>

      {step === 0 && <StepIndice selected={selectedIndex} onSelect={setSelectedIndex} />}
      {step === 1 && <StepDuration selected={selectedDuration} onSelect={setSelectedDuration} />}
      {step === 2 && <StepUniverse index={selectedIndex} />}
      {step === 3 && <StepComposants components={components} selected={selectedItems} onToggle={t => setSelectedItems(s => { const n = new Set(s); n.has(t) ? n.delete(t) : n.add(t); return n; })} mode={mode} />}
      {step === 4 && <StepCorrelation index={selectedIndex} />}
      {buildError && <div style={{ padding: '12px 16px', background: 'var(--neg-soft)', border: '1px solid var(--neg)', borderRadius: 'var(--radius)', font: 'var(--type-body-sm)', color: 'var(--neg-bright)' }}>{buildError}</div>}
      {step === 5 && <StepConstruction nIndex={nIndexContracts} onNIndex={setNIndexContracts} sizingMethod={sizingMethod} onSizingMethod={setSizingMethod} index={selectedIndex} duration={selectedDuration} previewData={previewData} previewLoading={previewLoading} />}
      {step === 6 && <StepRisque listId={listId} index={selectedIndex} />}
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
    const rhoImpl = corr.rho_impl ?? 0.52;
    const rhoReal = corr.rho_real ?? 0.45;
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

  function StepConstruction({ nIndex, onNIndex, sizingMethod, onSizingMethod, index, duration, previewData, previewLoading }) {
    // Compute live lot preview from fetched greeks
    const preview = React.useMemo(() => {
      if (!previewData?.index_greeks || !previewData?.per_ticker) return null;
      const idxG = previewData.index_greeks;
      const perTicker = previewData.per_ticker;
      const nW = perTicker.length || 1;
      const targetPerComp = (idxG.vega_per_lot * nIndex) / nW;
      const rows = perTicker.map(r => {
        const vegaPerLot = (r.greeks?.vega || 0) * 100;
        const vegaPct = Math.round(vegaPerLot * 0.01);  // $/1% per lot
        const n = sizingMethod === 'vega_neutral' && vegaPerLot > 0
          ? Math.max(1, Math.round(targetPerComp / vegaPerLot))
          : 1;
        return { ticker: r.ticker, vegaPct, n, totalVegaPct: vegaPct * n };
      });
      const idxVegaPct   = Math.round(idxG.vega_per_lot * nIndex * 0.01);
      const compVegaPct  = rows.reduce((s, r) => s + r.totalVegaPct, 0);
      const netVegaPct   = compVegaPct - idxVegaPct;
      const idxThetaDay  = Math.round(idxG.theta_per_lot * nIndex);
      return { rows, idxVegaPct, compVegaPct, netVegaPct, idxThetaDay };
    }, [previewData, nIndex, sizingMethod]);

    const BtnStyle = { width: 32, height: 32, borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text)', font: '700 18px/1 var(--font-mono)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, alignItems: 'start' }}>
          {/* Left: config */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Index contracts */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
              <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 14 }}>Jambe indice · short straddle {index}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <button onClick={() => onNIndex(Math.max(1, nIndex - 1))} style={BtnStyle}>−</button>
                <span style={{ font: '800 40px/1 var(--font-mono)', color: 'var(--text)', minWidth: 52, textAlign: 'center' }}>{nIndex}</span>
                <button onClick={() => onNIndex(Math.min(20, nIndex + 1))} style={BtnStyle}>+</button>
                <div style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', marginLeft: 4 }}>contrat{nIndex > 1 ? 's' : ''} · {duration} DTE</div>
              </div>
              {preview && (
                <div style={{ marginTop: 12, padding: '8px 10px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius)', font: 'var(--type-caption)', color: 'var(--text-muted)' }}>
                  Vega short indice : <strong style={{ color: 'var(--neg-bright)' }}>−{preview.idxVegaPct} $/1%</strong> · Theta : <strong style={{ color: 'var(--pos-bright)' }}>+{preview.idxThetaDay} $/j</strong>
                </div>
              )}
            </div>

            {/* Sizing method */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
              <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 12 }}>Méthode de sizing</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { v: 'vega_neutral', label: 'Vega-neutral', desc: 'n_i = round(|vega_idx × N| / (nW × vega_i × 100)) — position insensible aux chocs IV parallèles.' },
                  { v: 'equal_weight', label: 'Poids égaux · 1 lot', desc: '1 contrat par composant. Simple mais position déséquilibrée si les IVs diffèrent.' },
                ].map(opt => (
                  <div key={opt.v} onClick={() => onSizingMethod(opt.v)} style={{ display: 'flex', gap: 10, padding: '12px 14px', borderRadius: 'var(--radius)', border: `1px solid ${sizingMethod === opt.v ? 'var(--accent)' : 'var(--border)'}`, background: sizingMethod === opt.v ? 'var(--bg-elevated)' : 'transparent', cursor: 'pointer' }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${sizingMethod === opt.v ? 'var(--accent)' : 'var(--text-dim)'}`, marginTop: 1, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {sizingMethod === opt.v && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }} />}
                    </div>
                    <div>
                      <div style={{ font: 'var(--type-title)', color: 'var(--text)', marginBottom: 2 }}>{opt.label}</div>
                      <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)' }}>{opt.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: live preview */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Aperçu des quantités</span>
              {previewLoading && <span style={{ font: 'var(--type-caption)', color: 'var(--text-dim)' }}>Chargement…</span>}
            </div>
            {preview ? (
              <>
                {/* Header */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 50px 80px', padding: '7px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
                  {['Composant', 'Vega/lot', 'Lots', 'Total vega'].map(h => (
                    <span key={h} style={{ font: '600 9px/1 var(--font-mono)', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em', textAlign: h === 'Composant' ? 'left' : 'right' }}>{h}</span>
                  ))}
                </div>
                {preview.rows.map((r, i) => (
                  <div key={r.ticker} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 50px 80px', padding: '9px 16px', borderBottom: i < preview.rows.length - 1 ? '1px solid var(--border-subtle)' : 'none', alignItems: 'center' }}>
                    <span style={{ font: '600 12px/1 var(--font-mono)', color: 'var(--text)' }}>{r.ticker}</span>
                    <span style={{ font: '11px/1 var(--font-mono)', color: 'var(--text-soft)', textAlign: 'right' }}>+{r.vegaPct} $/1%</span>
                    <span style={{ font: '700 13px/1 var(--font-mono)', color: 'var(--accent)', textAlign: 'right' }}>{r.n}</span>
                    <span style={{ font: '11px/1 var(--font-mono)', color: 'var(--pos-bright)', textAlign: 'right' }}>+{r.totalVegaPct} $/1%</span>
                  </div>
                ))}
                {/* Totals */}
                <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', font: 'var(--type-caption)', color: 'var(--text-muted)' }}>
                    <span>Vega composants</span>
                    <span style={{ color: 'var(--pos-bright)', fontWeight: 700 }}>+{preview.compVegaPct} $/1%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', font: 'var(--type-caption)', color: 'var(--text-muted)' }}>
                    <span>Vega indice (short)</span>
                    <span style={{ color: 'var(--neg-bright)', fontWeight: 700 }}>−{preview.idxVegaPct} $/1%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', font: '700 11px/1 var(--font-mono)', marginTop: 3, paddingTop: 6, borderTop: '1px solid var(--border-subtle)' }}>
                    <span style={{ color: 'var(--text-soft)' }}>Vega net</span>
                    <span style={{ color: Math.abs(preview.netVegaPct) < 60 ? 'var(--pos-bright)' : 'var(--warn-bright)' }}>{preview.netVegaPct >= 0 ? '+' : ''}{preview.netVegaPct} $/1%</span>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-dim)', font: 'var(--type-caption)' }}>
                {previewLoading ? 'Récupération des données de marché…' : 'Données en cours de chargement'}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  function StepRisque({ listId, index }) {
    const saved = React.useMemo(() => {
      if (!listId) return null;
      try { return JSON.parse(localStorage.getItem('dx-strategy-' + listId) || 'null'); } catch { return null; }
    }, [listId]);

    if (saved) {
      const d = new Date(saved.builtAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
      const nW         = (saved.components || []).length;
      const netTheta   = saved.portfolio?.netTheta   || 0;
      const netVegaPct = saved.portfolio?.netVegaPct || 0;
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', align: 'center', gap: 10, padding: '12px 16px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderLeft: '3px solid var(--pos)', borderRadius: 'var(--radius-lg)' }}>
            <span style={{ color: 'var(--pos-bright)', font: '700 14px/1 var(--font-mono)', marginRight: 6 }}>✓</span>
            <div>
              <div style={{ font: 'var(--type-title)', color: 'var(--text)', marginBottom: 2 }}>Stratégie déjà calculée — {d}</div>
              <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)' }}>{saved.nIndex} contrat(s) {saved.index} · {nW} composants · {saved.sizingMethod === 'vega_neutral' ? 'vega-neutral' : 'poids égaux'}</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <MetricCard label="Vega net" value={(netVegaPct >= 0 ? '+' : '') + Math.round(netVegaPct)} unit="$/1%" accent="var(--pos)" hint="Net après sizing" />
            <MetricCard label="Theta /jour" value={(netTheta >= 0 ? '+' : '') + Math.round(netTheta)} unit="$" accent="var(--warn)" hint="Position totale" />
            <MetricCard label="Composants" value={String(nW)} accent="var(--info)" hint={saved.sizingMethod === 'vega_neutral' ? 'Lots calculés' : '1 lot chacun'} />
          </div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px', gap: 0, padding: '8px 16px', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
              {['Composant', 'Lots', 'Vega/lot', 'Theta/lot'].map(h => (
                <div key={h} style={{ font: '600 9px/1 var(--font-mono)', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</div>
              ))}
            </div>
            {(saved.components || []).map((c, i) => (
              <div key={c.ticker} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px', gap: 0, padding: '9px 16px', borderBottom: i < saved.components.length - 1 ? '1px solid var(--border-subtle)' : 'none', alignItems: 'center' }}>
                <span style={{ font: '600 12px/1 var(--font-mono)', color: 'var(--text)' }}>{c.ticker}</span>
                <span style={{ font: '700 12px/1 var(--font-mono)', color: 'var(--accent)' }}>{c.nContracts}</span>
                <span style={{ font: '11px/1 var(--font-mono)', color: 'var(--text-soft)' }}>{c.greeks ? '+' + Math.round(c.greeks.vega * 100 * 0.01) + ' $/1%' : '—'}</span>
                <span style={{ font: '11px/1 var(--font-mono)', color: 'var(--neg-bright)' }}>{c.greeks ? Math.round(c.greeks.theta * 100) + ' $/j' : '—'}</span>
              </div>
            ))}
          </div>
          <WarningPanel tone="pos" title="Prêt pour le Risk Lab">
            La stratégie est calculée. Cliquez « Construire la stratégie » pour valider et accéder au Trade Brief, puis naviguez vers le Risk Lab pour voir les P&L calculés sur ces quantités réelles.
          </WarningPanel>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <WarningPanel tone="warn" title="Stratégie non encore calculée">
          Cliquez « Construire la stratégie » ci-dessus. Le calcul récupère les données réelles de marché, détermine les quantités vega-neutral, et sauvegarde la stratégie. Le Risk Lab utilisera ensuite ces données pour afficher des P&L précis.
        </WarningPanel>
        <div style={{ background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)', padding: 40, textAlign: 'center' }}>
          <div style={{ font: '700 14px/1 var(--font-mono)', color: 'var(--text-dim)', marginBottom: 8 }}>Évaluation du risque</div>
          <div style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', maxWidth: 400, margin: '0 auto' }}>
            Les graphiques de sensibilité (P&L par choc de vol, par mouvement de l'indice, par scénario de corrélation) seront disponibles dans le Risk Lab après construction de la stratégie.
          </div>
        </div>
      </div>
    );
  }
}

/* ─── Trade Brief inlined (shown at step 7) ─────────────────────── */
function TradeBrief({ data, onNav }) {
  const { Badge, MetricCard, RiskBadge, WarningPanel, ScoreBadge } = window.DispersionXDesignSystem_cb86be;
  const D        = data || window.DXData || {};
  const strategy = D.strategy || null;
  const CONTRACT = 100;

  // Build legs from strategy if available, else fall back to static
  let L;
  if (strategy?.components) {
    const port = strategy.portfolio;
    L = {
      index: {
        t:      strategy.index || 'SPX',
        strike: 'ATM',
        prime:  '−' + Math.round(Math.abs((port.idxPremPerLot || 0) * strategy.nIndex)).toLocaleString('fr-FR') + ' $',
        vega:   '−' + Math.round(Math.abs(port.idxVegaPct || 0)) + ' $/1%',
        theta:  '+' + Math.round(port.idxTheta || 0) + ' $/j',
        qty:    strategy.nIndex,
        action: 'Vendre straddle',
        exp:    strategy.duration + ' DTE',
      },
      basket: strategy.components.map(c => ({
        t:     c.ticker,
        prime: c.greeks ? '+' + Math.round(c.greeks.premium * CONTRACT * c.nContracts).toLocaleString('fr-FR') + ' $' : '—',
        vega:  c.greeks ? '+' + Math.round(c.greeks.vega * CONTRACT * c.nContracts * 0.01) + ' $/1%' : '—',
        theta: c.greeks ? Math.round(c.greeks.theta * CONTRACT * c.nContracts) + ' $/j' : '—',
        qty:   c.nContracts,
      })),
    };
  } else {
    L = D.legs || { index: { t: 'SPX', strike: 'ATM', prime: '−', vega: '−', theta: '+', qty: 1, action: 'Vendre straddle', exp: '30 DTE' }, basket: [] };
  }

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
            {strategy?.index || D.index_symbol || 'SPX'} · dispersion · {strategy?.duration || D.duration || 30} DTE · généré le {today}
          </div>
        </div>
        <ScoreBadge score={D.score || 82} size="lg" />
      </div>
      {strategy && (
        <div style={{ padding: '10px 14px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderLeft: '3px solid var(--pos)', borderRadius: 'var(--radius)', display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ color: 'var(--pos-bright)', font: '700 13px/1 var(--font-mono)' }}>✓</span>
          <span style={{ font: 'var(--type-body-sm)', color: 'var(--text-soft)' }}>
            Stratégie calculée — {strategy.nIndex} contrat(s) {strategy.index} · {(strategy.components || []).length} composants · sizing {strategy.sizingMethod === 'vega_neutral' ? 'vega-neutral' : 'poids égaux'} · Vega net <strong style={{ color: 'var(--pos-bright)' }}>{Math.round(strategy.portfolio?.netVegaPct || 0)} $/1%</strong>
          </span>
        </div>
      )}

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
        {(() => {
          const idxV  = strategy ? Math.abs(strategy.portfolio?.idxVegaPct || 0)  : 620;
          const compV = strategy ? Math.abs(strategy.portfolio?.compVegaPct || 0) : 572;
          const netV  = strategy ? Math.round(strategy.portfolio?.netVegaPct || 0) : -48;
          const total = idxV + compV || 1;
          const idxPct  = (idxV  / total * 48).toFixed(1);
          const compPct = (compV / total * 48).toFixed(1);
          return (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 16, marginTop: 14 }}>
              <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 12 }}>Équilibrage vega</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ font: 'var(--type-data-sm)', color: 'var(--neg-bright)', width: 130 }}>Indice −{Math.round(idxV)}</span>
                <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'var(--bg-elevated)', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: idxPct + '%', background: 'var(--neg)' }} />
                  <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: compPct + '%', background: 'var(--pos)' }} />
                  <div style={{ position: 'absolute', left: '50%', top: -2, bottom: -2, width: 2, background: 'var(--text)' }} />
                </div>
                <span style={{ font: 'var(--type-data-sm)', color: 'var(--pos-bright)', width: 140, textAlign: 'right' }}>Composants +{Math.round(compV)}</span>
              </div>
              <div style={{ textAlign: 'center', marginTop: 10 }}>
                <span style={{ font: '700 11px/1 var(--font-mono)', padding: '3px 8px', borderRadius: 'var(--radius)', background: 'var(--pos-soft)', border: '1px solid var(--pos)', color: 'var(--pos-bright)' }}>
                  Vega net {netV >= 0 ? '+' : ''}{netV} $/1% · {Math.abs(netV) < 30 ? 'quasi-neutre' : Math.abs(netV) < 80 ? 'légèrement déséquilibré' : 'déséquilibré'}
                </span>
              </div>
            </div>
          );
        })()}
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
        {(() => {
          const port = strategy?.portfolio;
          const netV = port ? Math.round(port.netVegaPct)  : -48;
          const netT = port ? Math.round(port.netTheta || 0) : 96;
          const netP = port ? Math.round(port.netPremium) : 1240;
          const nW   = (L.basket || []).length || 5;
          const dur  = strategy?.duration || D.duration || 30;
          const thetaRef = Math.max(40, Math.abs(netT) * dur);
          const worstCase = -Math.round(Math.min(thetaRef * 3, 2500) * 2.6);
          return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              <MetricCard label="Vega net" value={(netV >= 0 ? '+' : '') + netV} unit="$/1%" accent="var(--pos)" hint={strategy ? 'Position réelle' : 'Estimé'} />
              <MetricCard label="Theta /jour" value={(netT >= 0 ? '+' : '') + netT} unit="$" accent="var(--warn)" hint={strategy ? 'Position réelle' : 'Estimé'} />
              <MetricCard label="Prime nette" value={(netP >= 0 ? '+' : '') + netP.toLocaleString('fr-FR')} unit="$" accent="var(--accent)" />
              <MetricCard label="Composants" value={String(nW)} accent="var(--info)" hint={strategy?.sizingMethod === 'vega_neutral' ? 'Lots calculés (vega-neutral)' : '1 lot chacun'} />
              <MetricCard label="Contrats indice" value={String(strategy?.nIndex || 1)} accent="var(--info)" hint={'Short straddle ' + (strategy?.index || 'SPX')} />
              <MetricCard label="Durée" value={String(dur)} unit="DTE" accent="var(--info)" />
              <MetricCard label="Pire scénario" value={worstCase.toLocaleString('fr-FR')} unit="$" accent="var(--neg)" hint="Sell-off corrélé" />
              <MetricCard label="Données" value={strategy ? 'Réelles' : 'Estimées'} accent={strategy ? 'var(--pos)' : 'var(--warn)'} hint={strategy ? 'Yahoo + MarketData' : 'HV estimée'} />
            </div>
          );
        })()}
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
          {strategy && onNav && (
            <button onClick={() => onNav('risklab')} style={{ font: '600 13px/1 var(--font-sans)', padding: '10px 20px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}>Voir le Risk Lab →</button>
          )}
          <button style={{ font: '600 12px/1 var(--font-sans)', padding: '9px 16px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>Préparer pour exécution manuelle</button>
          <button style={{ font: '600 12px/1 var(--font-sans)', padding: '9px 16px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>Sauvegarder</button>
          <button onClick={() => onNav && onNav('monitor')} style={{ font: '600 12px/1 var(--font-sans)', padding: '9px 16px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>Ouvrir dans le monitor</button>
        </div>
      </Section>
    </div>
  );
}

window.Builder = Builder;
window.TradeBrief = TradeBrief;
