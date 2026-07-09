/* ─── Marché Pro : contexte de marché pour la dispersion (module Pro) ───
   Regroupe les outils « quand agir » : baromètre de corrélation implicite,
   alertes, et calendrier des résultats. Gated Pro (écran cadenas sinon).
   Réutilise window.CorrelationBarometer / AlertsPanel / EarningsPanel. */

function MarketPro({ onNav, addToast, pro, lists }) {
  const DS = window.DispersionXDesignSystem_cb86be;
  const { Badge } = DS;
  const INDICES = ['SPX', 'NDX', 'DJI', 'CAC', 'DAX'];
  const [index, setIndex] = React.useState('SPX');

  // ── Écran verrouillé (non Pro) : soft-paywall (esquisse floutée + carte) ──
  if (!pro) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <h1 style={{ font: 'var(--type-h1)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: 0 }}>Marché Pro</h1>
            <Badge tone="accent" size="sm">Pro</Badge>
          </div>
          <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)', margin: 0, maxWidth: 640 }}>
            Le contexte de marché de la dispersion — un aperçu de ce que Pro débloque.
          </p>
        </div>
        <window.ProLockedPreview context="market-pro" onNav={onNav} addToast={addToast}>
          {window.ProDemoMarket()}
        </window.ProLockedPreview>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* En-tête */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <h1 style={{ font: 'var(--type-h1)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: 0 }}>Marché Pro</h1>
          <Badge tone="accent" size="sm">Pro</Badge>
        </div>
        <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)', margin: 0, maxWidth: 720 }}>
          Le contexte de marché de la dispersion : la corrélation est-elle chère, quels catalyseurs arrivent, et des alertes pour ne pas rater le bon moment.
        </p>
      </div>

      {/* Bandeau honnête */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', padding: '10px 16px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderLeft: '3px solid var(--info)', borderRadius: 'var(--radius-lg)', font: 'var(--type-body-sm)', color: 'var(--text-soft)' }}>
        <span style={{ color: 'var(--info)', font: '700 13px/1 var(--font-mono)', flexShrink: 0 }}>i</span>
        <span>Signaux <strong style={{ color: 'var(--text)' }}>indicatifs et non personnalisés</strong> sur données différées/estimées — pas une recommandation ni un conseil en investissement.</span>
      </div>

      {/* Sélecteur d'indice */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Indice</span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {INDICES.map(s => (
            <button key={s} onClick={() => setIndex(s)}
              style={{ padding: '7px 14px', font: '700 12px/1 var(--font-mono)', borderRadius: 'var(--radius)', cursor: 'pointer',
                background: index === s ? 'var(--accent)' : 'var(--bg-elevated)', color: index === s ? '#fff' : 'var(--text-soft)', border: `1px solid ${index === s ? 'var(--accent)' : 'var(--border)'}` }}>{s}</button>
          ))}
        </div>
      </div>

      {window.CorrelationBarometer && <window.CorrelationBarometer index={index} />}
      {window.EarningsPanel && <window.EarningsPanel lists={lists} />}
      {window.AlertsPanel && <window.AlertsPanel index={index} addToast={addToast} />}
    </div>
  );
}

window.MarketPro = MarketPro;
