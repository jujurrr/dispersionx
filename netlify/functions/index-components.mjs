// Netlify Function: /api/indices/:symbol/components
// Constituants d'un indice via FMP. Stratégie en deux temps :
//   1) etf-holder/<ETF>  → ticker + nom + poids (idéal, mais parfois plan payant)
//   2) <index>_constituent → ticker + nom + secteur (gratuit, sans poids)
// Forme renvoyée = window.DXMock.getComponents : tableau de
//   { ticker, name, sector, weight, score, iv, hv, rho, earnings, liq, beta }
// Les champs score/iv/hv/beta restent null (calculés ailleurs) → le frontend affiche « — ».

const BASE = 'https://financialmodelingprep.com/api/v3';
const MAX = 600; // toutes les actions de l'indice (S&P 500 ≈ 503)

const INDEX = {
  SPX: { etf: 'SPY', constituent: 'sp500_constituent' },
  NDX: { etf: 'QQQ', constituent: 'nasdaq_constituent' },
  DJI: { etf: 'DIA', constituent: 'dowjones_constituent' },
  // CAC / DAX : pas d'endpoint "constituent" FMP → on passe par les holdings de l'ETF
  // (EWQ ≈ grandes caps françaises, EWG ≈ grandes caps allemandes).
  CAC: { etf: 'EWQ', constituent: null },
  DAX: { etf: 'EWG', constituent: null },
};

function blank(extra) {
  return { sector: null, score: null, iv: null, hv: null, rho: null, earnings: false, liq: null, beta: null, ...extra };
}

export const config = { path: '/api/indices/:symbol/components' };

export default async (req, context) => {
  const key = process.env.FMP_API_KEY;
  if (!key) return Response.json({ error: 'no_keys' }, { status: 503 });

  const symbol = ((context?.params?.symbol) || new URL(req.url).searchParams.get('symbol') || '').toUpperCase();
  const map = INDEX[symbol];
  if (!map || (!map.etf && !map.constituent)) {
    return Response.json({ error: 'unknown_symbol' }, { status: 404 });
  }

  // 1) Poids via les holdings de l'ETF
  if (map.etf) {
    try {
      const r = await fetch(`${BASE}/etf-holder/${map.etf}?apikey=${key}`);
      if (r.ok) {
        const rows = await r.json();
        if (Array.isArray(rows) && rows.length) {
          const out = rows
            .filter(h => h.asset)
            .map(h => blank({ ticker: h.asset, name: h.name || h.asset, weight: h.weightPercentage != null ? Number(Number(h.weightPercentage).toFixed(2)) : null }))
            .sort((a, b) => (b.weight || 0) - (a.weight || 0))
            .slice(0, MAX);
          if (out.length) return Response.json(out, { status: 200 });
        }
      }
    } catch { /* on tente le repli constituent */ }
  }

  // 2) Repli : liste des constituants (nom + secteur, sans poids)
  if (map.constituent) {
    try {
      const r = await fetch(`${BASE}/${map.constituent}?apikey=${key}`);
      if (r.ok) {
        const rows = await r.json();
        if (Array.isArray(rows) && rows.length) {
          const out = rows
            .filter(c => c.symbol)
            .slice(0, MAX)
            .map(c => blank({ ticker: c.symbol, name: c.name || c.symbol, sector: c.sector || null, weight: null }));
          return Response.json(out, { status: 200 });
        }
      }
    } catch { /* tombe en erreur ci-dessous */ }
  }

  return Response.json({ error: 'fmp_unavailable' }, { status: 502 });
};
