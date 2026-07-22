// Ancre de corrélation implicite du scoring.
//
// Le score V2 vaut porte × qualité, la porte étant une sigmoïde de
// (ρ_implicite − ρ_réalisée). Faute de vraie ρ_implicite, le scoring retombe sur
// une constante de 0,65 — et le code d'origine ne tentait le calcul QU'UNE FOIS
// par session. Un seul échec réseau figeait donc l'indice sur ce repli, avec un
// effet brutal : la même action score ~65 sur l'indice retombé au repli et ~0 sur
// celui qui a la vraie ancre, selon quel appel a abouti. D'où des scores
// incomparables entre indices ET changeants d'une session à l'autre.
//
// Ces tests font tourner le VRAI scoring (chargement + scoreIndex), avec une
// séquence d'ancre contrôlée.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Panier d'indice de taille RÉALISTE. La taille n'est pas décorative : l'ancre
// n'est calculée qu'au-dessus de MIN_ANCHOR_NAMES (12), parce qu'en dessous
// ρ_impl s'effondre mécaniquement (cf. le test « sous-panier » plus bas).
const COMPS = [
  'NVDA', 'AAPL', 'MSFT', 'AMZN', 'META', 'GOOGL', 'TSLA',
  'AVGO', 'COST', 'NFLX', 'AMD', 'PEP', 'ADBE', 'CSCO',
].map((ticker, i) => ({ ticker, weight: 8 - i * 0.4 }));

function loadStore(implSeq, comps = COMPS) {
  const calls = { impl: 0, scored: [] };
  const win = {
    addEventListener() {}, removeEventListener() {}, dispatchEvent() {},
    CustomEvent: class { constructor(t, o) { this.type = t; this.detail = o && o.detail; } },
    localStorage: { length: 0, key: () => null, getItem: () => null, setItem() {}, removeItem() {} },
  };
  win.window = win;
  const api = {
    getIndices: () => Promise.resolve([]),
    getIndex: () => Promise.resolve({ symbol: 'SPX' }),
    getSnapshot: () => Promise.resolve({ iv_est: 18 }),
    getComponents: () => Promise.resolve(comps.map(c => ({ ...c }))),
    batchQuotes: () => Promise.resolve([]),
    // null = échec / dépassement du délai ; nombre = ancre résolue.
    impliedCorrelation: () => {
      const v = implSeq[Math.min(calls.impl, implSeq.length - 1)];
      calls.impl++;
      return Promise.resolve(v == null ? null : { rho_impl: v });
    },
    // Le score renvoyé DÉPEND de l'ancre reçue : c'est ce qu'on veut observer.
    autoScore: (sym, t, dur, force, rhoImpl) => {
      calls.scored.push({ t, rhoImpl });
      return Promise.resolve({ scoring: { score: rhoImpl == null ? 65 : 12 } });
    },
  };
  const ctx = vm.createContext({
    window: win, console, DXApi: api, localStorage: win.localStorage,
    CustomEvent: win.CustomEvent, fetch: () => Promise.reject(new Error('offline')),
    setInterval: () => 0, setTimeout: (f, ms) => { if (!ms) f(); return 0; },
    clearInterval: () => {}, clearTimeout: () => {},
    Date, JSON, Math, String, Number, Object, Array, isFinite, isNaN, parseFloat, parseInt, Set, Map, Promise, Error,
  });
  vm.runInContext(readFileSync(new URL('../js/store.js', import.meta.url), 'utf8'), ctx);
  return { store: win.DXStore, calls, api };
}

// Simule l'écoulement du délai de garde entre deux tentatives d'ancre.
function expireCooldown(store, symbol) {
  const d = store.getIndexData(symbol);
  if (d && d.rhoImplTried) for (const k of Object.keys(d.rhoImplTried)) d.rhoImplTried[k] = 0;
}

test("l'ancre est réessayée, et les scores du repli sont REFAITS", async () => {
  // 1re tentative : échec. 2e : l'ancre arrive.
  const { store, calls } = loadStore([null, 0.22]);
  await store.loadIndex('SPX');

  await store.scoreIndex('SPX', 30);
  assert.equal(calls.impl, 1, "l'ancre a été tentée");
  assert.ok(calls.scored.every(s => s.rhoImpl == null), 'ce 1er passage score au repli');
  assert.equal(store.getScores('SPX', 30).NVDA, 65, 'score gonflé par le repli');

  expireCooldown(store, 'SPX');
  await store.scoreIndex('SPX', 30);

  assert.equal(calls.impl, 2, "l'ancre a bien été RÉESSAYÉE (elle ne l'était jamais avant)");
  assert.equal(store.getScores('SPX', 30).NVDA, 12, 'le score a été recalculé avec la vraie ancre');
  assert.ok(calls.scored.slice(-2).every(s => s.rhoImpl === 0.22), 'la vraie ancre est passée à chaque score');
});

test('le raccourci « déjà scoré » ne bloque plus le réessai', async () => {
  // Piège : scoreIndex sortait plus haut quand tous les tickers étaient scorés,
  // AVANT d'atteindre la logique d'ancre. Une fois tout scoré au repli, l'indice
  // restait figé pour toujours — le réessai n'aurait jamais été atteint.
  const { store, calls } = loadStore([null, 0.30]);
  await store.loadIndex('SPX');
  await store.scoreIndex('SPX', 30);
  const apres1 = calls.impl;

  expireCooldown(store, 'SPX');
  await store.scoreIndex('SPX', 30);   // tous les tickers ont déjà un score

  assert.ok(calls.impl > apres1, 'le second passage doit quand même retenter');
  assert.equal(store.getScores('SPX', 30).NVDA, 12);
});

test("quand l'ancre est disponible d'emblée, rien n'est recalculé pour rien", async () => {
  const { store, calls } = loadStore([0.25]);
  await store.loadIndex('SPX');
  await store.scoreIndex('SPX', 30);
  const n = calls.scored.length;

  expireCooldown(store, 'SPX');
  await store.scoreIndex('SPX', 30);
  assert.equal(calls.scored.length, n, 'aucun re-scoring inutile');
  assert.equal(calls.impl, 1, "l'ancre résolue n'est pas recalculée");
});

test("un échec persistant ne martèle pas l'API", async () => {
  const { store, calls } = loadStore([null]);   // échoue toujours
  await store.loadIndex('SPX');
  await store.scoreIndex('SPX', 30);
  await store.scoreIndex('SPX', 30);            // sans laisser expirer le délai
  assert.equal(calls.impl, 1, 'le délai de garde empêche une seconde tentative immédiate');
});

/* ── L'ancre est CANONIQUE : une seule par (indice, durée), pour tout le site ── */

test("resolveRhoImpl rend la MÊME ancre à tous les écrans, calculée une seule fois", async () => {
  const { store, calls } = loadStore([0.27]);
  await store.loadIndex('SPX');

  // Trois écrans qui demandent l'ancre en même temps (table d'indice, liste,
  // détail d'un titre) : un seul calcul, une seule valeur.
  const [a, b, c] = await Promise.all([
    store.resolveRhoImpl('SPX', 30),
    store.resolveRhoImpl('SPX', 30),
    store.resolveRhoImpl('SPX', 30),
  ]);
  assert.equal(a, 0.27);
  assert.equal(b, 0.27);
  assert.equal(c, 0.27);
  assert.equal(calls.impl, 1, 'les appels concurrents sont dédoublonnés');

  // Et le scoring de l'indice réutilise CETTE ancre, sans la recalculer.
  await store.scoreIndex('SPX', 30);
  assert.equal(calls.impl, 1, "le scoring réutilise l'ancre déjà résolue");
  assert.ok(calls.scored.every(s => s.rhoImpl === 0.27), 'tout est scoré sur la même ancre');
});

test("l'ancre se résout même si l'écran Indices n'a jamais été ouvert", async () => {
  // Cas réel : une liste ouverte directement (marque-page, lien partagé). Elle
  // doit obtenir la même ancre que la table de l'indice, sans l'avoir chargée.
  const { store, calls } = loadStore([0.31]);
  const rho = await store.resolveRhoImpl('SPX', 30);   // pas de loadIndex préalable
  assert.equal(rho, 0.31, "l'indice est chargé à la demande pour ancrer le score");
  assert.equal(calls.impl, 1);
});

test('un sous-panier trop petit ne produit PAS une ancre inventée', async () => {
  // Sous ~12 noms, ρ_impl s'effondre mécaniquement vers son clamp bas. Rendre
  // une telle valeur serait pire que ne rien rendre : elle a l'air d'une vraie
  // ancre et gonfle le score de ~23 points. On refuse, et le fail-safe serveur
  // s'applique — mais alors il s'applique PARTOUT pareil.
  const { store, calls } = loadStore([0.05], [{ ticker: 'NVDA', weight: 7 }, { ticker: 'AAPL', weight: 6 }]);
  const rho = await store.resolveRhoImpl('SPX', 30);
  assert.equal(rho, null, 'pas assez de noms → pas d\'ancre');
  assert.equal(calls.impl, 0, "on n'interroge même pas l'API pour un panier non ancrable");
});

test('scoreIndex déjà en cours est ATTENDABLE (plus d\'univers partiel)', async () => {
  // L'auto-chercheur `await scoreIndex(...)` puis lit la table des scores. Quand
  // un autre écran scorait déjà, l'ancien code rendait la main immédiatement :
  // le chercheur travaillait sur un univers à moitié scoré, donc un résultat qui
  // dépendait de l'ordre d'ouverture des écrans.
  const { store, calls } = loadStore([0.24]);
  await store.loadIndex('SPX');

  const premier = store.scoreIndex('SPX', 30);
  const second  = store.scoreIndex('SPX', 30);   // pendant que le premier tourne
  await Promise.all([premier, second]);

  const scores = store.getScores('SPX', 30);
  assert.equal(Object.keys(scores).length, COMPS.length, 'TOUS les composants sont scorés au retour');
  assert.equal(calls.scored.length, COMPS.length, 'aucun composant scoré deux fois');
});

/* ── Le MODÈLE de score actif voyage avec les scores ────────────────────────
   Les écrans qui interprètent le NIVEAU d'un score (l'auto-chercheur centre le
   sien sur 62, calibré sur V1) doivent savoir quel modèle tourne : sous V2 la
   distribution est tout autre (médiane 5 contre 46). Le serveur le dit dans
   chaque réponse ; encore faut-il que le store le retienne et le rende. */

test("le store retient le modèle de score et ses seuils", async () => {
  const { store, api } = loadStore([0.25]);
  api.autoScore = () => Promise.resolve({
    scoring: { score: 12, score_model: 'V2', score_thresholds: { fort: 62, mod: 19 } },
  });
  await store.loadIndex('SPX');
  await store.scoreIndex('SPX', 30);

  const sm = store.getScoreModel('SPX', 30);
  assert.equal(sm.model, 'V2');
  assert.equal(sm.thresholds.fort, 62);
  assert.equal(sm.thresholds.mod, 19);
});

test("sans information du serveur, on retombe sur V1 (non-cassant)", async () => {
  // C'est le stub par défaut : il ne renvoie pas de seuils, comme le repli
  // hors-ligne. Le comportement historique doit être conservé tel quel.
  const { store } = loadStore([0.25]);
  await store.loadIndex('SPX');
  await store.scoreIndex('SPX', 30);

  const sm = store.getScoreModel('SPX', 30);
  assert.equal(sm.model, 'V1');
  // Champ par champ : l'objet naît dans le contexte vm, donc son prototype n'est
  // pas celui de l'hôte et deepEqual strict le rejetterait à tort.
  assert.equal(sm.thresholds.fort, 75);
  assert.equal(sm.thresholds.mod, 55);
});

test("un indice jamais scoré rend le repli V1 plutôt que de planter", () => {
  const { store } = loadStore([0.25]);
  const sm = store.getScoreModel('NDX', 30);
  assert.equal(sm.model, 'V1');
  assert.ok(sm.thresholds.fort > sm.thresholds.mod);
});

/* ── Bascule de VUE V2 ↔ ALT (Préférences) : sans préférence on suit le flag serveur,
      avec préférence on la respecte, et les seuils suivent le modèle affiché. ── */
test("setViewModel bascule la vue et ses seuils, sans re-scoring", async () => {
  // Serveur en V2 (+ ingrédients ALT toujours renvoyés dans chaque réponse).
  const { store: s2, api } = loadStore([0.25]);
  api.autoScore = () => Promise.resolve({
    scoring: { score: 12, score_v2: 12, score_model: 'V2', score_thresholds: { fort: 62, mod: 19 }, alt_idio: 30, alt_cost: 5 },
  });
  await s2.loadIndex('SPX');
  await s2.scoreIndex('SPX', 30);

  // Sans préférence → suit le flag serveur (V2).
  assert.equal(s2.getViewModel(), 'V2');
  assert.equal(s2.getScoreModel('SPX', 30).model, 'V2');

  // Bascule ALT → seuils percentiles {80,50}.
  s2.setViewModel('ALT');
  assert.equal(s2.getViewModel(), 'ALT');
  const smAlt = s2.getScoreModel('SPX', 30);
  assert.equal(smAlt.model, 'ALT');
  assert.equal(smAlt.thresholds.fort, 90);
  assert.equal(smAlt.thresholds.mod, 65);

  // Retour V2 → seuils {62,19}.
  s2.setViewModel('V2');
  assert.equal(s2.getViewModel(), 'V2');
  assert.equal(s2.getScoreModel('SPX', 30).thresholds.fort, 62);
});

test("l'ampleur du défaut est bien celle observée (0 contre 65)", () => {
  // Documente pourquoi ce bug se voyait autant : la porte est multiplicative.
  const gate = (rhoImpl, rho) => 1 / (1 + Math.exp(-((rhoImpl - rho) - 0.05) / 0.08));
  const quality = 68;
  const repli = Math.round(gate(0.65, 0.35) * quality);
  const vraie = Math.round(gate(0.22, 0.55) * quality);
  assert.ok(repli > 60 && vraie < 5, `repli ${repli} contre vraie ancre ${vraie}`);
});
