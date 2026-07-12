// Netlify Function: POST /api/correlation/implied — ré-export du handler Vercel
// (source unique : api/correlation/implied.js — corrélation implicite CBOE).
export { default } from '../../api/correlation/implied.js';
export const config = { path: '/api/correlation/implied' };
