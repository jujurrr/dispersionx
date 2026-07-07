// Black-Scholes (taux nul, r=0) — valorisation et grecs d'un STRADDLE à strike
// FIXE. Sert au suivi de position : on garde le strike d'entrée (ATM à l'entrée)
// et on revalorise avec le spot/IV/temps courants → on capture correctement le
// delta qui dérive, le gamma (convexité) et le theta, contrairement à
// l'approximation ATM re-centrée. Fonctions PURES (testables sans réseau).

// N(x) via erf (Abramowitz-Stegun 7.1.26) et densité normale.
export function normCdf(x) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804014327 * Math.exp(-x * x / 2);
  const p = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x >= 0 ? 1 - p : p;
}
export function normPdf(x) { return 0.3989422804014327 * Math.exp(-x * x / 2); }

// Straddle ATM à strike K : { value, delta, gamma, vega, thetaYr } par ACTION
//   value  = call + put               (prix du straddle, par action)
//   delta  = 2·N(d1) − 1              (−1 → +1 selon la moneyness ; ~0 à l'ATM)
//   gamma  = 2·φ(d1)/(S·σ·√T)         (convexité, par action)
//   vega   = 2·S·φ(d1)·√T             (par +1.00 de vol → ×0.01 pour +1 pt)
//   thetaYr= −2·S·φ(d1)·σ/(2·√T)      (par an, r=0 ; négatif = perte de valeur temps)
export function bsStraddle(S, K, sigma, T) {
  if (!(S > 0 && K > 0 && sigma > 0 && T > 0)) return null;
  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + 0.5 * sigma * sigma * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;
  const Nd1 = normCdf(d1), Nd2 = normCdf(d2), pdf = normPdf(d1);
  const call = S * Nd1 - K * Nd2;
  const put = K * normCdf(-d2) - S * normCdf(-d1);
  return {
    value: call + put,
    delta: 2 * Nd1 - 1,
    gamma: 2 * pdf / (S * sigma * sqrtT),
    vega: 2 * S * pdf * sqrtT,
    thetaYr: -(S * pdf * sigma) / sqrtT,
  };
}
