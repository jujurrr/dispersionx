import * as React from 'react';

export interface WarningPanelProps {
  /** Tone — warn (caution), neg (risk), info (recommendation), pos. */
  tone?: 'warn' | 'neg' | 'info' | 'pos';
  /** Uppercase title line. */
  title?: React.ReactNode;
  children?: React.ReactNode;
  /** Optional leading icon node. */
  icon?: React.ReactNode;
  style?: React.CSSProperties;
}

/** Left-accented banner for risks, cautions and recommendations. */
export function WarningPanel(props: WarningPanelProps): JSX.Element;
