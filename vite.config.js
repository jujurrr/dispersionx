import { defineConfig } from 'vite';

// ── Build de production (Vite) ───────────────────────────────────────────────
// L'app utilise React/ReactDOM en globals (window.React) et du JSX « classique »
// (React.createElement). On garde EXACTEMENT ce modèle : esbuild transforme le
// JSX en React.createElement (sans runtime automatique), et src/globals-setup.js
// pose window.React avant tout le reste.
//
// index.html (entrée Vite) → dist/ avec des noms de fichiers À EMPREINTE
// (app-a1b2c3.js) : un changement de code = un nouveau nom = plus jamais de
// cache périmé. L'ancienne version CDN/Babel est conservée dans index.legacy.html.
//
// Dev (`npm run vite`) : le proxy renvoie /api vers le backend en ligne pour voir
// les vraies données en local.
const API_TARGET = process.env.DX_API_TARGET || 'https://dispersionx.vercel.app';

export default defineConfig({
  root: '.',
  server: {
    open: '/',
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
    rollupOptions: { input: 'index.html' },
  },
});
