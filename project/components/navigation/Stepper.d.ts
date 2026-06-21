import * as React from 'react';

export interface StepperProps {
  /** Step labels (string) or objects with a `label`. */
  steps: Array<string | { label: string }>;
  /** Zero-based index of the active step. */
  current?: number;
  /** Click handler (index) — only fires for done/active steps. */
  onStepClick?: (index: number) => void;
  style?: React.CSSProperties;
}

/**
 * Horizontal progress rail for the Strategy Builder wizard.
 * @startingPoint section="Navigation" subtitle="Wizard progress stepper" viewport="900x80"
 */
export function Stepper(props: StepperProps): JSX.Element;
