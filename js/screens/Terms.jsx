/* ─── Conditions Générales d'Utilisation (CGU) ────────────────────────────────
   Règles d'usage du service (distinctes des CGV, qui régissent l'achat).
   Identité lue depuis window.DXLegal. Disclaimer financier renforcé (non-conseil).
   Traduit via window.t (+ window.DXRich pour le gras/liens en ligne). */
function Terms({ onNav }) {
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
  // Rend une chaîne traduite balisée (**gras**, [libellé](nav:route|mailto:x)).
  const rich = (key, vars) => (window.DXRich ? window.DXRich(t(key, vars), { onNav, strong, link }) : t(key, vars));

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        {onNav && <button onClick={() => onNav('home')} style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>{t('← Accueil')}</button>}
      </div>
      <h1 style={{ font: 'var(--type-h1)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: '0 0 6px' }}>{t("Conditions Générales d'Utilisation")}</h1>
      <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: 0 }}>{t('Dernière mise à jour :')} {L.updated}</p>

      <H>{t('1. Objet')}</H>
      <P>{rich("Les présentes CGU définissent les conditions d'accès et d'utilisation du service **DispersionX** (le « Service »), édité par {editeur}. L'achat d'un abonnement Pro est régi par les [Conditions Générales de Vente](nav:sales).", { editeur: L.editeurNom })}</P>

      <H>{t('2. Acceptation')}</H>
      <P>{rich("L'utilisation du Service implique l'acceptation pleine et entière des présentes CGU. Lors de la création d'un compte, l'utilisateur atteste les avoir lues et acceptées. En cas de désaccord, l'utilisateur doit cesser d'utiliser le Service.")}</P>

      <H>{t('3. Accès au Service')}</H>
      <ul style={{ margin: '0 0 6px', paddingLeft: 20 }}>
        <Li>{rich("**Mode invité** : accessible sans compte ; les données restent stockées localement dans le navigateur.")}</Li>
        <Li>{rich("**Compte gratuit** : donne accès aux fonctionnalités de base et à la synchronisation.")}</Li>
        <Li>{rich("**Abonnement Pro** : débloque des fonctionnalités d'analyse avancées (voir CGV).")}</Li>
      </ul>
      <P>{rich("L'accès au Service suppose un appareil connecté à Internet. Les frais de connexion sont à la charge de l'utilisateur.")}</P>

      <H>{t('4. Utilisation normale')}</H>
      <P>{rich("L'utilisateur s'engage à utiliser le Service conformément à sa destination : analyse et construction de stratégies à titre **personnel, informatif et pédagogique**. Il est responsable de la confidentialité de ses identifiants et de toute activité réalisée depuis son compte.")}</P>

      <H>{t('5. Interdictions')}</H>
      <P>{rich("Il est notamment interdit :")}</P>
      <ul style={{ margin: '0 0 6px', paddingLeft: 20 }}>
        <Li>{rich("de tenter d'accéder à des fonctionnalités payantes sans abonnement, ou de contourner les protections d'accès ;")}</Li>
        <Li>{rich("d'extraire, copier, revendre ou rediffuser massivement les données ou contenus (scraping, moissonnage) ;")}</Li>
        <Li>{rich("de désassembler, décompiler ou pratiquer la rétro-ingénierie du Service ;")}</Li>
        <Li>{rich("de perturber le fonctionnement du Service (attaques, surcharge, injection) ;")}</Li>
        <Li>{rich("d'utiliser le Service à des fins illégales ou portant atteinte aux droits de tiers.")}</Li>
      </ul>

      <H>{t('6. Propriété intellectuelle')}</H>
      <P>{rich("Le Service, sa marque, son interface, son code et ses méthodes d'analyse sont protégés et demeurent la propriété exclusive de l'éditeur. L'abonnement confère un simple **droit d'usage personnel, non exclusif et non cessible**, pour la durée de l'abonnement. Les données que vous créez (listes, stratégies) vous appartiennent.")}</P>

      <H>{t('7. Disponibilité et évolution du Service')}</H>
      <P>{rich("Le Service est fourni « en l'état », sans garantie de disponibilité continue. L'éditeur peut le suspendre pour maintenance, le faire évoluer ou en modifier les fonctionnalités à tout moment. Les **données de marché sont différées d'au moins 15 minutes** et peuvent être estimées ou incomplètes ; leur exactitude n'est pas garantie.")}</P>
      <P>{rich("Les données de marché (cotations, volatilités, chaînes d'options) proviennent de fournisseurs tiers et demeurent leur propriété. Elles sont mises à disposition pour un **usage strictement personnel** au sein du Service : toute extraction, revente, rediffusion ou redistribution à des tiers est interdite. Le Service n'affiche que des données **différées** et des **résultats calculés** (indicateurs, statistiques, graphiques), à l'exclusion de tout flux temps réel destiné à l'exécution d'ordres.")}</P>

      <H>{t('8. Avertissement — absence de conseil en investissement')}</H>
      <div style={{ margin: '4px 0 8px', padding: '14px 18px', background: 'var(--warn-soft, var(--bg-card))', border: '1px solid var(--warn, var(--border))', borderRadius: 'var(--radius-lg)' }}>
        <P>{rich("**DispersionX est un outil d'analyse générique et pédagogique.** Il ne fournit **aucune recommandation personnalisée**, ne constitue **ni un conseil en investissement, ni une incitation à investir**, et n'exécute aucune opération de marché. Les résultats, scores et « opportunités » présentés sont des indicateurs théoriques, non individualisés, qui ne tiennent pas compte de votre situation. Les instruments financiers (options, actions) présentent un risque de perte pouvant aller jusqu'à la totalité du capital engagé. Toute décision d'investissement relève de votre seule responsabilité ; consultez un professionnel habilité (conseiller en investissements financiers) avant d'agir.")}</P>
        <P>{rich("**L'éditeur n'est ni un prestataire de services d'investissement (PSI), ni un conseiller en investissements financiers (CIF)**, n'est pas enregistré à l'ORIAS ni agréé par l'AMF, et ne fournit aucun service d'investissement au sens de l'article L321-1 du Code monétaire et financier ni de la directive MiFID II. Le Service ne constitue pas du démarchage bancaire ou financier.")}</P>
      </div>

      <H>{t('9. Limitation de responsabilité')}</H>
      <P>{rich("Dans les limites permises par la loi, l'éditeur ne saurait être tenu responsable des pertes financières, pertes de données, dommages indirects ou décisions prises sur la base du Service. Rien dans les présentes ne limite la responsabilité en cas de faute lourde, de dol, ou pour ce que la loi interdit d'exclure.")}</P>

      <H>{t('10. Suspension et résiliation de compte')}</H>
      <P>{rich("L'éditeur peut suspendre ou résilier un compte en cas de manquement aux présentes CGU (notamment §5), après information lorsque cela est possible. L'utilisateur peut à tout moment supprimer ses données depuis l'application (listes, stratégies, positions) et demander la **suppression complète de son compte** en écrivant à [{email}](mailto:{email}) (traitée sous 30 jours, art. 17 RGPD) ; les modalités relatives à l'abonnement payant figurent dans les CGV.", { email: L.email })}</P>

      <H>{t('11. Données personnelles')}</H>
      <P>{rich("Les traitements sont décrits dans la [Politique de confidentialité](nav:privacy).")}</P>

      <H>{t('12. Modification des CGU')}</H>
      <P>{rich("L'éditeur peut modifier les présentes CGU. La date de mise à jour figure en haut de page ; en cas de changement substantiel, les utilisateurs en sont informés dans l'application.")}</P>

      <H>{t('13. Droit applicable et litiges')}</H>
      <P>{rich("Les présentes CGU sont régies par le **droit français**. En cas de litige, une solution amiable sera recherchée en priorité (voir la médiation prévue aux CGV). À défaut, les tribunaux français sont compétents dans les conditions du droit commun.")}</P>
    </div>
  );
}

window.Terms = Terms;
