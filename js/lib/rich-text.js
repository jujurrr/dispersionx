/* ─── DXRich : rendu d'une chaîne traduite en JSX (gras + liens) ──────────────
   Le système i18n (js/i18n.js) traduit des CHAÎNES. Or les pages légales et les
   dialogues contiennent du gras et des liens EN LIGNE. Pour garder UNE clé de
   traduction par paragraphe (traductions propres, FR inchangé), on écrit le texte
   avec un balisage léger que ce helper convertit en noeuds React :

     **gras**                 → <strong>
     [libellé](nav:route)     → lien de navigation interne (onNav(route))
     [libellé](mailto:x)      → lien e-mail
     [libellé](https://…)     → lien externe

   Les valeurs dynamiques ({editeur}, {email}…) sont déjà interpolées par
   window.t(clé, vars) AVANT d'arriver ici. Repli : sans React, renvoie la chaîne.

   Exposé : window.DXRich(str, { onNav, strong, link }) → (string | ReactNode[]).
   Chargé après React et i18n (voir src/main.jsx). */
(function () {
  'use strict';

  function rich(str, opts) {
    opts = opts || {};
    var R = (typeof window !== 'undefined') ? window.React : null;
    var strongStyle = opts.strong || { color: 'var(--text)', fontWeight: 600 };
    var linkStyle = opts.link || { color: 'var(--accent-hover)', cursor: 'pointer' };
    var onNav = opts.onNav;
    var s = String(str == null ? '' : str);
    if (!R) return s;

    var nodes = [];
    // Alterne : **gras**  OU  [libellé](cible)
    var re = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;
    var last = 0, m, key = 0;
    while ((m = re.exec(s)) !== null) {
      if (m.index > last) nodes.push(s.slice(last, m.index));
      if (m[1] != null) {
        nodes.push(R.createElement('strong', { key: key++, style: strongStyle }, m[1]));
      } else {
        var label = m[2], target = m[3];
        if (target.indexOf('nav:') === 0) {
          var route = target.slice(4);
          nodes.push(R.createElement('a', {
            key: key++, style: linkStyle,
            onClick: onNav ? (function (r) { return function () { onNav(r); }; })(route) : undefined,
          }, label));
        } else {
          var ext = /^https?:/i.test(target);
          nodes.push(R.createElement('a', {
            key: key++, href: target, style: linkStyle,
            target: ext ? '_blank' : undefined, rel: ext ? 'noopener noreferrer' : undefined,
          }, label));
        }
      }
      last = re.lastIndex;
    }
    if (last < s.length) nodes.push(s.slice(last));
    return nodes;
  }

  if (typeof window !== 'undefined') window.DXRich = rich;
})();
