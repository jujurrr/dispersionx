/* ─── Risk Lab ─────────────────────────────────────────────────────────
   Moteur de risque local, cohérent et déterministe :
   • Grecs d'un ATM straddle calculés depuis les prix + IV (synthVol),
     par approximations Black-Scholes ATM (φ(0) ≈ 0.3989).
   • Stratégie de dispersion : SHORT 1 straddle indice, LONG straddles
     composants. Dimensionnement vega-neutre par défaut (ou quantités
     réelles si une stratégie a été construite dans le Builder).
   • Toutes les courbes ET le simulateur interactif partagent la MÊME
     fonction de P&L → ordres de grandeur rationnels et cohérents.
   ───────────────────────────────────────────────────────────────────── */

const PHI0 = 0.3989;     // densité normale en 0 — approximation ATM
const CONTRACT = 100;    // 1 contrat = 100 actions

function fmtMoney(n) {
  if (n == null || isNaN(n)) return '—';
  const a = Math.abs(Math.round(n));
  const s = a >= 10000 ? (a / 1000).toFixed(1) + 'k' : a.toLocaleString('fr-FR');
  return (n >= 0 ? '+' : '−') + s + ' $';
}

/* ── Grecs d'un straddle ATM (par contrat) ───────────────────────── */
function straddleGreeks(S, ivPct, days) {
  const sigma = Math.max(0.02, (ivPct || 0) / 100);
  const T = Math.max(1, days || 30) / 365;
  const sqrtT = Math.sqrt(T);
  return {
    // Vega : $ gagné par +1 point d'IV (les deux jambes)
    vega: 2 * S * PHI0 * sqrtT * 0.01 * CONTRACT,
    // Theta : $/jour (négatif = perte de valeur temps d'un long straddle)
    theta: -(S * PHI0 * sigma) / sqrtT / 365 * CONTRACT,
    // Coefficient de convexité : P&L gamma = gammaK · (ΔS/S)²
    gammaK: PHI0 * S / (sigma * sqrtT) * CONTRACT,
    // Prime du straddle ($/contrat)
    premium: 0.8 * S * sigma * sqrtT * CONTRACT,
  };
}

/* ── Construction du modèle de portefeuille ──────────────────────── */
function buildRiskModel({ tickers, weightMap, priceMap, volMap, indexSym, indexPrice, indexIV, duration, strategy }) {
  const idxG = straddleGreeks(indexPrice, indexIV, duration);
  const nIndex = strategy?.nIndex || 1;

  const rawW = tickers.map(t => (weightMap[t] != null ? weightMap[t] : 1));
  const sumW = rawW.reduce((a, b) => a + b, 0) || 1;
  const wNorm = rawW.map(w => w / sumW);

  // Cible vega-neutre : vega total des composants ≈ vega de la jambe indice
  const targetVega = idxG.vega * nIndex;

  const perTicker = tickers.map((t, i) => {
    const S = priceMap[t] || 100;
    const v = volMap[t] || {};
    const iv = v.iv_est != null ? v.iv_est : 30;
    const hv = v.hv30 != null ? v.hv30 : 27;
    const beta = v.beta != null ? v.beta : 1.0;
    const g = straddleGreeks(S, iv, duration);
    const strat = strategy?.components?.find(c => c.ticker === t);
    const nContracts = strat?.nContracts || Math.max(1, Math.round(targetVega * wNorm[i] / g.vega));
    return {
      ticker: t, price: S, iv, hv, beta,
      sector: v.sector || 'Autre', weight: wNorm[i] * 100,
      greeks: { vega: g.vega, theta: g.theta, gammaK: g.gammaK, premium: g.premium },
      nContracts,
    };
  });

  const sum = (f) => perTicker.reduce((s, t) => s + f(t), 0);
  const compVega  = sum(t => t.greeks.vega * t.nContracts);
  const idxVega   = -idxG.vega * nIndex;
  const compTheta = sum(t => t.greeks.theta * t.nContracts);
  const idxTheta  = -idxG.theta * nIndex;                 // short → theta positif
  const Kcomp     = sum(t => t.greeks.gammaK * t.nContracts);
  const Kidx      = idxG.gammaK * nIndex;
  const compPrem  = sum(t => t.greeks.premium * t.nContracts);
  const idxPrem   = idxG.premium * nIndex;
  const avgIV     = perTicker.length ? sum(t => t.iv) / perTicker.length : 0;

  return {
    indexSym, indexPrice, indexIV, duration, nIndex, idxG, perTicker,
    compVega, idxVega, netVega: compVega + idxVega,
    compTheta, idxTheta, netTheta: compTheta + idxTheta,
    Kcomp, Kidx, compPrem, idxPrem, netPremium: idxPrem - compPrem,
    avgIV,
    // Mouvement de breakeven du short straddle indice (≈ 1 écart-type) :
    // au-delà, la prime collectée est entièrement consommée.
    beIdx: Math.max(1, 0.8 * indexIV * Math.sqrt(duration / 365)),
    // ρ d'équilibre de la dispersion (≈ corrélation implicite).
    rhoBreakeven: Kidx > 0 ? Math.min(0.85, Math.max(0.45, Kcomp / Kidx)) : 0.55,
    rhoBase: 0.45,
    hasStrategy: !!strategy,
  };
}

/* ── Facteur de dispersion (résultat des jambes composants à maturité)
   = mouvements réalisés des composants / prime payée.
   = 1 à l'équilibre (composants réalisent l'implicite) ; > 1 si ρ basse
   (forte dispersion → gain) ; → 0 si ρ → 1 (rien ne disperse → on perd
   toute la prime des straddles longs).                                   */
function dispFactor(model, rho) {
  const slope = 1 / (1 - model.rhoBreakeven);
  return Math.max(0, 1 + (model.rhoBreakeven - rho) * slope);
}

/* ── P&L d'un scénario (résultat à maturité) ─────────────────────
   • indice  : payoff du SHORT straddle = prime − valeur intrinsèque.
               MAX = prime collectée à mouvement nul, décroît avec |move|,
               négatif au-delà du breakeven.  (+ vega de la jambe indice)
   • dispersion : payoff des straddles LONGS composants = prime × (facteur
                  de dispersion − 1).  Gain si ρ < équilibre.  (+ vega comp) */
function scenarioPnL(model, p) {
  const move = Math.abs(p.spot || 0);
  const rho = p.rho != null ? p.rho : model.rhoBase;
  const vegaIdxPnL  = model.idxVega  * (p.dIVidx  || 0);
  const vegaCompPnL = model.compVega * (p.dIVcomp || 0);
  const idxPnL  = model.idxPrem * (1 - move / model.beIdx);          // short straddle indice
  const dispPnL = model.compPrem * (dispFactor(model, rho) - 1);     // straddles longs composants
  return {
    vegaIdxPnL, vegaCompPnL, vegaPnL: vegaIdxPnL + vegaCompPnL,
    idxPnL, dispPnL,
    total: idxPnL + dispPnL + vegaIdxPnL + vegaCompPnL,
  };
}

/* ── Attribution du P&L par jambe (somme = scenarioPnL.total) ────── */
function legAttribution(model, p) {
  const move = Math.abs(p.spot || 0);
  const rho = p.rho != null ? p.rho : model.rhoBase;
  const df = dispFactor(model, rho) - 1;
  const indexLeg = {
    label: model.indexSym + ' (short)', logo: null, sector: 'Indice',
    value: Math.round(model.idxPrem * (1 - move / model.beIdx) + model.idxVega * (p.dIVidx || 0)),
  };
  const comps = model.perTicker.map(t => ({
    label: t.ticker, logo: t.ticker, sector: t.sector,
    value: Math.round(
      t.greeks.premium * t.nContracts * df                // payoff straddle long (dispersion)
      + t.greeks.vega * t.nContracts * (p.dIVcomp || 0)   // vega long composant
    ),
  }));
  return { indexLeg, comps };
}

/* ── Dynamic warnings ────────────────────────────────────────────── */
function buildWarnings(model) {
  const w = [];
  if (Math.abs(model.netVega) > 250)
    w.push({ tone: 'warn', title: 'Vega résiduel', msg: `Vega net ${fmtMoney(model.netVega)}/1% — position sensible aux chocs d'IV. Rééquilibrer le dimensionnement.` });
  if (model.netTheta < -150)
    w.push({ tone: 'warn', title: 'Coût de portage', msg: `Theta net ${fmtMoney(model.netTheta)}/jour — la position perd de la valeur temps si le marché reste calme.` });
  if (model.rhoBase < model.rhoBreakeven)
    w.push({ tone: 'pos', title: 'Convexité favorable', msg: `ρ réalisée (${model.rhoBase.toFixed(2)}) < ρ d'équilibre (${model.rhoBreakeven.toFixed(2)}) — la dispersion gagne sur les mouvements.` });
  else
    w.push({ tone: 'warn', title: 'Convexité défavorable', msg: `ρ réalisée (${model.rhoBase.toFixed(2)}) ≥ ρ d'équilibre (${model.rhoBreakeven.toFixed(2)}) — un mouvement corrélé pénalise la position.` });
  if (model.avgIV > 0 && model.indexIV > 0 && model.avgIV < model.indexIV * 0.95)
    w.push({ tone: 'warn', title: 'IV composants faible', msg: `IV moy. composants (${model.avgIV.toFixed(1)}%) proche/inférieure à l'IV indice (${model.indexIV.toFixed(1)}%) — prime de dispersion réduite.` });
  const hiBeta = model.perTicker.filter(t => t.beta > 1.5).map(t => t.ticker);
  if (hiBeta.length >= 2)
    w.push({ tone: 'warn', title: 'Beta élevé', msg: `${hiBeta.slice(0, 4).join(', ')} > 1.5 β — risque directionnel amplifié en sell-off.` });
  if (w.length === 0)
    w.push({ tone: 'pos', title: 'Profil de risque sain', msg: 'Aucun déséquilibre majeur détecté.' });
  return w;
}

/* ── Bar simple pour les grecs par composant ─────────────────────── */
function GreekBar({ value, max, pos }) {
  const pct = Math.min(100, Math.abs(value) / Math.max(1, Math.abs(max)) * 100);
  return (
    <div style={{ position: 'relative', height: 4, background: 'var(--bg-elevated)', borderRadius: 2, width: 56 }}>
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: pct + '%', borderRadius: 2, background: pos ? 'var(--pos)' : 'var(--neg)', opacity: 0.8 }} />
    </div>
  );
}

/* ── Graphique à barres horizontales générique ───────────────────── */
function SensChart({ title, subtitle, bars, diverging = false }) {
  if (!bars || bars.length === 0) return null;
  const maxAbs = Math.max(...bars.map(b => Math.abs(b.value || 0)), 1);
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 16 }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ font: 'var(--type-h3)', color: 'var(--text)', margin: 0 }}>{title}</div>
        {subtitle && <div style={{ font: '10px/1.3 var(--font-sans)', color: 'var(--text-muted)', marginTop: 3 }}>{subtitle}</div>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {bars.map((b, i) => {
          const pos = (b.value || 0) >= 0;
          const pct = Math.abs(b.value || 0) / maxAbs;
          return (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '58px 1fr 54px', gap: 6, alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                {b.logo && (
                  <div style={{ width: 14, height: 14, borderRadius: 3, background: 'var(--bg-elevated)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src={`https://assets.parqet.com/logos/symbol/${b.logo.split('.')[0]}`} alt="" style={{ width: 11, height: 11, objectFit: 'contain' }}
                      onError={e => { e.currentTarget.style.display = 'none'; }} />
                  </div>
                )}
                <span style={{ font: '9px/1 var(--font-mono)', color: 'var(--text-muted)', textAlign: 'right', whiteSpace: 'nowrap' }}>{b.label}</span>
              </div>
              <div style={{ position: 'relative', height: 13, background: 'var(--bg-elevated)', borderRadius: 2 }}>
                {diverging ? (
                  <>
                    <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.1)' }} />
                    <div style={{
                      position: 'absolute', top: 1.5, bottom: 1.5,
                      ...(pos ? { left: '50%', width: `${pct * 48}%` } : { right: '50%', width: `${pct * 48}%` }),
                      background: pos ? 'var(--pos)' : 'var(--neg)', borderRadius: 1.5, opacity: 0.85,
                    }} />
                  </>
                ) : (
                  <div style={{
                    position: 'absolute', top: 1.5, bottom: 1.5, left: 0, width: `${pct * 100}%`,
                    background: pos ? 'var(--pos)' : 'var(--neg)', borderRadius: 1.5, opacity: 0.85,
                  }} />
                )}
              </div>
              <span style={{ font: '600 9px/1 var(--font-mono)', color: pos ? 'var(--pos-bright)' : 'var(--neg-bright)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                {fmtMoney(b.value || 0)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Ligne P&L (simulateur) ──────────────────────────────────────── */
function PnLLine({ points, w = 540, h = 180, markIdx }) {
  if (!points || points.length < 2) return null;
  const vals = points.map(p => p.v);
  const lo = Math.min(...vals, 0), hi = Math.max(...vals, 0);
  const padL = 46, padR = 12, padT = 12, padB = 24;
  const xs = i => padL + i / (points.length - 1) * (w - padL - padR);
  const ys = v => h - padB - (v - lo) / ((hi - lo) || 1) * (h - padB - padT);
  const zeroY = ys(0);
  const d = vals.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xs(i)} ${ys(v)}`).join(' ');
  const grid = [lo, lo + (hi - lo) / 2, hi];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} style={{ display: 'block' }}>
      <defs>
        <linearGradient id="rlPnl" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.01" />
        </linearGradient>
      </defs>
      {grid.map((g, i) => (
        <g key={i}>
          <line x1={padL} y1={ys(g)} x2={w - padR} y2={ys(g)} stroke="var(--border-subtle)" />
          <text x={padL - 6} y={ys(g) + 3} fontSize="9" fontFamily="var(--font-mono)" fill="var(--text-dim)" textAnchor="end">{fmtMoney(g).replace(' $', '')}</text>
        </g>
      ))}
      <line x1={padL} y1={zeroY} x2={w - padR} y2={zeroY} stroke="var(--border-strong)" strokeDasharray="3 3" />
      <path d={`${d} L ${xs(vals.length - 1)} ${zeroY} L ${xs(0)} ${zeroY} Z`} fill="url(#rlPnl)" />
      <path d={d} fill="none" stroke="var(--accent)" strokeWidth="2.5" />
      {points.map((p, i) => (
        <text key={i} x={xs(i)} y={h - 6} fontSize="9" fontFamily="var(--font-mono)" fill={i === markIdx ? 'var(--accent-hover)' : 'var(--text-dim)'} textAnchor="middle" fontWeight={i === markIdx ? 700 : 400}>{p.l}</text>
      ))}
      {markIdx != null && points[markIdx] && (
        <circle cx={xs(markIdx)} cy={ys(points[markIdx].v)} r="4" fill="var(--accent-hover)" stroke="var(--bg-card)" strokeWidth="1.5" />
      )}
    </svg>
  );
}

/* ── Slider ──────────────────────────────────────────────────────── */
function Slider({ label, value, min, max, step, onChange, fmt, accent }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>{label}</span>
        <span style={{ font: '700 12px/1 var(--font-mono)', color: accent || 'var(--text)' }}>{fmt ? fmt(value) : value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }} />
    </div>
  );
}

/* ── Simulateur de scénarios interactif ──────────────────────────── */
function ScenarioSimulator({ model, storageKey }) {
  const base = { spot: 0, dIVidx: 0, dIVcomp: 0, rho: +model.rhoBase.toFixed(2) };
  const [p, setP] = React.useState(base);
  const [name, setName] = React.useState('');
  const [saved, setSaved] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || '[]') || []; } catch { return []; }
  });
  const set = (k, v) => setP(prev => ({ ...prev, [k]: v }));
  const persist = (arr) => { setSaved(arr); try { localStorage.setItem(storageKey, JSON.stringify(arr)); } catch {} };

  const r = scenarioPnL(model, p);

  // Courbe : P&L vs mouvement de l'indice, autres leviers figés au réglage courant
  const spots = [-10, -8, -6, -4, -2, 0, 2, 4, 6, 8, 10];
  const curve = spots.map(s => ({ l: (s > 0 ? '+' : '') + s, v: scenarioPnL(model, { ...p, spot: s }).total }));
  const markIdx = spots.indexOf(Math.round(p.spot / 2) * 2);

  function save() {
    const label = name.trim() || `Scénario ${saved.length + 1}`;
    persist([...saved, { id: Date.now(), name: label, params: { ...p }, total: Math.round(r.total) }]);
    setName('');
  }

  // Décomposition (somme exacte = r.total) : la jambe short straddle indice
  // (idxPnL) est maximale quand l'indice ne bouge pas — c'est le cœur du gain.
  const decomp = [
    { label: model.indexSym + ' short', value: r.idxPnL },
    { label: 'Dispersion', value: r.dispPnL },
    { label: 'Vega idx', value: r.vegaIdxPnL },
    { label: 'Vega comp', value: r.vegaCompPnL },
  ];

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h3 style={{ font: 'var(--type-h3)', color: 'var(--text)', margin: 0 }}>Simulateur de scénarios</h3>
          <p style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', margin: '3px 0 0' }}>Ajustez les leviers — la courbe et le P&L se recalculent en direct.</p>
        </div>
        <button onClick={() => setP(base)} style={{ font: '600 11px/1 var(--font-sans)', padding: '6px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>↺ Réinitialiser</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.25fr', gap: 20 }}>
        {/* Leviers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Slider label="Mouvement indice" value={p.spot} min={-10} max={10} step={0.5} onChange={v => set('spot', v)} fmt={v => (v > 0 ? '+' : '') + v + ' %'} accent="var(--accent-hover)" />
          <Slider label="Choc IV indice" value={p.dIVidx} min={-30} max={40} step={1} onChange={v => set('dIVidx', v)} fmt={v => (v > 0 ? '+' : '') + v + ' pts'} accent="var(--neg-bright)" />
          <Slider label="Choc IV composants" value={p.dIVcomp} min={-30} max={40} step={1} onChange={v => set('dIVcomp', v)} fmt={v => (v > 0 ? '+' : '') + v + ' pts'} accent="var(--pos-bright)" />
          <Slider label="Corrélation réalisée" value={p.rho} min={0.15} max={0.95} step={0.01} onChange={v => set('rho', v)} fmt={v => v.toFixed(2)} accent="var(--info)" />
        </div>

        {/* Résultat + courbe */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ font: '800 30px/1 var(--font-mono)', color: r.total >= 0 ? 'var(--pos-bright)' : 'var(--neg-bright)' }}>{fmtMoney(r.total)}</div>
            <span style={{ font: 'var(--type-caption)', color: 'var(--text-muted)' }}>P&L estimé du scénario</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {decomp.map(d => (
              <div key={d.label} style={{ flex: 1, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 10px' }}>
                <div style={{ font: '9px/1 var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', marginBottom: 5 }}>{d.label}</div>
                <div style={{ font: '700 13px/1 var(--font-mono)', color: d.value >= 0 ? 'var(--pos-bright)' : 'var(--neg-bright)' }}>{fmtMoney(d.value)}</div>
              </div>
            ))}
          </div>
          <PnLLine points={curve} markIdx={markIdx >= 0 ? markIdx : null} />
          <div style={{ font: 'var(--type-caption)', color: 'var(--text-dim)', textAlign: 'center', marginTop: -4 }}>
            P&L vs mouvement de l'indice : la jambe short straddle encaisse sa prime maximale quand l'indice reste calme (pic à 0 %) et la rend si l'indice bouge — la dispersion (ρ basse) et la vol composants ajoutent au gain
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Nom du scénario…"
              style={{ flex: 1, padding: '8px 10px', font: 'var(--type-body-sm)', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text)', outline: 'none' }} />
            <button onClick={save} style={{ font: '600 12px/1 var(--font-sans)', padding: '8px 16px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap' }}>Enregistrer</button>
          </div>
        </div>
      </div>

      {/* Scénarios enregistrés */}
      {saved.length > 0 && (
        <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
          <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 10 }}>Scénarios enregistrés ({saved.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {saved.map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                <span style={{ font: '600 12px/1 var(--font-sans)', color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                <span style={{ font: 'var(--type-caption)', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                  {(s.params.spot > 0 ? '+' : '') + s.params.spot}% · IVi {s.params.dIVidx >= 0 ? '+' : ''}{s.params.dIVidx} · IVc {s.params.dIVcomp >= 0 ? '+' : ''}{s.params.dIVcomp} · ρ{s.params.rho}
                </span>
                <span style={{ font: '700 12px/1 var(--font-mono)', color: s.total >= 0 ? 'var(--pos-bright)' : 'var(--neg-bright)', width: 72, textAlign: 'right' }}>{fmtMoney(s.total)}</span>
                <button onClick={() => setP({ ...base, ...s.params })} style={{ font: '600 10px/1 var(--font-sans)', padding: '4px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>Charger</button>
                <button onClick={() => persist(saved.filter(x => x.id !== s.id))} style={{ font: '600 10px/1 var(--font-sans)', padding: '4px 7px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer' }}>×</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Ligne d'attribution P&L ─────────────────────────────────────── */
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
      <span style={{ font: '700 10px/1 var(--font-mono)', color: pos ? 'var(--pos-bright)' : 'var(--neg-bright)', textAlign: 'right' }}>{fmtMoney(pnl)}</span>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────── */
function RiskLab({ listId: listIdParam, onNav, mode, lists, moduleCtx, onModuleCtx }) {
  const { MetricCard, RiskBadge, WarningPanel, BeginnerExplanationBox } = window.DispersionXDesignSystem_cb86be;
  const [model,    setModel]    = React.useState(null);
  const [loading,  setLoading]  = React.useState(true);
  const [scenario, setScenario] = React.useState(0);
  const [strategy, setStrategy] = React.useState(null);

  const listId = listIdParam || moduleCtx?.listId || null;
  const ctx    = moduleCtx || {};
  const hasCtx = !!listId;
  const DEMO = ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'META'];

  React.useEffect(() => {
    if (!listId) return;
    try { const raw = localStorage.getItem('dx-strategy-' + listId); if (raw) setStrategy(JSON.parse(raw)); } catch {}
  }, [listId]);

  React.useEffect(() => {
    if (!hasCtx) return;
    let cancelled = false;
    setLoading(true);
    const indexSym = strategy?.index || ctx.listIndex || 'SPX';
    const duration = strategy?.duration || 30;

    (async () => {
      let tickers = strategy?.components?.map(c => c.ticker) || null;
      const weightMap = {};
      if (listId) {
        try {
          const list = await DXApi.getList(listId);
          const items = list?.items || [];
          if (!tickers) tickers = items.map(i => i.ticker).filter(Boolean);
          items.forEach(i => { if (i.ticker) weightMap[i.ticker] = i.weight ?? null; });
        } catch {}
      }
      if (!tickers || !tickers.length) tickers = DEMO;

      let indexPrice = 6000, indexIV = 18;
      try { const sn = await DXApi.getSnapshot(indexSym); if (sn) { indexPrice = sn.price || indexPrice; indexIV = sn.iv_est || indexIV; } } catch {}

      const priceMap = {};
      try { const q = await DXApi.batchQuotes(tickers); (q || []).forEach(rr => { if (rr?.ticker) priceMap[rr.ticker] = parseFloat(rr.price) || null; }); } catch {}

      const volMap = {};
      tickers.forEach(t => {
        volMap[t] = window.DXMock?.synthVol ? window.DXMock.synthVol(t, indexSym) : {};
        if (!priceMap[t]) priceMap[t] = 100;
      });

      const m = buildRiskModel({ tickers, weightMap, priceMap, volMap, indexSym, indexPrice, indexIV, duration, strategy });
      if (!cancelled) { setModel(m); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [listId, strategy, ctx.listIndex]);

  if (!hasCtx) {
    return (
      <window.ModuleCtxPicker
        lists={lists}
        onCtx={upd => onModuleCtx && onModuleCtx(upd)}
        title="Risk Lab"
        subtitle="Analysez les sensibilités (vega, theta, gamma, corrélation) de votre stratégie de dispersion et simulez vos propres scénarios."
      />
    );
  }

  if (loading || !model) return (
    <div style={{ padding: 80, textAlign: 'center', color: 'var(--text-muted)', font: 'var(--type-body)' }}>Calcul du risque…</div>
  );

  // ── Scénarios canoniques (calculés depuis le moteur) ──
  const dur = model.duration;
  const scenarioDefs = [
    { name: 'Sell-off corrélé',    risk: 'critique', params: { spot: -6, dIVidx: 18, dIVcomp: 8, rho: 0.92 } },
    { name: 'Dispersion réalisée', risk: 'faible',   params: { spot: 1.5, dIVidx: -3, dIVcomp: 4, rho: 0.25 } },
    { name: 'Marché calme',        risk: 'modéré',   params: { spot: 0, dIVidx: -3, dIVcomp: -3, rho: 0.74 } },
  ];
  const scenarios = scenarioDefs.map(s => {
    const pnl = scenarioPnL(model, s.params).total;
    return { ...s, pnl: Math.round(pnl), up: pnl >= 0 };
  });
  const selScen = scenarios[scenario] || scenarios[0];

  // ── Attribution sous le scénario sélectionné ──
  const attrib = legAttribution(model, selScen.params);
  const pnlByName = [{ t: model.indexSym + ' (short)', pnl: attrib.indexLeg.value }, ...attrib.comps.map(c => ({ t: c.label, pnl: c.value }))]
    .sort((a, b) => b.pnl - a.pnl);
  const secMap = {};
  attrib.comps.forEach(c => { secMap[c.sector] = (secMap[c.sector] || 0) + c.value; });
  const pnlBySector = [{ s: 'Indice', pnl: attrib.indexLeg.value }, ...Object.entries(secMap).map(([s, pnl]) => ({ s, pnl }))]
    .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl));
  const maxByName = Math.max(...pnlByName.map(r => Math.abs(r.pnl)), 1);
  const maxBySec  = Math.max(...pnlBySector.map(r => Math.abs(r.pnl)), 1);

  // ── Courbes de sensibilité (chaque facteur isolé) ──
  const charts = {
    // Payoff du SHORT straddle indice : MAX = prime à 0 %, décroît, négatif
    // au-delà du breakeven (≈ ±{beIdx}%).
    spotBars:  [-8, -6, -4, -2, 0, 2, 4, 6, 8].map(x => ({ label: (x >= 0 ? '+' : '') + x + '%', value: Math.round(model.idxPrem * (1 - Math.abs(x) / model.beIdx)) })),
    ivIdxBars: [-30, -20, -10, 0, 10, 20, 30, 40].map(x => ({ label: (x >= 0 ? '+' : '') + x, value: Math.round(model.idxVega * x) })),
    ivCompBars:[-30, -20, -10, 0, 10, 20, 30, 40].map(x => ({ label: (x >= 0 ? '+' : '') + x, value: Math.round(model.compVega * x) })),
    // Prime de dispersion (payoff des straddles longs) : ρ basse = gain.
    rhoBars:   [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9].map(rho => ({ label: 'ρ ' + rho.toFixed(1), value: Math.round(model.compPrem * (dispFactor(model, rho) - 1)) })),
    // P&L total (toutes jambes, ρ et IV de base) : pic de gain à mouvement nul.
    netSpot:   [-8, -6, -4, -2, 0, 2, 4, 6, 8].map(x => ({ label: (x >= 0 ? '+' : '') + x + '%', value: Math.round(scenarioPnL(model, { spot: x, rho: model.rhoBase }).total) })),
    compMov:   model.perTicker.map(t => ({ label: t.ticker, logo: t.ticker, value: Math.round(t.greeks.vega * t.nContracts * 10) })).sort((a, b) => b.value - a.value),
    selloff:   [{ label: model.indexSym + ' (short)', logo: null, value: attrib.indexLeg.value }, ...attrib.comps.map(c => ({ label: c.label, logo: c.logo, value: c.value }))].sort((a, b) => b.value - a.value),
  };

  const warnings = buildWarnings(model);
  const maxVega  = Math.max(...model.perTicker.map(t => Math.abs(t.greeks.vega * t.nContracts)), 1);
  const maxTheta = Math.max(...model.perTicker.map(t => Math.abs(t.greeks.theta * t.nContracts)), 1);

  const fmtS = n => (n >= 0 ? '+' : '−') + Math.abs(Math.round(n));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {lists && onModuleCtx && ctx.listId && (
        <window.ModuleCtxBar ctx={ctx} lists={lists} onCtx={upd => onModuleCtx(upd)} onClear={() => onModuleCtx({ listId: null, listName: null })} />
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
      {strategy ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderLeft: '3px solid var(--pos)', borderRadius: 'var(--radius-lg)', flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--pos-bright)', font: '700 13px/1 var(--font-mono)', flexShrink: 0 }}>✓</span>
          <span style={{ font: 'var(--type-body-sm)', color: 'var(--text-soft)' }}>
            Stratégie · {model.nIndex} contrat(s) {model.indexSym} short · {model.perTicker.length} composants long · {strategy.sizingMethod === 'vega_neutral' ? 'vega-neutral' : 'quantités calculées'} — P&L sur quantités réelles
          </span>
          {onNav && <button onClick={() => onNav('builder', { listId })} style={{ marginLeft: 'auto', font: '600 11px/1 var(--font-sans)', padding: '5px 10px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer', flexShrink: 0 }}>Recalculer</button>}
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'var(--bg-elevated)', border: '1px solid var(--warn)', borderLeft: '3px solid var(--warn)', borderRadius: 'var(--radius-lg)', flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--warn)', font: '700 13px/1 var(--font-mono)', flexShrink: 0 }}>!</span>
          <span style={{ font: 'var(--type-body-sm)', color: 'var(--text-soft)' }}>
            Dimensionnement <strong style={{ color: 'var(--text)' }}>vega-neutre estimé</strong> ({model.nIndex} contrat {model.indexSym}). Construisez la stratégie dans le Builder pour des quantités précises.
          </span>
          {onNav && <button onClick={() => onNav('builder', { listId })} style={{ marginLeft: 'auto', font: '600 11px/1 var(--font-sans)', padding: '5px 10px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', flexShrink: 0 }}>Builder →</button>}
        </div>
      )}

      {mode === 'Débutant' && (
        <BeginnerExplanationBox>
          Les grecs mesurent la sensibilité de la position. <strong>Vega</strong> = sensibilité à la volatilité, <strong>Theta</strong> = gain/perte du temps qui passe, <strong>Gamma</strong> = convexité sur les mouvements. La dispersion gagne quand les composants bougent plus que l'indice (corrélation réalisée faible) ; elle perd dans un sell-off corrélé.
        </BeginnerExplanationBox>
      )}

      {/* ── Grecs agrégés ── */}
      <section>
        <div style={{ marginBottom: 14 }}>
          <h2 style={{ font: 'var(--type-h2)', color: 'var(--text)', margin: 0 }}>Grecs agrégés</h2>
          <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Position nette indice + composants — ATM straddle {dur}j · {strategy ? 'quantités réelles' : 'dimensionnement vega-neutre'}
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
          <MetricCard label="Δ net"     value="≈ 0" hint="ATM straddles delta-neutre" accent="var(--pos)" />
          <MetricCard label="Vega net"  value={fmtS(model.netVega) + ' $/1%'} hint={Math.abs(model.netVega) < 60 ? 'Quasi-neutre ✓' : 'Vega résiduel'} accent={Math.abs(model.netVega) < 60 ? 'var(--pos)' : 'var(--warn)'} />
          <MetricCard label="Θ /jour"   value={fmtS(model.netTheta) + ' $'} hint={model.netTheta >= 0 ? 'Portage positif' : 'Coût de portage'} accent="var(--warn)" />
          <MetricCard label="Vega idx"  value={fmtS(model.idxVega) + ' $/1%'} hint={'Short · ' + model.nIndex + ' contrat(s)'} accent="var(--neg)" />
          <MetricCard label="Vega comp" value={fmtS(model.compVega) + ' $/1%'} hint="Panier long" accent="var(--pos)" />
          <MetricCard label="Prime nette" value={fmtMoney(model.netPremium)} hint={model.netPremium >= 0 ? 'Crédit net' : 'Débit net'} accent="var(--accent)" />
        </div>
      </section>

      {/* ── Simulateur interactif ── */}
      <section>
        <ScenarioSimulator model={model} storageKey={'dx-risk-scen-' + (listId || 'demo')} />
      </section>

      {/* ── Exposition par composant ── */}
      <section>
        <div style={{ marginBottom: 12 }}>
          <h2 style={{ font: 'var(--type-h2)', color: 'var(--text)', margin: 0 }}>Exposition par composant</h2>
          <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: '4px 0 0' }}>Grecs ATM straddle par jambe · quantités {strategy ? 'réelles' : 'vega-neutres'}</p>
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '150px 64px 104px 56px 92px 88px 44px 80px', gap: 0, padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
            {['Action', 'Prix', 'IV / HV', 'Beta', 'Vega $/1%', 'Theta/j', 'Lots', 'Prime'].map(h => (
              <div key={h} style={{ font: '600 9px/1 var(--font-mono)', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</div>
            ))}
          </div>
          {model.perTicker.map((t, idx) => {
            const ivPos = t.iv >= t.hv;
            const vega = t.greeks.vega * t.nContracts;
            const theta = t.greeks.theta * t.nContracts;
            const prem = t.greeks.premium * t.nContracts;
            return (
              <div key={t.ticker} style={{ display: 'grid', gridTemplateColumns: '150px 64px 104px 56px 92px 88px 44px 80px', gap: 0, padding: '10px 16px', borderBottom: idx < model.perTicker.length - 1 ? '1px solid var(--border-subtle)' : 'none', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--bg-elevated)', border: '1px solid var(--border)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src={`https://assets.parqet.com/logos/symbol/${t.ticker.split('.')[0]}`} alt="" style={{ width: 16, height: 16, objectFit: 'contain' }}
                      onError={e => { e.currentTarget.style.display = 'none'; }} />
                  </div>
                  <span style={{ font: '600 11px/1 var(--font-mono)', color: 'var(--text)' }}>{t.ticker}</span>
                </div>
                <span style={{ font: '600 11px/1 var(--font-mono)', color: 'var(--text-soft)' }}>{Math.round(t.price)} $</span>
                <div>
                  <div style={{ font: '600 11px/1 var(--font-mono)', color: ivPos ? 'var(--pos-bright)' : 'var(--neg-bright)' }}>
                    {t.iv.toFixed(1)}% <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>/ {t.hv.toFixed(1)}%</span>
                  </div>
                  <div style={{ font: '9px/1 var(--font-sans)', color: ivPos ? 'var(--pos)' : 'var(--neg)', marginTop: 2 }}>{ivPos ? '+' : ''}{(t.iv - t.hv).toFixed(1)} pts</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{ font: '600 11px/1 var(--font-mono)', color: Math.abs(t.beta - 1.1) < 0.3 ? 'var(--pos-bright)' : 'var(--warn)' }}>{t.beta.toFixed(2)}</span>
                  <GreekBar value={t.beta} max={2.5} pos={t.beta <= 1.4} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{ font: '600 11px/1 var(--font-mono)', color: 'var(--accent)' }}>{fmtS(vega)} $</span>
                  <GreekBar value={vega} max={maxVega} pos={vega > 0} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{ font: '600 11px/1 var(--font-mono)', color: theta >= 0 ? 'var(--pos-bright)' : 'var(--neg-bright)' }}>{fmtS(theta)} $</span>
                  <GreekBar value={theta} max={maxTheta} pos={theta > 0} />
                </div>
                <span style={{ font: '700 11px/1 var(--font-mono)', color: 'var(--accent)' }}>{t.nContracts}</span>
                <span style={{ font: '700 11px/1 var(--font-mono)', color: 'var(--text-soft)' }}>{fmtMoney(prem).replace(' $', '')}</span>
              </div>
            );
          })}
        </div>
      </section>

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
                <div style={{ font: '700 20px/1 var(--font-mono)', color: s.up ? 'var(--pos-bright)' : 'var(--neg-bright)' }}>{fmtMoney(s.pnl)}</div>
                <div style={{ font: 'var(--type-caption)', color: 'var(--text-dim)', marginTop: 6 }}>
                  {(s.params.spot > 0 ? '+' : '') + s.params.spot}% · IV idx {s.params.dIVidx >= 0 ? '+' : ''}{s.params.dIVidx} · ρ {s.params.rho}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Courbes de sensibilité ── */}
      <section>
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ font: 'var(--type-h2)', color: 'var(--text)', margin: 0 }}>Analyse de sensibilité</h2>
          <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: '4px 0 0' }}>P&L estimé sous chaque type de choc, isolé (mêmes formules que le simulateur)</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <SensChart title="P&L jambe indice (short straddle)" subtitle="Prime collectée maximale à 0 % (indice calme), rendue puis négative au-delà du breakeven" bars={charts.spotBars} diverging />
          <SensChart title="P&L total par mouvement de l'indice" subtitle="Toutes jambes combinées (ρ et IV de base) — gain maximal quand l'indice reste calme" bars={charts.netSpot} diverging />
          <SensChart title="Prime de dispersion par corrélation" subtitle={`Carry selon la ρ réalisée · gain si ρ < équilibre (≈ ${model.rhoBreakeven.toFixed(2)})`} bars={charts.rhoBars} diverging />
          <SensChart title="P&L par choc de vol indice" subtitle="Variation de l'IV indice (short straddle → baisse d'IV = gain)" bars={charts.ivIdxBars} diverging />
          <SensChart title="P&L par choc de vol composants" subtitle="Variation de l'IV des composants (jambes long), en points" bars={charts.ivCompBars} diverging />
          <SensChart title="Sensibilité IV par composant" subtitle="Gain si l'IV de ce composant monte de +10 pts" bars={charts.compMov} diverging />
        </div>
        <div style={{ marginTop: 14 }}>
          <SensChart title={`Attribution · ${selScen.name}`} subtitle="Décomposition du P&L par jambe sous le scénario sélectionné" bars={charts.selloff} diverging />
        </div>
      </section>

      {/* ── Attribution du P&L ── */}
      <section>
        <div style={{ marginBottom: 14 }}>
          <h2 style={{ font: 'var(--type-h2)', color: 'var(--text)', margin: 0 }}>Attribution du P&L</h2>
          <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Sous : <strong style={{ color: selScen.up ? 'var(--pos)' : 'var(--neg)' }}>{selScen.name}</strong> · total <strong style={{ color: selScen.up ? 'var(--pos-bright)' : 'var(--neg-bright)' }}>{fmtMoney(selScen.pnl)}</strong>
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
            <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 14 }}>Par jambe</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pnlByName.map(r => <AttribRow key={r.t} label={r.t} pnl={r.pnl} max={maxByName} logo={!r.t.includes('short') ? r.t : null} />)}
            </div>
          </div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
            <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 14 }}>Par secteur</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pnlBySector.map(r => <AttribRow key={r.s} label={r.s} pnl={r.pnl} max={maxBySec} />)}
            </div>
          </div>
        </div>
      </section>

      {/* ── Alertes ── */}
      <section>
        <h2 style={{ font: 'var(--type-h2)', color: 'var(--text)', margin: '0 0 12px' }}>Alertes</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {warnings.map((w, i) => <WarningPanel key={i} tone={w.tone} title={w.title}>{w.msg}</WarningPanel>)}
        </div>
      </section>

      <WarningPanel tone="neg" title="Scénario le plus défavorable">
        Un <strong style={{ color: 'var(--neg-bright)' }}>sell-off corrélé</strong> — l'indice baisse brutalement, la corrélation réalisée rejoint l'implicite, et les composants se déplacent ensemble — est le principal ennemi d'une dispersion classique. La jambe short indice perd alors que la prime de corrélation s'effondre. Testez-le dans le simulateur (ρ élevée + choc IV indice).
      </WarningPanel>

    </div>
  );
}

window.RiskLab = RiskLab;
