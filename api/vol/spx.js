// GET /api/vol/spx
// IV ATM + HV + structure par terme du SPX (via SPY)
// Sources: MarketData.app (IV/term), Yahoo Finance (HV)
export const config = { runtime: 'edge' };

const DTES = [14, 21, 30, 45, 60, 90];

async function fetchHV(symbol, days) {
  const r = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=6mo`,
    { headers: { 'User-Agent': 'Mozilla/5.0' } }
  );
  if (!r.ok) return null;
  const closes = (await r.json())?.chart?.result?.[0]?.indicators?.quote?.[0]?.close?.filter(c => c != null) || [];
  if (closes.length < days + 1) return null;
  const slice = closes.slice(-(days + 1));
  const rets  = slice.map((c, i, a) => i === 0 ? null : Math.log(c / a[i - 1])).filter(Boolean);
  const m = rets.reduce((a, b) => a + b, 0) / rets.length;
  const v = rets.reduce((a, b) => a + (b - m) ** 2, 0) / (rets.length - 1);
  return Number((Math.sqrt(v * 252) * 100).toFixed(1));
}

async function fetchAtmIV(symbol, dte, token) {
  const r = await fetch(
    `https://api.marketdata.app/v1/options/chain/${symbol}/?dte=${dte}&side=call&strikeLimit=7`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!r.ok) return null;
  const d = await r.json();
  if (d.s !== 'ok' || !Array.isArray(d.iv) || !d.iv.length) return null;
  // Prendre l'IV mid (strike central = ATM)
  const up   = (d.underlyingPrice || [])[0] || 0;
  let best = Math.floor(d.iv.length / 2), bestDiff = Infinity;
  (d.strike || []).forEach((s, i) => { const diff = Math.abs(s - up); if (diff < bestDiff) { bestDiff = diff; best = i; } });
  return d.iv[best] != null ? Number((d.iv[best] * 100).toFixed(1)) : null;
}

export default async (req) => {
  const mdTok = process.env.MARKETDATA_API_TOKEN;

  // HV30 et HV252 depuis Yahoo Finance en parallèle
  const [hv30, hv252] = await Promise.all([fetchHV('SPY', 30), fetchHV('SPY', 252)]);

  let term = null, ivAtm = null;

  if (mdTok) {
    // Structure par terme : un appel par DTE en parallèle
    const termResults = await Promise.allSettled(DTES.map(dte => fetchAtmIV('SPY', dte, mdTok)));
    const built = DTES.map((dte, i) => ({
      dte,
      iv: termResults[i].status === 'fulfilled' ? termResults[i].value : null,
    })).filter(p => p.iv != null);

    if (built.length >= 2) {
      term   = built;
      ivAtm  = built.find(p => p.dte === 30)?.iv ?? built[Math.floor(built.length / 2)].iv;
    }
  }

  // Fallback IV ATM : HV × 1.12
  if (!ivAtm && hv30) ivAtm = Number((hv30 * 1.12).toFixed(1));

  const ivMhv = ivAtm && hv30 ? Number((ivAtm - hv30).toFixed(1)) : null;

  return Response.json({
    iv_atm: ivAtm,
    hv30,
    hv252,
    iv_minus_hv: ivMhv,
    term,
    source: mdTok ? 'marketdata+yahoo' : 'yahoo_hv',
  });
};
