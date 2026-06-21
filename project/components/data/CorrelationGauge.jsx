import React from 'react';

/**
 * CorrelationGauge — a semicircular gauge showing the correlation premium
 * (implied − realized). The intellectual centerpiece of the workflow.
 * Premium > 0 (implied richer than realized) is favorable to classic dispersion.
 */
export function CorrelationGauge({
  implied,        // 0..1
  realized,       // 0..1
  size = 220,
}) {
  const premium = (implied - realized) * 100; // in points
  // map premium roughly -20..+20 pts onto 0..1 of the arc
  const norm = Math.max(0, Math.min(1, (premium + 20) / 40));
  const R = 80, CX = 100, CY = 100;
  const startA = Math.PI, endA = 0; // semicircle, left→right
  const a = startA + (endA - startA) * norm;
  const nx = CX + R * Math.cos(a);
  const ny = CY - R * Math.sin(a);

  let tone, verdict;
  if (premium >= 6) { tone = 'var(--pos-bright)'; verdict = 'Favorable'; }
  else if (premium >= 0) { tone = 'var(--warn)'; verdict = 'Neutre'; }
  else { tone = 'var(--neg-bright)'; verdict = 'Défavorable'; }

  const arcPath = (frac0, frac1) => {
    const a0 = startA + (endA - startA) * frac0;
    const a1 = startA + (endA - startA) * frac1;
    return `M ${CX + R * Math.cos(a0)} ${CY - R * Math.sin(a0)} A ${R} ${R} 0 0 1 ${CX + R * Math.cos(a1)} ${CY - R * Math.sin(a1)}`;
  };

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', width: size }}>
      <svg viewBox="0 0 200 116" width={size} height={size * 0.58}>
        {/* track segments: red | amber | teal */}
        <path d={arcPath(0, 0.5)} fill="none" stroke="var(--neg-soft)" strokeWidth="12" strokeLinecap="round" />
        <path d={arcPath(0.5, 0.65)} fill="none" stroke="var(--warn-soft)" strokeWidth="12" />
        <path d={arcPath(0.65, 1)} fill="none" stroke="var(--pos-soft)" strokeWidth="12" strokeLinecap="round" />
        {/* active value tick */}
        <line x1={CX} y1={CY} x2={nx} y2={ny} stroke={tone} strokeWidth="2.5" strokeLinecap="round" />
        <circle cx={CX} cy={CY} r="5" fill={tone} />
        <circle cx={nx} cy={ny} r="4.5" fill={tone} />
      </svg>
      <div style={{ marginTop: -22, textAlign: 'center' }}>
        <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: 'var(--track-label)', color: 'var(--text-muted)' }}>Prime de corrélation</div>
        <div style={{ font: 'var(--type-data-xl)', color: tone, letterSpacing: '-0.02em', marginTop: 4 }}>
          {premium >= 0 ? '+' : ''}{premium.toFixed(1)}<span style={{ fontSize: '0.4em', color: 'var(--text-muted)', marginLeft: 3 }}>pts</span>
        </div>
        <div style={{ font: '700 11px/1 var(--font-sans)', color: tone, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 6 }}>{verdict}</div>
      </div>
      <div style={{ display: 'flex', gap: 18, marginTop: 14 }}>
        <Leg label="ρ implicite" val={implied} color="var(--accent-hover)" />
        <Leg label="ρ̂ réalisée" val={realized} color="var(--info)" />
      </div>
    </div>
  );
}

function Leg({ label, val, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: 'var(--track-label)', color: 'var(--text-muted)', marginBottom: 3 }}>{label}</div>
      <div style={{ font: 'var(--type-data)', color }}>{val.toFixed(2)}</div>
    </div>
  );
}
