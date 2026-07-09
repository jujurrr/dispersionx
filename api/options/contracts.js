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

// À partir d'une chaîne Cboe : échéance listée la plus proche de la cible, puis
// strike réel le plus proche du spot à cette échéance.
export function resolveOne(chain, targetExp8) {
  if (!chain || !Array.isArray(chain.options) || !chain.spot) return null;
  const spot = Number(chain.spot);
  const byExp = new Map();   // exp8 -> { expMs, strikes:Set<number> }
  for (const o of chain.options) {
    const p = occParts(o.option);
    if (!p) continue;
    let e = byExp.get(p.exp8);
    if (!e) byExp.set(p.exp8, e = { expMs: p.expMs, strikes: new Set() });
    e.strikes.add(p.strike);
  }
  if (!byExp.size) return null;
  // Échéance : la cible si elle est listée, sinon la plus proche par date.
  const tMs = exp8ToMs(targetExp8);
  let chosen = byExp.has(targetExp8) ? targetExp8 : null;
  if (!chosen) {
    let bestD = Infinity;
    for (const [e8, e] of byExp) { const d = Math.abs(e.expMs - tMs); if (d < bestD) { bestD = d; chosen = e8; } }
  }
  // Strike ATM réel le plus proche du spot.
  let strike = null, kd = Infinity;
  for (const k of byExp.get(chosen).strikes) { const d = Math.abs(k - spot); if (d < kd) { kd = d; strike = k; } }
  if (strike == null) return null;
  return { expiry: chosen, strike, spot: Number(spot.toFixed(2)), exactExpiry: byExp.has(targetExp8) };
}

// Cap de temps par symbole → l'endpoint reste borné même si le CDN Cboe traîne.
function withTimeout(promise, ms) {
  return Promise.race([promise, new Promise(res => setTimeout(() => res(null), ms))]);
}

export default async (req) => {
  const q = new URL(req.url).searchParams;
  const symbols = (q.get('symbols') || '')
    .split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
  const uniq = [...new Set(symbols)].slice(0, 30);
  const expiry = (q.get('expiry') || '').trim();
  if (!uniq.length) return Response.json({ error: 'no_symbols' }, { status: 400 });

  const contracts = {};
  await Promise.all(uniq.map(async sym => {
    try {
      const chain = await withTimeout(fetchCboeChain(sym, 7000), 9000);
      contracts[sym] = resolveOne(chain, expiry) || null;
    } catch { contracts[sym] = null; }
  }));

  return Response.json({ expiry, contracts }, {
    headers: {
      'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600',
      'Netlify-CDN-Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600',
    },
  });
};
