import React from 'react';

/**
 * RiskBadge — a labelled risk-level indicator (faible / modéré / élevé / critique).
 */
export function RiskBadge({ level = 'modéré', children, size = 'md' }) {
  const map = {
    'faible':   { fg: 'var(--pos-bright)', bg: 'var(--pos-soft)', bd: 'rgba(38,166,154,0.3)' },
    'modéré':   { fg: 'var(--warn)', bg: 'var(--warn-soft)', bd: 'rgba(255,152,0,0.3)' },
    'élevé':    { fg: 'var(--neg-bright)', bg: 'var(--neg-soft)', bd: 'rgba(239,83,80,0.3)' },
    'critique': { fg: '#fff', bg: 'var(--neg)', bd: 'var(--neg)' },
  };
  const t = map[level] || map['modéré'];
  const sz = size === 'sm'
    ? { font: '700 9px/1 var(--font-sans)', padding: '3px 7px' }
    : { font: '700 10px/1 var(--font-sans)', padding: '4px 10px' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: t.bg, color: t.fg, border: `1px solid ${t.bd}`,
      borderRadius: 'var(--radius-sm)', textTransform: 'uppercase', letterSpacing: '0.06em', ...sz,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.fg }} />
      {children || `Risque ${level}`}
    </span>
  );
}
