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

export const BRENNER = 0.7978845608;   // √(2/π) — coefficient straddle ATM
const CONTRACT = 100;                  // multiplicateur standard des options

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

// Les jambes normalisées d'une stratégie : indice (short) + composants (long).
// getMarket(symbol, dte) → { spot, iv } | null (injecté pour les tests).
export async function repriceStrategy(strategy, getMarket, now = Date.now()) {
  const s = strategy || {};
  const port = s.portfolio || {};
  const dteNow = remainingDte(s, now);
  const dteEntry = Math.max(1, s.duration || 30);
  const nIndex = s.nIndex || 1;

  const legs = [];

  // ── Jambe indice (short straddle) ──
  {
    const idxSym = s.index || 'SPX';
    const spotEntry = s.indexPrice || 0;
    const premEntry = port.idxPrem || 0;
    // IV d'entrée : stockée si dispo, sinon implicite via Brenner.
    let ivEntry = port.idxIV || s.indexIV || null;
    if (!ivEntry) ivEntry = impliedEntryIv(premEntry, spotEntry, dteEntry / 365, nIndex);
    // Marché actuel : on reprend EXACTEMENT le sous-jacent négociable utilisé à
    // l'entrée — l'ETF proxy (SPY, QQQ, DIA, EWQ, EWG) dont le prix EST déjà
    // s.indexPrice. AUCUNE mise à l'échelle : entrée et actuel sur la même base
    // (l'échelle proxy sert au notionnel/vega « niveau indice », pas à la prime).
    let mk = null;
    if (getMarket) {
      const fetchSym = s.indexEtf || proxyEtf(idxSym) || idxSym;
      const raw = await getMarket(fetchSym, dteNow);
      if (raw && raw.spot > 0 && raw.iv > 0) mk = { spot: raw.spot, iv: raw.iv };
    }
    const covered = !!(mk && ivEntry > 0 && spotEntry > 0);
    const factor = straddleFactor({ spotNow: mk?.spot, spotEntry, ivNow: mk?.iv, ivEntry, dteNow, dteEntry, covered });
    const premNow = premEntry * factor;
    legs.push({
      symbol: idxSym, role: 'index', side: 'short', qty: nIndex,
      entry_prem: round2(premEntry), current_prem: round2(premNow),
      pnl: round2(-1 * (premNow - premEntry)),          // short → profit si la prime baisse
      entry_iv: ivEntry != null ? round1(ivEntry) : null,
      current_iv: mk ? round1(mk.iv) : null,
      iv_change: (mk && ivEntry) ? round1(mk.iv - ivEntry) : null,
      spot_change_pct: (mk && spotEntry) ? round1((mk.spot / spotEntry - 1) * 100) : null,
      covered,
    });
  }

  // ── Jambes composants (long straddles) ──
  for (const c of (s.components || [])) {
    const spotEntry = c.price || 0;
    const ivEntry = c.iv || null;
    const premEntry = c.premium || 0;
    const qty = c.nContracts || 1;
    let mk = null;
    if (getMarket) {
      const raw = await getMarket(String(c.ticker).toUpperCase(), dteNow);
      if (raw && raw.spot > 0 && raw.iv > 0) mk = { spot: raw.spot, iv: raw.iv };
    }
    const covered = !!(mk && ivEntry > 0 && spotEntry > 0);
    const factor = straddleFactor({ spotNow: mk?.spot, spotEntry, ivNow: mk?.iv, ivEntry, dteNow, dteEntry, covered });
    const premNow = premEntry * factor;
    legs.push({
      symbol: c.ticker, role: 'component', side: 'long', qty,
      entry_prem: round2(premEntry), current_prem: round2(premNow),
      pnl: round2(premNow - premEntry),                 // long → profit si la prime monte
      entry_iv: ivEntry != null ? round1(ivEntry) : null,
      current_iv: mk ? round1(mk.iv) : null,
      iv_change: (mk && ivEntry) ? round1(mk.iv - ivEntry) : null,
      spot_change_pct: (mk && spotEntry) ? round1((mk.spot / spotEntry - 1) * 100) : null,
      covered,
    });
  }

  const total_pnl = round2(legs.reduce((a, l) => a + (l.pnl || 0), 0));
  const priced = legs.filter(l => l.covered).length;

  // Grecs nets au DTE restant (loi √T, cohérent avec strategyMetrics du client) —
  // secondaire : le « réel » ici c'est le P&L piloté par spot/IV.
  const k = Math.sqrt(Math.max(1, dteNow) / dteEntry);
  const netVega = Math.round((port.netVega || 0) * k);
  const netTheta = Math.round((port.netTheta || 0) / k);

  return {
    asof: new Date(now).toISOString(),
    dte: dteNow,
    total_pnl,
    net_vega: netVega,
    net_theta: netTheta,
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
