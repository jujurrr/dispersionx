import React from 'react';

/**
 * ScoreBadge — a 0–100 score (or signed edge) with tiered color + label.
 * Mirrors the scoring engine tiers (FORT / MODÉRÉ / FAIBLE / NÉGATIF).
 */
export function ScoreBadge({ score, max = 100, label = null, size = 'md' }) {
  // tiering on a 0-100 scale
  const pct = max ? (score / max) * 100 : score;
  let tone;
  if (pct >= 75) tone = 'pos';
  else if (pct >= 50) tone = 'lime';
  else if (pct >= 30) tone = 'warn';
  else tone = 'neg';

  const map = {
    pos:  { fg: 'var(--pos-bright)', bg: 'var(--pos-soft)', bd: 'rgba(38,166,154,0.3)', auto: 'FORT' },
    lime: { fg: 'var(--lime)', bg: 'var(--lime-soft)', bd: 'rgba(102,187,106,0.3)', auto: 'MODÉRÉ' },
    warn: { fg: 'var(--warn)', bg: 'var(--warn-soft)', bd: 'rgba(255,152,0,0.3)', auto: 'FAIBLE' },
    neg:  { fg: 'var(--neg-bright)', bg: 'var(--neg-soft)', bd: 'rgba(239,83,80,0.3)', auto: 'NÉGATIF' },
  };
  const t = map[tone];
  const big = size === 'lg';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: big ? 9 : 7,
      background: t.bg, border: `1px solid ${t.bd}`, borderRadius: 'var(--radius)',
      padding: big ? '8px 14px' : '4px 9px',
    }}>
      <span style={{ font: big ? 'var(--type-data-lg)' : 'var(--type-data)', color: t.fg, fontWeight: 800 }}>
        {score}{max ? <span style={{ fontSize: '0.6em', color: 'var(--text-muted)' }}>/{max}</span> : ''}
      </span>
      <span style={{
        font: big ? '700 10px/1 var(--font-sans)' : '700 9px/1 var(--font-sans)', color: t.fg,
        textTransform: 'uppercase', letterSpacing: '0.06em',
      }}>{label || t.auto}</span>
    </span>
  );
}
