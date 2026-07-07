/* ─── Baromètre de corrélation implicite (panneau intégré aux Opportunités) ───
   Répond à « la corrélation est-elle chère ? » pour l'indice courant : ρ_implicite
   actuelle, son RANG PERCENTILE sur ~2 ans, verdict, et historique. Percentile
   élevé = corrélation chère = dispersion (short corrélation) attractive.
   Données estimées/différées. Exporté comme window.CorrelationBarometer. */

const _baroCache = {};   // index -> { at, data }

/* Jauge prime de corrélation — RÉPLIQUE EXACTE du Correlation Lab (PrimeGauge)
   pour un affichage identique et sans bug (viewBox 0 0 200 118, overflow
   visible, aiguille en coordonnées directes, animation RAF). */
function PrimeGauge({ implied, realized, size = 240 }) {
  const premium = (implied - realized) * 100;
  const target  = Math.max(0, Math.min(1, (premium + 20) / 40));
  const [anim, setAnim] = React.useState(0);
  const rafRef  = React.useRef(null);
  const t0Ref   = React.useRef(null);

  React.useEffect(() => {
    t0Ref.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const from = 0, to = target, DUR = 1100;
    function tick(ts) {
      if (!t0Ref.current) t0Ref.current = ts;
      const p = Math.min(1, (ts - t0Ref.current) / DUR);
      const e = 1 - Math.pow(1 - p, 3);
      setAnim(from + (to - from) * e);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target]);

  let tone, verdict;
  if (premium >= 6)      { tone = '#26a69a'; verdict = 'Favorable'; }
  else if (premium >= 0) { tone = '#ffa726'; verdict = 'Neutre'; }
  else                   { tone = '#ef5350'; verdict = 'Défavorable'; }

  const W = 200, CX = 100, CY = 100, R = 76;
  const angle = Math.PI * (1 - anim);
  const NX = CX + (R - 8) * Math.cos(angle);
  const NY = CY - (R - 8) * Math.sin(angle);
  const arcD = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: size }}>
      <svg viewBox={`0 0 ${W} 118`} width={size} height={size * 118 / W} style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id="baroPgGrad" x1={CX - R} y1="0" x2={CX + R} y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#ef5350" />
            <stop offset="48%"  stopColor="#ffa726" />
            <stop offset="56%"  stopColor="#ffc107" />
            <stop offset="100%" stopColor="#26a69a" />
          </linearGradient>
        </defs>
        <path d={arcD} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="13" strokeLinecap="round" />
        <path d={arcD} fill="none" stroke="url(#baroPgGrad)" strokeWidth="13" strokeLinecap="round" opacity="0.88" />
        {[0, 0.25, 0.5, 0.75, 1].map(n => {
          const a = Math.PI * (1 - n);
          const ix = CX + (R - 7) * Math.cos(a), iy = CY - (R - 7) * Math.sin(a);
          const ox = CX + (R + 7) * Math.cos(a), oy = CY - (R + 7) * Math.sin(a);
          return <line key={n} x1={ix} y1={iy} x2={ox} y2={oy} stroke="rgba(0,0,0,0.3)" strokeWidth={n === 0.5 ? 2 : 1} />;
        })}
        {[{ n: 0, l: '−20' }, { n: 0.5, l: '0' }, { n: 1, l: '+20' }].map(({ n, l }) => {
          const a = Math.PI * (1 - n);
          return <text key={l} x={CX + (R + 15) * Math.cos(a)} y={CY - (R + 15) * Math.sin(a)}
            textAnchor="middle" dominantBaseline="middle" fontSize="8"
            fontFamily="var(--font-mono)" fill="var(--text-dim)">{l}</text>;
        })}
        <line x1={CX + 10 * Math.cos(angle)} y1={CY - 10 * Math.sin(angle)} x2={NX} y2={NY} stroke={tone} strokeWidth="2.5" strokeLinecap="round" />
        <circle cx={CX} cy={CY} r="7" fill="var(--bg-card)" stroke={tone} strokeWidth="2.5" />
        <text x={CX} y={CY + 22} textAnchor="middle" fontSize="12" fontFamily="var(--font-mono)" fontWeight="700" fill={tone}>
          {premium >= 0 ? '+' : ''}{premium.toFixed(1)} pts
        </text>
      </svg>
      <div style={{ textAlign: 'center', marginTop: 6 }}>
        <div style={{ font: '700 11px/1 var(--font-sans)', color: tone, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>{verdict}</div>
        <div style={{ display: 'flex', gap: 22 }}>
          {[{ label: 'ρ implicite', val: implied, c: 'var(--accent-hover)' }, { label: 'ρ̂ réalisée', val: realized, c: 'var(--info)' }].map(d => (
            <div key={d.label} style={{ textAlign: 'center' }}>
              <div style={{ font: '10px/1 var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 3 }}>{d.label}</div>
              <div style={{ font: '700 15px/1 var(--font-mono)', color: d.c }}>{d.val.toFixed(2)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Courbe historique ρ implicite (accent) vs réalisée (atténuée).
function BaroChart({ series }) {
  if (!series || series.length < 3) return null;
  const impl = series.map(s => s.impl), real = series.map(s => s.real);
  const W = 620, H = 120, P = 8, n = series.length;
  const min = Math.min(...impl, ...real), max = Math.max(...impl, ...real);
  const range = (max - min) || 1;
  const x = i => P + (i / (n - 1)) * (W - 2 * P);
  const y = v => P + (1 - (v - min) / range) * (H - 2 * P);
  const line = arr => arr.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: 120, display: 'block' }}>
      <path d={line(real)} fill="none" stroke="var(--text-dim)" strokeWidth="1.5" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" opacity="0.8" />
      <path d={line(impl)} fill="none" stroke="var(--accent-hover)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      <circle cx={x(n - 1)} cy={y(impl[n - 1])} r="3" fill="var(--accent-hover)" />
    </svg>
  );
}

// Barre de percentile : rouge (basse) → vert (élevée), curseur sur la valeur.
function PercentileBar({ pct }) {
  return (
    <div>
      <div style={{ position: 'relative', height: 12, borderRadius: 999, background: 'linear-gradient(90deg, var(--neg) 0%, var(--warn) 50%, var(--pos) 100%)' }}>
        <div style={{ position: 'absolute', top: -4, bottom: -4, left: `calc(${Math.max(0, Math.min(100, pct))}% - 2px)`, width: 4, borderRadius: 2, background: 'var(--text)', boxShadow: '0 0 0 2px var(--bg-card)' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', font: 'var(--type-caption)', color: 'var(--text-dim)', marginTop: 6 }}>
        <span>Basse · dispersion peu payante</span>
        <span>Élevée · dispersion attractive</span>
      </div>
    </div>
  );
}

async function baroGather(index) {
  await window.DXStore.loadIndex(index);
  const d = window.DXStore.getIndexData(index) || {};
  const comps = (d.components || []).map(c => c.ticker).filter(Boolean).slice(0, 20);
  if (comps.length < 2) throw new Error('composants indisponibles');
  const data = await DXApi.correlationBarometer(comps, index);
  if (!data || data.error || !data.current) throw new Error('baromètre indisponible');
  return data;
}

// Panneau intégrable : suit l'indice fourni par le parent (Opportunités).
// `compact` → un simple bandeau (percentile + verdict) avec lien vers Marché Pro.
function CorrelationBarometer({ index, compact, onNav }) {
  const [loading, setLoading] = React.useState(false);
  const [data, setData] = React.useState(null);
  const [error, setError] = React.useState('');

  async function load(idx, force) {
    setError(''); setData(null); setLoading(true);
    try {
      if (!force && _baroCache[idx] && Date.now() - _baroCache[idx].at < 10 * 60 * 1000) {
        setData(_baroCache[idx].data); setLoading(false); return;
      }
      const d = await baroGather(idx);
      _baroCache[idx] = { at: Date.now(), data: d };
      setData(d);
    } catch (e) {
      setError(e && e.message ? e.message : 'baromètre indisponible');
    } finally { setLoading(false); }
  }
  React.useEffect(() => { load(index); /* eslint-disable-next-line */ }, [index]);

  const cur = data && data.current;
  const toneVar = cur ? { pos: 'var(--pos-bright)', warn: 'var(--warn)', neg: 'var(--neg-bright)' }[cur.tone] : 'var(--text)';

  // Bandeau compact (Opportunités) : percentile + verdict + lien « Détails ».
  if (compact) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '10px 16px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: `3px solid ${toneVar}`, borderRadius: 'var(--radius-lg)' }}>
        <span style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Corrélation implicite · {index}</span>
        {loading && <span style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}>calcul…</span>}
        {cur && !loading && (
          <>
            <span style={{ font: '700 15px/1 var(--font-mono)', color: toneVar }}>{cur.percentile}<sup>e</sup> pct</span>
            <span style={{ font: 'var(--type-body-sm)', color: 'var(--text-soft)' }}>{cur.verdict}</span>
          </>
        )}
        {error && !loading && <span style={{ font: 'var(--type-body-sm)', color: 'var(--text-dim)' }}>baromètre indisponible</span>}
        {onNav && <a onClick={() => onNav('market-pro')} style={{ marginLeft: 'auto', font: '600 12px/1 var(--font-sans)', color: 'var(--accent-hover)', cursor: 'pointer', flexShrink: 0 }}>Détails · Marché Pro →</a>}
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
        <span style={{ font: 'var(--type-title)', color: 'var(--text)' }}>Baromètre de corrélation implicite</span>
        <span style={{ font: '600 11px/1 var(--font-mono)', color: 'var(--text-muted)' }}>· {index}</span>
        {cur && <span style={{ marginLeft: 'auto', font: '700 12px/1 var(--font-mono)', color: toneVar }}>{cur.percentile}<sup>e</sup> pct</span>}
      </div>

      {loading && <div style={{ padding: '28px 20px', textAlign: 'center', color: 'var(--text-muted)', font: 'var(--type-body-sm)' }}>Calcul de la corrélation implicite sur ~2 ans…</div>}
      {error && !loading && <div style={{ padding: '18px 20px', font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}>Baromètre indisponible pour cet indice ({error}).</div>}

      {cur && !loading && (
        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Verdict + percentile */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, borderLeft: `3px solid ${toneVar}`, paddingLeft: 14 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ font: '800 34px/1 var(--font-mono)', color: toneVar }}>{cur.percentile}<span style={{ font: '600 14px/1 var(--font-mono)', color: 'var(--text-muted)' }}>e pct</span></div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ font: 'var(--type-title)', color: 'var(--text)' }}>{cur.verdict}</div>
                <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', marginTop: 2 }}>ρ implicite au {cur.percentile}<sup>e</sup> percentile de ses 2 dernières années</div>
              </div>
            </div>
            <PercentileBar pct={cur.percentile} />
          </div>

          {/* Jauge (réplique Correlation Lab) + historique */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(230px, 270px) 1fr', gap: 16, alignItems: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <PrimeGauge implied={cur.impl} realized={cur.real} size={230} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ font: 'var(--type-caption)', color: 'var(--text-muted)' }}>Historique · ρ implicite (—) vs réalisée (- -)</span>
                <span style={{ font: 'var(--type-caption)', color: 'var(--text-dim)' }}>2 ans</span>
              </div>
              <BaroChart series={data.series} />
              <div style={{ font: 'var(--type-caption)', color: 'var(--text-dim)', lineHeight: 1.5 }}>
                Une dispersion (long composants / short indice) profite quand la corrélation réalisée finit sous l'implicite. Plus le percentile est haut, plus la corrélation est chère à vendre. <em>Estimé — indicatif.</em>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

window.CorrelationBarometer = CorrelationBarometer;
