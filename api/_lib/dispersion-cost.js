// Maths PURES du coût d'exécution d'une dispersion (aucun réseau) — testables, partagées par
// Construction, Opportunités et le scoring. Complète dispersion-math.js : celui-ci répond
// « la corrélation est-elle chère ? », celui-là répond « est-ce que ça survit au spread ? ».
//
// POURQUOI CE FICHIER EXISTE — toute la recherche (backtest/NETCOST_REPORT.md, mesurée sur les
// vrais spreads bid/ask ThetaData 2022-2026, krachs inclus) converge sur un point : le facteur
// décisif d'une dispersion retail n'est ni le modèle ni le timing, c'est le COÛT. La dispersion
// est structurellement LONGUE la jambe chère (composants : spread médian ~11,8 % du straddle ATM
// à 30 j) et COURTE la jambe bon marché (SPY : ~0,6 %) — une asymétrie de ~19× sur ce qu'on trade
// réellement. Ces fonctions rendent ce mur visible AVANT le trade, en dollars.
//
// CONVENTIONS D'UNITÉS (suivent le reste du site) :
//   sigma  : DÉCIMAL (0.18 = 18 %), comme dispersion-math.js
//   vega   : $ par POINT de vol (1 %), comme window.DXRisk.straddleGreeks().vega
//   coûts  : $ ROUND-TRIP. Le spread bid/ask complet EST le round-trip : on paie ~½ spread à
//            l'entrée (mid→ask) et ~½ à la sortie (bid←mid). Même convention que cost_volpts
//            dans extract_atm.mjs.

// Garde numérique stricte. À utiliser SYSTÉMATIQUEMENT ici : en JS `null >= 0` vaut true
// (null est coercé en 0), donc un test du type `!(x >= 0)` laisse passer null/undefined et
// produit un coût de 0 — un faux chiffre rassurant, exactement ce qu'on ne veut pas afficher
// dans un module dont le rôle est de dire la vérité sur le coût. `isNum` refuse aussi NaN.
const isNum = v => typeof v === 'number' && Number.isFinite(v);

// ── Coût round-trip d'une jambe ─────────────────────────────────────────────
// spreadPct       : spread bid/ask du straddle ATM en % du mid (réel Cboe, ou table historique).
// straddlePremium : prime du straddle POUR UN CONTRAT, en $ — c'est-à-dire déjà multipliée par la
//                   taille du contrat. C'est exactement ce que renvoie
//                   window.DXRisk.straddleGreeks().premium, la source de Construction ; pas de
//                   contractSize ici, sinon on invite un ×100 en double.
// fill            : fraction du spread réellement payée [0..1]. 1 = on traverse (ordre au marché) —
//                   l'hypothèse de nos backtests, donc une BORNE HAUTE ; 0.5 = ordre travaillé au
//                   milieu ; 0 = exécution au mid (le privilège du market maker, hors de portée en
//                   retail). C'est le seul levier de coût que l'utilisateur contrôle vraiment, et la
//                   littérature le désigne comme l'endroit où vit l'edge.
// Retour : $ (≥ 0), ou null si entrées inexploitables.
export function legCost({ spreadPct, straddlePremium, contracts = 1, fill = 1 }) {
  if (!isNum(spreadPct) || spreadPct < 0) return null;
  if (!isNum(straddlePremium) || straddlePremium <= 0) return null;
  if (!isNum(contracts) || contracts <= 0) return null;
  if (!isNum(fill) || fill < 0 || fill > 1) return null;
  return (spreadPct / 100) * straddlePremium * contracts * fill;
}

// ── σ de l'indice impliquée par une corrélation donnée ──────────────────────
// Inverse exacte de impliedCorrelation() : celle-ci lit ρ depuis σ_I, celle-là reconstruit σ_I
// depuis ρ. C'est le pont qui convertit « des points de corrélation » en « des points de vol
// d'indice » — donc en dollars via le vega.
//
//   σ_I(ρ) = √( B + ρ·(A² − B) )   avec A = Σwᵢσᵢ , B = Σwᵢ²σᵢ²
//
// names : [{ w, sigma }] (poids normalisés ici, Σw=1). Retour : σ_I décimal, ou null.
export function sigmaIndexAt(rho, names) {
  if (!isNum(rho) || rho < 0 || !Array.isArray(names)) return null;
  const valid = names.filter(n => n && n.w > 0 && n.sigma > 0);
  if (valid.length < 2) return null;
  const wsum = valid.reduce((s, n) => s + n.w, 0);
  if (!(wsum > 0)) return null;
  let A = 0, B = 0;
  for (const n of valid) {
    const w = n.w / wsum;
    A += w * n.sigma;
    B += w * w * n.sigma * n.sigma;
  }
  const v = B + rho * (A * A - B);
  return v > 0 ? Math.sqrt(v) : null;
}

// ── Coût total du panier ────────────────────────────────────────────────────
// legs : [{ cost }] — les jambes composants (long). indexCost : $ de la jambe indice (short).
// vegaIndex : $/point de vol de la jambe indice — sert à exprimer le coût dans l'unité de la
// recherche (points de vol par $1 de vega indice), la seule comparable au brut espéré.
// Retour : { comp, index, total, ratio, volPts } — ratio = comp/index (l'asymétrie du panier
// RÉEL de l'utilisateur, pas une moyenne de marché), null si non calculable.
export function basketCost({ compLegs, indexCost, vegaIndex }) {
  if (!Array.isArray(compLegs) || !isNum(indexCost) || indexCost < 0) return null;
  let comp = 0;
  for (const l of compLegs) {
    // Une jambe non chiffrable ⇒ pas de total crédible. Mieux vaut ne rien afficher qu'un
    // coût sous-estimé : l'utilisateur en tirerait la conclusion inverse de la bonne.
    if (!l || !isNum(l.cost) || l.cost < 0) return null;
    comp += l.cost;
  }
  const total = comp + indexCost;
  return {
    comp, index: indexCost, total,
    ratio: indexCost > 0 ? comp / indexCost : null,
    volPts: isNum(vegaIndex) && vegaIndex > 0 ? total / vegaIndex : null,
  };
}

// ── Gain BRUT THÉORIQUE de la prime de corrélation ──────────────────────────
// ⚠️ THÉORIQUE, et le mot est important. Ceci répond à « si la corrélation réalisée sortait à
// rhoReal alors que le marché la price à rhoImpl, que vaudrait l'écart en dollars ? » — en
// isolant la corrélation : on suppose la vol des composants réalisée = implicite (VRP mono
// neutre). C'est FAUX en moyenne, et c'est précisément ce que la recherche a mesuré : le P&L
// réel d'une dispersion est piloté par le portage de vol des jambes mono autant que par la
// corrélation (backtest_level2_basket.mjs — le panier qui capture le MIEUX la corrélation a le
// PIRE P&L tradeable). Ce chiffre est donc un plafond pédagogique « ce que vaut la corrélation
// seule », à confronter au coût — pas une prévision de P&L.
//
// Mécanique : short straddle indice → on gagne quand l'indice réalise MOINS que son implicite.
// Une corrélation réalisée plus basse fait mécaniquement baisser la vol de l'indice (les
// composants s'annulent entre eux), sans toucher aux vols individuelles.
//
// Retour : { deltaSigmaPts, gross } — points de vol d'indice, et $. null si non calculable.
export function grossFromCorrPremium({ rhoImpl, rhoReal, names, vegaIndex }) {
  const sImpl = sigmaIndexAt(rhoImpl, names);
  const sReal = sigmaIndexAt(rhoReal, names);
  if (sImpl == null || sReal == null || !isNum(vegaIndex) || vegaIndex <= 0) return null;
  const deltaSigmaPts = (sImpl - sReal) * 100;      // décimal → points de vol
  return { deltaSigmaPts, gross: deltaSigmaPts * vegaIndex };
}

// ── LE chiffre : la corrélation break-even ──────────────────────────────────
// « Jusqu'où la corrélation réalisée doit-elle tomber, sous ce que le marché price, pour que le
// trade couvre juste son spread ? » C'est la traduction honnête de tout NETCOST_REPORT.md en une
// question que l'utilisateur peut confronter à l'histoire (via le percentile du Correlation Lab) :
// si ρ_breakeven est sous ce que la corrélation réalisée atteint habituellement, le trade demande
// un événement rare RIEN QUE pour rentrer dans ses frais.
//
// On résout gross(ρ_be) = cost :
//   σ_I(ρ_be) = σ_I(ρ_impl) − cost / vegaIndex / 100
//   ρ_be      = (σ_I(ρ_be)² − B) / (A² − B)
//
// Retour : { rho, reachable, floorSigmaPts, needPts } où
//   rho        : la corrélation réalisée à atteindre (null si hors d'atteinte)
//   reachable  : false ⇒ MÊME une corrélation nulle ne couvre pas le spread — le trade est perdant
//                par construction, quoi que fasse le marché. C'est le cas du tenor 30 j dans nos
//                données, et c'est le résultat le plus actionnable de toute la recherche.
//   needPts    : points de vol d'indice à capturer pour couvrir le coût
//   floorSigmaPts : σ_I minimale possible (à ρ=0) en points — le plancher physique du panier
export function rhoBreakeven({ rhoImpl, names, vegaIndex, cost }) {
  if (!isNum(cost) || cost < 0 || !isNum(vegaIndex) || vegaIndex <= 0) return null;
  const sImpl = sigmaIndexAt(rhoImpl, names);
  const sFloor = sigmaIndexAt(0, names);           // ρ=0 : le mieux que le panier puisse faire
  if (sImpl == null || sFloor == null) return null;

  const needPts = cost / vegaIndex;               // points de vol d'indice à gagner
  const target = sImpl - needPts / 100;           // σ_I cible (décimal)
  const out = { needPts, floorSigmaPts: sFloor * 100, rho: null, reachable: false };
  if (target <= sFloor) return out;               // hors d'atteinte même à corrélation nulle

  const valid = names.filter(n => n && n.w > 0 && n.sigma > 0);
  const wsum = valid.reduce((s, n) => s + n.w, 0);
  let A = 0, B = 0;
  for (const n of valid) {
    const w = n.w / wsum;
    A += w * n.sigma;
    B += w * w * n.sigma * n.sigma;
  }
  const denom = A * A - B;
  if (denom <= 1e-9) return out;
  out.rho = (target * target - B) / denom;
  out.reachable = true;
  return out;
}
