// Verrouille le score ALT cross-sectionnel (js/lib/alt-score.js) : percentile de z(idio) − z(coût).
// Le module s'auto-enregistre sur globalThis.DXAltScore.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../js/lib/alt-score.js';

const { altScores, altIndexRanks } = globalThis.DXAltScore;

test('monotone : plus d\'idio → meilleur score, plus de coût → pire score', () => {
  // 5 titres, coût constant → seul l'idio classe : l'ordre du score suit l'idio.
  const r = altScores({
    A: { idio: 10, cost: 5 }, B: { idio: 20, cost: 5 }, C: { idio: 30, cost: 5 },
    D: { idio: 40, cost: 5 }, E: { idio: 50, cost: 5 },
  });
  assert.equal(r.E.score, 100);   // idio max → percentile 100
  assert.equal(r.A.score, 0);     // idio min → 0
  assert.ok(r.C.score > r.B.score && r.D.score > r.C.score);
});

test('le coût pénalise : à idio égal, coût plus haut → score plus bas', () => {
  const r = altScores({
    A: { idio: 30, cost: 2 }, B: { idio: 30, cost: 6 }, C: { idio: 30, cost: 10 },
    D: { idio: 30, cost: 14 }, E: { idio: 30, cost: 18 },
  });
  assert.equal(r.A.score, 100);   // coût min → meilleur
  assert.equal(r.E.score, 0);     // coût max → pire
});

test('idio ET coût comptent (le meilleur = haute idio + bas coût)', () => {
  const r = altScores({
    HL: { idio: 50, cost: 2 },   // haute idio, bas coût → doit gagner
    HH: { idio: 50, cost: 20 },  // haute idio, haut coût
    LL: { idio: 10, cost: 2 },   // basse idio, bas coût
    LH: { idio: 10, cost: 20 },  // basse idio, haut coût → doit perdre
  });
  assert.equal(r.HL.score, 100);
  assert.equal(r.LH.score, 0);
  assert.ok(r.HL.z > r.HH.z && r.HH.z > r.LH.z);
});

test('sous 3 noms → aucun score (pas de coupe transverse)', () => {
  assert.deepEqual(altScores({ A: { idio: 1, cost: 1 }, B: { idio: 2, cost: 2 } }), {});
  assert.deepEqual(altScores({}), {});
});

test('ignore les entrées invalides (idio/coût non finis)', () => {
  const r = altScores({
    A: { idio: 10, cost: 5 }, B: { idio: 20, cost: 5 }, C: { idio: 30, cost: 5 },
    X: { idio: null, cost: 5 }, Y: { idio: 40 },
  });
  assert.equal(Object.keys(r).length, 3);   // seuls A, B, C
  assert.ok(!('X' in r) && !('Y' in r));
});

test('score borné 0-100 et déterministe (départage stable)', () => {
  const parts = { A: { idio: 30, cost: 5 }, B: { idio: 30, cost: 5 }, C: { idio: 30, cost: 5 } };
  const r1 = altScores(parts), r2 = altScores(parts);
  for (const t of ['A', 'B', 'C']) { assert.ok(r1[t].score >= 0 && r1[t].score <= 100); assert.equal(r1[t].score, r2[t].score); }
});

// ── altIndexRanks : classement des INDICES entre eux (corrige le « 50 partout » du Dashboard) ──
test('altIndexRanks : classe par arête nette (idio − coût), bande 40-90, indices DIFFÉRENCIÉS', () => {
  const r = altIndexRanks({
    DJI: { idio: 18, cost: 6 },   // arête 12 → la plus faible
    SPX: { idio: 28, cost: 10 },  // arête 18
    NDX: { idio: 38, cost: 9 },   // arête 29 → la plus forte
  });
  assert.equal(r.NDX, 90);        // meilleure arête → haut de bande (FORT)
  assert.equal(r.DJI, 40);        // pire arête → bas de bande (FAIBLE, pas NÉGATIF)
  assert.ok(r.SPX > r.DJI && r.SPX < r.NDX);   // ordonné et distinct
  // Point-clé : les 3 scores DIFFÈRENT (le bug affichait 50 pour tous).
  assert.equal(new Set([r.DJI, r.SPX, r.NDX]).size, 3);
});

test('altIndexRanks : à idio égale, coût plus haut → indice moins bien classé', () => {
  const r = altIndexRanks({ A: { idio: 30, cost: 4 }, B: { idio: 30, cost: 10 }, C: { idio: 30, cost: 16 } });
  assert.equal(r.A, 90);
  assert.equal(r.C, 40);
  assert.ok(r.B > r.C && r.B < r.A);
});

test('altIndexRanks : un seul indice → milieu de bande ; vide/invalides ignorés', () => {
  assert.deepEqual(altIndexRanks({ SPX: { idio: 25, cost: 9 } }), { SPX: 65 });   // (40+90)/2
  assert.deepEqual(altIndexRanks({}), {});
  const r = altIndexRanks({ A: { idio: 20, cost: 5 }, B: { idio: 30, cost: 5 }, X: { idio: null, cost: 5 } });
  assert.ok(!('X' in r) && r.A === 40 && r.B === 90);   // X ignoré → 2 indices valides
});
