// Netlify Function: POST /api/risk/portfolio — ré-export du handler Vercel
// (source unique : api/risk/portfolio.js — IV réelles Cboe via /api/iv)
export { default } from '../../api/risk/portfolio.js';
export const config = { path: '/api/risk/portfolio' };
