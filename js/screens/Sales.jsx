/* ─── Conditions Générales de Vente (CGV) ─────────────────────────────────────
   Régissent l'abonnement Pro (vente à distance à un consommateur). Franchise en
   base de TVA (art. 293 B CGI). Couvre : prix, paiement Stripe, renouvellement
   tacite, résiliation en ligne (L215-1-1), droit de rétractation (L221-18/28),
   garantie légale de conformité, médiation (L612-1). Identité : window.DXLegal.
   Traduit via window.t (+ window.DXRich pour le gras/liens en ligne). */
function Sales({ onNav }) {
  const L = window.DXLegal || {};
  const t = window.t || ((s) => s);

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
  const rich = (key, vars) => (window.DXRich ? window.DXRich(t(key, vars), { onNav, strong, link }) : t(key, vars));

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        {onNav && <button onClick={() => onNav('home')} style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>{t('← Accueil')}</button>}
      </div>
      <h1 style={{ font: 'var(--type-h1)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: '0 0 6px' }}>{t('Conditions Générales de Vente')}</h1>
      <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: 0 }}>{t('Dernière mise à jour :')} {L.updated}</p>

      <H>{t("1. Objet et champ d'application")}</H>
      <P>{rich("Les présentes CGV régissent la vente de l'abonnement **DispersionX Pro** (le « Service Pro ») par {editeur} ({statut}) au consommateur (l'« Abonné »). Elles s'appliquent à l'exclusion de toute autre condition et sont acceptées par l'Abonné avant tout paiement.", { editeur: L.editeurNom, statut: L.editeurStatut })}</P>

      <H>{t('2. Vendeur')}</H>
      <P>{rich("{editeur} — {adresse} — SIRET {siret} — {tva} — contact : [{email}](mailto:{email}). Détails dans les [Mentions légales](nav:legal).", { editeur: L.editeurNom, adresse: L.adresse, siret: L.siret, tva: L.tvaMention, email: L.email })}</P>

      <H>{t('3. Service Pro')}</H>
      <P>{rich("L'abonnement Pro débloque des fonctionnalités **d'analyse avancées** (auto-chercheur d'opportunités, contexte de marché, suivi de positions, journal, rapports, export vers un logiciel de courtier). Il s'agit d'un service **d'information et d'analyse** : il ne comprend aucune exécution d'ordre, aucune gestion de portefeuille et aucun conseil personnalisé (voir les [CGU](nav:terms), §8).")}</P>

      <H>{t('4. Prix')}</H>
      <ul style={{ margin: '0 0 6px', paddingLeft: 20 }}>
        <Li>{rich("Abonnement mensuel : **{prix} par {periode}**.", { prix: L.prixMensuel, periode: L.periode })}</Li>
        <Li>{rich("**{tva}** — les prix sont donc nets, sans TVA à ajouter.", { tva: L.tvaMention })}</Li>
        <Li>{rich("Le prix affiché au moment de la commande prévaut. Des codes promotionnels peuvent s'appliquer.")}</Li>
        <Li>{rich("L'éditeur peut modifier ses tarifs ; le nouveau prix ne s'applique qu'aux échéances postérieures à l'information de l'Abonné.")}</Li>
      </ul>

      <H>{t('5. Souscription')}</H>
      <P>{rich("La souscription nécessite un compte et s'effectue en ligne via notre prestataire de paiement **Stripe**. La commande est ferme après acceptation des présentes CGV (case à cocher / clic de confirmation) et validation du paiement. Un e-mail de confirmation est adressé par Stripe.")}</P>

      <H>{t('6. Paiement')}</H>
      <P>{rich("Le paiement est traité par **Stripe Payments Europe, Ltd.** L'éditeur ne collecte ni ne conserve aucune donnée de carte bancaire. En souscrivant, l'Abonné autorise le **prélèvement récurrent** du montant de l'abonnement à chaque échéance. En cas d'échec de paiement, l'accès Pro peut être suspendu jusqu'à régularisation.")}</P>

      <H>{t('7. Durée et renouvellement automatique')}</H>
      <P>{rich("L'abonnement est conclu pour une durée d'**un mois**, **reconduit tacitement** de mois en mois par prélèvement automatique, tant que l'Abonné ne résilie pas. Conformément à l'article L215-1 du Code de la consommation, l'Abonné peut mettre fin à la reconduction à tout moment (voir §8).")}</P>

      <H>{t('8. Résiliation')}</H>
      <P>{rich("L'Abonné peut résilier **à tout moment, en ligne et en quelques clics**, depuis **Préférences → Gérer l'abonnement** (portail Stripe), conformément à l'article L215-1-1 du Code de la consommation. La résiliation prend effet à la **fin de la période en cours** déjà payée : l'accès Pro reste actif jusqu'à cette date, sans nouveau prélèvement. Aucun engagement de durée n'est imposé.")}</P>

      <H>{t('9. Droit de rétractation')}</H>
      <P>{rich("Conformément aux articles L221-18 et suivants du Code de la consommation, l'Abonné dispose d'un délai de **quatorze (14) jours** pour se rétracter, sans motif.")}</P>
      <P>{rich("Le Service Pro étant un contenu/service numérique fourni immédiatement, l'Abonné, en cochant la case correspondante lors de la commande, **demande expressément l'accès immédiat** et reconnaît que son droit de rétractation sera **perdu une fois le service pleinement exécuté** (art. L221-28). Indépendamment de ce droit, l'éditeur offre une **garantie commerciale « satisfait ou remboursé » de {garantie} jours** : remboursement intégral sur simple demande à [{email}](mailto:{email}) dans les {garantie} jours suivant le premier paiement.", { garantie: L.garantieJours, email: L.email })}</P>

      <H>{t('10. Remboursement')}</H>
      <P>{rich("Tout remboursement dû (rétractation ou garantie commerciale) est effectué via Stripe, sur le moyen de paiement utilisé, dans un délai maximal de 14 jours suivant l'acceptation de la demande.")}</P>

      <H>{t('11. Garantie légale de conformité')}</H>
      <P>{rich("L'Abonné bénéficie de la **garantie légale de conformité** applicable aux contenus et services numériques (art. L224-25-1 et suivants du Code de la consommation) : le Service doit être conforme à sa description et l'éditeur répond des défauts de conformité existants. Ces garanties légales s'appliquent indépendamment de toute garantie commerciale.")}</P>

      <H>{t('12. Facturation')}</H>
      <P>{rich("Un justificatif / reçu est disponible pour chaque paiement via le portail Stripe (Préférences → Gérer l'abonnement). Compte tenu de la franchise en base de TVA, aucune TVA n'est facturée.")}</P>

      <H>{t('13. Données personnelles')}</H>
      <P>{rich("Les traitements liés à l'abonnement (compte, identifiants Stripe, statut) sont décrits dans la [Politique de confidentialité](nav:privacy).")}</P>

      <H>{t('14. Service client et réclamations')}</H>
      <P>{rich("Pour toute réclamation, contactez d'abord le service client : [{email}](mailto:{email}). Une réponse est apportée dans les meilleurs délais.", { email: L.email })}</P>

      <H>{t('15. Médiation de la consommation')}</H>
      <P>{rich("Conformément à l'article L612-1 du Code de la consommation, après une réclamation écrite restée infructueuse, l'Abonné peut recourir gratuitement au médiateur de la consommation dont relève l'éditeur : **{mediateurNom}** — {mediateurAdresse} — {mediateurUrl}.", { mediateurNom: L.mediateurNom, mediateurAdresse: L.mediateurAdresse, mediateurUrl: L.mediateurUrl })}</P>

      <H>{t('16. Responsabilité')}</H>
      <P>{rich("La responsabilité de l'éditeur au titre du Service Pro s'apprécie dans les limites fixées par les [CGU](nav:terms) (§8 et §9), notamment l'absence de conseil en investissement et le caractère différé/estimé des données.")}</P>

      <H>{t('17. Droit applicable et litiges')}</H>
      <P>{rich("Les présentes CGV sont soumises au **droit français**. À défaut de résolution amiable ou par médiation, les tribunaux compétents sont ceux du ressort de {ville}, sous réserve des règles d'ordre public protégeant le consommateur.", { ville: L.villeTribunal })}</P>

      <H>{t('18. Modification des CGV')}</H>
      <P>{rich("L'éditeur peut modifier les présentes CGV ; les conditions applicables sont celles en vigueur à la date de la commande (ou de son renouvellement), l'Abonné étant informé de tout changement substantiel avant l'échéance suivante.")}</P>
    </div>
  );
}

window.Sales = Sales;
