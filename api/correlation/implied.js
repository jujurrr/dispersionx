// POST /api/correlation/implied
// Body: { index, tickers[], weights?[], duration? }
// Corrélation implicite RÉELLE d'un panier (formule CBOE) à partir des IV ATM
// Cboe de l'indice et des composants au ténor demandé, + variante VEGA-pondérée
// (le P&L d'une dispersion est piloté par le vega, pas par la capitalisation).
// C'est l'ancre de la prime de dispersion ρ_impl − ρ_réalisée — elle remplace la
// constante 0.65 dans le scoring. Fail-safe : indice indisponible ou coverage
// insuffisante → rho_impl:null (l'appelant retombe alors sur son défaut).
export const config = { runtime: 'edge' };

import { allow, tooMany } from '../_lib/ratelimit.js';
import { cboeIvBundle } from '../_lib/cboe.js';
import { kvCacheGet, kvCacheSet } from '../_lib/iv-cache.js';
import { impliedCorrelation, vegaWeights, vegaShares } from '../_lib/dispersion-math.js';

const MAX_NAMES = 50;               // borne les appels Cboe (les gros poids dominent ρ_impl)
const TTL_MS = 15 * 60 * 1000;      // cache résultat 15 min (aligné sur le cache IV)
const MIN_COVERAGE = 0.4;           // en-dessous, l'estimation est trop biaisée → fail-safe

// Concurrence bornée (motif maison, cf. api/earnings/calendar.js) : ne dépasse
// jamais `limit` requêtes Cboe simultanées.
async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) { const i = next++; out[i] = await fn(items[i], i); }
  }));
  return out;
}

function hashTickers(tickers) {
  let h = 0; const s = tickers.slice().sort().join(',');
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

export default async (req) => {
  if (!allow(req, { limit: 60, windowMs: 10000 })) return tooMany();
  let body = {};
  try { body = await req.json(); } catch {}

  const index = String(body.index || 'SPX').toUpperCase();
  const duration = Math.max(7, Math.min(Number(body.duration) || 30, 120));
  const tickers = Array.isArray(body.tickers) ? body.tickers.map(t => String(t).toUpperCase().trim()).filter(Boolean) : [];
  const weights = Array.isArray(body.weights) ? body.weights : [];

  if (tickers.length < 2) return Response.json({ rho_impl: null, method: 'too_few_names', n: tickers.length });

  // Appariement ticker/poids. La corrélation implicite est dominée par les plus
  // gros poids ; on trie par poids décroissant et on borne à MAX_NAMES pour
  // limiter les appels réseau (le terme correctif Σw²σ² du tail est négligeable).
  let pairs = tickers.map((t, i) => ({ ticker: t, w: Number(weights[i]) > 0 ? Number(weights[i]) : null }));
  const hasW = pairs.some(p => p.w != null);
  if (!hasW) pairs.forEach(p => { p.w = 1; });            // équipondéré si poids absents
  else pairs.forEach(p => { if (p.w == null) p.w = 0; });  // poids manquant isolé → 0
  const totalW = pairs.reduce((s, p) => s + (p.w || 0), 0) || 1;
  pairs.sort((a, b) => (b.w || 0) - (a.w || 0));
  const used = pairs.slice(0, MAX_NAMES);

  const cacheKey = `IMPCORR:${index}:${duration}:${hashTickers(used.map(p => p.ticker))}`;
  const cached = await kvCacheGet(cacheKey, TTL_MS);
  if (cached && cached.rho_impl !== undefined) return Response.json({ ...cached, cached: true });

  // IV de l'indice + IV/vega des composants (Cboe, cache partagé Supabase),
  // concurrence bornée. Ce passage RÉCHAUFFE aussi le cache IV du panier pour le
  // scoring par nom qui suit.
  const [idxBundle, perRaw] = await Promise.all([
    cboeIvBundle(index, duration).catch(() => null),
    mapLimit(used, 8, async (p) => {
      const b = await cboeIvBundle(p.ticker, duration).catch(() => null);
      return { ticker: p.ticker, w: p.w, iv: b?.iv ?? null, vega: b?.greeks?.vega ?? null };
    }),
  ]);

  const sigmaI = idxBundle?.iv > 0 ? idxBundle.iv / 100 : null;
  const covered = perRaw.filter(p => p.iv > 0);
  const coveredW = covered.reduce((s, p) => s + (p.w || 0), 0);
  const coverage = totalW > 0 ? coveredW / totalW : 0;

  const names = covered.map(p => ({ ticker: p.ticker, w: p.w, sigma: p.iv / 100, vega: p.vega }));

  let rhoNotional = null, rhoVega = null;
  if (sigmaI && names.length >= 2 && coverage >= MIN_COVERAGE) {
    rhoNotional = impliedCorrelation(sigmaI, names);           // pondération capi (standard CBOE)
    const vw = vegaWeights(names);
    if (vw) rhoVega = impliedCorrelation(sigmaI, vw);          // pondération vega (telle que tradée)
  }
  // Ancre = vega-pondérée si dispo (le trade est vega-driven), sinon capi.
  const rho_impl = rhoVega ?? rhoNotional;
  const method = rho_impl == null
    ? (sigmaI == null ? 'no_index_iv' : coverage < MIN_COVERAGE ? 'low_coverage' : 'uncomputable')
    : (rhoVega != null ? 'cboe_vega_weighted' : 'cboe_notional');

  const shares = vegaShares(names) || {};
  const result = {
    rho_impl,
    rho_impl_notional: rhoNotional,
    rho_impl_vega: rhoVega,
    method,
    coverage: Number(coverage.toFixed(2)),
    n_covered: covered.length,
    n_total: pairs.length,
    sigma_index: sigmaI != null ? Number((sigmaI * 100).toFixed(1)) : null,
    duration,
    per_name: names.map(n => ({
      ticker: n.ticker,
      iv: Number((n.sigma * 100).toFixed(1)),
      vega: n.vega,
      vega_share: shares[n.ticker] != null ? Number(shares[n.ticker].toFixed(4)) : null,
    })),
  };

  if (rho_impl != null) kvCacheSet(cacheKey, result).catch(() => {});
  return Response.json(result);
};
