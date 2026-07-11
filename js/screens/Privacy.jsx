/* ─── Politique de confidentialité (RGPD) ─────────────────────────
   Écran statique, accessible depuis la sidebar et le footer du Landing.
   Contact et identité du responsable = placeholders à compléter avant
   lancement public (marqués « à compléter »).
   Traduit via window.t (+ window.DXRich pour le gras/liens en ligne). */
function Privacy({ onNav }) {
  const L = window.DXLegal || {};
  const t = window.t || ((s) => s);
  const UPDATED = L.updated || '9 juillet 2026';
  const CONTACT = L.email || 'contact@dispersionx.app'; // source unique : js/legal-info.js

  const H = ({ children }) => (
    <h2 style={{ font: 'var(--type-h3)', color: 'var(--text)', margin: '28px 0 10px', letterSpacing: 'var(--track-snug)' }}>{children}</h2>
  );
  const P = ({ children }) => (
    <p style={{ font: 'var(--type-body)', color: 'var(--text-soft)', margin: '0 0 10px', lineHeight: 1.65, maxWidth: 760 }}>{children}</p>
  );
  const Li = ({ children }) => (
    <li style={{ font: 'var(--type-body-sm)', color: 'var(--text-soft)', margin: '0 0 6px', lineHeight: 1.6 }}>{children}</li>
  );
  const strong = { color: 'var(--text)', fontWeight: 600 };
  const link = { color: 'var(--accent-hover)', cursor: 'pointer' };
  const rich = (key, vars) => (window.DXRich ? window.DXRich(t(key, vars), { onNav, strong, link }) : t(key, vars));
  const cell = { padding: '9px 14px', borderBottom: '1px solid var(--border-subtle)', font: 'var(--type-body-sm)', color: 'var(--text-soft)', textAlign: 'left', verticalAlign: 'top' };
  const th = { ...cell, font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' };

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        {onNav && <button onClick={() => onNav('home')} style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>{t('← Accueil')}</button>}
      </div>
      <h1 style={{ font: 'var(--type-h1)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: '0 0 6px' }}>{t('Politique de confidentialité')}</h1>
      <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: 0 }}>{t('Dernière mise à jour :')} {UPDATED}</p>

      <P>{rich("**DispersionX** est une plateforme pédagogique d'analyse et de construction de stratégies d'options (dispersion). Cette politique explique quelles données nous traitons, pourquoi, et quels sont vos droits. Nous appliquons une logique de **minimisation** : nous ne collectons que le strict nécessaire au fonctionnement du service, et **aucune donnée n'est vendue** ni utilisée à des fins publicitaires.")}</P>

      <H>{t('1. Responsable du traitement')}</H>
      <P>{rich("Le responsable du traitement est **{responsable}**{statut}. Coordonnées complètes dans les [Mentions légales](nav:legal). Pour toute question relative à vos données ou à l'exercice de vos droits : [{email}](mailto:{email}).", { responsable: L.editeurNom || "l'éditeur de DispersionX", statut: L.editeurStatut ? ` (${L.editeurStatut})` : '', email: CONTACT })}</P>

      <H>{t('2. Données que nous traitons')}</H>
      <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', margin: '6px 0 4px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: 'var(--bg-elevated)' }}><th style={th}>{t('Catégorie')}</th><th style={th}>{t('Exemples')}</th><th style={th}>{t('Finalité')}</th></tr></thead>
          <tbody>
            <tr><td style={cell}>{t('Compte')}</td><td style={cell}>{t("Adresse e-mail, mot de passe (haché par notre hébergeur d'authentification)")}</td><td style={cell}>{t('Créer et sécuriser votre compte, synchroniser vos données entre appareils')}</td></tr>
            <tr><td style={cell}>{t('Contenu')}</td><td style={cell}>{t("Listes d'actions, stratégies construites, positions suivies et leurs snapshots")}</td><td style={cell}>{t('Fournir le service (analyse, suivi de positions)')}</td></tr>
            <tr><td style={cell}>{t('Abonnement Pro')}</td><td style={cell}>{t('Identifiants client/abonnement Stripe, statut, période')}</td><td style={cell}>{t("Gérer l'abonnement payant (le paiement est traité par Stripe, nous ne stockons aucune donnée de carte)")}</td></tr>
            <tr><td style={cell}>{t('Techniques')}</td><td style={cell}>{t('Journaux serveur (horodatage, statut), stockage local du navigateur')}</td><td style={cell}>{t('Sécurité, prévention des abus, bon fonctionnement')}</td></tr>
          </tbody>
        </table>
      </div>
      <P>{rich("En **mode invité** (non connecté), vos listes et stratégies restent **uniquement sur votre appareil** (stockage local du navigateur) et ne transitent pas par nos serveurs.")}</P>

      <H>{t('3. Bases légales (RGPD, art. 6)')}</H>
      <ul style={{ margin: '0 0 6px', paddingLeft: 20 }}>
        <Li>{rich("**Exécution du contrat** : compte, synchronisation, abonnement Pro.")}</Li>
        <Li>{rich("**Intérêt légitime** : sécurité, prévention des abus, journaux techniques.")}</Li>
        <Li>{rich("**Obligation légale** : conservation des justificatifs de paiement.")}</Li>
      </ul>

      <H>{t('4. Sous-traitants et destinataires')}</H>
      <P>{rich("Nous faisons appel à des prestataires qui n'agissent que sur nos instructions :")}</P>
      <ul style={{ margin: '0 0 6px', paddingLeft: 20 }}>
        <Li>{rich("**Supabase** — authentification et base de données (comptes, listes, stratégies, positions). Accès protégé par des règles de sécurité au niveau des lignes (RLS) : chacun n'accède qu'à ses propres données.")}</Li>
        <Li>{rich("**Vercel** — hébergement du site et des fonctions serveur.")}</Li>
        <Li>{rich("**Stripe** — traitement des paiements de l'abonnement Pro (nous ne voyons ni ne stockons vos données bancaires).")}</Li>
        <Li>{rich("**Sources de données de marché** — Cboe (cotations différées 15 min), Yahoo Finance, Finnhub. Les requêtes partent de nos serveurs, pas de votre navigateur ; nous ne leur transmettons aucune donnée personnelle.")}</Li>
        <Li>{rich("**Resend** — envoi d'e-mails d'alerte, uniquement si vous activez une alerte.")}</Li>
        <Li>{rich("**Vercel Web Analytics** — mesure d'audience sans cookie et sans identifiant personnel (pages vues, événements agrégés), servie depuis notre propre domaine. Aucune donnée n'est revendue ni recoupée entre sites.")}</Li>
      </ul>

      <H>{t('5. Cookies et stockage local')}</H>
      <P>{rich("DispersionX **n'utilise pas de cookies publicitaires ni de traceurs tiers**. Nous utilisons le **stockage local** de votre navigateur (localStorage) pour mémoriser vos préférences (thème, mode d'affichage) et, en mode invité, vos listes et stratégies. L'authentification Supabase conserve un jeton de session pour vous garder connecté. Ces éléments sont strictement nécessaires au fonctionnement et ne servent pas au pistage.")}</P>
      <P>{rich("Notre **mesure d'audience** (Vercel Web Analytics) fonctionne **sans cookie** et sans identifiant : elle relève de la mesure d'audience exemptée de consentement au sens des recommandations de la CNIL. Vous pouvez néanmoins la désactiver depuis vos **Préférences**.")}</P>

      <H>{t('6. Durée de conservation')}</H>
      <ul style={{ margin: '0 0 6px', paddingLeft: 20 }}>
        <Li>{rich("Données de compte et contenu : tant que votre compte est actif.")}</Li>
        <Li>{rich("À la suppression de votre compte : effacement des données associées (sauf obligations légales, ex. justificatifs de paiement).")}</Li>
        <Li>{rich("Données locales du navigateur : conservées jusqu'à ce que vous les effaciez (déconnexion, vidage du cache).")}</Li>
      </ul>

      <H>{t('7. Transferts hors Union européenne')}</H>
      <P>{rich("Certains prestataires (ex. Stripe) peuvent traiter des données en dehors de l'UE. Ces transferts sont encadrés par des garanties appropriées (clauses contractuelles types). Vous pouvez choisir la région d'hébergement de votre base Supabase.")}</P>

      <H>{t('8. Vos droits')}</H>
      <P>{rich("Conformément au RGPD, vous disposez des droits d'accès, de rectification, d'effacement, de limitation, d'opposition et de portabilité :")}</P>
      <ul style={{ margin: '0 0 6px', paddingLeft: 20 }}>
        <Li>{rich("**Directement dans l'app** : modifier/supprimer vos listes, stratégies et positions ; **télécharger toutes vos données** en JSON (Préférences → Confidentialité → « Télécharger mes données », portabilité art. 20) ; **supprimer votre compte** (Préférences → Supprimer mon compte, art. 17) ; gérer votre abonnement via le portail Stripe.")}</Li>
        <Li>{rich("**Par e-mail** : vous pouvez aussi exercer ces droits (accès, portabilité, effacement) en écrivant à [{email}](mailto:{email}).", { email: CONTACT })}</Li>
        <Li>{rich("Vous pouvez introduire une réclamation auprès de l'autorité de contrôle compétente (en France, la CNIL).")}</Li>
      </ul>

      <H>{t('9. Sécurité')}</H>
      <P>{rich("Les échanges sont chiffrés en transit (HTTPS/TLS). L'accès aux données est cloisonné par utilisateur (RLS). Les clés sensibles (paiement, service) restent côté serveur et ne sont jamais exposées au navigateur. Voir le détail de nos mesures dans le fichier **SECURITY.md** du projet.")}</P>

      <H>{t('10. Données de marché & avertissement')}</H>
      <P>{rich("Les données affichées sont **différées (15 min)** et parfois estimées. DispersionX est un outil **pédagogique** et ne constitue **pas un conseil en investissement**. Aucune décision financière ne devrait reposer sur ces seules informations.")}</P>

      <H>{t('11. Modifications')}</H>
      <P>{rich("Cette politique peut évoluer. La date de dernière mise à jour figure en haut de page ; en cas de changement important, nous vous en informerons dans l'application.")}</P>

      <div style={{ margin: '28px 0 8px', padding: '14px 18px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
        <span style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}>
          {rich("Une question sur vos données ? Écrivez-nous : [{email}](mailto:{email})", { email: CONTACT })}
        </span>
      </div>
    </div>
  );
}

window.Privacy = Privacy;
