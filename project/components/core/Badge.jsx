import React from 'react';

/**
 * Small status/category pill. Soft semantic fill over the dark canvas.
 */
export function Badge({ children, tone = 'neutral', size = 'md', dot = false, pulse = false, style = {} }) {
  const tones = {
    neutral: { bg: 'var(--bg-elevated)', fg: 'var(--text-muted)', bd: 'var(--border)' },
    accent:  { bg: 'var(--accent-soft)', fg: 'var(--accent-hover)', bd: 'var(--accent-border)' },
    pos:     { bg: 'var(--pos-soft)', fg: 'var(--pos-bright)', bd: 'rgba(38,166,154,0.3)' },
    neg:     { bg: 'var(--neg-soft)', fg: 'var(--neg-bright)', bd: 'rgba(239,83,80,0.3)' },
    warn:    { bg: 'var(--warn-soft)', fg: 'var(--warn)', bd: 'rgba(255,152,0,0.3)' },
    info:    { bg: 'var(--info-soft)', fg: 'var(--info)', bd: 'rgba(171,104,217,0.3)' },
  };
  const t = tones[tone] || tones.neutral;
  const sz = size === 'sm'
    ? { font: '600 9px/1 var(--font-sans)', padding: '3px 6px' }
    : { font: '600 10px/1 var(--font-sans)', padding: '4px 9px' };
  const pulseClass = pulse ? (tone === 'neg' ? 'dx-pulse-neg' : 'dx-pulse') : '';
  return (
    <span className={pulseClass} style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: t.bg, color: t.fg, border: `1px solid ${t.bd}`,
      borderRadius: 'var(--radius-pill)', textTransform: 'uppercase',
      letterSpacing: '0.05em', ...sz, ...style,
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.fg }} />}
      {children}
    </span>
  );
}
