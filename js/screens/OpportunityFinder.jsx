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

// Aperçu de construction vega-neutre (répartition égale) — 100 % local.
function oppPreview(members, ctx, dur) {
  const sg = window.DXRisk && window.DXRisk.straddleGreeks;
  if (!sg) return null;
  const idxG = sg(ctx.indexPrice, ctx.indexIV, dur);
  const targetVega = idxG.vega, w = 1 / members.length;
  let compVega = 0, compTheta = 0, totalContracts = 0, priced = 0;
  members.forEach(t => {
    const S = ctx.price[t], ivv = ctx.iv[t];
    if (!S || !ivv) return;
    const g = sg(S, ivv, dur);
    const n = Math.max(1, Math.round(targetVega * w / g.vega));
    compVega += g.vega * n; compTheta += g.theta * n; totalContracts += n; priced++;
  });
  return { totalContracts, netVega: compVega - idxG.vega, netTheta: compTheta - idxG.theta, priced, total: members.length };
}

function oppScoreOf(o) {
  return Math.max(0, Math.min(100, Math.round(50 + o.prime * 2.2 + (o.avgScore - 62) * 0.6)));
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
  const hv = {}, iv = {};
  (volData?.results || []).forEach(r => { if (r && r.ticker && !r.error) { hv[r.ticker] = r.hv30 != null ? r.hv30 : 25; iv[r.ticker] = r.iv_est != null ? r.iv_est : 30; } });
  const quotes = d.quotes || {};
  const price = {}, sector = {};
  mt.forEach(t => { price[t] = quotes[t] && quotes[t].price != null ? parseFloat(quotes[t].price) : null; });
  comps.forEach(c => { if (c.ticker) sector[c.ticker] = c.sector || 'Autre'; });
  const sigmaIdx = corrData && corrData.vix_level ? corrData.vix_level / 100 : (d.snap && d.snap.iv_est ? d.snap.iv_est / 100 : 0.18);
  const pool = mt.filter(t => hv[t] != null && scores[t] != null);
  if (pool.length < OPP_SIZE_MIN) throw new Error('vivier trop maigre (données de vol manquantes) — réessayez.');
  return {
    index, pool, corr, hv, iv, score: scores, price, sector, sigmaIdx,
    indexPrice: (d.snap && (d.snap.etf_price || d.snap.price)) || 100,
    indexIV: (d.snap && d.snap.iv_est) || 18,
    indexEtf: (d.snap && d.snap.etf) || index,
  };
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

  // Changer d'indice ou d'horizon efface les anciens résultats (pas de confusion).
  function clearResults() { setResults(null); setError(''); setCtx(null); }
  function pickIndex(s) { if (s !== index) { setIndex(s); clearResults(); } }
  function pickDur(d) { if (d !== duration) { setDuration(d); clearResults(); } }

  async function run(force) {
    setError(''); setRunning(true); setResults(null);
    try {
      const key = index + '|' + duration;
      if (!force && _oppCache[key] && Date.now() - _oppCache[key].at < 10 * 60 * 1000) {
        setCtx(_oppCache[key].ctx); setResults(_oppCache[key].results); setRunning(false); return;
      }
      const c = await oppGather(index, duration);
      const found = oppFind(c);
      const withPrev = found.map(o => ({ ...o, preview: oppPreview(o.members, c, duration), opp: oppScoreOf(o) }));
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

  const fmtS = n => (n >= 0 ? '+' : '−') + Math.abs(Math.round(n)).toLocaleString('fr-FR');

  // ── Écran verrouillé (non Pro) ──
  if (!pro) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '64px 24px', textAlign: 'center' }}>
        <div style={{ font: '700 22px/1 var(--font-mono)', color: 'var(--accent-hover)' }}>✦ Pro</div>
        <h1 style={{ font: 'var(--type-h1)', color: 'var(--text)', margin: 0 }}>Auto-chercheur d'opportunités</h1>
        <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)', margin: 0, maxWidth: 520 }}>
          Fonction <strong style={{ color: 'var(--text-soft)' }}>Pro</strong> : trouve automatiquement les meilleurs paniers d'un indice (score de dispersion + prime de corrélation) et propose leur construction. Réservée aux comptes Pro.
        </p>
        <button onClick={() => onNav('login')} style={{ font: '600 13px/1 var(--font-sans)', padding: '11px 22px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}>Se connecter</button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* En-tête */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <h1 style={{ font: 'var(--type-h1)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: 0 }}>Auto-chercheur d'opportunités</h1>
          <Badge tone="accent" size="sm">Pro</Badge>
        </div>
        <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)', margin: 0, maxWidth: 680 }}>
          Teste des milliers de paniers pour trouver les meilleures dispersions d'un indice : score de dispersion élevé + forte prime de corrélation + diversification.
        </p>
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
              {o.preview && (
                <div style={{ padding: '10px 20px 16px', display: 'flex', gap: 20, flexWrap: 'wrap', font: 'var(--type-caption)', color: 'var(--text-muted)' }}>
                  <span>Aperçu construction (vega-neutre) :</span>
                  <span><strong style={{ color: 'var(--text-soft)' }}>{o.preview.totalContracts}</strong> contrats long comp. · 1 indice short</span>
                  <span>Vega net <strong style={{ color: Math.abs(o.preview.netVega) < 60 ? 'var(--pos-bright)' : 'var(--warn)' }}>{fmtS(o.preview.netVega)} $/1%</strong></span>
                  <span>Theta net <strong style={{ color: 'var(--text-soft)' }}>{fmtS(o.preview.netTheta)} $/j</strong></span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

window.OpportunityFinder = OpportunityFinder;
