/* ─── Bandeau « stratégie remplacée » — filet anti-écrasement ──────────
   Il n'y a qu'UNE stratégie par liste (contrainte jusqu'au schéma cloud), donc
   reconstruire sur une liste remplace la précédente. Pire : embarquée dans le
   Builder, la Construction persiste AUTOMATIQUEMENT à chaque réglage — l'ancienne
   stratégie disparaissait sans un clic ni un mot.

   `DXApi.saveStrategy` archive désormais la stratégie remplacée ; ce bandeau la
   rend visible et restaurable là où la perte se produit (Construction) et là où
   on la constaterait (détail d'une stratégie).

   Restaurer est lui-même réversible : la courante prend la place de l'archive.
   L'archive est LOCALE et purgée à la déconnexion (isolation de compte) — c'est
   une annulation de courte durée, pas un historique de versions. */
function PrevStrategyBand({ listId, addToast, onRestored }) {
  const [prev, setPrev] = React.useState(null);

  const read = React.useCallback(() => {
    setPrev((window.DXApi && DXApi.previousStrategy && listId) ? DXApi.previousStrategy(listId) : null);
  }, [listId]);

  React.useEffect(() => {
    read();
    // `restoreStrategy` et `saveStrategy` émettent tous deux cet événement : le
    // bandeau se met donc à jour après un remplacement comme après une restauration.
    window.addEventListener('dx-strategies-changed', read);
    return () => window.removeEventListener('dx-strategies-changed', read);
  }, [read]);

  if (!prev) return null;

  const SIZING = { vega_neutral: 'vega-neutre', gamma_flat: 'gamma-flat', theta_flat: 'theta-flat', premium_neutral: 'premium-neutral', equal_weight: '1 lot' };
  const bits = [
    SIZING[prev.sizingMethod] || prev.sizingMethod,
    prev.expiry && window.DXExpiry ? 'éch. ' + window.DXExpiry.fmtExpiry(prev.expiry) : (prev.duration ? prev.duration + ' j' : null),
    (prev.components || []).length ? (prev.components || []).length + ' composants' : null,
    prev.builtAt ? 'construite le ' + new Date(prev.builtAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : null,
  ].filter(Boolean);

  function restore() {
    const r = DXApi.restoreStrategy(listId);
    if (r && r.success) {
      addToast && addToast('Stratégie précédente restaurée.');
      onRestored && onRestored(r.strategy);
    } else {
      addToast && addToast('Restauration impossible.', 'error');
    }
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      background: 'var(--bg-elevated)', border: '1px dashed var(--border-strong)',
      borderRadius: 'var(--radius-lg)', padding: '11px 14px',
    }}>
      <span style={{ font: '13px/1 var(--font-sans)', flexShrink: 0 }}>↩</span>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ font: 'var(--type-body-sm)', color: 'var(--text-soft)' }}>
          Une stratégie précédente a été remplacée sur cette liste
        </div>
        <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', marginTop: 2 }}>
          {bits.join(' · ')}
        </div>
      </div>
      <button onClick={restore} style={{
        font: '600 12px/1 var(--font-sans)', padding: '8px 14px', borderRadius: 'var(--radius)',
        border: '1px solid var(--accent)', background: 'transparent', color: 'var(--accent-hover)',
        cursor: 'pointer', flexShrink: 0,
      }}>Restaurer</button>
    </div>
  );
}

window.DXPrevStrategyBand = PrevStrategyBand;
