import * as React from 'react';

export interface BadgeProps {
  children?: React.ReactNode;
  /** Semantic tone — color carries meaning, not decoration. */
  tone?: 'neutral' | 'accent' | 'pos' | 'neg' | 'warn' | 'info';
  size?: 'sm' | 'md';
  /** Show a leading status dot in the tone color. */
  dot?: boolean;
  /** Subtle pulsing ring — for an alert badge that just appeared. */
  pulse?: boolean;
  style?: React.CSSProperties;
}

/** Compact uppercase status / category pill. */
export function Badge(props: BadgeProps): JSX.Element;
