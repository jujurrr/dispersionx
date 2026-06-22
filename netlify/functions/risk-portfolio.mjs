// Netlify Function: POST /api/risk/portfolio
// Body: { tickers: string[], index: string, duration?: number }
// Greeks ATM straddle + scénarios + beta calculé depuis les barres Yahoo Finance
export const config = { path: '/api/risk/portfolio' };

const R = 0.043;

function normPDF(x) { return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI); }
function normCDF(x) {
  const s = x < 0 ? -1 : 1, a = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * a);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a);
  return 0.5 * (1 + s * y);
}

function bsAtm(S, sigma, T) {
  if (T <= 0 || sigma <= 0 || S <= 0) return null;
  const sqrtT = Math.sqrt(T);
  const d1 = (R * sqrtT / sigma) + sigma * sqrtT / 2;
  const nd1 = normPDF(d1);
  return {
    premium: 2 * S * (normCDF(d1) - 0.5) + S * sigma * sqrtT * nd1 * 0.5,
    gamma:   2 * nd1 / (S * sigma * sqrtT),
    vega:    2 * S * nd1 * sqrtT / 100,
    theta: -(S * sigma * nd1) / (2 * sqrtT * 365),
  };
}

// Un seul fetch Yahoo Finance par ticker : prix + HV30 + log returns pour beta
async function fetchBarsData(sym) {
  try {
    const r = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=3mo`,
      { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(8000) }
    );
    if (!r.ok) return null;
    const closes = (await r.json())?.chart?.result?.[0]?.indicators?.quote?.[0]?.close || [];
    const valid  = closes.filter(c => c != null && isFinite(c));
    if (valid.length < 6) return null;

    const lastClose = valid[valid.length - 1];

    // Log returns sur les 31 derniers jours
    const slice = valid.slice(-32);
    const rets  = [];
    for (let i = 1; i < slice.length; i++) {
      if (slice[i] > 0 && slice[i - 1] > 0) rets.push(Math.log(slice[i] / slice[i - 1]));
    }
    if (rets.length < 5) return { lastClose, hv30: null, rets: [] };

    const m  = rets.reduce((a, b) => a + b, 0) / rets.length;
    const vv = rets.reduce((a, b) => a + (b - m) ** 2, 0) / (rets.length - 1);
    const hv30 = Number((Math.sqrt(vv * 252) * 100).toFixed(1));

    return { lastClose, hv30, rets };
  } catch { return null; }
}

// Beta = cov(stock, index) / var(index) sur le chevauchement des log returns
function computeBeta(stockRets, idxRets) {
  const n = Math.min(stockRets.length, idxRets.length);
  if (n < 5) return null;
  const sx = stockRets.slice(-n), sy = idxRets.slice(-n);
  const mx = sx.reduce((a, b) => a + b, 0) / n;
  const my = sy.reduce((a, b) => a + b, 0) / n;
  let cov = 0, vy = 0;
  for (let i = 0; i < n; i++) { cov += (sx[i] - mx) * (sy[i] - my); vy += (sy[i] - my) ** 2; }
  return vy > 0 ? Number((cov / vy).toFixed(2)) : null;
}

async function fetchIVFromMD(sym, dte, token) {
  if (!token) return null;
  try {
    const r = await fetch(
      `https://api.marketdata.app/v1/options/chain/${sym}/?dte=${dte}&side=call&strikeLimit=10`,
      { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000) }
    );
    if (!r.ok) return null;
    const d = await r.json();
    if (d.s !== 'ok' || !Array.isArray(d.iv) || !d.iv.length) return null;
    const up = (d.underlyingPrice || [])[0] || 0;
    let best = 0, bestDiff = Infinity;
    (d.strike || []).forEach((s, i) => { const diff = Math.abs(s - up); if (diff < bestDiff) { bestDiff = diff; best = i; } });
    const ivVal = d.iv[best];
    return ivVal != null && isFinite(ivVal) ? Number((ivVal * 100).toFixed(1)) : null;
  } catch { return null; }
}

export default async (req) => {
  let body = {};
  try { body = await req.json(); } catch {}

  const tickers  = (body.tickers || []).map(s => String(s).toUpperCase().trim()).filter(Boolean).slice(0, 15);
  const indexSym = (body.index || 'SPX').toUpperCase();
  const duration = Math.max(7, Math.min(Number(body.duration) || 30, 120));
  if (tickers.length === 0) return Response.json({ error: 'no_tickers' }, { status: 400 });

  const ETF   = { SPX: 'SPY', NDX: 'QQQ', DJI: 'DIA', CAC: 'EWQ', DAX: 'EWG' };
  const idxEtf = ETF[indexSym] || indexSym;
  const mdTok  = process.env.MARKETDATA_API_TOKEN;
  const T = duration / 365;

  // Fetch barres pour l'indice (référence beta) + tous les tickers + IV MarketData
  const [idxData, ...tickerResults] = await Promise.all([
    fetchBarsData(idxEtf),
    ...tickers.flatMap(t => [fetchBarsData(t), fetchIVFromMD(t, duration, mdTok)]),
  ]);

  const idxRets  = idxData?.rets || null;
  const idxClose = idxData?.lastClose || null;
  const idxHV    = idxData?.hv30 || null;

  const perTicker = tickers.map((t, i) => {
    const bars = tickerResults[i * 2];
    const ivMD = tickerResults[i * 2 + 1];

    if (!bars) return { ticker: t, price: null, hv: null, iv: null, beta: null, ivSrc: null };

    const price = bars.lastClose;
    const hv    = bars.hv30;
    const iv    = ivMD ?? (hv ? Number((hv * 1.15).toFixed(1)) : null);
    const beta  = bars.rets && idxRets ? computeBeta(bars.rets, idxRets) : null;

    return { ticker: t, price, hv, iv, beta, ivSrc: ivMD ? 'marketdata' : (hv ? 'hv_estimate' : null) };
  }).filter(r => r.price && r.iv);

  const idxIV   = await fetchIVFromMD(idxEtf, duration, mdTok);
  const idxIVfn = idxIV ?? (idxHV ? Number((idxHV * 1.1).toFixed(1)) : null);

  if (perTicker.length === 0) return Response.json({ error: 'no_price_data' }, { status: 502 });

  const nW = perTicker.length;
  const CONTRACT = 100;
  let portGamma = 0, portVega = 0, portTheta = 0, portPremium = 0;

  const perTickerResult = perTicker.map(r => {
    const g = bsAtm(r.price, r.iv / 100, T);
    if (!g) return { ...r, greeks: null };
    const w = 1 / nW;
    portGamma   += g.gamma   * CONTRACT * w;
    portVega    += g.vega    * CONTRACT * w;
    portTheta   += g.theta   * CONTRACT * w;
    portPremium += g.premium * CONTRACT * w;
    return { ...r, greeks: { gamma: Number(g.gamma.toFixed(5)), vega: Number(g.vega.toFixed(3)), theta: Number(g.theta.toFixed(3)), premium: Number(g.premium.toFixed(2)) } };
  });

  const idxG     = idxIVfn && idxClose ? bsAtm(idxClose, idxIVfn / 100, T) : null;
  const idxVega  = idxG ? -(idxG.vega   * CONTRACT) : 0;
  const idxTheta = idxG ? -(idxG.theta  * CONTRACT) : 0;
  const idxPrem  = idxG ?  (idxG.premium * CONTRACT) : 0;

  const netVega    = Number((portVega   + idxVega).toFixed(2));
  const netTheta   = Number((portTheta  + idxTheta).toFixed(2));
  const netPremium = Number((portPremium - idxPrem).toFixed(2));
  const avgIV      = Number((perTicker.reduce((s, r) => s + (r.iv || 0), 0) / perTicker.length).toFixed(1));
  const baseScale  = Math.max(200, Math.abs(netPremium) * 4);

  const fmt = (n) => {
    const abs = Math.abs(Math.round(n));
    const s   = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return (n >= 0 ? '+' : '−') + s;
  };

  const scenarios = [
    { name: 'Dispersion forte',  pnl: fmt(baseScale * 2.1),   up: true,  risk: 'faible'   },
    { name: 'Sell-off corrélé',  pnl: fmt(-baseScale * 2.6),  up: false, risk: 'critique' },
    { name: 'Marché range',      pnl: fmt(Math.abs(netTheta) * duration * 0.55), up: true, risk: 'faible' },
    { name: 'Vol crush (−20%)',  pnl: fmt(netVega * -20),     up: netVega * -20 > 0, risk: 'modéré' },
    { name: 'Gap directionnel',  pnl: fmt(-baseScale * 0.85), up: false, risk: 'élevé'   },
    { name: 'Theta decay (7j)',  pnl: fmt(Math.abs(netTheta) * 7), up: true, risk: 'faible' },
  ];

  return Response.json({
    greeks: [
      { label: 'Δ net',     value: '≈ 0',                hint: 'ATM straddles delta-neutre', accent: 'var(--pos)' },
      { label: 'Γ net',     value: (portGamma >= 0 ? '+' : '') + portGamma.toFixed(4), hint: portGamma > 0 ? 'Long gamma' : 'Short gamma', accent: 'var(--accent)' },
      { label: 'Vega net',  value: fmt(netVega) + ' $',   hint: netVega > 0 ? 'Long vega' : 'Court vega', accent: 'var(--pos)' },
      { label: 'Θ /jour',   value: fmt(netTheta) + ' $',  hint: netTheta > 0 ? 'Gain quotidien' : 'Coût quotidien', accent: 'var(--warn)' },
      { label: 'IV moy.',   value: avgIV + '%',            hint: `Composants (${idxIVfn ? idxIVfn.toFixed(1) + '% ' + indexSym : 'index N/D'})`, accent: 'var(--info)' },
      { label: 'Prime net', value: fmt(netPremium) + ' $', hint: netPremium < 0 ? 'Débit net' : 'Crédit net', accent: 'var(--accent)' },
    ],
    scenarios,
    pnlByName:   perTickerResult.map(r => ({ t: r.ticker, pnl: r.greeks ? Math.round(r.greeks.vega * 15 * CONTRACT * 0.5) : 0 })),
    pnlBySector: [{ s: 'Composants', pnl: Math.round(portVega * 15) }, { s: indexSym, pnl: Math.round(idxVega * -15) }],
    portfolio:   { n_tickers: perTicker.length, avg_iv: avgIV, index_iv: idxIVfn ?? null, net_vega: netVega, net_theta: netTheta, net_premium: netPremium, duration },
    per_ticker:  perTickerResult.map(r => ({
      ticker: r.ticker,
      price:  r.price,
      iv:     r.iv,
      hv:     r.hv,
      beta:   r.beta,
      iv_src: r.ivSrc,
      greeks: r.greeks,
    })),
    source: mdTok ? 'marketdata+yahoo' : 'yahoo_hv_estimate',
  });
};
