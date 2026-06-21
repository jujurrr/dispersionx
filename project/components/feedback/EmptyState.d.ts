import * as React from 'react';

export interface EmptyStateProps {
  /** Optional muted icon node. */
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Optional CTA node (e.g. a Button). */
  action?: React.ReactNode;
  style?: React.CSSProperties;
}

/** Calm placeholder for empty lists or no-selection states. */
export function EmptyState(props: EmptyStateProps): JSX.Element;
