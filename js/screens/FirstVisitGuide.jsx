/* ─── FirstVisitGuide : pancarte d'accueil affichée à la PREMIÈRE visite d'un module ──
   Petite modale explicative montrée une seule fois par module (mémorisée en local,
   par appareil). Non-cassant : si déjà vue, ne rend rien ; si localStorage est
   indisponible, elle s'affiche sans planter. Même DA que les autres dialogues.

   Réutilisable :
     <window.DXGuide
        id="opportunities"                       // clé de mémorisation (dx-guide-<id>)
        title="…" intro="…"                      // en-tête
        steps={[[titre, corps], …]}              // étapes numérotées
        cta="J'ai compris" />                    // libellé du bouton (optionnel)
   L'appelant fournit des chaînes déjà traduites (t()). */
function FirstVisitGuide({ id, title, intro, steps = [], cta }) {
  const t = window.t || ((s) => s);
  // Clé PROPRE AU COMPTE : la pancarte doit s'afficher une fois par compte (et non
  // une fois par appareil, tous comptes confondus). L'uid vient du compte connecté ;
  // sans compte (cas impossible sur un module Pro), on ne persiste pas globalement.
  const uid = (window.DXCloud && window.DXCloud.user && window.DXCloud.user.id) || null;
  const KEY = uid ? ('dx-guide-' + id + '-' + uid) : null;
  const [open, setOpen] = React.useState(() => {
    if (!id || !KEY) return false;
    try { return !localStorage.getItem(KEY); } catch { return false; }   // localStorage absent → on n'insiste pas
  });
  if (!open) return null;

  const close = () => {
    try { if (KEY) localStorage.setItem(KEY, '1'); } catch {}
    setOpen(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) close(); }}>
      <div role="dialog" aria-modal="true" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-lg)', padding: 26, width: '100%', maxWidth: 520, maxHeight: '88vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16, boxShadow: 'var(--shadow-lg)' }}>

        {/* En-tête */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <div style={{ font: 'var(--type-caption)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent-hover)', marginBottom: 6 }}>{t('Bienvenue ✦')}</div>
            <div style={{ font: 'var(--type-h3)', color: 'var(--text)', marginBottom: 4 }}>{title}</div>
            {intro && <div style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', lineHeight: 1.5 }}>{intro}</div>}
          </div>
          <button onClick={close} aria-label={t('Fermer')} style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', font: '700 15px/1 var(--font-mono)' }}>✕</button>
        </div>

        {/* Étapes numérotées */}
        {steps.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {steps.map(([sTitle, sBody], i) => (
              <div key={i} style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                <div style={{ flexShrink: 0, width: 22, height: 22, borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent-hover)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '700 11px/1 var(--font-mono)' }}>{i + 1}</div>
                <div>
                  <div style={{ font: '600 13px/1.3 var(--font-sans)', color: 'var(--text)' }}>{sTitle}</div>
                  {sBody && <div style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', lineHeight: 1.5, marginTop: 2 }}>{sBody}</div>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bouton */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={close} style={{ font: '600 13px/1 var(--font-sans)', padding: '11px 22px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}>
            {cta || t('J’ai compris')}
          </button>
        </div>
      </div>
    </div>
  );
}

window.DXGuide = FirstVisitGuide;
