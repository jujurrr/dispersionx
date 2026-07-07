// Analytics respectueux de la vie privée — Vercel Web Analytics (cookieless,
// sans données personnelles, RGPD-friendly). Aucune dépendance npm : on utilise
// le snippet officiel (file d'attente + script servi par Vercel). Tout reste en
// MÊME ORIGINE → compatible avec la CSP stricte (`script-src 'self'`, aucun
// script inline). Les données ne circulent QUE si « Web Analytics » est activé
// pour le projet dans le tableau de bord Vercel ; sinon c'est un no-op silencieux.
(function () {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // File d'attente (le vrai script la vide au chargement) — définie ici, dans le
  // bundle (origine « self »), donc pas de <script> inline à autoriser en CSP.
  window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };

  // Charge le collecteur, servi par Vercel sous le domaine du site (même origine).
  var s = document.createElement('script');
  s.defer = true;
  s.src = '/_vercel/insights/script.js';
  document.head.appendChild(s);

  // Helper d'événements « custom » pour le tunnel (upsell → tarifs → checkout).
  // No-op sûr si l'analytics est désactivé.
  window.DXTrack = function (name, props) {
    try { window.va('event', { name: name, data: props || {} }); } catch (e) { /* silencieux */ }
  };
})();
