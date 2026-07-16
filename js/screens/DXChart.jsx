/* ─── DXChart : graphe en courbes INTERACTIF réutilisable (façon TradingView).
   Croix de visée qui suit la souris (verticale snappée au point le plus proche,
   horizontale libre), valeurs lues aux DEUX axes + infobulle, respiration
   verticale (padFrac), et zoom molette / pan au glisser (opt-in `zoom`).
   Non-cassant : composant autonome (window.DXChart), n'affecte rien d'autre.

   Props :
     data       [{ ... }]                         points (ordre chronologique)
     xKey       clé de l'abscisse (déf. 't')
     lines      [{ key, color, label, dash?, fill? }]   une ou plusieurs séries
     baseline   number|null                        ligne de base (ex. 0) + aire
     height, padFrac, yAxisWidth, ticksY
     yFmt(v), xFmt(x)                               formatage axes + infobulle
     zoom       bool                                molette = zoom, glisser = pan
     footer     node                                légende sous l'axe X (option) */
function DXChart({ data, xKey = 't', lines, baseline = null, height = 170, padFrac = 0.18, yAxisWidth = 56, ticksY = 4, yFmt, xFmt, zoom = false, panY = false, footer = null, dots = false }) {
  const N = Array.isArray(data) ? data.length : 0;
  const plotRef = React.useRef(null);
  const [win, setWin] = React.useState(null);     // { i0, i1 } fenêtre visible (zoom/pan horizontal) ; null = tout
  const [yOff, setYOff] = React.useState(0);      // décalage VERTICAL libre (unités de valeur), opt-in `panY`
  const [hov, setHov] = React.useState(null);     // { k, mx, my } — k = index DANS la fenêtre visible
  const drag = React.useRef(null);
  const uid = (React.useId ? React.useId() : 'dxc' + Math.random().toString(36).slice(2)).replace(/:/g, '');

  React.useEffect(() => { setWin(null); setYOff(0); }, [N]);   // reset zoom + pan si le jeu de données change

  yFmt = yFmt || (v => String(Math.round(v)));
  xFmt = xFmt || (x => String(x));

  const i0 = win ? Math.max(0, Math.min(win.i0, N - 2)) : 0;
  const i1 = win ? Math.min(N - 1, Math.max(win.i1, i0 + 1)) : (N - 1);
  const visN = Math.max(2, i1 - i0 + 1);
  const vis = N >= 2 ? data.slice(i0, i0 + visN) : [];

  // Échelle Y sur la fenêtre visible, avec respiration (padFrac).
  const allV = [];
  vis.forEach(p => lines && lines.forEach(l => { const v = p[l.key]; if (v != null && isFinite(v)) allV.push(v); }));
  if (baseline != null) allV.push(baseline);
  let lo = allV.length ? Math.min(...allV) : 0, hi = allV.length ? Math.max(...allV) : 1;
  const padY = (hi - lo) * padFrac || Math.abs(hi) * padFrac || 1; lo -= padY; hi += padY;
  const span = (hi - lo) || 1;
  lo += yOff; hi += yOff;   // décalage vertical libre (pan Y) — n'affecte pas le span
  const VW = 1000, PH = height;
  const xAt = k => (visN === 1 ? VW / 2 : (k / (visN - 1)) * VW);
  const yAt = v => (hi - v) / span * PH;
  const ticks = Array.from({ length: ticksY }, (_, i) => hi - (i / (ticksY - 1)) * span);

  // Wheel zoom (listener natif non-passif pour pouvoir preventDefault).
  React.useEffect(() => {
    if (!zoom) return;
    const el = plotRef.current; if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect(); if (rect.width <= 0) return;
      const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const cur0 = win ? win.i0 : 0, cur1 = win ? win.i1 : (N - 1);
      const curN = cur1 - cur0 + 1;
      const factor = e.deltaY > 0 ? 1.18 : 0.85;                 // molette bas = dézoom
      let newN = Math.round(curN * factor);
      newN = Math.max(5, Math.min(N, newN));
      if (newN >= N) { setWin(null); return; }
      const anchor = cur0 + Math.round(frac * (curN - 1));       // point sous le curseur reste fixe
      let n0 = Math.round(anchor - frac * (newN - 1));
      n0 = Math.max(0, Math.min(n0, N - newN));
      setWin({ i0: n0, i1: n0 + newN - 1 });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoom, win, N]);

  if (N < 2 || !lines || !lines.length) {
    return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', font: 'var(--type-caption)' }}>Pas assez de points.</div>;
  }

  const pathFor = (key) => {
    let d = '', started = false;
    vis.forEach((p, k) => { const v = p[key]; if (v == null || !isFinite(v)) return; d += `${started ? 'L' : 'M'}${xAt(k).toFixed(1)},${yAt(v).toFixed(1)}`; started = true; });
    return d;
  };
  const areaFor = (key) => {
    const base = baseline != null ? baseline : lo;
    const d = pathFor(key); if (!d) return '';
    return `${d} L${xAt(visN - 1).toFixed(1)},${yAt(base).toFixed(1)} L${xAt(0).toFixed(1)},${yAt(base).toFixed(1)} Z`;
  };

  // ── Souris ──
  const localXY = (e) => {
    const el = plotRef.current; if (!el) return null;
    const rect = el.getBoundingClientRect(); if (rect.width <= 0) return null;
    const mx = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const my = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
    const k = Math.round((mx / rect.width) * (visN - 1));
    return { mx, my, k: Math.max(0, Math.min(visN - 1, k)), width: rect.width, height: rect.height };
  };
  const onMove = (e) => {
    const pos = localXY(e); if (!pos) return;
    if (drag.current) {
      // Pan HORIZONTAL (temps) — seulement si zoomé (une fenêtre existe).
      if (zoom && win) {
        const dxFrac = (pos.mx - drag.current.mx) / pos.width;
        const shift = Math.round(-dxFrac * (visN - 1));
        const n0 = Math.max(0, Math.min(drag.current.i0 + shift, N - visN));
        setWin({ i0: n0, i1: n0 + visN - 1 });
      }
      // Pan VERTICAL libre (valeur) — même au-delà de la courbe, même dézoomé au max.
      if (panY) {
        const dyFrac = (pos.my - drag.current.my) / pos.height;
        setYOff(drag.current.yOff + dyFrac * span);
      }
      return;
    }
    setHov({ k: pos.k, mx: pos.mx, my: pos.my, width: pos.width, height: pos.height });
  };
  const onLeave = () => { setHov(null); drag.current = null; };
  const onDown = (e) => { if (!zoom && !panY) return; const pos = localXY(e); if (pos) drag.current = { mx: pos.mx, my: pos.my, i0, yOff }; };
  const onUp = () => { drag.current = null; };

  // Position croix + valeurs
  const hk = hov ? hov.k : null;
  const hoverPoint = hk != null ? vis[hk] : null;
  const crossLeftPct = hk != null ? (hk / (visN - 1)) * 100 : 0;
  const cursorVal = hov ? (hi - (hov.my / PH) * span) : null;   // valeur Y sous le curseur (libre)

  // Repères X (3) + format
  let xIdx = visN <= 2 ? [0, visN - 1] : [0, Math.floor((visN - 1) / 2), visN - 1];
  xIdx = [...new Set(xIdx)];

  return (
    <div>
      <div style={{ display: 'flex' }}>
        {/* Axe Y (HTML) */}
        <div style={{ position: 'relative', width: yAxisWidth, height: PH, flexShrink: 0 }}>
          {ticks.map((tv, i) => (
            <span key={i} style={{ position: 'absolute', right: 8, top: yAt(tv), transform: 'translateY(-50%)', font: '10px/1 var(--font-mono)', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{yFmt(tv)}</span>
          ))}
          {/* Valeur Y sous le curseur (croix horizontale) */}
          {hov && cursorVal != null && (
            <span style={{ position: 'absolute', right: 4, top: Math.max(0, Math.min(PH, hov.my)), transform: 'translateY(-50%)', font: '700 10px/1.4 var(--font-mono)', color: '#fff', background: 'var(--accent)', padding: '1px 5px', borderRadius: 4, whiteSpace: 'nowrap', zIndex: 3 }}>{yFmt(cursorVal)}</span>
          )}
        </div>

        {/* Tracé + overlay souris */}
        <div ref={plotRef} onMouseMove={onMove} onMouseLeave={onLeave} onMouseDown={onDown} onMouseUp={onUp} onDoubleClick={() => { setWin(null); setYOff(0); }}
          style={{ position: 'relative', flex: 1, height: PH, cursor: (zoom || panY) ? (drag.current ? 'grabbing' : 'crosshair') : 'crosshair', touchAction: 'none' }}>
          <svg viewBox={`0 0 ${VW} ${PH}`} width="100%" height={PH} preserveAspectRatio="none" style={{ display: 'block' }}>
            <defs>
              {lines.filter(l => l.fill).map(l => (
                <linearGradient key={l.key} id={`${uid}-${l.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={l.color} stopOpacity="0.26" />
                  <stop offset="100%" stopColor={l.color} stopOpacity="0.02" />
                </linearGradient>
              ))}
            </defs>
            {ticks.map((tv, i) => (
              <line key={i} x1="0" y1={yAt(tv)} x2={VW} y2={yAt(tv)} stroke="var(--border-subtle)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            ))}
            {baseline != null && <line x1="0" y1={yAt(baseline)} x2={VW} y2={yAt(baseline)} stroke="var(--border-strong)" strokeWidth="1" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />}
            {lines.filter(l => l.fill).map(l => <path key={l.key} d={areaFor(l.key)} fill={`url(#${uid}-${l.key})`} />)}
            {lines.map(l => <path key={l.key} d={pathFor(l.key)} fill="none" stroke={l.color} strokeWidth={l.dash ? 1.5 : 2} strokeDasharray={l.dash ? '3 3' : undefined} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" opacity={l.dash ? 0.85 : 1} />)}
          </svg>

          {/* Points fixes à chaque donnée (opt-in, HTML → cercles parfaits) */}
          {dots && lines.map(l => vis.map((p, k) => { const v = p[l.key]; if (v == null || !isFinite(v)) return null; return (
            <span key={`${l.key}-${k}`} style={{ position: 'absolute', left: `${visN === 1 ? 50 : (k / (visN - 1)) * 100}%`, top: yAt(v), transform: 'translate(-50%, -50%)', width: 7, height: 7, borderRadius: '50%', background: l.color, border: '2px solid var(--bg-card)', pointerEvents: 'none', zIndex: 1 }} />
          ); }))}

          {/* Dernier point (HTML → cercle parfait) */}
          {(() => { const l = lines[0]; const v = vis[visN - 1] && vis[visN - 1][l.key]; if (v == null) return null; return (
            <span style={{ position: 'absolute', left: '100%', top: yAt(v), transform: 'translate(-50%, -50%)', width: 9, height: 9, borderRadius: '50%', background: l.color, border: '2px solid var(--bg-card)' }} />
          ); })()}

          {/* Croix de visée + points survolés */}
          {hov && hoverPoint && (
            <React.Fragment>
              <div style={{ position: 'absolute', left: `${crossLeftPct}%`, top: 0, bottom: 0, width: 1, borderLeft: '1px dashed var(--text-muted)', pointerEvents: 'none', zIndex: 2 }} />
              <div style={{ position: 'absolute', top: Math.max(0, Math.min(PH, hov.my)), left: 0, right: 0, height: 1, borderTop: '1px dashed var(--text-muted)', pointerEvents: 'none', zIndex: 2 }} />
              {lines.map(l => { const v = hoverPoint[l.key]; if (v == null) return null; return (
                <span key={l.key} style={{ position: 'absolute', left: `${crossLeftPct}%`, top: yAt(v), transform: 'translate(-50%, -50%)', width: 8, height: 8, borderRadius: '50%', background: l.color, border: '2px solid var(--bg-card)', pointerEvents: 'none', zIndex: 3 }} />
              ); })}
              {/* Infobulle près du curseur */}
              <div style={{ position: 'absolute', left: crossLeftPct > 60 ? undefined : `${crossLeftPct}%`, right: crossLeftPct > 60 ? `${100 - crossLeftPct}%` : undefined, top: 6, transform: crossLeftPct > 60 ? 'translateX(-8px)' : 'translateX(8px)', pointerEvents: 'none', zIndex: 4, background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius)', padding: '6px 9px', boxShadow: 'var(--shadow-lg)', minWidth: 90 }}>
                <div style={{ font: '9px/1.2 var(--font-mono)', color: 'var(--text-muted)', marginBottom: 4 }}>{xFmt(hoverPoint[xKey])}</div>
                {lines.map(l => { const v = hoverPoint[l.key]; return (
                  <div key={l.key} style={{ display: 'flex', alignItems: 'center', gap: 6, font: '11px/1.4 var(--font-mono)' }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: l.color, flexShrink: 0 }} />
                    {l.label && <span style={{ color: 'var(--text-muted)' }}>{l.label}</span>}
                    <span style={{ color: 'var(--text)', fontWeight: 600, marginLeft: 'auto' }}>{v == null ? '—' : yFmt(v)}</span>
                  </div>
                ); })}
              </div>
            </React.Fragment>
          )}
        </div>
      </div>

      {/* Axe X (HTML) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginLeft: yAxisWidth, marginTop: 8, font: '10px/1 var(--font-mono)', color: 'var(--text-dim)' }}>
        {xIdx.map((k, i) => (
          <span key={i} style={{ position: 'relative', textAlign: i === 0 ? 'left' : i === xIdx.length - 1 ? 'right' : 'center' }}>{xFmt(vis[k] && vis[k][xKey])}</span>
        ))}
      </div>
      {(footer || zoom || panY) && (
        <div style={{ marginLeft: yAxisWidth, marginTop: 6, font: 'var(--type-caption)', color: 'var(--text-dim)', display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <span>{footer}</span>
          {(zoom || panY) && <span>{zoom ? 'Molette : zoom · ' : ''}glisser : déplacer{panY ? ' (H/V)' : ''} · double-clic : réinitialiser</span>}
        </div>
      )}
    </div>
  );
}

window.DXChart = DXChart;
