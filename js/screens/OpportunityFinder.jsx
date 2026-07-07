/* ─── OpportunityFinder (Pro) : auto-chercheur d'opportunités de dispersion ───
   Cherche les meilleurs paniers d'un indice en combinant le score de dispersion
   par action et la prime de corrélation du panier. Recherche HEURISTIQUE (glouton
   + échanges), pas exhaustive : la matrice de corrélation est récupérée UNE fois
   (endpoint /api/correlation), puis des milliers de paniers sont évalués en local.
   Résultats indicatifs sur données différées/estimées — à valider manuellement. */

const OPP_POOL_MAX = 25;     // vivier max (= limite de l'endpoint de corrélation)
const OPP_SIZE_MIN = 5;
const OPP_SIZE_MAX = 20;
const OPP_DUR = 30;          // échéance de référence pour les scores
const OPP_TOP = 5;           // nombre d'opportunités affichées
const _oppCache = {};        // index -> { at, results, ctx }

// Poids de l'objectif « mix équilibré » (ajustables).
const W_PRIME = 0.45, W_SCORE = 0.30, W_DIV = 0.15, W_OVERFIT = 0.10;

// Évalue un panier (liste de tickers) : prime, score moyen, diversification, objectif.
function oppEval(members, ctx) {
  const k = members.length;
  let rsum = 0, rcnt = 0;
  for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) { rsum += ctx.corr[members[i]][members[j]]; rcnt++; }
  const rhoReal = rcnt ? rsum / rcnt : 0;
  const avgHV = members.reduce((s, m) => s + (ctx.hv[m] || 25), 0) / k;
  const sigmaComp = (avgHV / 100 * 1.08) || 1e-6;
  const rhoImpl = Math.min(0.95, Math.max(0.05, (ctx.sigmaIdx / sigmaComp) ** 2));
  const prime = (rhoImpl - rhoReal) * 100;
  const avgScore = members.reduce((s, m) => s + (ctx.score[m] || 0), 0) / k;
  const diversification = 1 - Math.max(0, rhoReal);
  const sizePen = Math.max(0, (8 - k)) / 8;   // paniers < 8 légèrement pénalisés (anti-sur-optimisation)
  const objective = W_PRIME * (prime / 15) + W_SCORE * (avgScore / 100) + W_DIV * diversification - W_OVERFIT * sizePen;
  return { members: members.slice(), k, rhoReal, rhoImpl, prime, avgScore, diversification, objective };
}

// Glouton (départ = seed) puis échanges locaux, pour une taille k donnée.
function oppSearchSize(k, pool, ctx, seed) {
  let basket = [seed[0]];
  while (basket.length < k) {
    let best = null, bestObj = -Infinity;
    for (const c of pool) {
      if (basket.includes(c)) continue;
      const obj = oppEval([...basket, c], ctx).objective;
      if (obj > bestObj) { bestObj = obj; best = c; }
    }
    if (best == null) break;
    basket.push(best);
  }
  let improved = true, guard = 0, curObj = oppEval(basket, ctx).objective;
  while (improved && guard++ < 24) {
    improved = false;
    for (let bi = 0; bi < basket.length; bi++) {
      for (const c of pool) {
        if (basket.includes(c)) continue;
        const trial = basket.slice(); trial[bi] = c;
        const obj = oppEval(trial, ctx).objective;
        if (obj > curObj + 1e-9) { basket = trial; curObj = obj; improved = true; }
      }
    }
  }
  return oppEval(basket, ctx);
}

// Meilleur panier de CHAQUE taille 5..20, puis un par TRANCHE de taille pour
// garantir la diversité (sinon le « top par objectif » ne renvoie que des petits
// paniers : score moyen + prime sont mécaniquement plus élevés sur peu d'actions).
const OPP_BUCKETS = [[5, 7], [8, 10], [11, 13], [14, 16], [17, 20]];
function oppFind(ctx) {
  const byScore = ctx.pool.slice().sort((a, b) => (ctx.score[b] || 0) - (ctx.score[a] || 0));
  const kmax = Math.min(OPP_SIZE_MAX, ctx.pool.length);
  const bestPerK = {};
  for (let k = OPP_SIZE_MIN; k <= kmax; k++) {
    const cands = [oppSearchSize(k, ctx.pool, ctx, byScore)];
    if (byScore.length > k + 2) cands.push(oppSearchSize(k, ctx.pool, ctx, byScore.slice(2)));
    cands.sort((a, b) => b.objective - a.objective);
    bestPerK[k] = cands[0];
  }
  const seen = new Set(), picked = [];
  for (const [lo, hi] of OPP_BUCKETS) {
    let best = null;
    for (let k = lo; k <= Math.min(hi, kmax); k++) {
      const r = bestPerK[k];
      if (r && (!best || r.objective > best.objective)) best = r;
    }
    if (best) {
      const key = best.members.slice().sort().join(',');
      if (!seen.has(key)) { seen.add(key); picked.push(best); }
    }
  }
  picked.sort((a, b) => b.objective - a.objective);   // meilleure opportunité en tête
  return picked.slice(0, OPP_TOP);
}

function oppScoreOf(o) {
  return Math.max(0, Math.min(100, Math.round(50 + o.prime * 2.2 + (o.avgScore - 62) * 0.6)));
}

// Cache module des backtests (à la demande, lourd) : clé = panier+indice+horizon.
const _btCache = {};
function btKey(members, index, dur) { return index + '|' + dur + '|' + members.slice().sort().join(','); }

// Stats d'un ensemble de fenêtres (edges en pts) : nombre, réussite, moyenne, cumul.
function btStatsOf(edges) {
  const n = edges.length;
  if (!n) return { n: 0, hit: 0, avg: 0, cum: 0 };
  const wins = edges.filter(e => e > 0).length;
  const cum = edges.reduce((a, b) => a + b, 0);
  return { n, hit: Math.round((wins / n) * 100), avg: cum / n, cum };
}

// Mini courbe d'équité (prime cumulée capturée) en SVG, largeur fluide.
function BtChart({ pts }) {
  if (!pts || pts.length < 2) return null;
  const W = 560, H = 92, P = 6;
  const min = Math.min(0, ...pts), max = Math.max(0, ...pts);
  const range = (max - min) || 1;
  const x = i => P + (i / (pts.length - 1)) * (W - 2 * P);
  const y = v => P + (1 - (v - min) / range) * (H - 2 * P);
  const d = pts.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const up = pts[pts.length - 1] >= 0;
  const col = up ? 'var(--pos-bright)' : 'var(--neg-bright)';
  const area = `${d} L${x(pts.length - 1).toFixed(1)},${y(0).toFixed(1)} L${x(0).toFixed(1)},${y(0).toFixed(1)} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: 92, display: 'block' }}>
      <path d={area} fill={col} opacity="0.08" />
      <line x1={P} y1={y(0).toFixed(1)} x2={W - P} y2={y(0).toFixed(1)} stroke="var(--border)" strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
      <path d={d} fill="none" stroke={col} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

async function oppGather(index, dur) {
  await window.DXStore.loadIndex(index);
  await window.DXStore.scoreIndex(index, dur);
  const d = window.DXStore.getIndexData(index) || {};
  const comps = d.components || [];
  const scores = window.DXStore.getScores(index, dur) || {};
  const scored = comps.map(c => c.ticker).filter(t => scores[t] != null).sort((a, b) => scores[b] - scores[a]);
  const poolTickers = scored.slice(0, OPP_POOL_MAX);
  if (poolTickers.length < OPP_SIZE_MIN) throw new Error('pas assez d\'actions scorées pour cet indice — réessayez dans quelques secondes (scoring en cours).');

  const [corrData, volData] = await Promise.all([
    DXApi.getCorrelation(null, poolTickers, index),
    DXApi.getBatchVol(poolTickers, index),
  ]);
  const mt = corrData?.matrixTickers || [];
  const M = corrData?.matrix || [];
  if (mt.length < OPP_SIZE_MIN) throw new Error('données de corrélation indisponibles — réessayez.');
  const corr = {};
  mt.forEach((ta, i) => { corr[ta] = {}; mt.forEach((tb, j) => { corr[ta][tb] = i === j ? 1 : (M[i] && M[i][j] != null ? M[i][j] : 0.5); }); });
  const hv = {}, iv = {}, beta = {};
  (volData?.results || []).forEach(r => { if (r && r.ticker && !r.error) { hv[r.ticker] = r.hv30 != null ? r.hv30 : 25; iv[r.ticker] = r.iv_est != null ? r.iv_est : 30; beta[r.ticker] = r.beta != null ? r.beta : 1.0; } });
  const quotes = d.quotes || {};
  const price = {}, sector = {};
  mt.forEach(t => { price[t] = quotes[t] && quotes[t].price != null ? parseFloat(quotes[t].price) : null; });
  comps.forEach(c => { if (c.ticker) sector[c.ticker] = c.sector || 'Autre'; });
  const sigmaIdx = corrData && corrData.vix_level ? corrData.vix_level / 100 : (d.snap && d.snap.iv_est ? d.snap.iv_est / 100 : 0.18);
  const pool = mt.filter(t => hv[t] != null && scores[t] != null);
  if (pool.length < OPP_SIZE_MIN) throw new Error('vivier trop maigre (données de vol manquantes) — réessayez.');
  return {
    index, pool, corr, hv, iv, beta, score: scores, price, sector, sigmaIdx,
    indexPrice: (d.snap && (d.snap.etf_price || d.snap.price)) || 100,
    indexIV: (d.snap && d.snap.iv_est) || 18,
    indexEtf: (d.snap && d.snap.etf) || index,
  };
}

// Risque INLINE : réutilise le VRAI moteur du Risk Lab (window.DXRisk) → mêmes
// chiffres. Sizing vega-neutre (strategy=null), grecs nets + 3 scénarios de
// stress + rapport edge/risque.
const OPP_SCEN = [
  { name: 'Sell-off corrélé', tone: 'neg', params: { spot: -6, dIVidx: 18, dIVcomp: 8, rho: 0.92 } },
  { name: 'Dispersion réalisée', tone: 'pos', params: { spot: 1.5, dIVidx: -3, dIVcomp: 4, rho: 0.25 } },
  { name: 'Marché calme', tone: 'warn', params: { spot: 0, dIVidx: -3, dIVcomp: -3, rho: 0.74 } },
];
function oppRisk(members, ctx, dur) {
  const R = window.DXRisk;
  if (!R || !R.buildRiskModel || !R.scenarioPnL) return null;
  const volMap = {}; members.forEach(t => { volMap[t] = { iv_est: ctx.iv[t], hv30: ctx.hv[t], beta: ctx.beta[t] }; });
  const m = R.buildRiskModel({
    tickers: members, weightMap: {}, priceMap: ctx.price, volMap,
    indexSym: ctx.index, indexPrice: ctx.indexPrice, indexIV: ctx.indexIV, duration: dur, strategy: null,
  });
  const totalContracts = m.perTicker.reduce((s, t) => s + t.nContracts, 0);
  const scen = OPP_SCEN.map(s => ({ name: s.name, tone: s.tone, pnl: Math.round(R.scenarioPnL(m, s.params).total) }));
  const selloff = scen[0].pnl, disp = scen[1].pnl;
  const edgeRisk = selloff < 0 ? disp / Math.abs(selloff) : null;
  return { netVega: m.netVega, netTheta: m.netTheta, netDelta: m.netDelta, netPremium: m.netPremium, totalContracts, scen, edgeRisk };
}

function OpportunityFinder({ onNav, lists, addToast, pro }) {
  const { MetricCard, Badge, BeginnerExplanationBox } = window.DispersionXDesignSystem_cb86be;
  const INDICES = ['SPX', 'NDX', 'DJI', 'CAC', 'DAX'];
  const DURATIONS = [{ v: 15, l: '15 jours' }, { v: 30, l: '30 jours' }, { v: 45, l: '45 jours' }, { v: 60, l: '60 jours' }];
  const [index, setIndex] = React.useState('SPX');
  const [duration, setDuration] = React.useState(30);
  const [running, setRunning] = React.useState(false);
  const [results, setResults] = React.useState(null);
  const [ctx, setCtx] = React.useState(null);
  const [error, setError] = React.useState('');
  const [bt, setBt] = React.useState({});   // i -> { open, loading, data, error }
  const [checkoutBusy, setCheckoutBusy] = React.useState(false);
  const [manageBusy, setManageBusy] = React.useState(false);
  const subscribed = !!(window.DXCloud && window.DXCloud.proSubscribed);
  async function manageSub() {
    setManageBusy(true);
    try { await window.DXCloud.openProPortal(); }
    catch (e) {
      const m = e && e.message === 'aucun_abonnement' ? 'Aucun abonnement Stripe (accès accordé manuellement).' : ('Portail indisponible : ' + (e && e.message ? e.message : ''));
      addToast && addToast(m, 'error'); setManageBusy(false);
    }
  }

  // Changer d'indice ou d'horizon efface les anciens résultats (pas de confusion).
  function clearResults() { setResults(null); setError(''); setCtx(null); setBt({}); }
  function pickIndex(s) { if (s !== index) { setIndex(s); clearResults(); } }
  function pickDur(d) { if (d !== duration) { setDuration(d); clearResults(); } }

  async function run(force) {
    setError(''); setRunning(true); setResults(null); setBt({});
    try {
      const key = index + '|' + duration;
      if (!force && _oppCache[key] && Date.now() - _oppCache[key].at < 10 * 60 * 1000) {
        setCtx(_oppCache[key].ctx); setResults(_oppCache[key].results); setRunning(false); return;
      }
      const c = await oppGather(index, duration);
      const found = oppFind(c);
      const withPrev = found.map(o => ({ ...o, risk: oppRisk(o.members, c, duration), opp: oppScoreOf(o) }));
      _oppCache[key] = { at: Date.now(), ctx: c, results: withPrev };
      setCtx(c); setResults(withPrev);
    } catch (e) { setError(e && e.message ? e.message : 'Recherche impossible.'); }
    finally { setRunning(false); }
  }

  async function createAndBuild(o) {
    try {
      const l = await DXApi.createList(`Opportunité ${index} · ${o.k} actions`, index, 'Générée par l\'auto-chercheur d\'opportunités');
      for (const t of o.members) { await DXApi.addListItem(l.id, t, null); }
      window.dispatchEvent(new CustomEvent('dx-lists-changed'));
      addToast && addToast('Liste créée — ouverture de la Construction.');
      onNav('construction', { listId: l.id });
    } catch (e) { addToast && addToast('Création impossible : ' + (e && e.message ? e.message : ''), 'error'); }
  }

  // Backtest historique approché d'une opportunité (à la demande).
  async function toggleBacktest(i, o) {
    const cur = bt[i];
    if (cur && cur.open) { setBt(p => ({ ...p, [i]: { ...p[i], open: false } })); return; }
    if (cur && (cur.data || cur.error)) { setBt(p => ({ ...p, [i]: { ...p[i], open: true } })); return; }
    const k = btKey(o.members, index, duration);
    if (_btCache[k]) { setBt(p => ({ ...p, [i]: { open: true, loading: false, data: _btCache[k], thr: 60 } })); return; }
    setBt(p => ({ ...p, [i]: { open: true, loading: true } }));
    try {
      const data = await DXApi.backtestDispersion(o.members, index, duration);
      if (!data || data.error || !data.cumulative) throw new Error(data && data.error ? 'Historique insuffisant pour ce panier.' : 'Backtest indisponible.');
      _btCache[k] = data;
      setBt(p => ({ ...p, [i]: { open: true, loading: false, data, thr: 60 } }));
    } catch (e) {
      const msg = e && /HTTP (4|5)\d\d/.test(e.message || '')
        ? 'Historique insuffisant ou indisponible pour ce panier (certaines valeurs manquent de données sur ~2 ans).'
        : (e && e.message ? e.message : 'Backtest impossible.');
      setBt(p => ({ ...p, [i]: { open: true, loading: false, error: msg } }));
    }
  }

  const fmtS = n => (n >= 0 ? '+' : '−') + Math.abs(Math.round(n)).toLocaleString('fr-FR');
  const fmtP = n => (n >= 0 ? '+' : '−') + Math.abs(n).toFixed(1);

  // ── Écran verrouillé (non Pro) ──
  if (!pro) {
    const signedIn = !!(window.DXCloud && window.DXCloud.user);
    async function goPro() {
      if (!signedIn) { onNav('login'); return; }
      setCheckoutBusy(true);
      try { await window.DXCloud.startProCheckout(); }
      catch (e) { addToast && addToast('Paiement indisponible : ' + (e && e.message ? e.message : ''), 'error'); setCheckoutBusy(false); }
    }
    // Mini-carte factice (aperçu grisé de ce que verrait un abonné).
    const ghostChip = t => <span key={t} style={{ font: '600 11px/1 var(--font-mono)', padding: '4px 9px', borderRadius: 999, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-soft)' }}>{t}</span>;
    const ghostCard = (n, score, tickers, prime, avg, rho) => (
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ width: 46, height: 46, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--accent-soft)', border: '1px solid var(--accent-border)', font: '700 16px/1 var(--font-mono)', color: 'var(--accent-hover)' }}>{score}</div>
          <div style={{ flex: 1, minWidth: 120 }}>
            <div style={{ font: 'var(--type-title)', color: 'var(--text)' }}>Opportunité #{n} · {tickers.length} actions</div>
            <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', marginTop: 2 }}>Score d'opportunité {score}/100</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, auto)', gap: 18 }}>
            <div style={{ textAlign: 'right' }}><div style={{ font: 'var(--type-data)', color: 'var(--pos-bright)' }}>+{prime} pts</div><div style={{ font: 'var(--type-caption)', color: 'var(--text-dim)' }}>Prime ρ</div></div>
            <div style={{ textAlign: 'right' }}><div style={{ font: 'var(--type-data)', color: 'var(--text)' }}>{avg}</div><div style={{ font: 'var(--type-caption)', color: 'var(--text-dim)' }}>Score moy.</div></div>
            <div style={{ textAlign: 'right' }}><div style={{ font: 'var(--type-data)', color: 'var(--info)' }}>{rho}</div><div style={{ font: 'var(--type-caption)', color: 'var(--text-dim)' }}>ρ réalisée</div></div>
          </div>
        </div>
        <div style={{ padding: '12px 20px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>{tickers.map(ghostChip)}</div>
      </div>
    );
    return (
      <div style={{ position: 'relative' }}>
        {/* Aperçu grisé/flouté de la fonction */}
        <div aria-hidden style={{ filter: 'blur(3.5px)', opacity: 0.5, pointerEvents: 'none', userSelect: 'none', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <h1 style={{ font: 'var(--type-h1)', color: 'var(--text)', margin: 0 }}>Auto-chercheur d'opportunités</h1>
              <Badge tone="accent" size="sm">Pro</Badge>
            </div>
            <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)', margin: 0 }}>Teste des milliers de paniers pour trouver les meilleures dispersions d'un indice.</p>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['SPX', 'NDX', 'DJI', 'CAC', 'DAX'].map((s, i) => (
              <span key={s} style={{ padding: '7px 14px', font: '700 12px/1 var(--font-mono)', borderRadius: 'var(--radius)', background: i === 0 ? 'var(--accent)' : 'var(--bg-elevated)', color: i === 0 ? '#fff' : 'var(--text-soft)', border: `1px solid ${i === 0 ? 'var(--accent)' : 'var(--border)'}` }}>{s}</span>
            ))}
          </div>
          {ghostCard(1, 78, ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'META', 'GOOGL'], '9.4', 71, '0.34')}
          {ghostCard(2, 72, ['XOM', 'CVX', 'JPM', 'BAC', 'PFE'], '7.1', 67, '0.41')}
        </div>

        {/* Voile + cadenas */}
        <div style={{ position: 'absolute', inset: 0 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'var(--bg-base)', opacity: 0.42 }} />
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', paddingTop: 48 }}>
            <div style={{ width: '100%', maxWidth: 440, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', padding: '28px 26px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--accent-soft)', border: '1px solid var(--accent-border)', color: 'var(--accent-hover)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
              </div>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <h2 style={{ font: 'var(--type-h2)', color: 'var(--text)', margin: 0 }}>Fonction Pro</h2>
                  <Badge tone="accent" size="sm">Pro</Badge>
                </div>
                <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: 0, maxWidth: 360 }}>
                  Débloquez l'auto-chercheur d'opportunités : les meilleurs paniers de dispersion, prêts à construire.
                </p>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 7, font: 'var(--type-body-sm)', color: 'var(--text-soft)', textAlign: 'left' }}>
                <li>✓ Meilleurs paniers par indice (5 à 20 actions)</li>
                <li>✓ Sizing vega-neutre + 3 scénarios de stress</li>
                <li>✓ Backtest historique de la prime capturée</li>
              </ul>
              <button onClick={goPro} disabled={checkoutBusy}
                style={{ font: '600 13px/1 var(--font-sans)', padding: '11px 26px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--accent)', color: '#fff', cursor: checkoutBusy ? 'default' : 'pointer', opacity: checkoutBusy ? 0.7 : 1 }}>
                {checkoutBusy ? 'Redirection…' : (signedIn ? 'Passer Pro →' : 'Se connecter pour passer Pro')}
              </button>
              <div style={{ font: 'var(--type-caption)', color: 'var(--text-dim)' }}>Abonnement mensuel · paiement sécurisé Stripe · résiliable à tout moment</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <h1 style={{ font: 'var(--type-h1)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: 0 }}>Auto-chercheur d'opportunités</h1>
            <Badge tone="accent" size="sm">Pro</Badge>
          </div>
          <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)', margin: 0, maxWidth: 680 }}>
            Teste des milliers de paniers pour trouver les meilleures dispersions d'un indice : score de dispersion élevé + forte prime de corrélation + diversification.
          </p>
        </div>
        {subscribed && (
          <button onClick={manageSub} disabled={manageBusy} title="Résilier, changer de carte, factures"
            style={{ flexShrink: 0, font: '600 12px/1 var(--font-sans)', padding: '9px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-soft)', cursor: manageBusy ? 'default' : 'pointer', opacity: manageBusy ? 0.7 : 1 }}>
            {manageBusy ? 'Ouverture…' : 'Gérer l\'abonnement'}
          </button>
        )}
      </div>

      {/* Bandeau honnête */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', padding: '10px 16px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderLeft: '3px solid var(--info)', borderRadius: 'var(--radius-lg)', font: 'var(--type-body-sm)', color: 'var(--text-soft)' }}>
        <span style={{ color: 'var(--info)', font: '700 13px/1 var(--font-mono)', flexShrink: 0 }}>i</span>
        <span>Recherche <strong style={{ color: 'var(--text)' }}>indicative</strong> sur données différées/estimées. Les paniers sont un <strong style={{ color: 'var(--text)' }}>point de départ à valider</strong> — pas un conseil ni une garantie de gain.</span>
      </div>

      {/* Contrôles */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Indice</span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {INDICES.map(s => (
            <button key={s} onClick={() => pickIndex(s)} disabled={running}
              style={{ padding: '7px 14px', font: '700 12px/1 var(--font-mono)', borderRadius: 'var(--radius)', cursor: running ? 'default' : 'pointer',
                background: index === s ? 'var(--accent)' : 'var(--bg-elevated)', color: index === s ? '#fff' : 'var(--text-soft)', border: `1px solid ${index === s ? 'var(--accent)' : 'var(--border)'}` }}>{s}</button>
          ))}
        </div>
        <span style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginLeft: 6 }}>Horizon</span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {DURATIONS.map(o => (
            <button key={o.v} onClick={() => pickDur(o.v)} disabled={running} title={o.v + ' jours'}
              style={{ padding: '7px 12px', font: '600 12px/1 var(--font-sans)', borderRadius: 'var(--radius)', cursor: running ? 'default' : 'pointer',
                background: duration === o.v ? 'var(--accent)' : 'var(--bg-elevated)', color: duration === o.v ? '#fff' : 'var(--text-soft)', border: `1px solid ${duration === o.v ? 'var(--accent)' : 'var(--border)'}` }}>{o.l}</button>
          ))}
        </div>
        <button onClick={() => run(false)} disabled={running}
          style={{ marginLeft: 'auto', font: '600 13px/1 var(--font-sans)', padding: '10px 22px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--accent)', color: '#fff', cursor: running ? 'default' : 'pointer', opacity: running ? 0.7 : 1 }}>
          {running ? 'Recherche…' : '⌕ Chercher les opportunités'}
        </button>
        {results && !running && (
          <button onClick={() => run(true)} title="Relancer avec des données fraîches"
            style={{ font: '600 12px/1 var(--font-sans)', padding: '10px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>↻</button>
        )}
      </div>

      {/* Baromètre compact (le détail + alertes + earnings sont dans Marché Pro) */}
      {window.CorrelationBarometer && <window.CorrelationBarometer index={index} compact onNav={onNav} />}

      {error && (
        <div style={{ font: 'var(--type-body-sm)', color: 'var(--neg-bright)', background: 'var(--neg-soft)', border: '1px solid var(--neg)', borderRadius: 'var(--radius)', padding: '10px 14px' }}>{error}</div>
      )}

      {running && (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', font: 'var(--type-body)' }}>
          Analyse du vivier, matrice de corrélation, recherche des meilleurs paniers…
        </div>
      )}

      {!running && results && results.length === 0 && (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', font: 'var(--type-body-sm)', background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)' }}>
          Aucune opportunité claire trouvée sur cet indice pour l'instant.
        </div>
      )}

      {/* Résultats */}
      {!running && results && results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {results.map((o, i) => (
            <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
                <div style={{ width: 46, height: 46, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--accent-soft)', border: '1px solid var(--accent-border)', font: '700 16px/1 var(--font-mono)', color: 'var(--accent-hover)' }}>
                  {o.opp}
                </div>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ font: 'var(--type-title)', color: 'var(--text)' }}>Opportunité #{i + 1} · {o.k} actions</div>
                  <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', marginTop: 2 }}>Score d'opportunité {o.opp}/100 · {index} · horizon {duration}j</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, auto)', gap: 18 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ font: 'var(--type-data)', color: o.prime >= 0 ? 'var(--pos-bright)' : 'var(--neg-bright)' }}>{(o.prime >= 0 ? '+' : '') + o.prime.toFixed(1)} pts</div>
                    <div style={{ font: 'var(--type-caption)', color: 'var(--text-dim)' }}>Prime ρ</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ font: 'var(--type-data)', color: 'var(--text)' }}>{Math.round(o.avgScore)}</div>
                    <div style={{ font: 'var(--type-caption)', color: 'var(--text-dim)' }}>Score moy.</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ font: 'var(--type-data)', color: 'var(--info)' }}>{o.rhoReal.toFixed(2)}</div>
                    <div style={{ font: 'var(--type-caption)', color: 'var(--text-dim)' }}>ρ réalisée</div>
                  </div>
                </div>
                <button onClick={() => createAndBuild(o)}
                  style={{ font: '600 12px/1 var(--font-sans)', padding: '10px 16px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', flexShrink: 0 }}>
                  Créer la liste & construire →
                </button>
              </div>
              <div style={{ padding: '12px 20px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {o.members.map(t => (
                  <span key={t} style={{ font: '600 11px/1 var(--font-mono)', padding: '4px 9px', borderRadius: 999, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-soft)' }}>{t}</span>
                ))}
              </div>
              {o.risk && (
                <div style={{ padding: '12px 20px 16px', display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'baseline', font: 'var(--type-caption)', color: 'var(--text-muted)' }}>
                    <span>Construction vega-neutre : <strong style={{ color: 'var(--text-soft)' }}>{o.risk.totalContracts}</strong> contrats long · 1 indice short</span>
                    <span>Vega net <strong style={{ color: Math.abs(o.risk.netVega) < 60 ? 'var(--pos-bright)' : 'var(--warn)' }}>{fmtS(o.risk.netVega)} $/1%</strong></span>
                    <span>Theta <strong style={{ color: 'var(--text-soft)' }}>{fmtS(o.risk.netTheta)} $/j</strong></span>
                    <span>Prime <strong style={{ color: o.risk.netPremium >= 0 ? 'var(--pos-bright)' : 'var(--neg-bright)' }}>{fmtS(o.risk.netPremium)} $</strong></span>
                    {o.risk.edgeRisk != null && (
                      <span>Edge/risque <strong style={{ color: o.risk.edgeRisk >= 1 ? 'var(--pos-bright)' : 'var(--warn)' }}>{o.risk.edgeRisk.toFixed(2)}×</strong></span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {o.risk.scen.map(s => (
                      <div key={s.name} style={{ flex: '1 1 150px', minWidth: 130, padding: '8px 12px', borderRadius: 'var(--radius)', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderLeft: `3px solid var(--${s.tone})` }}>
                        <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)' }}>{s.name}</div>
                        <div style={{ font: 'var(--type-data-sm)', color: s.pnl >= 0 ? 'var(--pos-bright)' : 'var(--neg-bright)', marginTop: 2 }}>{fmtS(s.pnl)} $</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Backtest historique (approché, à la demande) ── */}
              <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <button onClick={() => toggleBacktest(i, o)}
                  style={{ width: '100%', textAlign: 'left', padding: '10px 20px', background: 'transparent', border: 'none', cursor: 'pointer', font: '600 12px/1 var(--font-sans)', color: 'var(--text-soft)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ font: '700 11px/1 var(--font-mono)', color: 'var(--accent-hover)' }}>{bt[i] && bt[i].open ? '▾' : '▸'}</span>
                  Backtest historique <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>· prime de corrélation capturée sur ~2 ans (approché)</span>
                </button>
                {bt[i] && bt[i].open && (
                  <div style={{ padding: '4px 20px 18px' }}>
                    {bt[i].loading && (
                      <div style={{ padding: '18px 0', textAlign: 'center', font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}>Calcul sur l'historique…</div>
                    )}
                    {bt[i].error && (
                      <div style={{ font: 'var(--type-body-sm)', color: 'var(--warn)', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 14px' }}>{bt[i].error}</div>
                    )}
                    {bt[i].data && (() => {
                      const D = bt[i].data, st = D.stats;
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '12px 14px 6px' }}>
                            <BtChart pts={D.cumulative.map(c => c.cum)} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', font: 'var(--type-caption)', color: 'var(--text-dim)', marginTop: 4 }}>
                              <span>{D.cumulative[0] && D.cumulative[0].date}</span>
                              <span>prime cumulée capturée (pts) · {D.n_windows} fenêtres de {D.horizon}j</span>
                              <span>{D.cumulative[D.cumulative.length - 1] && D.cumulative[D.cumulative.length - 1].date}</span>
                            </div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))', gap: 8 }}>
                            {[
                              { l: 'Réussite', v: st.hit_rate + '%', c: st.hit_rate >= 55 ? 'var(--pos-bright)' : st.hit_rate >= 45 ? 'var(--text)' : 'var(--neg-bright)', t: '% de fenêtres où la dispersion aurait payé (ρ implicite > ρ réalisée)' },
                              { l: 'Prime moy.', v: fmtP(st.avg_edge) + ' pts', c: st.avg_edge >= 0 ? 'var(--pos-bright)' : 'var(--neg-bright)', t: 'prime de corrélation moyenne capturée par fenêtre' },
                              { l: 'Cumul', v: fmtP(st.cum_edge) + ' pts', c: st.cum_edge >= 0 ? 'var(--pos-bright)' : 'var(--neg-bright)', t: 'somme des primes capturées sur toute la période' },
                              { l: 'Meilleure', v: fmtP(st.best) + ' pts', c: 'var(--text-soft)', t: 'meilleure fenêtre' },
                              { l: 'Pire', v: fmtP(st.worst) + ' pts', c: 'var(--text-soft)', t: 'pire fenêtre' },
                            ].map(m => (
                              <div key={m.l} title={m.t} style={{ padding: '8px 10px', borderRadius: 'var(--radius)', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                                <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)' }}>{m.l}</div>
                                <div style={{ font: 'var(--type-data-sm)', color: m.c, marginTop: 2 }}>{m.v}</div>
                              </div>
                            ))}
                          </div>
                          {/* ── Backtest filtré par signal (corrélation chère) ── */}
                          {(() => {
                            const scored = (D.windows || []).filter(w => w.pct != null);
                            if (scored.length < 4) return null;
                            const thr = bt[i].thr != null ? bt[i].thr : 60;
                            const always = btStatsOf(scored.map(w => w.edge));
                            const filtered = btStatsOf(scored.filter(w => w.pct >= thr).map(w => w.edge));
                            const better = filtered.n > 0 && filtered.avg > always.avg;
                            const cell = (l, v, c) => (
                              <div><div style={{ font: 'var(--type-caption)', color: 'var(--text-dim)' }}>{l}</div>
                                <div style={{ font: 'var(--type-data-sm)', color: c || 'var(--text-soft)', marginTop: 2 }}>{v}</div></div>
                            );
                            const box = (title, s, hero) => (
                              <div style={{ flex: '1 1 190px', padding: '12px 14px', borderRadius: 'var(--radius)', background: 'var(--bg-card)', border: `1px solid ${hero ? 'var(--accent-border)' : 'var(--border)'}` }}>
                                <div style={{ font: '600 12px/1 var(--font-sans)', color: hero ? 'var(--accent-hover)' : 'var(--text-muted)', marginBottom: 10 }}>{title}</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                  {cell('Fenêtres', s.n)}
                                  {cell('Réussite', s.hit + '%', s.hit >= 55 ? 'var(--pos-bright)' : 'var(--text)')}
                                  {cell('Prime moy.', fmtP(s.avg) + ' pts', s.avg >= 0 ? 'var(--pos-bright)' : 'var(--neg-bright)')}
                                  {cell('Cumul', fmtP(s.cum) + ' pts', s.cum >= 0 ? 'var(--pos-bright)' : 'var(--neg-bright)')}
                                </div>
                              </div>
                            );
                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 14px', borderRadius: 'var(--radius-lg)', background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                                  <span style={{ font: '600 12px/1 var(--font-sans)', color: 'var(--text-soft)' }}>N'entrer qu'au-dessus du</span>
                                  <span style={{ font: '700 13px/1 var(--font-mono)', color: 'var(--accent-hover)', minWidth: 52 }}>{thr}<sup>e</sup> pct</span>
                                  <input type="range" min={0} max={90} step={5} value={thr}
                                    onChange={e => { const v = Number(e.target.value); setBt(p => ({ ...p, [i]: { ...p[i], thr: v } })); }}
                                    style={{ flex: 1, minWidth: 140, accentColor: 'var(--accent)' }} />
                                  <span style={{ font: 'var(--type-caption)', color: 'var(--text-dim)' }}>de corrélation implicite</span>
                                </div>
                                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                  {box('Toujours investi', always, false)}
                                  {box(`Filtré · ≥ ${thr}e pct`, filtered, true)}
                                </div>
                                <div style={{ font: 'var(--type-caption)', color: better ? 'var(--pos-bright)' : 'var(--text-dim)', lineHeight: 1.5 }}>
                                  {filtered.n === 0
                                    ? 'Aucune fenêtre au-dessus de ce seuil — baissez le percentile.'
                                    : better
                                      ? `✓ Entrer seulement quand la corrélation est chère améliore la prime moyenne par fenêtre (${fmtP(always.avg)} → ${fmtP(filtered.avg)} pts) : le signal a un edge.`
                                      : 'À ce seuil, le filtre n\'améliore pas la prime moyenne — essayez un autre percentile.'}
                                  {' '}<span style={{ color: 'var(--text-dim)' }}>Walk-forward (rang vs passé, sans look-ahead), sur ~2 ans.</span>
                                </div>
                              </div>
                            );
                          })()}
                          {D.skipped && D.skipped.length > 0 && (
                            <div style={{ font: 'var(--type-caption)', color: 'var(--text-dim)' }}>Sans historique exploitable : {D.skipped.join(', ')}</div>
                          )}
                          <div style={{ font: 'var(--type-caption)', color: 'var(--text-dim)', lineHeight: 1.5 }}>
                            <strong style={{ color: 'var(--text-muted)' }}>Approximation.</strong> Prime capturée = ρ implicite à l'entrée (VIX/HV) − ρ réalisée sur la période, sur prix historiques uniquement.
                            Ce n'est <strong>pas</strong> un P&L d'options réel (hors primes exactes, coûts d'exécution, theta) — un indicateur de l'edge structurel de la dispersion, à titre indicatif.
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

window.OpportunityFinder = OpportunityFinder;
