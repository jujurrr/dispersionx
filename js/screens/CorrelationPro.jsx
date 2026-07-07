/* ─── Corrélation Pro : baromètre de corrélation implicite (module Pro) ───
   Répond à « la corrélation est-elle chère en ce moment ? » — le signal clé
   d'une dispersion. Pour un indice : ρ_implicite actuelle, son RANG PERCENTILE
   sur ~2 ans, un verdict, et l'historique. Percentile élevé = corrélation chère
   = dispersion (short corrélation) attractive. Données estimées/différées. */

const _baroCache = {};   // index -> { at, data }

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
  if (comps.length < 2) throw new Error('composants indisponibles pour cet indice — réessayez dans quelques secondes.');
  const data = await DXApi.correlationBarometer(comps, index);
  if (!data || data.error || !data.current) throw new Error('Baromètre indisponible pour cet indice (historique insuffisant).');
  return data;
}

function CorrelationPro({ onNav, addToast, pro }) {
  const DS = window.DispersionXDesignSystem_cb86be;
  const { Badge, CorrelationGauge } = DS;
  const INDICES = ['SPX', 'NDX', 'DJI', 'CAC', 'DAX'];
  const [index, setIndex] = React.useState('SPX');
  const [loading, setLoading] = React.useState(false);
  const [data, setData] = React.useState(null);
  const [error, setError] = React.useState('');
  const [checkoutBusy, setCheckoutBusy] = React.useState(false);

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
      const msg = e && /HTTP (4|5)\d\d/.test(e.message || '') ? 'Historique insuffisant ou indisponible pour cet indice.' : (e && e.message ? e.message : 'Chargement impossible.');
      setError(msg);
    } finally { setLoading(false); }
  }
  React.useEffect(() => { if (pro) load(index); /* eslint-disable-next-line */ }, [index, pro]);

  // ── Écran verrouillé (non Pro) ──
  if (!pro) {
    const signedIn = !!(window.DXCloud && window.DXCloud.user);
    async function goPro() {
      if (!signedIn) { onNav('login'); return; }
      setCheckoutBusy(true);
      try { await window.DXCloud.startProCheckout(); }
      catch (e) { addToast && addToast('Paiement indisponible : ' + (e && e.message ? e.message : ''), 'error'); setCheckoutBusy(false); }
    }
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}>
        <div style={{ width: '100%', maxWidth: 440, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', padding: '28px 26px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--accent-soft)', border: '1px solid var(--accent-border)', color: 'var(--accent-hover)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
          </div>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <h2 style={{ font: 'var(--type-h2)', color: 'var(--text)', margin: 0 }}>Corrélation Pro</h2>
              <Badge tone="accent" size="sm">Pro</Badge>
            </div>
            <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: 0, maxWidth: 360 }}>
              Le baromètre de corrélation implicite : sachez si la corrélation est <strong style={{ color: 'var(--text-soft)' }}>chère</strong> — le moment où une dispersion est attractive.
            </p>
          </div>
          <button onClick={goPro} disabled={checkoutBusy}
            style={{ font: '600 13px/1 var(--font-sans)', padding: '11px 26px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--accent)', color: '#fff', cursor: checkoutBusy ? 'default' : 'pointer', opacity: checkoutBusy ? 0.7 : 1 }}>
            {checkoutBusy ? 'Redirection…' : (signedIn ? 'Passer Pro →' : 'Se connecter pour passer Pro')}
          </button>
          <div style={{ font: 'var(--type-caption)', color: 'var(--text-dim)' }}>Abonnement mensuel · paiement sécurisé Stripe · résiliable à tout moment</div>
        </div>
      </div>
    );
  }

  const cur = data && data.current;
  const toneVar = cur ? { pos: 'var(--pos-bright)', warn: 'var(--warn)', neg: 'var(--neg-bright)' }[cur.tone] : 'var(--text)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* En-tête */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <h1 style={{ font: 'var(--type-h1)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: 0 }}>Corrélation Pro</h1>
          <Badge tone="accent" size="sm">Pro</Badge>
        </div>
        <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)', margin: 0, maxWidth: 720 }}>
          Baromètre de corrélation implicite : la corrélation que le marché price aujourd'hui, comparée à ses 2 dernières années. Corrélation <strong style={{ color: 'var(--text-soft)' }}>chère</strong> = dispersion attractive.
        </p>
      </div>

      {/* Bandeau honnête */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', padding: '10px 16px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderLeft: '3px solid var(--info)', borderRadius: 'var(--radius-lg)', font: 'var(--type-body-sm)', color: 'var(--text-soft)' }}>
        <span style={{ color: 'var(--info)', font: '700 13px/1 var(--font-mono)', flexShrink: 0 }}>i</span>
        <span>ρ implicite estimée (méthode VIX/HV, cohérente passé/présent). Signal <strong style={{ color: 'var(--text)' }}>indicatif</strong> sur données différées — pas un conseil.</span>
      </div>

      {/* Sélecteur d'indice */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Indice</span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {INDICES.map(s => (
            <button key={s} onClick={() => setIndex(s)} disabled={loading}
              style={{ padding: '7px 14px', font: '700 12px/1 var(--font-mono)', borderRadius: 'var(--radius)', cursor: loading ? 'default' : 'pointer',
                background: index === s ? 'var(--accent)' : 'var(--bg-elevated)', color: index === s ? '#fff' : 'var(--text-soft)', border: `1px solid ${index === s ? 'var(--accent)' : 'var(--border)'}` }}>{s}</button>
          ))}
        </div>
        {data && !loading && (
          <button onClick={() => load(index, true)} title="Recharger" style={{ marginLeft: 'auto', font: '600 12px/1 var(--font-sans)', padding: '8px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>↻</button>
        )}
      </div>

      {error && <div style={{ font: 'var(--type-body-sm)', color: 'var(--neg-bright)', background: 'var(--neg-soft)', border: '1px solid var(--neg)', borderRadius: 'var(--radius)', padding: '10px 14px' }}>{error}</div>}
      {loading && <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', font: 'var(--type-body)' }}>Calcul de la corrélation implicite sur ~2 ans…</div>}

      {cur && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Verdict + percentile */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: `3px solid ${toneVar}`, borderRadius: 20, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
              <div style={{ font: '800 40px/1 var(--font-mono)', color: toneVar }}>{cur.percentile}<span style={{ font: '600 16px/1 var(--font-mono)', color: 'var(--text-muted)' }}>e pct</span></div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ font: 'var(--type-title)', color: 'var(--text)' }}>{cur.verdict}</div>
                <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', marginTop: 2 }}>ρ implicite actuelle au {cur.percentile}<sup>e</sup> percentile de ses 2 dernières années · {index}</div>
              </div>
            </div>
            <PercentileBar pct={cur.percentile} />
          </div>

          {/* Jauge de prime + chiffres + historique */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 260px) 1fr', gap: 16, alignItems: 'stretch' }}>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: '16px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <CorrelationGauge implied={cur.impl} realized={cur.real} size={210} />
              <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)' }}>Prime = ρ implicite − ρ réalisée</div>
            </div>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                <div><div style={{ font: 'var(--type-data)', color: 'var(--accent-hover)' }}>{cur.impl.toFixed(2)}</div><div style={{ font: 'var(--type-caption)', color: 'var(--text-dim)' }}>ρ implicite</div></div>
                <div><div style={{ font: 'var(--type-data)', color: 'var(--info)' }}>{cur.real.toFixed(2)}</div><div style={{ font: 'var(--type-caption)', color: 'var(--text-dim)' }}>ρ réalisée</div></div>
                <div><div style={{ font: 'var(--type-data)', color: cur.prime >= 0 ? 'var(--pos-bright)' : 'var(--neg-bright)' }}>{(cur.prime >= 0 ? '+' : '') + cur.prime} pts</div><div style={{ font: 'var(--type-caption)', color: 'var(--text-dim)' }}>Prime</div></div>
              </div>
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <span style={{ font: 'var(--type-caption)', color: 'var(--text-muted)' }}>Historique · ρ implicite (—) vs réalisée (- -)</span>
                  <span style={{ font: 'var(--type-caption)', color: 'var(--text-dim)' }}>2 ans</span>
                </div>
                <BaroChart series={data.series} />
              </div>
            </div>
          </div>

          {/* Explication + action */}
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '14px 18px' }}>
            <div style={{ font: 'var(--type-body-sm)', color: 'var(--text-soft)', maxWidth: 620 }}>
              Une dispersion est <strong style={{ color: 'var(--text)' }}>long les composants / short l'indice</strong> : elle profite quand la corrélation réalisée finit <em>sous</em> l'implicite. Plus le percentile est élevé, plus la corrélation implicite est chère à vendre.
            </div>
            <button onClick={() => onNav('opportunities')} style={{ font: '600 12px/1 var(--font-sans)', padding: '10px 16px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', flexShrink: 0 }}>
              Voir les opportunités {index} →
            </button>
          </div>

          {data.skipped && data.skipped.length > 0 && (
            <div style={{ font: 'var(--type-caption)', color: 'var(--text-dim)' }}>Sans historique exploitable : {data.skipped.join(', ')}</div>
          )}
        </div>
      )}
    </div>
  );
}

window.CorrelationPro = CorrelationPro;
