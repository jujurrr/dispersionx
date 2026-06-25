/* ─── Construction : répartition des contrats (sizing de la position) ───
   Module indépendant. À partir d'une liste (composants choisis), il calcule
   le nombre de contrats par jambe d'une dispersion : SHORT straddle indice +
   LONG straddles composants, dimensionnée vega-neutre. Sauvegarde la
   stratégie que le Risk Lab analyse ensuite (clé localStorage dx-strategy-<id>).
   Les grecs sont calculés localement (mêmes formules que le Risk Lab via
   window.DXRisk) → fonctionne hors-ligne, sur de vrais prix/IV, sans aléatoire.
   ───────────────────────────────────────────────────────────────────────── */
function Construction({ listId: listIdParam, onNav, mode, lists, moduleCtx, onModuleCtx, embedded, indexOverride, durationOverride, onSaved }) {
  const { MetricCard, WarningPanel, BeginnerExplanationBox } = window.DispersionXDesignSystem_cb86be;
  const CONTRACT  = (window.DXRisk && window.DXRisk.CONTRACT) || 100;
  const fmtMoney  = (window.DXRisk && window.DXRisk.fmtMoney) || (n => Math.round(n).toLocaleString('fr-FR') + ' $');
  const fmtNot    = v => (Math.abs(v) >= 1e6 ? (v / 1e6).toFixed(2) + ' M$' : Math.round(v / 1000) + ' k$');
  const fmtS      = n => (n >= 0 ? '+' : '−') + Math.abs(Math.round(n));

  const listId  = listIdParam || moduleCtx?.listId || null;
  const ctx     = moduleCtx || {};
  const hasCtx  = !!listId;
  const indexSym = indexOverride || ctx.listIndex || ctx.index || 'SPX';

  const [loading,  setLoading]  = React.useState(true);
  const [base,     setBase]     = React.useState(null);
  const [nIndex,   setNIndex]   = React.useState(1);
  const [sizing,   setSizing]   = React.useState('vega_neutral');
  const [duration, setDuration] = React.useState(durationOverride || 30);
  const [savedTick, setSavedTick] = React.useState(0);

  // Préremplir depuis une stratégie déjà construite pour cette liste
  React.useEffect(() => {
    if (!listId) return;
    try {
      const raw = localStorage.getItem('dx-strategy-' + listId);
      if (raw) { const s = JSON.parse(raw); if (s) { setNIndex(s.nIndex || 1); setSizing(s.sizingMethod || 'vega_neutral'); if (!durationOverride) setDuration(s.duration || 30); } }
    } catch {}
  }, [listId]);

  React.useEffect(() => { if (durationOverride) setDuration(durationOverride); }, [durationOverride]);

  // Charger données marché + grecs locaux (recalcul si durée change)
  React.useEffect(() => {
    if (!hasCtx) return;
    let cancelled = false; setLoading(true);
    (async () => {
      const sg = window.DXRisk && window.DXRisk.straddleGreeks;
      if (!sg) { if (!cancelled) setLoading(false); return; }
      let tickers = []; const weightMap = {};
      try {
        const list = await DXApi.getList(listId);
        const items = list?.items || [];
        tickers = items.map(i => i.ticker).filter(Boolean);
        items.forEach(i => { if (i.ticker) weightMap[i.ticker] = i.weight ?? null; });
      } catch {}
      if (!tickers.length) tickers = ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'META'];

      let indexPrice = 6000, indexIV = 18;
      try { const sn = await DXApi.getSnapshot(indexSym); if (sn) { indexPrice = sn.price || indexPrice; indexIV = sn.iv_est || indexIV; } } catch {}

      const priceMap = {};
      try { const q = await DXApi.batchQuotes(tickers); (q || []).forEach(r => { if (r?.ticker) priceMap[r.ticker] = parseFloat(r.price) || null; }); } catch {}

      const idxG = sg(indexPrice, indexIV, duration);
      const perTicker = tickers.map(t => {
        const v = window.DXMock?.synthVol ? window.DXMock.synthVol(t, indexSym) : {};
        const price = priceMap[t] || 100;
        const iv = v.iv_est != null ? v.iv_est : 30;
        const hv = v.hv30  != null ? v.hv30  : 27;
        const beta = v.beta != null ? v.beta : 1.0;
        return { ticker: t, price, iv, hv, beta, sector: v.sector || 'Autre', weight: weightMap[t], g: sg(price, iv, duration) };
      });
      if (!cancelled) { setBase({ indexSym, indexPrice, indexIV, idxG, perTicker }); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [listId, indexSym, duration]);

  // Dimensionnement vega-neutre (réparti par poids de l'indice si disponible)
  const sized = React.useMemo(() => {
    if (!base) return null;
    const rawW = base.perTicker.map(t => (t.weight != null ? t.weight : 1));
    const sumW = rawW.reduce((a, b) => a + b, 0) || 1;
    const targetVega = base.idxG.vega * nIndex;          // vega à neutraliser
    const comps = base.perTicker.map((t, i) => {
      const wNorm = rawW[i] / sumW;
      const n = (sizing === 'vega_neutral' && t.g.vega > 0)
        ? Math.max(1, Math.round(targetVega * wNorm / t.g.vega))
        : 1;
      return { ...t, nContracts: n, vega: t.g.vega * n, theta: t.g.theta * n, premium: t.g.premium * n, notional: t.price * CONTRACT * n };
    });
    const compVega  = comps.reduce((s, c) => s + c.vega, 0);
    const compTheta = comps.reduce((s, c) => s + c.theta, 0);
    const compPrem  = comps.reduce((s, c) => s + c.premium, 0);
    const idxVega      = base.idxG.vega * nIndex;         // magnitude (jambe short)
    const idxThetaGain = -base.idxG.theta * nIndex;       // short → theta positif
    const idxPrem      = base.idxG.premium * nIndex;
    return {
      comps, compVega, compTheta, compPrem,
      idxVega, idxThetaGain, idxPrem,
      netVega: compVega - idxVega,
      netTheta: compTheta + idxThetaGain,
      netPremium: idxPrem - compPrem,
      idxNotional: base.indexPrice * CONTRACT * nIndex,
      compNotional: comps.reduce((s, c) => s + c.notional, 0),
      totalLots: comps.reduce((s, c) => s + c.nContracts, 0),
    };
  }, [base, nIndex, sizing]);

  function buildStrategy() {
    if (!base || !sized) return null;
    return {
      listId, index: base.indexSym, duration, builtAt: new Date().toISOString(),
      nIndex, sizingMethod: sizing,
      components: sized.comps.map(c => ({
        ticker: c.ticker, price: c.price, iv: c.iv, hv: c.hv, beta: c.beta,
        sector: c.sector, weight: c.weight, nContracts: c.nContracts,
        vega: c.vega, theta: c.theta, premium: c.premium,
      })),
      portfolio: {
        idxVega: sized.idxVega, idxTheta: sized.idxThetaGain, idxPrem: sized.idxPrem,
        compVega: sized.compVega, compTheta: sized.compTheta, compPrem: sized.compPrem,
        netVega: sized.netVega, netTheta: sized.netTheta, netPremium: sized.netPremium,
        idxVegaPerLot: base.idxG.vega, idxThetaPerLot: -base.idxG.theta, idxPremPerLot: base.idxG.premium,
      },
    };
  }

  function save(goRisk) {
    const s = buildStrategy();
    if (!s || !listId) return;
    try { localStorage.setItem('dx-strategy-' + listId, JSON.stringify(s)); } catch {}
    setSavedTick(t => t + 1);
    if (onSaved) onSaved(s);
    if (goRisk && onNav) onNav('risk', { listId });
  }

  // Embarqué dans le Builder : on persiste automatiquement à chaque ajustement,
  // pour que l'étape de synthèse dispose toujours de la stratégie courante.
  React.useEffect(() => {
    if (!embedded || !sized || !listId) return;
    const s = buildStrategy();
    if (!s) return;
    try { localStorage.setItem('dx-strategy-' + listId, JSON.stringify(s)); } catch {}
    if (onSaved) onSaved(s);
  }, [embedded, sized, listId]);

  // ── États sans contexte ──
  if (!hasCtx) {
    if (embedded) {
      return (
        <div style={{ padding: 28, textAlign: 'center', background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)', color: 'var(--text-muted)', font: 'var(--type-body-sm)' }}>
          Sélectionnez une liste de composants pour dimensionner la position.
        </div>
      );
    }
    return (
      <window.ModuleCtxPicker
        lists={lists}
        onCtx={upd => onModuleCtx && onModuleCtx(upd)}
        title="Construction"
        subtitle="Répartissez les contrats de votre dispersion : short straddle indice + long straddles composants, dimensionnés vega-neutre. La stratégie alimente ensuite le Risk Lab."
      />
    );
  }

  if (loading || !sized) return (
    <div style={{ padding: 80, textAlign: 'center', color: 'var(--text-muted)', font: 'var(--type-body)' }}>Calcul du dimensionnement…</div>
  );

  const BtnStyle = { width: 34, height: 34, borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text)', font: '700 18px/1 var(--font-mono)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: embedded ? 16 : 24 }}>

      {!embedded && lists && onModuleCtx && ctx.listId && (
        <window.ModuleCtxBar ctx={ctx} lists={lists} onCtx={upd => onModuleCtx(upd)} onClear={() => onModuleCtx({ listId: null, listName: null })} />
      )}

      {!embedded && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ font: 'var(--type-h1)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: '0 0 6px' }}>Construction</h1>
            <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)', margin: 0, maxWidth: 660 }}>
              Combien de contrats par jambe ? On fixe le short straddle indice, puis on dimensionne les long straddles composants pour neutraliser le vega. Délta-neutre par construction (straddles ATM).
            </p>
          </div>
        </div>
      )}

      {mode === 'Débutant' && !embedded && (
        <BeginnerExplanationBox>
          La position est <strong>delta-neutre</strong> car composée de straddles ATM (insensibles à un petit mouvement directionnel). Le sizing <strong>vega-neutre</strong> ajuste le nombre de contrats composants pour que leur sensibilité à la volatilité compense exactement celle de la jambe indice short — il ne reste que le pari sur la <strong>dispersion</strong> et la corrélation.
        </BeginnerExplanationBox>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.25fr', gap: 18, alignItems: 'start' }}>
        {/* ── Config ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Jambe indice */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
            <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 12 }}>Jambe indice · short straddle {indexSym}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <button onClick={() => setNIndex(n => Math.max(1, n - 1))} style={BtnStyle}>−</button>
              <span style={{ font: '800 38px/1 var(--font-mono)', color: 'var(--text)', minWidth: 50, textAlign: 'center' }}>{nIndex}</span>
              <button onClick={() => setNIndex(n => Math.min(20, n + 1))} style={BtnStyle}>+</button>
              <div style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', marginLeft: 4 }}>contrat{nIndex > 1 ? 's' : ''}</div>
            </div>
            <div style={{ marginTop: 12, padding: '8px 10px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius)', font: 'var(--type-caption)', color: 'var(--text-muted)' }}>
              Vega short : <strong style={{ color: 'var(--neg-bright)' }}>−{Math.round(sized.idxVega)} $/1%</strong> · Theta : <strong style={{ color: 'var(--pos-bright)' }}>+{Math.round(sized.idxThetaGain)} $/j</strong> · Notionnel {fmtNot(sized.idxNotional)}
            </div>
          </div>

          {/* Échéance */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
            <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 12 }}>Échéance{durationOverride ? ' (définie dans le Builder)' : ''}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[14, 30, 45, 60].map(d => {
                const on = duration === d;
                return (
                  <button key={d} onClick={() => !durationOverride && setDuration(d)} disabled={!!durationOverride}
                    style={{ flex: 1, minWidth: 64, padding: '10px 0', borderRadius: 'var(--radius)', border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}`, background: on ? 'var(--accent-soft)' : 'transparent', color: on ? 'var(--accent-hover)' : 'var(--text-soft)', font: '700 13px/1 var(--font-mono)', cursor: durationOverride ? 'default' : 'pointer' }}>
                    {d}<span style={{ font: 'var(--type-caption)', color: 'var(--text-dim)' }}> DTE</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sizing */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
            <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 12 }}>Méthode de répartition</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { v: 'vega_neutral', label: 'Vega-neutre', desc: 'n_i = round(vega_indice × poids_i / vega_i). Sensibilité IV des composants ≈ celle de l\'indice short.' },
                { v: 'equal_weight', label: 'Poids égaux · 1 lot', desc: '1 contrat par composant. Simple, mais vega déséquilibré si les IV diffèrent.' },
              ].map(opt => (
                <div key={opt.v} onClick={() => setSizing(opt.v)} style={{ display: 'flex', gap: 10, padding: '12px 14px', borderRadius: 'var(--radius)', border: `1px solid ${sizing === opt.v ? 'var(--accent)' : 'var(--border)'}`, background: sizing === opt.v ? 'var(--bg-elevated)' : 'transparent', cursor: 'pointer' }}>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${sizing === opt.v ? 'var(--accent)' : 'var(--text-dim)'}`, marginTop: 1, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {sizing === opt.v && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }} />}
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

        {/* ── Aperçu des quantités ── */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '11px 16px', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
            <span style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Répartition des contrats · {sized.comps.length} composants</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 58px 78px 64px 86px', padding: '7px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
            {['Composant', 'Lots', 'Vega/lot', 'Prix', 'Total vega'].map(h => (
              <span key={h} style={{ font: '600 9px/1 var(--font-mono)', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em', textAlign: h === 'Composant' ? 'left' : 'right' }}>{h}</span>
            ))}
          </div>
          {sized.comps.map((c, i) => (
            <div key={c.ticker} style={{ display: 'grid', gridTemplateColumns: '1fr 58px 78px 64px 86px', padding: '9px 16px', borderBottom: i < sized.comps.length - 1 ? '1px solid var(--border-subtle)' : 'none', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                <div style={{ width: 18, height: 18, borderRadius: 4, background: 'var(--bg-elevated)', border: '1px solid var(--border)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={`https://assets.parqet.com/logos/symbol/${c.ticker.split('.')[0]}`} alt="" style={{ width: 13, height: 13, objectFit: 'contain' }} onError={e => { e.currentTarget.style.display = 'none'; }} />
                </div>
                <span style={{ font: '600 12px/1 var(--font-mono)', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.ticker}</span>
              </div>
              <span style={{ font: '700 13px/1 var(--font-mono)', color: 'var(--accent)', textAlign: 'right' }}>{c.nContracts}</span>
              <span style={{ font: '11px/1 var(--font-mono)', color: 'var(--text-soft)', textAlign: 'right' }}>+{Math.round(c.g.vega)} $</span>
              <span style={{ font: '11px/1 var(--font-mono)', color: 'var(--text-muted)', textAlign: 'right' }}>{Math.round(c.price)} $</span>
              <span style={{ font: '600 11px/1 var(--font-mono)', color: 'var(--pos-bright)', textAlign: 'right' }}>+{Math.round(c.vega)} $/1%</span>
            </div>
          ))}
          {/* Totaux */}
          <div style={{ padding: '11px 16px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', font: 'var(--type-caption)', color: 'var(--text-muted)' }}>
              <span>Vega composants (long)</span><span style={{ color: 'var(--pos-bright)', fontWeight: 700 }}>+{Math.round(sized.compVega)} $/1%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', font: 'var(--type-caption)', color: 'var(--text-muted)' }}>
              <span>Vega indice (short · {nIndex} lot{nIndex > 1 ? 's' : ''})</span><span style={{ color: 'var(--neg-bright)', fontWeight: 700 }}>−{Math.round(sized.idxVega)} $/1%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', font: '700 12px/1 var(--font-mono)', marginTop: 3, paddingTop: 7, borderTop: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-soft)' }}>Vega net</span>
              <span style={{ color: Math.abs(sized.netVega) < 60 ? 'var(--pos-bright)' : 'var(--warn-bright)' }}>{fmtS(sized.netVega)} $/1% {Math.abs(sized.netVega) < 60 ? '· neutre ✓' : ''}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Récap grecs ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <MetricCard label="Vega net" value={fmtS(sized.netVega) + ' $/1%'} hint={Math.abs(sized.netVega) < 60 ? 'Quasi-neutre ✓' : 'À rééquilibrer'} accent={Math.abs(sized.netVega) < 60 ? 'var(--pos)' : 'var(--warn)'} />
        <MetricCard label="Theta net /jour" value={fmtS(sized.netTheta) + ' $'} hint={sized.netTheta >= 0 ? 'Portage positif' : 'Coût de portage'} accent="var(--warn)" />
        <MetricCard label="Prime nette" value={fmtMoney(sized.netPremium)} hint={sized.netPremium >= 0 ? 'Crédit net' : 'Débit net'} accent="var(--accent)" />
        <MetricCard label="Lots composants" value={String(sized.totalLots)} hint={'Notionnel ' + fmtNot(sized.compNotional)} accent="var(--info)" />
      </div>

      {/* ── Actions (mode autonome ; en embarqué le Builder gère le flux) ── */}
      {embedded ? (
        <div style={{ font: 'var(--type-caption)', color: 'var(--text-dim)' }}>
          La répartition est enregistrée automatiquement — l'étape « Risque » et le Risk Lab l'utiliseront.
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => save(false)} style={{ font: '600 13px/1 var(--font-sans)', padding: '11px 22px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}>
            Enregistrer la stratégie
          </button>
          <button onClick={() => save(true)} style={{ font: '600 13px/1 var(--font-sans)', padding: '11px 18px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>
            Enregistrer puis ouvrir le Risk Lab →
          </button>
          {savedTick > 0 && (
            <span style={{ font: 'var(--type-body-sm)', color: 'var(--pos-bright)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ font: '700 13px/1 var(--font-mono)' }}>✓</span> Stratégie enregistrée — le Risk Lab l'utilisera.
            </span>
          )}
        </div>
      )}
    </div>
  );
}

window.Construction = Construction;
