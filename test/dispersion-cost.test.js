import test from 'node:test';
import assert from 'node:assert/strict';
import { legCost, sigmaIndexAt, basketCost, grossFromCorrPremium, rhoBreakeven } from '../api/_lib/dispersion-cost.js';
import { impliedCorrelation } from '../api/_lib/dispersion-math.js';

// Panier de référence (identique à dispersion-math.test.js) : 2 noms, poids égaux, σ = 30 %.
//   A = Σwσ = 0.30 · B = Σw²σ² = 0.045 · A²−B = 0.045
const NAMES = [{ w: 0.5, sigma: 0.30 }, { w: 0.5, sigma: 0.30 }];
const near = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

// ── sigmaIndexAt : l'inverse exacte de impliedCorrelation ──────────────────
test('sigmaIndexAt est l\'inverse de impliedCorrelation (aller-retour)', () => {
  for (const rho of [0.1, 0.25, 0.5, 0.75, 0.9]) {
    const s = sigmaIndexAt(rho, NAMES);
    const back = impliedCorrelation(s, NAMES);
    assert.ok(near(back, rho, 1e-9), `ρ=${rho} → σ=${s} → ρ=${back}`);
  }
});

test('sigmaIndexAt : ρ=0 donne le plancher √(Σw²σ²), ρ=1 donne Σwσ', () => {
  assert.ok(near(sigmaIndexAt(0, NAMES), Math.sqrt(0.045)));
  assert.ok(near(sigmaIndexAt(1, NAMES), 0.30));
});

test('sigmaIndexAt monotone croissante en ρ (plus de corrélation = indice plus volatil)', () => {
  assert.ok(sigmaIndexAt(0.2, NAMES) < sigmaIndexAt(0.6, NAMES));
});

test('sigmaIndexAt null sur entrées invalides', () => {
  assert.equal(sigmaIndexAt(0.5, [{ w: 1, sigma: 0.3 }]), null);   // < 2 noms
  assert.equal(sigmaIndexAt(-0.1, NAMES), null);
  assert.equal(sigmaIndexAt(0.5, null), null);
});

// ── legCost ────────────────────────────────────────────────────────────────
// straddlePremium est en $ PAR CONTRAT (déjà ×100), comme DXRisk.straddleGreeks().premium.
test('legCost : spread 4 % d\'un straddle à 1 000 $/contrat, 3 contrats → 120 $', () => {
  assert.ok(near(legCost({ spreadPct: 4, straddlePremium: 1000, contracts: 3 }), 120));
});

test('legCost : le fill module le coût linéairement (levier d\'exécution)', () => {
  const full = legCost({ spreadPct: 4, straddlePremium: 1000, contracts: 3, fill: 1 });
  assert.ok(near(legCost({ spreadPct: 4, straddlePremium: 1000, contracts: 3, fill: 0.5 }), full / 2));
  assert.equal(legCost({ spreadPct: 4, straddlePremium: 1000, contracts: 3, fill: 0 }), 0);
});

test('legCost : spread nul = coût nul ; entrées invalides = null', () => {
  assert.equal(legCost({ spreadPct: 0, straddlePremium: 1000, contracts: 1 }), 0);
  assert.equal(legCost({ spreadPct: -1, straddlePremium: 1000, contracts: 1 }), null);
  assert.equal(legCost({ spreadPct: 4, straddlePremium: 0, contracts: 1 }), null);
  assert.equal(legCost({ spreadPct: 4, straddlePremium: 1000, contracts: 0 }), null);
  assert.equal(legCost({ spreadPct: 4, straddlePremium: 1000, contracts: 1, fill: 1.5 }), null);
});

// Piège JS : `null >= 0` vaut true (null coercé en 0). Une garde naïve `!(x >= 0)` laisse donc
// passer null et renvoie un coût de 0 — un faux « c'est gratuit » sur un nom non coté, soit
// l'inverse exact du message. Ces cas verrouillent la garde stricte.
test('un spread absent ne devient JAMAIS un coût de zéro', () => {
  assert.equal(legCost({ spreadPct: null, straddlePremium: 1000, contracts: 1 }), null);
  assert.equal(legCost({ spreadPct: undefined, straddlePremium: 1000, contracts: 1 }), null);
  assert.equal(legCost({ spreadPct: NaN, straddlePremium: 1000, contracts: 1 }), null);
  assert.equal(legCost({ spreadPct: 4, straddlePremium: 1000, contracts: 1, fill: null }), null);
  assert.equal(sigmaIndexAt(null, NAMES), null);
  assert.equal(rhoBreakeven({ rhoImpl: 0.5, names: NAMES, vegaIndex: 1000, cost: null }), null);
  assert.equal(basketCost({ compLegs: [{ cost: 300 }], indexCost: null, vegaIndex: 1000 }), null);
});

// ── basketCost ─────────────────────────────────────────────────────────────
test('basketCost agrège, expose l\'asymétrie et convertit en points de vol', () => {
  const r = basketCost({ compLegs: [{ cost: 300 }, { cost: 200 }], indexCost: 50, vegaIndex: 1000 });
  assert.equal(r.comp, 500);
  assert.equal(r.index, 50);
  assert.equal(r.total, 550);
  assert.ok(near(r.ratio, 10));          // composants 10× la jambe indice
  assert.ok(near(r.volPts, 0.55));       // 550 $ / 1000 $ par point = 0.55 point de vol
});

test('basketCost : une jambe non chiffrable invalide le total (pas de faux total)', () => {
  assert.equal(basketCost({ compLegs: [{ cost: 300 }, { cost: null }], indexCost: 50, vegaIndex: 1000 }), null);
});

// ── grossFromCorrPremium ───────────────────────────────────────────────────
test('grossFromCorrPremium : corrélation réalisée SOUS l\'implicite = gain positif', () => {
  const r = grossFromCorrPremium({ rhoImpl: 0.5, rhoReal: 0.3, names: NAMES, vegaIndex: 1000 });
  // σ_I(0.5)=√0.0675=0.259808 · σ_I(0.3)=√0.0585=0.241868 → Δ=1.794 pt de vol
  assert.ok(near(r.deltaSigmaPts, 1.79397, 1e-4), `Δ=${r.deltaSigmaPts}`);
  assert.ok(near(r.gross, 1793.97, 1e-1), `gross=${r.gross}`);
});

test('grossFromCorrPremium : corrélation réalisée AU-DESSUS de l\'implicite = perte', () => {
  const r = grossFromCorrPremium({ rhoImpl: 0.3, rhoReal: 0.6, names: NAMES, vegaIndex: 1000 });
  assert.ok(r.gross < 0, `attendu négatif, obtenu ${r.gross}`);
});

// ── rhoBreakeven ───────────────────────────────────────────────────────────
test('rhoBreakeven est cohérent avec grossFromCorrPremium (le gain au ρ break-even = le coût)', () => {
  const cost = 1793.97;   // le gain exact de ρ 0.5 → 0.3 ci-dessus
  const be = rhoBreakeven({ rhoImpl: 0.5, names: NAMES, vegaIndex: 1000, cost });
  assert.equal(be.reachable, true);
  assert.ok(near(be.rho, 0.3, 1e-4), `ρ_be=${be.rho} (attendu 0.3)`);
});

test('rhoBreakeven : coût nul → break-even = la corrélation implicite elle-même', () => {
  const be = rhoBreakeven({ rhoImpl: 0.5, names: NAMES, vegaIndex: 1000, cost: 0 });
  assert.ok(near(be.rho, 0.5, 1e-9));
});

test('rhoBreakeven : coût > marge maximale → INATTEIGNABLE même à corrélation nulle', () => {
  // marge max = (σ_I(0.5) − σ_I(0))×100 = (0.259808−0.212132)×100 = 4.7676 pts → 4767.6 $
  const be = rhoBreakeven({ rhoImpl: 0.5, names: NAMES, vegaIndex: 1000, cost: 5000 });
  assert.equal(be.reachable, false);
  assert.equal(be.rho, null);
  assert.ok(near(be.floorSigmaPts, 21.2132, 1e-3));
});

// ── Le test qui compte : reproduire la conclusion de NETCOST_REPORT.md ─────
// Panier réaliste de 10 méga-caps liquides, équipondéré, σ=30 %, vega-neutre (chaque jambe porte
// 1/10 du vega indice). Corrélation implicite ATM = 0.20 — la valeur RÉELLE mesurée sur ThetaData
// (SKEW_REPORT.md §1). Coût réel médian mesuré (corr-cost-data.js, tenor 30 j) : composants
// 3,72 points de vol par jambe, SPY 0,09.
//
// Si nos maths sont justes, elles doivent retrouver mécaniquement le verdict de la recherche :
// à 30 j le trade ne couvre pas son spread dans un régime de corrélation normal.
test('cas réel 30 j : le break-even exige une corrélation bien SOUS le réalisé typique', () => {
  const names = Array.from({ length: 10 }, () => ({ w: 0.1, sigma: 0.30 }));
  const vegaIndex = 1000;                       // $/point de vol sur la jambe indice
  const vegaLeg = vegaIndex / 10;               // vega-neutre : chaque jambe porte 1/10

  // Coût : cv (points de vol) × vega de la jambe → $
  const compLegs = Array.from({ length: 10 }, () => ({ cost: 3.72 * vegaLeg }));
  const indexCost = 0.09 * vegaIndex;
  const bc = basketCost({ compLegs, indexCost, vegaIndex });
  assert.ok(near(bc.volPts, 3.81, 1e-9), `coût panier = ${bc.volPts} pts de vol`);

  const be = rhoBreakeven({ rhoImpl: 0.20, names, vegaIndex, cost: bc.total });
  assert.equal(be.reachable, true);
  // Il faut que la corrélation réalisée tombe à ~0.07 pour couvrir le seul spread…
  assert.ok(be.rho > 0.06 && be.rho < 0.08, `ρ break-even = ${be.rho}`);
  // …alors que la corrélation réalisée MESURÉE sur 2022-2026 est ≈ 0.17 (SKEW_REPORT.md §2).
  // Le trade est donc perdant net de coût en régime normal — exactement le verdict du rapport.
  const RHO_REALISE_TYPIQUE = 0.17;
  assert.ok(be.rho < RHO_REALISE_TYPIQUE, 'le break-even doit être sous le réalisé typique');
  const r = grossFromCorrPremium({ rhoImpl: 0.20, rhoReal: RHO_REALISE_TYPIQUE, names, vegaIndex });
  assert.ok(r.gross < bc.total, `brut théorique ${r.gross.toFixed(0)} $ < coût ${bc.total.toFixed(0)} $`);
});
