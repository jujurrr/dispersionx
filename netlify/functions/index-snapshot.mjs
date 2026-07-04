// Netlify Function: GET /api/indices/:symbol/snapshot — ré-export du handler Vercel
// (source unique : api/indices/[symbol]/snapshot.js — IV réelle Cboe, barres Alpaca/Yahoo)
export { default } from '../../api/indices/[symbol]/snapshot.js';
export const config = { path: '/api/indices/:symbol/snapshot' };
