// Validation / allowlist des symboles — défense en profondeur.
// Les symboles sont interpolés dans des URLs de fournisseurs (Finnhub, Cboe, …) :
// on impose un format strict pour empêcher l'injection de paramètres (« & », « ? »,
// « # », espaces) et on borne la taille des lots (anti-abus / coût).
// Autorisé : lettres A-Z, chiffres, point (BRK.B), tiret (BRK-B), caret (^GSPC),
// underscore (_SPX chez Cboe). 1 à 12 caractères.
export const SYMBOL_RE = /^[A-Z0-9.^_-]{1,12}$/;

export function cleanSymbol(s) {
  const v = String(s == null ? '' : s).toUpperCase().trim();
  return SYMBOL_RE.test(v) ? v : null;
}

// Nettoie une liste : normalise, valide, déduplique, plafonne à `max` éléments.
export function cleanSymbols(arr, max = 100) {
  const out = [];
  const seen = new Set();
  const src = Array.isArray(arr) ? arr : [];
  for (const s of src) {
    const v = cleanSymbol(s);
    if (v && !seen.has(v)) { seen.add(v); out.push(v); if (out.length >= max) break; }
  }
  return out;
}
