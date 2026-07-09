/* ─── Conditions Générales de Vente (CGV) ─────────────────────────────────────
   Régissent l'abonnement Pro (vente à distance à un consommateur). Franchise en
   base de TVA (art. 293 B CGI). Couvre : prix, paiement Stripe, renouvellement
   tacite, résiliation en ligne (L215-1-1), droit de rétractation (L221-18/28),
   garantie légale de conformité, médiation (L612-1). Identité : window.DXLegal. */
function Sales({ onNav }) {
  const L = window.DXLegal || {};

  const H = ({ children }) => (
    <h2 style={{ font: 'var(--type-h3)', color: 'var(--text)', margin: '26px 0 8px', letterSpacing: 'var(--track-snug)' }}>{children}</h2>
  );
  const P = ({ children }) => (
    <p style={{ font: 'var(--type-body)', color: 'var(--text-soft)', margin: '0 0 10px', lineHeight: 1.65, maxWidth: 760 }}>{children}</p>
  );
  const Li = ({ children }) => (
    <li style={{ font: 'var(--type-body-sm)', color: 'var(--text-soft)', margin: '0 0 6px', lineHeight: 1.6 }}>{children}</li>
  );
  const strong = { color: 'var(--text)', fontWeight: 600 };
  const link = { color: 'var(--accent-hover)', cursor: 'pointer' };

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        {onNav && <button onClick={() => onNav('home')} style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>← Accueil</button>}
      </div>
      <h1 style={{ font: 'var(--type-h1)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: '0 0 6px' }}>Conditions Générales de Vente</h1>
      <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: 0 }}>Dernière mise à jour : {L.updated}</p>

      <H>1. Objet et champ d'application</H>
      <P>
        Les présentes CGV régissent la vente de l'abonnement <span style={strong}>DispersionX Pro</span> (le
        « Service Pro ») par {L.editeurNom} ({L.editeurStatut}) au consommateur (l'« Abonné »). Elles s'appliquent à
        l'exclusion de toute autre condition et sont acceptées par l'Abonné avant tout paiement.
      </P>

      <H>2. Vendeur</H>
      <P>
        {L.editeurNom} — {L.adresse} — SIRET {L.siret} — {L.tvaMention} — contact&nbsp;:
        <a href={`mailto:${L.email}`} style={{ ...link, marginLeft: 4 }}>{L.email}</a>. Détails dans les
        {onNav ? <a onClick={() => onNav('legal')} style={{ ...link, marginLeft: 4 }}>Mentions légales</a> : ' Mentions légales'}.
      </P>

      <H>3. Service Pro</H>
      <P>
        L'abonnement Pro débloque des fonctionnalités <span style={strong}>d'analyse avancées</span> (auto-chercheur
        d'opportunités, contexte de marché, suivi de positions, journal, rapports, export vers un logiciel de
        courtier). Il s'agit d'un service <span style={strong}>d'information et d'analyse</span> : il ne comprend
        aucune exécution d'ordre, aucune gestion de portefeuille et aucun conseil personnalisé (voir les
        {onNav ? <a onClick={() => onNav('terms')} style={{ ...link, marginLeft: 4 }}>CGU</a> : ' CGU'}, §8).
      </P>

      <H>4. Prix</H>
      <ul style={{ margin: '0 0 6px', paddingLeft: 20 }}>
        <Li>Abonnement mensuel&nbsp;: <span style={strong}>{L.prixMensuel} par {L.periode}</span>.</Li>
        <Li><span style={strong}>{L.tvaMention}</span> — les prix sont donc nets, sans TVA à ajouter.</Li>
        <Li>Le prix affiché au moment de la commande prévaut. Des codes promotionnels peuvent s'appliquer.</Li>
        <Li>L'éditeur peut modifier ses tarifs&nbsp;; le nouveau prix ne s'applique qu'aux échéances postérieures à l'information de l'Abonné.</Li>
      </ul>

      <H>5. Souscription</H>
      <P>
        La souscription nécessite un compte et s'effectue en ligne via notre prestataire de paiement
        <span style={strong}> Stripe</span>. La commande est ferme après acceptation des présentes CGV (case à
        cocher / clic de confirmation) et validation du paiement. Un e-mail de confirmation est adressé par Stripe.
      </P>

      <H>6. Paiement</H>
      <P>
        Le paiement est traité par <span style={strong}>Stripe Payments Europe, Ltd.</span> L'éditeur ne collecte ni
        ne conserve aucune donnée de carte bancaire. En souscrivant, l'Abonné autorise le
        <span style={strong}> prélèvement récurrent</span> du montant de l'abonnement à chaque échéance. En cas
        d'échec de paiement, l'accès Pro peut être suspendu jusqu'à régularisation.
      </P>

      <H>7. Durée et renouvellement automatique</H>
      <P>
        L'abonnement est conclu pour une durée d'<span style={strong}>un mois</span>, <span style={strong}>reconduit
        tacitement</span> de mois en mois par prélèvement automatique, tant que l'Abonné ne résilie pas.
        Conformément à l'article L215-1 du Code de la consommation, l'Abonné peut mettre fin à la reconduction à tout
        moment (voir §8).
      </P>

      <H>8. Résiliation</H>
      <P>
        L'Abonné peut résilier <span style={strong}>à tout moment, en ligne et en quelques clics</span>, depuis
        <span style={strong}> Préférences → Gérer l'abonnement</span> (portail Stripe), conformément à l'article
        L215-1-1 du Code de la consommation. La résiliation prend effet à la <span style={strong}>fin de la période
        en cours</span> déjà payée&nbsp;: l'accès Pro reste actif jusqu'à cette date, sans nouveau prélèvement.
        Aucun engagement de durée n'est imposé.
      </P>

      <H>9. Droit de rétractation</H>
      <P>
        Conformément aux articles L221-18 et suivants du Code de la consommation, l'Abonné dispose d'un délai de
        <span style={strong}> quatorze (14) jours</span> pour se rétracter, sans motif.
      </P>
      <P>
        Le Service Pro étant un contenu/service numérique fourni immédiatement, l'Abonné, en cochant la case
        correspondante lors de la commande, <span style={strong}>demande expressément l'accès immédiat</span> et
        reconnaît que son droit de rétractation sera <span style={strong}>perdu une fois le service pleinement
        exécuté</span> (art. L221-28). Indépendamment de ce droit, l'éditeur offre une
        <span style={strong}> garantie commerciale « satisfait ou remboursé » de {L.garantieJours} jours</span>&nbsp;:
        remboursement intégral sur simple demande à <a href={`mailto:${L.email}`} style={link}>{L.email}</a> dans les
        {` ${L.garantieJours} `}jours suivant le premier paiement.
      </P>

      <H>10. Remboursement</H>
      <P>
        Tout remboursement dû (rétractation ou garantie commerciale) est effectué via Stripe, sur le moyen de
        paiement utilisé, dans un délai maximal de 14 jours suivant l'acceptation de la demande.
      </P>

      <H>11. Garantie légale de conformité</H>
      <P>
        L'Abonné bénéficie de la <span style={strong}>garantie légale de conformité</span> applicable aux contenus et
        services numériques (art. L224-25-1 et suivants du Code de la consommation)&nbsp;: le Service doit être
        conforme à sa description et l'éditeur répond des défauts de conformité existants. Ces garanties légales
        s'appliquent indépendamment de toute garantie commerciale.
      </P>

      <H>12. Facturation</H>
      <P>
        Un justificatif / reçu est disponible pour chaque paiement via le portail Stripe (Préférences → Gérer
        l'abonnement). Compte tenu de la franchise en base de TVA, aucune TVA n'est facturée.
      </P>

      <H>13. Données personnelles</H>
      <P>
        Les traitements liés à l'abonnement (compte, identifiants Stripe, statut) sont décrits dans la
        {onNav ? <a onClick={() => onNav('privacy')} style={{ ...link, marginLeft: 4 }}>Politique de confidentialité</a> : ' Politique de confidentialité'}.
      </P>

      <H>14. Service client et réclamations</H>
      <P>
        Pour toute réclamation, contactez d'abord le service client&nbsp;:
        <a href={`mailto:${L.email}`} style={{ ...link, marginLeft: 4 }}>{L.email}</a>. Une réponse est apportée dans
        les meilleurs délais.
      </P>

      <H>15. Médiation de la consommation</H>
      <P>
        Conformément à l'article L612-1 du Code de la consommation, après une réclamation écrite restée infructueuse,
        l'Abonné peut recourir gratuitement au médiateur de la consommation dont relève l'éditeur&nbsp;:
        <span style={strong}> {L.mediateurNom}</span> — {L.mediateurAdresse} — {L.mediateurUrl}.
      </P>

      <H>16. Responsabilité</H>
      <P>
        La responsabilité de l'éditeur au titre du Service Pro s'apprécie dans les limites fixées par les
        {onNav ? <a onClick={() => onNav('terms')} style={{ ...link, marginLeft: 4 }}>CGU</a> : ' CGU'} (§8 et §9),
        notamment l'absence de conseil en investissement et le caractère différé/estimé des données.
      </P>

      <H>17. Droit applicable et litiges</H>
      <P>
        Les présentes CGV sont soumises au <span style={strong}>droit français</span>. À défaut de résolution amiable
        ou par médiation, les tribunaux compétents sont ceux du ressort de {L.villeTribunal}, sous réserve des règles
        d'ordre public protégeant le consommateur.
      </P>

      <H>18. Modification des CGV</H>
      <P>
        L'éditeur peut modifier les présentes CGV&nbsp;; les conditions applicables sont celles en vigueur à la date
        de la commande (ou de son renouvellement), l'Abonné étant informé de tout changement substantiel avant
        l'échéance suivante.
      </P>
    </div>
  );
}

window.Sales = Sales;
