import * as React from 'react';

export interface RiskBadgeProps {
  /** Risk level — drives color and default label. */
  level?: 'faible' | 'modéré' | 'élevé' | 'critique';
  /** Custom label; defaults to "Risque {level}". */
  children?: React.ReactNode;
  size?: 'sm' | 'md';
}

/** Risk-level indicator used in scenarios, warnings and the Risk Lab. */
export function RiskBadge(props: RiskBadgeProps): JSX.Element;
