/* ─── Conditions Générales d'Utilisation (CGU) ────────────────────────────────
   Règles d'usage du service (distinctes des CGV, qui régissent l'achat).
   Identité lue depuis window.DXLegal. Disclaimer financier renforcé (non-conseil). */
function Terms({ onNav }) {
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
      <h1 style={{ font: 'var(--type-h1)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: '0 0 6px' }}>Conditions Générales d'Utilisation</h1>
      <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: 0 }}>Dernière mise à jour : {L.updated}</p>

      <H>1. Objet</H>
      <P>
        Les présentes CGU définissent les conditions d'accès et d'utilisation du service <span style={strong}>DispersionX</span>
        (le « Service »), édité par {L.editeurNom}. L'achat d'un abonnement Pro est régi par les
        {onNav ? <a onClick={() => onNav('sales')} style={{ ...link, marginLeft: 4 }}>Conditions Générales de Vente</a> : ' Conditions Générales de Vente'}.
      </P>

      <H>2. Acceptation</H>
      <P>
        L'utilisation du Service implique l'acceptation pleine et entière des présentes CGU. Lors de la création
        d'un compte, l'utilisateur atteste les avoir lues et acceptées. En cas de désaccord, l'utilisateur doit
        cesser d'utiliser le Service.
      </P>

      <H>3. Accès au Service</H>
      <ul style={{ margin: '0 0 6px', paddingLeft: 20 }}>
        <Li><span style={strong}>Mode invité</span> : accessible sans compte ; les données restent stockées localement dans le navigateur.</Li>
        <Li><span style={strong}>Compte gratuit</span> : donne accès aux fonctionnalités de base et à la synchronisation.</Li>
        <Li><span style={strong}>Abonnement Pro</span> : débloque des fonctionnalités d'analyse avancées (voir CGV).</Li>
      </ul>
      <P>L'accès au Service suppose un appareil connecté à Internet. Les frais de connexion sont à la charge de l'utilisateur.</P>

      <H>4. Utilisation normale</H>
      <P>
        L'utilisateur s'engage à utiliser le Service conformément à sa destination : analyse et construction de
        stratégies à titre <span style={strong}>personnel, informatif et pédagogique</span>. Il est responsable de la
        confidentialité de ses identifiants et de toute activité réalisée depuis son compte.
      </P>

      <H>5. Interdictions</H>
      <P>Il est notamment interdit&nbsp;:</P>
      <ul style={{ margin: '0 0 6px', paddingLeft: 20 }}>
        <Li>de tenter d'accéder à des fonctionnalités payantes sans abonnement, ou de contourner les protections d'accès&nbsp;;</Li>
        <Li>d'extraire, copier, revendre ou rediffuser massivement les données ou contenus (scraping, moissonnage)&nbsp;;</Li>
        <Li>de désassembler, décompiler ou pratiquer la rétro-ingénierie du Service&nbsp;;</Li>
        <Li>de perturber le fonctionnement du Service (attaques, surcharge, injection)&nbsp;;</Li>
        <Li>d'utiliser le Service à des fins illégales ou portant atteinte aux droits de tiers.</Li>
      </ul>

      <H>6. Propriété intellectuelle</H>
      <P>
        Le Service, sa marque, son interface, son code et ses méthodes d'analyse sont protégés et demeurent la
        propriété exclusive de l'éditeur. L'abonnement confère un simple <span style={strong}>droit d'usage
        personnel, non exclusif et non cessible</span>, pour la durée de l'abonnement. Les données que vous créez
        (listes, stratégies) vous appartiennent.
      </P>

      <H>7. Disponibilité et évolution du Service</H>
      <P>
        Le Service est fourni « en l'état », sans garantie de disponibilité continue. L'éditeur peut le suspendre
        pour maintenance, le faire évoluer ou en modifier les fonctionnalités à tout moment. Les
        <span style={strong}> données de marché sont différées d'au moins 15 minutes</span> et peuvent être estimées
        ou incomplètes&nbsp;; leur exactitude n'est pas garantie.
      </P>
      <P>
        Les données de marché (cotations, volatilités, chaînes d'options) proviennent de fournisseurs tiers et
        demeurent leur propriété. Elles sont mises à disposition pour un <span style={strong}>usage strictement
        personnel</span> au sein du Service&nbsp;: toute extraction, revente, rediffusion ou redistribution à des
        tiers est interdite. Le Service n'affiche que des données <span style={strong}>différées</span> et des
        <span style={strong}> résultats calculés</span> (indicateurs, statistiques, graphiques), à l'exclusion de
        tout flux temps réel destiné à l'exécution d'ordres.
      </P>

      <H>8. Avertissement — absence de conseil en investissement</H>
      <div style={{ margin: '4px 0 8px', padding: '14px 18px', background: 'var(--warn-soft, var(--bg-card))', border: '1px solid var(--warn, var(--border))', borderRadius: 'var(--radius-lg)' }}>
        <P>
          <span style={strong}>DispersionX est un outil d'analyse générique et pédagogique.</span> Il ne fournit
          <span style={strong}> aucune recommandation personnalisée</span>, ne constitue <span style={strong}>ni un
          conseil en investissement, ni une incitation à investir</span>, et n'exécute aucune opération de marché.
          Les résultats, scores et « opportunités » présentés sont des indicateurs théoriques, non individualisés,
          qui ne tiennent pas compte de votre situation. Les instruments financiers (options, actions) présentent un
          risque de perte pouvant aller jusqu'à la totalité du capital engagé. Toute décision d'investissement
          relève de votre seule responsabilité&nbsp;; consultez un professionnel habilité (conseiller en
          investissements financiers) avant d'agir.
        </P>
        <P>
          <span style={strong}>L'éditeur n'est ni un prestataire de services d'investissement (PSI), ni un
          conseiller en investissements financiers (CIF)</span>, n'est pas enregistré à l'ORIAS ni agréé par l'AMF,
          et ne fournit aucun service d'investissement au sens de l'article L321-1 du Code monétaire et financier ni
          de la directive MiFID II. Le Service ne constitue pas du démarchage bancaire ou financier.
        </P>
      </div>

      <H>9. Limitation de responsabilité</H>
      <P>
        Dans les limites permises par la loi, l'éditeur ne saurait être tenu responsable des pertes financières,
        pertes de données, dommages indirects ou décisions prises sur la base du Service. Rien dans les présentes ne
        limite la responsabilité en cas de faute lourde, de dol, ou pour ce que la loi interdit d'exclure.
      </P>

      <H>10. Suspension et résiliation de compte</H>
      <P>
        L'éditeur peut suspendre ou résilier un compte en cas de manquement aux présentes CGU (notamment §5), après
        information lorsque cela est possible. L'utilisateur peut à tout moment supprimer ses données depuis
        l'application (listes, stratégies, positions) et demander la <span style={strong}>suppression complète de son
        compte</span> en écrivant à <a href={`mailto:${L.email}`} style={link}>{L.email}</a> (traitée sous 30 jours,
        art. 17 RGPD)&nbsp;; les modalités relatives à l'abonnement payant figurent dans les CGV.
      </P>

      <H>11. Données personnelles</H>
      <P>
        Les traitements sont décrits dans la
        {onNav ? <a onClick={() => onNav('privacy')} style={{ ...link, marginLeft: 4 }}>Politique de confidentialité</a> : ' Politique de confidentialité'}.
      </P>

      <H>12. Modification des CGU</H>
      <P>
        L'éditeur peut modifier les présentes CGU. La date de mise à jour figure en haut de page&nbsp;; en cas de
        changement substantiel, les utilisateurs en sont informés dans l'application.
      </P>

      <H>13. Droit applicable et litiges</H>
      <P>
        Les présentes CGU sont régies par le <span style={strong}>droit français</span>. En cas de litige, une
        solution amiable sera recherchée en priorité (voir la médiation prévue aux CGV). À défaut, les tribunaux
        français sont compétents dans les conditions du droit commun.
      </P>
    </div>
  );
}

window.Terms = Terms;
