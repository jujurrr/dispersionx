/* ─── Marché Pro : contexte de marché pour la dispersion (module Pro) ───
   Regroupe les outils « quand agir » : baromètre de corrélation implicite,
   alertes, et calendrier des résultats. Gated Pro (écran cadenas sinon).
   Réutilise window.CorrelationBarometer / AlertsPanel / EarningsPanel. */

function MarketPro({ onNav, addToast, pro, lists }) {
  const DS = window.DispersionXDesignSystem_cb86be;
  const { Badge } = DS;
  const INDICES = ['SPX', 'NDX', 'DJI', 'CAC', 'DAX'];
  const [index, setIndex] = React.useState('SPX');
  const [checkoutBusy, setCheckoutBusy] = React.useState(false);

  // ── Écran verrouillé (non Pro) ──
  if (!pro) {
    const signedIn = !!(window.DXCloud && window.DXCloud.user);
    async function goPro() {
      if (!signedIn) { onNav('login'); return; }
      setCheckoutBusy(true);
      try { await window.DXCloud.startProCheckout(); }
      catch (e) { addToast && addToast('Paiement indisponible : ' + (e && e.message ? e.message : ''), 'error'); setCheckoutBusy(false); }
    }
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}>
        <div style={{ width: '100%', maxWidth: 440, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', padding: '28px 26px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--accent-soft)', border: '1px solid var(--accent-border)', color: 'var(--accent-hover)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
          </div>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <h2 style={{ font: 'var(--type-h2)', color: 'var(--text)', margin: 0 }}>Marché Pro</h2>
              <Badge tone="accent" size="sm">Pro</Badge>
            </div>
            <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: 0, maxWidth: 360 }}>
              Le contexte de marché de la dispersion : baromètre de corrélation, alertes et calendrier des résultats — pour savoir <strong style={{ color: 'var(--text-soft)' }}>quand agir</strong>.
            </p>
          </div>
          <button onClick={goPro} disabled={checkoutBusy}
            style={{ font: '600 13px/1 var(--font-sans)', padding: '11px 26px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--accent)', color: '#fff', cursor: checkoutBusy ? 'default' : 'pointer', opacity: checkoutBusy ? 0.7 : 1 }}>
            {checkoutBusy ? 'Redirection…' : (signedIn ? 'Passer Pro →' : 'Se connecter pour passer Pro')}
          </button>
          <div style={{ font: 'var(--type-caption)', color: 'var(--text-dim)' }}>Abonnement mensuel · paiement sécurisé Stripe · résiliable à tout moment</div>
        </div>
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
        <span>Signaux <strong style={{ color: 'var(--text)' }}>indicatifs</strong> sur données différées/estimées — pas un conseil en investissement.</span>
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
