/* ─── Gauge prime de corrélation ──────────────────────────────────── */
function PrimeGauge({ implied, realized, size = 240 }) {
  const premium = (implied - realized) * 100;
  const target  = Math.max(0, Math.min(1, (premium + 20) / 40));
  const [anim, setAnim] = React.useState(0);
  const rafRef  = React.useRef(null);
  const t0Ref   = React.useRef(null);

  // Animation RAF : 0 → target, ease-out cubique
  React.useEffect(() => {
    t0Ref.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const from = 0, to = target, DUR = 1100;
    function tick(ts) {
      if (!t0Ref.current) t0Ref.current = ts;
      const p = Math.min(1, (ts - t0Ref.current) / DUR);
      const e = 1 - Math.pow(1 - p, 3);
      setAnim(from + (to - from) * e);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target]);

  let tone, verdict;
  if (premium >= 6)      { tone = '#26a69a'; verdict = 'Favorable'; }
  else if (premium >= 0) { tone = '#ffa726'; verdict = 'Neutre'; }
  else                   { tone = '#ef5350'; verdict = 'Défavorable'; }

  const W = 200, CX = 100, CY = 100, R = 76;
  // Coordonnées de l'aiguille calculées depuis l'angle (pas de CSS transform)
  // angle = π*(1-anim) : de π (gauche, −20pts) à 0 (droite, +20pts)
  const angle = Math.PI * (1 - anim);
  const NX = CX + (R - 8) * Math.cos(angle);
  const NY = CY - (R - 8) * Math.sin(angle);  // −sin car y SVG vers le bas

  const arcD = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: size }}>
      <svg viewBox={`0 0 ${W} 118`} width={size} height={size * 118 / W} style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id="pgGrad" x1={CX - R} y1="0" x2={CX + R} y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#ef5350" />
            <stop offset="48%"  stopColor="#ffa726" />
            <stop offset="56%"  stopColor="#ffc107" />
            <stop offset="100%" stopColor="#26a69a" />
          </linearGradient>
        </defs>

        {/* Piste fond */}
        <path d={arcD} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="13" strokeLinecap="round" />
        {/* Arc dégradé */}
        <path d={arcD} fill="none" stroke="url(#pgGrad)" strokeWidth="13" strokeLinecap="round" opacity="0.88" />

        {/* Ticks */}
        {[0, 0.25, 0.5, 0.75, 1].map(n => {
          const a = Math.PI * (1 - n);
          const ix = CX + (R - 7) * Math.cos(a), iy = CY - (R - 7) * Math.sin(a);
          const ox = CX + (R + 7) * Math.cos(a), oy = CY - (R + 7) * Math.sin(a);
          return <line key={n} x1={ix} y1={iy} x2={ox} y2={oy} stroke="rgba(0,0,0,0.3)" strokeWidth={n === 0.5 ? 2 : 1} />;
        })}

        {/* Labels −20 / 0 / +20 */}
        {[{n:0,l:'−20'},{n:0.5,l:'0'},{n:1,l:'+20'}].map(({n,l}) => {
          const a = Math.PI * (1 - n);
          return <text key={l} x={CX + (R + 15) * Math.cos(a)} y={CY - (R + 15) * Math.sin(a)}
            textAnchor="middle" dominantBaseline="middle" fontSize="8"
            fontFamily="var(--font-mono)" fill="var(--text-dim)">{l}</text>;
        })}

        {/* Aiguille (coords directes, pas de transform) */}
        <line x1={CX + 10 * Math.cos(angle)} y1={CY - 10 * Math.sin(angle)}
              x2={NX} y2={NY}
              stroke={tone} strokeWidth="2.5" strokeLinecap="round" />

        {/* Hub central */}
        <circle cx={CX} cy={CY} r="7" fill="var(--bg-card)" stroke={tone} strokeWidth="2.5" />

        {/* Valeur */}
        <text x={CX} y={CY + 22} textAnchor="middle" fontSize="12"
          fontFamily="var(--font-mono)" fontWeight="700" fill={tone}>
          {premium >= 0 ? '+' : ''}{premium.toFixed(1)} pts
        </text>
      </svg>

      <div style={{ textAlign: 'center', marginTop: 6 }}>
        <div style={{ font: '700 11px/1 var(--font-sans)', color: tone, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>{verdict}</div>
        <div style={{ display: 'flex', gap: 22 }}>
          {[{label:'ρ implicite', val: implied, c: 'var(--accent-hover)'}, {label:'ρ̂ réalisée', val: realized, c: 'var(--info)'}].map(d => (
            <div key={d.label} style={{ textAlign: 'center' }}>
              <div style={{ font: '10px/1 var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 3 }}>{d.label}</div>
              <div style={{ font: '700 15px/1 var(--font-mono)', color: d.c }}>{d.val.toFixed(2)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Contribution par composant ──────────────────────────────────── */
function ContribChart({ matrixTickers, matrix, rhoImpl }) {
  if (!matrixTickers || !matrix || matrixTickers.length < 2) return null;
  const n = matrixTickers.length;
  const items = matrixTickers.map((t, i) => {
    const others = matrix[i].filter((_, j) => j !== i);
    const avgRho = others.reduce((a, b) => a + b, 0) / others.length;
    return { ticker: t, avgRho, contrib: rhoImpl - avgRho };
  }).sort((a, b) => b.contrib - a.contrib);

  const maxAbs = Math.max(...items.map(it => Math.abs(it.contrib)), 0.01);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map(it => {
        const pct = it.contrib / maxAbs;
        const isPos = it.contrib >= 0;
        const bar = Math.abs(pct) * 44;  // max 44% de la moitié
        return (
          <div key={it.ticker} style={{ display: 'grid', gridTemplateColumns: '52px 1fr 64px', gap: 8, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 20, height: 20, borderRadius: 5, background: 'var(--bg-elevated)', border: '1px solid var(--border)', overflow: 'hidden', flexShrink: 0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <img src={`https://assets.parqet.com/logos/symbol/${it.ticker.split('.')[0]}`} alt="" style={{ width: 16, height: 16, objectFit: 'contain' }}
                  onError={e => { e.currentTarget.style.display='none'; }} />
              </div>
              <span style={{ font: '600 10px/1 var(--font-mono)', color: 'var(--text-soft)' }}>{it.ticker}</span>
            </div>
            {/* Barre divergente centrée */}
            <div style={{ position: 'relative', height: 18, background: 'var(--bg-elevated)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                position: 'absolute', top: 3, bottom: 3,
                [isPos ? 'left' : 'right']: '50%',
                width: bar + '%',
                background: isPos ? 'var(--pos-bright)' : 'var(--neg-bright)',
                borderRadius: 2, opacity: 0.85,
              }} />
              <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, background: 'var(--border)' }} />
            </div>
            <div style={{ font: '700 11px/1 var(--font-mono)', color: isPos ? 'var(--pos-bright)' : 'var(--neg-bright)', textAlign: 'right' }}>
              {isPos ? '+' : ''}{(it.contrib * 100).toFixed(1)} pts
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Décomposition sectorielle ───────────────────────────────────── */
const SECTOR_MAP = {
  Technology:   ['AAPL','MSFT','NVDA','AVGO','AMD','INTC','QCOM','MU','AMAT','KLAC','LRCX','ADI','TXN','CRM','NOW','ADBE','INTU','SNPS','CDNS','ORCL','IBM','DELL','HPE','STX','WDC'],
  Comm:         ['META','GOOGL','GOOG','NFLX','DIS','CMCSA','CHTR','T','VZ','TMUS','PARA','WBD'],
  'Conso. Disc':['AMZN','TSLA','HD','MCD','NKE','SBUX','TJX','LOW','CMG','BKNG','ABNB','F','GM','ROST','EBAY'],
  Financier:    ['JPM','BAC','WFC','GS','MS','C','AXP','BLK','SPGI','V','MA','BRK.B','COF','SCHW','CB'],
  Santé:        ['LLY','UNH','JNJ','ABBV','MRK','PFE','TMO','ABT','DHR','BMY','AMGN','ISRG','MDT','SYK','CVS','GILD','VRTX','REGN','BSX','ZTS'],
  Énergie:      ['XOM','CVX','COP','EOG','SLB','MPC','PSX','VLO','OXY','HAL','PXD','DVN'],
  Industriel:   ['CAT','GE','HON','BA','RTX','LMT','UPS','UNP','CSX','DE','EMR','ETN','PH','MMM','ITW','GD','NOC','FDX','WM'],
  'Conso. Stap':['WMT','COST','PG','KO','PEP','MDLZ','PM','MO','CL','GIS','KHC','STZ','SYY'],
  Matériaux:    ['LIN','APD','ECL','SHW','DD','NUE','FCX','NEM','ALB'],
  Immobilier:   ['PLD','AMT','EQIX','PSA','WELL','SPG','CCI','CBRE'],
  Utilités:     ['NEE','DUK','SO','AEP','D','SRE','EXC','PCG','XEL'],
};
function getSector(ticker) {
  for (const [sec, list] of Object.entries(SECTOR_MAP)) {
    if (list.includes(ticker)) return sec;
  }
  return 'Autre';
}

function SectorChart({ matrixTickers, matrix, rhoImpl }) {
  if (!matrixTickers || !matrix || matrixTickers.length < 2) return null;
  const sectorBuckets = {};
  matrixTickers.forEach((t, i) => {
    const sec = getSector(t);
    if (!sectorBuckets[sec]) sectorBuckets[sec] = [];
    sectorBuckets[sec].push({ ticker: t, idx: i });
  });

  const rows = Object.entries(sectorBuckets).map(([sec, members]) => {
    const indices = members.map(m => m.idx);
    let avgRho;
    if (indices.length === 1) {
      const row = matrix[indices[0]];
      const others = row.filter((_, j) => j !== indices[0]);
      avgRho = others.reduce((a, b) => a + b, 0) / Math.max(1, others.length);
    } else {
      let sum = 0, cnt = 0;
      for (let i = 0; i < indices.length; i++)
        for (let j = i + 1; j < indices.length; j++)
          { sum += matrix[indices[i]][indices[j]]; cnt++; }
      avgRho = cnt > 0 ? sum / cnt : 0;
    }
    return { sector: sec, tickers: members.map(m => m.ticker), avgRho, prime: rhoImpl - avgRho };
  }).sort((a, b) => b.prime - a.prime);

  const maxPrime = Math.max(...rows.map(r => Math.abs(r.prime)), 0.01);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {rows.map(r => {
        const isPos = r.prime >= 0;
        const barW = Math.abs(r.prime) / maxPrime * 100;
        return (
          <div key={r.sector} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 60px', gap: 8, alignItems: 'center' }}>
            <div>
              <div style={{ font: '600 10px/1 var(--font-sans)', color: 'var(--text-soft)' }}>{r.sector}</div>
              <div style={{ font: '9px/1 var(--font-mono)', color: 'var(--text-dim)', marginTop: 2 }}>
                {r.tickers.slice(0, 3).join(' ')}
                {r.tickers.length > 3 ? ` +${r.tickers.length - 3}` : ''}
              </div>
            </div>
            <div style={{ position: 'relative', height: 14, background: 'var(--bg-elevated)', borderRadius: 3 }}>
              <div style={{
                position: 'absolute', top: 2, bottom: 2, left: 0,
                width: barW + '%',
                background: isPos ? 'var(--pos)' : 'var(--neg)',
                borderRadius: 2, opacity: 0.75,
              }} />
            </div>
            <div style={{ font: '600 11px/1 var(--font-mono)', color: isPos ? 'var(--pos-bright)' : 'var(--neg-bright)', textAlign: 'right' }}>
              ρ̄ {r.avgRho.toFixed(2)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Correlation Lab ─────────────────────────────────────────────── */
function CorrelationLab({ listId: listIdParam, onNav, mode, lists, moduleCtx, onModuleCtx }) {
  const { MetricCard, Badge, WarningPanel, BeginnerExplanationBox } = window.DispersionXDesignSystem_cb86be;
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  // Contexte de module ou paramètre direct de navigation
  const listId = listIdParam || moduleCtx?.listId || null;
  const ctx    = moduleCtx || {};
  const hasCtx = !!listId;

  const DEMO_TICKERS = ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'META', 'AMZN'];

  // Hook toujours appelé — garde conditionnelle à l'intérieur
  React.useEffect(() => {
    if (!hasCtx) return;
    const resolve = DXApi.getList(listId).then(list => {
      const tickers = (list?.items || []).map(i => i.ticker).filter(Boolean);
      const index   = list?.index_symbol || ctx.listIndex || 'SPX';
      if (tickers.length < 2) return DXApi.getCorrelation(null, DEMO_TICKERS, index);
      return DXApi.getCorrelation(listId, tickers, index);
    });
    resolve.then(d => { setData(d); setLoading(false); }).catch(() => {
      setData(window.DXData?.corr);
      setLoading(false);
    });
  }, [listId]);

  // Pas de contexte → sélecteur (après les hooks)
  if (!hasCtx) {
    return (
      <window.ModuleCtxPicker
        lists={lists}
        onCtx={upd => onModuleCtx && onModuleCtx(upd)}
        title="Correlation Lab"
        subtitle="Calculez la matrice de corrélation réalisée et la prime de corrélation implicite (via VIX) pour une liste sélectionnée."
      />
    );
  }

  const cellColor = (v) => {
    if (v >= 0.999) return 'var(--bg-elevated)';
    const t = Math.max(0, Math.min(1, (v - 0.3) / 0.5));
    return t < 0.5
      ? `rgba(38,166,154,${0.5 - t * 0.6 + 0.18})`
      : `rgba(239,83,80,${(t - 0.5) * 1.2 + 0.12})`;
  };

  if (loading) return <div style={{ padding: 80, textAlign: 'center', color: 'var(--text-muted)', font: 'var(--type-body)' }}>Chargement…</div>;

  const C = data || {};
  const rhoImpl = C.rho_impl ?? 0.61;
  const rhoReal = C.rho_real ?? 0.48;
  const prime = ((rhoImpl - rhoReal) * 100).toFixed(1);
  const matrixTickers = C.matrixTickers || ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'META'];
  const rawMatrix = C.matrix;
  const matrix = Array.isArray(rawMatrix) ? rawMatrix
    : (rawMatrix?.values || matrixTickers.map((_, i) => matrixTickers.map((_, j) => i === j ? 1 : 0.45)));
  const history = C.history || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ font: 'var(--type-h1)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: '0 0 6px' }}>Correlation Lab</h1>
          <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)', margin: 0, maxWidth: 660 }}>
            Le cœur de la stratégie : ce que le marché price (ρ implicite) face à ce qui a été observé (ρ̂ réalisée). L'écart est la prime de corrélation.
          </p>
        </div>
        {listId && onNav && listIdParam && (
          <button onClick={() => onNav('list-detail', { listId })}
            style={{ font: '600 12px/1 var(--font-sans)', padding: '8px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>← Liste</button>
        )}
      </div>

      {/* Métriques */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <MetricCard label="ρ implicite"         value={rhoImpl.toFixed(2)} hint="Pricé via les options d'indice" accent="var(--accent)" />
        <MetricCard label="ρ̂ réalisée"          value={rhoReal.toFixed(2)} hint="Observée sur les composants" accent="var(--info)" />
        <MetricCard label="Prime de corrélation" value={(prime >= 0 ? '+' : '') + prime} unit="pts" delta={C.delta || ''} accent="var(--pos)" />
        <MetricCard label="Lecture" value={parseFloat(prime) > 3 ? 'Favorable' : parseFloat(prime) > 0 ? 'Neutre' : 'Défavorable'}
          accent={parseFloat(prime) > 3 ? 'var(--pos)' : parseFloat(prime) > 0 ? 'var(--warn)' : 'var(--neg)'} />
      </div>

      {mode === 'Débutant' && (
        <BeginnerExplanationBox>
          Une dispersion classique cherche une corrélation implicite supérieure à la réalisée : l'indice price une synchronisation plus forte que celle observée récemment. Plus la matrice est « froide » (ρ faibles, teintes teal), plus les composants bougent indépendamment.
        </BeginnerExplanationBox>
      )}

      {/* Matrice + Gauge */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 16, alignItems: 'stretch' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ font: 'var(--type-h3)', color: 'var(--text)', margin: 0 }}>Matrice de corrélation réalisée</h3>
            <Badge tone="neutral" size="sm">60 jours</Badge>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: `48px repeat(${matrixTickers.length}, 1fr)`, gap: 3 }}>
            <div />
            {matrixTickers.map(t => <div key={t} style={{ font: '600 9px/1 var(--font-mono)', color: 'var(--text-muted)', textAlign: 'center', paddingBottom: 4 }}>{t}</div>)}
            {matrix.map((row, i) => (
              <React.Fragment key={i}>
                <div style={{ font: '600 9px/1 var(--font-mono)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>{matrixTickers[i]}</div>
                {row.map((v, j) => (
                  <div key={j} title={`${matrixTickers[i]} · ${matrixTickers[j]} = ${v.toFixed(2)}`}
                    style={{ aspectRatio: '1', borderRadius: 3, background: cellColor(v), display: 'flex', alignItems: 'center', justifyContent: 'center', font: '600 10px/1 var(--font-mono)', color: i === j ? 'var(--text-dim)' : 'var(--text)' }}>
                    {v.toFixed(2)}
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, font: 'var(--type-caption)', color: 'var(--text-muted)' }}>
            <span style={{ color: 'var(--pos-bright)' }}>● ρ faible (favorable)</span>
            <span style={{ color: 'var(--neg-bright)' }}>● ρ élevée (risque)</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20, display: 'flex', justifyContent: 'center' }}>
            <PrimeGauge implied={rhoImpl} realized={rhoReal} size={240} />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {parseFloat(prime) > 3 && <Badge tone="pos" dot>Prime élevée</Badge>}
            {parseFloat(prime) > 0 && <Badge tone="warn">Contexte favorable</Badge>}
            <Badge tone="neg">Risque sell-off corrélé</Badge>
          </div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 18, flex: 1, overflow: 'auto' }}>
            <h3 style={{ font: 'var(--type-h3)', color: 'var(--text)', margin: '0 0 4px' }}>Contribution à la prime</h3>
            <p style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', margin: '0 0 14px' }}>
              ρ implicite − ρ̄ du composant. Vert = apport positif à la dispersion.
            </p>
            <ContribChart matrixTickers={matrixTickers} matrix={matrix} rhoImpl={rhoImpl} />
          </div>
        </div>
      </div>

      {/* ── Décomposition sectorielle ── */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
        <h3 style={{ font: 'var(--type-h3)', color: 'var(--text)', margin: '0 0 4px' }}>Décomposition sectorielle de la prime</h3>
        <p style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', margin: '0 0 14px' }}>
          ρ̄ moyenne intra-secteur. Secteurs à ρ̄ basse = meilleurs contributeurs à la dispersion.
        </p>
        <SectorChart matrixTickers={matrixTickers} matrix={matrix} rhoImpl={rhoImpl} />
      </div>

      {/* Historique */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <h3 style={{ font: 'var(--type-h3)', color: 'var(--text)', margin: 0 }}>Historique ρ implicite vs réalisée</h3>
          <div style={{ display: 'flex', gap: 16, font: 'var(--type-caption)' }}>
            <span style={{ color: 'var(--accent-hover)' }}>● implicite</span>
            <span style={{ color: 'var(--info)' }}>● réalisée</span>
          </div>
        </div>
        <p style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', margin: '0 0 8px' }}>L'écart entre les deux courbes est la prime de corrélation.</p>
        {history.length >= 2 ? <HistoryChart data={history} /> : (
          <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-dim)', font: 'var(--type-caption)' }}>Historique insuffisant (min. 2 fenêtres)</div>
        )}
      </div>

      <WarningPanel tone="neg" title="Le risque à garder en tête">
        Si la corrélation réalisée rejoint brutalement l'implicite — typiquement lors d'un sell-off corrélé — la prime se referme et la dispersion perd. La prime positive est un point d'entrée potentiel, jamais une garantie.
      </WarningPanel>
    </div>
  );
}

function HistoryChart({ data }) {
  const w = 860, h = 200, padX = 36, padY = 24;
  const all = data.flatMap(p => [p.impl, p.real]);
  const min = Math.min(...all) - 0.04, max = Math.max(...all) + 0.04;
  const xs = i => padX + (i / (data.length - 1)) * (w - padX * 2);
  const ys = v => h - padY - ((v - min) / (max - min)) * (h - padY * 2);
  const line = key => data.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xs(i)} ${ys(p[key])}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} style={{ display: 'block' }}>
      <defs>
        <linearGradient id="corrPremGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(38,166,154,0.20)" />
          <stop offset="100%" stopColor="rgba(38,166,154,0.01)" />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map(g => {
        const v = min + (max - min) * g;
        return (
          <g key={g}>
            <line x1={padX} y1={ys(v)} x2={w - padX} y2={ys(v)} stroke="var(--border-subtle)" />
            <text x={4} y={ys(v) + 3} fontSize="9" fontFamily="var(--font-mono)" fill="var(--text-dim)">{v.toFixed(2)}</text>
          </g>
        );
      })}
      <path
        d={`${line('impl')} L ${xs(data.length - 1)} ${ys(data[data.length - 1].real)} ${[...data].reverse().map((p, i) => `L ${xs(data.length - 1 - i)} ${ys(p.real)}`).join(' ')} Z`}
        fill="url(#corrPremGrad)"
      />
      <path d={line('real')} fill="none" stroke="var(--info)" strokeWidth="2.5" />
      <path d={line('impl')} fill="none" stroke="var(--accent-hover)" strokeWidth="2.5" />
      {data.map((p, i) => (
        <g key={i}>
          <circle cx={xs(i)} cy={ys(p.impl)} r="2.5" fill="var(--accent-hover)" />
          <circle cx={xs(i)} cy={ys(p.real)} r="2.5" fill="var(--info)" />
          <text x={xs(i)} y={h - 5} fontSize="9" fontFamily="var(--font-mono)" fill="var(--text-dim)" textAnchor="middle">{p.d}</text>
        </g>
      ))}
    </svg>
  );
}

window.CorrelationLab = CorrelationLab;
