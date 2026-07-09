/* ─── Politique de confidentialité (RGPD) ─────────────────────────
   Écran statique, accessible depuis la sidebar et le footer du Landing.
   Contact et identité du responsable = placeholders à compléter avant
   lancement public (marqués « à compléter »). */
function Privacy({ onNav }) {
  const L = window.DXLegal || {};
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
  const cell = { padding: '9px 14px', borderBottom: '1px solid var(--border-subtle)', font: 'var(--type-body-sm)', color: 'var(--text-soft)', textAlign: 'left', verticalAlign: 'top' };
  const th = { ...cell, font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' };

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        {onNav && <button onClick={() => onNav('home')} style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>← Accueil</button>}
      </div>
      <h1 style={{ font: 'var(--type-h1)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: '0 0 6px' }}>Politique de confidentialité</h1>
      <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: 0 }}>Dernière mise à jour : {UPDATED}</p>

      <P>
        <span style={{ ...strong }}>DispersionX</span> est une plateforme pédagogique d'analyse et de construction de
        stratégies d'options (dispersion). Cette politique explique quelles données nous traitons, pourquoi, et
        quels sont vos droits. Nous appliquons une logique de <span style={strong}>minimisation</span> : nous ne
        collectons que le strict nécessaire au fonctionnement du service, et <span style={strong}>aucune donnée
        n'est vendue</span> ni utilisée à des fins publicitaires.
      </P>

      <H>1. Responsable du traitement</H>
      <P>
        Le responsable du traitement est <span style={strong}>{L.editeurNom || "l'éditeur de DispersionX"}</span>
        {L.editeurStatut ? ` (${L.editeurStatut})` : ''}. Coordonnées complètes dans les
        {onNav ? <a onClick={() => onNav('legal')} style={{ color: 'var(--accent-hover)', cursor: 'pointer', marginLeft: 4 }}>Mentions légales</a> : ' Mentions légales'}.
        Pour toute question relative à vos données ou à l'exercice de vos droits :
        <a href={`mailto:${CONTACT}`} style={{ color: 'var(--accent-hover)', marginLeft: 4 }}>{CONTACT}</a>.
      </P>

      <H>2. Données que nous traitons</H>
      <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', margin: '6px 0 4px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: 'var(--bg-elevated)' }}><th style={th}>Catégorie</th><th style={th}>Exemples</th><th style={th}>Finalité</th></tr></thead>
          <tbody>
            <tr><td style={cell}>Compte</td><td style={cell}>Adresse e-mail, mot de passe (haché par notre hébergeur d'authentification)</td><td style={cell}>Créer et sécuriser votre compte, synchroniser vos données entre appareils</td></tr>
            <tr><td style={cell}>Contenu</td><td style={cell}>Listes d'actions, stratégies construites, positions suivies et leurs snapshots</td><td style={cell}>Fournir le service (analyse, suivi de positions)</td></tr>
            <tr><td style={cell}>Abonnement Pro</td><td style={cell}>Identifiants client/abonnement Stripe, statut, période</td><td style={cell}>Gérer l'abonnement payant (le paiement est traité par Stripe, nous ne stockons aucune donnée de carte)</td></tr>
            <tr><td style={cell}>Techniques</td><td style={cell}>Journaux serveur (horodatage, statut), stockage local du navigateur</td><td style={cell}>Sécurité, prévention des abus, bon fonctionnement</td></tr>
          </tbody>
        </table>
      </div>
      <P>
        En <span style={strong}>mode invité</span> (non connecté), vos listes et stratégies restent
        <span style={strong}> uniquement sur votre appareil</span> (stockage local du navigateur) et ne transitent pas
        par nos serveurs.
      </P>

      <H>3. Bases légales (RGPD, art. 6)</H>
      <ul style={{ margin: '0 0 6px', paddingLeft: 20 }}>
        <Li><span style={strong}>Exécution du contrat</span> : compte, synchronisation, abonnement Pro.</Li>
        <Li><span style={strong}>Intérêt légitime</span> : sécurité, prévention des abus, journaux techniques.</Li>
        <Li><span style={strong}>Obligation légale</span> : conservation des justificatifs de paiement.</Li>
      </ul>

      <H>4. Sous-traitants et destinataires</H>
      <P>Nous faisons appel à des prestataires qui n'agissent que sur nos instructions :</P>
      <ul style={{ margin: '0 0 6px', paddingLeft: 20 }}>
        <Li><span style={strong}>Supabase</span> — authentification et base de données (comptes, listes, stratégies, positions). Accès protégé par des règles de sécurité au niveau des lignes (RLS) : chacun n'accède qu'à ses propres données.</Li>
        <Li><span style={strong}>Vercel</span> — hébergement du site et des fonctions serveur.</Li>
        <Li><span style={strong}>Stripe</span> — traitement des paiements de l'abonnement Pro (nous ne voyons ni ne stockons vos données bancaires).</Li>
        <Li><span style={strong}>Sources de données de marché</span> — Cboe (cotations différées 15 min), Yahoo Finance, Finnhub. Les requêtes partent de <em>nos serveurs</em>, pas de votre navigateur ; nous ne leur transmettons aucune donnée personnelle.</Li>
        <Li><span style={strong}>Resend</span> — envoi d'e-mails d'alerte, uniquement si vous activez une alerte.</Li>
        <Li><span style={strong}>Vercel Web Analytics</span> — mesure d'audience <em>sans cookie</em> et sans identifiant personnel (pages vues, événements agrégés), servie depuis notre propre domaine. Aucune donnée n'est revendue ni recoupée entre sites.</Li>
      </ul>

      <H>5. Cookies et stockage local</H>
      <P>
        DispersionX <span style={strong}>n'utilise pas de cookies publicitaires ni de traceurs tiers</span>. Nous
        utilisons le <span style={strong}>stockage local</span> de votre navigateur (localStorage) pour mémoriser vos
        préférences (thème, mode d'affichage) et, en mode invité, vos listes et stratégies. L'authentification
        Supabase conserve un jeton de session pour vous garder connecté. Ces éléments sont strictement nécessaires
        au fonctionnement et ne servent pas au pistage.
      </P>
      <P>
        Notre <span style={strong}>mesure d'audience</span> (Vercel Web Analytics) fonctionne <span style={strong}>sans
        cookie</span> et sans identifiant : elle relève de la mesure d'audience exemptée de consentement au sens des
        recommandations de la CNIL. Vous pouvez néanmoins la désactiver depuis vos <span style={strong}>Préférences</span>.
      </P>

      <H>6. Durée de conservation</H>
      <ul style={{ margin: '0 0 6px', paddingLeft: 20 }}>
        <Li>Données de compte et contenu : tant que votre compte est actif.</Li>
        <Li>À la suppression de votre compte : effacement des données associées (sauf obligations légales, ex. justificatifs de paiement).</Li>
        <Li>Données locales du navigateur : conservées jusqu'à ce que vous les effaciez (déconnexion, vidage du cache).</Li>
      </ul>

      <H>7. Transferts hors Union européenne</H>
      <P>
        Certains prestataires (ex. Stripe) peuvent traiter des données en dehors de l'UE. Ces transferts sont
        encadrés par des garanties appropriées (clauses contractuelles types). Vous pouvez choisir la région
        d'hébergement de votre base Supabase.
      </P>

      <H>8. Vos droits</H>
      <P>Conformément au RGPD, vous disposez des droits d'accès, de rectification, d'effacement, de limitation, d'opposition et de portabilité :</P>
      <ul style={{ margin: '0 0 6px', paddingLeft: 20 }}>
        <Li><span style={strong}>Directement dans l'app</span> : modifier/supprimer vos listes, stratégies et positions ; exporter vos listes (bouton d'export) ; gérer votre abonnement via le portail Stripe.</Li>
        <Li><span style={strong}>Par e-mail</span> : demander l'accès, la portabilité ou la suppression complète de votre compte à <a href={`mailto:${CONTACT}`} style={{ color: 'var(--accent-hover)' }}>{CONTACT}</a>.</Li>
        <Li>Vous pouvez introduire une réclamation auprès de l'autorité de contrôle compétente (en France, la CNIL).</Li>
      </ul>

      <H>9. Sécurité</H>
      <P>
        Les échanges sont chiffrés en transit (HTTPS/TLS). L'accès aux données est cloisonné par utilisateur (RLS).
        Les clés sensibles (paiement, service) restent côté serveur et ne sont jamais exposées au navigateur. Voir
        le détail de nos mesures dans le fichier <span style={strong}>SECURITY.md</span> du projet.
      </P>

      <H>10. Données de marché & avertissement</H>
      <P>
        Les données affichées sont <span style={strong}>différées (15 min)</span> et parfois estimées. DispersionX
        est un outil <span style={strong}>pédagogique</span> et ne constitue <span style={strong}>pas un conseil en
        investissement</span>. Aucune décision financière ne devrait reposer sur ces seules informations.
      </P>

      <H>11. Modifications</H>
      <P>
        Cette politique peut évoluer. La date de dernière mise à jour figure en haut de page ; en cas de changement
        important, nous vous en informerons dans l'application.
      </P>

      <div style={{ margin: '28px 0 8px', padding: '14px 18px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
        <span style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}>
          Une question sur vos données ? Écrivez-nous : <a href={`mailto:${CONTACT}`} style={{ color: 'var(--accent-hover)' }}>{CONTACT}</a>
        </span>
      </div>
    </div>
  );
}

window.Privacy = Privacy;
