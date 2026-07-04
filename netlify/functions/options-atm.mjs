// Netlify Function: GET /api/options/atm — ré-export du handler Vercel
// (source unique : api/options/atm.js — IV + grecs réels Cboe, repli MarketData)
export { default } from '../../api/options/atm.js';
export const config = { path: '/api/options/atm' };
