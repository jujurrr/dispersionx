import * as React from 'react';

export interface BeginnerExplanationBoxProps {
  /** Eyebrow title — defaults to "En clair". */
  title?: React.ReactNode;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

/**
 * The signature "En clair" plain-language callout shown in beginner mode.
 * @startingPoint section="Feedback" subtitle="Plain-language pedagogy callout" viewport="700x150"
 */
export function BeginnerExplanationBox(props: BeginnerExplanationBoxProps): JSX.Element;
