/* ─────────────────────────────────────────────────────────────
   DispersionX — store PARTAGÉ des notifications « intelligentes ».
   Source de vérité UNIQUE consommée par : la cloche (Topbar), la page
   Notifications, et le fil Activité (bas gauche). Évite de poller deux fois
   et garde le « non-vu » cohérent partout.

   • Poll cloud (DXApi.getNotifications) toutes les 20 s + sur « poke ».
   • Non-vu = notifs dont l'id dépasse le dernier id VU (persisté par user).
   • markSeen() → remet le non-vu à 0 partout (émet 'dx-notif-store').
   • getSeenId() → dernier id vu : permet à l'UI d'afficher en NEUTRE les notifs
     déjà vues (le bandeau coloré ne revient pas), tout en les gardant 30 j.
   Exposé : window.DXNotifStore. Cloud uniquement (sinon liste vide).
   ───────────────────────────────────────────────────────────── */
(function () {
  var WINDOW_MS = 30 * 86400000;   // fenêtre glissante 30 j (comme l'audit)
  var notifs = [];
  var maxId = 0;
  var seenId = null;               // dernier id vu (persisté), chargé paresseusement
  var seenUid = null;              // compte pour lequel seenId a été chargé
  var timer = null;
  var started = false;

  // uid = compte connecté, lu DIRECTEMENT à chaque appel (et non mémorisé au 1er
  // render). Bug corrigé : le badge appelait unseen() avant que refresh() ne fixe
  // l'uid → il chargeait « anon » puis markSeen persistait sous le vrai compte →
  // le point rouge revenait au reload. On (re)charge donc dès que l'uid change.
  function currentUid() { var C = window.DXCloud; return (C && C.user && C.user.id) || 'anon'; }
  function seenKey(u) { return 'dx-notif-seen-' + u; }
  function loadSeen() {
    var u = currentUid();
    if (seenId != null && seenUid === u) return;
    seenUid = u;
    try { var raw = localStorage.getItem(seenKey(u)); seenId = raw != null ? (parseInt(raw, 10) || 0) : 0; }
    catch (e) { seenId = 0; }
  }
  function emit() { try { window.dispatchEvent(new CustomEvent('dx-notif-store')); } catch (e) {} }

  function unseen() { loadSeen(); return notifs.filter(function (n) { return Number(n.id) > seenId; }).length; }
  function getSeenId() { loadSeen(); return seenId; }

  async function refresh() {
    var C = window.DXCloud;
    if (!(C && C.enabled)) { if (notifs.length) { notifs = []; emit(); } return; }
    loadSeen();
    try {
      var list = await window.DXApi.getNotifications(50);
      if (Array.isArray(list)) {
        var cutoff = Date.now() - WINDOW_MS;
        notifs = list.filter(function (n) { return new Date(n.created_at).getTime() >= cutoff; });
        maxId = notifs.reduce(function (mx, n) { return Math.max(mx, Number(n.id) || 0); }, 0);
      }
    } catch (e) { /* réseau/RLS → on garde l'état courant */ }
    emit();
  }

  function markSeen() {
    var u = currentUid();
    // maxId robuste : recalcule depuis les notifs courantes (au cas où refresh
    // n'aurait pas encore tourné) et ne recule jamais.
    var mx = notifs.reduce(function (m, n) { return Math.max(m, Number(n.id) || 0); }, maxId);
    seenId = mx; seenUid = u; maxId = mx;
    try { localStorage.setItem(seenKey(u), String(mx)); } catch (e) {}
    emit();
  }

  function start() {
    if (started) return; started = true;
    refresh();
    timer = setInterval(refresh, 20000);
    window.addEventListener('dx-activity-poke', refresh);
    window.addEventListener('dx-auth-change', function () { seenId = null; seenUid = null; notifs = []; maxId = 0; refresh(); });
  }

  window.DXNotifStore = {
    start: start,
    refresh: refresh,
    markSeen: markSeen,
    getNotifs: function () { return notifs.slice(); },
    unseen: unseen,
    getSeenId: getSeenId,
  };
})();
