import { defineConfig } from 'vite';

// ── Build Vite EN PARALLÈLE de l'index.html de production ────────────────────
// L'app actuelle utilise React/ReactDOM en globals (window.React) et du JSX
// « classique » (React.createElement). On garde EXACTEMENT ce modèle : esbuild
// transforme le JSX en React.createElement (sans runtime automatique), et
// src/globals-setup.js pose window.React avant tout le reste.
//
// La production continue de servir index.html (Babel navigateur) tant que le
// bundle Vite n'a pas été validé dans un vrai navigateur (`npm run vite`).
// Le basculement se fait ensuite en une étape (voir README).
// Cible du proxy /api en dev : ton backend EN LIGNE (Vercel), pour voir les
// VRAIES données en local. Remplace l'URL ci-dessous par celle de ton site,
// ou définis la variable d'environnement DX_API_TARGET.
const API_TARGET = process.env.DX_API_TARGET || 'https://dispersionx.vercel.app';

export default defineConfig({
  root: '.',
  server: {
    // Ouvre automatiquement la BONNE page (vite-index.html) — sinon « / »
    // servirait l'ancien index.html (production).
    open: '/vite-index.html',
    // Les appels /api du site local sont renvoyés vers le vrai backend en ligne.
    // secure:false → ne vérifie pas le certificat TLS de la cible : nécessaire
    // sur ce poste (interception TLS d'entreprise), sans risque car ce proxy
    // DEV pointe vers ton propre backend. La prod n'est pas concernée.
    proxy: {
      '/api': { target: API_TARGET, changeOrigin: true, secure: false },
    },
  },
  esbuild: {
    jsx: 'transform',
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: { input: 'vite-index.html' },
  },
});
