/* ─────────────────────────────────────────────────────────────
   DispersionX — theme controller (plain JS, no build step).
   Applies + persists the dark ↔ café theme via [data-theme] on <html>.
   Load this BEFORE app scripts so the theme is set before first paint.
   Exposes window.DXTheme = { get, set, toggle }.
   ───────────────────────────────────────────────────────────── */
(function () {
  var KEY = 'dx-theme';
  function apply(t) {
    document.documentElement.setAttribute('data-theme', t === 'cafe' ? 'cafe' : 'dark');
  }
  var saved;
  try { saved = localStorage.getItem(KEY); } catch (e) { saved = null; }
  apply(saved || 'dark');

  window.DXTheme = {
    get: function () {
      return document.documentElement.getAttribute('data-theme') === 'cafe' ? 'cafe' : 'dark';
    },
    set: function (t) {
      apply(t);
      try { localStorage.setItem(KEY, t); } catch (e) {}
      window.dispatchEvent(new CustomEvent('dx-theme', { detail: t }));
    },
    toggle: function () {
      var n = this.get() === 'cafe' ? 'dark' : 'cafe';
      this.set(n);
      return n;
    },
  };
})();
