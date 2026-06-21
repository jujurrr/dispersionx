import React from 'react';

/**
 * Animated count-up that preserves a value's sign, decimals and thousands.
 * Falls back to the raw value for non-numeric strings or reduced-motion.
 */
function useCountUp(value, enabled) {
  const str = String(value);
  const m = str.match(/^([^\d]*?[-−+]?\s*)([\d., ]*\d)(.*)$/);
  const reduce = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const target = m ? parseFloat(m[2].replace(/[,\s]/g, '')) : NaN;
  const [n, setN] = React.useState(enabled && m && !reduce ? 0 : target);

  React.useEffect(() => {
    if (!enabled || !m || reduce || isNaN(target)) { setN(target); return; }
    let raf, start;
    const dur = 750;
    const step = (t) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(target * eased);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [str, enabled]);

  if (!m || isNaN(target)) return str;
  const decimals = (m[2].split('.')[1] || '').length;
  const hasThousands = m[2].includes(',');
  let body = Math.abs(n).toFixed(decimals);
  if (hasThousands) {
    const [int, dec] = body.split('.');
    body = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (dec ? '.' + dec : '');
  }
  return m[1] + body + m[3];
}

/**
 * MetricCard — a single labelled figure (mono, animated count-up), optional
 * delta, unit and glass treatment. The workhorse of dashboards & risk panels.
 */
export function MetricCard({
  label,
  value,
  unit = '',
  delta = null,
  deltaTone = 'auto',
  hint = null,
  accent = null,
  size = 'md',
  glass = false,
  animate = true,
  style = {},
}) {
  let dt = deltaTone;
  if (delta != null && deltaTone === 'auto') {
    const n = parseFloat(String(delta).replace(/[^0-9.\-]/g, ''));
    dt = n > 0 ? 'pos' : n < 0 ? 'neg' : 'neutral';
  }
  const deltaColor = { pos: 'var(--pos-bright)', neg: 'var(--neg-bright)', neutral: 'var(--text-muted)' }[dt] || 'var(--text-muted)';
  const valFont = size === 'lg' ? 'var(--type-data-xl)' : 'var(--type-data-lg)';
  const shown = useCountUp(value, animate);

  const base = glass
    ? {}
    : { background: 'var(--bg-card)', border: '1px solid var(--border)' };

  return (
    <div
      className={(glass ? 'dx-glass dx-lift' : 'dx-lift') + (animate ? ' dx-rise' : '')}
      style={{
        borderRadius: 'var(--radius-lg)', padding: '14px 16px', position: 'relative',
        overflow: 'hidden', ...base, ...style,
      }}
    >
      {accent && <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: accent }} />}
      <div style={{
        font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: 'var(--track-label)',
        color: 'var(--text-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6,
      }}>
        {label}
        {hint && <span title={hint} style={{
          width: 13, height: 13, borderRadius: '50%', border: '1px solid var(--border-strong)',
          color: 'var(--text-dim)', font: '600 9px/12px var(--font-sans)', textAlign: 'center', cursor: 'help',
        }}>?</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ font: valFont, color: 'var(--text)', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
          {shown}{unit && <span style={{ fontSize: '0.55em', color: 'var(--text-muted)', marginLeft: 2 }}>{unit}</span>}
        </span>
        {delta != null && (
          <span style={{ font: 'var(--type-data-sm)', color: deltaColor, fontWeight: 600 }}>{delta}</span>
        )}
      </div>
    </div>
  );
}
