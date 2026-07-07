// POST /api/backtest/dispersion
// Body: { tickers: string[], index: string, horizon?: number }
// Backtest APPROCHÉ d'une dispersion, sur PRIX historiques uniquement (Yahoo,
// ~2 ans) — PAS de vraie chaîne d'options. À chaque fenêtre glissante de
// `horizon` jours : prime de corrélation capturée = ρ_implicite(entrée) −
// ρ_réalisée(période). C'est l'edge structurel qu'une dispersion monétise.
// Limites assumées : σ_indice implicite ≈ HV_indice ×1.30 (pas de VIX historique
// ici), alignement des séries par position (calendriers supposés proches),
// hors coûts d'exécution / theta path / vraies primes d'options.
export const config = { runtime: 'edge' };

import { proxyEtf } from '../_lib/proxy-scale.js';

async function fetchSeries(symbol) {
  const yh = symbol.replace(/\.([A-Z])$/, '-$1');
  try {
    const r = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yh)}?interval=1d&range=2y`,
      { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(9000) }
    );
    if (!r.ok) return null;
    const res = (await r.json())?.chart?.result?.[0];
    if (!res) return null;
    const ts = res.timestamp || [];
    const closes = res.indicators?.quote?.[0]?.close || [];
    const out = [];
    for (let i = 0; i < closes.length; i++) {
      if (closes[i] != null && isFinite(closes[i]) && closes[i] > 0) out.push({ t: ts[i], c: closes[i] });
    }
    return out.length >= 60 ? out : null;
  } catch { return null; }
}

function logRets(s) { const r = []; for (let i = 1; i < s.length; i++) r.push(Math.log(s[i].c / s[i - 1].c)); return r; }

function pearson(x, y) {
  const n = Math.min(x.length, y.length);
  if (n < 4) return null;
  const xi = x.slice(-n), yi = y.slice(-n);
  const mx = xi.reduce((a, b) => a + b, 0) / n, my = yi.reduce((a, b) => a + b, 0) / n;
  let cov = 0, vx = 0, vy = 0;
  for (let i = 0; i < n; i++) { cov += (xi[i] - mx) * (yi[i] - my); vx += (xi[i] - mx) ** 2; vy += (yi[i] - my) ** 2; }
  return vx > 0 && vy > 0 ? cov / Math.sqrt(vx * vy) : 0;
}
function hvAnnual(rets) {
  if (!rets || rets.length < 3) return null;
  const m = rets.reduce((a, b) => a + b, 0) / rets.length;
  const v = rets.reduce((a, b) => a + (b - m) ** 2, 0) / (rets.length - 1);
  return Math.sqrt(v * 252);
}
function rhoImpl(sigmaIdx, avgHv) {
  if (!sigmaIdx || !avgHv || avgHv <= 0) return null;
  return Math.min(0.95, Math.max(0.05, (sigmaIdx / (avgHv * 1.08)) ** 2));
}

export default async (req) => {
  let body = {};
  try { body = await req.json(); } catch {}
  const tickers = (body.tickers || []).map(s => String(s).toUpperCase()).slice(0, 25);
  const index   = (body.index || 'SPX').toUpperCase();
  const horizon = Math.max(7, Math.min(Number(body.horizon) || 30, 120));
  if (tickers.length < 2) return Response.json({ error: 'need_2_tickers' }, { status: 400 });

  const idxEtf = proxyEtf(index);
  const fetched = await Promise.allSettled([...tickers.map(fetchSeries), fetchSeries(idxEtf)]);
  const compSeries = {}, skipped = [];
  tickers.forEach((t, i) => {
    const s = fetched[i].status === 'fulfilled' ? fetched[i].value : null;
    if (s) compSeries[t] = s; else skipped.push(t);
  });
  const idxSeries = fetched[tickers.length].status === 'fulfilled' ? fetched[tickers.length].value : null;
  const valid = Object.keys(compSeries);
  if (valid.length < 2 || !idxSeries) return Response.json({ error: 'no_history' }, { status: 502 });

  // Rendements + alignement par position (depuis la fin).
  const compRets = valid.map(t => logRets(compSeries[t]));
  const idxRets  = logRets(idxSeries);
  const minLen = Math.min(idxRets.length, ...compRets.map(a => a.length));
  if (minLen < 120) return Response.json({ error: 'insufficient_history' }, { status: 502 });
  const comp = compRets.map(a => a.slice(-minLen));
  const idx  = idxRets.slice(-minLen);
  const idxDates = idxSeries.map(x => x.t).slice(-(minLen + 1)).slice(1);   // date ~ du jour du rendement

  const LB = 21;                                              // lookback vol d'entrée
  const win = Math.max(5, Math.round(horizon * 21 / 30));     // fenêtre en jours de bourse
  const windows = [];
  for (let s = LB; s + win <= minLen; s += win) {
    // ρ implicite à l'entrée : σ_idx (HV lookback ×1.30) et σ̄ composants (HV lookback)
    const sigIdx = (hvAnnual(idx.slice(s - LB, s)) || 0) * 1.30;
    const hvs = comp.map(a => hvAnnual(a.slice(s - LB, s))).filter(v => v != null);
    const avgHv = hvs.length ? hvs.reduce((a, b) => a + b, 0) / hvs.length : null;
    const ri = rhoImpl(sigIdx, avgHv);
    // ρ réalisée sur la fenêtre
    let rsum = 0, rcnt = 0;
    for (let i = 0; i < comp.length; i++) for (let j = i + 1; j < comp.length; j++) {
      const c = pearson(comp[i].slice(s, s + win), comp[j].slice(s, s + win));
      if (c !== null) { rsum += c; rcnt++; }
    }
    const rr = rcnt ? rsum / rcnt : null;
    if (ri == null || rr == null) continue;
    const edge = Number(((ri - rr) * 100).toFixed(2));         // prime capturée (pts)
    const d = idxDates[s] ? new Date(idxDates[s] * 1000).toISOString().slice(0, 10) : null;
    windows.push({ date: d, rho_impl: Number(ri.toFixed(3)), rho_real: Number(rr.toFixed(3)), edge });
  }
  if (!windows.length) return Response.json({ error: 'no_windows' }, { status: 502 });

  // Percentile de ρ implicite À L'ENTRÉE, en WALK-FORWARD (rang vs les seules
  // fenêtres PASSÉES → pas de look-ahead). Permet le backtest « filtré par
  // signal » : n'entrer que quand la corrélation est chère. `pct=null` tant
  // qu'il n'y a pas assez d'historique.
  const MIN_PRIOR = 6;
  windows.forEach((w, i) => {
    if (i < MIN_PRIOR) { w.pct = null; return; }
    const priors = windows.slice(0, i).map(x => x.rho_impl);
    const below = priors.filter(v => v <= w.rho_impl).length;
    w.pct = Math.round((below / priors.length) * 100);
  });

  let cum = 0;
  const cumulative = windows.map(w => { cum += w.edge; return { date: w.date, cum: Number(cum.toFixed(2)) }; });
  const edges = windows.map(w => w.edge);
  const n = edges.length;
  const wins = edges.filter(e => e > 0).length;
  const avgEdge = edges.reduce((a, b) => a + b, 0) / n;

  return Response.json({
    index, horizon, n_windows: n, n_tickers: valid.length, skipped,
    windows, cumulative,
    stats: {
      hit_rate: Number(((wins / n) * 100).toFixed(0)),
      avg_edge: Number(avgEdge.toFixed(2)),
      cum_edge: Number(cum.toFixed(1)),
      best: Number(Math.max(...edges).toFixed(1)),
      worst: Number(Math.min(...edges).toFixed(1)),
    },
    approx: true,
  });
};
