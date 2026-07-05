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
export default defineConfig({
  root: '.',
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
