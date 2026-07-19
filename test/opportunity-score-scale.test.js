// L'auto-chercheur face au MODÈLE DE SCORE ACTIF (V1 / V2).
//
// W_SCORE et le centrage d'oppScoreOf ont été calibrés en juillet 2026 sur la
// distribution de V1. Sous V2 (flag DX_SCORE_MODEL) la distribution n'a plus rien
// à voir — médiane 5 contre 46, vivier top-25 à 17,5 contre 48 — et ces constantes
// deviennent fausses SILENCIEUSEMENT :
//
//   • le « Score d'opportunité » affiché perdait 9 à 27 points selon la seule
//     TAILLE du panier, sans rapport avec sa qualité ;
//   • dans l'objectif, l'avantage mécanique des petits paniers passait de +0,038
//     à +0,088 face à un contrepoids sizePen de 0,0375 — garde-fou
//     anti-surajustement 2,3× trop faible, donc un finder qui préfère
//     systématiquement les petits paniers, exactement ce que sizePen/OPP_BUCKETS
//     étaient censés empêcher.
//
// Correctif : ramener le score du modèle actif sur l'échelle V1 via les seuils que
// le serveur PUBLIE déjà (score_thresholds), calés pour reproduire les mêmes
// proportions d'un modèle à l'autre. Sur V1, la transformation est l'identité.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { transformSync } from '@babel/core';
import vm from 'node:vm';

const url = p => new URL(p, import.meta.url);

// Les VRAIES fonctions de l'écran (pas une reproduction : une copie diverge).
// Note : les déclarations `function` atterrissent sur l'objet global du contexte,
// mais les `const` (oppCostOf, oppTenorIdx) vivent dans la portée lexicale du
// script — on les récupère en évaluant leur nom dans ce même contexte.
function loadFinder() {
  const code = transformSync(readFileSync(url('../js/screens/OpportunityFinder.jsx'), 'utf8'),
    { presets: ['@babel/preset-react'], babelrc: false, configFile: false }).code;
  const win = {};
  new Function('window', readFileSync(url('../js/lib/corr-cost-data.js'), 'utf8'))(win);
  const ctx = vm.createContext({
    window: win, React: { createElement: () => null, useState: () => [null, () => {}] },
    console, Math, Object, Array, Number, String, JSON, Set, Map, isFinite, Date, Promise,
  });
  vm.runInContext(code, ctx);
  const grab = name => vm.runInContext(name, ctx);
  return {
    F: { oppScaler: grab('oppScaler'), oppScoreOf: grab('oppScoreOf'), oppEval: grab('oppEval'),
         oppCostOf: grab('oppCostOf'), oppTenorIdx: grab('oppTenorIdx'),
         oppImpliedCorr: grab('oppImpliedCorr'), oppSaturated: grab('oppSaturated'),
         RHO_MIN: grab('OPP_RHO_MIN'), RHO_MAX: grab('OPP_RHO_MAX') },
    COST: win.DXCostComp,
  };
}

const { F, COST } = loadFinder();

const V1_TH = { fort: 75, mod: 55 };
const V2_TH = { fort: 62, mod: 19 };

// Moyennes du panier top-k MESURÉES sur les 13 138 observations de
// backtest/*_scored.csv (SPX). Recopiées ici parce que backtest/ est gitignoré :
// le test doit tourner en CI sans ces données.
const TOPK = {
  V1: { 5: 60.6, 12: 53.4, 25: 48.0 },
  V2: { 5: 46.7, 12: 31.7, 25: 17.5 },
};

/* ── 1. L'échelle ────────────────────────────────────────────────────────── */

test('sous V1, la mise à l\'échelle est l\'IDENTITÉ (aucun changement)', () => {
  const s = F.oppScaler(V1_TH);
  for (const x of [0, 17.5, 48, 55, 60.6, 75, 100]) {
    assert.ok(Math.abs(s(x) - x) < 1e-9, `${x} doit rester ${x}, obtenu ${s(x)}`);
  }
});

test('les seuils du modèle actif sont les points d\'ancrage de la conversion', () => {
  const s = F.oppScaler(V2_TH);
  // Un score « MODÉRÉ » en V2 doit valoir un score « MODÉRÉ » en V1, idem FORT.
  assert.ok(Math.abs(s(V2_TH.mod) - V1_TH.mod) < 1e-9, 'seuil MODÉRÉ ↦ 55');
  assert.ok(Math.abs(s(V2_TH.fort) - V1_TH.fort) < 1e-9, 'seuil FORT ↦ 75');
});

test('des seuils absents ou incohérents retombent sur V1 (non-cassant)', () => {
  for (const bad of [null, undefined, {}, { fort: 10, mod: 90 }, { fort: 5, mod: 5 }]) {
    const s = F.oppScaler(bad);
    assert.ok(Math.abs(s(63) - 63) < 1e-9, 'repli = identité V1');
  }
});

/* ── 2. Ce que ça corrige, chiffré ───────────────────────────────────────── */

test('le score affiché ne dépend plus de la TAILLE du panier sous V2', () => {
  const amplitude = (model, th) => {
    const s = F.oppScaler(th);
    const v = [5, 12, 25].map(k => (s(TOPK[model][k]) - 62) * 0.6);
    return Math.max(...v) - Math.min(...v);
  };
  const a1 = amplitude('V1', V1_TH);
  const a2 = amplitude('V2', V2_TH);
  // Avant correctif, V2 valait 17,5 pts d'amplitude contre 7,6 pour V1.
  const avantV2 = (() => { const v = [5, 12, 25].map(k => (TOPK.V2[k] - 62) * 0.6); return Math.max(...v) - Math.min(...v); })();
  assert.ok(avantV2 > 17, `le défaut mesurait bien ~17,5 pts (obtenu ${avantV2.toFixed(1)})`);
  assert.ok(a2 < 10, `après correctif V2 doit retomber sous 10 pts (obtenu ${a2.toFixed(1)})`);
  assert.ok(Math.abs(a2 - a1) < 2, `V2 (${a2.toFixed(1)}) doit s'aligner sur V1 (${a1.toFixed(1)})`);
});

test('le garde-fou anti-surajustement redevient équilibré sous V2', () => {
  // Avantage mécanique d'un panier de 5 vs 25, face au contrepoids sizePen.
  const W_SCORE = 0.30, W_OVERFIT = 0.10;
  const sizePen = k => Math.max(0, (8 - k)) / 8;
  const net = (model, th) => {
    const s = F.oppScaler(th);
    const gain = W_SCORE * (s(TOPK[model][5]) - s(TOPK[model][25])) / 100;
    return gain - W_OVERFIT * (sizePen(5) - sizePen(25));
  };
  const brut = W_SCORE * (TOPK.V2[5] - TOPK.V2[25]) / 100 - W_OVERFIT * (sizePen(5) - sizePen(25));
  assert.ok(brut > 0.045, `le biais non corrigé valait bien ~+0,05 (obtenu ${brut.toFixed(4)})`);
  assert.ok(Math.abs(net('V1', V1_TH)) < 0.01, 'V1 était déjà équilibré');
  assert.ok(Math.abs(net('V2', V2_TH)) < 0.01, `V2 doit le redevenir (obtenu ${net('V2', V2_TH).toFixed(4)})`);
});

test('oppScoreOf lit l\'échelle convertie, et reste inchangé sous V1', () => {
  const o = { prime: 8, avgScore: 46.7, avgScaled: F.oppScaler(V2_TH)(46.7) };
  const v2 = F.oppScoreOf(o);
  const v2Brut = Math.round(50 + 8 * 2.2 + (46.7 - 62) * 0.6);
  assert.ok(v2 > v2Brut, `converti ${v2} doit dépasser le brut ${v2Brut}`);
  // Un objet sans avgScaled (V1, ou ancien appelant) garde le comportement d'avant.
  assert.equal(F.oppScoreOf({ prime: 8, avgScore: 60.6 }),
    Math.round(50 + 8 * 2.2 + (60.6 - 62) * 0.6));
});

test('oppEval applique l\'échelle à l\'OBJECTIF, pas seulement à l\'affichage', () => {
  // Deux noms très décorrélés, scorés en V2 (niveaux bas).
  const members = ['A', 'B'];
  const ctxBase = {
    corr: { A: { A: 1, B: 0.2 }, B: { A: 0.2, B: 1 } },
    iv: { A: 30, B: 30 }, hv: { A: 28, B: 28 }, vega: { A: 1, B: 1 },
    score: { A: 46, B: 46 }, sigmaIdx: 0.18,
  };
  const brut = F.oppEval(members, ctxBase);
  const mis  = F.oppEval(members, { ...ctxBase, scale: F.oppScaler(V2_TH) });

  assert.equal(brut.avgScore, 46, 'le score BRUT du modèle reste exposé tel quel');
  assert.equal(mis.avgScore, 46, 'la conversion ne réécrit pas le score brut');
  assert.ok(mis.avgScaled > 60, `46 en V2 vaut ~67 sur l'échelle V1 (obtenu ${mis.avgScaled.toFixed(1)})`);
  assert.ok(mis.objective > brut.objective,
    "l'objectif doit utiliser l'échelle convertie, sinon le terme de score est écrasé");
  // Sans `scale`, comportement d'avant : avgScaled == avgScore.
  assert.equal(brut.avgScaled, brut.avgScore);
});

/* ── 3. ρ implicite saturée : une butée n'est pas une mesure ─────────────── */

// Quand l'IV de l'indice s'écarte fortement de celles des composants, la formule
// CBOE sort de son domaine et le clamp [5 %, 95 %] rend une valeur qui ne mesure
// rien. La prime qui en découlait atteignait 93 points (contre ~8 en régime
// normal) et, comme le terme de prime porte ~88 % du pouvoir de classement, la
// recherche allait CHERCHER ce coin : le panier retenu était collé à une borne
// 9 % des jours contre 6 % pour un tirage au hasard (mesuré, IV réelles SPX).

test('une ρ implicite collée à une borne est signalée comme non fiable', () => {
  // IV d'indice très supérieure à celles des composants → butée haute.
  const hautes = [{ w: 0.5, sigma: 0.12 }, { w: 0.5, sigma: 0.12 }];
  const r = F.oppImpliedCorr(0.60, hautes);
  assert.ok(r >= F.RHO_MAX - 1e-9, `attendu à la borne haute, obtenu ${r}`);
  assert.equal(F.oppSaturated(r), true);
  // Et une valeur d'intérieur normale ne l'est pas.
  assert.equal(F.oppSaturated(0.31), false);
  assert.equal(F.oppSaturated(null), true, 'absence de valeur = non fiable');
});

// Panier de taille réaliste : sous ~5 noms, le terme Σwᵢ²σᵢ² décroît en 1/N et
// fait dégénérer la formule quelles que soient les IV — ce n'est pas le cas
// qu'on teste ici.
// rhoPaires bas (0,05) pour que le panier SAIN dégage une vraie prime : sinon
// ρ implicite = ρ réalisée, prime nulle, et la comparaison ne teste rien.
function ctx5(ivVal, sigmaIdx, rhoPaires = 0.05) {
  const m = ['A', 'B', 'C', 'D', 'E'];
  const corr = {}, iv = {}, hv = {}, vega = {}, score = {};
  m.forEach(a => { corr[a] = {}; m.forEach(b => corr[a][b] = a === b ? 1 : rhoPaires);
    iv[a] = ivVal; hv[a] = ivVal * 0.92; vega[a] = 1; score[a] = 60; });
  return { members: m, ctx: { corr, iv, hv, vega, score, sigmaIdx } };
}

test('la prime saturée ne rapporte RIEN dans l\'objectif', () => {
  // Composants à IV basse contre indice à IV élevée → ρ implicite en butée haute.
  const s = ctx5(12, 0.60);
  const sature = F.oppEval(s.members, s.ctx);
  assert.equal(sature.rhoSaturated, true);
  assert.ok(sature.prime > 50, `la prime brute est bien absurde (${sature.prime.toFixed(0)} pts)`);

  // Le même panier, avec des IV cohérentes → ρ implicite d'intérieur.
  const h = ctx5(30, 0.18);
  const sain = F.oppEval(h.members, h.ctx);
  assert.equal(sain.rhoSaturated, false, `ρ implicite ${sain.rhoImpl} doit être d'intérieur`);

  // L'objectif du panier saturé ne doit PAS profiter de sa prime fantôme.
  const sansPrime = 0.30 * (sature.avgScaled / 100) + 0.15 * sature.diversification
    - 0.10 * Math.max(0, (8 - sature.k)) / 8;
  assert.ok(Math.abs(sature.objective - sansPrime) < 1e-9,
    'le terme de prime doit être neutralisé, pas seulement réduit');
  // Les deux paniers ne diffèrent que par leurs IV : même score, même
  // diversification, même taille. Seule la prime les départage.
  assert.ok(sain.prime > 10, `le panier sain dégage une vraie prime (${sain.prime.toFixed(1)} pts)`);
  assert.ok(sature.objective < sain.objective,
    `un panier saturé ne doit plus battre un panier à prime réelle (${sature.objective.toFixed(3)} vs ${sain.objective.toFixed(3)})`);
});

test('le score d\'opportunité affiché ignore lui aussi la prime fantôme', () => {
  const o = { prime: 93, avgScore: 60, avgScaled: 60, rhoSaturated: true };
  const sain = { prime: 93, avgScore: 60, avgScaled: 60, rhoSaturated: false };
  assert.equal(F.oppScoreOf(o), Math.round(50 + (60 - 62) * 0.6), 'prime écartée du calcul');
  assert.equal(F.oppScoreOf(sain), 100, 'une prime réelle de 93 sature légitimement le score');
  assert.ok(F.oppScoreOf(o) < F.oppScoreOf(sain));
});

test('la ρ implicite reste exposée telle quelle (l\'écran décide de l\'afficher ou non)', () => {
  // On ne réécrit pas la valeur : on l'accompagne d'un drapeau. L'UI montre
  // « n.d. » ; un rapport ou un test peut encore inspecter le chiffre brut.
  const s = ctx5(12, 0.60);
  const o = F.oppEval(s.members, s.ctx);
  assert.equal(typeof o.rhoImpl, 'number');
  assert.ok(o.rhoImpl <= F.RHO_MAX + 1e-9 && o.rhoImpl >= F.RHO_MIN - 1e-9, 'toujours bornée');
});

/* ── 4. Porte de coût : le bon tenor ─────────────────────────────────────── */

test('la porte de coût lit le tenor correspondant à l\'horizon', () => {
  // La table mesure [30, 60, 90] j ; api/stocks/auto-score.js utilise la même
  // correspondance. AAPL coûte 0,86 pt de vol à 30 j mais 0,54 à 60 j.
  assert.deepEqual([15, 30, 45].map(F.oppTenorIdx), [0, 0, 0]);
  assert.equal(F.oppTenorIdx(60), 1);
  assert.equal(F.oppTenorIdx(90), 2);
  assert.equal(F.oppCostOf('AAPL', 30), COST.AAPL.cv[0]);
  assert.equal(F.oppCostOf('AAPL', 60), COST.AAPL.cv[1]);
  assert.notEqual(F.oppCostOf('AAPL', 30), F.oppCostOf('AAPL', 60));
});

test('à 60 jours, la porte cesse d\'écarter des noms parfaitement traitables', () => {
  const GATE = 2.0;
  const syms = Object.keys(COST).filter(s => Array.isArray(COST[s].cv) && COST[s].cv.every(v => typeof v === 'number' && isFinite(v)));
  const passe = (t, d) => { const c = F.oppCostOf(t, d); return c == null || c <= GATE; };
  // Avant : l'horizon 60 était jugé avec le coût 30 j.
  const exclusATort = syms.filter(s => !(COST[s].cv[0] <= GATE) && passe(s, 60));
  assert.ok(exclusATort.length > 100,
    `~115 noms étaient écartés à tort à 60 j (obtenu ${exclusATort.length})`);
  // Le vivier à 60 j doit être nettement plus large qu'à 30 j.
  const n30 = syms.filter(s => passe(s, 30)).length;
  const n60 = syms.filter(s => passe(s, 60)).length;
  assert.ok(n60 > n30 * 2, `vivier 60 j (${n60}) doit dépasser largement celui à 30 j (${n30})`);
});

test('un nom absent de la table passe la porte, à tout horizon', () => {
  // Sans mesure, pas de verdict — même règle que le panneau de coût.
  for (const d of [15, 30, 60, 90]) assert.equal(F.oppCostOf('SYMBOLE_INCONNU', d), null);
});
