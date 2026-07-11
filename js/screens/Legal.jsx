/* ─── Mentions légales (LCEN art. 6 III) ──────────────────────────────────────
   Écran statique. Identité de l'éditeur lue depuis window.DXLegal (source unique).
   Obligatoire avant toute mise en ligne commerciale — l'absence est un délit.
   Traduit via window.t (+ window.DXRich pour le gras/liens en ligne). */
function Legal({ onNav }) {
  const L = window.DXLegal || {};
  const t = window.t || ((s) => s);

  const H = ({ children }) => (
    <h2 style={{ font: 'var(--type-h3)', color: 'var(--text)', margin: '28px 0 10px', letterSpacing: 'var(--track-snug)' }}>{children}</h2>
  );
  const P = ({ children }) => (
    <p style={{ font: 'var(--type-body)', color: 'var(--text-soft)', margin: '0 0 10px', lineHeight: 1.65, maxWidth: 760 }}>{children}</p>
  );
  const Row = ({ k, v }) => (
    <div style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border-subtle)', font: 'var(--type-body-sm)', lineHeight: 1.55 }}>
      <span style={{ color: 'var(--text-muted)', minWidth: 190, flexShrink: 0 }}>{k}</span>
      <span style={{ color: 'var(--text-soft)' }}>{v}</span>
    </div>
  );
  const strong = { color: 'var(--text)', fontWeight: 600 };
  const link = { color: 'var(--accent-hover)', cursor: 'pointer' };
  const rich = (key, vars) => (window.DXRich ? window.DXRich(t(key, vars), { onNav, strong, link }) : t(key, vars));

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        {onNav && <button onClick={() => onNav('home')} style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>{t('← Accueil')}</button>}
      </div>
      <h1 style={{ font: 'var(--type-h1)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: '0 0 6px' }}>{t('Mentions légales')}</h1>
      <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: 0 }}>{t('Dernière mise à jour :')} {L.updated}</p>

      <H>{t('1. Éditeur du site')}</H>
      <div style={{ margin: '4px 0 6px' }}>
        <Row k={t('Éditeur')} v={L.editeurNom} />
        <Row k={t('Statut')} v={L.editeurStatut} />
        <Row k={t('Adresse')} v={L.adresse} />
        <Row k={t('SIRET')} v={L.siret} />
        <Row k={t('TVA')} v={L.tvaMention} />
        <Row k={t('E-mail')} v={<a href={`mailto:${L.email}`} style={link}>{L.email}</a>} />
        {L.telephone && <Row k={t('Téléphone')} v={L.telephone} />}
      </div>

      <H>{t('2. Directeur de la publication')}</H>
      <P>{t("{directeur}, en qualité d'éditeur du site.", { directeur: L.directeurPublication })}</P>

      <H>{t('3. Hébergement')}</H>
      <P>{rich("Le site est hébergé par : **{hebergeur}**.", { hebergeur: L.hebergeur })}</P>
      <P>{rich("Les données de compte sont gérées via : **{hebergeurDb}**. Le paiement des abonnements est traité par **Stripe Payments Europe, Ltd.** ; aucune donnée bancaire n'est stockée par l'éditeur.", { hebergeurDb: L.hebergeurDb })}</P>

      <H>{t('4. Contact')}</H>
      <P>{rich("Pour toute question relative au site : [{email}](mailto:{email}).", { email: L.email })}</P>

      <H>{t('5. Propriété intellectuelle')}</H>
      <P>{rich("L'ensemble des éléments du site (marque « DispersionX », logo, textes, interface, code, méthodologies d'analyse, graphiques) est protégé par le droit de la propriété intellectuelle et demeure la propriété exclusive de l'éditeur, sauf mention contraire. Toute reproduction, représentation, extraction ou réutilisation, totale ou partielle, sans autorisation écrite préalable, est interdite.")}</P>

      <H>{t('6. Responsabilité — nature du service')}</H>
      <P>{rich("DispersionX est un **outil d'analyse et de simulation à visée pédagogique**. Il ne passe aucun ordre de bourse, ne gère aucun portefeuille, ne détient aucun fonds et ne fournit **aucun conseil en investissement personnalisé**. Les données affichées sont **différées (15 min)** et parfois estimées. L'éditeur ne saurait être tenu responsable des décisions prises sur la base des informations fournies (voir les CGU).")}</P>
      <P>{rich("**Statut réglementaire :** l'éditeur n'est pas un prestataire de services d'investissement (PSI) ni un conseiller en investissements financiers (CIF), n'est pas enregistré à l'ORIAS ni agréé par l'AMF ou l'ACPR, et ne fournit aucun service d'investissement au sens de l'article L321-1 du Code monétaire et financier ni de la directive MiFID II. Le Service ne relève pas de ces réglementations.")}</P>
      <P>{rich("**Sources de données :** les cotations et volatilités affichées proviennent de fournisseurs tiers (notamment Cboe, Yahoo Finance, Finnhub), sont **différées** et fournies à titre informatif. Elles restent la propriété de leurs fournisseurs respectifs ; leur réutilisation ou redistribution en dehors d'un usage personnel est interdite.")}</P>

      <H>{t('7. Données personnelles')}</H>
      <P>{rich("Le traitement des données personnelles est décrit dans la [Politique de confidentialité](nav:privacy). Conformément au RGPD, vous disposez de droits d'accès, de rectification et d'effacement, exerçables à l'adresse ci-dessus.")}</P>

      <H>{t('8. Droit applicable')}</H>
      <P>{rich("Le site et son utilisation sont régis par le **droit français**. Les conditions d'utilisation figurent dans les [CGU](nav:terms) et les [CGV](nav:sales).")}</P>
    </div>
  );
}

window.Legal = Legal;
