import * as React from 'react';

export interface MetricCardProps {
  /** Uppercase micro-label (e.g. "IV ATM", "PRIME ρ"). */
  label: React.ReactNode;
  /** The figure — render as a string/number; shown in mono. */
  value: React.ReactNode;
  /** Unit suffix, always shown (e.g. "%", "bps", "j"). */
  unit?: string;
  /** Optional change indicator (e.g. "+1.2 pts"). */
  delta?: React.ReactNode;
  /** Force delta color, or 'auto' to infer from sign. */
  deltaTone?: 'auto' | 'pos' | 'neg' | 'neutral';
  /** Tooltip text on a (?) help marker. */
  hint?: string;
  /** Optional left accent bar color (CSS color/var). */
  accent?: string;
  size?: 'md' | 'lg';
  /** Dark-glass treatment (semi-transparent + blur) instead of solid card. */
  glass?: boolean;
  /** Animate value count-up + entrance on mount. Default true; respects reduced-motion. */
  animate?: boolean;
  style?: React.CSSProperties;
}

/**
 * Single labelled metric with mono value, unit and optional delta.
 * @startingPoint section="Data" subtitle="Metric cards for dashboards & risk panels" viewport="700x150"
 */
export function MetricCard(props: MetricCardProps): JSX.Element;
