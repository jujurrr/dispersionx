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

const COMPS = [{ ticker: 'NVDA', weight: 7 }, { ticker: 'AAPL', weight: 6 }];

function loadStore(implSeq) {
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
    getComponents: () => Promise.resolve(COMPS.map(c => ({ ...c }))),
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
  return { store: win.DXStore, calls };
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

test("l'ampleur du défaut est bien celle observée (0 contre 65)", () => {
  // Documente pourquoi ce bug se voyait autant : la porte est multiplicative.
  const gate = (rhoImpl, rho) => 1 / (1 + Math.exp(-((rhoImpl - rho) - 0.05) / 0.08));
  const quality = 68;
  const repli = Math.round(gate(0.65, 0.35) * quality);
  const vraie = Math.round(gate(0.22, 0.55) * quality);
  assert.ok(repli > 60 && vraie < 5, `repli ${repli} contre vraie ancre ${vraie}`);
});
