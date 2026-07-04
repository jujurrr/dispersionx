// Netlify Function: POST /api/vol/ticker — ré-export du handler Vercel
// (source unique : api/vol/ticker.js — IV réelles Cboe, HV clôtures Cboe/Yahoo)
export { default } from '../../api/vol/ticker.js';
export const config = { path: '/api/vol/ticker' };
