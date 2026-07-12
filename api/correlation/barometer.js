// POST /api/correlation/barometer
// Body: { tickers: string[], index: string }
// Baromètre de corrélation IMPLICITE d'un indice : série ~2 ans de ρ_implicite
// (méthode HV, cohérente entre passé et présent → percentile fiable) + valeur
// actuelle, son RANG PERCENTILE historique et un verdict. C'est le signal
// « la corrélation est-elle chère ? » que suit un trader de dispersion.
// Prix historiques uniquement (Yahoo) — approximation assumée, pas d'options.
export const config = { runtime: 'edge' };

import { allow, tooMany } from '../_lib/ratelimit.js';

import { proxyEtf } from '../_lib/proxy-scale.js';
import { cboeIvBundle } from '../_lib/cboe.js';
import { impliedCorrelation, vegaWeights } from '../_lib/dispersion-math.js';

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
    for (let i = 0; i < closes.length; i++) if (closes[i] != null && isFinite(closes[i]) && closes[i] > 0) out.push({ t: ts[i], c: closes[i] });
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
function rhoImpl(sigIdx, avgHv) {
  if (!sigIdx || !avgHv || avgHv <= 0) return null;
  return Math.min(0.95, Math.max(0.05, (sigIdx / (avgHv * 1.08)) ** 2));
}

export default async (req) => {
  if (!allow(req, { limit: 120, windowMs: 10000 })) return tooMany();
  let body = {};
  try { body = await req.json(); } catch {}
  const tickers = (body.tickers || []).map(s => String(s).toUpperCase()).slice(0, 25);
  const index = (body.index || 'SPX').toUpperCase();
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

  const compRets = valid.map(t => logRets(compSeries[t]));
  const idxRets = logRets(idxSeries);
  const minLen = Math.min(idxRets.length, ...compRets.map(a => a.length));
  if (minLen < 120) return Response.json({ error: 'insufficient_history' }, { status: 502 });
  const comp = compRets.map(a => a.slice(-minLen));
  const idx = idxRets.slice(-minLen);
  const idxDates = idxSeries.map(x => x.t).slice(-(minLen + 1)).slice(1);

  const LB = 21;              // fenêtre glissante de vol/corrélation (trailing)
  const STEP = 3;            // ~1 point tous les 3 jours de bourse
  const series = [];
  for (let t = LB; t <= minLen; t += STEP) {
    const sigIdx = (hvAnnual(idx.slice(t - LB, t)) || 0) * 1.30;
    const hvs = comp.map(a => hvAnnual(a.slice(t - LB, t))).filter(v => v != null);
    const avgHv = hvs.length ? hvs.reduce((a, b) => a + b, 0) / hvs.length : null;
    const impl = rhoImpl(sigIdx, avgHv);
    let rsum = 0, rcnt = 0;
    for (let i = 0; i < comp.length; i++) for (let j = i + 1; j < comp.length; j++) {
      const c = pearson(comp[i].slice(t - LB, t), comp[j].slice(t - LB, t));
      if (c !== null) { rsum += c; rcnt++; }
    }
    const real = rcnt ? rsum / rcnt : null;
    if (impl == null || real == null) continue;
    const d = idxDates[t - 1] ? new Date(idxDates[t - 1] * 1000).toISOString().slice(0, 10) : null;
    series.push({ date: d, impl: Number(impl.toFixed(3)), real: Number(real.toFixed(3)) });
  }
  if (series.length < 10) return Response.json({ error: 'no_series' }, { status: 502 });

  const cur = series[series.length - 1];
  const implVals = series.map(s => s.impl);
  const below = implVals.filter(v => v <= cur.impl).length;
  const percentile = Math.round((below / implVals.length) * 100);
  const prime = Number(((cur.impl - cur.real) * 100).toFixed(1));

  // ── Valeur ACTUELLE en IV RÉELLE (options Cboe) : ρ_impl option-implied du
  //    panier (formule CBOE, vega-pondérée), cohérente avec le score/finder/lab.
  //    Le PERCENTILE, lui, reste calculé sur la série HV 2 ans (pas d'historique
  //    d'options) — méthode cohérente pour un rang fiable. Fail-safe : null. ──
  let implIv = null, primeIv = null, implIvSrc = 'hv_proxy';
  try {
    const bundles = await Promise.all([
      cboeIvBundle(index, 30).catch(() => null),
      ...valid.map(t => cboeIvBundle(t, 30).catch(() => null)),
    ]);
    const sI = bundles[0]?.iv > 0 ? bundles[0].iv / 100 : null;
    const names = valid.map((t, i) => ({
      ticker: t, w: 1,
      sigma: bundles[i + 1]?.iv > 0 ? bundles[i + 1].iv / 100 : null,
      vega: bundles[i + 1]?.greeks?.vega ?? null,
    })).filter(n => n.sigma > 0);
    if (sI && names.length >= 2) {
      const vw = vegaWeights(names);
      const r = impliedCorrelation(sI, vw || names);
      if (r != null) {
        implIv = Number(r.toFixed(3));
        primeIv = Number(((implIv - cur.real) * 100).toFixed(1));
        implIvSrc = vw ? 'cboe_vega' : 'cboe_notional';
      }
    }
  } catch {}

  // Rang percentile élevé = corrélation implicite historiquement chère → une
  // dispersion (short corrélation) est attractive.
  let verdict, tone;
  if (percentile >= 70) { verdict = 'Corrélation chère — dispersion attractive'; tone = 'pos'; }
  else if (percentile >= 40) { verdict = 'Corrélation dans la normale'; tone = 'warn'; }
  else { verdict = 'Corrélation basse — dispersion peu payante'; tone = 'neg'; }

  return Response.json({
    index, n_tickers: valid.length, skipped,
    current: { impl: cur.impl, real: cur.real, prime, percentile, verdict, tone, impl_iv: implIv, prime_iv: primeIv, impl_source: implIvSrc },
    series,
    updated: new Date().toISOString(),
    approx: true,
  });
};
