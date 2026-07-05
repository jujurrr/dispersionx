// Module partagé — données RÉELLES du Cboe (cotations différées 15 min, gratuit, sans clé).
// Utilisé par les fonctions Vercel (api/**) et re-exporté par les fonctions Netlify.
//
//   Chaîne d'options : https://cdn.cboe.com/api/global/delayed_quotes/options/{SYM}.json
//     → spot, iv30 (IV 30j calculée par le Cboe — la valeur comparable à IBKR),
//       et chaque option avec iv, delta, gamma, vega, theta réels.
//   Historique prix : https://cdn.cboe.com/api/global/delayed_quotes/charts/historical/{SYM}.json
//     → ~20 ans de clôtures quotidiennes ajustées des splits (pour la HV).
//
// Les indices purs sont préfixés d'un underscore chez le Cboe. CAC/DAX n'ont pas
// d'options US : on passe par la chaîne de leur ETF proxy (EWQ/EWG) — IV réelle
// du véhicule effectivement tradé.

const OPTIONS_URL = 'https://cdn.cboe.com/api/global/delayed_quotes/options/';
const HISTORY_URL = 'https://cdn.cboe.com/api/global/delayed_quotes/charts/historical/';

// ── Résilience réseau : réessais + backoff, cache mémoire, déduplication ─────
// Le CDN Cboe est gratuit, throttlé et sans SLA : on réessaie les erreurs
// transitoires (429, 5xx, timeouts) avec un délai croissant, on coalesce les
// requêtes identiques « en vol », et on garde un petit cache mémoire par
// instance. Échecs et replis sont journalisés (JSON, repérables dans les logs).
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Statuts HTTP transitoires qui valent la peine d'être réessayés.
export function isRetryableStatus(status) {
  return status === 408 || status === 425 || status === 429 ||
         status === 500 || status === 502 || status === 503 || status === 504;
}

// Backoff exponentiel plafonné + jitter (évite que tous les clients réessaient
// en même temps). attempt = 0, 1, 2… → délai croissant borné par `cap`.
export function backoffDelay(attempt, base = 300, cap = 4000) {
  const exp = Math.min(cap, base * 2 ** attempt);
  return exp / 2 + Math.random() * (exp / 2);
}

function logEvent(evt, data) {
  try { console.log(JSON.stringify({ src: 'cboe', evt, ...data })); } catch {}
}

// Cache mémoire + déduplication des appels « en vol », par clé. TTL en ms ; les
// valeurs nulles NE sont PAS mises en cache (on retentera au prochain appel).
export function makeCache({ maxEntries = 256 } = {}) {
  const store = new Map();      // key -> { at, val }
  const inflight = new Map();   // key -> Promise
  return function cached(key, ttlMs, producer) {
    const hit = store.get(key);
    if (hit && Date.now() - hit.at < ttlMs) return Promise.resolve(hit.val);
    if (inflight.has(key)) return inflight.get(key);   // requête identique déjà en cours
    const p = (async () => {
      try {
        const val = await producer();
        if (val != null) {
          store.set(key, { at: Date.now(), val });
          if (store.size > maxEntries) store.delete(store.keys().next().value); // borne mémoire
        }
        return val;
      } finally { inflight.delete(key); }
    })();
    inflight.set(key, p);
    return p;
  };
}
const _cboeCache = makeCache();

export const CBOE_INDEX = {
  SPX: '_SPX', NDX: '_NDX', RUT: '_RUT', VIX: '_VIX',
  DJX: '_DJX', DJI: '_DJX',
  CAC: 'EWQ', DAX: 'EWG',
};

export function cboeSymbol(sym) {
  const s = String(sym || '').toUpperCase().trim();
  return CBOE_INDEX[s] || s;
}

export async function fetchJson(url, timeoutMs, { retries = 2, backoff = backoffDelay } = {}) {
  for (let attempt = 0; ; attempt++) {
    try {
      const r = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (r.ok) return await r.json();
      if (isRetryableStatus(r.status) && attempt < retries) {
        logEvent('retry', { url, status: r.status, attempt });
        await sleep(backoff(attempt));
        continue;
      }
      logEvent('http_error', { url, status: r.status });
      return null;
    } catch (e) {
      if (attempt < retries) {
        logEvent('retry', { url, err: (e && e.name) || 'error', attempt });
        await sleep(backoff(attempt));
        continue;
      }
      logEvent('fetch_failed', { url, err: (e && e.message) || String(e) });
      return null;
    }
  }
}

// Chaîne d'options complète. Retourne { spot, iv30, options, asof } ou null.
export async function fetchCboeChain(symbol, timeoutMs = 15000) {
  return _cboeCache(`chain:${cboeSymbol(symbol)}`, 60000, async () => {
    const d = (await fetchJson(OPTIONS_URL + encodeURIComponent(cboeSymbol(symbol)) + '.json', timeoutMs))?.data;
    const spot = d?.current_price ?? d?.close;
    if (!spot || !Array.isArray(d.options) || !d.options.length) return null;
    return {
      spot,
      iv30: Number(d.iv30) > 0.1 && Number(d.iv30) < 500 ? Number(Number(d.iv30).toFixed(1)) : null,
      options: d.options,
      asof: d.last_trade_time || null,
    };
  });
}

// IV ATM par échéance : moyenne des IV (calls + puts) des strikes à ±1 % du
// spot — élargi à ±2.5 % quand la grille de strikes est plus espacée.
// Retourne [{ dte, iv }] trié par DTE (iv en %, ex. 25.3).
export function atmTermStructure(spot, options) {
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  const byExp = new Map();
  for (const o of options) {
    const m = o.option.match(/^[A-Z0-9/.]+?(\d{6})([CP])(\d{8})$/);
    if (!m || !(o.iv > 0.01) || !(o.iv < 5)) continue;   // iv en décimal (0.25 = 25 %)
    const exp = Date.UTC(2000 + +m[1].slice(0, 2), +m[1].slice(2, 4) - 1, +m[1].slice(4, 6));
    const dte = Math.round((exp - today.getTime()) / 86400000);
    if (dte < 3 || dte > 200) continue;
    const strike = parseInt(m[3], 10) / 1000;
    const dist = Math.abs(strike - spot) / spot;
    if (dist > 0.025) continue;
    let e = byExp.get(dte); if (!e) byExp.set(dte, e = { near: [], wide: [] });
    (dist <= 0.01 ? e.near : e.wide).push(o.iv);
  }
  return [...byExp.entries()].map(([dte, e]) => {
    const arr = e.near.length >= 2 ? e.near : (e.near.length + e.wide.length >= 2 ? e.near.concat(e.wide) : null);
    if (!arr) return null;
    return { dte, iv: Number((arr.reduce((a, b) => a + b, 0) / arr.length * 100).toFixed(1)) };
  }).filter(Boolean).sort((a, b) => a.dte - b.dte);
}

// Interpolation au DTE cible, linéaire en variance totale (σ²·t).
export function ivAtDte(term, days) {
  if (!term || !term.length) return null;
  let lo = term[0], hi = term[term.length - 1];
  for (const p of term) if (p.dte <= days) lo = p;
  for (let i = term.length - 1; i >= 0; i--) if (term[i].dte >= days) hi = term[i];
  if (lo.dte === hi.dte) return Number(lo.iv.toFixed(1));
  const vLo = (lo.iv / 100) ** 2 * lo.dte, vHi = (hi.iv / 100) ** 2 * hi.dte;
  const v = vLo + (vHi - vLo) * (days - lo.dte) / (hi.dte - lo.dte);
  return Number((Math.sqrt(Math.max(0, v / days)) * 100).toFixed(1));
}

// Grecs ATM réels à l'échéance la plus proche du DTE demandé.
// Retourne le call ATM (IV moyennée call/put au même strike quand dispo).
export function atmGreeks(spot, options, targetDte) {
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  const parsed = [];
  for (const o of options) {
    const m = o.option.match(/^[A-Z0-9/.]+?(\d{6})([CP])(\d{8})$/);
    if (!m || !(o.iv > 0.01) || !(o.iv < 5)) continue;
    const exp = Date.UTC(2000 + +m[1].slice(0, 2), +m[1].slice(2, 4) - 1, +m[1].slice(4, 6));
    const dte = Math.round((exp - today.getTime()) / 86400000);
    if (dte < 1 || dte > 400) continue;
    parsed.push({ o, dte, type: m[2], strike: parseInt(m[3], 10) / 1000, expIso: new Date(exp).toISOString().slice(0, 10) });
  }
  if (!parsed.length) return null;
  // échéance la plus proche du DTE cible
  let bestDte = null;
  for (const p of parsed) if (bestDte == null || Math.abs(p.dte - targetDte) < Math.abs(bestDte - targetDte)) bestDte = p.dte;
  const atExp = parsed.filter(p => p.dte === bestDte);
  // strike le plus proche du spot
  let call = null, put = null;
  for (const p of atExp) {
    if (p.type === 'C') { if (!call || Math.abs(p.strike - spot) < Math.abs(call.strike - spot)) call = p; }
    else               { if (!put  || Math.abs(p.strike - spot) < Math.abs(put.strike - spot))  put  = p; }
  }
  const ref = call || put;
  if (!ref) return null;
  const ivs = [call, put].filter(p => p && Math.abs(p.strike - ref.strike) < 1e-9).map(p => p.o.iv);
  const iv = ivs.reduce((a, b) => a + b, 0) / ivs.length;
  const num = (x, d = 4) => (x != null && isFinite(x) ? Number(Number(x).toFixed(d)) : null);
  return {
    strike: ref.strike,
    expiry: ref.expIso,
    dte: bestDte,
    iv: Number((iv * 100).toFixed(1)),
    delta: num(ref.o.delta), gamma: num(ref.o.gamma, 5),
    vega: num(ref.o.vega), theta: num(ref.o.theta),
    mid: ref.o.bid > 0 && ref.o.ask > 0 ? Number(((ref.o.bid + ref.o.ask) / 2).toFixed(2)) : null,
  };
}

// Pipeline complet pour un symbole : { spot, iv, iv30, term, greeks, asof } ou null.
// `iv` = IV ATM interpolée au DTE demandé ; à 30 j (±3), l'iv30 officielle du
// Cboe prime quand elle existe (c'est la valeur affichée par IBKR & co).
export async function cboeIvBundle(symbol, dte = 30, timeoutMs = 15000) {
  const chain = await fetchCboeChain(symbol, timeoutMs);
  if (!chain) return null;
  const term = atmTermStructure(chain.spot, chain.options);
  const interp = ivAtDte(term, dte);
  const iv = (Math.abs(dte - 30) <= 3 && chain.iv30 != null) ? chain.iv30 : interp;
  if (iv == null) return null;
  return {
    symbol: String(symbol).toUpperCase(),
    spot: chain.spot,
    dte,
    iv,
    iv30: chain.iv30 ?? (term.length ? ivAtDte(term, 30) : null),
    term,
    greeks: atmGreeks(chain.spot, chain.options, dte),
    asof: chain.asof,
    source: 'cboe_delayed',
  };
}

// Clôtures quotidiennes (ajustées des splits) — pour HV/beta/corrélation.
// Retourne number[] (chronologique) ou null.
export async function fetchCboeCloses(symbol, maxBars = 300, timeoutMs = 10000) {
  // Clé incluant maxBars : deux appels de tailles différentes ne se mélangent pas.
  return _cboeCache(`closes:${cboeSymbol(symbol)}:${maxBars}`, 1800000, async () => {
    const j = await fetchJson(HISTORY_URL + encodeURIComponent(cboeSymbol(symbol)) + '.json', timeoutMs);
    const rows = j?.data;
    if (!Array.isArray(rows) || rows.length < 10) return null;
    return rows.slice(-maxBars).map(r => r.close).filter(c => c != null && isFinite(c) && c > 0);
  });
}

async function fetchYahooCloses(symbol, range = '1y', timeoutMs = 8000) {
  const j = await fetchJson(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=${range}`,
    timeoutMs
  );
  const closes = j?.chart?.result?.[0]?.indicators?.quote?.[0]?.close || [];
  const valid = closes.filter(c => c != null && isFinite(c) && c > 0);
  if (valid.length >= 10) return valid;
  // Actions de classe US : « BRK.B » s'écrit « BRK-B » chez Yahoo. Une seule
  // lettre après le point = classe d'action ; les suffixes de place (.PA, .DE…)
  // font 2+ lettres et ne doivent pas être convertis.
  if (/^[A-Z]+\.[A-Z]$/.test(symbol)) return fetchYahooCloses(symbol.replace('.', '-'), range, timeoutMs);
  return null;
}

// Clôtures avec repli : Cboe (fiable côté serveur, ajusté) puis Yahoo
// (nécessaire pour les valeurs non-US, ex. composants CAC/DAX en local).
export async function fetchClosesSmart(symbol, maxBars = 300) {
  const cboe = await fetchCboeCloses(symbol, maxBars);
  if (cboe && cboe.length >= 30) return cboe;
  logEvent('fallback_yahoo', { symbol, cboe: cboe ? cboe.length : 0 });
  const yahoo = await fetchYahooCloses(symbol, maxBars > 260 ? '2y' : '1y');
  if (!yahoo) logEvent('closes_unavailable', { symbol });
  return yahoo ? yahoo.slice(-maxBars) : cboe;
}

// IV via l'endpoint interne /api/iv/{symbol} (mis en cache CDN 15 min) — à
// préférer dans les endpoints batch pour ne pas re-télécharger les chaînes.
export async function ivViaApi(origin, symbol, dte = 30, timeoutMs = 20000) {
  if (!origin) return null;
  try {
    const r = await fetch(
      `${origin}/api/iv/${encodeURIComponent(String(symbol).toUpperCase())}?dte=${dte}`,
      { signal: AbortSignal.timeout(timeoutMs) }
    );
    if (!r.ok) return null;
    const d = await r.json();
    return d && d.iv != null ? d : null;
  } catch { return null; }
}
