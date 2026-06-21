import * as React from 'react';

export interface ButtonProps {
  children?: React.ReactNode;
  /** Visual role. Reserve `primary` for the single main action on a view. */
  variant?: 'primary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  /** Optional leading icon node (e.g. a Lucide SVG). */
  icon?: React.ReactNode;
  disabled?: boolean;
  /** Stretch to container width. */
  full?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  style?: React.CSSProperties;
}

/**
 * Primary action button for DispersionX.
 * @startingPoint section="Core" subtitle="Buttons — primary, outline, ghost, danger" viewport="700x120"
 */
export function Button(props: ButtonProps): JSX.Element;
