/* ─── DXLoader : roue de chargement + texte tournant explicatif ────────────
   Pour les sections dont le calcul prend un peu de temps (Construction, Risk
   Lab, Opportunités…). `steps` = messages qui DÉFILENT (toutes les ~2,4 s) pour
   expliquer l'avancement ; à défaut, `title` seul. Purement présentationnel :
   n'attend rien, ne bloque rien. Anneau `dx-spin` + halo `dx-glow` (effects.css).
   Exposé via window.DXLoader. */
function DXLoader({ title, steps, hint, pad = 72, size = 46 }) {
  const msgs = (Array.isArray(steps) && steps.length) ? steps : null;
  const [i, setI] = React.useState(0);
  React.useEffect(() => {
    if (!msgs || msgs.length < 2) return;
    const id = setInterval(() => setI(k => (k + 1) % msgs.length), 2400);
    return () => clearInterval(id);
  }, [msgs ? msgs.length : 0]);   // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, padding: pad, textAlign: 'center' }}>
      {/* Roue + halo respirant */}
      <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="dx-glow" style={{ position: 'absolute', inset: -10, borderRadius: '50%', background: 'var(--accent-soft)', filter: 'blur(10px)' }} />
        <div className="dx-spin" style={{ position: 'relative', width: size, height: size, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', boxSizing: 'border-box' }} />
      </div>

      {title && <div style={{ font: 'var(--type-title)', color: 'var(--text)' }}>{title}</div>}

      {/* Texte explicatif qui défile (remonté à chaque changement → fade dx-rise) */}
      {msgs && (
        <div key={i} className="dx-rise" style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', maxWidth: 460, minHeight: 20, lineHeight: 1.5 }}>
          {msgs[i]}
        </div>
      )}

      {/* Points de progression (indice du message en cours) */}
      {msgs && msgs.length > 1 && (
        <div style={{ display: 'flex', gap: 6 }}>
          {msgs.map((_, k) => (
            <span key={k} style={{ width: 6, height: 6, borderRadius: '50%', background: k === i ? 'var(--accent)' : 'var(--border-strong)', transition: 'background var(--dur) var(--ease)' }} />
          ))}
        </div>
      )}

      {hint && <div style={{ font: 'var(--type-caption)', color: 'var(--text-dim)', maxWidth: 460, lineHeight: 1.5 }}>{hint}</div>}
    </div>
  );
}

window.DXLoader = DXLoader;
