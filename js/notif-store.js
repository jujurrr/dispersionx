/* ─────────────────────────────────────────────────────────────
   DispersionX — store PARTAGÉ des notifications « intelligentes ».
   Source de vérité UNIQUE consommée par : la cloche (Topbar), la page
   Notifications, et le fil Activité (bas gauche). Évite de poller deux fois
   et garde le « non-vu » cohérent partout.

   • Poll cloud (DXApi.getNotifications) toutes les 20 s + sur « poke ».
   • Non-vu = notifs dont l'id dépasse le dernier id VU (persisté par user).
   • markSeen() → remet le non-vu à 0 partout (émet 'dx-notif-store').
   Exposé : window.DXNotifStore. Cloud uniquement (sinon liste vide).
   ───────────────────────────────────────────────────────────── */
(function () {
  var WINDOW_MS = 30 * 86400000;   // fenêtre glissante 30 j (comme l'audit)
  var notifs = [];
  var maxId = 0;
  var seenId = null;               // dernier id vu (persisté), chargé paresseusement
  var dismissed = null;            // { id: 1 } notifs masquées définitivement (par compte)
  var uid = 'anon';
  var timer = null;
  var started = false;

  function seenKey() { return 'dx-notif-seen-' + uid; }
  function loadSeen() {
    if (seenId != null) return;
    try { var raw = localStorage.getItem(seenKey()); seenId = raw != null ? (parseInt(raw, 10) || 0) : 0; }
    catch (e) { seenId = 0; }
  }
  // Notifs masquées (« dismiss » individuel) — persistées par compte, comme le
  // « vu ». Permet de retirer définitivement une notif du fil (ex. le message de
  // bienvenue Pro) plutôt que de la laisser 30 j.
  function dismKey() { return 'dx-notif-dismissed-' + uid; }
  function loadDismissed() {
    if (dismissed) return;
    dismissed = {};
    try { var raw = localStorage.getItem(dismKey()); if (raw) JSON.parse(raw).forEach(function (k) { dismissed[String(k)] = 1; }); }
    catch (e) {}
  }
  function emit() { try { window.dispatchEvent(new CustomEvent('dx-notif-store')); } catch (e) {} }

  function unseen() { loadSeen(); return notifs.filter(function (n) { return Number(n.id) > seenId; }).length; }

  async function refresh() {
    var C = window.DXCloud;
    if (!(C && C.enabled)) { if (notifs.length) { notifs = []; emit(); } return; }
    uid = (C.user && C.user.id) || 'anon';
    loadSeen(); loadDismissed();
    try {
      var list = await window.DXApi.getNotifications(50);
      if (Array.isArray(list)) {
        var cutoff = Date.now() - WINDOW_MS;
        var inWindow = list.filter(function (n) { return new Date(n.created_at).getTime() >= cutoff; });
        // maxId sur TOUT ce qui est dans la fenêtre (avant masquage) → le « vu »
        // reste cohérent même quand des notifs sont masquées.
        maxId = inWindow.reduce(function (mx, n) { return Math.max(mx, Number(n.id) || 0); }, 0);
        notifs = inWindow.filter(function (n) { return !dismissed[String(n.id)]; });
      }
    } catch (e) { /* réseau/RLS → on garde l'état courant */ }
    emit();
  }

  // Masque une notif définitivement (persisté par compte) et la retire du fil.
  function dismiss(id) {
    if (id == null) return;
    loadDismissed();
    dismissed[String(id)] = 1;
    try { localStorage.setItem(dismKey(), JSON.stringify(Object.keys(dismissed))); } catch (e) {}
    notifs = notifs.filter(function (n) { return String(n.id) !== String(id); });
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
    window.addEventListener('dx-auth-change', function () { seenId = null; dismissed = null; uid = 'anon'; notifs = []; maxId = 0; refresh(); });
  }

  window.DXNotifStore = {
    start: start,
    refresh: refresh,
    markSeen: markSeen,
    dismiss: dismiss,
    getNotifs: function () { return notifs.slice(); },
    unseen: unseen,
  };
})();
