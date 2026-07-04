// Netlify Function: POST /api/stocks/auto-score — ré-export du handler Vercel
// (source unique : api/stocks/auto-score.js — IV réelles Cboe via /api/iv)
export { default } from '../../api/stocks/auto-score.js';
export const config = { path: '/api/stocks/auto-score' };
