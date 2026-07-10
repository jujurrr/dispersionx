// GET /api/fx → { base:'USD', usd_eur:<number>, asof:<date>, source }
// Taux de change EUR pour 1 USD, pour l'AFFICHAGE des montants (conversion pure
// côté client, jamais stockée). Sources GRATUITES et redistribuables : BCE via
// Frankfurter (primaire), open.er-api.com (repli). Aucune clé requise.
export const config = { runtime: 'edge' };

// ⚙️ FRÉQUENCE DE RAFRAÎCHISSEMENT — LE seul réglage à changer. Les sources
// gratuites n'actualisent PAS à la seconde (BCE = quotidien). 300 s (5 min) est un
// bon compromis fraîcheur / limites d'API, et cohérent avec des données de marché
// différées. Baisser ce nombre ne rend pas le taux plus « frais » que ce que la
// source publie ; le vrai temps réel FX est un flux PAYANT (licence). Pour de
// l'intraday, brancher une source à clé ci-dessous (une fonction en plus).
const TTL_S = 300;

async function fromFrankfurter(timeoutMs) {
  const r = await fetch('https://api.frankfurter.app/latest?from=USD&to=EUR', { signal: AbortSignal.timeout(timeoutMs) });
  if (!r.ok) return null;
  const d = await r.json();
  const v = d && d.rates && Number(d.rates.EUR);
  return v > 0 ? { usd_eur: v, asof: d.date || null, source: 'ecb/frankfurter' } : null;
}

async function fromErApi(timeoutMs) {
  const r = await fetch('https://open.er-api.com/v6/latest/USD', { signal: AbortSignal.timeout(timeoutMs) });
  if (!r.ok) return null;
  const d = await r.json();
  const v = d && d.rates && Number(d.rates.EUR);
  return v > 0 ? { usd_eur: v, asof: d.time_last_update_utc || null, source: 'open.er-api' } : null;
}

export default async () => {
  let out = null;
  try { out = await fromFrankfurter(4000); } catch { /* repli */ }
  if (!out) { try { out = await fromErApi(4000); } catch { /* indisponible */ } }
  // Fail-safe côté client : sans taux, l'app force l'USD (jamais un chiffre faux).
  if (!out) return Response.json({ error: 'fx_unavailable' }, { status: 502 });
  return Response.json({ base: 'USD', ...out }, {
    headers: {
      'Cache-Control': `public, s-maxage=${TTL_S}, stale-while-revalidate=86400`,
      'Netlify-CDN-Cache-Control': `public, s-maxage=${TTL_S}, stale-while-revalidate=86400`,
    },
  });
};
