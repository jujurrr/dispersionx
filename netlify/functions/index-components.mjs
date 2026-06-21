// Netlify Function: /api/indices/:symbol/components
// Constituants d'un indice, en cascade de sources (robuste aux plans payants FMP) :
//   1) FMP etf-holder (poids réels — souvent plan payant)
//   2) FMP /stable/<index>-constituent (gratuit — liste + secteur, sans poids)
//   3) FMP /api/v3/<index>_constituent (ancien — au cas où)
//   4) Repli STATIQUE intégré (toujours disponible, sans aucune API)
// Forme renvoyée = window.DXMock.getComponents :
//   { ticker, name, sector, weight, score, iv, hv, rho, earnings, liq, beta }

export const config = { path: '/api/indices/:symbol/components' };

const STABLE = 'https://financialmodelingprep.com/stable';
const V3 = 'https://financialmodelingprep.com/api/v3';
const MAX = 600;

const INDEX = {
  SPX: { stable: 'sp500-constituent', v3: 'sp500_constituent', etf: 'SPY' },
  NDX: { stable: 'nasdaq-constituent', v3: 'nasdaq_constituent', etf: 'QQQ' },
  DJI: { stable: 'dowjones-constituent', v3: 'dowjones_constituent', etf: 'DIA' },
  CAC: { etf: 'EWQ' },
  DAX: { etf: 'EWG' },
};

// Repli statique (grandes lignes par indice) — garantit une liste utile sans API.
const STATIC = {
  SPX: [
    ['AAPL','Apple','Technology'],['MSFT','Microsoft','Technology'],['NVDA','Nvidia','Technology'],
    ['AMZN','Amazon','Consumer Disc.'],['GOOGL','Alphabet A','Communications'],['GOOG','Alphabet C','Communications'],
    ['META','Meta Platforms','Communications'],['AVGO','Broadcom','Technology'],['TSLA','Tesla','Consumer Disc.'],
    ['BRK.B','Berkshire Hathaway','Financials'],['LLY','Eli Lilly','Healthcare'],['JPM','JPMorgan Chase','Financials'],
    ['V','Visa','Financials'],['XOM','Exxon Mobil','Energy'],['UNH','UnitedHealth','Healthcare'],
    ['MA','Mastercard','Financials'],['JNJ','Johnson & Johnson','Healthcare'],['PG','Procter & Gamble','Consumer Staples'],
    ['HD','Home Depot','Consumer Disc.'],['COST','Costco','Consumer Staples'],['ABBV','AbbVie','Healthcare'],
    ['WMT','Walmart','Consumer Staples'],['NFLX','Netflix','Communications'],['BAC','Bank of America','Financials'],
    ['KO','Coca-Cola','Consumer Staples'],['CRM','Salesforce','Technology'],['CVX','Chevron','Energy'],
    ['AMD','AMD','Technology'],['PEP','PepsiCo','Consumer Staples'],['ADBE','Adobe','Technology'],
    ['MRK','Merck','Healthcare'],['TMO','Thermo Fisher','Healthcare'],['CSCO','Cisco','Technology'],
    ['ACN','Accenture','Technology'],['MCD','McDonald\'s','Consumer Disc.'],['ABT','Abbott','Healthcare'],
    ['QCOM','Qualcomm','Technology'],['TXN','Texas Instruments','Technology'],['DHR','Danaher','Healthcare'],
    ['INTC','Intel','Technology'],['INTU','Intuit','Technology'],['IBM','IBM','Technology'],
    ['GE','GE Aerospace','Industrials'],['CAT','Caterpillar','Industrials'],['VZ','Verizon','Communications'],
    ['AMGN','Amgen','Healthcare'],['PFE','Pfizer','Healthcare'],['NOW','ServiceNow','Technology'],
    ['UBER','Uber','Technology'],['GS','Goldman Sachs','Financials'],
  ],
  NDX: [
    ['AAPL','Apple','Technology'],['MSFT','Microsoft','Technology'],['NVDA','Nvidia','Technology'],
    ['AMZN','Amazon','Consumer Disc.'],['AVGO','Broadcom','Technology'],['META','Meta Platforms','Communications'],
    ['GOOGL','Alphabet A','Communications'],['GOOG','Alphabet C','Communications'],['TSLA','Tesla','Consumer Disc.'],
    ['COST','Costco','Consumer Staples'],['NFLX','Netflix','Communications'],['AMD','AMD','Technology'],
    ['PEP','PepsiCo','Consumer Staples'],['ADBE','Adobe','Technology'],['CSCO','Cisco','Technology'],
    ['TMUS','T-Mobile','Communications'],['INTC','Intel','Technology'],['QCOM','Qualcomm','Technology'],
    ['INTU','Intuit','Technology'],['AMAT','Applied Materials','Technology'],['TXN','Texas Instruments','Technology'],
    ['ISRG','Intuitive Surgical','Healthcare'],['BKNG','Booking','Consumer Disc.'],['HON','Honeywell','Industrials'],
    ['MU','Micron','Technology'],['LRCX','Lam Research','Technology'],['ADI','Analog Devices','Technology'],
    ['REGN','Regeneron','Healthcare'],['VRTX','Vertex','Healthcare'],['PANW','Palo Alto Networks','Technology'],
    ['KLAC','KLA Corp','Technology'],['SBUX','Starbucks','Consumer Disc.'],['MDLZ','Mondelez','Consumer Staples'],
    ['GILD','Gilead','Healthcare'],['ADP','ADP','Industrials'],['MELI','MercadoLibre','Consumer Disc.'],
  ],
  DJI: [
    ['AAPL','Apple','Technology'],['MSFT','Microsoft','Technology'],['AMZN','Amazon','Consumer Disc.'],
    ['JPM','JPMorgan Chase','Financials'],['V','Visa','Financials'],['JNJ','Johnson & Johnson','Healthcare'],
    ['WMT','Walmart','Consumer Staples'],['PG','Procter & Gamble','Consumer Staples'],['HD','Home Depot','Consumer Disc.'],
    ['CVX','Chevron','Energy'],['MRK','Merck','Healthcare'],['KO','Coca-Cola','Consumer Staples'],
    ['CSCO','Cisco','Technology'],['MCD','McDonald\'s','Consumer Disc.'],['CRM','Salesforce','Technology'],
    ['DIS','Disney','Communications'],['IBM','IBM','Technology'],['GS','Goldman Sachs','Financials'],
    ['CAT','Caterpillar','Industrials'],['AXP','American Express','Financials'],['BA','Boeing','Industrials'],
    ['HON','Honeywell','Industrials'],['AMGN','Amgen','Healthcare'],['NKE','Nike','Consumer Disc.'],
    ['TRV','Travelers','Financials'],['VZ','Verizon','Communications'],['MMM','3M','Industrials'],
    ['UNH','UnitedHealth','Healthcare'],['SHW','Sherwin-Williams','Materials'],['NVDA','Nvidia','Technology'],
  ],
};

function blank(extra) {
  return { sector: null, score: null, iv: null, hv: null, rho: null, earnings: false, liq: null, beta: null, ...extra };
}

async function fmpJson(url) {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const j = await r.json();
    return Array.isArray(j) && j.length ? j : null;
  } catch { return null; }
}

export default async (req, context) => {
  const key = process.env.FMP_API_KEY;
  const symbol = ((context?.params?.symbol) || new URL(req.url).searchParams.get('symbol') || '').toUpperCase();
  const cfg = INDEX[symbol];
  if (!cfg) return Response.json({ error: 'unknown_symbol' }, { status: 404 });

  let out = null;

  if (key) {
    // 1) Holdings d'ETF (poids réels) — souvent plan payant
    if (cfg.etf) {
      const rows = await fmpJson(`${V3}/etf-holder/${cfg.etf}?apikey=${key}`)
        || await fmpJson(`${STABLE}/etf/holdings?symbol=${cfg.etf}&apikey=${key}`);
      if (rows) {
        out = rows.filter(h => h.asset || h.symbol).map(h => blank({
          ticker: h.asset || h.symbol,
          name: h.name || h.asset || h.symbol,
          weight: (h.weightPercentage ?? h.weight) != null ? Number(Number(h.weightPercentage ?? h.weight).toFixed(2)) : null,
        }));
      }
    }
    // 2) Constituents (gratuit) — stable puis v3
    if (!out) {
      const urls = [];
      if (cfg.stable) urls.push(`${STABLE}/${cfg.stable}?apikey=${key}`);
      if (cfg.v3) urls.push(`${V3}/${cfg.v3}?apikey=${key}`);
      for (const url of urls) {
        const rows = await fmpJson(url);
        if (rows) {
          out = rows.filter(c => c.symbol).map(c => blank({ ticker: c.symbol, name: c.name || c.symbol, sector: c.sector || null, weight: null }));
          break;
        }
      }
    }
  }

  // 3) Repli statique intégré — toujours disponible
  if (!out && STATIC[symbol]) {
    out = STATIC[symbol].map(([ticker, name, sector]) => blank({ ticker, name, sector, weight: null }));
  }

  if (!out || !out.length) return Response.json({ error: 'fmp_unavailable' }, { status: 502 });

  out.sort((a, b) => (b.weight || 0) - (a.weight || 0));
  return Response.json(out.slice(0, MAX), { status: 200 });
};
