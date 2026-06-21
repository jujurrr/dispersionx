import React from 'react';

/**
 * EmptyState — calm placeholder for empty lists / no-selection views.
 */
export function EmptyState({ icon = null, title, description = null, action = null, style = {} }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
      padding: '56px 24px', ...style,
    }}>
      {icon && <div style={{ color: 'var(--text-dim)', marginBottom: 16, opacity: 0.6 }}>{icon}</div>}
      <div style={{ font: 'var(--type-h3)', color: 'var(--text-soft)', marginBottom: 6 }}>{title}</div>
      {description && (
        <div style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', maxWidth: 340, marginBottom: action ? 18 : 0 }}>
          {description}
        </div>
      )}
      {action}
    </div>
  );
}
