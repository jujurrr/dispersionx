/* ─── Score ALT de dispersion : « vol idio réalisée − coût », SANS prime de corrélation ───
   Modèle issu de la recherche en dollars (piste 2, juillet 2026) : sur le P&L d'options réel,
   ce classement BAT significativement le modèle V2 (prime × qualité), reste positif une fois
   DELTA-HEDGÉ NET SUR INDICE (Sharpe ~0,3 à 60 j, ~0,6 à 180 j, net de coûts), et sa DIRECTION
   transfère en hold-out (choix sur 2020-2022 → tient sur 2023-2026). C'est un FACTEUR (long vol
   idiosyncratique bon marché), régime-sensible — pas une promesse de rendement.

   CROSS-SECTIONNEL par construction : le score d'un titre est son RANG parmi les autres titres
   de l'indice (percentile de z(idio) − z(coût)). Il ne peut donc PAS se calculer sur une action
   isolée — seulement sur l'univers complet d'un indice (fait dans store.js._scoreIndexRun).

   parts : { ticker: { idio, cost } }
     idio = vol idiosyncratique RÉALISÉE (pts de vol, HV·√(1−ρ²)) · cost = coût d'exécution
            (spread du straddle ATM en %). Unités libres : le z les rend comparables.
   → { ticker: { score, z, idio, cost } }  score ∈ [0,100] (percentile ; 100 = meilleur candidat). */
(function (g) {
  'use strict';
  function altScores(parts) {
    const names = Object.keys(parts || {}).filter(
      t => parts[t] && Number.isFinite(parts[t].idio) && Number.isFinite(parts[t].cost));
    const n = names.length;
    if (n < 3) return {};   // sous 3 noms, pas de coupe transverse crédible → aucun score ALT
    const zstat = f => { const v = names.map(f); const m = v.reduce((a, b) => a + b, 0) / n;
      const sd = Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / (n - 1)); return { m, sd }; };
    const zi = zstat(t => parts[t].idio), zc = zstat(t => parts[t].cost);
    const raw = {};
    for (const t of names) {
      const I = zi.sd > 0 ? (parts[t].idio - zi.m) / zi.sd : 0;
      const C = zc.sd > 0 ? (parts[t].cost - zc.m) / zc.sd : 0;
      raw[t] = I - C;                                   // z(idio) − z(coût), SANS prime
    }
    // Percentile : rang croissant → 0 (pire) .. 100 (meilleur). Départage stable par ticker.
    const order = names.slice().sort((a, b) => (raw[a] - raw[b]) || (a < b ? -1 : 1));
    const out = {};
    order.forEach((t, i) => {
      out[t] = { score: Math.round(100 * i / (n - 1)), z: raw[t], idio: parts[t].idio, cost: parts[t].cost };
    });
    return out;
  }
  g.DXAltScore = { altScores };
})(typeof globalThis !== 'undefined' ? globalThis : this);
