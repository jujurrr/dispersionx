/* ─── HintDot : explication au survol, dans la DA du site ────────────────────
   Deux usages :
   • sans enfants → affiche un petit « ? » (par défaut, utilisé par MetricCard).
   • avec enfants → enveloppe l'élément : l'infobulle apparaît en survolant
     DIRECTEMENT l'élément (pas de « ? » visible).
   L'infobulle est rendue via un PORTAIL (position: fixed) → jamais rognée par un
   parent en overflow:hidden, et sa position est bornée pour ne pas déborder de
   l'écran (côtés). */
function HintDot({ text, size = 13, children }) {
  const [pos, setPos] = React.useState(null);
  const ref = React.useRef(null);
  const show = () => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const above = r.top > 150;
    const vw = (typeof window !== 'undefined' && window.innerWidth) || 1200;
    const TIP_W = 250, M = 10;                       // largeur max de la bulle + marge écran
    const cx = r.left + r.width / 2;
    const x = Math.max(TIP_W / 2 + M, Math.min(cx, vw - TIP_W / 2 - M));   // bornage latéral
    setPos({ x, y: above ? r.top - 8 : r.bottom + 8, above });
  };
  const hide = () => setPos(null);
  if (!text) return children || null;

  const RD = window.ReactDOM;
  const tip = pos && RD && RD.createPortal ? RD.createPortal(
    <div className="dx-tip" style={{
      position: 'fixed', left: pos.x, top: pos.y,
      transform: `translate(-50%, ${pos.above ? '-100%' : '0'})`,
      maxWidth: 250, width: 'max-content',
      background: 'var(--bg-card)', color: 'var(--text-soft)',
      border: '1px solid var(--border-strong)', borderRadius: 'var(--radius)',
      boxShadow: 'var(--shadow-lg)', padding: '8px 11px',
      font: '400 11px/1.5 var(--font-sans)', textTransform: 'none', letterSpacing: 'normal', textAlign: 'left',
      zIndex: 3000, pointerEvents: 'none', whiteSpace: 'normal',
    }}>{text}</div>,
    document.body
  ) : null;

  // Mode « enveloppe » : survol des enfants → infobulle, sans « ? ».
  if (children) {
    return (
      <span ref={ref} onMouseEnter={show} onMouseLeave={hide} style={{ display: 'inline-flex', alignItems: 'center' }}>
        {children}{tip}
      </span>
    );
  }

  return (
    <span ref={ref} onMouseEnter={show} onMouseLeave={hide} onClick={e => e.stopPropagation()}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size, height: size, borderRadius: '50%', border: '1px solid var(--border-strong)', color: 'var(--text-dim)', font: '600 9px/1 var(--font-sans)', cursor: 'help', flexShrink: 0 }}>
      ?{tip}
    </span>
  );
}

window.HintDot = HintDot;
