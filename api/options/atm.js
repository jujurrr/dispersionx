// GET /api/options/atm?symbol=AAPL&dte=30
// IV ATM + grecs RÉELS depuis la chaîne d'options différée du Cboe
// (15 min de délai, gratuit, sans clé). Repli : MarketData.app si token.
export const config = { runtime: 'edge' };

import { allow, tooMany } from '../_lib/ratelimit.js';
import { cleanSymbol } from '../_lib/symbols.js';

import { fetchCboeChain, atmGreeks, cboeSymbol } from '../_lib/cboe.js';

const MD_BASE = 'https://api.marketdata.app/v1/options/chain';

async function fetchFromCboe(symbol, dte) {
  const chain = await fetchCboeChain(symbol);
  if (!chain) return null;
  const g = atmGreeks(chain.spot, chain.options, dte);
  if (!g || g.iv == null) return null;
  return {
    symbol,
    underlying_price: chain.spot,
    strike: g.strike,
    expiry: g.expiry,
    dte: g.dte,
    iv: g.iv,
    iv30: chain.iv30,
    mid: g.mid,
    greeks: { delta: g.delta, gamma: g.gamma, vega: g.vega, theta: g.theta, strike: g.strike, expiry: g.expiry },
    asof: chain.asof,
    source: 'cboe_delayed',
  };
}

async function fetchMarketData(symbol, dte, token) {
  const r = await fetch(`${MD_BASE}/${symbol}/?dte=${encodeURIComponent(dte)}&side=call&strikeLimit=20`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) return null;
  const d = await r.json();
  if (d.s !== 'ok' || !Array.isArray(d.strike) || !d.strike.length) return null;

  const up = d.underlyingPrice || [];
  let best = 0, bestDiff = Infinity;
  for (let i = 0; i < d.strike.length; i++) {
    const diff = Math.abs(d.strike[i] - (up[i] ?? up[0]));
    if (diff < bestDiff) { bestDiff = diff; best = i; }
  }
  const num = (a) => (a && a[best] != null ? Number(a[best]) : null);
  const expUnix = (d.expiration || [])[best];
  const ivDec = num(d.iv);
  return {
    symbol, underlying_price: num(up), strike: num(d.strike),
    expiry: expUnix ? new Date(expUnix * 1000).toISOString().slice(0, 10) : null,
    dte: num(d.dte),
    iv: ivDec != null ? Number((ivDec * 100).toFixed(1)) : null,
    greeks: {
      delta: num(d.delta), gamma: num(d.gamma),
      vega: num(d.vega), theta: num(d.theta),
      strike: num(d.strike),
      expiry: expUnix ? new Date(expUnix * 1000).toISOString().slice(0, 10) : null,
    },
    source: 'marketdata',
  };
}

export default async (req) => {
  if (!allow(req, { limit: 120, windowMs: 10000 })) return tooMany();
  const q = new URL(req.url).searchParams;
  const symbol = cleanSymbol(q.get('symbol'));   // valide le format (anti-injection URL)
  const dte = parseInt(q.get('dte') || '30', 10);
  if (!symbol) return Response.json({ error: 'no_symbol' }, { status: 400 });

  // 1) Cboe — gratuit, réel, différé 15 min (couvre indices + actions US)
  try {
    const res = await fetchFromCboe(symbol, dte);
    if (res?.iv) {
      return Response.json(res, {
        headers: {
          'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600',
          'Netlify-CDN-Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600',
        },
      });
    }
  } catch { /* repli */ }

  // 2) MarketData.app (si token configuré)
  if (process.env.MARKETDATA_API_TOKEN) {
    try {
      const res = await fetchMarketData(symbol, dte, process.env.MARKETDATA_API_TOKEN);
      if (res?.iv) return Response.json(res);
    } catch { /* pas de données */ }
  }

  return Response.json({ error: 'no_iv_data', symbol, cboe_symbol: cboeSymbol(symbol) }, { status: 502 });
};
