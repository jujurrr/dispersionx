// GET /api/options/contracts?symbols=SPY,AAPL,MSFT&expiry=20260821
// Résout, pour chaque symbole, un contrat d'option RÉELLEMENT LISTÉ :
//   • l'échéance listée la plus proche de `expiry` (idéalement identique — la
//     mensuelle standard existe pour toute action optionnable) ;
//   • le strike ATM réel (le plus proche du spot) coté à cette échéance.
// Source : chaîne d'options différée Cboe (mêmes contrats listés qu'IBKR pour
// les options US). Sert à l'export IBKR What-If : on n'écrit dans le CSV que des
// contrats qui existent vraiment → plus de lignes rejetées par TWS.
//
// Réponse : { expiry, contracts: { SYM: { expiry:'YYYYMMDD', strike, spot } | null } }
// Un symbole absent (option non listée aux US, ex. SAP.DE) ou indisponible
// (throttling Cboe) → null : le client retombe alors sur le strike standard.
export const config = { runtime: 'edge' };

import { allow, tooMany } from '../_lib/ratelimit.js';
import { cleanSymbols } from '../_lib/symbols.js';

import { fetchCboeChain } from '../_lib/cboe.js';

// OCC : « …AAPL260821C00195000 » → 260821 (YYMMDD) + C/P + strike×1000 (8 chiffres).
export function occParts(optStr) {
  const m = String(optStr || '').match(/(\d{6})([CP])(\d{8})$/);
  if (!m) return null;
  const yy = 2000 + +m[1].slice(0, 2), mm = +m[1].slice(2, 4), dd = +m[1].slice(4, 6);
  return {
    exp8: `${yy}${String(mm).padStart(2, '0')}${String(dd).padStart(2, '0')}`,
    expMs: Date.UTC(yy, mm - 1, dd),
    strike: parseInt(m[3], 10) / 1000,
  };
}

function exp8ToMs(e8) {
  const s = String(e8 || '');
  if (!/^\d{8}$/.test(s)) return NaN;
  return Date.UTC(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8));
}

// Chaîne Cboe → Map exp8 -> { expMs, strikes:Set<number> } (échéances + strikes cotés).
export function expMapOf(chain) {
  const byExp = new Map();
  if (!chain || !Array.isArray(chain.options)) return byExp;
  for (const o of chain.options) {
    const p = occParts(o.option);
    if (!p) continue;
    let e = byExp.get(p.exp8);
    if (!e) byExp.set(p.exp8, e = { expMs: p.expMs, strikes: new Set() });
    e.strikes.add(p.strike);
  }
  return byExp;
}

// Strike coté le plus proche du spot à une échéance donnée (ou null).
function strikeAt(map, exp8, spot) {
  const e = map.get(exp8);
  if (!e) return null;
  let strike = null, kd = Infinity;
  for (const k of e.strikes) { const d = Math.abs(k - spot); if (d < kd) { kd = d; strike = k; } }
  return strike;
}

// Résout un contrat pour UN symbole : échéance listée la plus proche de la cible
// + strike ATM réel. `targetExp8` peut être une échéance imposée (commune).
function resolveFromMap(map, spot, targetExp8) {
  if (!map || !map.size) return null;
  let chosen = map.has(targetExp8) ? targetExp8 : null;
  if (!chosen) {
    const tMs = exp8ToMs(targetExp8);
    let bestD = Infinity;
    for (const [e8, e] of map) { const d = Math.abs(e.expMs - tMs); if (d < bestD) { bestD = d; chosen = e8; } }
  }
  const strike = strikeAt(map, chosen, spot);
  if (strike == null) return null;
  return { expiry: chosen, strike, spot: Number(spot.toFixed(2)), exactExpiry: map.has(targetExp8) };
}
export function resolveOne(chain, targetExp8) {
  if (!chain || !chain.spot) return null;
  return resolveFromMap(expMapOf(chain), Number(chain.spot), targetExp8);
}

// Échéance cotée par TOUS les symboles (intersection des exp8), la plus proche
// de la cible → une SEULE date valable pour toute la stratégie. null si aucune.
export function commonExpiryOf(maps, targetExp8) {
  const valid = (maps || []).filter(m => m && m.size);
  if (!valid.length) return null;
  let inter = null;
  for (const m of valid) {
    const keys = new Set(m.keys());
    inter = inter == null ? keys : new Set([...inter].filter(k => keys.has(k)));
    if (!inter.size) return null;
  }
  const tMs = exp8ToMs(targetExp8);
  let best = null, bestD = Infinity;
  for (const e8 of inter) {
    const d = isNaN(tMs) ? 0 : Math.abs(exp8ToMs(e8) - tMs);
    if (d < bestD) { bestD = d; best = e8; }
  }
  return best;
}

// LISTE (triée) des échéances cotées par TOUS les symboles (intersection).
// Sert à proposer, dès la construction, des échéances valables pour tous.
export function commonExpiriesOf(maps) {
  const valid = (maps || []).filter(m => m && m.size);
  if (!valid.length) return [];
  let inter = null;
  for (const m of valid) {
    const keys = new Set(m.keys());
    inter = inter == null ? keys : new Set([...inter].filter(k => keys.has(k)));
    if (!inter.size) return [];
  }
  return [...inter].sort();
}

// Cap de temps par symbole → l'endpoint reste borné même si le CDN Cboe traîne.
function withTimeout(promise, ms) {
  return Promise.race([promise, new Promise(res => setTimeout(() => res(null), ms))]);
}

export default async (req) => {
  if (!allow(req, { limit: 120, windowMs: 10000 })) return tooMany();
  const q = new URL(req.url).searchParams;
  const uniq = cleanSymbols((q.get('symbols') || '').split(','), 30);   // normalise + valide + déduplique + plafonne
  const expiry = (q.get('expiry') || '').trim();
  if (!uniq.length) return Response.json({ error: 'no_symbols' }, { status: 400 });

  // 1) Chaîne + parsing de chaque symbole (best-effort, borné en temps).
  const info = {};   // sym -> { map, spot } | null
  await Promise.all(uniq.map(async sym => {
    try {
      const chain = await withTimeout(fetchCboeChain(sym, 7000), 9000);
      info[sym] = (chain && chain.spot) ? { map: expMapOf(chain), spot: Number(chain.spot) } : null;
    } catch { info[sym] = null; }
  }));

  // 2) Échéances COMMUNES à tous les symboles cotés (intersection). `common` =
  //    la plus proche de la cible (pour l'export) ; `commonExpiries` = la liste
  //    complète (pour proposer les échéances à la construction).
  const mapsList = Object.values(info).filter(Boolean).map(x => x.map);
  const commonExpiries = commonExpiriesOf(mapsList);
  const common = commonExpiryOf(mapsList, expiry);

  // 3) Par symbole : strike ATM à l'échéance commune ; repli per-symbole sinon.
  const contracts = {};
  for (const sym of uniq) {
    const x = info[sym];
    if (!x || !x.map.size) { contracts[sym] = null; continue; }
    if (common && x.map.has(common)) {
      const strike = strikeAt(x.map, common, x.spot);
      contracts[sym] = strike != null ? { expiry: common, strike, spot: Number(x.spot.toFixed(2)) } : null;
    } else {
      contracts[sym] = resolveFromMap(x.map, x.spot, expiry);
    }
  }

  return Response.json({ expiry, commonExpiry: common || null, commonExpiries, contracts }, {
    headers: {
      'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600',
      'Netlify-CDN-Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600',
    },
  });
};
