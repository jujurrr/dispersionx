// COHÉRENCE DU SCORE D'UNE ACTION ENTRE LES ÉCRANS.
//
// Le symptôme rapporté : « le score est bon quand on passe par les indices, mais
// par les listes la plupart des actions affichent des scores complètement
// différents ». Cause : le score dépend d'une ANCRE de corrélation implicite, et
// chaque écran choisissait la sienne — l'indice passait la vraie ρ du panier
// complet, les listes calculaient la leur sur le sous-panier (ou, sous 12 noms,
// n'en passaient aucune → fail-safe serveur 0,65). Le terme de corrélation pèse
// 45 % du score et vaut 130 × (ρ_impl − ρ_réal) : l'écart mesuré atteint
// 23 points sur le MÊME titre, le même jour, le même horizon.
//
// Règle posée ici : le score est une fonction de (indice, titre, durée) et de
// RIEN d'autre. L'ancre est une propriété de l'INDICE, résolue au même endroit
// pour tout le monde. Ces tests vérifient qu'un appelant ne PEUT plus obtenir un
// score ancré différemment, même en oubliant de passer l'ancre.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Le serveur, en miniature : il applique le fail-safe 0,65 quand l'appelant
// n'envoie pas d'ancre, exactement comme api/stocks/auto-score.js. Le score
// renvoyé est le sous-score de corrélation réel du modèle, pour que les écarts
// mesurés ici soient ceux que l'utilisateur voit.
const RHO_REAL = 0.55;
function serverScore(rhoImpl) {
  const anchor = rhoImpl > 0 && rhoImpl < 1 ? rhoImpl : 0.65;   // fail-safe serveur
  return Math.round(Math.max(0, Math.min(100, 50 + (anchor - RHO_REAL) * 130)));
}

function loadApi({ anchor = null } = {}) {
  const seen = [];
  const localStorage = {
    length: 0, key: () => null, getItem: () => null, setItem() {}, removeItem() {},
  };
  const win = {
    location: { origin: 'http://localhost' },
    localStorage,
    addEventListener() {}, removeEventListener() {}, dispatchEvent() {},
    CustomEvent: class { constructor(t) { this.type = t; } },
    DXMock: { autoScore: () => ({ scoring: { score: -1 } }) },
    // Le store : seule autorité sur l'ancre canonique d'un indice.
    DXStore: { getRhoImpl: () => anchor },
  };
  win.window = win;
  const fetchStub = (url, opts) => {
    const body = JSON.parse(opts.body);
    seen.push(body);
    return Promise.resolve({
      ok: true, status: 200,
      json: () => Promise.resolve({ scoring: { score: serverScore(body.rho_impl) } }),
    });
  };
  const ctx = vm.createContext({
    window: win, localStorage, console,
    CustomEvent: win.CustomEvent,
    fetch: fetchStub,
    AbortSignal: { timeout: () => null },
    setInterval: () => 0, setTimeout: (f) => { if (f) f(); return 0; }, clearInterval: () => {},
    Date, JSON, Math, String, Number, Object, Array, isFinite, parseFloat, parseInt, Set, Map, Promise, Error,
  });
  vm.runInContext(readFileSync(new URL('../js/api.js', import.meta.url), 'utf8'), ctx);
  return { api: win.DXApi, seen, win };
}

test('un appelant qui OUBLIE l\'ancre hérite quand même de celle de l\'indice', async () => {
  // C'est le cœur du correctif : l'oubli n'est plus punissable. Avant, ne pas
  // passer rho_impl envoyait la requête sans ancre → fail-safe 0,65 côté serveur.
  const { api, seen } = loadApi({ anchor: 0.25 });
  await api.autoScore('SPX', 'AAPL', 30);            // aucune ancre passée
  assert.equal(seen.length, 1);
  assert.equal(seen[0].rho_impl, 0.25, "l'ancre canonique de l'indice est envoyée d'office");
});

test('table d\'indice et liste affichent le MÊME score pour la même action', async () => {
  const { api } = loadApi({ anchor: 0.25 });
  // L'écran Indices passe explicitement l'ancre (il l'a déjà résolue) ;
  // l'écran Liste ne la passe pas. Les deux doivent converger.
  const parIndice = await api.autoScore('SPX', 'AAPL', 30, false, 0.25);
  const parListe  = await api.autoScore('SPX', 'AAPL', 30);
  assert.equal(parIndice.scoring.score, parListe.scoring.score);

  // Et ce score est bien celui de la vraie ancre, pas du fail-safe.
  assert.equal(parListe.scoring.score, serverScore(0.25));
  assert.notEqual(serverScore(0.25), serverScore(null), 'le fail-safe donne bien un autre chiffre');
});

test("l'écart supprimé est bien celui qui était visible à l'écran", async () => {
  // Sans ancre canonique disponible, on retombe honnêtement sur le fail-safe —
  // mais alors PARTOUT pareil. On documente ici l'ampleur de ce qui divergeait.
  const { api: apiAncre } = loadApi({ anchor: 0.25 });
  const { api: apiSans }  = loadApi({ anchor: null });
  const avec = (await apiAncre.autoScore('SPX', 'AAPL', 30)).scoring.score;
  const sans = (await apiSans.autoScore('SPX', 'AAPL', 30)).scoring.score;
  // 45 % de pondération sur ce sous-score → ≈ 23 points de score final.
  assert.equal(sans - avec, 52, 'les deux ancres écartaient le sous-score de 52 points');
  assert.ok(Math.abs((sans - avec) * 0.45 - 23.4) < 0.1, '≈ 23 points sur le score affiché');
});

test('getCachedScore ne ressert JAMAIS un score ancré au fail-safe', async () => {
  // Le piège corrigé : getCachedScore lisait la clé « default », donc elle ne
  // pouvait ramener QUE des scores calculés sans ancre — et elle les servait à la
  // table de l'indice et au Builder, qui étaient pourtant justes. Un score gonflé
  // venu d'une liste contaminait ainsi des écrans sains.
  const { api, win } = loadApi({ anchor: null });

  // 1) Un écran score AVANT que l'ancre soit résolue → entrée « default » en cache.
  await api.autoScore('SPX', 'AAPL', 30);
  assert.equal(api.getCachedScore('SPX', 'AAPL', 30), serverScore(null), 'sans ancre connue, on lit le cache sans ancre');

  // 2) L'ancre arrive. Le score « default » ne doit plus être servi.
  win.DXStore.getRhoImpl = () => 0.25;
  assert.equal(api.getCachedScore('SPX', 'AAPL', 30), null,
    "l'entrée non ancrée n'est plus comparable : on préfère ne rien rendre");

  // 3) Une fois rescoré sur l'ancre canonique, la lecture synchrone le retrouve.
  await api.autoScore('SPX', 'AAPL', 30);
  assert.equal(api.getCachedScore('SPX', 'AAPL', 30), serverScore(0.25));
});

test('deux ancres différentes ne se partagent pas la même entrée de cache', async () => {
  // Garde-fou du cache mémoïsé : le premier arrivé ne doit pas figer le score
  // pour toute la session, quel que soit l'écran qui l'a déclenché.
  const { api, seen } = loadApi({ anchor: 0.25 });
  const a = await api.autoScore('SPX', 'AAPL', 30, false, 0.25);
  const b = await api.autoScore('SPX', 'AAPL', 30, false, 0.40);
  assert.notEqual(a.scoring.score, b.scoring.score, 'chaque ancre a son propre résultat');
  assert.equal(seen.length, 2, 'aucune des deux requêtes n\'a été avalée par le cache');
});
