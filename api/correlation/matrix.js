// POST /api/correlation/matrix
// Body: { tickers: string[], index: string, days?: number }
// Calcule la matrice de corrélation réalisée depuis Yahoo Finance + ρ implicite via VIX
export const config = { runtime: 'edge' };

async function fetchCloses(symbol, days) {
  const range = days <= 35 ? '2mo' : days <= 90 ? '4mo' : '6mo';
  const r = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=${range}`,
    { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(8000) }
  );
  if (!r.ok) return null;
  const closes = (await r.json())?.chart?.result?.[0]?.indicators?.quote?.[0]?.close || [];
  return closes.filter(c => c != null && isFinite(c) && c > 0);
}

function logReturns(closes) {
  const r = [];
  for (let i = 1; i < closes.length; i++) r.push(Math.log(closes[i] / closes[i - 1]));
  return r;
}

function pearson(x, y) {
  const n = Math.min(x.length, y.length);
  if (n < 5) return null;
  const xi = x.slice(-n), yi = y.slice(-n);
  const mx = xi.reduce((a, b) => a + b, 0) / n;
  const my = yi.reduce((a, b) => a + b, 0) / n;
  let cov = 0, vx = 0, vy = 0;
  for (let i = 0; i < n; i++) {
    cov += (xi[i] - mx) * (yi[i] - my);
    vx  += (xi[i] - mx) ** 2;
    vy  += (yi[i] - my) ** 2;
  }
  return vx > 0 && vy > 0 ? cov / Math.sqrt(vx * vy) : 0;
}

// Volatilité historique annualisée (décimal, ex: 0.25 = 25%)
function computeHV(rets, window = 30) {
  if (!rets || rets.length < 5) return null;
  const slice = rets.slice(-Math.min(window, rets.length));
  const m = slice.reduce((a, b) => a + b, 0) / slice.length;
  const v = slice.reduce((a, b) => a + (b - m) ** 2, 0) / (slice.length - 1);
  return Math.sqrt(v * 252);
}

// ρ_impl = (σ_indice_impl / σ̄_composants_impl)²
// Formule fondamentale : corrélation implicite = ratio des volatilités au carré.
// σ_indice_impl = VIX/100 (données options réelles) ou HV_indice × 1.30 (proxy)
// σ̄_comp_impl  = moyenne HV composants × 1.08
function computeRhoImpl(sigmaIdxImpl, avgHvComp) {
  if (!sigmaIdxImpl || !avgHvComp || avgHvComp <= 0) return null;
  const sigmaCompImpl = avgHvComp * 1.08;
  return Math.min(0.95, Math.max(0.05, (sigmaIdxImpl / sigmaCompImpl) ** 2));
}

export default async (req) => {
  let body = {};
  try { body = await req.json(); } catch {}

  const tickers  = (body.tickers || []).map(s => String(s).toUpperCase()).slice(0, 20);
  const indexSym = (body.index || 'SPX').toUpperCase();
  const days     = Math.min(Number(body.days) || 60, 120);
  if (tickers.length < 2) return Response.json({ error: 'need_2_tickers' }, { status: 400 });

  const ETF = { SPX: 'SPY', NDX: 'QQQ', DJI: 'DIA', CAC: 'EWQ', DAX: 'EWG' };
  const idxEtf = ETF[indexSym] || indexSym;

  // Indice de vol implicite (VIX / VXN)
  const VOL_TICKER = { SPX: '^VIX', NDX: '^VXN', DJI: '^VIX' };
  const vixSym = VOL_TICKER[indexSym] || null;

  const priceSyms = [...tickers, idxEtf];
  const fetchSyms = vixSym ? [...priceSyms, vixSym] : priceSyms;
  const fetched   = await Promise.allSettled(fetchSyms.map(s => fetchCloses(s, days)));

  const closesRaw = {};
  const rets = {};
  fetchSyms.forEach((s, i) => {
    const closes = fetched[i].status === 'fulfilled' ? fetched[i].value : null;
    closesRaw[s] = closes || [];
    if (s !== vixSym) {
      rets[s] = closes && closes.length >= 10 ? logReturns(closes) : null;
    }
  });

  // Closes VIX brutes (valeur = % vol annualisé directement, ex: 17.5 = 17.5%)
  const vixCloses = vixSym ? closesRaw[vixSym] : null;
  const lastVix   = vixCloses && vixCloses.length > 0 ? vixCloses[vixCloses.length - 1] / 100 : null;

  const valid = tickers.filter(t => rets[t]);
  if (valid.length < 2) return Response.json({ error: 'no_price_data' }, { status: 502 });

  // ── Matrice Pearson N×N ───────────────────────────────────────────
  const n = valid.length;
  const matrix = valid.map((ti, i) =>
    valid.map((tj, j) => {
      if (i === j) return 1;
      const c = pearson(rets[ti], rets[tj]);
      return c !== null ? Number(c.toFixed(3)) : 0;
    })
  );

  let rhoSum = 0, rhoCount = 0;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { rhoSum += matrix[i][j]; rhoCount++; }
  const rhoReal = rhoCount > 0 ? rhoSum / rhoCount : 0;

  // ── ρ implicite via formule de dispersion ─────────────────────────
  const hvIdx = rets[idxEtf] ? computeHV(rets[idxEtf]) : null;
  const sigmaIdxImpl = lastVix ?? (hvIdx ? hvIdx * 1.30 : null);

  const hvComps = valid.map(t => computeHV(rets[t])).filter(v => v != null);
  const avgHvComp = hvComps.length > 0 ? hvComps.reduce((a, b) => a + b, 0) / hvComps.length : null;

  const rhoImpl = computeRhoImpl(sigmaIdxImpl, avgHvComp)
    ?? Math.min(0.92, rhoReal + 0.08);

  // ── Historique rolling : 8 fenêtres de ~12j ──────────────────────
  const minLen = Math.min(...valid.map(t => rets[t].length));
  const history = Array.from({ length: 8 }, (_, w) => {
    const wIdx  = 7 - w;
    const end   = Math.max(10, minLen - wIdx * 5);
    const start = Math.max(0, end - 12);
    const label = wIdx === 0 ? 'Auj.' : `J-${wIdx * 5}`;

    if (end - start < 4) return { d: label, real: Number(rhoReal.toFixed(3)), impl: Number(rhoImpl.toFixed(3)) };

    let wSum = 0, wCnt = 0;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const c = pearson(rets[valid[i]].slice(start, end), rets[valid[j]].slice(start, end));
      if (c !== null) { wSum += c; wCnt++; }
    }
    const wRho = wCnt > 0 ? wSum / wCnt : rhoReal;

    const wVixSlice = vixCloses && vixCloses.length > end ? vixCloses.slice(start, end) : null;
    const wVixAvg   = wVixSlice && wVixSlice.length > 0
      ? wVixSlice.reduce((a, b) => a + b, 0) / wVixSlice.length / 100
      : null;
    const wHvIdx    = rets[idxEtf] ? computeHV(rets[idxEtf].slice(start, end), end - start) : null;
    const wSigmaIdx = wVixAvg ?? (wHvIdx ? wHvIdx * 1.30 : null);

    const wHvComps   = valid.map(t => computeHV(rets[t].slice(start, end), end - start)).filter(v => v != null);
    const wAvgHvComp = wHvComps.length > 0 ? wHvComps.reduce((a, b) => a + b, 0) / wHvComps.length : null;

    const wRhoImpl = computeRhoImpl(wSigmaIdx, wAvgHvComp) ?? Number(Math.min(0.92, wRho + 0.06).toFixed(3));

    return { d: label, real: Number(wRho.toFixed(3)), impl: Number(wRhoImpl.toFixed(3)) };
  });

  const prime = (rhoImpl - rhoReal) * 100;

  return Response.json({
    matrixTickers: valid,
    matrix,
    rho_real:   Number(rhoReal.toFixed(3)),
    rho_impl:   Number(rhoImpl.toFixed(3)),
    history,
    delta:      `${prime >= 0 ? '+' : ''}${prime.toFixed(1)} pts`,
    days,
    n_tickers:  valid.length,
    source:     lastVix ? 'vix+yahoo' : 'yahoo',
    vix_level:  lastVix ? Number((lastVix * 100).toFixed(2)) : null,
    skipped:    tickers.filter(t => !valid.includes(t)),
  });
};
