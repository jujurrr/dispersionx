// Netlify Function: GET /api/iv/:symbol — ré-export du handler Vercel
// (même signature Request → Response ; source unique dans api/iv/[symbol].js)
export { default } from '../../api/iv/[symbol].js';
export const config = { path: '/api/iv/:symbol' };
