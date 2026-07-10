/* ─── Identité légale — SOURCE UNIQUE ─────────────────────────────────────────
   Un SEUL endroit à remplir avant le lancement public. Toutes les pages légales
   (Mentions légales, CGU, CGV, Politique de confidentialité) lisent ces champs.
   Les valeurs « {{…}} » sont des PLACEHOLDERS à compléter (profil retenu :
   entrepreneur individuel / micro-entreprise, franchise en base de TVA).
   ⚠️ Tant qu'un champ commence par « {{ », le site n'est PAS prêt à être ouvert. */
window.DXLegal = {
  // ── Éditeur (entrepreneur individuel / micro-entreprise) ──
  editeurNom:           'Jules ROSENZWEIG',                     // nom de l'entrepreneur (la mention « EI » est portée par editeurStatut)
  editeurStatut:        'Entrepreneur individuel (micro-entreprise)',
  adresse:              '{{}}',       // ← à compléter (n°, rue, CP, ville)
  siret:                '{{N° SIRET (14 chiffres)}}',         // ← à compléter
  email:                'contact@dispersionx.app',            // ← à compléter : adresse RÉELLE et relevée
  telephone:            '{{TÉLÉPHONE}}',                      // ← optionnel mais recommandé
  directeurPublication: 'Jules ROSENZWEIG',                     // = l'éditeur
  tvaMention:           'TVA non applicable, art. 293 B du CGI',  // franchise en base — ne pas facturer de TVA

  // ── Hébergement ──
  hebergeur:   'Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis — vercel.com',
  hebergeurDb: 'Supabase (authentification & base de données) — région d\'hébergement UE recommandée',

  // ── Médiation de la consommation (OBLIGATOIRE pour la vente B2C — art. L612-1) ──
  mediateurNom:     '{{NOM DU MÉDIATEUR DE LA CONSOMMATION}}', // ← à compléter : adhésion obligatoire
  mediateurUrl:     '{{URL DU MÉDIATEUR}}',                    // ← à compléter
  mediateurAdresse: '{{ADRESSE POSTALE DU MÉDIATEUR}}',        // ← à compléter

  // ── Offre commerciale (doit refléter ProUpsell.jsx) ──
  prixMensuel:   '2,99 €',
  periode:       'mois',
  garantieJours: 14,

  // ── Droit applicable / juridiction ──
  villeTribunal: 'Lyon',           // ressort du domicile de l'éditeur

  // ── Dernière mise à jour des documents ──
  updated: '10 juillet 2026',
};
