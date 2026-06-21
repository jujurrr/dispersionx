import React from 'react';

/**
 * DispersionX primary button. One structural accent; calm hover/press.
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon = null,
  disabled = false,
  full = false,
  type = 'button',
  onClick,
  style = {},
  ...rest
}) {
  const sizes = {
    sm: { padding: '5px 10px', font: '600 11px/1 var(--font-sans)' },
    md: { padding: '8px 14px', font: '600 12px/1 var(--font-sans)' },
    lg: { padding: '11px 22px', font: '600 13px/1 var(--font-sans)' },
  };
  const variants = {
    primary: { background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' },
    outline: { background: 'var(--bg-elevated)', color: 'var(--text)', borderColor: 'var(--border)' },
    ghost:   { background: 'transparent', color: 'var(--text-muted)', borderColor: 'transparent' },
    danger:  { background: 'var(--neg-soft)', color: 'var(--neg-bright)', borderColor: 'rgba(239,83,80,0.3)' },
    success: { background: 'var(--pos)', color: '#fff', borderColor: 'var(--pos)' },
  };
  const v = variants[variant] || variants.primary;
  const s = sizes[size] || sizes.md;

  const [hover, setHover] = React.useState(false);
  const hoverBg = {
    primary: 'var(--accent-hover)', outline: 'var(--bg-hover)',
    ghost: 'var(--bg-hover)', danger: 'var(--neg)', success: 'var(--pos-bright)',
  }[variant];

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        font: s.font, padding: s.padding, borderRadius: 'var(--radius-sm)',
        border: '1px solid', whiteSpace: 'nowrap', cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all var(--dur-fast) var(--ease)', width: full ? '100%' : 'auto',
        opacity: disabled ? 0.45 : 1,
        ...v,
        ...(hover && !disabled ? { background: hoverBg, borderColor: variant === 'danger' ? 'var(--neg)' : (variant === 'outline' || variant === 'ghost' ? 'var(--border-strong)' : hoverBg) } : {}),
        ...style,
      }}
      {...rest}
    >
      {icon && <span style={{ display: 'inline-flex' }}>{icon}</span>}
      {children}
    </button>
  );
}
