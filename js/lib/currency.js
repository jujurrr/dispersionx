/* ── Devise d'affichage (USD ⇆ EUR) — conversion PURE, non-cassante ──────────
   Source unique du formatage des MONTANTS. Chargé comme script (expose
   window.DXMoney + window.useCurrency) ET importable par Node pour les tests
   (assigne globalThis). Même patron que js/lib/market-hours.js et js/i18n.js.

   Garanties de sécurité :
   • Par DÉFAUT la devise est USD → `value()` reproduit EXACTEMENT dxUsd
     (entier, séparateur fr-FR, signe explicite, '−' pour les négatifs). Les
     montants en dollars sont donc rigoureusement inchangés (test à l'appui).
   • FAIL-SAFE : si la devise est EUR mais qu'aucun taux valide n'est connu, on
     retombe sur l'USD — jamais un chiffre faux/inventé.
   • AFFICHAGE seulement : aucune valeur convertie n'est stockée (la base reste
     en USD). Impossible de corrompre/mélanger des données via la devise.
   • Le taux est chargé en best-effort depuis /api/fx ; toute panne → USD. */
(function (g) {
  'use strict';

  var LS_KEY = 'dx-currency';
  var SYMBOL = { USD: '$', EUR: '€' };

  // État module-scope. rate = EUR pour 1 USD ; null tant qu'inconnu → USD forcé.
  var state = { currency: 'USD', rate: null, asof: null };

  // Préférence persistée (navigateur seulement).
  try {
    if (typeof localStorage !== 'undefined') {
      var saved = localStorage.getItem(LS_KEY);
      if (saved === 'EUR' || saved === 'USD') state.currency = saved;
    }
  } catch (e) { /* stockage indispo → défaut USD */ }

  // Devise EFFECTIVE : EUR seulement si un taux valide est présent, sinon USD.
  function effective() {
    return (state.currency === 'EUR' && state.rate > 0) ? 'EUR' : 'USD';
  }

  // Convertit un montant USD vers la devise effective (identité en USD).
  function convert(usd) {
    if (usd == null || !isFinite(usd)) return usd;
    return effective() === 'EUR' ? usd * state.rate : usd;
  }

  // Nombre formaté (SANS symbole). En USD, strictement identique à dxUsd.
  function value(usd, opts) {
    opts = opts || {};
    var sign = opts.sign !== false;   // défaut true (comme dxUsd)
    if (usd == null || !isFinite(usd)) return '—';   // '—'
    var r = Math.round(convert(usd));
    var s = r < 0 ? '−' : (sign ? '+' : '');          // '−' (U+2212)
    return s + Math.abs(r).toLocaleString('fr-FR');
  }

  function symbol() { return SYMBOL[effective()]; }

  // Chaîne complète « nombre symbole » (ex. « +1 234 $ »).
  function format(usd, opts) {
    var v = value(usd, opts);
    return v === '—' ? v : v + ' ' + symbol();
  }

  function getState() {
    return { currency: state.currency, effective: effective(), rate: state.rate, asof: state.asof, symbol: symbol() };
  }

  function emit() {
    try {
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('dx-currency-change', { detail: getState() }));
      }
    } catch (e) { /* pas de fenêtre (tests) */ }
  }

  // ── Setters ────────────────────────────────────────────────────────────────
  function setRate(rate, asof) {
    var v = Number(rate);
    if (isFinite(v) && v > 0) { state.rate = v; state.asof = asof || null; emit(); }
  }
  function setCurrency(cur) {
    var c = (cur === 'EUR') ? 'EUR' : 'USD';
    state.currency = c;
    try { if (typeof localStorage !== 'undefined') localStorage.setItem(LS_KEY, c); } catch (e) {}
    emit();
  }

  // ── Chargement du taux (navigateur), fail-safe : pas de taux → on reste USD ──
  function loadRate() {
    if (typeof fetch === 'undefined' || typeof window === 'undefined') return;
    try {
      fetch(window.location.origin + '/api/fx')
        .then(function (r) { return r && r.ok ? r.json() : null; })
        .then(function (d) { if (d && d.usd_eur) setRate(d.usd_eur, d.asof); })
        .catch(function () { /* réseau KO → USD */ });
    } catch (e) { /* fetch KO → USD */ }
  }

  // ── Hook React : re-render au changement de devise/taux (calqué sur useLang) ─
  function useCurrency() {
    var R = (typeof React !== 'undefined') ? React : (typeof window !== 'undefined' ? window.React : null);
    if (!R || !R.useState) return getState();
    var st = R.useState(getState());
    R.useEffect(function () {
      var on = function () { st[1](getState()); };
      window.addEventListener('dx-currency-change', on);
      return function () { window.removeEventListener('dx-currency-change', on); };
    }, []);
    return st[0];
  }

  g.DXMoney = {
    value: value, symbol: symbol, format: format, convert: convert,
    setCurrency: setCurrency, setRate: setRate, getState: getState, effective: effective,
  };
  if (typeof window !== 'undefined') {
    window.useCurrency = useCurrency;
    loadRate();   // best-effort au démarrage
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
