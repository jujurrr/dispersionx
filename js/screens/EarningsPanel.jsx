/* ─── Calendrier des résultats (earnings) des composants — Marché Pro ───
   Des earnings groupés dans la fenêtre = mouvements idiosyncratiques =
   corrélation réalisée plus faible = dispersion plus payante. Panneau intégrable
   qui suit l'indice fourni. Données Finnhub (via /api/earnings/calendar). */

const _earnCache = {};   // index -> { at, data }

async function earnGather(index, days) {
  await window.DXStore.loadIndex(index);
  const d = window.DXStore.getIndexData(index) || {};
  const comps = (d.components || []).map(c => c.ticker).filter(Boolean).slice(0, 25);
  if (comps.length < 2) throw new Error('composants indisponibles');
  const data = await DXApi.earningsCalendar(comps, days);
  return { data, total: comps.length };
}

function EarningsPanel({ index }) {
  const DS = window.DispersionXDesignSystem_cb86be;
  const { Badge } = DS;
  const DAYS = 45;
  const [loading, setLoading] = React.useState(false);
  const [data, setData] = React.useState(null);
  const [total, setTotal] = React.useState(0);
  const [error, setError] = React.useState('');

  async function load(idx) {
    setError(''); setData(null); setLoading(true);
    try {
      if (_earnCache[idx] && Date.now() - _earnCache[idx].at < 30 * 60 * 1000) {
        setData(_earnCache[idx].data.data); setTotal(_earnCache[idx].data.total); setLoading(false); return;
      }
      const res = await earnGather(idx, DAYS);
      _earnCache[idx] = { at: Date.now(), data: res };
      setData(res.data); setTotal(res.total);
    } catch (e) { setError(e && e.message ? e.message : 'indisponible'); }
    finally { setLoading(false); }
  }
  React.useEffect(() => { load(index); /* eslint-disable-next-line */ }, [index]);

  const box = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden' };
  const events = data && data.events ? data.events : [];
  const unavailable = data && data.unavailable;
  const in30 = events.filter(e => (new Date(e.date) - Date.now()) / 86400000 <= 30).length;
  const ratio = total ? in30 / total : 0;
  const insightTone = ratio >= 0.35 ? 'pos' : ratio >= 0.15 ? 'warn' : 'neutral';
  const daysTo = d => Math.max(0, Math.round((new Date(d) - Date.now()) / 86400000));
  const fmtDate = d => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

  return (
    <div style={box}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-hover)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
        <span style={{ font: 'var(--type-title)', color: 'var(--text)' }}>Calendrier des résultats</span>
        <span style={{ font: '600 11px/1 var(--font-mono)', color: 'var(--text-muted)' }}>· {index} · {DAYS}j</span>
        {events.length > 0 && <span style={{ marginLeft: 'auto' }}><Badge tone={insightTone} size="sm">{in30} sous 30j</Badge></span>}
      </div>

      {loading && <div style={{ padding: '24px 20px', textAlign: 'center', color: 'var(--text-muted)', font: 'var(--type-body-sm)' }}>Chargement du calendrier…</div>}
      {(error || unavailable) && !loading && (
        <div style={{ padding: '18px 20px', font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}>Calendrier des résultats indisponible pour l'instant.</div>
      )}

      {!loading && !unavailable && !error && data && (
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', padding: '10px 14px', borderRadius: 'var(--radius)', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderLeft: `3px solid var(--${insightTone === 'neutral' ? 'border-strong' : insightTone})` }}>
            <span style={{ font: 'var(--type-body-sm)', color: 'var(--text-soft)' }}>
              <strong style={{ color: 'var(--text)' }}>{in30}</strong> des {total} composants publient dans les 30 jours.{' '}
              {ratio >= 0.35
                ? <>Beaucoup d'earnings groupés → <strong style={{ color: 'var(--pos-bright)' }}>dispersion réalisée potentiellement plus forte</strong>.</>
                : ratio >= 0.15
                  ? <>Quelques catalyseurs idiosyncratiques dans la fenêtre.</>
                  : <>Peu d'earnings à venir → moteur de dispersion plus faible sur la période.</>}
            </span>
          </div>

          {events.length === 0 ? (
            <div style={{ font: 'var(--type-caption)', color: 'var(--text-dim)' }}>Aucun résultat annoncé pour ces composants sur la fenêtre.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {events.slice(0, 16).map(e => {
                const dt = daysTo(e.date);
                const soon = dt <= 14;
                return (
                  <div key={e.symbol + e.date} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderRadius: 'var(--radius)', background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                    <span style={{ font: '700 12px/1 var(--font-mono)', color: 'var(--text)', width: 56 }}>{e.symbol}</span>
                    <span style={{ font: 'var(--type-body-sm)', color: 'var(--text-soft)', flex: 1 }}>{fmtDate(e.date)}{e.hour ? <span style={{ color: 'var(--text-dim)' }}> · {e.hour === 'bmo' ? 'avant ouverture' : e.hour === 'amc' ? 'après clôture' : e.hour}</span> : null}</span>
                    <span style={{ font: '600 11px/1 var(--font-mono)', color: soon ? 'var(--warn)' : 'var(--text-muted)' }}>dans {dt}j</span>
                  </div>
                );
              })}
              {events.length > 16 && <div style={{ font: 'var(--type-caption)', color: 'var(--text-dim)', textAlign: 'center' }}>+{events.length - 16} autres</div>}
            </div>
          )}
          <div style={{ font: 'var(--type-caption)', color: 'var(--text-dim)' }}>Dates estimées (Finnhub), susceptibles de changer — à titre indicatif.</div>
        </div>
      )}
    </div>
  );
}

window.EarningsPanel = EarningsPanel;
