// Netlify Function: GET /api/vol/spx — ré-export du handler Vercel
// (source unique : api/vol/spx.js — IV réelle Cboe + HV du vrai _SPX)
export { default } from '../../api/vol/spx.js';
export const config = { path: '/api/vol/spx' };
