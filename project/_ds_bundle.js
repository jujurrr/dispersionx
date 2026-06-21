/* @ds-bundle: {"format":3,"namespace":"DispersionXDesignSystem_cb86be","components":[{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"MetricCard","sourcePath":"components/core/MetricCard.jsx"},{"name":"CorrelationGauge","sourcePath":"components/data/CorrelationGauge.jsx"},{"name":"RiskBadge","sourcePath":"components/data/RiskBadge.jsx"},{"name":"ScoreBadge","sourcePath":"components/data/ScoreBadge.jsx"},{"name":"BeginnerExplanationBox","sourcePath":"components/feedback/BeginnerExplanationBox.jsx"},{"name":"EmptyState","sourcePath":"components/feedback/EmptyState.jsx"},{"name":"WarningPanel","sourcePath":"components/feedback/WarningPanel.jsx"},{"name":"Stepper","sourcePath":"components/navigation/Stepper.jsx"}],"sourceHashes":{"components/core/Badge.jsx":"090409618d04","components/core/Button.jsx":"ba43e5ec7dc2","components/core/MetricCard.jsx":"5b548ab3bb4d","components/data/CorrelationGauge.jsx":"25242f5a0a2a","components/data/RiskBadge.jsx":"9ea55f67e29f","components/data/ScoreBadge.jsx":"4bd6ee0eb6f7","components/feedback/BeginnerExplanationBox.jsx":"1d91348312a8","components/feedback/EmptyState.jsx":"7b6ce05c465d","components/feedback/WarningPanel.jsx":"996e7a4a1683","components/navigation/Stepper.jsx":"f3fd83ebadcd","handoff/examples/renderIndexDetail.js":"e6d02267acb0","handoff/theme-toggle.js":"60ff293f7b1c","ui_kits/app/App.jsx":"9c26b8c22567","ui_kits/app/Builder.jsx":"328f6c018efb","ui_kits/app/CorrelationLab.jsx":"07b03ba54b15","ui_kits/app/Dashboard.jsx":"b00b6e622e1f","ui_kits/app/RiskLab.jsx":"0fa7e587c938","ui_kits/app/Shell.jsx":"288ef1763303","ui_kits/app/StrategyMonitor.jsx":"2f5ca091295b","ui_kits/app/TradeBrief.jsx":"6837919fe530","ui_kits/app/VolatilityLab.jsx":"13033f7ebf4e","ui_kits/app/data.js":"24fe28c60927","ui_kits/marketing/Landing.jsx":"8bfcaae58707","ui_kits/theme.js":"78782a715ce8"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.DispersionXDesignSystem_cb86be = window.DispersionXDesignSystem_cb86be || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Badge.jsx
try { (() => {
/**
 * Small status/category pill. Soft semantic fill over the dark canvas.
 */
function Badge({
  children,
  tone = 'neutral',
  size = 'md',
  dot = false,
  pulse = false,
  style = {}
}) {
  const tones = {
    neutral: {
      bg: 'var(--bg-elevated)',
      fg: 'var(--text-muted)',
      bd: 'var(--border)'
    },
    accent: {
      bg: 'var(--accent-soft)',
      fg: 'var(--accent-hover)',
      bd: 'var(--accent-border)'
    },
    pos: {
      bg: 'var(--pos-soft)',
      fg: 'var(--pos-bright)',
      bd: 'rgba(38,166,154,0.3)'
    },
    neg: {
      bg: 'var(--neg-soft)',
      fg: 'var(--neg-bright)',
      bd: 'rgba(239,83,80,0.3)'
    },
    warn: {
      bg: 'var(--warn-soft)',
      fg: 'var(--warn)',
      bd: 'rgba(255,152,0,0.3)'
    },
    info: {
      bg: 'var(--info-soft)',
      fg: 'var(--info)',
      bd: 'rgba(171,104,217,0.3)'
    }
  };
  const t = tones[tone] || tones.neutral;
  const sz = size === 'sm' ? {
    font: '600 9px/1 var(--font-sans)',
    padding: '3px 6px'
  } : {
    font: '600 10px/1 var(--font-sans)',
    padding: '4px 9px'
  };
  const pulseClass = pulse ? tone === 'neg' ? 'dx-pulse-neg' : 'dx-pulse' : '';
  return /*#__PURE__*/React.createElement("span", {
    className: pulseClass,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      background: t.bg,
      color: t.fg,
      border: `1px solid ${t.bd}`,
      borderRadius: 'var(--radius-pill)',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      ...sz,
      ...style
    }
  }, dot && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: t.fg
    }
  }), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * DispersionX primary button. One structural accent; calm hover/press.
 */
function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon = null,
  disabled = false,
  full = false,
  type = 'button',
  onClick,
  style = {},
  ...rest
}) {
  const sizes = {
    sm: {
      padding: '5px 10px',
      font: '600 11px/1 var(--font-sans)'
    },
    md: {
      padding: '8px 14px',
      font: '600 12px/1 var(--font-sans)'
    },
    lg: {
      padding: '11px 22px',
      font: '600 13px/1 var(--font-sans)'
    }
  };
  const variants = {
    primary: {
      background: 'var(--accent)',
      color: '#fff',
      borderColor: 'var(--accent)'
    },
    outline: {
      background: 'var(--bg-elevated)',
      color: 'var(--text)',
      borderColor: 'var(--border)'
    },
    ghost: {
      background: 'transparent',
      color: 'var(--text-muted)',
      borderColor: 'transparent'
    },
    danger: {
      background: 'var(--neg-soft)',
      color: 'var(--neg-bright)',
      borderColor: 'rgba(239,83,80,0.3)'
    },
    success: {
      background: 'var(--pos)',
      color: '#fff',
      borderColor: 'var(--pos)'
    }
  };
  const v = variants[variant] || variants.primary;
  const s = sizes[size] || sizes.md;
  const [hover, setHover] = React.useState(false);
  const hoverBg = {
    primary: 'var(--accent-hover)',
    outline: 'var(--bg-hover)',
    ghost: 'var(--bg-hover)',
    danger: 'var(--neg)',
    success: 'var(--pos-bright)'
  }[variant];
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    disabled: disabled,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      font: s.font,
      padding: s.padding,
      borderRadius: 'var(--radius-sm)',
      border: '1px solid',
      whiteSpace: 'nowrap',
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'all var(--dur-fast) var(--ease)',
      width: full ? '100%' : 'auto',
      opacity: disabled ? 0.45 : 1,
      ...v,
      ...(hover && !disabled ? {
        background: hoverBg,
        borderColor: variant === 'danger' ? 'var(--neg)' : variant === 'outline' || variant === 'ghost' ? 'var(--border-strong)' : hoverBg
      } : {}),
      ...style
    }
  }, rest), icon && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex'
    }
  }, icon), children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/MetricCard.jsx
try { (() => {
/**
 * Animated count-up that preserves a value's sign, decimals and thousands.
 * Falls back to the raw value for non-numeric strings or reduced-motion.
 */
function useCountUp(value, enabled) {
  const str = String(value);
  const m = str.match(/^([^\d]*?[-−+]?\s*)([\d., ]*\d)(.*)$/);
  const reduce = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const target = m ? parseFloat(m[2].replace(/[,\s]/g, '')) : NaN;
  const [n, setN] = React.useState(enabled && m && !reduce ? 0 : target);
  React.useEffect(() => {
    if (!enabled || !m || reduce || isNaN(target)) {
      setN(target);
      return;
    }
    let raf, start;
    const dur = 750;
    const step = t => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(target * eased);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [str, enabled]);
  if (!m || isNaN(target)) return str;
  const decimals = (m[2].split('.')[1] || '').length;
  const hasThousands = m[2].includes(',');
  let body = Math.abs(n).toFixed(decimals);
  if (hasThousands) {
    const [int, dec] = body.split('.');
    body = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (dec ? '.' + dec : '');
  }
  return m[1] + body + m[3];
}

/**
 * MetricCard — a single labelled figure (mono, animated count-up), optional
 * delta, unit and glass treatment. The workhorse of dashboards & risk panels.
 */
function MetricCard({
  label,
  value,
  unit = '',
  delta = null,
  deltaTone = 'auto',
  hint = null,
  accent = null,
  size = 'md',
  glass = false,
  animate = true,
  style = {}
}) {
  let dt = deltaTone;
  if (delta != null && deltaTone === 'auto') {
    const n = parseFloat(String(delta).replace(/[^0-9.\-]/g, ''));
    dt = n > 0 ? 'pos' : n < 0 ? 'neg' : 'neutral';
  }
  const deltaColor = {
    pos: 'var(--pos-bright)',
    neg: 'var(--neg-bright)',
    neutral: 'var(--text-muted)'
  }[dt] || 'var(--text-muted)';
  const valFont = size === 'lg' ? 'var(--type-data-xl)' : 'var(--type-data-lg)';
  const shown = useCountUp(value, animate);
  const base = glass ? {} : {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)'
  };
  return /*#__PURE__*/React.createElement("div", {
    className: (glass ? 'dx-glass dx-lift' : 'dx-lift') + (animate ? ' dx-rise' : ''),
    style: {
      borderRadius: 'var(--radius-lg)',
      padding: '14px 16px',
      position: 'relative',
      overflow: 'hidden',
      ...base,
      ...style
    }
  }, accent && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 2,
      background: accent
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-label)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--track-label)',
      color: 'var(--text-muted)',
      marginBottom: 8,
      display: 'flex',
      alignItems: 'center',
      gap: 6
    }
  }, label, hint && /*#__PURE__*/React.createElement("span", {
    title: hint,
    style: {
      width: 13,
      height: 13,
      borderRadius: '50%',
      border: '1px solid var(--border-strong)',
      color: 'var(--text-dim)',
      font: '600 9px/12px var(--font-sans)',
      textAlign: 'center',
      cursor: 'help'
    }
  }, "?")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 8,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: valFont,
      color: 'var(--text)',
      letterSpacing: '-0.02em',
      fontVariantNumeric: 'tabular-nums'
    }
  }, shown, unit && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '0.55em',
      color: 'var(--text-muted)',
      marginLeft: 2
    }
  }, unit)), delta != null && /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-data-sm)',
      color: deltaColor,
      fontWeight: 600
    }
  }, delta)));
}
Object.assign(__ds_scope, { MetricCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/MetricCard.jsx", error: String((e && e.message) || e) }); }

// components/data/CorrelationGauge.jsx
try { (() => {
/**
 * CorrelationGauge — a semicircular gauge showing the correlation premium
 * (implied − realized). The intellectual centerpiece of the workflow.
 * Premium > 0 (implied richer than realized) is favorable to classic dispersion.
 */
function CorrelationGauge({
  implied,
  // 0..1
  realized,
  // 0..1
  size = 220
}) {
  const premium = (implied - realized) * 100; // in points
  // map premium roughly -20..+20 pts onto 0..1 of the arc
  const norm = Math.max(0, Math.min(1, (premium + 20) / 40));
  const R = 80,
    CX = 100,
    CY = 100;
  const startA = Math.PI,
    endA = 0; // semicircle, left→right
  const a = startA + (endA - startA) * norm;
  const nx = CX + R * Math.cos(a);
  const ny = CY - R * Math.sin(a);
  let tone, verdict;
  if (premium >= 6) {
    tone = 'var(--pos-bright)';
    verdict = 'Favorable';
  } else if (premium >= 0) {
    tone = 'var(--warn)';
    verdict = 'Neutre';
  } else {
    tone = 'var(--neg-bright)';
    verdict = 'Défavorable';
  }
  const arcPath = (frac0, frac1) => {
    const a0 = startA + (endA - startA) * frac0;
    const a1 = startA + (endA - startA) * frac1;
    return `M ${CX + R * Math.cos(a0)} ${CY - R * Math.sin(a0)} A ${R} ${R} 0 0 1 ${CX + R * Math.cos(a1)} ${CY - R * Math.sin(a1)}`;
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-flex',
      flexDirection: 'column',
      alignItems: 'center',
      width: size
    }
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 200 116",
    width: size,
    height: size * 0.58
  }, /*#__PURE__*/React.createElement("path", {
    d: arcPath(0, 0.5),
    fill: "none",
    stroke: "var(--neg-soft)",
    strokeWidth: "12",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("path", {
    d: arcPath(0.5, 0.65),
    fill: "none",
    stroke: "var(--warn-soft)",
    strokeWidth: "12"
  }), /*#__PURE__*/React.createElement("path", {
    d: arcPath(0.65, 1),
    fill: "none",
    stroke: "var(--pos-soft)",
    strokeWidth: "12",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("line", {
    x1: CX,
    y1: CY,
    x2: nx,
    y2: ny,
    stroke: tone,
    strokeWidth: "2.5",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: CX,
    cy: CY,
    r: "5",
    fill: tone
  }), /*#__PURE__*/React.createElement("circle", {
    cx: nx,
    cy: ny,
    r: "4.5",
    fill: tone
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: -22,
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-label)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--track-label)',
      color: 'var(--text-muted)'
    }
  }, "Prime de corr\xE9lation"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-data-xl)',
      color: tone,
      letterSpacing: '-0.02em',
      marginTop: 4
    }
  }, premium >= 0 ? '+' : '', premium.toFixed(1), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '0.4em',
      color: 'var(--text-muted)',
      marginLeft: 3
    }
  }, "pts")), /*#__PURE__*/React.createElement("div", {
    style: {
      font: '700 11px/1 var(--font-sans)',
      color: tone,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      marginTop: 6
    }
  }, verdict)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 18,
      marginTop: 14
    }
  }, /*#__PURE__*/React.createElement(Leg, {
    label: "\u03C1 implicite",
    val: implied,
    color: "var(--accent-hover)"
  }), /*#__PURE__*/React.createElement(Leg, {
    label: "\u03C1\u0302 r\xE9alis\xE9e",
    val: realized,
    color: "var(--info)"
  })));
}
function Leg({
  label,
  val,
  color
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-label)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--track-label)',
      color: 'var(--text-muted)',
      marginBottom: 3
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-data)',
      color
    }
  }, val.toFixed(2)));
}
Object.assign(__ds_scope, { CorrelationGauge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/CorrelationGauge.jsx", error: String((e && e.message) || e) }); }

// components/data/RiskBadge.jsx
try { (() => {
/**
 * RiskBadge — a labelled risk-level indicator (faible / modéré / élevé / critique).
 */
function RiskBadge({
  level = 'modéré',
  children,
  size = 'md'
}) {
  const map = {
    'faible': {
      fg: 'var(--pos-bright)',
      bg: 'var(--pos-soft)',
      bd: 'rgba(38,166,154,0.3)'
    },
    'modéré': {
      fg: 'var(--warn)',
      bg: 'var(--warn-soft)',
      bd: 'rgba(255,152,0,0.3)'
    },
    'élevé': {
      fg: 'var(--neg-bright)',
      bg: 'var(--neg-soft)',
      bd: 'rgba(239,83,80,0.3)'
    },
    'critique': {
      fg: '#fff',
      bg: 'var(--neg)',
      bd: 'var(--neg)'
    }
  };
  const t = map[level] || map['modéré'];
  const sz = size === 'sm' ? {
    font: '700 9px/1 var(--font-sans)',
    padding: '3px 7px'
  } : {
    font: '700 10px/1 var(--font-sans)',
    padding: '4px 10px'
  };
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      background: t.bg,
      color: t.fg,
      border: `1px solid ${t.bd}`,
      borderRadius: 'var(--radius-sm)',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      ...sz
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: t.fg
    }
  }), children || `Risque ${level}`);
}
Object.assign(__ds_scope, { RiskBadge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/RiskBadge.jsx", error: String((e && e.message) || e) }); }

// components/data/ScoreBadge.jsx
try { (() => {
/**
 * ScoreBadge — a 0–100 score (or signed edge) with tiered color + label.
 * Mirrors the scoring engine tiers (FORT / MODÉRÉ / FAIBLE / NÉGATIF).
 */
function ScoreBadge({
  score,
  max = 100,
  label = null,
  size = 'md'
}) {
  // tiering on a 0-100 scale
  const pct = max ? score / max * 100 : score;
  let tone;
  if (pct >= 75) tone = 'pos';else if (pct >= 50) tone = 'lime';else if (pct >= 30) tone = 'warn';else tone = 'neg';
  const map = {
    pos: {
      fg: 'var(--pos-bright)',
      bg: 'var(--pos-soft)',
      bd: 'rgba(38,166,154,0.3)',
      auto: 'FORT'
    },
    lime: {
      fg: 'var(--lime)',
      bg: 'var(--lime-soft)',
      bd: 'rgba(102,187,106,0.3)',
      auto: 'MODÉRÉ'
    },
    warn: {
      fg: 'var(--warn)',
      bg: 'var(--warn-soft)',
      bd: 'rgba(255,152,0,0.3)',
      auto: 'FAIBLE'
    },
    neg: {
      fg: 'var(--neg-bright)',
      bg: 'var(--neg-soft)',
      bd: 'rgba(239,83,80,0.3)',
      auto: 'NÉGATIF'
    }
  };
  const t = map[tone];
  const big = size === 'lg';
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: big ? 9 : 7,
      background: t.bg,
      border: `1px solid ${t.bd}`,
      borderRadius: 'var(--radius)',
      padding: big ? '8px 14px' : '4px 9px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: big ? 'var(--type-data-lg)' : 'var(--type-data)',
      color: t.fg,
      fontWeight: 800
    }
  }, score, max ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '0.6em',
      color: 'var(--text-muted)'
    }
  }, "/", max) : ''), /*#__PURE__*/React.createElement("span", {
    style: {
      font: big ? '700 10px/1 var(--font-sans)' : '700 9px/1 var(--font-sans)',
      color: t.fg,
      textTransform: 'uppercase',
      letterSpacing: '0.06em'
    }
  }, label || t.auto));
}
Object.assign(__ds_scope, { ScoreBadge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/ScoreBadge.jsx", error: String((e && e.message) || e) }); }

// components/feedback/BeginnerExplanationBox.jsx
try { (() => {
/**
 * BeginnerExplanationBox — the signature "En clair" pedagogy callout.
 * Calm violet/info framing; appears in beginner mode beside complex concepts.
 */
function BeginnerExplanationBox({
  title = 'En clair',
  children,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      borderLeft: '3px solid var(--info)',
      borderRadius: 'var(--radius)',
      padding: '13px 16px',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      font: '700 10px/1 var(--font-sans)',
      textTransform: 'uppercase',
      letterSpacing: '0.07em',
      color: 'var(--info)',
      marginBottom: 7
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "13",
    height: "13",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1h6c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2Z"
  })), title), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-body)',
      color: 'var(--text-soft)'
    }
  }, children));
}
Object.assign(__ds_scope, { BeginnerExplanationBox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/BeginnerExplanationBox.jsx", error: String((e && e.message) || e) }); }

// components/feedback/EmptyState.jsx
try { (() => {
/**
 * EmptyState — calm placeholder for empty lists / no-selection views.
 */
function EmptyState({
  icon = null,
  title,
  description = null,
  action = null,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      padding: '56px 24px',
      ...style
    }
  }, icon && /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--text-dim)',
      marginBottom: 16,
      opacity: 0.6
    }
  }, icon), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-h3)',
      color: 'var(--text-soft)',
      marginBottom: 6
    }
  }, title), description && /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-body-sm)',
      color: 'var(--text-muted)',
      maxWidth: 340,
      marginBottom: action ? 18 : 0
    }
  }, description), action);
}
Object.assign(__ds_scope, { EmptyState });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/EmptyState.jsx", error: String((e && e.message) || e) }); }

// components/feedback/WarningPanel.jsx
try { (() => {
/**
 * WarningPanel — a left-accented banner for risks, cautions and recommendations.
 */
function WarningPanel({
  tone = 'warn',
  title,
  children,
  icon = null,
  style = {}
}) {
  const map = {
    warn: {
      fg: 'var(--warn)',
      bg: 'var(--warn-soft)',
      bd: 'rgba(255,152,0,0.3)',
      bar: 'var(--warn)'
    },
    neg: {
      fg: 'var(--neg-bright)',
      bg: 'var(--neg-soft)',
      bd: 'rgba(239,83,80,0.3)',
      bar: 'var(--neg)'
    },
    info: {
      fg: 'var(--accent-hover)',
      bg: 'var(--accent-soft)',
      bd: 'var(--accent-border)',
      bar: 'var(--accent)'
    },
    pos: {
      fg: 'var(--pos-bright)',
      bg: 'var(--pos-soft)',
      bd: 'rgba(38,166,154,0.3)',
      bar: 'var(--pos)'
    }
  };
  const t = map[tone] || map.warn;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: t.bg,
      border: `1px solid ${t.bd}`,
      borderLeft: `3px solid ${t.bar}`,
      borderRadius: 'var(--radius)',
      padding: '12px 16px',
      display: 'flex',
      gap: 11,
      ...style
    }
  }, icon && /*#__PURE__*/React.createElement("span", {
    style: {
      color: t.fg,
      flexShrink: 0,
      marginTop: 1
    }
  }, icon), /*#__PURE__*/React.createElement("div", null, title && /*#__PURE__*/React.createElement("div", {
    style: {
      font: '700 10px/1.3 var(--font-sans)',
      textTransform: 'uppercase',
      letterSpacing: '0.07em',
      color: t.fg,
      marginBottom: children ? 5 : 0
    }
  }, title), children && /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-body-sm)',
      color: 'var(--text-soft)'
    }
  }, children)));
}
Object.assign(__ds_scope, { WarningPanel });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/WarningPanel.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Stepper.jsx
try { (() => {
/**
 * Stepper — the Strategy Builder progress rail (8 steps).
 * Steps show done / active / todo state; done & active are clickable.
 */
function Stepper({
  steps,
  current = 0,
  onStepClick = null,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 0,
      padding: '12px 4px',
      overflowX: 'auto',
      ...style
    }
  }, steps.map((step, i) => {
    const state = i < current ? 'done' : i === current ? 'active' : 'todo';
    const label = typeof step === 'string' ? step : step.label;
    const clickable = onStepClick && state !== 'todo';
    const numBg = {
      done: 'var(--pos)',
      active: 'var(--accent)',
      todo: 'var(--bg-base)'
    }[state];
    const numColor = state === 'todo' ? 'var(--text-muted)' : '#fff';
    const labelColor = {
      done: 'var(--text-dim)',
      active: 'var(--text)',
      todo: 'var(--text-muted)'
    }[state];
    return /*#__PURE__*/React.createElement(React.Fragment, {
      key: i
    }, /*#__PURE__*/React.createElement("div", {
      onClick: clickable ? () => onStepClick(i) : undefined,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px',
        borderRadius: 'var(--radius-lg)',
        whiteSpace: 'nowrap',
        cursor: clickable ? 'pointer' : 'default',
        background: state === 'active' ? 'var(--bg-elevated)' : 'transparent'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 24,
        height: 24,
        borderRadius: '50%',
        flexShrink: 0,
        font: '700 12px/1 var(--font-mono)',
        background: numBg,
        color: numColor,
        border: state === 'todo' ? '1px solid var(--border)' : 'none'
      }
    }, state === 'done' ? '✓' : i + 1), /*#__PURE__*/React.createElement("span", {
      style: {
        font: '13px/1 var(--font-sans)',
        fontWeight: state === 'active' ? 600 : 500,
        color: labelColor
      }
    }, label)), i < steps.length - 1 && /*#__PURE__*/React.createElement("span", {
      style: {
        width: 24,
        height: 2,
        background: 'var(--border)',
        flexShrink: 0
      }
    }));
  }));
}
Object.assign(__ds_scope, { Stepper });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Stepper.jsx", error: String((e && e.message) || e) }); }

// handoff/examples/renderIndexDetail.js
try { (() => {
/* ════════════════════════════════════════════════════════════════════════
   EXEMPLE HANDOFF — renderIndexDetail re-skiné, PRÊT À COLLER dans views.js
   ────────────────────────────────────────────────────────────────────────
   Remplace `views.renderIndexDetail` (et ses 3 helpers) du fichier réel
   dispersion_v3/frontend/js/views.js.

   ⚠ LA LOGIQUE EST IDENTIQUE À L'ORIGINAL :
     - mêmes appels : api.getIndex / api.getSnapshot / api.batchQuotes
     - même état _comp { symbol, rows, sortKey, sortDir, filter }
     - même filtre de recherche, même cycle de tri asc→desc→aucun
     - même chargement quotes par lots de 40 (realtime=true)
   Seuls le HTML produit et les classes CSS changent pour adopter la DA.

   PRÉREQUIS (déjà fournis dans handoff/) :
     - dispersionx-theme.css chargé après style.css (variables + classes DA)
     - les classes ci-dessous (.ix-head, .snap, .search, table.comp, etc.)
       sont à ajouter à style.css OU dispersionx-theme.css. Le bloc CSS de
       référence est en bas de ce fichier (commenté).
   ════════════════════════════════════════════════════════════════════════ */

views.renderIndexDetail = async function (symbol) {
  app.setBreadcrumb([{
    label: 'Indices',
    href: '#/'
  }, {
    label: symbol,
    current: true
  }]);
  const view = document.getElementById('view');
  view.innerHTML = '<div class="empty-state"><div class="empty-title">Chargement…</div></div>';
  let idx, snapshot;
  utils.showLoader(`Récupération des données ${symbol}…`);
  try {
    [idx, snapshot] = await Promise.all([api.getIndex(symbol), api.getSnapshot(symbol).catch(() => null)]);
  } catch (err) {
    utils.hideLoader();
    view.innerHTML = `<div class="empty-state"><div class="empty-title">Erreur</div><div class="empty-desc">${err.message}</div></div>`;
    return;
  }
  utils.hideLoader();
  app.state.currentIndex = idx;
  app.state.duration = app.state.duration || 30;
  if (snapshot && snapshot.error) snapshot = null;
  const up = (snapshot?.change_pct ?? 0) >= 0;
  view.innerHTML = `
    <div class="ix-head">
      <div class="ix-title">
        <span class="ix-flag">${idx.country_flag}</span>
        <div>
          <h1>${utils.escapeHtml(idx.name)}</h1>
          <div class="tags">
            <span class="tag">${idx.symbol}</span>
            <span class="tag">${idx.currency}</span>
            <span class="tag">${idx.components.length} actions</span>
            <span class="tag">ETF ${idx.etf_proxy}</span>
            ${idx.options_liquid ? '<span class="tag live">Options liquides</span>' : ''}
          </div>
        </div>
      </div>
      <div class="ix-price">
        ${snapshot ? `
          <div class="p">${utils.fmtNum(snapshot.last_price, 2)}</div>
          <div class="c ${up ? 'up' : 'down'}">${up ? '▲' : '▼'} ${utils.fmtPct(snapshot.change_pct, 2)}</div>
        ` : '<div style="color:var(--text-muted);font-size:12px;">Snapshot indisponible</div>'}
      </div>
    </div>

    ${snapshot ? `
      <div class="snap">
        <div class="snap-cell"><div class="l">HV 30j</div><div class="v" style="color:var(--amber)">${utils.fmtPct(snapshot.hv_30, 1)}</div></div>
        <div class="snap-cell"><div class="l">HV 1Y</div><div class="v">${utils.fmtPct(snapshot.hv_252, 1)}</div></div>
        <div class="snap-cell"><div class="l">IV estimée</div><div class="v">${utils.fmtPct(snapshot.iv_estimate, 1)}</div></div>
        <div class="snap-cell"><div class="l">Perf 5j</div><div class="v ${(snapshot.perf_5d ?? 0) >= 0 ? 'up' : 'down'}">${utils.fmt(snapshot.perf_5d, 2)}%</div></div>
        <div class="snap-cell"><div class="l">Perf 30j</div><div class="v ${(snapshot.perf_30d ?? 0) >= 0 ? 'up' : 'down'}">${utils.fmt(snapshot.perf_30d, 2)}%</div></div>
        <div class="snap-cell"><div class="l">YTD</div><div class="v ${(snapshot.perf_ytd ?? 0) >= 0 ? 'up' : 'down'}">${utils.fmt(snapshot.perf_ytd, 2)}%</div></div>
      </div>
    ` : ''}

    <div class="strat-bar">
      <span>Durée stratégie</span>
      <div class="pills">
        ${[14, 30, 45, 60, 90].map(d => `<button class="pill ${app.state.duration === d ? 'active' : ''}" data-duration="${d}">${d}j</button>`).join('')}
      </div>
      <span class="hint">Cliquez sur une action pour calculer son score de dispersion</span>
    </div>

    <div class="search">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input type="text" id="component-search" placeholder="Rechercher une action par ticker ou nom..." autocomplete="off">
      <span id="search-count" class="search-count"></span>
    </div>

    <div class="tbl-wrap">
      <table class="comp" id="components-table">
        <thead><tr>
          <th class="l sortable" data-sort="ticker">Action <span class="sort-arrow"></span></th>
          <th class="sortable" data-sort="weight">Poids <span class="sort-arrow"></span></th>
          <th class="sortable" data-sort="price">Prix <span class="sort-arrow"></span></th>
          <th class="sortable" data-sort="day">Jour <span class="sort-arrow"></span></th>
          <th class="sortable" data-sort="week">Semaine <span class="sort-arrow"></span></th>
          <th class="l sortable" data-sort="sector">Secteur <span class="sort-arrow"></span></th>
          <th>Score</th>
        </tr></thead>
        <tbody id="components-tbody"></tbody>
      </table>
    </div>
  `;
  document.querySelectorAll('.pill').forEach(b => {
    b.addEventListener('click', () => {
      app.state.duration = parseInt(b.dataset.duration);
      document.querySelectorAll('.pill').forEach(p => p.classList.toggle('active', parseInt(p.dataset.duration) === app.state.duration));
    });
  });

  // État de la vue — INCHANGÉ par rapport à l'original
  views._comp = {
    symbol: idx.symbol,
    rows: idx.components.map(c => ({
      ...c,
      price: null,
      day: null,
      week: null
    })),
    sortKey: null,
    sortDir: 0,
    filter: ''
  };
  const searchInput = document.getElementById('component-search');
  if (searchInput) {
    searchInput.addEventListener('input', e => {
      views._comp.filter = e.target.value.trim().toLowerCase();
      views.renderComponentsBody();
    });
  }
  views.renderComponentsBody();
  views.wireSortHeaders();
  views.loadQuotesForComponents();
};

// ── corps de table — filtre + tri INCHANGÉS, seul le HTML des lignes change ──
views.renderComponentsBody = function () {
  const st = views._comp;
  let rows = [...st.rows];
  if (st.filter) {
    rows = rows.filter(c => c.ticker.toLowerCase().includes(st.filter) || (c.name || '').toLowerCase().includes(st.filter));
  }
  if (st.filter && (!st.sortKey || st.sortDir === 0)) {
    rows.sort((a, b) => a.ticker.localeCompare(b.ticker));
  }
  if (st.sortKey && st.sortDir !== 0) {
    const k = st.sortKey;
    rows.sort((a, b) => {
      let va = a[k],
        vb = b[k];
      if (k === 'ticker' || k === 'sector') {
        va = (va || '').toString();
        vb = (vb || '').toString();
        return st.sortDir * va.localeCompare(vb);
      }
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      return st.sortDir * (va - vb);
    });
  }
  const countEl = document.getElementById('search-count');
  if (countEl) countEl.textContent = st.filter ? `${rows.length} / ${st.rows.length}` : '';
  const tbody = document.getElementById('components-tbody');
  if (!tbody) return;
  tbody.innerHTML = rows.map(c => {
    const dCls = c.day == null ? '' : c.day >= 0 ? 'up' : 'down';
    const wCls = c.week == null ? '' : c.week >= 0 ? 'up' : 'down';
    const dA = c.day == null ? '' : c.day >= 0 ? '▲' : '▼';
    const wA = c.week == null ? '' : c.week >= 0 ? '▲' : '▼';
    return `
      <tr data-ticker="${c.ticker}">
        <td><div class="stk">${utils.stockLogoHtml(c.ticker)}<div><div class="stk-ticker">${c.ticker}</div><div class="stk-name">${utils.escapeHtml(c.name)}</div></div></div></td>
        <td><span class="wbar"><span class="wbar-fill" style="width:${Math.min(100, c.weight * 8)}%"></span></span>${utils.fmtPct(c.weight, 2)}</td>
        <td>${c.price == null ? '<span class="q-load">···</span>' : utils.fmtNum(c.price, 2)}</td>
        <td class="${dCls}">${c.day == null ? '<span class="q-load">···</span>' : `${dA} ${utils.fmt(c.day, 2)}%`}</td>
        <td class="${wCls}">${c.week == null ? '<span class="q-load">···</span>' : `${wA} ${utils.fmt(c.week, 2)}%`}</td>
        <td class="l" style="text-align:left;"><span class="sec-tag">${c.sector}</span></td>
        <td><button class="btn-score" data-ticker="${c.ticker}">▶ Score</button></td>
      </tr>`;
  }).join('');
  tbody.querySelectorAll('.btn-score').forEach(b => {
    b.addEventListener('click', e => {
      e.stopPropagation();
      views.openStockScoreModal(views._comp.symbol, b.dataset.ticker);
    });
  });
  tbody.querySelectorAll('tr[data-ticker]').forEach(row => {
    row.addEventListener('click', () => views.openStockScoreModal(views._comp.symbol, row.dataset.ticker));
  });
};

// ── tri au clic — INCHANGÉ ──
views.wireSortHeaders = function () {
  document.querySelectorAll('#components-table th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.dataset.sort;
      const st = views._comp;
      if (st.sortKey === key) {
        st.sortDir = st.sortDir === 1 ? -1 : st.sortDir === -1 ? 0 : 1;
        if (st.sortDir === 0) st.sortKey = null;
      } else {
        st.sortKey = key;
        st.sortDir = 1;
      }
      document.querySelectorAll('#components-table th.sortable .sort-arrow').forEach(a => a.textContent = '');
      if (st.sortKey) {
        const arrow = th.querySelector('.sort-arrow');
        if (arrow) arrow.textContent = st.sortDir === 1 ? ' ↑' : ' ↓';
      }
      views.renderComponentsBody();
    });
  });
};

// ── quotes live par lots de 40 — INCHANGÉ (api.batchQuotes réel) ──
views.loadQuotesForComponents = async function () {
  const st = views._comp;
  const symbols = st.rows.map(r => r.ticker);
  const chunkSize = 40;
  for (let i = 0; i < symbols.length; i += chunkSize) {
    const chunk = symbols.slice(i, i + chunkSize);
    try {
      const quotes = await api.batchQuotes(chunk, true, true);
      st.rows.forEach(r => {
        const q = quotes[r.ticker];
        if (q) {
          if (q.price != null) r.price = q.price;
          if (q.change_pct_day != null) r.day = q.change_pct_day;
          if (q.change_pct_week != null) r.week = q.change_pct_week;
        }
      });
      if (views._comp && views._comp.symbol === st.symbol) views.renderComponentsBody();else break;
    } catch (e) {
      console.warn('quotes chunk failed', e);
    }
  }
};

/* ════════════════════════════════════════════════════════════════════════
   CSS DE RÉFÉRENCE — à ajouter à dispersionx-theme.css (ou style.css).
   (Identique au bloc <style> de IndexDetail.reskin.html, section table.)
   ────────────────────────────────────────────────────────────────────────
   .ix-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:18px;}
   .ix-title{display:flex;gap:14px;align-items:center;}
   .ix-flag{font-size:30px;}
   .ix-title h1{font:800 24px/1.1 var(--font-sans);letter-spacing:-0.01em;margin:0;}
   .tags{display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;}
   .tag{font:600 10px/1 var(--font-sans);text-transform:uppercase;letter-spacing:0.05em;padding:4px 8px;border-radius:999px;background:var(--bg-elevated);border:1px solid var(--border);color:var(--text-muted);}
   .tag.live{background:var(--green-soft);border-color:var(--green);color:var(--green-bright);}
   .ix-price .p{font:800 26px/1 var(--font-mono);text-align:right;}
   .ix-price .c{font:600 13px/1 var(--font-mono);margin-top:6px;text-align:right;}
   .snap{display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-bottom:20px;}
   .snap-cell{background:var(--bg-card);border:1px solid var(--border);border-radius:8px;padding:12px 14px;}
   .snap-cell .l{font:600 10px/1 var(--font-sans);text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);margin-bottom:7px;}
   .snap-cell .v{font:700 18px/1 var(--font-mono);}
   .strat-bar{display:flex;align-items:center;gap:14px;margin-bottom:14px;flex-wrap:wrap;}
   .strat-bar>span{font:600 11px/1 var(--font-sans);text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);}
   .pills{display:flex;gap:4px;background:var(--bg-elevated);border:1px solid var(--border);border-radius:999px;padding:3px;}
   .pill{font:600 12px/1 var(--font-mono);padding:6px 13px;border-radius:999px;border:none;background:transparent;color:var(--text-muted);cursor:pointer;transition:all .12s;}
   .pill.active{background:var(--accent);color:#fff;}
   .hint{margin-left:auto;font:400 12px/1.4 var(--font-sans);color:var(--text-dim);}
   .search{display:flex;align-items:center;gap:10px;background:var(--bg-input);border:1px solid var(--border);border-radius:6px;padding:0 14px;margin-bottom:14px;}
   .search:focus-within{border-color:var(--accent);}
   .search svg{color:var(--text-muted);flex-shrink:0;}
   .search input{flex:1;background:none;border:none;outline:none;color:var(--text);font:400 14px/1.5 var(--font-sans);padding:11px 0;}
   .search-count{font:500 12px/1.3 var(--font-mono);color:var(--text-muted);}
   .tbl-wrap{background:var(--bg-card);border:1px solid var(--border);border-radius:8px;overflow:hidden;}
   table.comp{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums;}
   table.comp thead tr{background:var(--bg-elevated);}
   table.comp th{font:600 10px/1 var(--font-sans);text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);padding:11px 14px;text-align:right;border-bottom:1px solid var(--border);white-space:nowrap;}
   table.comp th.l{text-align:left;}
   table.comp th.sortable{cursor:pointer;user-select:none;}
   table.comp th.sortable:hover{color:var(--text-soft);}
   table.comp tbody tr{border-bottom:1px solid var(--border-subtle);cursor:pointer;}
   table.comp tbody tr:hover{background:var(--bg-hover);}
   table.comp td{padding:10px 14px;text-align:right;font:500 12px/1.3 var(--font-mono);color:var(--text-soft);}
   .stk{display:flex;gap:10px;align-items:center;text-align:left;}
   .stk-logo{width:26px;height:26px;border-radius:6px;background:var(--bg-elevated);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font:700 9px/1 var(--font-mono);color:var(--text-soft);}
   .stk-ticker{font:700 13px/1.2 var(--font-mono);color:var(--text);}
   .stk-name{font:400 12px/1.45 var(--font-sans);color:var(--text-muted);margin-top:1px;}
   .wbar{width:54px;height:5px;border-radius:3px;background:var(--bg-elevated);overflow:hidden;display:inline-block;vertical-align:middle;margin-right:7px;}
   .wbar-fill{height:100%;background:var(--accent);}
   .up{color:var(--green-bright);} .down{color:var(--red-bright);}
   .sec-tag{font:600 10px/1 var(--font-sans);padding:3px 7px;border-radius:4px;background:var(--bg-elevated);border:1px solid var(--border);color:var(--text-muted);}
   .q-load{color:var(--text-dim);}
   .btn-score{font:600 11px/1 var(--font-sans);padding:6px 11px;border-radius:4px;border:1px solid var(--accent);background:var(--accent);color:#fff;cursor:pointer;}
   .btn-score:hover{background:var(--accent-hover);}
   ════════════════════════════════════════════════════════════════════════ */
})(); } catch (e) { __ds_ns.__errors.push({ path: "handoff/examples/renderIndexDetail.js", error: String((e && e.message) || e) }); }

// handoff/theme-toggle.js
try { (() => {
/* ═══════════════════════════════════════════════════════════════
   DispersionX — bascule de thème sombre ↔ Café Warm (clair)
   POSE : ajoute UNE ligne dans index.html, juste avant </body> :
     <script src="/static/js/theme-toggle.js"></script>
   Le script applique le thème mémorisé (avant le 1er rendu), puis
   injecte un bouton soleil/lune dans .topbar-actions. Zéro autre edit.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  var KEY = 'dx-theme';
  function apply(t) {
    document.documentElement.setAttribute('data-theme', t === 'cafe' ? 'cafe' : 'dark');
  }
  var saved;
  try {
    saved = localStorage.getItem(KEY);
  } catch (e) {}
  apply(saved || 'dark');
  var SUN = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  var MOON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  function render(btn) {
    var dark = document.documentElement.getAttribute('data-theme') !== 'cafe';
    btn.innerHTML = dark ? SUN : MOON;
    btn.title = dark ? 'Passer en thème clair (Café)' : 'Passer en thème sombre';
  }
  function mount() {
    var host = document.querySelector('.topbar-actions') || document.querySelector('.topbar');
    if (!host) return setTimeout(mount, 200);
    if (host.querySelector('.dx-theme-btn')) return;
    var btn = document.createElement('button');
    btn.className = 'dx-theme-btn';
    btn.setAttribute('aria-label', 'Changer de thème');
    render(btn);
    btn.addEventListener('click', function () {
      var next = document.documentElement.getAttribute('data-theme') === 'cafe' ? 'dark' : 'cafe';
      apply(next);
      try {
        localStorage.setItem(KEY, next);
      } catch (e) {}
      render(btn);
    });
    host.insertBefore(btn, host.firstChild);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);else mount();
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "handoff/theme-toggle.js", error: String((e && e.message) || e) }); }

// ui_kits/app/App.jsx
try { (() => {
// App root — shell + screen routing
function App() {
  const [active, setActive] = React.useState('dashboard');
  const [mode, setMode] = React.useState('Débutant');
  const crumbMap = {
    dashboard: ['Dashboard'],
    builder: ['Strategy Builder', 'Composants'],
    risk: ['Risk Lab'],
    vol: ['Volatility Lab'],
    corr: ['Correlation Lab'],
    monitor: ['Strategy Monitor'],
    brief: ['Strategy Builder', 'Trade Brief']
  };
  const crumbs = crumbMap[active] || [{
    vol: 'Volatility Lab',
    screener: 'Screener',
    monitor: 'Strategy Monitor',
    journal: 'Journal',
    settings: 'Settings'
  }[active] || 'DispersionX'];
  let screen;
  if (active === 'dashboard') screen = /*#__PURE__*/React.createElement(window.Dashboard, {
    mode: mode
  });else if (active === 'builder') screen = /*#__PURE__*/React.createElement(window.Builder, {
    mode: mode
  });else if (active === 'risk') screen = /*#__PURE__*/React.createElement(window.RiskLab, {
    mode: mode
  });else if (active === 'vol') screen = /*#__PURE__*/React.createElement(window.VolatilityLab, {
    mode: mode
  });else if (active === 'corr') screen = /*#__PURE__*/React.createElement(window.CorrelationLab, {
    mode: mode
  });else if (active === 'monitor') screen = /*#__PURE__*/React.createElement(window.StrategyMonitor, {
    mode: mode
  });else if (active === 'brief') screen = /*#__PURE__*/React.createElement(window.TradeBrief, null);else screen = /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '80px 20px',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      opacity: 0.6,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement(window.Logo, {
    size: 42,
    wordmark: false
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-h3)',
      color: 'var(--text-soft)'
    }
  }, crumbs[crumbs.length - 1]), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-body-sm)',
      color: 'var(--text-muted)',
      maxWidth: 320,
      marginTop: 6
    }
  }, "Module de la plateforme \u2014 m\xEAmes composants, m\xEAmes conventions de lecture."));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'var(--sidebar-w) 1fr',
      height: '100vh',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement(window.Sidebar, {
    active: active,
    onNav: setActive
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: 'var(--bg-base)'
    }
  }, /*#__PURE__*/React.createElement(window.Topbar, {
    crumbs: crumbs,
    mode: mode,
    onMode: setMode
  }), /*#__PURE__*/React.createElement("main", {
    style: {
      flex: 1,
      overflowY: 'auto',
      padding: '24px 28px 64px',
      backgroundImage: 'radial-gradient(ellipse 70% 50% at 80% -5%, var(--accent-soft), transparent 60%), radial-gradient(ellipse 50% 40% at 0% 10%, var(--pos-soft), transparent 55%)'
    }
  }, screen)));
}
// Idempotent mount — reuse the root across re-evaluations so the React tree
// is never torn down mid-animation (avoids the createRoot-twice warning and
// stalled entrance/count-up animations in bundled/standalone builds).
(function mountApp() { /* disabled: real app shell mounts via js/app.jsx */ })();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/App.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/Builder.jsx
try { (() => {
// Strategy Builder — stepped wizard. Renders 3 fully-built steps + the rail.
function Builder({
  mode
}) {
  const D = window.DXData;
  const {
    Stepper,
    Button,
    Badge,
    ScoreBadge,
    RiskBadge,
    MetricCard,
    CorrelationGauge,
    WarningPanel,
    BeginnerExplanationBox
  } = window.DispersionXDesignSystem_cb86be;
  const STEPS = ['Indice', 'Échéance', 'Univers', 'Composants', 'Corrélation', 'Construction', 'Risque', 'Synthèse'];
  const [step, setStep] = React.useState(3);

  // Final step renders the Trade Brief report directly
  if (step === 7) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 24
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '6px 10px'
      }
    }, /*#__PURE__*/React.createElement(Stepper, {
      steps: STEPS,
      current: step,
      onStepClick: setStep
    })), /*#__PURE__*/React.createElement(window.TradeBrief, null));
  }
  const lead = {
    0: ['Choisir un indice', "Sélectionnez l'indice ou l'ETF proxy. La liquidité des options et la taille notionnelle conditionnent l'exécution."],
    3: ['Sélectionner les composants', 'Ces actions composeront la jambe single-name long straddle. Le score décompose liquidité, volatilité, dispersion, event risk et exécution.'],
    4: ['Corrélation et prime', "Comparez ce que le marché price (ρ implicite) à ce qui a été observé (ρ̂ réalisée). L'écart est la prime de corrélation — un signal à analyser."]
  }[step] || [STEPS[step], 'Étape du parcours de construction.'];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '6px 10px'
    }
  }, /*#__PURE__*/React.createElement(Stepper, {
    steps: STEPS,
    current: step,
    onStepClick: setStep
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 16,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      font: 'var(--type-h1)',
      letterSpacing: 'var(--track-snug)',
      color: 'var(--text)',
      margin: '0 0 6px'
    }
  }, lead[0]), /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--type-body)',
      color: 'var(--text-muted)',
      margin: 0,
      maxWidth: 640
    }
  }, lead[1])), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "md"
  }, "Mode avanc\xE9"), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "md",
    onClick: () => setStep(s => Math.min(STEPS.length - 1, s + 1))
  }, "Continuer"))), step === 0 && /*#__PURE__*/React.createElement(StepIndice, {
    D: D
  }), step === 3 && /*#__PURE__*/React.createElement(StepComposants, {
    D: D,
    mode: mode
  }), step === 4 && /*#__PURE__*/React.createElement(StepCorrelation, {
    D: D,
    mode: mode
  }), ![0, 3, 4].includes(step) && /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--bg-card)',
      border: '1px dashed var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: 48,
      textAlign: 'center',
      font: 'var(--type-body)',
      color: 'var(--text-muted)'
    }
  }, "\xC9tape \xAB ", STEPS[step], " \xBB \u2014 zone de s\xE9lection et de r\xE9sultats."));
  function StepIndice() {
    const cards = [{
      t: 'SPY',
      n: 'S&P 500 ETF',
      d: 'Plus accessible, options liquides, taille plus petite.',
      tag: ['Débutant recommandé', 'pos']
    }, {
      t: 'SPX',
      n: 'Indice S&P 500',
      d: 'Très liquide, cash-settled, taille notionnelle élevée.',
      tag: ['Institutionnel', 'info'],
      on: true
    }, {
      t: 'QQQ',
      n: 'Nasdaq 100 ETF',
      d: 'Exposition croissance / tech.',
      tag: ['Tech', 'neutral']
    }];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3,1fr)',
        gap: 14
      }
    }, cards.map(c => /*#__PURE__*/React.createElement("div", {
      key: c.t,
      style: {
        background: 'var(--bg-card)',
        border: `1px solid ${c.on ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-lg)',
        padding: 18,
        position: 'relative',
        boxShadow: c.on ? '0 0 0 3px var(--accent-soft)' : 'none',
        cursor: 'pointer'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 3,
        background: c.on ? 'var(--accent)' : 'transparent',
        borderRadius: '8px 0 0 8px'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        font: '800 18px/1 var(--font-mono)',
        color: 'var(--text)'
      }
    }, c.t), /*#__PURE__*/React.createElement(Badge, {
      tone: c.tag[1]
    }, c.tag[0])), /*#__PURE__*/React.createElement("div", {
      style: {
        font: 'var(--type-title)',
        color: 'var(--text-soft)'
      }
    }, c.n), /*#__PURE__*/React.createElement("p", {
      style: {
        font: 'var(--type-body-sm)',
        color: 'var(--text-muted)',
        margin: '8px 0 0'
      }
    }, c.d))));
  }
  function StepComposants() {
    const adv = mode === 'Avancé';
    const cols = adv ? ['Ticker', 'Secteur', 'Poids', 'IV', 'HV', 'ρ', 'Vega', 'Score', ''] : ['Ticker', 'Secteur', 'Poids', 'IV / HV', 'ρ', 'Score', ''];
    return /*#__PURE__*/React.createElement(React.Fragment, null, mode === 'Débutant' && /*#__PURE__*/React.createElement(BeginnerExplanationBox, null, "Cherchez des composants capables de bouger ind\xE9pendamment de l'indice (\u03C1 plus faible) avec une IV correctement valoris\xE9e. \xC9vitez les earnings proches : ils faussent le signal."), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 8,
        flexWrap: 'wrap'
      }
    }, ['Exclure earnings proches', 'Spread max', 'Liquidité min', 'Secteur', 'ρ max'].map(f => /*#__PURE__*/React.createElement("button", {
      key: f,
      style: {
        font: '500 12px/1 var(--font-sans)',
        padding: '7px 12px',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        color: 'var(--text-soft)',
        cursor: 'pointer'
      }
    }, f, " \u25BE"))), /*#__PURE__*/React.createElement("div", {
      style: {
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("table", {
      style: {
        width: '100%',
        borderCollapse: 'collapse',
        font: 'var(--type-body-sm)'
      }
    }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
      style: {
        background: 'var(--bg-elevated)'
      }
    }, cols.map((h, i) => /*#__PURE__*/React.createElement("th", {
      key: h + i,
      style: {
        textAlign: i === 0 || i === 1 ? 'left' : 'right',
        font: 'var(--type-label)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        color: 'var(--text-muted)',
        padding: '10px 14px',
        borderBottom: '1px solid var(--border)',
        whiteSpace: 'nowrap'
      }
    }, h)))), /*#__PURE__*/React.createElement("tbody", null, D.components.map(c => /*#__PURE__*/React.createElement("tr", {
      key: c.t,
      style: {
        borderBottom: '1px solid var(--border-subtle)'
      }
    }, /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '11px 14px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        font: 'var(--type-ticker)',
        color: 'var(--text)'
      }
    }, c.t, c.earnings && /*#__PURE__*/React.createElement("span", {
      title: "Earnings proche",
      style: {
        color: 'var(--warn)',
        marginLeft: 6
      }
    }, "\u25CF")), /*#__PURE__*/React.createElement("div", {
      style: {
        font: 'var(--type-caption)',
        color: 'var(--text-muted)'
      }
    }, c.n)), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '11px 14px',
        font: 'var(--type-caption)',
        color: 'var(--text-muted)'
      }
    }, c.sec), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '11px 14px',
        textAlign: 'right',
        font: 'var(--type-data-sm)',
        color: 'var(--text-soft)'
      }
    }, c.w, "%"), adv ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '11px 14px',
        textAlign: 'right',
        font: 'var(--type-data-sm)',
        color: 'var(--text-soft)'
      }
    }, c.iv), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '11px 14px',
        textAlign: 'right',
        font: 'var(--type-data-sm)',
        color: 'var(--text-muted)'
      }
    }, c.hv)) : /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '11px 14px',
        textAlign: 'right',
        font: 'var(--type-data-sm)',
        color: 'var(--text-soft)'
      }
    }, c.iv, " / ", c.hv), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '11px 14px',
        textAlign: 'right',
        font: 'var(--type-data-sm)',
        color: c.rho < 0.5 ? 'var(--pos-bright)' : 'var(--text-soft)'
      }
    }, c.rho.toFixed(2)), adv && /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '11px 14px',
        textAlign: 'right',
        font: 'var(--type-data-sm)',
        color: 'var(--text-soft)'
      }
    }, "\u2212", (c.iv * 1.4).toFixed(0)), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '11px 14px',
        textAlign: 'right'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'inline-block'
      }
    }, /*#__PURE__*/React.createElement(ScoreBadge, {
      score: c.score,
      max: 0,
      label: ""
    }))), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '11px 14px',
        textAlign: 'right'
      }
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      defaultChecked: c.score > 65 && !c.earnings,
      style: {
        accentColor: 'var(--accent)',
        width: 15,
        height: 15
      }
    }))))))));
  }
  function StepCorrelation() {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '300px 1fr',
        gap: 18,
        alignItems: 'start'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: 22,
        display: 'flex',
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement(CorrelationGauge, {
      implied: 0.61,
      realized: 0.48,
      size: 250
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2,1fr)',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement(MetricCard, {
      label: "Corr\xE9lation implicite",
      value: "0.61",
      hint: "Ce que le march\xE9 price via les options",
      accent: "var(--accent)"
    }), /*#__PURE__*/React.createElement(MetricCard, {
      label: "Corr\xE9lation r\xE9alis\xE9e",
      value: "0.48",
      hint: "Observ\xE9e historiquement sur les composants",
      accent: "var(--info)"
    }), /*#__PURE__*/React.createElement(MetricCard, {
      label: "Prime de corr\xE9lation",
      value: "+6.4",
      unit: "pts",
      delta: "+1.2 vs 7j",
      accent: "var(--pos)"
    }), /*#__PURE__*/React.createElement(MetricCard, {
      label: "Lecture strat\xE9gique",
      value: "Favorable",
      accent: "var(--pos)"
    })), /*#__PURE__*/React.createElement(WarningPanel, {
      tone: "info",
      title: "Lecture"
    }, "La corr\xE9lation implicite (0.61) est sup\xE9rieure \xE0 la r\xE9alis\xE9e (0.48) : l'indice price une synchronisation plus forte que celle observ\xE9e r\xE9cemment. Contexte favorable \xE0 une dispersion classique \u2014 un signal \xE0 analyser, jamais une garantie."), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 8,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement(Badge, {
      tone: "pos",
      dot: true
    }, "Prime \xE9lev\xE9e"), /*#__PURE__*/React.createElement(Badge, {
      tone: "warn"
    }, "\u03C1\u0302 r\xE9alis\xE9e en l\xE9g\xE8re hausse"), /*#__PURE__*/React.createElement(Badge, {
      tone: "neg"
    }, "Risque sell-off corr\xE9l\xE9"))));
  }
}
Object.assign(window, {
  Builder
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/Builder.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/CorrelationLab.jsx
try { (() => {
// Correlation Lab — the intellectual core. ρ matrix + implied vs realized history.
function CorrelationLab({
  mode
}) {
  const D = window.DXData;
  const {
    MetricCard,
    Badge,
    CorrelationGauge,
    WarningPanel,
    BeginnerExplanationBox
  } = window.DispersionXDesignSystem_cb86be;
  const C = D.corr;

  // teal (low ρ, good for dispersion) → red (high ρ, risk)
  const cellColor = v => {
    if (v >= 0.999) return 'var(--bg-elevated)';
    const t = Math.max(0, Math.min(1, (v - 0.3) / 0.5));
    return t < 0.5 ? `rgba(38,166,154,${0.5 - t * 0.6 + 0.18})` : `rgba(239,83,80,${(t - 0.5) * 1.2 + 0.12})`;
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 24
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      font: 'var(--type-h1)',
      letterSpacing: 'var(--track-snug)',
      color: 'var(--text)',
      margin: '0 0 6px'
    }
  }, "Correlation Lab"), /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--type-body)',
      color: 'var(--text-muted)',
      margin: 0,
      maxWidth: 660
    }
  }, "Le c\u0153ur de la strat\xE9gie : ce que le march\xE9 price (\u03C1 implicite) face \xE0 ce qui a \xE9t\xE9 observ\xE9 (\u03C1\u0302 r\xE9alis\xE9e). L'\xE9cart est la prime de corr\xE9lation \u2014 un signal \xE0 analyser.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4,1fr)',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(MetricCard, {
    label: "\u03C1 implicite",
    value: "0.61",
    hint: "Pric\xE9 via les options d'indice",
    accent: "var(--accent)"
  }), /*#__PURE__*/React.createElement(MetricCard, {
    label: "\u03C1\u0302 r\xE9alis\xE9e",
    value: "0.48",
    hint: "Observ\xE9e sur les composants",
    accent: "var(--info)"
  }), /*#__PURE__*/React.createElement(MetricCard, {
    label: "Prime de corr\xE9lation",
    value: "+6.4",
    unit: "pts",
    delta: "+1.2 vs J-15",
    accent: "var(--pos)"
  }), /*#__PURE__*/React.createElement(MetricCard, {
    label: "Lecture",
    value: "Favorable",
    accent: "var(--pos)"
  })), mode === 'Débutant' && /*#__PURE__*/React.createElement(BeginnerExplanationBox, null, "Une dispersion classique cherche une corr\xE9lation implicite sup\xE9rieure \xE0 la r\xE9alis\xE9e : l'indice price une synchronisation plus forte que celle observ\xE9e r\xE9cemment. Plus la matrice est \xAB froide \xBB (\u03C1 faibles, teintes teal), plus les composants bougent ind\xE9pendamment."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1.1fr 0.9fr',
      gap: 16,
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      font: 'var(--type-h3)',
      color: 'var(--text)',
      margin: 0
    }
  }, "Matrice de corr\xE9lation r\xE9alis\xE9e"), /*#__PURE__*/React.createElement(Badge, {
    tone: "neutral",
    size: "sm"
  }, "60 jours")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: `48px repeat(${C.matrixTickers.length}, 1fr)`,
      gap: 3
    }
  }, /*#__PURE__*/React.createElement("div", null), C.matrixTickers.map(t => /*#__PURE__*/React.createElement("div", {
    key: t,
    style: {
      font: '600 9px/1 var(--font-mono)',
      color: 'var(--text-muted)',
      textAlign: 'center',
      paddingBottom: 4
    }
  }, t)), C.matrix.map((row, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: i
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '600 9px/1 var(--font-mono)',
      color: 'var(--text-muted)',
      display: 'flex',
      alignItems: 'center'
    }
  }, C.matrixTickers[i]), row.map((v, j) => /*#__PURE__*/React.createElement("div", {
    key: j,
    title: `${C.matrixTickers[i]} · ${C.matrixTickers[j]} = ${v.toFixed(2)}`,
    style: {
      aspectRatio: '1',
      borderRadius: 3,
      background: cellColor(v),
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      font: '600 10px/1 var(--font-mono)',
      color: i === j ? 'var(--text-dim)' : 'var(--text)'
    }
  }, v.toFixed(2)))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      marginTop: 14,
      font: 'var(--type-caption)',
      color: 'var(--text-muted)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--pos-bright)'
    }
  }, "\u25CF \u03C1 faible (dispersion favorable)"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--neg-bright)'
    }
  }, "\u25CF \u03C1 \xE9lev\xE9e (risque corr\xE9l\xE9)"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: 20,
      display: 'flex',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(CorrelationGauge, {
    implied: 0.61,
    realized: 0.48,
    size: 240
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: "pos",
    dot: true
  }, "Prime \xE9lev\xE9e"), /*#__PURE__*/React.createElement(Badge, {
    tone: "warn"
  }, "\u03C1\u0302 r\xE9alis\xE9e en l\xE9g\xE8re hausse"), /*#__PURE__*/React.createElement(Badge, {
    tone: "neg"
  }, "Risque sell-off corr\xE9l\xE9")))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      font: 'var(--type-h3)',
      color: 'var(--text)',
      margin: 0
    }
  }, "Historique \u03C1 implicite vs r\xE9alis\xE9e"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 16,
      font: 'var(--type-caption)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--accent-hover)'
    }
  }, "\u25CF implicite"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--info)'
    }
  }, "\u25CF r\xE9alis\xE9e"))), /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--type-caption)',
      color: 'var(--text-muted)',
      margin: '0 0 8px'
    }
  }, "L'\xE9cart entre les deux courbes est la prime de corr\xE9lation \u2014 elle s'est \xE9largie sur les 30 derniers jours."), /*#__PURE__*/React.createElement(History, {
    data: C.history
  })), /*#__PURE__*/React.createElement(WarningPanel, {
    tone: "neg",
    title: "Le risque \xE0 garder en t\xEAte"
  }, "Si la corr\xE9lation r\xE9alis\xE9e rejoint brutalement l'implicite \u2014 typiquement lors d'un sell-off corr\xE9l\xE9 \u2014 la prime se referme et la dispersion perd. La prime positive est un point d'entr\xE9e potentiel, jamais une garantie."));
  function History({
    data
  }) {
    const w = 860,
      h = 200,
      padX = 36,
      padY = 24;
    const all = data.flatMap(p => [p.impl, p.real]);
    const min = Math.min(...all) - 0.04,
      max = Math.max(...all) + 0.04;
    const xs = i => padX + i / (data.length - 1) * (w - padX * 2);
    const ys = v => h - padY - (v - min) / (max - min) * (h - padY * 2);
    const line = key => data.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xs(i)} ${ys(p[key])}`).join(' ');
    return /*#__PURE__*/React.createElement("svg", {
      viewBox: `0 0 ${w} ${h}`,
      width: "100%",
      height: h,
      style: {
        display: 'block'
      }
    }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
      id: "prem",
      x1: "0",
      y1: "0",
      x2: "0",
      y2: "1"
    }, /*#__PURE__*/React.createElement("stop", {
      offset: "0%",
      stopColor: "rgba(38,166,154,0.22)"
    }), /*#__PURE__*/React.createElement("stop", {
      offset: "100%",
      stopColor: "rgba(38,166,154,0.02)"
    }))), [0, 0.25, 0.5, 0.75, 1].map(g => {
      const v = min + (max - min) * g;
      return /*#__PURE__*/React.createElement("g", {
        key: g
      }, /*#__PURE__*/React.createElement("line", {
        x1: padX,
        y1: ys(v),
        x2: w - padX,
        y2: ys(v),
        stroke: "var(--border-subtle)"
      }), /*#__PURE__*/React.createElement("text", {
        x: 4,
        y: ys(v) + 3,
        fontSize: "9",
        fontFamily: "var(--font-mono)",
        fill: "var(--text-dim)"
      }, v.toFixed(2)));
    }), /*#__PURE__*/React.createElement("path", {
      d: `${line('impl')} L ${xs(data.length - 1)} ${ys(data[data.length - 1].real)} ${[...data].reverse().map((p, i) => `L ${xs(data.length - 1 - i)} ${ys(p.real)}`).join(' ')} Z`,
      fill: "url(#prem)"
    }), /*#__PURE__*/React.createElement("path", {
      d: line('real'),
      fill: "none",
      stroke: "var(--info)",
      strokeWidth: "2.5"
    }), /*#__PURE__*/React.createElement("path", {
      d: line('impl'),
      fill: "none",
      stroke: "var(--accent-hover)",
      strokeWidth: "2.5"
    }), data.map((p, i) => /*#__PURE__*/React.createElement("g", {
      key: i
    }, /*#__PURE__*/React.createElement("circle", {
      cx: xs(i),
      cy: ys(p.impl),
      r: "3",
      fill: "var(--accent-hover)"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: xs(i),
      cy: ys(p.real),
      r: "3",
      fill: "var(--info)"
    }), /*#__PURE__*/React.createElement("text", {
      x: xs(i),
      y: h - 6,
      fontSize: "9",
      fontFamily: "var(--font-mono)",
      fill: "var(--text-dim)",
      textAnchor: "middle"
    }, p.d))));
  }
}
Object.assign(window, {
  CorrelationLab
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/CorrelationLab.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/Dashboard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// Dashboard screen — "what deserves my attention today?"
function SectionHead({
  title,
  sub,
  action
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    style: {
      font: 'var(--type-h2)',
      letterSpacing: 'var(--track-snug)',
      color: 'var(--text)',
      margin: 0
    }
  }, title), sub && /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--type-body-sm)',
      color: 'var(--text-muted)',
      margin: '4px 0 0'
    }
  }, sub)), action);
}
function Dashboard({
  mode
}) {
  const D = window.DXData;
  const {
    MetricCard,
    ScoreBadge,
    RiskBadge,
    Button,
    BeginnerExplanationBox,
    Badge
  } = window.DispersionXDesignSystem_cb86be;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 28
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      font: 'var(--type-h1)',
      letterSpacing: 'var(--track-snug)',
      color: 'var(--text)',
      margin: 0
    }
  }, "Aujourd'hui"), /*#__PURE__*/React.createElement(Badge, {
    tone: "accent",
    dot: true
  }, "March\xE9 ouvert")), /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--type-body)',
      color: 'var(--text-muted)',
      margin: 0
    }
  }, "Lecture du jour : la prime de corr\xE9lation reste positive sur le SPX. Un signal \xE0 analyser, pas une recommandation.")), /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement(SectionHead, {
    title: "Market Overview",
    sub: "Volatilit\xE9 et corr\xE9lation agr\xE9g\xE9es du march\xE9"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(5, 1fr)',
      gap: 12
    }
  }, D.market.map((m, i) => /*#__PURE__*/React.createElement(MetricCard, _extends({
    key: m.label
  }, m, {
    glass: true,
    style: {
      animationDelay: i * 70 + 'ms'
    }
  }))))), /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement(SectionHead, {
    title: "Opportunit\xE9s",
    sub: "Indices o\xF9 l'\xE9cart vol/corr\xE9lation m\xE9rite un examen",
    action: /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      size: "sm"
    }, "Tout voir")
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      borderCollapse: 'collapse',
      font: 'var(--type-body-sm)'
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      background: 'var(--bg-elevated)'
    }
  }, ['Indice', 'Maturité', 'Prime ρ', 'Score', 'Risque', ''].map((h, i) => /*#__PURE__*/React.createElement("th", {
    key: h + i,
    style: {
      textAlign: i > 0 && i < 5 ? 'right' : 'left',
      font: 'var(--type-label)',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      color: 'var(--text-muted)',
      padding: '10px 16px',
      borderBottom: '1px solid var(--border)'
    }
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, D.opportunities.map(o => /*#__PURE__*/React.createElement("tr", {
    key: o.idx,
    style: {
      borderBottom: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '12px 16px',
      font: 'var(--type-ticker)',
      color: 'var(--text)'
    }
  }, o.idx), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '12px 16px',
      textAlign: 'right',
      font: 'var(--type-data-sm)',
      color: 'var(--text-soft)'
    }
  }, o.dte, "j"), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '12px 16px',
      textAlign: 'right',
      font: 'var(--type-data)',
      color: 'var(--pos-bright)'
    }
  }, o.prime, " pts"), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '12px 16px',
      textAlign: 'right'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-block'
    }
  }, /*#__PURE__*/React.createElement(ScoreBadge, {
    score: o.score,
    max: 0,
    label: ""
  }))), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '12px 16px',
      textAlign: 'right'
    }
  }, /*#__PURE__*/React.createElement(RiskBadge, {
    level: o.risk,
    size: "sm"
  })), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '12px 16px',
      textAlign: 'right'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    size: "sm"
  }, "Analyser")))))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 340px',
      gap: 20,
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement(SectionHead, {
    title: "Strat\xE9gies suivies"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, [{
    n: 'SPX 30j · dispersion',
    pnl: '+1,240 $',
    up: true,
    prime: '+6.4 pts',
    alert: null
  }, {
    n: 'NDX 28j · dispersion',
    pnl: '−320 $',
    up: false,
    prime: '+3.1 pts',
    alert: 'Vega déséquilibré'
  }].map(s => /*#__PURE__*/React.createElement("div", {
    key: s.n,
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '14px 16px'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-title)',
      color: 'var(--text)'
    }
  }, s.n), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-data-sm)',
      color: 'var(--text-muted)',
      marginTop: 3
    }
  }, "Prime entr\xE9e \u2192 ", s.prime)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, s.alert && /*#__PURE__*/React.createElement(Badge, {
    tone: "warn",
    pulse: true
  }, s.alert), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-data-lg)',
      color: s.up ? 'var(--pos-bright)' : 'var(--neg-bright)'
    }
  }, s.pnl)))))), /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement(SectionHead, {
    title: "Alertes"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden'
    }
  }, [{
    t: 'AAPL · earnings dans 6j',
    tone: 'var(--warn)'
  }, {
    t: 'NDX · ρ̂ réalisée en hausse',
    tone: 'var(--neg)'
  }, {
    t: 'SPX 30j · theta critique',
    tone: 'var(--neg)'
  }, {
    t: 'TSLA · vol crush probable',
    tone: 'var(--warn)'
  }].map((a, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '11px 14px',
      borderBottom: i < 3 ? '1px solid var(--border-subtle)' : 'none'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 7,
      height: 7,
      borderRadius: '50%',
      background: a.tone,
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-body-sm)',
      color: 'var(--text-soft)'
    }
  }, a.t)))))), mode === 'Débutant' && /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement(SectionHead, {
    title: "Comprendre le signal du jour"
  }), /*#__PURE__*/React.createElement(BeginnerExplanationBox, null, "La prime de corr\xE9lation est positive : le march\xE9 price une synchronisation plus forte que celle observ\xE9e r\xE9cemment sur les composants. C'est le contexte favorable \xE0 une dispersion classique \u2014 \xE0 confirmer avec la liquidit\xE9, les earnings et le co\xFBt d'ex\xE9cution.")));
}
Object.assign(window, {
  Dashboard,
  SectionHead
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/Dashboard.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/RiskLab.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// Risk Lab — make risks visible before validation. Risk Navigator, simplified.
function RiskLab({
  mode
}) {
  const D = window.DXData;
  const {
    MetricCard,
    RiskBadge,
    WarningPanel,
    Button,
    Badge
  } = window.DispersionXDesignSystem_cb86be;
  const [scenario, setScenario] = React.useState(1); // Sell-off corrélé

  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 26
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      font: 'var(--type-h1)',
      letterSpacing: 'var(--track-snug)',
      color: 'var(--text)',
      margin: '0 0 6px'
    }
  }, "Risk Lab"), /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--type-body)',
      color: 'var(--text-muted)',
      margin: 0,
      maxWidth: 640
    }
  }, "Les risques de la strat\xE9gie, rendus visibles avant toute validation. Un portefeuille vega-neutral n'est pas un portefeuille sans risque.")), /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement(window.SectionHead, {
    title: "Grecs agr\xE9g\xE9s",
    sub: "Position nette indice + composants"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(6,1fr)',
      gap: 12
    }
  }, D.greeks.map((g, i) => /*#__PURE__*/React.createElement(MetricCard, _extends({
    key: g.label
  }, g, {
    glass: true,
    style: {
      animationDelay: i * 60 + 'ms'
    }
  }))))), /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement(window.SectionHead, {
    title: "Sc\xE9narios rapides",
    sub: "P&L estim\xE9 sous chaque choc de march\xE9"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 12
    }
  }, D.scenarios.map((s, i) => {
    const on = scenario === i;
    return /*#__PURE__*/React.createElement("button", {
      key: s.name,
      onClick: () => setScenario(i),
      style: {
        textAlign: 'left',
        cursor: 'pointer',
        background: on ? 'var(--bg-elevated)' : 'var(--bg-card)',
        border: `1px solid ${on ? 'var(--border-strong)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-lg)',
        padding: 16,
        boxShadow: on ? 'var(--shadow)' : 'none'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        font: 'var(--type-title)',
        color: 'var(--text)'
      }
    }, s.name), /*#__PURE__*/React.createElement(RiskBadge, {
      level: s.risk,
      size: "sm"
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        font: 'var(--type-data-lg)',
        color: s.up ? 'var(--pos-bright)' : 'var(--neg-bright)'
      }
    }, s.pnl, " ", /*#__PURE__*/React.createElement("span", {
      style: {
        font: 'var(--type-caption)',
        color: 'var(--text-muted)'
      }
    }, "$")));
  }))), /*#__PURE__*/React.createElement(WarningPanel, {
    tone: "neg",
    title: "Sc\xE9nario le plus d\xE9favorable"
  }, "Le sc\xE9nario le plus d\xE9favorable actuellement est un ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: 'var(--neg-bright)'
    }
  }, "sell-off corr\xE9l\xE9"), " : l'indice baisse, sa volatilit\xE9 monte, et les composants se d\xE9placent dans la m\xEAme direction. C'est le principal risque d'une dispersion classique \u2014 la jambe short indice perd pendant que la corr\xE9lation r\xE9alis\xE9e rejoint l'implicite."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 320px',
      gap: 20,
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement(window.SectionHead, {
    title: "P&L \xB7 spot \xD7 volatilit\xE9"
  }), /*#__PURE__*/React.createElement(Heatmap, null)), /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement(window.SectionHead, {
    title: "Warnings"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(WarningPanel, {
    tone: "warn",
    title: "Theta \xE9lev\xE9"
  }, "La position perd de la valeur temps rapidement \xE0 l'approche de l'\xE9ch\xE9ance."), /*#__PURE__*/React.createElement(WarningPanel, {
    tone: "warn",
    title: "Concentration secteur"
  }, "62% du panier en Technology."), /*#__PURE__*/React.createElement(WarningPanel, {
    tone: "neg",
    title: "Co\xFBt bid/ask"
  }, "L'aller-retour estim\xE9 absorbe ~25% de l'Edge.")))), /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement(window.SectionHead, {
    title: "Attribution du P&L",
    sub: "D\xE9composition sous le sc\xE9nario s\xE9lectionn\xE9 \u2014 sell-off corr\xE9l\xE9"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1.3fr 1fr',
      gap: 16,
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement(Attribution, {
    title: "Par sous-jacent",
    rows: D.pnlByName.map(r => ({
      label: r.t,
      pnl: r.pnl
    }))
  }), /*#__PURE__*/React.createElement(Attribution, {
    title: "Par secteur",
    rows: D.pnlBySector.map(r => ({
      label: r.s,
      pnl: r.pnl
    }))
  }))));
  function Attribution({
    title,
    rows
  }) {
    const max = Math.max(...rows.map(r => Math.abs(r.pnl)));
    return /*#__PURE__*/React.createElement("div", {
      style: {
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: 16
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        font: 'var(--type-label)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        color: 'var(--text-muted)',
        marginBottom: 14
      }
    }, title), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 9
      }
    }, rows.map(r => {
      const pos = r.pnl >= 0;
      const w = Math.abs(r.pnl) / max * 50;
      return /*#__PURE__*/React.createElement("div", {
        key: r.label,
        style: {
          display: 'grid',
          gridTemplateColumns: '110px 1fr 70px',
          gap: 10,
          alignItems: 'center'
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          font: 'var(--type-data-sm)',
          color: 'var(--text-soft)'
        }
      }, r.label), /*#__PURE__*/React.createElement("div", {
        style: {
          position: 'relative',
          height: 12,
          display: 'flex',
          alignItems: 'center'
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          position: 'absolute',
          left: '50%',
          top: 0,
          bottom: 0,
          width: 1,
          background: 'var(--border-strong)'
        }
      }), /*#__PURE__*/React.createElement("div", {
        style: {
          position: 'absolute',
          left: pos ? '50%' : `${50 - w}%`,
          width: `${w}%`,
          height: 8,
          borderRadius: 2,
          background: pos ? 'var(--pos)' : 'var(--neg)'
        }
      })), /*#__PURE__*/React.createElement("span", {
        style: {
          font: 'var(--type-data-sm)',
          color: pos ? 'var(--pos-bright)' : 'var(--neg-bright)',
          textAlign: 'right'
        }
      }, pos ? '+' : '', r.pnl, " $"));
    })));
  }
  function Heatmap() {
    const rows = 6,
      cols = 9;
    const cell = (r, c) => {
      // synthetic P&L surface: loss bottom-left (sell-off), gain center
      const x = (c - cols / 2) / (cols / 2);
      const y = (r - rows / 2) / (rows / 2);
      const v = 1 - (x * x + y * y) * 1.6 - x * 0.4;
      return v;
    };
    const color = v => {
      if (v > 0.4) return 'var(--pos)';
      if (v > 0.1) return 'rgba(38,166,154,0.45)';
      if (v > -0.2) return 'var(--bg-elevated)';
      if (v > -0.6) return 'rgba(239,83,80,0.4)';
      return 'var(--neg)';
    };
    return /*#__PURE__*/React.createElement("div", {
      style: {
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: 16
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: `repeat(${cols},1fr)`,
        gap: 3
      }
    }, Array.from({
      length: rows * cols
    }).map((_, i) => {
      const r = Math.floor(i / cols),
        c = i % cols;
      return /*#__PURE__*/React.createElement("div", {
        key: i,
        style: {
          aspectRatio: '1',
          borderRadius: 2,
          background: color(cell(r, c))
        }
      });
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: 10,
        font: 'var(--type-label)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        color: 'var(--text-muted)'
      }
    }, /*#__PURE__*/React.createElement("span", null, "Spot \u22128% \u2192 +8%"), /*#__PURE__*/React.createElement("span", null, "IV \u2212/+")));
  }
}
Object.assign(window, {
  RiskLab
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/RiskLab.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/Shell.jsx
try { (() => {
// App shell — sidebar + topbar. Pure presentational.
const ICONS = {
  dashboard: 'M3 13h8V3H3v10Zm0 8h8v-6H3v6Zm10 0h8V11h-8v10Zm0-18v6h8V3h-8Z',
  builder: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z',
  corr: 'M3 3v18h18M7 14l3-3 3 3 5-6',
  vol: 'M3 12h4l3 8 4-16 3 8h4',
  risk: 'M12 2 2 7v6c0 5 4 8 10 9 6-1 10-4 10-9V7L12 2Z',
  screener: 'M3 6h18M7 12h10M10 18h4',
  monitor: 'M3 3h18v14H3zM8 21h8M12 17v4',
  journal: 'M4 4h13l3 3v13H4zM8 4v16M8 9h12',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8-3a8 8 0 0 0-.2-1.8l2-1.5-2-3.4-2.3 1a8 8 0 0 0-3-1.7L14 1h-4l-.5 2.3a8 8 0 0 0-3 1.7l-2.3-1-2 3.4 2 1.5A8 8 0 0 0 4 12a8 8 0 0 0 .2 1.8l-2 1.5 2 3.4 2.3-1a8 8 0 0 0 3 1.7L10 23h4l.5-2.3a8 8 0 0 0 3-1.7l2.3 1 2-3.4-2-1.5A8 8 0 0 0 20 12Z',
  book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z'
};
function Icon({
  d,
  size = 16
}) {
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      flexShrink: 0,
      opacity: 0.85
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: d
  }));
}
const NAV = [{
  group: 'Workflow',
  items: [{
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'dashboard'
  }, {
    id: 'builder',
    label: 'Strategy Builder',
    icon: 'builder',
    badge: '8'
  }]
}, {
  group: 'Analyse',
  items: [{
    id: 'corr',
    label: 'Correlation Lab',
    icon: 'corr'
  }, {
    id: 'vol',
    label: 'Volatility Lab',
    icon: 'vol'
  }, {
    id: 'risk',
    label: 'Risk Lab',
    icon: 'risk'
  }, {
    id: 'screener',
    label: 'Screener',
    icon: 'screener'
  }]
}, {
  group: 'Suivi',
  items: [{
    id: 'monitor',
    label: 'Strategy Monitor',
    icon: 'monitor'
  }, {
    id: 'journal',
    label: 'Journal',
    icon: 'journal'
  }, {
    id: 'settings',
    label: 'Settings',
    icon: 'settings'
  }]
}];
function Sidebar({
  active,
  onNav
}) {
  return /*#__PURE__*/React.createElement("aside", {
    style: {
      background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 11,
      padding: '16px 18px 18px',
      borderBottom: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement(Logo, {
    size: 32,
    wordmark: false
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      lineHeight: 1.15
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '800 14px/1 var(--font-sans)',
      letterSpacing: '-0.01em',
      color: 'var(--text)'
    }
  }, "Dispersion", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--accent-hover)'
    }
  }, "X")), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-label)',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      color: 'var(--text-muted)',
      marginTop: 3
    }
  }, "Volatility desk"))), /*#__PURE__*/React.createElement("nav", {
    style: {
      flex: 1,
      overflowY: 'auto',
      padding: '14px 12px',
      display: 'flex',
      flexDirection: 'column',
      gap: 18
    }
  }, NAV.map(sec => /*#__PURE__*/React.createElement("div", {
    key: sec.group,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 10px 6px',
      font: 'var(--type-label)',
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      color: 'var(--text-muted)'
    }
  }, sec.group), sec.items.map(it => {
    const on = active === it.id;
    return /*#__PURE__*/React.createElement("a", {
      key: it.id,
      onClick: () => onNav(it.id),
      className: "dx-ico-hover",
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 12px',
        borderRadius: 'var(--radius)',
        color: on ? 'var(--accent-hover)' : 'var(--text-soft)',
        font: '500 13px/1 var(--font-sans)',
        cursor: 'pointer',
        background: on ? 'var(--accent-soft)' : 'transparent',
        border: `1px solid ${on ? 'var(--accent-border)' : 'transparent'}`,
        transition: 'all var(--dur-fast) var(--ease)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      d: ICONS[it.icon]
    }), /*#__PURE__*/React.createElement("span", null, it.label), it.badge && /*#__PURE__*/React.createElement("span", {
      style: {
        marginLeft: 'auto',
        font: '500 10px/1 var(--font-mono)',
        padding: '2px 6px',
        borderRadius: 8,
        background: on ? 'var(--accent)' : 'var(--bg-elevated)',
        color: on ? '#fff' : 'var(--text-muted)',
        border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}`
      }
    }, it.badge));
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 14,
      borderTop: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      font: 'var(--type-label)',
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
      color: 'var(--text-soft)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 7,
      height: 7,
      borderRadius: '50%',
      background: 'var(--pos)',
      boxShadow: '0 0 0 3px var(--pos-soft)'
    }
  }), "Donn\xE9es connect\xE9es"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 4,
      marginTop: 8,
      flexWrap: 'wrap'
    }
  }, ['yfinance', 'FMP', 'IBKR'].map((s, i) => /*#__PURE__*/React.createElement("span", {
    key: s,
    style: {
      font: '9px/1 var(--font-mono)',
      padding: '3px 6px',
      borderRadius: 3,
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
      background: i < 2 ? 'var(--pos-soft)' : 'var(--bg-elevated)',
      border: `1px solid ${i < 2 ? 'var(--pos)' : 'var(--border)'}`,
      color: i < 2 ? 'var(--pos-bright)' : 'var(--text-muted)'
    }
  }, s)))));
}
function Topbar({
  crumbs,
  mode,
  onMode
}) {
  return /*#__PURE__*/React.createElement("header", {
    style: {
      height: 'var(--topbar-h)',
      borderBottom: '1px solid var(--border)',
      background: 'var(--bg-surface)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 28px',
      flexShrink: 0
    }
  }, "      ", /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      font: '500 13px/1 var(--font-sans)',
      color: 'var(--text-muted)'
    }
  }, crumbs.map((c, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: i
  }, i > 0 && /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-dim)',
      fontSize: 11
    }
  }, "\u203A"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: i === crumbs.length - 1 ? 'var(--text)' : 'var(--text-soft)',
      fontWeight: i === crumbs.length - 1 ? 600 : 500
    }
  }, c)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      font: 'var(--type-data-sm)',
      color: 'var(--text-muted)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: 'var(--pos)'
    }
  }), "March\xE9 ouvert \xB7 USD"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-pill)',
      padding: 2
    }
  }, ['Débutant', 'Avancé'].map(m => /*#__PURE__*/React.createElement("button", {
    key: m,
    onClick: () => onMode(m),
    style: {
      font: '600 11px/1 var(--font-sans)',
      padding: '5px 12px',
      borderRadius: 'var(--radius-pill)',
      border: 'none',
      cursor: 'pointer',
      background: mode === m ? 'var(--accent)' : 'transparent',
      color: mode === m ? '#fff' : 'var(--text-muted)'
    }
  }, m))), /*#__PURE__*/React.createElement(ThemeToggle, null), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 28,
      height: 28,
      borderRadius: '50%',
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      font: '600 11px/1 var(--font-mono)',
      color: 'var(--text-soft)'
    }
  }, "JD")));
}
function ThemeToggle() {
  const [theme, setTheme] = React.useState(typeof window !== 'undefined' && window.DXTheme ? window.DXTheme.get() : 'dark');
  const [hover, setHover] = React.useState(false);
  const isDark = theme === 'dark';
  const toggle = () => {
    const n = window.DXTheme.toggle();
    setTheme(n);
  };
  return /*#__PURE__*/React.createElement("button", {
    onClick: toggle,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    title: isDark ? 'Passer en thème clair (Café)' : 'Passer en thème sombre',
    "aria-label": "Changer de th\xE8me",
    style: {
      width: 30,
      height: 30,
      borderRadius: 'var(--radius)',
      cursor: 'pointer',
      background: hover ? 'var(--bg-hover)' : 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      color: hover ? 'var(--accent-hover)' : 'var(--text-soft)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all var(--dur-fast) var(--ease)',
      position: 'relative',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      transition: 'transform var(--dur) var(--ease)',
      transform: isDark ? 'rotate(0deg)' : 'rotate(-90deg) scale(0.9)'
    }
  }, isDark ? /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
  })) : /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
  }))));
}
function Logo({
  size = 32,
  wordmark = true
}) {
  return /*#__PURE__*/React.createElement("span", {
    className: "dx-logo",
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 11,
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: size,
      height: size,
      borderRadius: size * 0.22,
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "dx-logo-arcs",
    style: {
      display: 'inline-flex',
      transformOrigin: '50% 50%'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: size * 0.66,
    height: size * 0.66,
    viewBox: "0 0 32 32",
    fill: "none"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M16 25 A9 9 0 0 1 16 7",
    stroke: "var(--pos-bright)",
    strokeWidth: "2.4",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M16 27 A11 11 0 0 0 16 5",
    stroke: "var(--accent-hover)",
    strokeWidth: "2.4",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "16",
    cy: "16",
    r: "2.8",
    fill: "var(--text)"
  })))), wordmark && /*#__PURE__*/React.createElement("span", {
    style: {
      font: '800 ' + size * 0.5 + 'px/1 var(--font-sans)',
      letterSpacing: '-0.02em',
      color: 'var(--text)'
    }
  }, "Dispersion", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--accent-hover)'
    }
  }, "X")));
}
Object.assign(window, {
  Icon,
  ICONS,
  Sidebar,
  Topbar,
  ThemeToggle,
  Logo
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/Shell.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/StrategyMonitor.jsx
try { (() => {
// Strategy Monitor — track open dispersion positions: P&L, greeks, prime drift, alerts.
function StrategyMonitor({
  mode
}) {
  const D = window.DXData;
  const {
    MetricCard,
    Badge,
    RiskBadge,
    Button,
    WarningPanel
  } = window.DispersionXDesignSystem_cb86be;
  const P = D.positions;
  const [sel, setSel] = React.useState(0);
  const totalPnl = P.reduce((a, p) => a + p.pnl, 0);
  const winners = P.filter(p => p.pnl > 0).length;
  const statusTone = {
    sain: 'pos',
    surveiller: 'warn',
    risque: 'neg'
  };
  const statusRisk = {
    sain: 'faible',
    surveiller: 'modéré',
    risque: 'élevé'
  };
  const pos = P[sel];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      flexWrap: 'wrap',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      font: 'var(--type-h1)',
      letterSpacing: 'var(--track-snug)',
      color: 'var(--text)',
      margin: '0 0 6px'
    }
  }, "Strategy Monitor"), /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--type-body)',
      color: 'var(--text-muted)',
      margin: 0,
      maxWidth: 640
    }
  }, "Suivi des strat\xE9gies de dispersion ouvertes : P&L, grecs, d\xE9rive de la prime et alertes. Aucune ex\xE9cution automatique.")), /*#__PURE__*/React.createElement(Button, {
    variant: "outline"
  }, "Exporter le suivi")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4,1fr)',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(MetricCard, {
    label: "P&L total ouvert",
    value: (totalPnl >= 0 ? '+' : '') + totalPnl.toLocaleString('fr-FR'),
    unit: "$",
    deltaTone: totalPnl >= 0 ? 'pos' : 'neg',
    accent: "var(--accent)"
  }), /*#__PURE__*/React.createElement(MetricCard, {
    label: "Positions",
    value: P.length,
    accent: "var(--info)"
  }), /*#__PURE__*/React.createElement(MetricCard, {
    label: "Gagnantes",
    value: `${winners}/${P.length}`,
    accent: "var(--pos)"
  }), /*#__PURE__*/React.createElement(MetricCard, {
    label: "Alertes actives",
    value: P.filter(p => p.alert).length,
    accent: "var(--warn)"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      borderCollapse: 'collapse',
      font: 'var(--type-body-sm)'
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      background: 'var(--bg-elevated)'
    }
  }, ['Stratégie', 'DTE', 'Prime entrée', 'Prime actuelle', 'Vega', 'Theta', 'P&L', 'État'].map((hh, i) => /*#__PURE__*/React.createElement("th", {
    key: hh,
    style: {
      textAlign: i === 0 ? 'left' : 'right',
      font: 'var(--type-label)',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      color: 'var(--text-muted)',
      padding: '11px 16px',
      borderBottom: '1px solid var(--border)',
      whiteSpace: 'nowrap'
    }
  }, hh)))), /*#__PURE__*/React.createElement("tbody", null, P.map((p, i) => {
    const drift = parseFloat(p.primeNow) - parseFloat(p.primeIn);
    return /*#__PURE__*/React.createElement("tr", {
      key: p.name,
      onClick: () => setSel(i),
      style: {
        borderBottom: '1px solid var(--border-subtle)',
        cursor: 'pointer',
        background: sel === i ? 'var(--bg-hover)' : 'transparent'
      }
    }, /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '12px 16px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        font: 'var(--type-title)',
        color: 'var(--text)'
      }
    }, p.name), /*#__PURE__*/React.createElement("div", {
      style: {
        font: 'var(--type-caption)',
        color: 'var(--text-muted)',
        marginTop: 2
      }
    }, "Ouvert ", p.opened, p.alert && /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--warn)'
      }
    }, " \xB7 ", p.alert))), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '12px 16px',
        textAlign: 'right',
        font: 'var(--type-data-sm)',
        color: p.dte < 12 ? 'var(--neg-bright)' : 'var(--text-soft)'
      }
    }, p.dte, "j"), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '12px 16px',
        textAlign: 'right',
        font: 'var(--type-data-sm)',
        color: 'var(--text-muted)'
      }
    }, p.primeIn, " pts"), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '12px 16px',
        textAlign: 'right',
        font: 'var(--type-data-sm)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--text-soft)'
      }
    }, p.primeNow), /*#__PURE__*/React.createElement("span", {
      style: {
        color: drift >= 0 ? 'var(--pos-bright)' : 'var(--neg-bright)',
        marginLeft: 6,
        fontSize: 11
      }
    }, drift >= 0 ? '▲' : '▼', Math.abs(drift).toFixed(1))), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '12px 16px',
        textAlign: 'right',
        font: 'var(--type-data-sm)',
        color: Math.abs(p.vega) > 100 ? 'var(--warn)' : 'var(--text-soft)'
      }
    }, p.vega >= 0 ? '+' : '', p.vega), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '12px 16px',
        textAlign: 'right',
        font: 'var(--type-data-sm)',
        color: 'var(--text-soft)'
      }
    }, "+", p.theta), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '12px 16px',
        textAlign: 'right',
        font: 'var(--type-data)',
        color: p.pnl >= 0 ? 'var(--pos-bright)' : 'var(--neg-bright)'
      }
    }, p.pnl >= 0 ? '+' : '', p.pnl.toLocaleString('fr-FR'), " $"), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '12px 16px',
        textAlign: 'right'
      }
    }, /*#__PURE__*/React.createElement(Badge, {
      tone: statusTone[p.status],
      dot: true
    }, p.status)));
  })))), /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement(window.SectionHead, {
    title: "D\xE9tail de la position",
    sub: pos.name
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 320px',
      gap: 16,
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(MetricCard, {
    label: "P&L",
    value: (pos.pnl >= 0 ? '+' : '') + pos.pnl.toLocaleString('fr-FR'),
    unit: "$",
    deltaTone: pos.pnl >= 0 ? 'pos' : 'neg',
    accent: "var(--accent)"
  }), /*#__PURE__*/React.createElement(MetricCard, {
    label: "Prime entr\xE9e \u2192 actuelle",
    value: `${pos.primeIn} → ${pos.primeNow}`,
    accent: "var(--info)"
  }), /*#__PURE__*/React.createElement(MetricCard, {
    label: "DTE restant",
    value: pos.dte,
    unit: "j",
    accent: pos.dte < 12 ? 'var(--neg)' : 'var(--warn)'
  }), /*#__PURE__*/React.createElement(MetricCard, {
    label: "Vega net",
    value: (pos.vega >= 0 ? '+' : '') + pos.vega,
    accent: Math.abs(pos.vega) > 100 ? 'var(--warn)' : 'var(--pos)'
  }), /*#__PURE__*/React.createElement(MetricCard, {
    label: "Theta /jour",
    value: '+' + pos.theta,
    unit: "$",
    accent: "var(--warn)"
  }), /*#__PURE__*/React.createElement(MetricCard, {
    label: "Risque",
    value: statusRisk[pos.status],
    accent: `var(--${statusTone[pos.status] === 'pos' ? 'pos' : statusTone[pos.status] === 'warn' ? 'warn' : 'neg'})`
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, pos.alert ? /*#__PURE__*/React.createElement(WarningPanel, {
    tone: pos.status === 'risque' ? 'neg' : 'warn',
    title: "Alerte"
  }, pos.alert, " \u2014 r\xE9\xE9valuer ou pr\xE9parer un ajustement manuel.") : /*#__PURE__*/React.createElement(WarningPanel, {
    tone: "pos",
    title: "Position saine"
  }, "Prime stable ou en progression, grecs dans la tol\xE9rance. Aucune action requise."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    size: "sm",
    full: true
  }, "Ouvrir le Trade Brief"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "sm",
    full: true
  }, "Cl\xF4turer"))))));
}
Object.assign(window, {
  StrategyMonitor
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/StrategyMonitor.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/TradeBrief.jsx
try { (() => {
// Trade Brief — final synthesis before save / manual execution. Report-grade.
function TradeBrief() {
  const D = window.DXData;
  const {
    Button,
    Badge,
    MetricCard,
    RiskBadge,
    WarningPanel,
    ScoreBadge
  } = window.DispersionXDesignSystem_cb86be;
  const L = D.legs;
  const Section = ({
    n,
    title,
    children
  }) => /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-data-sm)',
      color: 'var(--text-dim)'
    }
  }, n), /*#__PURE__*/React.createElement("h2", {
    style: {
      font: 'var(--type-h2)',
      letterSpacing: 'var(--track-snug)',
      color: 'var(--text)',
      margin: 0
    }
  }, title)), children);
  const LegRow = ({
    cols,
    head
  }) => /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1.4fr repeat(4,1fr)',
      gap: 8,
      padding: '10px 14px',
      borderBottom: '1px solid var(--border-subtle)',
      alignItems: 'center'
    }
  }, cols.map((c, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      font: head ? 'var(--type-label)' : i === 0 ? 'var(--type-ticker)' : 'var(--type-data-sm)',
      textTransform: head ? 'uppercase' : 'none',
      letterSpacing: head ? '0.06em' : 0,
      color: head ? 'var(--text-muted)' : i === 0 ? 'var(--text)' : 'var(--text-soft)',
      textAlign: i === 0 ? 'left' : 'right'
    }
  }, c)));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 940,
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: 30
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      flexWrap: 'wrap',
      gap: 16,
      borderBottom: '1px solid var(--border)',
      paddingBottom: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 280
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      font: 'var(--type-h1)',
      letterSpacing: 'var(--track-snug)',
      color: 'var(--text)',
      margin: 0,
      whiteSpace: 'nowrap'
    }
  }, "Trade Brief"), /*#__PURE__*/React.createElement(Badge, {
    tone: "info"
  }, "Brouillon")), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-data-sm)',
      color: 'var(--text-muted)',
      marginTop: 8
    }
  }, "SPX \xB7 dispersion \xB7 31 DTE \xB7 \xE9ch\xE9ance 21 nov. \xB7 g\xE9n\xE9r\xE9 le 20 juin 2026")), /*#__PURE__*/React.createElement(ScoreBadge, {
    score: 82,
    size: "lg"
  })), /*#__PURE__*/React.createElement(Section, {
    n: "01",
    title: "R\xE9sum\xE9"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      borderLeft: '3px solid var(--accent)',
      borderRadius: 'var(--radius)',
      padding: '16px 18px',
      font: 'var(--type-body)',
      fontSize: 16,
      lineHeight: 1.6,
      color: 'var(--text-soft)'
    }
  }, "Vous ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: 'var(--text)'
    }
  }, "vendez la volatilit\xE9 de l'indice"), " (short straddle SPX) et ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: 'var(--text)'
    }
  }, "achetez la volatilit\xE9 de 5 composants"), " (long straddles). La strat\xE9gie est approximativement ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: 'var(--pos-bright)'
    }
  }, "vega-neutral"), " et ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: 'var(--text)'
    }
  }, "short corr\xE9lation"), " : elle profite si les composants se dispersent davantage que ce que l'indice price.")), /*#__PURE__*/React.createElement(Section, {
    n: "02",
    title: "Construction"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1.3fr',
      gap: 16,
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 14px',
      background: 'var(--bg-elevated)',
      font: 'var(--type-label)',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      color: 'var(--neg-bright)'
    }
  }, "Jambe indice \xB7 short"), /*#__PURE__*/React.createElement(LegRow, {
    head: true,
    cols: ['', 'Prime', 'Vega', 'Theta', 'Qté']
  }), /*#__PURE__*/React.createElement(LegRow, {
    cols: [`${L.index.t} ${L.index.strike}`, L.index.prime, L.index.vega, L.index.theta, L.index.qty]
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '12px 14px',
      font: 'var(--type-body-sm)',
      color: 'var(--text-muted)'
    }
  }, L.index.action, " \xB7 ", L.index.exp)), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 14px',
      background: 'var(--bg-elevated)',
      font: 'var(--type-label)',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      color: 'var(--pos-bright)'
    }
  }, "Panier composants \xB7 long"), /*#__PURE__*/React.createElement(LegRow, {
    head: true,
    cols: ['', 'Prime', 'Vega', 'Theta', 'Qté']
  }), L.basket.map(b => /*#__PURE__*/React.createElement(LegRow, {
    key: b.t,
    cols: [b.t, b.prime, b.vega, b.theta, b.qty]
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: 16,
      marginTop: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-label)',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      color: 'var(--text-muted)',
      marginBottom: 12
    }
  }, "\xC9quilibrage vega"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-data-sm)',
      color: 'var(--neg-bright)',
      width: 110
    }
  }, "Indice \u2212620"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 8,
      borderRadius: 4,
      background: 'var(--bg-elevated)',
      position: 'relative',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: '49%',
      background: 'var(--neg)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      right: 0,
      top: 0,
      bottom: 0,
      width: '46%',
      background: 'var(--pos)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: '50%',
      top: -2,
      bottom: -2,
      width: 2,
      background: 'var(--text)'
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-data-sm)',
      color: 'var(--pos-bright)',
      width: 130,
      textAlign: 'right'
    }
  }, "Composants +572")), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: "pos",
    dot: true
  }, "Vega net \u221248 \xB7 quasi-neutre")))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 24
    }
  }, /*#__PURE__*/React.createElement(Section, {
    n: "03",
    title: "Pourquoi ce trade ?"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 9
    }
  }, ['Prime de corrélation positive (+6.4 pts)', 'ρ implicite (0.61) > ρ̂ réalisée (0.48)', 'Composants à faible ρ disponibles (TSLA, META)', 'Position quasi vega-neutral'].map(t => /*#__PURE__*/React.createElement("div", {
    key: t,
    style: {
      display: 'flex',
      gap: 10,
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--pos-bright)',
      marginTop: 2,
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.4",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M20 6 9 17l-5-5"
  }))), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-body-sm)',
      color: 'var(--text-soft)'
    }
  }, t))))), /*#__PURE__*/React.createElement(Section, {
    n: "04",
    title: "Ce qui peut mal se passer"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 9
    }
  }, [['Sell-off corrélé', 'critique'], ['Vol crush sur les composants', 'élevé'], ['Theta négatif sur le panier', 'modéré'], ['Earnings AAPL pendant la vie du trade', 'modéré']].map(([t, lv]) => /*#__PURE__*/React.createElement("div", {
    key: t,
    style: {
      display: 'flex',
      gap: 10,
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-body-sm)',
      color: 'var(--text-soft)'
    }
  }, t), /*#__PURE__*/React.createElement(RiskBadge, {
    level: lv,
    size: "sm"
  })))))), /*#__PURE__*/React.createElement(Section, {
    n: "05",
    title: "Donn\xE9es cl\xE9s"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4,1fr)',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(MetricCard, {
    label: "Prime \u03C1",
    value: "+6.4",
    unit: "pts",
    accent: "var(--pos)"
  }), /*#__PURE__*/React.createElement(MetricCard, {
    label: "Vega net",
    value: "\u221248",
    accent: "var(--pos)"
  }), /*#__PURE__*/React.createElement(MetricCard, {
    label: "Theta /jour",
    value: "+96",
    unit: "$",
    accent: "var(--warn)"
  }), /*#__PURE__*/React.createElement(MetricCard, {
    label: "Prime nette",
    value: "+1,240",
    unit: "$",
    accent: "var(--accent)"
  }), /*#__PURE__*/React.createElement(MetricCard, {
    label: "Composants",
    value: "5",
    accent: "var(--info)"
  }), /*#__PURE__*/React.createElement(MetricCard, {
    label: "Couverture indice",
    value: "21",
    unit: "%",
    accent: "var(--info)"
  }), /*#__PURE__*/React.createElement(MetricCard, {
    label: "Co\xFBt estim\xE9",
    value: "\u2212310",
    unit: "$",
    accent: "var(--neg)"
  }), /*#__PURE__*/React.createElement(MetricCard, {
    label: "Pire sc\xE9nario",
    value: "\u22123,420",
    unit: "$",
    accent: "var(--neg)"
  }))), /*#__PURE__*/React.createElement(Section, {
    n: "06",
    title: "Checklist avant ex\xE9cution"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '6px 16px'
    }
  }, ['IV vérifiée sur source réelle (IBKR) — actuellement estimée', 'Aucun earnings non désiré dans la fenêtre', 'Spread bid/ask acceptable sur chaque jambe', 'Vega net dans la tolérance cible', 'Scénario sell-off corrélé compris et accepté', 'Taille de position validée'].map((t, i) => /*#__PURE__*/React.createElement("label", {
    key: i,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '11px 0',
      borderBottom: i < 5 ? '1px solid var(--border-subtle)' : 'none',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    defaultChecked: i > 0 && i < 4,
    style: {
      accentColor: 'var(--accent)',
      width: 16,
      height: 16
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-body-sm)',
      color: 'var(--text-soft)'
    }
  }, t)))), /*#__PURE__*/React.createElement(WarningPanel, {
    tone: "warn",
    title: "Avant tout trade",
    style: {
      marginTop: 12
    }
  }, "L'IV est actuellement estim\xE9e depuis la HV. Branchez IBKR pour des valeurs r\xE9elles avant de pr\xE9parer l'ex\xE9cution. Outil d'aide \xE0 la d\xE9cision, pas un conseil financier.")), /*#__PURE__*/React.createElement(Section, {
    n: "07",
    title: "Export & suite"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      flexWrap: 'wrap',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg"
  }, "Pr\xE9parer pour ex\xE9cution manuelle"), /*#__PURE__*/React.createElement(Button, {
    variant: "outline"
  }, "Sauvegarder"), /*#__PURE__*/React.createElement(Button, {
    variant: "outline"
  }, "Export PDF"), /*#__PURE__*/React.createElement(Button, {
    variant: "outline"
  }, "Export CSV"), /*#__PURE__*/React.createElement(Button, {
    variant: "outline"
  }, "Copier les jambes"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost"
  }, "Ouvrir dans le monitor"))));
}
Object.assign(window, {
  TradeBrief
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/TradeBrief.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/VolatilityLab.jsx
try { (() => {
// Volatility Lab — make IV/HV, term structure and skew legible.
function VolatilityLab({
  mode
}) {
  const D = window.DXData;
  const {
    MetricCard,
    Badge,
    BeginnerExplanationBox
  } = window.DispersionXDesignSystem_cb86be;
  const adv = mode === 'Avancé';
  const Panel = ({
    title,
    hint,
    children,
    help
  }) => /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 4
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      font: 'var(--type-h3)',
      color: 'var(--text)',
      margin: 0
    }
  }, title), hint && /*#__PURE__*/React.createElement(Badge, {
    tone: "neutral",
    size: "sm"
  }, hint)), help && /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--type-caption)',
      color: 'var(--text-muted)',
      margin: '0 0 14px'
    }
  }, help), children);

  // line chart helper
  const Line = ({
    points,
    w = 320,
    h = 110,
    color = 'var(--accent-hover)',
    fill = true,
    labels
  }) => {
    const ivs = points.map(p => p.iv);
    const min = Math.min(...ivs) - 1,
      max = Math.max(...ivs) + 1;
    const xs = i => i / (points.length - 1) * (w - 20) + 10;
    const ys = v => h - 18 - (v - min) / (max - min) * (h - 30);
    const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xs(i)} ${ys(p.iv)}`).join(' ');
    return /*#__PURE__*/React.createElement("svg", {
      viewBox: `0 0 ${w} ${h}`,
      width: "100%",
      height: h
    }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
      id: 'g' + color.length + w,
      x1: "0",
      y1: "0",
      x2: "0",
      y2: "1"
    }, /*#__PURE__*/React.createElement("stop", {
      offset: "0%",
      stopColor: "rgba(65,120,255,0.28)"
    }), /*#__PURE__*/React.createElement("stop", {
      offset: "100%",
      stopColor: "rgba(65,120,255,0)"
    }))), fill && /*#__PURE__*/React.createElement("path", {
      d: `${d} L ${xs(points.length - 1)} ${h - 18} L ${xs(0)} ${h - 18} Z`,
      fill: `url(#g${color.length + w})`
    }), /*#__PURE__*/React.createElement("path", {
      d: d,
      fill: "none",
      stroke: color,
      strokeWidth: "2"
    }), points.map((p, i) => /*#__PURE__*/React.createElement("circle", {
      key: i,
      cx: xs(i),
      cy: ys(p.iv),
      r: "2.5",
      fill: color
    })), labels && points.map((p, i) => /*#__PURE__*/React.createElement("text", {
      key: i,
      x: xs(i),
      y: h - 4,
      fontSize: "9",
      fontFamily: "var(--font-mono)",
      fill: "var(--text-dim)",
      textAnchor: "middle"
    }, labels(p))));
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 24
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      font: 'var(--type-h1)',
      letterSpacing: 'var(--track-snug)',
      color: 'var(--text)',
      margin: '0 0 6px'
    }
  }, "Volatility Lab"), /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--type-body)',
      color: 'var(--text-muted)',
      margin: 0,
      maxWidth: 640
    }
  }, "Comprendre la volatilit\xE9 du SPX : implicite vs historique, structure par terme, skew. Chaque lecture explique pourquoi un composant est retenu ou \xE9cart\xE9.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(5,1fr)',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(MetricCard, {
    label: "IV ATM",
    value: "18.2",
    unit: "%",
    accent: "var(--accent)"
  }), /*#__PURE__*/React.createElement(MetricCard, {
    label: "HV 30j",
    value: "15.6",
    unit: "%",
    accent: "var(--info)"
  }), /*#__PURE__*/React.createElement(MetricCard, {
    label: "IV \u2212 HV",
    value: "+2.6",
    unit: "pts",
    deltaTone: "pos",
    accent: "var(--pos)"
  }), /*#__PURE__*/React.createElement(MetricCard, {
    label: "IV Rank",
    value: "38",
    unit: "%",
    hint: "Position dans la fourchette 52 sem.",
    accent: "var(--warn)"
  }), /*#__PURE__*/React.createElement(MetricCard, {
    label: "IV Percentile",
    value: "44",
    unit: "%",
    accent: "var(--warn)"
  })), mode === 'Débutant' && /*#__PURE__*/React.createElement(BeginnerExplanationBox, null, "Quand l'IV (ce que le march\xE9 anticipe) d\xE9passe la HV (ce qui s'est r\xE9ellement produit), la volatilit\xE9 est \xAB ch\xE8re \xBB. Un IV Rank \xE9lev\xE9 indique une IV haute par rapport \xE0 l'ann\xE9e \xE9coul\xE9e \u2014 souvent un meilleur moment pour vendre de la volatilit\xE9 indice."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Panel, {
    title: "IV vs HV",
    hint: "60 jours",
    help: "L'\xE9cart entre volatilit\xE9 implicite et r\xE9alis\xE9e."
  }, /*#__PURE__*/React.createElement(Line, {
    points: [{
      iv: 14.2
    }, {
      iv: 15.1
    }, {
      iv: 16.8
    }, {
      iv: 15.9
    }, {
      iv: 17.2
    }, {
      iv: 18.0
    }, {
      iv: 18.2
    }]
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 16,
      marginTop: 6,
      font: 'var(--type-caption)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--accent-hover)'
    }
  }, "\u25CF IV implicite"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--info)'
    }
  }, "\u25CF HV r\xE9alis\xE9e"))), /*#__PURE__*/React.createElement(Panel, {
    title: "Structure par terme",
    hint: "ATM IV / DTE",
    help: "IV ATM selon l'\xE9ch\xE9ance \u2014 backwardation ou contango."
  }, /*#__PURE__*/React.createElement(Line, {
    points: D.term,
    color: "var(--pos-bright)",
    labels: p => p.dte + 'j'
  })), /*#__PURE__*/React.createElement(Panel, {
    title: "Skew",
    hint: "par strike",
    help: "\xC0 gauche du spot : puts OTM. \xC0 droite : calls OTM."
  }, /*#__PURE__*/React.createElement(Line, {
    points: D.skew,
    color: "var(--warn)",
    labels: p => p.k
  }), mode === 'Débutant' && /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--type-caption)',
      color: 'var(--text-muted)',
      margin: '10px 0 0'
    }
  }, "L'IV plus \xE9lev\xE9e \xE0 gauche refl\xE8te la demande de protection \xE0 la baisse (puts).")), /*#__PURE__*/React.createElement(Panel, {
    title: "Open interest",
    hint: adv ? 'détaillé' : 'résumé',
    help: "Liquidit\xE9 par strike sur l'\xE9ch\xE9ance retenue."
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      gap: 6,
      height: 110,
      padding: '8px 0'
    }
  }, [30, 52, 74, 96, 68, 88, 60, 44, 28].map((v, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: '100%',
      height: v,
      borderRadius: '2px 2px 0 0',
      background: i === 4 ? 'var(--accent)' : 'var(--border-strong)'
    }
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      font: 'var(--type-caption)',
      color: 'var(--text-muted)'
    }
  }, "ATM au centre"))), adv && /*#__PURE__*/React.createElement(Panel, {
    title: "Multi-expiry skew",
    hint: "mode avanc\xE9",
    help: "Surface IV par strike \xD7 \xE9ch\xE9ance."
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(5,1fr)',
      gap: 3
    }
  }, Array.from({
    length: 5 * 5
  }).map((_, i) => {
    const r = Math.floor(i / 5),
      c = i % 5;
    const v = 16 + (4 - c) * 1.6 + r * 0.4;
    const t = (v - 16) / 8;
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      title: v.toFixed(1) + '%',
      style: {
        aspectRatio: '2.4',
        borderRadius: 2,
        background: `rgba(255,152,0,${0.12 + t})`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        font: '9px/1 var(--font-mono)',
        color: 'var(--text-soft)'
      }
    }, v.toFixed(0));
  }))));
}
Object.assign(window, {
  VolatilityLab
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/VolatilityLab.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/data.js
try { (() => {
// Sample data for the DispersionX app UI kit. Realistic figures, not live.
// Mirrors the codebase indices + SP500 components (mid-2025 weights).
window.DXData = {
  index: {
    symbol: 'SPX',
    name: 'S&P 500',
    flag: '🇺🇸',
    currency: 'USD',
    price: '6,432.18',
    change: '+0.42%',
    up: true,
    iv: 18.2,
    hv30: 15.6,
    ivRank: 38,
    dte: 31
  },
  market: [{
    label: 'IV ATM SPX',
    value: '18.2',
    unit: '%',
    delta: '+0.4',
    accent: 'var(--accent)'
  }, {
    label: 'ρ implicite moy.',
    value: '0.61',
    delta: '+0.03',
    accent: 'var(--info)'
  }, {
    label: 'ρ̂ réalisée',
    value: '0.48',
    delta: '−0.02',
    accent: 'var(--info)'
  }, {
    label: 'Prime ρ',
    value: '+6.4',
    unit: 'pts',
    delta: '+1.2',
    accent: 'var(--pos)'
  }, {
    label: 'Vol du jour',
    value: '12.1',
    unit: '%',
    delta: '−0.6',
    accent: 'var(--warn)'
  }],
  components: [{
    t: 'NVDA',
    n: 'Nvidia',
    sec: 'Technology',
    w: 7.3,
    score: 84,
    iv: 46.2,
    hv: 41.8,
    rho: 0.58,
    earnings: false,
    liq: 'Élevée'
  }, {
    t: 'AAPL',
    n: 'Apple',
    sec: 'Technology',
    w: 7.0,
    score: 71,
    iv: 28.4,
    hv: 25.1,
    rho: 0.62,
    earnings: true,
    liq: 'Élevée'
  }, {
    t: 'MSFT',
    n: 'Microsoft',
    sec: 'Technology',
    w: 6.5,
    score: 76,
    iv: 24.8,
    hv: 22.0,
    rho: 0.64,
    earnings: false,
    liq: 'Élevée'
  }, {
    t: 'AMZN',
    n: 'Amazon',
    sec: 'Consumer Disc.',
    w: 3.8,
    score: 68,
    iv: 31.0,
    hv: 28.4,
    rho: 0.55,
    earnings: false,
    liq: 'Élevée'
  }, {
    t: 'META',
    n: 'Meta Platforms',
    sec: 'Communications',
    w: 2.9,
    score: 82,
    iv: 38.5,
    hv: 33.2,
    rho: 0.49,
    earnings: false,
    liq: 'Élevée'
  }, {
    t: 'AVGO',
    n: 'Broadcom',
    sec: 'Technology',
    w: 2.4,
    score: 79,
    iv: 42.1,
    hv: 37.0,
    rho: 0.53,
    earnings: false,
    liq: 'Bonne'
  }, {
    t: 'TSLA',
    n: 'Tesla',
    sec: 'Consumer Disc.',
    w: 1.9,
    score: 88,
    iv: 54.3,
    hv: 47.9,
    rho: 0.41,
    earnings: true,
    liq: 'Élevée'
  }, {
    t: 'JPM',
    n: 'JPMorgan Chase',
    sec: 'Financials',
    w: 1.55,
    score: 64,
    iv: 22.0,
    hv: 20.6,
    rho: 0.66,
    earnings: false,
    liq: 'Bonne'
  }],
  greeks: [{
    label: 'Delta net',
    value: '+12',
    accent: 'var(--accent)'
  }, {
    label: 'Gamma net',
    value: '−0.8',
    accent: 'var(--warn)'
  }, {
    label: 'Vega net',
    value: '−180',
    accent: 'var(--warn)',
    hint: 'Vega indice + composants'
  }, {
    label: 'Theta /jour',
    value: '+96',
    unit: '$',
    accent: 'var(--pos)'
  }, {
    label: 'Prime nette',
    value: '+1,240',
    unit: '$',
    accent: 'var(--pos)'
  }, {
    label: 'Coût estimé',
    value: '−310',
    unit: '$',
    accent: 'var(--neg)',
    hint: 'Bid/ask aller-retour'
  }],
  scenarios: [{
    name: 'Marché stable',
    pnl: '+960',
    risk: 'faible',
    up: true
  }, {
    name: 'Sell-off corrélé',
    pnl: '−3,420',
    risk: 'critique',
    up: false
  }, {
    name: 'Rally corrélé',
    pnl: '−1,180',
    risk: 'élevé',
    up: false
  }, {
    name: 'Vol crush composants',
    pnl: '−2,050',
    risk: 'élevé',
    up: false
  }, {
    name: 'Hausse IV indice',
    pnl: '−640',
    risk: 'modéré',
    up: false
  }, {
    name: 'Passage du temps',
    pnl: '+540',
    risk: 'faible',
    up: true
  }],
  opportunities: [{
    idx: 'SPX',
    dte: 31,
    prime: '+6.4',
    score: 82,
    risk: 'modéré'
  }, {
    idx: 'NDX',
    dte: 28,
    prime: '+4.1',
    score: 67,
    risk: 'élevé'
  }, {
    idx: 'DJI',
    dte: 45,
    prime: '+2.0',
    score: 41,
    risk: 'modéré'
  }],
  expiries: [{
    d: '7j',
    dte: 7,
    iv: 19.8,
    theta: 'élevé',
    rec: false
  }, {
    d: '14j',
    dte: 14,
    iv: 18.9,
    theta: 'élevé',
    rec: false
  }, {
    d: '30j',
    dte: 31,
    iv: 18.2,
    theta: 'modéré',
    rec: true
  }, {
    d: '45j',
    dte: 45,
    iv: 17.6,
    theta: 'modéré',
    rec: true
  }, {
    d: '60j',
    dte: 60,
    iv: 17.1,
    theta: 'faible',
    rec: false
  }, {
    d: '90j',
    dte: 90,
    iv: 16.4,
    theta: 'faible',
    rec: false
  }],
  // P&L attribution under the selected scenario (sell-off corrélé)
  pnlByName: [{
    t: 'SPX (short)',
    pnl: -2100,
    w: 100
  }, {
    t: 'NVDA',
    pnl: 720,
    w: 7.3
  }, {
    t: 'TSLA',
    pnl: 540,
    w: 1.9
  }, {
    t: 'META',
    pnl: 410,
    w: 2.9
  }, {
    t: 'AAPL',
    pnl: -180,
    w: 7.0
  }, {
    t: 'MSFT',
    pnl: -290,
    w: 6.5
  }, {
    t: 'AMZN',
    pnl: -120,
    w: 3.8
  }],
  pnlBySector: [{
    s: 'Indice',
    pnl: -2100
  }, {
    s: 'Technology',
    pnl: 140
  }, {
    s: 'Consumer Disc.',
    pnl: 420
  }, {
    s: 'Communications',
    pnl: 410
  }, {
    s: 'Financials',
    pnl: -90
  }],
  // Term structure (ATM IV by DTE) and skew (IV by strike offset)
  term: [{
    dte: 7,
    iv: 19.8
  }, {
    dte: 14,
    iv: 18.9
  }, {
    dte: 30,
    iv: 18.2
  }, {
    dte: 45,
    iv: 17.6
  }, {
    dte: 60,
    iv: 17.1
  }, {
    dte: 90,
    iv: 16.4
  }, {
    dte: 120,
    iv: 16.0
  }],
  skew: [{
    k: '−10%',
    iv: 24.1
  }, {
    k: '−5%',
    iv: 20.8
  }, {
    k: 'ATM',
    iv: 18.2
  }, {
    k: '+5%',
    iv: 16.9
  }, {
    k: '+10%',
    iv: 16.2
  }],
  // Trade Brief legs
  legs: {
    index: {
      t: 'SPX',
      action: 'Vendre straddle',
      strike: 6450,
      exp: '21 nov.',
      prime: '−4,820',
      vega: '−620',
      theta: '+182',
      delta: '+4',
      qty: 1
    },
    basket: [{
      t: 'NVDA',
      prime: '+1,180',
      vega: '+148',
      theta: '−44',
      qty: 2
    }, {
      t: 'TSLA',
      prime: '+1,640',
      vega: '+132',
      theta: '−51',
      qty: 1
    }, {
      t: 'META',
      prime: '+980',
      vega: '+96',
      theta: '−31',
      qty: 1
    }, {
      t: 'MSFT',
      prime: '+860',
      vega: '+88',
      theta: '−29',
      qty: 1
    }, {
      t: 'AVGO',
      prime: '+1,200',
      vega: '+108',
      theta: '−38',
      qty: 1
    }]
  },
  // ── Correlation Lab ──
  corr: {
    matrixTickers: ['SPX', 'NVDA', 'AAPL', 'MSFT', 'AMZN', 'META', 'TSLA'],
    // pairwise realized correlation (symmetric); diagonal = 1
    matrix: [[1.00, 0.58, 0.62, 0.64, 0.55, 0.49, 0.41], [0.58, 1.00, 0.46, 0.51, 0.44, 0.52, 0.39], [0.62, 0.46, 1.00, 0.61, 0.48, 0.43, 0.34], [0.64, 0.51, 0.61, 1.00, 0.50, 0.45, 0.36], [0.55, 0.44, 0.48, 0.50, 1.00, 0.47, 0.42], [0.49, 0.52, 0.43, 0.45, 0.47, 1.00, 0.38], [0.41, 0.39, 0.34, 0.36, 0.42, 0.38, 1.00]],
    // 90-day history of implied vs realized mean correlation
    history: [{
      d: 'J-90',
      impl: 0.52,
      real: 0.50
    }, {
      d: 'J-75',
      impl: 0.54,
      real: 0.49
    }, {
      d: 'J-60',
      impl: 0.57,
      real: 0.51
    }, {
      d: 'J-45',
      impl: 0.59,
      real: 0.50
    }, {
      d: 'J-30',
      impl: 0.60,
      real: 0.49
    }, {
      d: 'J-15',
      impl: 0.62,
      real: 0.47
    }, {
      d: "Auj.",
      impl: 0.61,
      real: 0.48
    }]
  },
  // ── Strategy Monitor ──
  positions: [{
    name: 'SPX 30j · dispersion',
    idx: 'SPX',
    dte: 24,
    opened: '12 juin',
    primeIn: '+5.8',
    primeNow: '+6.4',
    pnl: 1240,
    vega: -48,
    theta: 96,
    status: 'sain',
    alert: null
  }, {
    name: 'NDX 28j · dispersion',
    idx: 'NDX',
    dte: 19,
    opened: '15 juin',
    primeIn: '+3.6',
    primeNow: '+3.1',
    pnl: -320,
    vega: 210,
    theta: 74,
    status: 'surveiller',
    alert: 'Vega déséquilibré'
  }, {
    name: 'SPX 45j · dispersion',
    idx: 'SPX',
    dte: 41,
    opened: '08 juin',
    primeIn: '+7.1',
    primeNow: '+8.0',
    pnl: 2180,
    vega: -12,
    theta: 132,
    status: 'sain',
    alert: null
  }, {
    name: 'DAX 30j · dispersion',
    idx: 'DAX',
    dte: 9,
    opened: '01 juin',
    primeIn: '+4.2',
    primeNow: '+2.4',
    pnl: -640,
    vega: 30,
    theta: 188,
    status: 'risque',
    alert: 'Theta critique · 9 DTE'
  }]
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/data.js", error: String((e && e.message) || e) }); }

// ui_kits/marketing/Landing.jsx
try { (() => {
// DispersionX marketing landing page. Composes DS primitives (Button, Badge).
// Read the bundle namespace at render time (not module-eval) to avoid a load race.
const DS = () => window.DispersionXDesignSystem_cb86be;
const wrap = {
  maxWidth: 1100,
  margin: '0 auto',
  padding: '0 32px'
};
const eyebrow = {
  font: 'var(--type-label)',
  textTransform: 'uppercase',
  letterSpacing: 'var(--track-label)',
  color: 'var(--accent-hover)',
  marginBottom: 14
};
const h2 = {
  font: 'var(--type-display)',
  letterSpacing: 'var(--track-tight)',
  color: 'var(--text)',
  margin: 0
};
const lede = {
  font: 'var(--type-body)',
  fontSize: 16,
  lineHeight: 1.6,
  color: 'var(--text-soft)',
  maxWidth: 620
};
function Icon({
  d,
  size = 20,
  color = 'currentColor'
}) {
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: d
  }));
}
function Logo({
  size = 30,
  height
}) {
  const s = height || size;
  return /*#__PURE__*/React.createElement("span", {
    className: "dx-logo",
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 11,
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: s,
      height: s,
      borderRadius: s * 0.22,
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "dx-logo-arcs",
    style: {
      display: 'inline-flex',
      transformOrigin: '50% 50%'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: s * 0.66,
    height: s * 0.66,
    viewBox: "0 0 32 32",
    fill: "none"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M16 25 A9 9 0 0 1 16 7",
    stroke: "var(--pos-bright)",
    strokeWidth: "2.4",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M16 27 A11 11 0 0 0 16 5",
    stroke: "var(--accent-hover)",
    strokeWidth: "2.4",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "16",
    cy: "16",
    r: "2.8",
    fill: "var(--text)"
  })))), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '800 ' + s * 0.6 + 'px/1 var(--font-sans)',
      letterSpacing: '-0.02em',
      color: 'var(--text)'
    }
  }, "Dispersion", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--accent-hover)'
    }
  }, "X")));
}
function MktThemeToggle() {
  const [theme, setTheme] = React.useState(typeof window !== 'undefined' && window.DXTheme ? window.DXTheme.get() : 'dark');
  const [hover, setHover] = React.useState(false);
  const isDark = theme === 'dark';
  return /*#__PURE__*/React.createElement("button", {
    onClick: () => setTheme(window.DXTheme.toggle()),
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    title: isDark ? 'Passer en thème clair (Café)' : 'Passer en thème sombre',
    "aria-label": "Changer de th\xE8me",
    style: {
      width: 34,
      height: 34,
      borderRadius: 'var(--radius)',
      cursor: 'pointer',
      background: hover ? 'var(--bg-hover)' : 'transparent',
      border: '1px solid var(--border)',
      color: hover ? 'var(--accent-hover)' : 'var(--text-soft)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all var(--dur-fast) var(--ease)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      transition: 'transform var(--dur) var(--ease)',
      transform: isDark ? 'none' : 'rotate(-90deg)'
    }
  }, isDark ? /*#__PURE__*/React.createElement("svg", {
    width: "17",
    height: "17",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
  })) : /*#__PURE__*/React.createElement("svg", {
    width: "17",
    height: "17",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
  }))));
}
function Nav() {
  const {
    Button
  } = DS();
  return /*#__PURE__*/React.createElement("header", {
    style: {
      position: 'sticky',
      top: 0,
      zIndex: 10,
      background: 'color-mix(in srgb, var(--bg-base) 82%, transparent)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...wrap,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: 64
    }
  }, /*#__PURE__*/React.createElement(Logo, {
    height: 30
  }), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      gap: 26,
      alignItems: 'center'
    }
  }, ['Comprendre', 'Fonctionnalités', 'Workflow', 'Risques', 'Exécution'].map(l => /*#__PURE__*/React.createElement("a", {
    key: l,
    style: {
      font: 'var(--type-body-sm)',
      color: 'var(--text-soft)',
      cursor: 'pointer'
    }
  }, l))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      alignItems: 'center'
    }
  }, window.SectionToggle ? /*#__PURE__*/React.createElement(window.SectionToggle, {
    to: 'app'
  }) : null, /*#__PURE__*/React.createElement(MktThemeToggle, null), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "md",
    onClick: () => window.__dxNav && window.__dxNav('home')
  }, "Connexion"), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "md",
    onClick: () => window.__dxNav && window.__dxNav('builder')
  }, "Cr\xE9er une strat\xE9gie"))));
}
function Hero() {
  const {
    Badge,
    Button
  } = DS();
  return /*#__PURE__*/React.createElement("section", {
    style: {
      position: 'relative',
      overflow: 'hidden',
      borderBottom: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'radial-gradient(ellipse 80% 60% at 70% 0%, var(--accent-soft), transparent 60%), radial-gradient(ellipse 50% 50% at 10% 30%, var(--pos-soft), transparent 60%)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      ...wrap,
      position: 'relative',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 48,
      alignItems: 'center',
      padding: '72px 32px 80px'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: "accent",
    dot: true
  }, "Analyse de volatilit\xE9 & corr\xE9lation")), /*#__PURE__*/React.createElement("h1", {
    style: {
      font: 'var(--type-hero)',
      letterSpacing: 'var(--track-tight)',
      color: 'var(--text)',
      margin: '18px 0 0',
      textWrap: 'balance'
    }
  }, "Construisez des strat\xE9gies de dispersion avec une lecture claire de la volatilit\xE9 et de la corr\xE9lation."), /*#__PURE__*/React.createElement("p", {
    style: {
      ...lede,
      margin: '20px 0 0'
    }
  }, "Analysez un indice, s\xE9lectionnez ses composants, mesurez la prime de corr\xE9lation, construisez une strat\xE9gie vega-neutral et testez vos risques avant ex\xE9cution."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12,
      marginTop: 30
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    onClick: () => window.__dxNav && window.__dxNav('builder')
  }, "Cr\xE9er une strat\xE9gie"), /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    size: "lg",
    onClick: () => window.__dxNav && window.__dxNav('docs')
  }, "Comprendre la dispersion")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 20,
      marginTop: 28,
      font: 'var(--type-caption)',
      color: 'var(--text-muted)'
    }
  }, /*#__PURE__*/React.createElement("span", null, "\xB7 5 indices \xB7 SPX, NDX, DJI, CAC 40, DAX 40"), /*#__PURE__*/React.createElement("span", null, "\xB7 Ex\xE9cution manuelle compatible IBKR"))), /*#__PURE__*/React.createElement(HeroMockup, null)));
}
function HeroMockup() {
  const {
    MetricCard
  } = DS();
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-xl)',
      boxShadow: 'var(--shadow-lg)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '10px 14px',
      borderBottom: '1px solid var(--border-subtle)',
      background: 'var(--bg-elevated)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 9,
      height: 9,
      borderRadius: '50%',
      background: 'var(--neg)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 9,
      height: 9,
      borderRadius: '50%',
      background: 'var(--warn)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 9,
      height: 9,
      borderRadius: '50%',
      background: 'var(--pos)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 8,
      font: 'var(--type-data-sm)',
      color: 'var(--text-muted)'
    }
  }, "SPX \xB7 31 DTE \xB7 dispersion")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-label)',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      color: 'var(--text-muted)',
      marginBottom: 8
    }
  }, "Payoff estim\xE9"), /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 320 90",
    width: "100%",
    height: "80"
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
    id: "pf",
    x1: "0",
    y1: "0",
    x2: "0",
    y2: "1"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0%",
    stopColor: "rgba(38,166,154,0.35)"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "100%",
    stopColor: "rgba(38,166,154,0)"
  }))), /*#__PURE__*/React.createElement("path", {
    d: "M0 70 Q80 72 130 40 Q160 22 190 40 Q240 72 320 70",
    fill: "none",
    stroke: "var(--pos-bright)",
    strokeWidth: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M0 70 Q80 72 130 40 Q160 22 190 40 Q240 72 320 70 L320 90 L0 90 Z",
    fill: "url(#pf)"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "0",
    y1: "70",
    x2: "320",
    y2: "70",
    stroke: "var(--border)",
    strokeDasharray: "3 3"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(MetricCard, {
    label: "Prime \u03C1",
    value: "+6.4",
    unit: "pts",
    accent: "var(--pos)"
  }), /*#__PURE__*/React.createElement(MetricCard, {
    label: "Vega net",
    value: "\u2212180",
    accent: "var(--warn)"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      overflow: 'hidden'
    }
  }, [['NVDA', '7.3%', '84'], ['TSLA', '1.9%', '88'], ['META', '2.9%', '82']].map((r, i) => /*#__PURE__*/React.createElement("div", {
    key: r[0],
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '9px 14px',
      borderBottom: i < 2 ? '1px solid var(--border-subtle)' : 'none'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-ticker)',
      color: 'var(--text)'
    }
  }, r[0]), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-data-sm)',
      color: 'var(--text-muted)'
    }
  }, r[1]), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-data-sm)',
      color: 'var(--pos-bright)'
    }
  }, r[2]))))));
}
function Problem() {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      ...wrap,
      padding: '80px 32px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: eyebrow
  }, "Le probl\xE8me"), /*#__PURE__*/React.createElement("h2", {
    style: h2
  }, "Les options ne pricent pas que la volatilit\xE9."), /*#__PURE__*/React.createElement("p", {
    style: {
      ...lede,
      fontSize: 18,
      marginTop: 18
    }
  }, "Les options d'indice et les options sur actions individuelles pricent aussi la ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: 'var(--text)'
    }
  }, "corr\xE9lation"), " entre les composants. Une strat\xE9gie de dispersion cherche \xE0 analyser et exploiter l'\xE9cart entre la volatilit\xE9 de l'indice et celle des actions qui le composent."), /*#__PURE__*/React.createElement("p", {
    style: {
      ...lede,
      fontSize: 18,
      marginTop: 16,
      color: 'var(--text-muted)'
    }
  }, "Quand les actions bougent beaucoup individuellement mais que leurs mouvements se compensent, l'indice peut rester relativement stable. La dispersion cherche \xE0 mesurer cette diff\xE9rence."));
}
const CAPTURE = [{
  icon: 'M3 3v18h18',
  t: 'Prime de corrélation',
  d: 'Comparer la corrélation implicite du marché à la corrélation réalisée observée.'
}, {
  icon: 'M3 12h7l3-9 4 18 3-9h1',
  t: 'Écart indice / composants',
  d: "Identifier si la volatilité de l'indice est chère ou bon marché face aux single names."
}, {
  icon: 'M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M19 5l-3 3M8 16l-3 3',
  t: 'Mouvements idiosyncratiques',
  d: "Chercher des composants capables de bouger indépendamment de l'indice."
}];
function Capture() {
  const {
    Badge
  } = DS();
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--bg-surface)',
      borderTop: '1px solid var(--border-subtle)',
      borderBottom: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...wrap,
      padding: '72px 32px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: eyebrow
  }, "Ce que la strat\xE9gie cherche \xE0 capter"), /*#__PURE__*/React.createElement("h2", {
    style: {
      ...h2,
      marginBottom: 36
    }
  }, "Trois angles, une m\xEAme question."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 16
    }
  }, CAPTURE.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.t,
    className: "dx-ico-hover dx-lift",
    style: {
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 40,
      height: 40,
      borderRadius: 'var(--radius)',
      background: 'var(--accent-soft)',
      border: '1px solid var(--accent-border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--accent-hover)',
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    d: c.icon
  })), /*#__PURE__*/React.createElement("h3", {
    style: {
      font: 'var(--type-h3)',
      color: 'var(--text)',
      margin: '0 0 8px'
    }
  }, c.t), /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--type-body-sm)',
      color: 'var(--text-muted)',
      margin: 0
    }
  }, c.d))))));
}
const STEPS = [['1', 'Choisir un indice', 'SPX, NDX, DJI, CAC 40, DAX 40'], ['2', 'Choisir une échéance', '7 à 90 jours · DTE, theta, vega'], ['3', 'Sélectionner les composants', 'Score décomposé, filtres, warnings'], ['4', 'Calculer la prime', 'ρ implicite vs ρ̂ réalisée'], ['5', 'Construire & tester', 'Vega-neutral, scénarios de risque']];
function Workflow() {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      ...wrap,
      padding: '80px 32px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: eyebrow
  }, "Comment \xE7a fonctionne"), /*#__PURE__*/React.createElement("h2", {
    style: {
      ...h2,
      marginBottom: 36
    }
  }, "De l'analyse \xE0 la strat\xE9gie, en cinq \xE9tapes."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(5,1fr)',
      gap: 12
    }
  }, STEPS.map(([n, t, d], i) => /*#__PURE__*/React.createElement("div", {
    key: n,
    style: {
      position: 'relative',
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 30,
      height: 30,
      borderRadius: '50%',
      background: 'var(--accent)',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      font: '700 13px/1 var(--font-mono)',
      marginBottom: 14
    }
  }, n), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-title)',
      color: 'var(--text)',
      marginBottom: 6
    }
  }, t), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-caption)',
      color: 'var(--text-muted)'
    }
  }, d)))));
}
const WHY = [['Analyse structurée', "La stratégie est examinée sous plusieurs angles avant toute décision."], ['Meilleure compréhension du risque', 'Grecs, theta, scénarios de stress et coûts rendus visibles.'], ['Construction vega-neutral', "Équilibrage entre la jambe indice et le panier de composants."], ['Scénarios de stress', 'Sell-off corrélé, vol crush, hausse IV — testés avant exécution.'], ['Lecture pédagogique', 'Explications « en clair » et tooltips pour les débutants sérieux.'], ['Outil avancé', 'Matrices, formules et exports pour les utilisateurs expérimentés.']];
function Why() {
  const {
    Badge
  } = DS();
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--bg-surface)',
      borderTop: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...wrap,
      padding: '72px 32px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: eyebrow
  }, "Pourquoi cette approche est utile"), /*#__PURE__*/React.createElement("h2", {
    style: {
      ...h2,
      marginBottom: 14
    }
  }, "Elle oblige \xE0 analyser sous plusieurs angles."), /*#__PURE__*/React.createElement("p", {
    style: {
      ...lede,
      marginBottom: 36
    }
  }, "Volatilit\xE9 implicite, volatilit\xE9 historique, corr\xE9lation, liquidit\xE9, grecs, theta, sc\xE9nario de stress et co\xFBt d'ex\xE9cution \u2014 chaque dimension est mesur\xE9e, jamais suppos\xE9e."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 16
    }
  }, WHY.map(([t, d]) => /*#__PURE__*/React.createElement("div", {
    key: t,
    style: {
      display: 'flex',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flexShrink: 0,
      marginTop: 2,
      color: 'var(--pos-bright)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    d: "M20 6 9 17l-5-5",
    size: 18
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-title)',
      color: 'var(--text)',
      marginBottom: 5
    }
  }, t), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-body-sm)',
      color: 'var(--text-muted)'
    }
  }, d)))))));
}
function Boundaries() {
  const items = ['Ne donne pas de conseil financier', 'Ne garantit aucune performance', 'Ne remplace pas Risk Navigator ni une validation humaine', "N'exécute jamais automatiquement sans contrôle"];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      ...wrap,
      padding: '80px 32px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 40,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: eyebrow
  }, "Ce que le site ne fait pas"), /*#__PURE__*/React.createElement("h2", {
    style: h2
  }, "Un outil d'analyse, pas une promesse."), /*#__PURE__*/React.createElement("p", {
    style: {
      ...lede,
      marginTop: 18
    }
  }, "DispersionX sert \xE0 analyser, construire, simuler et comprendre. L'ex\xE9cution et la d\xE9cision restent sous votre contr\xF4le.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, items.map(t => /*#__PURE__*/React.createElement("div", {
    key: t,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding: '14px 16px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--neg-bright)',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    d: "M18 6 6 18M6 6l12 12",
    size: 17
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-body-sm)',
      color: 'var(--text-soft)'
    }
  }, t))))));
}
function Execution() {
  const {
    Badge
  } = DS();
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--bg-surface)',
      borderTop: '1px solid var(--border-subtle)',
      borderBottom: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...wrap,
      padding: '72px 32px',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...eyebrow,
      textAlign: 'center'
    }
  }, "O\xF9 ex\xE9cuter la strat\xE9gie"), /*#__PURE__*/React.createElement("h2", {
    style: {
      ...h2,
      maxWidth: 720,
      margin: '0 auto 18px'
    }
  }, "La construction ici, l'ex\xE9cution sous votre contr\xF4le."), /*#__PURE__*/React.createElement("p", {
    style: {
      ...lede,
      margin: '0 auto',
      textAlign: 'center'
    }
  }, "La strat\xE9gie peut \xEAtre reproduite manuellement sur des plateformes d'options multi-jambes \u2014 notamment IBKR TWS ou OptionTrader. DispersionX reste agnostique : il pr\xE9pare l'analyse et la construction, vous gardez la main sur l'ex\xE9cution."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      justifyContent: 'center',
      marginTop: 26,
      flexWrap: 'wrap'
    }
  }, ['IBKR TWS', 'IBKR OptionTrader', 'Options multi-jambes'].map(p => /*#__PURE__*/React.createElement(Badge, {
    key: p,
    tone: "neutral",
    size: "md"
  }, p)))));
}
function FinalCTA() {
  const {
    Button
  } = DS();
  return /*#__PURE__*/React.createElement("section", {
    style: {
      ...wrap,
      padding: '90px 32px',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      font: 'var(--type-hero)',
      fontSize: 40,
      letterSpacing: 'var(--track-tight)',
      color: 'var(--text)',
      maxWidth: 760,
      margin: '0 auto 28px',
      textWrap: 'balance'
    }
  }, "Passez d'une id\xE9e de volatilit\xE9 \xE0 une strat\xE9gie construite et test\xE9e."), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    onClick: () => window.__dxNav && window.__dxNav('builder')
  }, "Lancer le Strategy Builder"));
}
function Footer() {
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      background: 'var(--bg-surface)',
      borderTop: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...wrap,
      padding: '40px 32px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      flexWrap: 'wrap',
      gap: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 420
    }
  }, /*#__PURE__*/React.createElement(Logo, {
    height: 30
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--type-caption)',
      color: 'var(--text-muted)',
      marginTop: 14,
      lineHeight: 1.6
    }
  }, "Outil d'aide \xE0 la d\xE9cision, pas un conseil financier. La dispersion peut perdre fortement en sell-off corr\xE9l\xE9. Un portefeuille vega-neutral n'est pas sans risque.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 56
    }
  }, [['Produit', ['Fonctionnalités', 'Workflow', 'Risques', 'Exécution']], ['Ressources', ['Comprendre la dispersion', 'Formules & méthode', 'Connexion']]].map(([h, ls]) => /*#__PURE__*/React.createElement("div", {
    key: h
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-label)',
      textTransform: 'uppercase',
      letterSpacing: '0.07em',
      color: 'var(--text-muted)',
      marginBottom: 12
    }
  }, h), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 9
    }
  }, ls.map(l => /*#__PURE__*/React.createElement("a", {
    key: l,
    style: {
      font: 'var(--type-body-sm)',
      color: 'var(--text-soft)',
      cursor: 'pointer'
    }
  }, l))))))));
}
function Landing() {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Nav, null), /*#__PURE__*/React.createElement(Hero, null), /*#__PURE__*/React.createElement(Problem, null), /*#__PURE__*/React.createElement(Capture, null), /*#__PURE__*/React.createElement(Workflow, null), /*#__PURE__*/React.createElement(Why, null), /*#__PURE__*/React.createElement(Boundaries, null), /*#__PURE__*/React.createElement(Execution, null), /*#__PURE__*/React.createElement(FinalCTA, null), /*#__PURE__*/React.createElement(Footer, null));
}
// Gate the mount until the DS bundle global is populated (avoids load race).
window.Landing = Landing;
(function mount() { /* disabled: Landing demo not mounted in app build */ })();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing/Landing.jsx", error: String((e && e.message) || e) }); }

// ui_kits/theme.js
try { (() => {
/* ─────────────────────────────────────────────────────────────
   DispersionX — theme controller (plain JS, no build step).
   Applies + persists the dark ↔ café theme via [data-theme] on <html>.
   Load this BEFORE app scripts so the theme is set before first paint.
   Exposes window.DXTheme = { get, set, toggle }.
   ───────────────────────────────────────────────────────────── */
(function () {
  var KEY = 'dx-theme';
  function apply(t) {
    document.documentElement.setAttribute('data-theme', t === 'cafe' ? 'cafe' : 'dark');
  }
  var saved;
  try {
    saved = localStorage.getItem(KEY);
  } catch (e) {
    saved = null;
  }
  apply(saved || 'dark');
  window.DXTheme = {
    get: function () {
      return document.documentElement.getAttribute('data-theme') === 'cafe' ? 'cafe' : 'dark';
    },
    set: function (t) {
      apply(t);
      try {
        localStorage.setItem(KEY, t);
      } catch (e) {}
      window.dispatchEvent(new CustomEvent('dx-theme', {
        detail: t
      }));
    },
    toggle: function () {
      var n = this.get() === 'cafe' ? 'dark' : 'cafe';
      this.set(n);
      return n;
    }
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/theme.js", error: String((e && e.message) || e) }); }

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.MetricCard = __ds_scope.MetricCard;

__ds_ns.CorrelationGauge = __ds_scope.CorrelationGauge;

__ds_ns.RiskBadge = __ds_scope.RiskBadge;

__ds_ns.ScoreBadge = __ds_scope.ScoreBadge;

__ds_ns.BeginnerExplanationBox = __ds_scope.BeginnerExplanationBox;

__ds_ns.EmptyState = __ds_scope.EmptyState;

__ds_ns.WarningPanel = __ds_scope.WarningPanel;

__ds_ns.Stepper = __ds_scope.Stepper;

})();
