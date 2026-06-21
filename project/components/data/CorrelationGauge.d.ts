import * as React from 'react';

export interface CorrelationGaugeProps {
  /** Implied correlation, 0..1. */
  implied: number;
  /** Realized correlation, 0..1. */
  realized: number;
  /** Pixel width of the gauge (height auto). */
  size?: number;
}

/**
 * Semicircular gauge for the correlation premium (implied − realized).
 * Verdict: Favorable / Neutre / Défavorable to classic dispersion.
 * @startingPoint section="Data" subtitle="Correlation-premium gauge — the workflow centerpiece" viewport="320x260"
 */
export function CorrelationGauge(props: CorrelationGaugeProps): JSX.Element;
