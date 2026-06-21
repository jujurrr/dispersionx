// Netlify Function: /api/health
// Vérifie que les clés Alpaca sont présentes et valides en appelant le endpoint clock.
// Renvoie 200 {status:'ok', market_open} si tout va bien, 503 sinon (le frontend
// bascule alors en "Mode démo" via son repli mock).

const TRADING_BASE = process.env.ALPACA_TRADING_BASE || 'https://paper-api.alpaca.markets';

export default async () => {
  const key = process.env.ALPACA_API_KEY_ID;
  const secret = process.env.ALPACA_API_SECRET_KEY;
  if (!key || !secret) {
    return Response.json({ status: 'no_keys', detail: 'Variables ALPACA_API_KEY_ID / ALPACA_API_SECRET_KEY absentes.' }, { status: 503 });
  }
  try {
    const r = await fetch(`${TRADING_BASE}/v2/clock`, {
      headers: { 'APCA-API-KEY-ID': key, 'APCA-API-SECRET-KEY': secret },
    });
    if (!r.ok) {
      return Response.json({ status: 'error', http: r.status }, { status: 503 });
    }
    const clock = await r.json();
    return Response.json({ status: 'ok', market_open: !!clock.is_open, ts: clock.timestamp });
  } catch (e) {
    return Response.json({ status: 'error', detail: String(e) }, { status: 503 });
  }
};
