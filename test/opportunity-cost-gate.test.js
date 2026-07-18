// Porte de coût de l'auto-chercheur.
//
// Le score classe la qualité BRUTE d'un composant et ignore le coût — délibérément :
// l'y mettre dégrade son pouvoir de classement, et la forme de V2 a été backtestée
// sans lui. On ne touche donc pas au score ; on restreint l'UNIVERS auquel il
// s'applique. Sans cette porte, l'auto-chercheur proposait les noms les plus volatils
// de l'indice — ceux dont les options coûtent le plus cher, donc perdants une fois le
// spread payé, quoi que fasse le marché.
//
// Ces tests utilisent la VRAIE table de coûts mesurée (js/lib/corr-cost-data.js), pas
// des valeurs inventées : le seuil doit trier correctement sur les données réelles.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const url = p => new URL(p, import.meta.url);
const src = readFileSync(url('../js/screens/OpportunityFinder.jsx'), 'utf8');

// Table de coûts réelle.
const win = {};
new Function('window', readFileSync(url('../js/lib/corr-cost-data.js'), 'utf8'))(win);
const COST = win.DXCostComp;

// Reproduit la porte telle qu'écrite dans l'écran (seuil lu depuis la source, pour
// qu'un changement de seuil dans le code fasse évoluer le test avec lui).
const GATE = Number(src.match(/const OPP_COST_GATE = ([\d.]+)/)[1]);
const costOf = t => { const e = COST[t]; const c = e && Array.isArray(e.cv) ? e.cv[0] : null;
  return (typeof c === 'number' && isFinite(c) && c > 0) ? c : null; };
const passes = t => { const c = costOf(t); return c == null || c <= GATE; };

test('le seuil est celui mesuré comme optimal (2 points de vol)', () => {
  assert.equal(GATE, 2.0);
});

test('les noms chers à trader sont écartés, les exécutables retenus', () => {
  // Mesurés dans la table : coût round-trip au tenor 30 j.
  const chers = ['CVNA', 'MSTR', 'COIN', 'SMCI'];        // le panier « vol maximale »
  const exec  = ['AAPL', 'MSFT', 'NVDA', 'META', 'AMZN']; // les noms réellement traitables

  for (const t of chers) {
    if (!COST[t]) continue;   // absent de la table → hors sujet pour ce test
    assert.equal(passes(t), false, `${t} (${costOf(t)} pts) devrait être écarté`);
  }
  for (const t of exec) {
    assert.ok(COST[t], `${t} devrait figurer dans la table mesurée`);
    assert.equal(passes(t), true, `${t} (${costOf(t)} pts) devrait passer`);
  }
});

test("un nom NON mesuré passe la porte — pas de verdict sans mesure", () => {
  // Même règle que le panneau de coût : une donnée absente ne condamne pas.
  assert.equal(costOf('TICKER-INEXISTANT'), null);
  assert.equal(passes('TICKER-INEXISTANT'), true);
});

test('la porte laisse un univers exploitable sur le S&P 500', () => {
  // Une porte qui ne laisserait passer que 3 noms serait inutilisable en pratique.
  const univers = Object.keys(COST).filter(t => costOf(t) != null);
  const retenus = univers.filter(passes);
  assert.ok(retenus.length >= 20, `seulement ${retenus.length} noms exécutables — porte trop stricte`);
  assert.ok(retenus.length < univers.length * 0.5,
    `${retenus.length}/${univers.length} passent — porte trop lâche pour trier quoi que ce soit`);
});

test('le coût médian des retenus est nettement sous celui des écartés', () => {
  const med = a => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
  const univers = Object.keys(COST).filter(t => costOf(t) != null);
  const ok = med(univers.filter(passes).map(costOf));
  const ko = med(univers.filter(t => !passes(t)).map(costOf));
  assert.ok(ok < ko / 2, `retenus ${ok} vs écartés ${ko} — la porte ne sépare pas assez`);
});

test('le score n\'est PAS modifié — la porte agit sur l\'univers', () => {
  // Garde-fou d'architecture : si un jour le coût entre dans le calcul du score,
  // le modèle V2 backtesté n'est plus celui qui tourne.
  assert.match(src, /const tradable = scored\.filter/, 'la porte filtre bien le vivier');
  assert.doesNotMatch(src, /score\w*\s*[*+]\s*.*oppCostOf/, 'le coût ne doit pas entrer dans le score');
});

test('la porte se lève plutôt que de casser la recherche', () => {
  // Indices dont les composants ne sont pas dans la table (CAC, DAX, NDX partiel) :
  // mieux vaut un résultat sans porte qu'aucun résultat — mais il doit être signalé.
  assert.match(src, /const gateOn = tradable\.length >=/, 'un repli existe');
  assert.match(src, /gate\.on \?/, "l'état de la porte est affiché à l'utilisateur");
});
