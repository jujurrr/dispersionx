/* ─── Risk Lab ─────────────────────────────────────────────────────── */

/* ── Helpers ─────────────────────────────────────────────────────── */
function parsePnl(v) {
  if (typeof v === 'number') return v;
  const s = String(v).replace(/[\s ]/g, '').replace('−', '-').replace(',', '');
  return Number(s) || 0;
}

function GreekBar({ value, max, pos }) {
  const pct = Math.min(100, Math.abs(value) / Math.max(1, Math.abs(max)) * 100);
  return (
    <div style={{ position: 'relative', height: 4, background: 'var(--bg-elevated)', borderRadius: 2, width: 56 }}>
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: pct + '%', borderRadius: 2, background: pos ? 'var(--pos)' : 'var(--neg)', opacity: 0.8 }} />
    </div>
  );
}

/* ── Generic horizontal bar chart ────────────────────────────────── */
function SensChart({ title, subtitle, bars, diverging = false }) {
  if (!bars || bars.length === 0) return null;
  const maxAbs = Math.max(...bars.map(b => Math.abs(b.value || 0)), 1);
  const fmt = v => {
    const abs = Math.abs(Math.round(v));
    const s = abs >= 1000 ? (abs / 1000).toFixed(1) + 'k' : String(abs);
    return (v >= 0 ? '+' : '−') + s;
  };
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 16 }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ font: 'var(--type-h3)', color: 'var(--text)', margin: 0 }}>{title}</div>
        {subtitle && <div style={{ font: '10px/1.3 var(--font-sans)', color: 'var(--text-muted)', marginTop: 3 }}>{subtitle}</div>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {bars.map((b, i) => {
          const pos  = (b.value || 0) >= 0;
          const pct  = Math.abs(b.value || 0) / maxAbs;
          return (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '58px 1fr 54px', gap: 6, alignItems: 'center' }}>
              {/* Label — logo if provided */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                {b.logo && (
                  <div style={{ width: 14, height: 14, borderRadius: 3, background: 'var(--bg-elevated)', overflow: 'hidden', flexShrink: 0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <img src={`https://assets.parqet.com/logos/symbol/${b.logo.split('.')[0]}`} alt="" style={{ width: 11, height: 11, objectFit: 'contain' }}
                      onError={e => { e.currentTarget.style.display = 'none'; }} />
                  </div>
                )}
                <span style={{ font: '9px/1 var(--font-mono)', color: 'var(--text-muted)', textAlign: 'right', whiteSpace: 'nowrap' }}>{b.label}</span>
              </div>
              {/* Bar */}
              <div style={{ position: 'relative', height: 13, background: 'var(--bg-elevated)', borderRadius: 2 }}>
                {diverging ? (
                  <>
                    <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.1)' }} />
                    <div style={{
                      position: 'absolute', top: 1.5, bottom: 1.5,
                      ...(pos ? { left: '50%', width: `${pct * 48}%` } : { right: '50%', width: `${pct * 48}%` }),
                      background: pos ? 'var(--pos)' : 'var(--neg)',
                      borderRadius: 1.5, opacity: 0.85,
                    }} />
                  </>
                ) : (
                  <div style={{
                    position: 'absolute', top: 1.5, bottom: 1.5, left: 0,
                    width: `${pct * 100}%`,
                    background: pos ? 'var(--pos)' : 'var(--neg)',
                    borderRadius: 1.5, opacity: 0.85,
                  }} />
                )}
              </div>
              {/* Value */}
              <span style={{ font: '600 9px/1 var(--font-mono)', color: pos ? 'var(--pos-bright)' : 'var(--neg-bright)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                {fmt(b.value || 0)} $
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── P&L attribution waterfall row ──────────────────────────────── */
function AttribRow({ label, pnl, max, logo }) {
  const pos = pnl >= 0;
  const w = Math.abs(pnl) / Math.max(1, Math.abs(max)) * 46;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr 76px', gap: 10, alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {logo && (
          <div style={{ width: 18, height: 18, borderRadius: 4, background: 'var(--bg-elevated)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src={`https://assets.parqet.com/logos/symbol/${logo.split('.')[0]}`} alt="" style={{ width: 14, height: 14, objectFit: 'contain' }}
              onError={e => { e.currentTarget.style.display = 'none'; }} />
          </div>
        )}
        <span style={{ font: '600 10px/1 var(--font-mono)', color: 'var(--text-soft)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
      </div>
      <div style={{ position: 'relative', height: 12, display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'var(--border-strong)' }} />
        <div style={{ position: 'absolute', left: pos ? '50%' : `${50 - w}%`, width: `${w}%`, height: 8, borderRadius: 2, background: pos ? 'var(--pos)' : 'var(--neg)', opacity: 0.85 }} />
      </div>
      <span style={{ font: '700 10px/1 var(--font-mono)', color: pos ? 'var(--pos-bright)' : 'var(--neg-bright)', textAlign: 'right' }}>
        {pos ? '+' : ''}{typeof pnl === 'number' ? pnl.toLocaleString() : pnl} $
      </span>
    </div>
  );
}

/* ── Dynamic warnings ────────────────────────────────────────────── */
function buildWarnings(D) {
  const warns = [];
  const port = D.portfolio || {};
  const perTicker = D.per_ticker || [];
  const netTheta = port.net_theta || 0;
  const netVega  = port.net_vega  || 0;
  const avgIV    = port.avg_iv || 0;
  const idxIV    = port.index_iv || 0;

  if (Math.abs(netTheta) > 50)
    warns.push({ tone: 'warn', title: 'Theta significatif', msg: `${Math.abs(Math.round(netTheta))} $/jour — surveiller à l'approche de l'échéance.` });
  if (Math.abs(netVega) > 300)
    warns.push({ tone: 'warn', title: 'Exposition vega résiduelle', msg: `Vega net ${netVega >= 0 ? '+' : ''}${Math.round(netVega)} $ : position sensible aux chocs IV.` });
  if (avgIV > 0 && idxIV > 0 && avgIV < idxIV * 0.9)
    warns.push({ tone: 'warn', title: 'IV composants < IV indice', msg: `IV moy. composants (${avgIV.toFixed(1)}%) < IV indice (${idxIV.toFixed(1)}%).` });
  const highBeta = perTicker.filter(t => t.beta && t.beta > 1.5);
  if (highBeta.length >= 2)
    warns.push({ tone: 'warn', title: 'Beta élevé', msg: `${highBeta.map(t => t.ticker).join(', ')} > 1.5 β — risque directionnel amplifié.` });
  if (warns.length === 0)
    warns.push({ tone: 'pos', title: 'Profil de risque sain', msg: 'Aucun déséquilibre majeur détecté.' });
  return warns;
}

/* ── Sensitivity charts builder ──────────────────────────────────── */
function buildSensCharts(D, strategy) {
  const port      = D.portfolio || {};
  const perTicker = D.per_ticker || [];
  const pnlByName = D.pnlByName  || [];
  const scenarios = D.scenarios   || [];
  const CONTRACT  = 100;
  const duration  = strategy?.duration || port.duration || 30;

  // ── Greek anchors: prefer actual strategy quantities ──────────────
  let netVegaPct, compVegaPct, idxVegaPct, netTheta;

  if (strategy?.portfolio) {
    // Strategy was built: use actual position Greeks
    netVegaPct  = strategy.portfolio.netVegaPct;
    compVegaPct = strategy.portfolio.compVegaPct;
    idxVegaPct  = strategy.portfolio.idxVegaPct;
    netTheta    = strategy.portfolio.netTheta;
  } else {
    // No strategy: equal-weight estimate (1/nW per ticker, 1 index contract)
    netVegaPct  = port.net_vega  || 0;
    netTheta    = port.net_theta || 0;
    const nW    = perTicker.length || 1;
    const portVegaRaw = perTicker.reduce((s, t) => s + (t.greeks?.vega || 0) * CONTRACT / nW, 0);
    compVegaPct = portVegaRaw * 0.01;
    idxVegaPct  = netVegaPct - compVegaPct;
  }

  // ── Scenario P&L anchors (recomputed from actual Greeks) ─────────
  const thetaRef = Math.max(40, Math.abs(netTheta) * duration);
  const baseScale = Math.max(100, Math.min(thetaRef * 3, 2500));
  const sellPnl  = -baseScale * 2.6;
  const dispPnl  =  baseScale * 2.1;
  const gapPnl   = -baseScale * 0.85;
  const thetaDay = netTheta;

  // 1 — P&L par mouvement de l'indice
  const spots = [-8, -6, -4, -2, 0, 2, 4, 6, 8];
  const spotBars = spots.map(x => {
    if (x === 0) return Math.round(thetaDay);
    const absX = Math.abs(x);
    const ref  = x < 0 ? sellPnl : gapPnl;
    const frac = absX <= 5 ? (absX / 5) ** 2 : 1 + (absX - 5) / 10;
    const thetaContrib = thetaDay * Math.max(0, 1 - absX / 4);
    return Math.round(ref * frac + thetaContrib);
  }).map((v, i) => ({ label: (spots[i] >= 0 ? '+' : '') + spots[i] + '%', value: v }));

  // 2 — P&L par choc de vol indice
  const ivShocks = [-30, -20, -10, 0, 10, 20, 30, 40];
  const ivIdxBars = ivShocks.map(iv => ({
    label: (iv >= 0 ? '+' : '') + iv + '%',
    value: Math.round(idxVegaPct * iv),
  }));

  // 3 — P&L par choc de vol composants
  const ivCompBars = ivShocks.map(iv => ({
    label: (iv >= 0 ? '+' : '') + iv + '%',
    value: Math.round(compVegaPct * iv),
  }));

  // 4 — Scénarios de corrélation
  const rhoLevels = [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
  const rhoBars = rhoLevels.map(rho => {
    const t = Math.max(0, (rho - 0.35) / 0.55);
    return { label: 'ρ ' + rho.toFixed(1), value: Math.round(dispPnl * (1 - t) + sellPnl * t) };
  });

  // 5 — P&L par passage du temps
  const days = [1, 2, 3, 5, 7, 10, 14, 21, 30];
  const thetaDays = days.map(d => ({ label: d + 'j', value: Math.round(thetaDay * d) }));

  // 6 — P&L si IV de CE composant +10% — utilise n_contracts réels si strategy présente
  const compMovBars = perTicker.map(t => {
    const n = strategy?.components?.find(c => c.ticker === t.ticker)?.nContracts || 1;
    return {
      label: t.ticker,
      logo:  t.ticker,
      value: t.greeks ? Math.round(t.greeks.vega * 0.10 * CONTRACT * n) : 0,
    };
  }).sort((a, b) => b.value - a.value);

  // 7 — Chocs de skew
  const skewPts  = [-4, -2, 0, 2, 4, 6, 8];
  const skewUnit = (idxVegaPct || (sellPnl * 0.015)) * 0.30;
  const skewBars = skewPts.map(sk => ({
    label: (sk >= 0 ? '+' : '') + sk + 'pts',
    value: Math.round(skewUnit * sk * -1),
  }));

  // 8 — Contribution sell-off: utilise n_contracts réels si strategy présente
  let selloffContrib;
  if (strategy?.components) {
    const indexSym = strategy.index || 'SPX';
    const idxPnl   = Math.round(strategy.portfolio.idxVegaRaw * 0.15);
    const compItems = strategy.components.map(c => ({
      label: c.ticker,
      logo:  c.ticker,
      value: c.greeks ? Math.round(c.greeks.vega * 0.15 * CONTRACT * c.nContracts) : 0,
    }));
    const rawAll = [{ label: indexSym + ' (short)', logo: null, value: idxPnl }, ...compItems];
    const rawTotal = rawAll.reduce((s, r) => s + Math.abs(r.value || 0), 0);
    const scale    = rawTotal > 0 ? Math.abs(sellPnl) / rawTotal : 1;
    selloffContrib = rawAll.map(r => ({ ...r, value: Math.round((r.value || 0) * scale) }));
  } else {
    const pnlRawTotal = pnlByName.reduce((s, r) => s + Math.abs(r.pnl || 0), 0);
    const scaleToSell = pnlRawTotal > 0 ? Math.abs(sellPnl) / pnlRawTotal : 1;
    selloffContrib = pnlByName.map(r => ({
      label: r.t,
      logo:  r.t.startsWith('SPX') || r.t.startsWith('NDX') ? null : r.t,
      value: Math.round((r.pnl || 0) * scaleToSell),
    }));
  }

  return { spotBars, ivIdxBars, ivCompBars, rhoBars, thetaDays, compMovBars, skewBars, selloffContrib };
}

/* ─── Main component ─────────────────────────────────────────────── */
function RiskLab({ listId: listIdParam, onNav, mode, lists, moduleCtx, onModuleCtx }) {
  const { MetricCard, RiskBadge, WarningPanel, BeginnerExplanationBox } = window.DispersionXDesignSystem_cb86be;
  const [riskData,  setRiskData]  = React.useState(null);
  const [loading,   setLoading]   = React.useState(true);
  const [scenario,  setScenario]  = React.useState(1);
  const [strategy,  setStrategy]  = React.useState(null);

  // Utilise listId du param de navigation ou du contexte de module
  const listId = listIdParam || moduleCtx?.listId || null;
  const ctx    = moduleCtx || {};
  const hasCtx = !!listId;

  const DEMO = ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'META'];

  // Hooks toujours appelés (règle React — pas de hooks après return conditionnel)
  React.useEffect(() => {
    if (!listId) return;
    try {
      const raw = localStorage.getItem('dx-strategy-' + listId);
      if (raw) setStrategy(JSON.parse(raw));
    } catch {}
  }, [listId]);

  React.useEffect(() => {
    if (!hasCtx) return;
    const index    = strategy?.index || ctx.listIndex || 'SPX';
    const duration = strategy?.duration || 30;
    const tickers  = strategy?.components?.map(c => c.ticker) || null;

    const resolve = listId
      ? DXApi.getList(listId).then(list => {
          const t   = tickers || (list?.items || []).map(i => i.ticker).filter(Boolean);
          const idx = list?.index_symbol || index;
          return DXApi.getRisk(listId, t.length ? t : DEMO, idx, duration);
        })
      : DXApi.getRisk(null, DEMO, index, duration);

    resolve.then(d => { setRiskData(d); setLoading(false); })
           .catch(() => { setRiskData(null); setLoading(false); });
  }, [listId, strategy]);

  // Pas de contexte → picker (après les hooks)
  if (!hasCtx) {
    return (
      <window.ModuleCtxPicker
        lists={lists}
        onCtx={upd => onModuleCtx && onModuleCtx(upd)}
        title="Risk Lab"
        subtitle="Analysez les sensibilités (vega, theta, corrélation) de votre stratégie de dispersion pour une liste donnée."
      />
    );
  }

  if (loading) return (
    <div style={{ padding: 80, textAlign: 'center', color: 'var(--text-muted)', font: 'var(--type-body)' }}>Chargement…</div>
  );

  const D           = riskData || {};
  const greeks      = D.greeks     || [];
  const scenarios   = D.scenarios  || [];
  const pnlByName   = D.pnlByName  || [];
  const pnlBySector = D.pnlBySector|| [];
  const perTicker   = D.per_ticker || [];
  const port        = D.portfolio  || {};

  const CONTRACT = 100;
  const maxVega  = Math.max(...perTicker.map(t => Math.abs(t.greeks?.vega  || 0)), 1);
  const maxTheta = Math.max(...perTicker.map(t => Math.abs(t.greeks?.theta || 0) * CONTRACT), 1);
  const maxByName= Math.max(...pnlByName.map(r => Math.abs(r.pnl || 0)), 1);
  const maxBySec = Math.max(...pnlBySector.map(r => Math.abs(r.pnl || 0)), 1);
  const selSc    = scenarios[scenario];
  const warnings = buildWarnings(D);

  const charts   = buildSensCharts(D, strategy);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* Contexte liste */}
      {lists && onModuleCtx && ctx.listId && (
        <window.ModuleCtxBar
          ctx={ctx}
          lists={lists}
          onCtx={upd => onModuleCtx(upd)}
          onClear={() => onModuleCtx({ listId: null, listName: null })}
        />
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ font: 'var(--type-h1)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: '0 0 6px' }}>Risk Lab</h1>
          <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)', margin: 0, maxWidth: 640 }}>
            Les risques de la stratégie rendus visibles. Un portefeuille vega-neutre n'est pas un portefeuille sans risque.
          </p>
        </div>
        {listId && onNav && (
          <button onClick={() => onNav('checklist', { listId })}
            style={{ font: '600 12px/1 var(--font-sans)', padding: '8px 16px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}>
            Checklist & Suivi →
          </button>
        )}
      </div>

      {/* Strategy status banner */}
      {listId && strategy ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderLeft: '3px solid var(--pos)', borderRadius: 'var(--radius-lg)', flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--pos-bright)', font: '700 13px/1 var(--font-mono)', flexShrink: 0 }}>✓</span>
          <span style={{ font: 'var(--type-body-sm)', color: 'var(--text-soft)' }}>
            Stratégie calculée le <strong style={{ color: 'var(--text)' }}>{new Date(strategy.builtAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</strong> · {strategy.nIndex} contrat(s) {strategy.index} · {(strategy.components || []).length} composants · {strategy.sizingMethod === 'vega_neutral' ? 'vega-neutral' : 'poids égaux'} — P&L calculé sur les quantités réelles
          </span>
          {onNav && (
            <button onClick={() => onNav('builder', { listId })} style={{ marginLeft: 'auto', font: '600 11px/1 var(--font-sans)', padding: '5px 10px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer', flexShrink: 0 }}>Recalculer</button>
          )}
        </div>
      ) : listId && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'var(--bg-elevated)', border: '1px solid var(--warn)', borderLeft: '3px solid var(--warn)', borderRadius: 'var(--radius-lg)', flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--warn)', font: '700 13px/1 var(--font-mono)', flexShrink: 0 }}>!</span>
          <span style={{ font: 'var(--type-body-sm)', color: 'var(--text-soft)' }}>
            Stratégie non encore calculée — les P&L utilisent 1 contrat par composant (estimation). <strong style={{ color: 'var(--text)' }}>Construisez la stratégie dans le Builder</strong> pour des calculs précis.
          </span>
          {onNav && (
            <button onClick={() => onNav('builder', { listId })} style={{ marginLeft: 'auto', font: '600 11px/1 var(--font-sans)', padding: '5px 10px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', flexShrink: 0 }}>Builder →</button>
          )}
        </div>
      )}

      {mode === 'Débutant' && (
        <BeginnerExplanationBox>
          Les grecs mesurent la sensibilité de la position aux mouvements du marché. Delta ≈ 0 signifie que la stratégie est direction-neutre. Gamma et Vega mesurent la sensibilité aux mouvements brusques et à la volatilité.
        </BeginnerExplanationBox>
      )}

      {/* ── Grecs agrégés ── */}
      <section>
        <div style={{ marginBottom: 14 }}>
          <h2 style={{ font: 'var(--type-h2)', color: 'var(--text)', margin: 0 }}>Grecs agrégés</h2>
          <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Position nette indice + composants — ATM straddle {strategy?.duration || port.duration || 30}j
            {strategy ? ' · quantités réelles calculées' : ' · estimation 1 lot/composant'}
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
          {(() => {
            // Prefer strategy portfolio Greeks for the metric cards when available
            if (strategy?.portfolio) {
              const p = strategy.portfolio;
              const fmtS = n => (n >= 0 ? '+' : '') + Math.round(n);
              const stratGreeks = [
                { label: 'Δ net',     value: '≈ 0',                           hint: 'ATM straddles delta-neutre',   accent: 'var(--pos)' },
                { label: 'Vega net',  value: fmtS(p.netVegaPct) + ' $/1%',   hint: Math.abs(p.netVegaPct) < 30 ? 'Quasi-neutre ✓' : 'Vega résiduel', accent: 'var(--pos)' },
                { label: 'Θ /jour',   value: fmtS(p.netTheta) + ' $',         hint: p.netTheta > 0 ? 'Gain quotidien (theta+)' : 'Coût quotidien', accent: 'var(--warn)' },
                { label: 'Vega idx',  value: fmtS(p.idxVegaPct) + ' $/1%',   hint: 'Jambe indice short · ' + strategy.nIndex + ' contrat(s)', accent: 'var(--neg)' },
                { label: 'Vega comp', value: '+' + Math.round(p.compVegaPct) + ' $/1%', hint: 'Panier composants long',  accent: 'var(--pos)' },
                { label: 'Prime net', value: fmtS(p.netPremium) + ' $',       hint: p.netPremium > 0 ? 'Crédit net' : 'Débit net', accent: 'var(--accent)' },
              ];
              return stratGreeks.map((g, i) => <MetricCard key={i} {...g} />);
            }
            return greeks.length > 0
              ? greeks.map((g, i) => <MetricCard key={g.label || i} {...g} />)
              : [
                  { label: 'Δ net', value: '≈ 0', hint: 'Direction-neutre', accent: 'var(--pos)' },
                  { label: 'Γ net', value: '—', hint: 'Long gamma', accent: 'var(--accent)' },
                  { label: 'Vega net', value: '—', accent: 'var(--pos)' },
                  { label: 'Θ /jour', value: '—', accent: 'var(--warn)' },
                  { label: 'IV moy.', value: '—', accent: 'var(--info)' },
                  { label: 'Prime net', value: '—', accent: 'var(--accent)' },
                ].map((g, i) => <MetricCard key={i} {...g} />);
          })()}
        </div>
      </section>

      {/* ── Exposition par composant ── */}
      {perTicker.length > 0 && (
        <section>
          <div style={{ marginBottom: 12 }}>
            <h2 style={{ font: 'var(--type-h2)', color: 'var(--text)', margin: 0 }}>Exposition par composant</h2>
            <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: '4px 0 0' }}>Données réelles Yahoo Finance + MarketData — ATM straddle estimé</p>
          </div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '148px 68px 110px 60px 88px 88px 48px 76px', gap: 0, padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
              {['Action', 'Prix', 'IV / HV', 'Beta', 'Vega $/1%', 'Theta/j', 'Lots', 'Prime/lot'].map(h => (
                <div key={h} style={{ font: '600 9px/1 var(--font-mono)', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</div>
              ))}
            </div>
            {perTicker.map((t, idx) => {
              const iv    = t.iv   || 0;
              const hv    = t.hv   || 0;
              const beta  = t.beta;
              const vega  = t.greeks?.vega  || 0;
              const theta = t.greeks?.theta || 0;
              const prem  = t.greeks?.premium || 0;
              const ivPos = iv >= hv;
              const nLots = strategy?.components?.find(c => c.ticker === t.ticker)?.nContracts || null;
              return (
                <div key={t.ticker} style={{ display: 'grid', gridTemplateColumns: '148px 68px 110px 60px 88px 88px 48px 76px', gap: 0, padding: '10px 16px', borderBottom: idx < perTicker.length - 1 ? '1px solid var(--border-subtle)' : 'none', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--bg-elevated)', border: '1px solid var(--border)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img src={`https://assets.parqet.com/logos/symbol/${t.ticker.split('.')[0]}`} alt="" style={{ width: 16, height: 16, objectFit: 'contain' }}
                        onError={e => { e.currentTarget.style.display = 'none'; }} />
                    </div>
                    <span style={{ font: '600 11px/1 var(--font-mono)', color: 'var(--text)' }}>{t.ticker}</span>
                  </div>
                  <span style={{ font: '600 11px/1 var(--font-mono)', color: 'var(--text-soft)' }}>{t.price ? t.price.toFixed(0) + ' $' : '—'}</span>
                  <div>
                    <div style={{ font: '600 11px/1 var(--font-mono)', color: ivPos ? 'var(--pos-bright)' : 'var(--neg-bright)' }}>
                      {iv.toFixed(1)}% <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>/ {hv.toFixed(1)}%</span>
                    </div>
                    <div style={{ font: '9px/1 var(--font-sans)', color: ivPos ? 'var(--pos)' : 'var(--neg)', marginTop: 2 }}>
                      {ivPos ? '+' : ''}{(iv - hv).toFixed(1)} pts
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ font: '600 11px/1 var(--font-mono)', color: beta == null ? 'var(--text-dim)' : Math.abs(beta - 1.1) < 0.3 ? 'var(--pos-bright)' : 'var(--warn)' }}>
                      {beta != null ? beta.toFixed(2) : '—'}
                    </span>
                    {beta != null && <GreekBar value={beta} max={2.5} pos={beta <= 1.4} />}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ font: '600 11px/1 var(--font-mono)', color: 'var(--accent)' }}>{vega ? (vega >= 0 ? '+' : '') + Math.round(vega) + ' $' : '—'}</span>
                    {vega ? <GreekBar value={vega} max={maxVega} pos={vega > 0} /> : null}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ font: '600 11px/1 var(--font-mono)', color: theta >= 0 ? 'var(--pos-bright)' : 'var(--neg-bright)' }}>{theta ? (theta >= 0 ? '+' : '') + (theta * CONTRACT).toFixed(1) + ' $' : '—'}</span>
                    {theta ? <GreekBar value={theta * CONTRACT} max={maxTheta} pos={theta > 0} /> : null}
                  </div>
                  <span style={{ font: '700 11px/1 var(--font-mono)', color: nLots != null ? 'var(--accent)' : 'var(--text-dim)' }}>
                    {nLots != null ? nLots : '—'}
                  </span>
                  <span style={{ font: '700 11px/1 var(--font-mono)', color: prem >= 0 ? 'var(--pos-bright)' : 'var(--neg-bright)' }}>
                    {prem ? (prem >= 0 ? '+' : '') + Math.round(prem * CONTRACT) + ' $' : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Scénarios ── */}
      <section>
        <div style={{ marginBottom: 14 }}>
          <h2 style={{ font: 'var(--type-h2)', color: 'var(--text)', margin: 0 }}>Scénarios de marché</h2>
          <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: '4px 0 0' }}>Cliquez pour filtrer l'attribution P&L ci-dessous</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {scenarios.map((s, i) => {
            const on = scenario === i;
            return (
              <button key={s.name} onClick={() => setScenario(i)} style={{
                textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s',
                background: on ? 'var(--bg-elevated)' : 'var(--bg-card)',
                border: `1px solid ${on ? 'var(--border-strong)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-lg)', padding: 16, boxShadow: on ? 'var(--shadow)' : 'none',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ font: 'var(--type-title)', color: 'var(--text)' }}>{s.name}</span>
                  <RiskBadge level={s.risk} size="sm" />
                </div>
                <div style={{ font: '700 20px/1 var(--font-mono)', color: s.up ? 'var(--pos-bright)' : 'var(--neg-bright)' }}>
                  {s.pnl}<span style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', marginLeft: 4 }}>$</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── 8 graphiques de sensibilité ── */}
      <section>
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ font: 'var(--type-h2)', color: 'var(--text)', margin: 0 }}>Analyse de sensibilité</h2>
          <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: '4px 0 0' }}>P&L estimé sous chaque type de choc, isolé</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

          <SensChart
            title="P&L par mouvement de l'indice"
            subtitle="Choc instantané sur le spot — effets corrélation inclus"
            bars={charts.spotBars}
            diverging
          />

          <SensChart
            title="P&L par choc de vol indice"
            subtitle="Variation de l'IV de l'indice (jambe short straddle)"
            bars={charts.ivIdxBars}
            diverging
          />

          <SensChart
            title="P&L par choc de vol composants"
            subtitle="Variation de l'IV des composants (jambe long straddles)"
            bars={charts.ivCompBars}
            diverging
          />

          <SensChart
            title="Scénarios de corrélation"
            subtitle="P&L selon le niveau de ρ réalisée des composants"
            bars={charts.rhoBars}
            diverging
          />

          <SensChart
            title="P&L par passage du temps"
            subtitle="Cumul du theta net sur la durée de la position"
            bars={charts.thetaDays}
          />

          <SensChart
            title="Mouvements des composants"
            subtitle="Contribution estimée par ticker — choc IV +10%"
            bars={charts.compMovBars}
            diverging
          />

          <SensChart
            title="Chocs de skew"
            subtitle="Impact d'un raidissement/aplatissement du skew indice (pts)"
            bars={charts.skewBars}
            diverging
          />

          <SensChart
            title="Contribution · Sell-off −5% + IV +15%"
            subtitle="Décomposition du P&L par jambe sous ce scénario"
            bars={charts.selloffContrib}
            diverging
          />

        </div>
      </section>

      {/* ── Attribution du P&L ── */}
      <section>
        <div style={{ marginBottom: 14 }}>
          <h2 style={{ font: 'var(--type-h2)', color: 'var(--text)', margin: 0 }}>Attribution du P&L</h2>
          <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Sous : <strong style={{ color: selSc?.up ? 'var(--pos)' : 'var(--neg)' }}>{selSc?.name || '—'}</strong>
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
            <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 14 }}>Par sous-jacent</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pnlByName.length > 0
                ? pnlByName.map(r => <AttribRow key={r.t} label={r.t} pnl={r.pnl} max={maxByName} logo={!r.t.startsWith('SPX') && !r.t.startsWith('NDX') ? r.t : null} />)
                : <div style={{ color: 'var(--text-dim)', font: 'var(--type-caption)' }}>Données non disponibles</div>}
            </div>
          </div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
            <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 14 }}>Par secteur</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pnlBySector.length > 0
                ? pnlBySector.map(r => <AttribRow key={r.s} label={r.s} pnl={r.pnl} max={maxBySec} />)
                : <div style={{ color: 'var(--text-dim)', font: 'var(--type-caption)' }}>Données non disponibles</div>}
            </div>
          </div>
        </div>
      </section>

      {/* ── Alertes ── */}
      <section>
        <h2 style={{ font: 'var(--type-h2)', color: 'var(--text)', margin: '0 0 12px' }}>Alertes</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {warnings.map((w, i) => (
            <WarningPanel key={i} tone={w.tone} title={w.title}>{w.msg}</WarningPanel>
          ))}
        </div>
      </section>

      {/* ── Warning principal ── */}
      <WarningPanel tone="neg" title="Scénario le plus défavorable">
        Un <strong style={{ color: 'var(--neg-bright)' }}>sell-off corrélé</strong> — l'indice baisse brutalement, la corrélation réalisée rejoint l'implicite, et les composants se déplacent ensemble — est le principal ennemi d'une dispersion classique. La jambe short indice perd alors que la prime de corrélation s'effondre.
      </WarningPanel>

    </div>
  );
}

window.RiskLab = RiskLab;
