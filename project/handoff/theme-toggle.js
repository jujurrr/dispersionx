/* ═══════════════════════════════════════════════════════════════
   DispersionX — bascule de thème sombre ↔ Café Warm (clair)
   POSE : ajoute UNE ligne dans index.html, juste avant </body> :
     <script src="/static/js/theme-toggle.js"></script>
   Le script applique le thème mémorisé (avant le 1er rendu), puis
   injecte un bouton soleil/lune dans .topbar-actions. Zéro autre edit.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  var KEY = 'dx-theme';
  function apply(t) { document.documentElement.setAttribute('data-theme', t === 'cafe' ? 'cafe' : 'dark'); }
  var saved; try { saved = localStorage.getItem(KEY); } catch (e) {}
  apply(saved || 'dark');

  var SUN = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  var MOON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

  function render(btn) {
    var dark = document.documentElement.getAttribute('data-theme') !== 'cafe';
    btn.innerHTML = dark ? SUN : MOON;
    btn.title = dark ? 'Passer en thème clair (Café)' : 'Passer en thème sombre';
  }

  function mount() {
    var host = document.querySelector('.topbar-actions') || document.querySelector('.topbar');
    if (!host) return setTimeout(mount, 200);
    if (host.querySelector('.dx-theme-btn')) return;
    var btn = document.createElement('button');
    btn.className = 'dx-theme-btn';
    btn.setAttribute('aria-label', 'Changer de thème');
    render(btn);
    btn.addEventListener('click', function () {
      var next = document.documentElement.getAttribute('data-theme') === 'cafe' ? 'dark' : 'cafe';
      apply(next);
      try { localStorage.setItem(KEY, next); } catch (e) {}
      render(btn);
    });
    host.insertBefore(btn, host.firstChild);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
