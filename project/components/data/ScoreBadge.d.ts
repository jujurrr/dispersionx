import * as React from 'react';

export interface ScoreBadgeProps {
  /** The score value. */
  score: number;
  /** Denominator (default 100). Pass 0 to render a bare signed value. */
  max?: number;
  /** Override the auto tier label (FORT / MODÉRÉ / FAIBLE / NÉGATIF). */
  label?: string;
  size?: 'md' | 'lg';
}

/** Tiered score chip — color follows the scoring engine's signal tiers. */
export function ScoreBadge(props: ScoreBadgeProps): JSX.Element;
