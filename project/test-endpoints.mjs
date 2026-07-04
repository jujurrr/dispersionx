// Harnais de test local des endpoints API (node --use-system-ca project/test-endpoints.mjs)
// Monte /api/iv/:symbol sur un serveur local pour que les endpoints batch
// puissent s'auto-appeler comme en production, puis exerce chaque handler.
import http from 'node:http';

import ivHandler from '../api/iv/[symbol].js';
import volSpx from '../api/vol/spx.js';
import volTicker from '../api/vol/ticker.js';
import optionsAtm from '../api/options/atm.js';
import autoScore from '../api/stocks/auto-score.js';
import riskPortfolio from '../api/risk/portfolio.js';
import snapshot from '../api/indices/[symbol]/snapshot.js';

const server = http.createServer(async (nreq, nres) => {
  try {
    const resp = await ivHandler(new Request(`http://127.0.0.1:${PORT}${nreq.url}`));
    nres.writeHead(resp.status, { 'content-type': 'application/json' });
    nres.end(await resp.text());
  } catch (e) {
    nres.writeHead(500); nres.end(JSON.stringify({ error: String(e) }));
  }
});
const PORT = await new Promise(res => server.listen(0, '127.0.0.1', () => res(server.address().port)));
const BASE = `http://127.0.0.1:${PORT}`;

const show = (label, obj) => console.log(`\n═══ ${label} ═══\n` + JSON.stringify(obj, null, 1).slice(0, 1400));
const json = async (p) => { try { return await p.then(r => r.json()); } catch (e) { return { EXCEPTION: String(e) }; } };

// 1. /api/iv/AAPL
show('GET /api/iv/AAPL?dte=30', await json(ivHandler(new Request(`${BASE}/api/iv/AAPL?dte=30`))));

// 2. /api/vol/spx
show('GET /api/vol/spx', await json(volSpx(new Request(`${BASE}/api/vol/spx`))));

// 3. /api/vol/ticker — détail
show('POST /api/vol/ticker (détail NVDA)', await json(volTicker(new Request(`${BASE}/api/vol/ticker`, {
  method: 'POST', body: JSON.stringify({ ticker: 'NVDA', index: 'SPX' }),
}))));

// 4. /api/vol/ticker — batch
show('POST /api/vol/ticker (batch)', await json(volTicker(new Request(`${BASE}/api/vol/ticker`, {
  method: 'POST', body: JSON.stringify({ tickers: ['AAPL', 'MSFT', 'JPM'], index: 'SPX' }),
}))));

// 5. /api/options/atm
show('GET /api/options/atm?symbol=MSFT&dte=45', await json(optionsAtm(new Request(`${BASE}/api/options/atm?symbol=MSFT&dte=45`))));

// 6. /api/stocks/auto-score
const score = await json(autoScore(new Request(`${BASE}/api/stocks/auto-score`, {
  method: 'POST', body: JSON.stringify({ index_symbol: 'SPX', stock_symbol: 'AAPL', duration_days: 30 }),
})));
show('POST /api/stocks/auto-score (AAPL/SPX)', {
  score: score?.scoring?.score, iv: score?.stock?.iv, hv: score?.stock?.hv,
  iv_source: score?.stock?.iv_source, index_iv: score?.index?.iv, index_iv_source: score?.index?.iv_source,
  greeks: score?.stock?.greeks, source: score?.metadata?.source,
});

// 7. /api/risk/portfolio
const risk = await json(riskPortfolio(new Request(`${BASE}/api/risk/portfolio`, {
  method: 'POST', body: JSON.stringify({ tickers: ['AAPL', 'MSFT'], index: 'SPX', duration: 30 }),
})));
show('POST /api/risk/portfolio', { per_ticker: risk?.per_ticker, portfolio: risk?.portfolio, source: risk?.source });

// 8. /api/indices/SPX/snapshot
show('GET /api/indices/SPX/snapshot', await json(snapshot(new Request(`${BASE}/api/indices/SPX/snapshot`))));

server.close();
