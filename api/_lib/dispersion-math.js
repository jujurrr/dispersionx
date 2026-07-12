// Maths PURES de dispersion (aucun réseau) — testables et réutilisées par
// api/correlation/implied.js, le scoring, et les tests. Aucune dépendance.

// ── Corrélation implicite moyenne d'un panier (formule CBOE) ────────────────
// Dérive la corrélation « moyenne » que le marché price, à partir de la vol
// IMPLICITE de l'indice et des vols implicites des composants :
//
//   ρ_impl = [ σ_I² − Σ wᵢ²σᵢ² ] / [ (Σ wᵢσᵢ)² − Σ wᵢ²σᵢ² ]
//
//   sigmaI : vol implicite de l'indice (décimal, ex. 0.18 pour 18 %)
//   names  : [{ w, sigma }] — w = poids (normalisés ici Σw=1), sigma décimal
// Retour : ρ borné [0.05, 0.95], ou null si non calculable (dénominateur nul,
// moins de 2 noms, données invalides). C'est l'ancre de la prime de dispersion
// (ρ_impl − ρ_réalisée) — le vrai signal « la corrélation est-elle chère ? ».
export function impliedCorrelation(sigmaI, names) {
  if (!(sigmaI > 0) || !Array.isArray(names)) return null;
  const valid = names.filter(n => n && n.w > 0 && n.sigma > 0);
  if (valid.length < 2) return null;
  const wsum = valid.reduce((s, n) => s + n.w, 0);
  if (!(wsum > 0)) return null;
  let A = 0, B = 0;                       // A = Σwσ (normalisé), B = Σw²σ²
  for (const n of valid) {
    const w = n.w / wsum;
    A += w * n.sigma;
    B += w * w * n.sigma * n.sigma;
  }
  const denom = A * A - B;               // = variance « de corrélation » du panier
  if (denom <= 1e-9) return null;
  const rho = (sigmaI * sigmaI - B) / denom;
  if (!isFinite(rho)) return null;
  return Math.max(0.05, Math.min(0.95, rho));
}

// ── Poids VEGA-pondérés ─────────────────────────────────────────────────────
// Le P&L d'une dispersion est piloté par le VEGA, pas par la capitalisation :
// un pupitre vega-neutre dimensionne ses jambes selon le vega. La corrélation
// implicite « telle que tradée » utilise donc des poids ∝ (poids marché × vega).
//   names : [{ w, sigma, vega }]  → retourne les mêmes noms avec w = poids vega
//   normalisés (Σ=1), en conservant sigma. null si vega insuffisant (< 2 noms).
export function vegaWeights(names) {
  if (!Array.isArray(names)) return null;
  const valid = names.filter(n => n && n.w > 0 && n.vega > 0 && n.sigma > 0);
  if (valid.length < 2) return null;
  const raw = valid.map(n => ({ ...n, _vw: n.w * n.vega }));
  const s = raw.reduce((a, n) => a + n._vw, 0);
  if (!(s > 0)) return null;
  return raw.map(n => ({ ticker: n.ticker, sigma: n.sigma, vega: n.vega, w: n._vw / s }));
}

// Part de vega de chaque nom dans le panier (∝ poids marché × vega), normalisée.
// Sert à pondérer la CONTRIBUTION de dispersion d'un composant (UI / finder).
export function vegaShares(names) {
  const vw = vegaWeights(names);
  if (!vw) return null;
  const out = {};
  for (const n of vw) out[n.ticker] = n.w;
  return out;
}
