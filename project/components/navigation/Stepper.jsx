import React from 'react';

/**
 * Stepper — the Strategy Builder progress rail (8 steps).
 * Steps show done / active / todo state; done & active are clickable.
 */
export function Stepper({ steps, current = 0, onStepClick = null, style = {} }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 0, padding: '12px 4px',
      overflowX: 'auto', ...style,
    }}>
      {steps.map((step, i) => {
        const state = i < current ? 'done' : i === current ? 'active' : 'todo';
        const label = typeof step === 'string' ? step : step.label;
        const clickable = onStepClick && state !== 'todo';
        const numBg = { done: 'var(--pos)', active: 'var(--accent)', todo: 'var(--bg-base)' }[state];
        const numColor = state === 'todo' ? 'var(--text-muted)' : '#fff';
        const labelColor = { done: 'var(--text-dim)', active: 'var(--text)', todo: 'var(--text-muted)' }[state];
        return (
          <React.Fragment key={i}>
            <div
              onClick={clickable ? () => onStepClick(i) : undefined}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px',
                borderRadius: 'var(--radius-lg)', whiteSpace: 'nowrap',
                cursor: clickable ? 'pointer' : 'default',
                background: state === 'active' ? 'var(--bg-elevated)' : 'transparent',
              }}
            >
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                font: '700 12px/1 var(--font-mono)', background: numBg, color: numColor,
                border: state === 'todo' ? '1px solid var(--border)' : 'none',
              }}>
                {state === 'done' ? '✓' : i + 1}
              </span>
              <span style={{
                font: '13px/1 var(--font-sans)', fontWeight: state === 'active' ? 600 : 500,
                color: labelColor,
              }}>{label}</span>
            </div>
            {i < steps.length - 1 && (
              <span style={{ width: 24, height: 2, background: 'var(--border)', flexShrink: 0 }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
