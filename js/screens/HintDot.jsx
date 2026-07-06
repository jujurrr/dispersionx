/* ─── HintDot : explication au survol, dans la DA du site ────────────────────
   Deux usages :
   • sans enfants → petit « ? » (par défaut, utilisé par MetricCard).
   • avec enfants → enveloppe l'élément : l'infobulle apparaît en survolant
     DIRECTEMENT l'élément (pas de « ? » visible).
   L'infobulle est rendue via un PORTAIL (position: fixed → jamais rognée par un
   parent en overflow:hidden). On MESURE sa vraie taille et on borne sa position
   pour qu'elle reste entièrement dans l'écran (jamais coupée par un bord). */
function HintDot({ text, size = 13, children }) {
  const ref = React.useRef(null);
  const tipRef = React.useRef(null);
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState({ left: 0, top: 0, ready: false });

  const show = () => setOpen(true);
  const hide = () => { setOpen(false); setPos(p => ({ ...p, ready: false })); };

  // Mesure après rendu (avant peinture) → position centrée sous l'ancre, bornée.
  React.useLayoutEffect(() => {
    if (!open || !ref.current || !tipRef.current) return;
    const r = ref.current.getBoundingClientRect();
    const t = tipRef.current;
    const w = t.offsetWidth, h = t.offsetHeight;
    const vw = (typeof window !== 'undefined' && window.innerWidth) || 1200;
    const M = 8;
    const above = r.top > (h + 16);                       // au-dessus seulement s'il y a la place
    let left = r.left + r.width / 2 - w / 2;              // centré sous (ou sur) l'ancre
    left = Math.max(M, Math.min(left, vw - w - M));       // borne les deux bords dans l'écran
    const top = above ? r.top - 8 - h : r.bottom + 8;
    setPos({ left, top, ready: true });
  }, [open, text]);

  if (!text) return children || null;
  const RD = window.ReactDOM;

  const tip = open && RD && RD.createPortal ? RD.createPortal(
    <div ref={tipRef} className="dx-tip" style={{
      position: 'fixed', left: pos.left, top: pos.top,
      maxWidth: 260, width: 'max-content',
      opacity: pos.ready ? 1 : 0,                          // pas de flash avant la mesure
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
