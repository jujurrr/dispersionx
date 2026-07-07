/* ─── Prochains résultats (earnings) — Marché Pro ───
   Basé sur TES actions : celles de tes listes + celles de tes stratégies
   (Strategy Monitor). Plus une recherche par ticker (« dans combien de temps
   les prochains résultats de X ? »). Des earnings groupés = corrélation
   réalisée plus faible = dispersion plus payante. Données Finnhub. */

// Tickers présents dans les stratégies construites (localStorage dx-strategy-*).
function strategyTickers() {
  const out = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.indexOf('dx-strategy-') === 0) {
        try { const s = JSON.parse(localStorage.getItem(k)); (s.components || []).forEach(c => c && c.ticker && out.push(c.ticker)); } catch {}
      }
    }
  } catch {}
  return out;
}

const daysTo = d => Math.max(0, Math.round((new Date(d) - Date.now()) / 86400000));
const fmtDate = d => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
const hourLbl = h => h === 'bmo' ? 'avant ouverture' : h === 'amc' ? 'après clôture' : (h || '');

function EarnRow({ e, highlight }) {
  const dt = daysTo(e.date);
  const soon = dt <= 14;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderRadius: 'var(--radius)', background: highlight ? 'var(--accent-soft)' : 'var(--bg-elevated)', border: `1px solid ${highlight ? 'var(--accent-border)' : 'var(--border)'}` }}>
      <span style={{ font: '700 12px/1 var(--font-mono)', color: 'var(--text)', width: 58 }}>{e.symbol}</span>
      <span style={{ font: 'var(--type-body-sm)', color: 'var(--text-soft)', flex: 1 }}>{fmtDate(e.date)}{e.hour ? <span style={{ color: 'var(--text-dim)' }}> · {hourLbl(e.hour)}</span> : null}</span>
      <span style={{ font: '600 11px/1 var(--font-mono)', color: soon ? 'var(--warn)' : 'var(--text-muted)' }}>dans {dt}j</span>
    </div>
  );
}

function EarningsPanel({ lists }) {
  const DS = window.DispersionXDesignSystem_cb86be;
  const { Badge, Button } = DS;
  const DAYS = 60;

  // Mes tickers = listes + stratégies (dédupliqués).
  const myTickers = React.useMemo(() => {
    const fromLists = (lists || []).flatMap(l => (l.items || []).map(i => i.ticker));
    const set = new Set([...fromLists, ...strategyTickers()].filter(Boolean).map(t => t.toUpperCase()));
    return [...set];
  }, [lists]);

  const [loading, setLoading] = React.useState(false);
  const [events, setEvents] = React.useState(null);
  const [unavailable, setUnavailable] = React.useState(false);

  const [q, setQ] = React.useState('');
  const [searchBusy, setSearchBusy] = React.useState(false);
  const [searchRes, setSearchRes] = React.useState(null);   // { ticker, event|null }

  async function loadMine(tickers) {
    setLoading(true); setUnavailable(false);
    try {
      if (!tickers.length) { setEvents([]); return; }
      const d = await DXApi.earningsCalendar(tickers, DAYS);
      if (d && d.unavailable) { setUnavailable(true); setEvents([]); }
      else setEvents(d && d.events ? d.events : []);
    } catch { setEvents([]); }
    finally { setLoading(false); }
  }
  React.useEffect(() => { loadMine(myTickers); /* eslint-disable-next-line */ }, [myTickers.join(',')]);

  async function search(e) {
    if (e && e.preventDefault) e.preventDefault();
    const t = q.trim().toUpperCase();
    if (!t) return;
    setSearchBusy(true); setSearchRes(null);
    try {
      const d = await DXApi.earningsCalendar([t], 180);
      if (d && d.unavailable) setSearchRes({ ticker: t, event: null, unavailable: true });
      else { const ev = (d && d.events || []).find(x => x.symbol === t) || null; setSearchRes({ ticker: t, event: ev }); }
    } catch { setSearchRes({ ticker: t, event: null }); }
    finally { setSearchBusy(false); }
  }

  const box = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden' };
  const list = events || [];
  const in30 = list.filter(e => daysTo(e.date) <= 30).length;
  const ratio = myTickers.length ? in30 / myTickers.length : 0;
  const insightTone = ratio >= 0.35 ? 'pos' : ratio >= 0.15 ? 'warn' : 'neutral';
  const inputStyle = { flex: 1, minWidth: 120, background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '9px 12px', color: 'var(--text)', font: 'var(--type-body-sm)', outline: 'none', textTransform: 'uppercase' };

  return (
    <div style={box}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-hover)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
        <span style={{ font: 'var(--type-title)', color: 'var(--text)' }}>Prochains résultats</span>
        {list.length > 0 && <span style={{ marginLeft: 'auto' }}><Badge tone={insightTone} size="sm">{in30} sous 30j</Badge></span>}
      </div>

      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Recherche par ticker */}
        <form onSubmit={search} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher une action (ex. AAPL)" style={inputStyle} />
          <Button variant="outline" size="md" type="submit" disabled={searchBusy || !q.trim()}>{searchBusy ? 'Recherche…' : 'Prochains résultats'}</Button>
        </form>
        {searchRes && (
          <div style={{ font: 'var(--type-body-sm)', color: 'var(--text-soft)' }}>
            {searchRes.unavailable
              ? 'Calendrier indisponible pour l\'instant.'
              : searchRes.event
                ? <EarnRow e={searchRes.event} highlight />
                : <span style={{ color: 'var(--text-muted)' }}>Aucune date de résultats annoncée pour <strong style={{ color: 'var(--text)' }}>{searchRes.ticker}</strong> sur les 180 prochains jours.</span>}
          </div>
        )}

        <div style={{ height: 1, background: 'var(--border-subtle)' }} />

        {/* Mes actions suivies */}
        {myTickers.length === 0 ? (
          <div style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}>
            Ajoutez des actions à une <strong style={{ color: 'var(--text-soft)' }}>liste</strong> ou construisez une <strong style={{ color: 'var(--text-soft)' }}>stratégie</strong> pour suivre leurs résultats ici. La recherche ci-dessus fonctionne pour n'importe quelle action.
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', padding: '10px 14px', borderRadius: 'var(--radius)', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderLeft: `3px solid var(--${insightTone === 'neutral' ? 'border-strong' : insightTone})` }}>
              <span style={{ font: 'var(--type-body-sm)', color: 'var(--text-soft)' }}>
                <strong style={{ color: 'var(--text)' }}>{in30}</strong> de vos {myTickers.length} actions suivies publient dans les 30 jours.{' '}
                {ratio >= 0.35
                  ? <>Earnings groupés → <strong style={{ color: 'var(--pos-bright)' }}>dispersion réalisée potentiellement plus forte</strong>.</>
                  : ratio >= 0.15 ? <>Quelques catalyseurs idiosyncratiques à venir.</>
                    : <>Peu de catalyseurs sur la période.</>}
              </span>
            </div>

            {loading && <div style={{ padding: '10px 0', textAlign: 'center', color: 'var(--text-muted)', font: 'var(--type-body-sm)' }}>Chargement du calendrier…</div>}
            {unavailable && !loading && <div style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}>Calendrier des résultats indisponible pour l'instant.</div>}
            {!loading && !unavailable && list.length === 0 && <div style={{ font: 'var(--type-caption)', color: 'var(--text-dim)' }}>Aucun résultat annoncé pour vos actions sur les {DAYS} prochains jours.</div>}
            {!loading && list.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {list.slice(0, 20).map(e => <EarnRow key={e.symbol + e.date} e={e} />)}
                {list.length > 20 && <div style={{ font: 'var(--type-caption)', color: 'var(--text-dim)', textAlign: 'center' }}>+{list.length - 20} autres</div>}
              </div>
            )}
          </>
        )}

        <div style={{ font: 'var(--type-caption)', color: 'var(--text-dim)' }}>Dates estimées (Finnhub), susceptibles de changer — à titre indicatif.</div>
      </div>
    </div>
  );
}

window.EarningsPanel = EarningsPanel;
