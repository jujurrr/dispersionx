/* ─── Avertissement « prime de risque, pas argent gratuit » (brique 4) ───────────────────
   Composant PARTAGÉ, affiché partout où un trade de dispersion se décide (Construction,
   Opportunités). Le Correlation Lab explique le MÉCANISME (vendre la corrélation, le skew) ;
   ici on donne autre chose : le PROFIL DE PERTE, chiffré par nos propres mesures.

   Tout vient de backtest/ (données ThetaData réelles 2022-2026, krachs inclus) :
   · NETCOST_REPORT.md §3 — le P&L brut est NÉGATIF dans le bear 2022, le spike d'août 2024 et
     celui d'avril 2025 : on perd exactement quand la corrélation explose.
   · NETCOST_REPORT.md §2 / SKEW_REPORT.md §3 — la skew du P&L est négative (−0,6 à −1,7) même
     SANS krach majeur : pertes rares et grosses contre gains petits et fréquents.
   · DISPERSION_SYNTHESE.md — 2022-2026 ne contient AUCUN krach de corrélation type 2008/2020 :
     la prime encaissée n'a jamais payé le sinistre qu'elle assure. Tout backtest flatteur sur
     cette fenêtre l'est PARCE QUE l'événement n'est pas venu.

   Ton : ni alarmiste ni commercial. La dispersion est une vraie prime de risque, touchée par de
   vrais professionnels ; le point n'est pas « n'y allez pas », c'est « sachez ce que vous vendez
   et dimensionnez en conséquence ». */
function TailWarning({ mode }) {
  const { WarningPanel } = window.DispersionXDesignSystem_cb86be;
  return (
    <WarningPanel tone="neg" title="Ce que ce trade vend vraiment : une assurance contre le krach">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        <div>
          Une dispersion encaisse une prime tant que les actions bougent chacune de leur côté, et la perd d'un coup quand elles tombent <strong>ensemble</strong>. Son profil n'est pas symétrique : <strong>elle gagne peu et souvent, elle perd gros et rarement</strong>. Vous n'exploitez pas une erreur du marché — vous êtes <strong>payé pour porter ce risque</strong>, comme un assureur touche des cotisations jusqu'au sinistre.
        </div>
        <div>
          Ce que nos mesures montrent, sur les vrais prix d'options 2022-2026 : le résultat brut de cette stratégie a été <strong>négatif pendant le marché baissier de 2022</strong>, pendant le <strong>pic de volatilité d'août 2024</strong> et pendant celui d'<strong>avril 2025</strong>. À chaque fois que la corrélation a bondi, la dispersion a payé — c'est la signature d'une prime de risque, pas d'une anomalie.
        </div>
        <div style={{ padding: '9px 11px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
          <strong>La limite honnête de nos chiffres :</strong> la période que nous avons mesurée ne contient <strong>aucun krach de corrélation majeur</strong> (rien de comparable à 2008 ou à mars 2020). Autrement dit, la prime a été encaissée sans que le sinistre qu'elle assure ne survienne jamais. Tout résultat flatteur sur cette fenêtre l'est <em>précisément pour cette raison</em> — le vrai test n'a pas encore eu lieu.
        </div>
        {mode === 'Débutant' && (
          <div style={{ color: 'var(--text-muted)' }}>
            En clair : ce type de position ressemble à une rente régulière… jusqu'au jour où tout le marché chute d'un bloc. Ce jour-là, la perte peut effacer plusieurs mois de primes. Ce n'est pas une raison de s'en priver — c'est une raison de <strong>ne pas dimensionner comme si le pire ne pouvait pas arriver</strong>.
          </div>
        )}
      </div>
    </WarningPanel>
  );
}

window.DXTailWarning = TailWarning;
