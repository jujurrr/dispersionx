/* ─── HintDot : petit « ? » avec une explication au survol, dans la DA ───────
   Rendu de l'infobulle via un PORTAIL (position: fixed sur document.body) → elle
   n'est jamais rognée par un parent en overflow:hidden (ex. MetricCard). Branché
   dans le design system (MetricCard) → toutes les cartes du site en profitent. */
function HintDot({ text, size = 13 }) {
  const [pos, setPos] = React.useState(null);
  const ref = React.useRef(null);
  const show = () => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const above = r.top > 150;   // bascule sous le « ? » s'il n'y a pas la place au-dessus
    setPos({ x: r.left + r.width / 2, y: above ? r.top - 8 : r.bottom + 8, above });
  };
  const hide = () => setPos(null);
  if (!text) return null;

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

  return (
    <span ref={ref} onMouseEnter={show} onMouseLeave={hide} onClick={e => e.stopPropagation()}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size, height: size, borderRadius: '50%', border: '1px solid var(--border-strong)', color: 'var(--text-dim)', font: '600 9px/1 var(--font-sans)', cursor: 'help', flexShrink: 0 }}>
      ?{tip}
    </span>
  );
}

window.HintDot = HintDot;
