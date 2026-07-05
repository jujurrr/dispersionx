// Test de fumée : bundle l'app (IIFE) et vérifie dans jsdom que React monte
// bien (le <div id="root"> se peuple). Valide l'ordre des globals sans navigateur.
import esbuild from 'esbuild';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

const result = await esbuild.build({
  entryPoints: ['src/main.jsx'],
  bundle: true,
  format: 'iife',
  jsx: 'transform',
  jsxFactory: 'React.createElement',
  jsxFragment: 'React.Fragment',
  loader: { '.css': 'empty' },   // styles non nécessaires pour tester le montage
  write: false,
  logLevel: 'silent',
});
const code = result.outputFiles[0].text;

const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>', {
  runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/',
});
const { window } = dom;
// Combler quelques API absentes de jsdom (non liées au montage).
window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
window.fetch = window.fetch || (() => Promise.reject(new Error('no-fetch-in-smoke')));
window.requestAnimationFrame = window.requestAnimationFrame || ((cb) => setTimeout(() => cb(Date.now()), 0));
window.cancelAnimationFrame = window.cancelAnimationFrame || clearTimeout;
window.scrollTo = window.scrollTo || (() => {});

try {
  new vm.Script(code).runInContext(dom.getInternalVMContext());
} catch (e) {
  console.error('SMOKE FAIL — exception au chargement du bundle :', e.message);
  process.exit(1);
}

await new Promise(r => setTimeout(r, 300));   // laisse React monter

const root = window.document.getElementById('root');
if (root && root.childNodes.length > 0) {
  console.log(`SMOKE OK — #root peuplé (${root.childNodes.length} nœud(s), ${root.innerHTML.length} caractères de HTML rendu).`);
  process.exit(0);   // l'app garde des timers actifs (setInterval) → sortie explicite
} else {
  console.error('SMOKE FAIL — #root est resté vide (React n’a pas monté).');
  process.exit(1);
}
