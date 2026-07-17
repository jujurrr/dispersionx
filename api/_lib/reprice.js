// Reprise (mark-to-market) d'une stratégie de dispersion à partir des données
// RÉELLES Cboe différées (spot + IV ATM par jambe). Utilisé par :
//   • POST /api/monitor/reprice        → reprise à la demande (bouton Snapshot)
//   • GET  /api/monitor/snapshot-run   → cron quotidien qui append un snapshot
//
// Modèle : chaque jambe est un STRADDLE ATM. On ancre le P&L sur la prime
// d'entrée réellement calculée à la construction (portfolio.idxPrem / c.premium)
// et on lui applique la variation multiplicative RÉELLE du marché via la
// relation de Brenner–Subrahmanyam (straddle ATM ≈ 0.8·S·σ·√T) :
//
//   prime_actuelle = prime_entrée · (S_now/S_0) · (σ_now/σ_0) · √(dte_now/dte_0)
//   P&L_jambe      = sens · (prime_actuelle − prime_entrée)
//     sens = −1 pour l'indice (short straddle), +1 pour les composants (long).
//
// C'est un P&L THÉORIQUE au mid, piloté par le spot et l'IV réels (différé
// 15 min) — pas un carnet d'ordres. Honnête et cohérent avec la base d'entrée.
//
// Les composants européens (CAC/DAX) n'ont pas d'options US : leur jambe
// retombe sur une reprise purement temporelle (√T) et est marquée non couverte.

import { cboeIvBundle } from './cboe.js';
import { proxyEtf } from './proxy-scale.js';
import { bsStraddle } from './bs.js';

export const BRENNER = 0.7978845608;   // √(2/π) — coefficient straddle ATM
const CONTRACT = 100;                  // multiplicateur standard des options

// Grecs d'une jambe convertis en $ de position (sens dir, qté, multiplicateur).
//   delta  : $ par +1 %      = Δ_action · S · 0.01 · 100 · qté
//   gamma  : Δ(delta $/+1%)  par +1 % = Γ_action · S² · 1e-4 · 100 · qté
//   vega   : $ par +1 pt IV  = vega_action · 0.01 · 100 · qté
//   theta  : $ par jour      = theta_an/365 · 100 · qté
function dollarGreeks(dir, qty, S, bs) {
  if (!bs || !(S > 0)) return null;
  const m = dir * qty * CONTRACT;
  return {
    delta: m * bs.delta * S * 0.01,
    gamma: m * bs.gamma * S * S * 1e-4,
    vega:  m * bs.vega * 0.01,
    theta: m * bs.thetaYr / 365,
  };
}

// ── Fonctions pures (testables sans réseau) ────────────────────────────────

// Facteur multiplicatif d'une prime de straddle ATM entre entrée et maintenant.
// Retombe sur la seule décroissance temporelle (√T) si le marché n'est pas
// disponible (covered=false) — jambe estimée, pas inventée.
export function straddleFactor({ spotNow, spotEntry, ivNow, ivEntry, dteNow, dteEntry, covered }) {
  const tf = Math.sqrt(Math.max(0, dteNow) / Math.max(1, dteEntry));
  if (!covered) return tf;
  const sf = spotEntry > 0 ? spotNow / spotEntry : 1;
  const vf = ivEntry > 0 ? ivNow / ivEntry : 1;
  return sf * vf * tf;
}

// IV d'entrée implicite d'une jambe indice quand elle n'a pas été stockée :
// on l'extrait de la prime d'entrée via Brenner (σ = P / (0.8·S·√T·100·qty)).
export function impliedEntryIv(premEntry, spotEntry, dteEntryYears, qty) {
  const denom = BRENNER * spotEntry * Math.sqrt(Math.max(1e-6, dteEntryYears)) * CONTRACT * Math.max(1, qty);
  if (!(denom > 0) || !(premEntry > 0)) return null;
  return (premEntry / denom) * 100;   // en %
}

// DTE restant : priorité à la vraie date d'échéance, repli durée − jours écoulés.
export function remainingDte(strategy, now = Date.now()) {
  const dur = strategy.duration || 30;
  if (strategy.expiry) {
    const exp = Date.parse(strategy.expiry);
    if (!isNaN(exp)) {
      const today = new Date(now); today.setUTCHours(0, 0, 0, 0);
      return Math.max(0, Math.round((exp - today.getTime()) / 86400000));
    }
  }
  const built = strategy.builtAt ? Date.parse(strategy.builtAt) : NaN;
  const days = isNaN(built) ? 0 : Math.max(0, Math.floor((now - built) / 86400000));
  return Math.max(0, dur - days);
}

// Compaction de l'historique des snapshots — autorise une cadence intraday
// (jusqu'à 15 min) sans faire grossir le jsonb sans fin :
//   • tous les points d'AUJOURD'HUI (série intraday), plafonnés aux `todayCap`
//     derniers (~une séance à 15 min + marge) ;
//   • un seul point par jour ANTÉRIEUR = le dernier (la clôture).
// Entrée triée par date croissante ; sortie chronologique.
export function compactSnapshots(snaps, now = Date.now(), todayCap = 40) {
  if (!Array.isArray(snaps) || !snaps.length) return snaps || [];
  const sorted = snaps.slice().sort((a, b) => String(a && a.taken_at).localeCompare(String(b && b.taken_at)));
  const todayStr = new Date(now).toISOString().slice(0, 10);
  const byDay = new Map();     // jour ISO -> [snapshots], ordre préservé
  const order = [];
  for (const s of sorted) {
    const day = (s && s.taken_at ? String(s.taken_at) : '').slice(0, 10) || '?';
    if (!byDay.has(day)) { byDay.set(day, []); order.push(day); }
    byDay.get(day).push(s);
  }
  const out = [];
  for (const day of order) {
    const arr = byDay.get(day);
    if (day === todayStr) out.push(...arr.slice(-todayCap));   // intraday du jour (borné)
    else out.push(arr[arr.length - 1]);                        // clôture des jours antérieurs
  }
  return out;
}

// Reprise d'une stratégie : indice (short) + composants (long), revalorisés en
// Black-Scholes à STRIKE FIXE (K = spot ATM d'entrée). Le P&L reste ancré sur la
// prime d'entrée stockée (× ratio de valeur BS), et les grecs nets $ (delta qui
// dérive, gamma, vega, theta) viennent directement de BS. getMarket(symbol, dte)
// → { spot, iv } | null (injecté pour les tests).
export async function repriceStrategy(strategy, getMarket, now = Date.now()) {
  const s = strategy || {};
  const port = s.portfolio || {};
  const dteNow = remainingDte(s, now);
  const dteEntry = Math.max(1, s.duration || 30);
  const Te = dteEntry / 365, Tn = Math.max(1, dteNow) / 365;

  const legs = [];
  const accE = { delta: 0, gamma: 0, vega: 0, theta: 0 };   // grecs $ nets à l'entrée
  const accC = { delta: 0, gamma: 0, vega: 0, theta: 0 };   // grecs $ nets actuels

  function processLeg({ symbol, role, side, qty, spotEntry, ivEntry, premEntry, mk }) {
    const covered = !!(mk && mk.spot > 0 && mk.iv > 0 && ivEntry > 0 && spotEntry > 0);
    const dir = side === 'short' ? -1 : 1;                  // sens (P&L et grecs)
    const K = spotEntry;                                    // strike = spot ATM à l'entrée
    const bsE = bsStraddle(spotEntry, K, (ivEntry || 0) / 100, Te);
    const bsN = covered ? bsStraddle(mk.spot, K, mk.iv / 100, Tn) : null;
    // Facteur = ratio de valeur BS (strike fixe) ; repli temporel si non couvert.
    const factor = (covered && bsE && bsE.value > 0 && bsN) ? bsN.value / bsE.value
      : Math.sqrt(Math.max(0, dteNow) / Math.max(1, dteEntry));
    const premNow = (premEntry || 0) * factor;
    const pnl = dir * (premNow - (premEntry || 0));
    // Accumule les grecs $ (entrée BS ; actuel BS courant, ou entrée time-decay si non couvert).
    const gE = dollarGreeks(dir, qty, spotEntry, bsE);
    if (gE) { accE.delta += gE.delta; accE.gamma += gE.gamma; accE.vega += gE.vega; accE.theta += gE.theta; }
    const bsCur = covered ? bsN : bsStraddle(spotEntry, K, (ivEntry || 0) / 100, Tn);
    const gC = dollarGreeks(dir, qty, covered ? mk.spot : spotEntry, bsCur);
    if (gC) { accC.delta += gC.delta; accC.gamma += gC.gamma; accC.vega += gC.vega; accC.theta += gC.theta; }
    const spotNow = covered ? mk.spot : spotEntry;
    legs.push({
      symbol, role, side, qty,
      entry_prem: round2(premEntry), current_prem: round2(premNow), pnl: round2(pnl),
      entry_iv: ivEntry != null ? round1(ivEntry) : null,
      current_iv: mk ? round1(mk.iv) : null,
      iv_change: (mk && ivEntry) ? round1(mk.iv - ivEntry) : null,
      spot_change_pct: (mk && spotEntry) ? round1((mk.spot / spotEntry - 1) * 100) : null,
      spot_now: spotNow, spot_entry: spotEntry,
      bs_delta: (bsCur || bsE) ? (bsCur || bsE).delta : 0,   // delta straddle par action (courant)
      d_entry: gE ? gE.delta : 0, d_cur: gC ? gC.delta : 0,  // delta $ /+1 % de la jambe (entrée / actuel)
      covered,
    });
  }

  // ── Jambe indice (short straddle) — sous-jacent = ETF proxy, même base qu'à l'entrée. ──
  {
    const idxSym = s.index || 'SPX';
    let ivEntry = port.idxIV || s.indexIV || null;
    if (!ivEntry) ivEntry = impliedEntryIv(port.idxPrem || 0, s.indexPrice || 0, Te, s.nIndex || 1);
    let mk = null;
    if (getMarket) {
      const raw = await getMarket(s.indexEtf || proxyEtf(idxSym) || idxSym, dteNow);
      if (raw && raw.spot > 0 && raw.iv > 0) mk = { spot: raw.spot, iv: raw.iv };
    }
    processLeg({ symbol: idxSym, role: 'index', side: 'short', qty: s.nIndex || 1, spotEntry: s.indexPrice || 0, ivEntry, premEntry: port.idxPrem || 0, mk });
  }

  // ── Jambes composants (long straddles). ──
  for (const c of (s.components || [])) {
    let mk = null;
    if (getMarket) {
      const raw = await getMarket(String(c.ticker).toUpperCase(), dteNow);
      if (raw && raw.spot > 0 && raw.iv > 0) mk = { spot: raw.spot, iv: raw.iv };
    }
    processLeg({ symbol: c.ticker, role: 'component', side: 'long', qty: c.nContracts || 1, spotEntry: c.price || 0, ivEntry: c.iv || null, premEntry: c.premium || 0, mk });
  }

  const straddle_pnl = round2(legs.reduce((a, l) => a + (l.pnl || 0), 0));
  const priced = legs.filter(l => l.covered).length;

  // ── Jambes de couverture Δ : P&L + delta $ (entrée & actuel). ──
  let hedge_pnl = 0, hedgeDeltaE = 0, hedgeDeltaC = 0;
  if (s.deltaHedge === 'legs') {
    for (const c of (s.components || [])) {
      if (!c.hedgeShares) continue;
      const leg = legs.find(l => l.symbol === c.ticker);
      const sE = c.price || 0, sN = leg ? leg.spot_now : sE;
      hedgeDeltaE += c.hedgeShares * sE * 0.01;
      hedgeDeltaC += c.hedgeShares * sN * 0.01;
      if (leg && leg.covered) hedge_pnl += c.hedgeShares * (sN - sE);
    }
  } else if (s.deltaHedge === 'index' && s.hedgeUnits) {
    const idxLeg = legs.find(l => l.role === 'index');
    const sE = s.indexPrice || 0, sN = idxLeg ? idxLeg.spot_now : sE;
    hedgeDeltaE += s.hedgeUnits * sE * 0.01 * CONTRACT;
    hedgeDeltaC += s.hedgeUnits * sN * 0.01 * CONTRACT;
    if (idxLeg && idxLeg.covered) hedge_pnl += s.hedgeUnits * (sN - sE) * CONTRACT;
  }
  hedge_pnl = round2(hedge_pnl);

  // ── P&L de couverture DYNAMIQUE (estimé) ────────────────────────────────────
  // `hedge_pnl` ci-dessus = couverture d'ENTRÉE figée. Une dispersion straddle/
  // straddle part quasi delta-neutre → couverture d'entrée minuscule → P&L
  // minuscule, alors que l'utilisateur qui SUIT les rééquilibrages recommandés
  // détient une couverture bien plus grosse (le delta dérive avec le gamma).
  // On estime le P&L d'une couverture RÉÉQUILIBRÉE À NEUTRE par intégration
  // trapézoïdale entre l'entrée et maintenant : H(t) = −Δ_straddle(t)/(0.01·S)
  // actions neutralisantes, P&L = ∫ H dS ≈ ½(H_e + H_c)(S_now − S_e). C'est une
  // ESTIMATION (dépend des vrais fills) mais bornée [statique, actuel] et bien
  // plus juste que le statique seul — cf. le cas réel NDX (5 → 301 actions).
  let hedge_pnl_dyn = hedge_pnl;
  if (s.deltaHedge === 'index') {
    const il = legs.find(l => l.role === 'index');
    if (il && il.covered) {
      const sE = s.indexPrice || il.spot_entry || 0, sN = il.spot_now || sE;
      const He = sE > 0 ? -accE.delta / (0.01 * sE) : 0;
      const Hc = sN > 0 ? -accC.delta / (0.01 * sN) : 0;
      hedge_pnl_dyn = 0.5 * (He + Hc) * (sN - sE);
    }
  } else if (s.deltaHedge === 'legs') {
    let acc = 0;
    for (const l of legs) {
      if (!l.covered) continue;
      const sE = l.spot_entry || 0, sN = l.spot_now || sE;
      const He = sE > 0 ? -(l.d_entry || 0) / (0.01 * sE) : 0;
      const Hc = sN > 0 ? -(l.d_cur || 0) / (0.01 * sN) : 0;
      acc += 0.5 * (He + Hc) * (sN - sE);
    }
    hedge_pnl_dyn = acc;
  }
  hedge_pnl_dyn = round2(hedge_pnl_dyn);
  const total_pnl = round2(straddle_pnl + hedge_pnl);
  const total_pnl_dyn = round2(straddle_pnl + hedge_pnl_dyn);

  const g = v => (v == null || !isFinite(v)) ? null : Math.round(v);
  const hedged = !!(s.deltaHedge && s.deltaHedge !== 'none');
  const deltaCur = accC.delta + hedgeDeltaC;   // delta $ net actuel (par +1 %), couverture incluse

  // ── Rééquilibrage pour redevenir delta-DOLLAR neutre (chiffres réels) ──
  // Mode indice : neutralise le delta net agrégé avec l'ETF proxy.
  // Mode composants : ajustement par jambe = −(delta straddle en actions + couverture déjà en place).
  // shares = −Δ$/(0.01·spot) : le spot se simplifie → un vrai nombre d'actions.
  const idxLeg0 = legs.find(l => l.role === 'index');
  const etf = s.indexEtf || proxyEtf(s.index || 'SPX') || (s.index || 'SPX');
  const etfSpotNow = idxLeg0 ? idxLeg0.spot_now : (s.indexPrice || 0);
  const mode = s.deltaHedge === 'legs' ? 'legs' : 'index';
  let rebalance = null;
  if (mode === 'legs') {
    const rl = [];
    if (idxLeg0 && idxLeg0.covered) {
      // jambe indice short + couverture future existante (hedgeUnits ≈ ×100 actions ETF)
      rl.push({ symbol: etf, side: 'index', shares: g(100 * ((s.nIndex || 1) * idxLeg0.bs_delta - (s.hedgeUnits || 0))) });
    }
    for (const c of (s.components || [])) {
      const leg = legs.find(l => l.symbol === c.ticker);
      if (leg && leg.covered) rl.push({ symbol: c.ticker, side: 'component', shares: g(-((c.nContracts || 1) * 100 * leg.bs_delta + (c.hedgeShares || 0))) });
    }
    rebalance = { mode, net_delta: g(deltaCur), legs: rl };
  } else {
    const shares = etfSpotNow > 0 ? g(-deltaCur / (0.01 * etfSpotNow)) : null;
    rebalance = { mode, net_delta: g(deltaCur), symbol: etf, spot: round2(etfSpotNow), shares };
  }

  return {
    asof: new Date(now).toISOString(),
    dte: dteNow,
    total_pnl, straddle_pnl, hedge_pnl,
    hedge_pnl_dyn, total_pnl_dyn,   // couverture rééquilibrée à neutre (estimée)
    net_vega: g(accC.vega), net_theta: g(accC.theta),   // rétro-compat snapshots
    greeks: {
      entry:   { vega: g(accE.vega), theta: g(accE.theta), gamma: g(accE.gamma) },
      current: { vega: g(accC.vega), theta: g(accC.theta), gamma: g(accC.gamma) },
    },
    // Delta $ net (par +1 %) INCLUANT la couverture → dérive réellement avec le spot.
    delta_dollar: { entry: g(accE.delta + hedgeDeltaE), current: g(deltaCur), hedged },
    rebalance,
    coverage: { priced, total: legs.length },
    legs,
  };
}

// Implémentation réseau par défaut : IV/spot ATM réels via la chaîne Cboe
// (cache partagé 15 min). Retourne { spot, iv } | null.
export async function cboeMarket(symbol, dte) {
  try {
    const b = await cboeIvBundle(symbol, dte);
    if (b && b.spot > 0 && b.iv > 0) return { spot: b.spot, iv: b.iv };
  } catch { /* indisponible → jambe non couverte */ }
  return null;
}

function round1(x) { return x == null || !isFinite(x) ? null : Math.round(x * 10) / 10; }
function round2(x) { return x == null || !isFinite(x) ? null : Math.round(x * 100) / 100; }
