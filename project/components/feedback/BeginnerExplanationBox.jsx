import React from 'react';

/**
 * BeginnerExplanationBox — the signature "En clair" pedagogy callout.
 * Calm violet/info framing; appears in beginner mode beside complex concepts.
 */
export function BeginnerExplanationBox({ title = 'En clair', children, style = {} }) {
  return (
    <div style={{
      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
      borderLeft: '3px solid var(--info)', borderRadius: 'var(--radius)',
      padding: '13px 16px', ...style,
    }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        font: '700 10px/1 var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.07em',
        color: 'var(--info)', marginBottom: 7,
      }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1h6c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2Z" />
        </svg>
        {title}
      </div>
      <div style={{ font: 'var(--type-body)', color: 'var(--text-soft)' }}>{children}</div>
    </div>
  );
}
