import React from 'react';

/**
 * WarningPanel — a left-accented banner for risks, cautions and recommendations.
 */
export function WarningPanel({ tone = 'warn', title, children, icon = null, style = {} }) {
  const map = {
    warn: { fg: 'var(--warn)', bg: 'var(--warn-soft)', bd: 'rgba(255,152,0,0.3)', bar: 'var(--warn)' },
    neg:  { fg: 'var(--neg-bright)', bg: 'var(--neg-soft)', bd: 'rgba(239,83,80,0.3)', bar: 'var(--neg)' },
    info: { fg: 'var(--accent-hover)', bg: 'var(--accent-soft)', bd: 'var(--accent-border)', bar: 'var(--accent)' },
    pos:  { fg: 'var(--pos-bright)', bg: 'var(--pos-soft)', bd: 'rgba(38,166,154,0.3)', bar: 'var(--pos)' },
  };
  const t = map[tone] || map.warn;
  return (
    <div style={{
      background: t.bg, border: `1px solid ${t.bd}`, borderLeft: `3px solid ${t.bar}`,
      borderRadius: 'var(--radius)', padding: '12px 16px', display: 'flex', gap: 11, ...style,
    }}>
      {icon && <span style={{ color: t.fg, flexShrink: 0, marginTop: 1 }}>{icon}</span>}
      <div>
        {title && <div style={{
          font: '700 10px/1.3 var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.07em',
          color: t.fg, marginBottom: children ? 5 : 0,
        }}>{title}</div>}
        {children && <div style={{ font: 'var(--type-body-sm)', color: 'var(--text-soft)' }}>{children}</div>}
      </div>
    </div>
  );
}
