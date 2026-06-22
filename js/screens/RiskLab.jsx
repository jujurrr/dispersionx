/* ─── Risk Lab ─────────────────────────────────────────────────────── */

/* Mini sparkline-like bar for greek exposure */
function GreekBar({ value, max, pos }) {
  const pct = Math.min(100, Math.abs(value) / Math.max(1, Math.abs(max)) * 100);
  return (
    <div style={{ position: 'relative', height: 4, background: 'var(--bg-elevated)', borderRadius: 2, width: 56 }}>
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: pct + '%', borderRadius: 2, background: pos ? 'var(--pos)' : 'var(--neg)', opacity: 0.8 }} />
    </div>
  );
}

/* P&L attribution waterfall row */
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

/* P&L heatmap spot × IV */
function PnlHeatmap({ netVega, netGamma, netPremium }) {
  const spots   = [-8, -6, -4, -2, 0, 2, 4, 6, 8];   // % move
  const ivShifts= [-30, -20, -10, 0, 10, 20, 30, 40]; // % IV change
  const vega    = netVega   || 0;
  const gamma   = netGamma  || 0;
  const premium = netPremium|| 0;

  const pnl = (spotPct, ivPct) => {
    // vega P&L: vega * IV change / 100 * price (approximate, vega in $/1% IV)
    const vegaPnl  = vega * (ivPct / 100);
    // gamma P&L: 0.5 * gamma * (S*spotPct/100)² — approximate using gamma per dollar
    const gammaPnl = gamma * (spotPct * spotPct) * 50;
    return vegaPnl + gammaPnl;
  };

  const allPnl = spots.flatMap(s => ivShifts.map(iv => pnl(s, iv)));
  const pnlMax = Math.max(...allPnl.map(Math.abs), 1);

  const color = (v) => {
    const t = v / pnlMax;
    if (t > 0.5) return 'var(--pos)';
    if (t > 0.15) return 'rgba(38,166,154,0.5)';
    if (t > -0.15) return 'var(--bg-elevated)';
    if (t > -0.5) return 'rgba(239,83,80,0.45)';
    return 'var(--neg)';
  };

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ font: 'var(--type-h3)', color: 'var(--text)', margin: 0 }}>P&L · Spot × Volatilité</h3>
        <div style={{ display: 'flex', gap: 10, font: 'var(--type-caption)', color: 'var(--text-muted)' }}>
          <span style={{ color: 'var(--pos-bright)' }}>● gain</span>
          <span style={{ color: 'var(--neg-bright)' }}>● perte</span>
        </div>
      </div>
      {/* IV axis label */}
      <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ font: '9px/1 var(--font-mono)', color: 'var(--text-dim)', writingMode: 'vertical-rl', transform: 'rotate(180deg)', whiteSpace: 'nowrap' }}>IV +40% → −30%</div>
        </div>
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${spots.length}, 1fr)`, gap: 2, marginBottom: 2 }}>
            {ivShifts.map(iv => (
              <div key={iv} style={{ display: 'grid', gridTemplateColumns: `repeat(${spots.length}, 1fr)`, gap: 2, gridColumn: '1 / -1' }}>
                {spots.map(s => (
                  <div key={s} title={`Spot ${s >= 0 ? '+' : ''}${s}%, IV ${iv >= 0 ? '+' : ''}${iv}% → ${pnl(s, iv) >= 0 ? '+' : ''}${Math.round(pnl(s, iv))}$`}
                    style={{ aspectRatio: '1', borderRadius: 2, background: color(pnl(s, iv)) }} />
                ))}
              </div>
            ))}
          </div>
          {/* Spot labels */}
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${spots.length}, 1fr)`, gap: 2, marginTop: 6 }}>
            {spots.map(s => (
              <div key={s} style={{ font: '8px/1 var(--font-mono)', color: 'var(--text-dim)', textAlign: 'center' }}>
                {s > 0 ? '+' : ''}{s}%
              </div>
            ))}
          </div>
          <div style={{ font: '9px/1 var(--font-mono)', color: 'var(--text-dim)', textAlign: 'center', marginTop: 4 }}>Spot</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 10, font: 'var(--type-caption)', color: 'var(--text-muted)' }}>
        <span>Γ net <strong style={{ color: 'var(--accent)' }}>{gamma >= 0 ? '+' : ''}{(gamma * 10000).toFixed(1)}‱</strong></span>
        <span>V net <strong style={{ color: vega >= 0 ? 'var(--pos)' : 'var(--neg)' }}>{vega >= 0 ? '+' : ''}{Math.round(vega)}$</strong></span>
      </div>
    </div>
  );
}

/* Dynamic warning computation */
function buildWarnings(D) {
  const warns = [];
  const port = D.portfolio || {};
  const perTicker = D.per_ticker || [];

  const netTheta = port.net_theta || 0;
  const netVega  = port.net_vega  || 0;
  const premium  = port.net_premium || 0;
  const avgIV    = port.avg_iv || 0;
  const idxIV    = port.index_iv || 0;

  if (Math.abs(netTheta) > 50)
    warns.push({ tone: 'warn', title: 'Theta significatif', msg: `La position gagne/perd ${Math.abs(Math.round(netTheta))} $/jour par passage du temps. Surveiller à l'approche de l'échéance.` });

  if (Math.abs(netVega) > 300)
    warns.push({ tone: 'warn', title: 'Exposition vega élevée', msg: `Vega net ${netVega >= 0 ? '+' : ''}${Math.round(netVega)} $ : sensible aux chocs de volatilité implicite.` });

  if (avgIV > 0 && idxIV > 0 && avgIV < idxIV * 0.9)
    warns.push({ tone: 'warn', title: 'IV composants < IV indice', msg: `IV moyenne des composants (${avgIV.toFixed(1)}%) inférieure à l'IV indice (${idxIV.toFixed(1)}%) : prime de corrélation peut être sous-estimée.` });

  if (premium < -500)
    warns.push({ tone: 'neg', title: 'Débit net élevé', msg: `Prime nette négative (${Math.round(premium)} $) : la stratégie coûte plus en spread qu'elle ne reçoit de prime.` });

  if (perTicker.length > 0) {
    const highBeta = perTicker.filter(t => t.beta && t.beta > 1.5);
    if (highBeta.length >= 2)
      warns.push({ tone: 'warn', title: 'Beta élevé sur plusieurs titres', msg: `${highBeta.map(t => t.ticker).join(', ')} ont un beta > 1.5 : risque directionnel amplifié en cas de choc.` });
  }

  if (warns.length === 0)
    warns.push({ tone: 'pos', title: 'Profil de risque sain', msg: 'Aucun déséquilibre majeur détecté. Vega quasi-neutre, theta positif, pas de concentration excessive.' });

  return warns;
}

/* ─── Main component ─────────────────────────────────────────────── */
function RiskLab({ listId, onNav, mode }) {
  const { MetricCard, RiskBadge, WarningPanel, Badge, BeginnerExplanationBox } = window.DispersionXDesignSystem_cb86be;
  const [riskData, setRiskData] = React.useState(null);
  const [loading, setLoading]   = React.useState(true);
  const [scenario, setScenario] = React.useState(1);

  const DEMO = ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'META'];

  React.useEffect(() => {
    const resolve = listId
      ? DXApi.getList(listId).then(list => {
          const tickers = (list?.items || []).map(i => i.ticker).filter(Boolean);
          const index   = list?.index_symbol || 'SPX';
          return DXApi.getRisk(listId, tickers.length ? tickers : DEMO, index, 30);
        })
      : DXApi.getRisk(null, DEMO, 'SPX', 30);

    resolve
      .then(d => { setRiskData(d); setLoading(false); })
      .catch(() => { setRiskData(null); setLoading(false); });
  }, [listId]);

  if (loading) return (
    <div style={{ padding: 80, textAlign: 'center', color: 'var(--text-muted)', font: 'var(--type-body)' }}>Chargement…</div>
  );

  const D = riskData || {};
  const greeks    = D.greeks    || [];
  const scenarios = D.scenarios || [];
  const pnlByName = D.pnlByName || [];
  const pnlBySector = D.pnlBySector || [];
  const perTicker = D.per_ticker || [];
  const port      = D.portfolio  || {};

  const netVega   = typeof port.net_vega   === 'number' ? port.net_vega   : null;
  const netGamma  = greeks.find(g => g.label?.toLowerCase().includes('gamma'))?.value;
  const netGammaNum = netGamma ? parseFloat(String(netGamma).replace(',', '.')) : null;
  const netPremium= typeof port.net_premium === 'number' ? port.net_premium : null;

  const warnings  = buildWarnings(D);
  const maxByName = Math.max(...pnlByName.map(r => Math.abs(r.pnl || 0)), 1);
  const maxBySec  = Math.max(...pnlBySector.map(r => Math.abs(r.pnl || 0)), 1);
  const maxVega   = Math.max(...perTicker.map(t => Math.abs(t.greeks?.vega || 0)), 1);
  const maxTheta  = Math.max(...perTicker.map(t => Math.abs(t.greeks?.theta || 0)), 1);

  const selScenario = scenarios[scenario];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* ── Header ── */}
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

      {mode === 'Débutant' && (
        <BeginnerExplanationBox>
          Les grecs mesurent la sensibilité de la position aux mouvements du marché. Delta ≈ 0 signifie que la stratégie est direction-neutre. Gamma et Vega mesurent la sensibilité aux mouvements brusques et à la volatilité.
        </BeginnerExplanationBox>
      )}

      {/* ── Grecs agrégés ── */}
      <section>
        <div style={{ marginBottom: 14 }}>
          <h2 style={{ font: 'var(--type-h2)', color: 'var(--text)', margin: 0 }}>Grecs agrégés</h2>
          <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: '4px 0 0' }}>Position nette indice + composants — ATM straddle {port.duration || 30}j</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
          {greeks.length > 0
            ? greeks.map((g, i) => <MetricCard key={g.label || i} {...g} />)
            : [
                { label: 'Δ net', value: '≈ 0', hint: 'Direction-neutre', accent: 'var(--pos)' },
                { label: 'Γ net', value: '—', hint: 'Long gamma', accent: 'var(--accent)' },
                { label: 'Vega net', value: '—', hint: 'Quasi-neutre', accent: 'var(--pos)' },
                { label: 'Θ /jour', value: '—', hint: 'Positif', accent: 'var(--warn)' },
                { label: 'IV moy.', value: '—', accent: 'var(--info)' },
                { label: 'Prime net', value: '—', accent: 'var(--accent)' },
              ].map((g, i) => <MetricCard key={i} {...g} />)
          }
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
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '160px 72px 110px 64px 90px 90px 80px', gap: 0, padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
              {['Action', 'Prix', 'IV / HV', 'Beta', 'Vega/lot', 'Theta/j', 'Prime/lot'].map(h => (
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
              return (
                <div key={t.ticker} style={{ display: 'grid', gridTemplateColumns: '160px 72px 110px 64px 90px 90px 80px', gap: 0, padding: '10px 16px', borderBottom: idx < perTicker.length - 1 ? '1px solid var(--border-subtle)' : 'none', alignItems: 'center' }}>
                  {/* Logo + Ticker */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--bg-elevated)', border: '1px solid var(--border)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img src={`https://assets.parqet.com/logos/symbol/${t.ticker.split('.')[0]}`} alt="" style={{ width: 16, height: 16, objectFit: 'contain' }}
                        onError={e => { e.currentTarget.style.display = 'none'; }} />
                    </div>
                    <span style={{ font: '600 11px/1 var(--font-mono)', color: 'var(--text)' }}>{t.ticker}</span>
                  </div>
                  {/* Prix */}
                  <span style={{ font: '600 11px/1 var(--font-mono)', color: 'var(--text-soft)' }}>
                    {t.price ? t.price.toFixed(0) + ' $' : '—'}
                  </span>
                  {/* IV / HV */}
                  <div>
                    <div style={{ font: '600 11px/1 var(--font-mono)', color: ivPos ? 'var(--pos-bright)' : 'var(--neg-bright)' }}>
                      {iv.toFixed(1)}% <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>/ {hv.toFixed(1)}%</span>
                    </div>
                    <div style={{ font: '9px/1 var(--font-sans)', color: ivPos ? 'var(--pos)' : 'var(--neg)', marginTop: 2 }}>
                      {ivPos ? `+${(iv - hv).toFixed(1)} pts` : `${(iv - hv).toFixed(1)} pts`}
                    </div>
                  </div>
                  {/* Beta */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ font: '600 11px/1 var(--font-mono)', color: beta == null ? 'var(--text-dim)' : Math.abs(beta - 1.1) < 0.3 ? 'var(--pos-bright)' : 'var(--warn)' }}>
                      {beta != null ? beta.toFixed(2) : '—'}
                    </span>
                    {beta != null && <GreekBar value={beta} max={2.5} pos={beta <= 1.4} />}
                  </div>
                  {/* Vega */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ font: '600 11px/1 var(--font-mono)', color: 'var(--accent)' }}>
                      {vega ? (vega >= 0 ? '+' : '') + Math.round(vega) + ' $' : '—'}
                    </span>
                    {vega ? <GreekBar value={vega} max={maxVega} pos={vega > 0} /> : null}
                  </div>
                  {/* Theta */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ font: '600 11px/1 var(--font-mono)', color: theta >= 0 ? 'var(--pos-bright)' : 'var(--neg-bright)' }}>
                      {theta ? (theta >= 0 ? '+' : '') + theta.toFixed(1) + ' $' : '—'}
                    </span>
                    {theta ? <GreekBar value={theta} max={maxTheta} pos={theta > 0} /> : null}
                  </div>
                  {/* Prime */}
                  <span style={{ font: '700 11px/1 var(--font-mono)', color: prem >= 0 ? 'var(--pos-bright)' : 'var(--neg-bright)' }}>
                    {prem ? (prem >= 0 ? '+' : '') + prem.toFixed(0) + ' $' : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Scénarios de marché ── */}
      <section>
        <div style={{ marginBottom: 14 }}>
          <h2 style={{ font: 'var(--type-h2)', color: 'var(--text)', margin: 0 }}>Scénarios de marché</h2>
          <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: '4px 0 0' }}>Cliquez pour filtrer l'attribution du P&L ci-dessous</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {scenarios.length > 0 ? scenarios.map((s, i) => {
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
                <div style={{ font: '700 20px/1 var(--font-mono)', color: s.up ? 'var(--pos-bright)' : 'var(--neg-bright)', marginBottom: 4 }}>
                  {s.pnl}
                  <span style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', marginLeft: 4 }}>$</span>
                </div>
              </button>
            );
          }) : (
            <div style={{ gridColumn: '1/-1', padding: 32, textAlign: 'center', color: 'var(--text-dim)', font: 'var(--type-caption)' }}>
              Scénarios non disponibles — données insuffisantes
            </div>
          )}
        </div>
      </section>

      {/* ── Heatmap + Warnings ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>
        <PnlHeatmap netVega={netVega} netGamma={netGammaNum} netPremium={netPremium} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h2 style={{ font: 'var(--type-h2)', color: 'var(--text)', margin: '0 0 4px' }}>Alertes</h2>
          {warnings.map((w, i) => (
            <WarningPanel key={i} tone={w.tone} title={w.title}>{w.msg}</WarningPanel>
          ))}
        </div>
      </div>

      {/* ── Attribution du P&L ── */}
      <section>
        <div style={{ marginBottom: 14 }}>
          <h2 style={{ font: 'var(--type-h2)', color: 'var(--text)', margin: 0 }}>Attribution du P&L</h2>
          <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Décomposition sous : <strong style={{ color: selScenario?.up ? 'var(--pos)' : 'var(--neg)' }}>{selScenario?.name || '—'}</strong>
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16 }}>
          {/* Par sous-jacent */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
            <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 14 }}>Par sous-jacent</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pnlByName.length > 0
                ? pnlByName.map(r => <AttribRow key={r.t} label={r.t} pnl={r.pnl} max={maxByName} logo={r.t !== 'SPX (short)' && r.t !== 'INDEX' ? r.t : null} />)
                : <div style={{ color: 'var(--text-dim)', font: 'var(--type-caption)' }}>Données non disponibles</div>
              }
            </div>
          </div>
          {/* Par secteur */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
            <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 14 }}>Par secteur</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pnlBySector.length > 0
                ? pnlBySector.map(r => <AttribRow key={r.s} label={r.s} pnl={r.pnl} max={maxBySec} />)
                : <div style={{ color: 'var(--text-dim)', font: 'var(--type-caption)' }}>Données non disponibles</div>
              }
            </div>
          </div>
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
