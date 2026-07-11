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
  var uid = 'anon';
  var timer = null;
  var started = false;

  function seenKey() { return 'dx-notif-seen-' + uid; }
  function loadSeen() {
    if (seenId != null) return;
    try { var raw = localStorage.getItem(seenKey()); seenId = raw != null ? (parseInt(raw, 10) || 0) : 0; }
    catch (e) { seenId = 0; }
  }
  function emit() { try { window.dispatchEvent(new CustomEvent('dx-notif-store')); } catch (e) {} }

  function unseen() { loadSeen(); return notifs.filter(function (n) { return Number(n.id) > seenId; }).length; }
  function getSeenId() { loadSeen(); return seenId; }

  async function refresh() {
    var C = window.DXCloud;
    if (!(C && C.enabled)) { if (notifs.length) { notifs = []; emit(); } return; }
    uid = (C.user && C.user.id) || 'anon';
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
    loadSeen();
    seenId = maxId;
    try { localStorage.setItem(seenKey(), String(maxId)); } catch (e) {}
    emit();
  }

  function start() {
    if (started) return; started = true;
    refresh();
    timer = setInterval(refresh, 20000);
    window.addEventListener('dx-activity-poke', refresh);
    window.addEventListener('dx-auth-change', function () { seenId = null; uid = 'anon'; notifs = []; maxId = 0; refresh(); });
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
