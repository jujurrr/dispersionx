// Netlify Function: GET /api/iv-status — ré-export du handler Vercel
// (diagnostic de l'historique d'IV → montée en charge du vrai IV Rank).
export { default } from '../../api/iv-status.js';
export const config = { path: '/api/iv-status' };
