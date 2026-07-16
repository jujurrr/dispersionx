/* ─── Régime de dispersion : carrousel multi-indices (live) ──────────
   FAVORABLE = marché calme + prime positive ; PRUDENCE = vol qui spike (stress →
   tout se corrèle → la dispersion perd) ou prime négative ; MITIGÉ entre. Seuils
   IV = standards VIX. Le carrousel fait défiler le profil de chaque indice avec
   une animation latérale (‹ ›). */
const INDEX_LABELS = { SPX: 'S&P 500', NDX: 'Nasdaq 100', DJI: 'Dow Jones', CAC: 'CAC 40', DAX: 'DAX' };

function regimeOf(iv, prime) {
  if (iv == null || prime == null) return { tone: 'var(--text-muted)', verdict: 'En cours', msg: 'Données de marché en cours de chargement…' };
  if (iv > 30 || prime < 0) return {
    tone: 'var(--neg)', verdict: 'Prudence',
    msg: iv > 30
      ? `Volatilité élevée (IV ${iv.toFixed(0)} %) : en régime de stress la corrélation grimpe et la dispersion perd. À éviter.`
      : `Prime négative (${prime} pts) : le marché price moins de synchronisation que celle observée. Peu favorable.`,
  };
  if (iv < 22 && prime > 3) return { tone: 'var(--pos)', verdict: 'Favorable', msg: `Marché calme (IV ${iv.toFixed(0)} %) et prime généreuse (+${prime} pts) : les actions bougent chacune de leur côté — le contexte où la dispersion tend à payer.` };
  return { tone: 'var(--warn)', verdict: 'Mitigé', msg: `Contexte intermédiaire (IV ${iv.toFixed(0)} %, prime ${prime >= 0 ? '+' : ''}${prime} pts) : ni franchement calme, ni en stress.` };
}

function RegimeCarousel({ regimes, mode }) {
  const [i, setI] = React.useState(0);
  const n = regimes.length;
  React.useEffect(() => {   // défilement automatique toutes les 5 s (relancé à chaque changement)
    if (n <= 1) return;
    const id = setTimeout(() => setI(x => x + 1), 5000);
    return () => clearTimeout(id);
  }, [i, n]);
  if (!n) return null;
  const cur = ((i % n) + n) % n;
  const active = regimeOf(regimes[cur].iv, regimes[cur].prime);
  const navBtn = { width: 24, height: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-soft)', cursor: 'pointer', font: '600 15px/1 var(--font-sans)' };
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: `3px solid ${active.tone}`, borderRadius: 'var(--radius-lg)', padding: '16px 18px', overflow: 'hidden', transition: 'border-color 0.4s' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
        <h3 style={{ font: 'var(--type-h3)', color: 'var(--text)', margin: 0 }}>Régime de dispersion</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setI(cur - 1)} aria-label="Indice précédent" style={navBtn}>‹</button>
          <div style={{ display: 'flex', gap: 5 }}>
            {regimes.map((r, k) => <span key={r.symbol} onClick={() => setI(k)} title={r.label} style={{ width: 6, height: 6, borderRadius: '50%', background: k === cur ? 'var(--accent-hover)' : 'var(--border-strong)', cursor: 'pointer', transition: 'background 0.25s' }} />)}
          </div>
          <button onClick={() => setI(cur + 1)} aria-label="Indice suivant" style={navBtn}>›</button>
        </div>
      </div>
      {/* feu FIXE (reflète l'indice actif) + texte qui glisse → aucun débordement au bord */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', paddingTop: 3, flexShrink: 0 }}>
          {['var(--neg)', 'var(--warn)', 'var(--pos)'].map(c => { const on = c === active.tone; return <span key={c} style={{ width: 11, height: 11, borderRadius: '50%', background: on ? c : 'var(--bg-elevated)', boxShadow: on ? `0 0 8px ${c}` : 'none', border: on ? 'none' : '1px solid var(--border)', transition: 'background 0.3s' }} />; })}
        </div>
        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', transform: `translateX(-${cur * 100}%)`, transition: 'transform 0.42s cubic-bezier(0.22,1,0.36,1)' }}>
            {regimes.map(r => {
              const g = regimeOf(r.iv, r.prime);
              return (
                <div key={r.symbol} style={{ flex: '0 0 100%', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ font: 'var(--type-title)', color: 'var(--text)' }}>{r.label}</span>
                    <span style={{ font: '700 12px/1 var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.06em', color: g.tone }}>{g.verdict}</span>
                  </div>
                  <div style={{ font: 'var(--type-caption)', color: 'var(--text-dim)', margin: '3px 0 0' }}>
                    {r.iv != null ? `IV ${r.iv.toFixed(0)} %` : 'IV —'} · prime {r.prime != null ? (r.prime >= 0 ? '+' : '') + r.prime + ' pts' : '—'}
                  </div>
                  <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: '8px 0 0' }}>{g.msg}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {mode === 'Débutant' && (
        <p style={{ font: 'var(--type-caption)', color: 'var(--text-dim)', margin: '10px 0 0' }}>
          La dispersion parie que les actions se décorrèlent : elle profite en marché calme et perd quand tout tombe ensemble. Ça défile tout seul (‹ › pour comparer manuellement) — un repère de contexte, pas un signal d'entrée.
        </p>
      )}
    </div>
  );
}

/* ─── Dashboard: what deserves my attention today? ─────────────── */
function Dashboard({ onNav, lists, mode, moduleCtx, onModuleCtx }) {
  const _fx = window.useCurrency ? window.useCurrency() : null;   // re-render au changement de devise
  const { MetricCard, ScoreBadge, RiskBadge, Badge, BeginnerExplanationBox } = window.DispersionXDesignSystem_cb86be;
  const [mktData, setMktData] = React.useState(null);
  const [oppPrime, setOppPrime] = React.useState({});  // prime ρ par indice (fond)
  const [tick, setTick] = React.useState(0);           // re-render quand le store avance
  const oppFetching = React.useRef({});                // garde : 1 calcul de prime par indice
  const [activity, setActivity] = React.useState(null); // { account, shared, nameMap } — activité récente
  const [now, setNow] = React.useState(() => new Date());   // statut marché (même source que l'en-tête)
  const [ivByIndex, setIvByIndex] = React.useState({});     // IV ATM RÉELLE par indice (Cboe, /api/iv/:index)
  React.useEffect(() => { const id = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(id); }, []);
  React.useEffect(() => {
    // IV réelle Cboe pour CHAQUE indice (mapping ETF pour CAC/DAX géré côté API). Caché 15 min par le CDN.
    (window.DXMock?.indices || []).forEach(ix => {
      fetch(`/api/iv/${ix.symbol}?dte=30`).then(r => r.ok ? r.json() : null).then(d => {
        const iv = d && (d.iv ?? d.iv_atm);
        if (iv != null && isFinite(iv)) setIvByIndex(prev => ({ ...prev, [ix.symbol]: Number(iv) }));
      }).catch(() => {});
    });
  }, []);

  // Activité récente : global (RLS) partitionné en « compte » (mes listes) et
  // « partagé » (listes partagées avec moi). Rafraîchi sur les mutations.
  const cloudOn = !!(window.DXCloud && window.DXCloud.enabled);
  const loadActivity = React.useCallback(() => {
    if (!(window.DXCloud && window.DXCloud.enabled)) { setActivity(null); return; }
    Promise.all([DXApi.getGlobalActivity(200), DXApi.getSharedLists().catch(() => [])]).then(([acts, shared]) => {
      const nameMap = {};
      (lists || []).forEach(l => { if (l && l.id) nameMap[l.id] = l.name; });
      (shared || []).forEach(l => { if (l && l.id) nameMap[l.id] = l.name; });
      const sharedIds = new Set((shared || []).map(l => l.id));
      const account = [], shr = [];
      (acts || []).forEach(e => { (sharedIds.has(e.list_id) ? shr : account).push(e); });
      setActivity({ account, shared: shr, nameMap });
    }).catch(() => setActivity({ account: [], shared: [], nameMap: {} }));
  }, [lists]);

  React.useEffect(() => {
    if (!cloudOn) return;
    loadActivity();
    const onChg = () => loadActivity();
    window.addEventListener('dx-activity-poke', onChg);
    window.addEventListener('dx-lists-changed', onChg);
    return () => { window.removeEventListener('dx-activity-poke', onChg); window.removeEventListener('dx-lists-changed', onChg); };
  }, [cloudOn, loadActivity]);

  React.useEffect(() => {
    // Marché : vol SPX réelle + corrélation SPX
    Promise.all([
      fetch('/api/vol/spx').then(r => r.ok ? r.json() : null).catch(() => null),
      DXApi.getCorrelation(null, ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'META', 'AMZN'], 'SPX').catch(() => null),
    ]).then(([vol, corr]) => setMktData({ vol, corr }));
    // S'assurer que le store charge/score les 5 indices ; re-render à l'avancement
    const onUpd = () => setTick(t => t + 1);
    window.addEventListener('dx-index-update', onUpd);
    window.addEventListener('dx-strategies-changed', onUpd);   // hydratation cloud des stratégies
    if (window.DXStore) (window.DXMock?.indices || []).forEach(ix =>
      window.DXStore.loadIndex(ix.symbol).then(() => window.DXStore.scoreIndex(ix.symbol, 30)).catch(() => {}));
    return () => { window.removeEventListener('dx-index-update', onUpd); window.removeEventListener('dx-strategies-changed', onUpd); };
  }, []);

  // Prime de corrélation par indice (calcul de fond sur les top composants du store)
  React.useEffect(() => {
    (window.DXMock?.indices || []).forEach(ix => {
      if (oppPrime[ix.symbol] !== undefined || oppFetching.current[ix.symbol]) return;
      const comps = ((window.DXStore?.getIndexData(ix.symbol) || {}).components || []).slice(0, 6).map(c => c.ticker).filter(Boolean);
      if (comps.length < 2) return;
      oppFetching.current[ix.symbol] = true;            // une seule tentative par indice
      DXApi.getCorrelation(null, comps, ix.symbol).then(d => {
        if (d && d.rho_impl != null && d.rho_real != null)
          setOppPrime(prev => ({ ...prev, [ix.symbol]: Number(((d.rho_impl - d.rho_real) * 100).toFixed(1)) }));
      }).catch(() => {});
    });
  }, [tick]);  // eslint-disable-line — oppPrime lu via garde, pas en dépendance

  const vol  = mktData?.vol;
  const corr = mktData?.corr;
  const ivAtm  = vol?.iv_atm ?? null;
  const hv30d  = vol?.hv30   ?? null;
  const rhoI   = corr?.rho_impl ?? null;
  const rhoR   = corr?.rho_real ?? null;
  const prime  = rhoI != null && rhoR != null ? Number(((rhoI - rhoR) * 100).toFixed(1)) : null;
  const signal = prime != null ? (prime > 5 ? 'Favorable' : prime > 0 ? 'Neutre' : 'Défavorable') : '···';
  const sigAccent = prime != null ? (prime > 5 ? 'var(--pos)' : prime > 0 ? 'var(--warn)' : 'var(--neg)') : 'var(--text-muted)';

  const marketCards = [
    { label: 'IV ATM SPX', value: ivAtm != null ? ivAtm.toFixed(1) : '···', unit: '%', accent: 'var(--warn)', hint: vol?.source === 'marketdata+yahoo' ? 'MarketData' : 'Est.' },
    { label: 'ρ implicite SPX', value: rhoI != null ? rhoI.toFixed(2) : '···', accent: 'var(--accent)' },
    { label: 'Prime ρ', value: prime != null ? (prime >= 0 ? '+' : '') + prime : '···', unit: prime != null ? 'pts' : '', accent: prime != null && prime > 0 ? 'var(--pos)' : 'var(--neg)' },
    { label: 'HV 30j SPX', value: hv30d != null ? hv30d.toFixed(1) : '···', unit: '%', accent: 'var(--info)', hint: 'Yahoo Finance' },
    { label: 'Signal global', value: signal, accent: sigAccent },
  ];

  // Opportunités : les 5 indices, classés par score moyen réel (store)
  const opportunities = (window.DXMock?.indices || []).map(ix => {
    const scores = window.DXStore ? window.DXStore.getScores(ix.symbol, 30) : {};
    const vals = Object.values(scores).filter(v => v != null);
    const avgScore = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
    const snap = (window.DXStore?.getIndexData(ix.symbol) || {}).snap || (window.DXMock?.getSnapshot ? window.DXMock.getSnapshot(ix.symbol) : null);
    const risk = avgScore == null ? 'modéré' : avgScore >= 70 ? 'faible' : avgScore >= 55 ? 'modéré' : 'élevé';
    return { idx: ix.symbol, dte: 30, iv: snap?.iv_est ?? null, score: avgScore, prime: oppPrime[ix.symbol], risk };
  }).sort((a, b) => (b.score || 0) - (a.score || 0));

  // Stratégies réellement construites (Builder / Construction)
  const builtStrats = (window.DXApi && DXApi.localStrategies)
    ? DXApi.localStrategies(lists).map(s => ({ s, m: DXApi.strategyMetrics(s) }))
    : [];

  // Alertes dérivées : stratégies à surveiller + marché
  const alerts = [];
  builtStrats.forEach(r => { if (r.m.alert) alerts.push({ t: (r.s.index || 'SPX') + ' · ' + r.m.alert, tone: r.m.status === 'risque' ? 'var(--neg)' : 'var(--warn)' }); });
  if (prime != null && prime < 0) alerts.push({ t: 'SPX · prime de corrélation négative', tone: 'var(--neg)' });
  if (!alerts.length) alerts.push({ t: builtStrats.length ? 'Aucune alerte sur vos stratégies' : 'Aucune stratégie suivie pour l\'instant', tone: 'var(--pos)' });

  const fmtS = n => window.DXMoney ? window.DXMoney.value(n) : ((n >= 0 ? '+' : '−') + Math.abs(Math.round(n)).toLocaleString('fr-FR'));
  const dxSym = () => window.DXMoney ? window.DXMoney.symbol() : '$';
  const ctx = moduleCtx || {};
  // Statut marché = même logique que l'en-tête (window.DXMarket, réf. NYSE)
  const _nyse = window.DXMarket && (window.DXMarket.EXCHANGES || []).find(e => e.key === 'nyse');
  const marketOpen = _nyse ? window.DXMarket.isExchangeOpen(_nyse, now) : true;
  // Profil de régime par indice (carrousel) : IV + prime par indice
  const regimeData = (window.DXMock?.indices || []).map(ix => {
    const snap = (window.DXStore?.getIndexData(ix.symbol) || {}).snap || (window.DXMock?.getSnapshot ? window.DXMock.getSnapshot(ix.symbol) : null);
    const iv = ivByIndex[ix.symbol] != null ? ivByIndex[ix.symbol]
      : ((ix.symbol === 'SPX' && ivAtm != null) ? ivAtm : (snap?.iv_est ?? null));
    const pr = oppPrime[ix.symbol] != null ? oppPrime[ix.symbol] : (ix.symbol === 'SPX' && prime != null ? prime : null);
    return { symbol: ix.symbol, label: INDEX_LABELS[ix.symbol] || ix.symbol, iv, prime: pr };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Contexte liste actif */}
      {lists && onModuleCtx && (ctx.listId || ctx.ticker) && (
        <window.ModuleCtxBar
          ctx={ctx}
          lists={lists}
          onCtx={upd => onModuleCtx(upd)}
          onClear={() => onModuleCtx({ listId: null, listName: null, ticker: null })}
        />
      )}
      {/* Hero */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <h1 style={{ font: 'var(--type-h1)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: 0 }}>Aujourd'hui</h1>
          <Badge tone={marketOpen ? 'accent' : 'neutral'} dot={marketOpen}>{marketOpen ? 'Marché ouvert' : 'Marché fermé'}</Badge>
        </div>
        <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)', margin: 0, maxWidth: 640 }}>
          Lecture du jour : la prime de corrélation reste positive sur le SPX. Un signal à analyser, pas une recommandation.
        </p>
      </div>

      {/* Régime de dispersion — carrousel multi-indices (live) */}
      <RegimeCarousel regimes={regimeData} mode={mode} />

      {/* Market Overview */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 }}>
          <div>
            <h2 style={{ font: 'var(--type-h2)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: 0 }}>Market Overview</h2>
            <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: '4px 0 0' }}>Volatilité et corrélation agrégées du marché</p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
          {marketCards.map((m, i) => (
            <MetricCard key={m.label} {...m} style={{ animationDelay: (i * 70) + 'ms' }} />
          ))}
        </div>
      </section>

      {/* Opportunités */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 }}>
          <div>
            <h2 style={{ font: 'var(--type-h2)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: 0 }}>Opportunités</h2>
            <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: '4px 0 0' }}>Indices où l'écart vol/corrélation mérite un examen</p>
          </div>
          <button onClick={() => onNav('home')} style={{ font: '600 12px/1 var(--font-sans)', padding: '7px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>Tout voir</button>
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', font: 'var(--type-body-sm)' }}>
            <thead>
              <tr style={{ background: 'var(--bg-elevated)' }}>
                {['Indice', 'Maturité', 'Prime ρ', 'Score', 'Risque', ''].map((h, i) => (
                  <th key={h + i} style={{ textAlign: i > 0 && i < 5 ? 'right' : 'left', font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {opportunities.map((o) => (
                <tr key={o.idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '12px 16px', font: 'var(--type-ticker)', color: 'var(--text)' }}>{o.idx}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', font: 'var(--type-data-sm)', color: 'var(--text-soft)' }} title="Échéance de référence pour comparer les indices">{o.dte}j réf.</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', font: 'var(--type-data)', color: o.prime == null ? 'var(--text-dim)' : o.prime >= 0 ? 'var(--pos-bright)' : 'var(--neg-bright)' }}>{o.prime == null ? '···' : (o.prime >= 0 ? '+' : '') + o.prime + ' pts'}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-block' }}><ScoreBadge score={o.score} max={0} label="" /></div>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}><RiskBadge level={o.risk} size="sm" /></td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <button onClick={() => onNav('index-detail', { symbol: o.idx })}
                      style={{ font: '600 11px/1 var(--font-sans)', padding: '6px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>Analyser</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>
        {/* Stratégies suivies */}
        <section>
          <h2 style={{ font: 'var(--type-h2)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: '0 0 14px' }}>Stratégies suivies</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {builtStrats.length ? builtStrats.slice(0, 4).map((r) => (
              <div key={r.s.listId} onClick={() => onNav('monitor')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '14px 16px', cursor: 'pointer' }}>
                <div>
                  <div style={{ font: 'var(--type-title)', color: 'var(--text)' }}>{r.m.name}</div>
                  <div style={{ font: 'var(--type-data-sm)', color: 'var(--text-muted)', marginTop: 3 }}>{r.m.nComp} composants · {r.m.dte}j restants · vega {fmtS(r.m.netVega)}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {r.m.alert && <Badge tone={r.m.status === 'risque' ? 'neg' : 'warn'} pulse>{r.m.status}</Badge>}
                  <div style={{ font: 'var(--type-data-lg)', color: r.m.netPremium >= 0 ? 'var(--pos-bright)' : 'var(--neg-bright)' }}>{fmtS(r.m.netPremium)} {dxSym()}</div>
                </div>
              </div>
            )) : (
              <div style={{ padding: '22px 18px', textAlign: 'center', color: 'var(--text-muted)', font: 'var(--type-body-sm)', background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)' }}>
                Aucune stratégie construite — lancez le <strong style={{ color: 'var(--text-soft)' }}>Strategy Builder</strong> pour en suivre une ici.
              </div>
            )}
            <button onClick={() => onNav('monitor')}
              style={{ font: '600 12px/1 var(--font-sans)', padding: '10px 0', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer', width: '100%' }}>
              Ouvrir le Strategy Monitor →
            </button>
          </div>
        </section>

        {/* Alertes */}
        <section>
          <h2 style={{ font: 'var(--type-h2)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: '0 0 14px' }}>Alertes</h2>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            {alerts.map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderBottom: i < alerts.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: a.tone, flexShrink: 0 }} />
                <span style={{ font: 'var(--type-body-sm)', color: 'var(--text-soft)' }}>{a.t}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Pédagogie */}
      {mode === 'Débutant' && (
        <section>
          <h2 style={{ font: 'var(--type-h2)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: '0 0 14px' }}>Comprendre le signal du jour</h2>
          <BeginnerExplanationBox>
            La prime de corrélation est positive : le marché price une synchronisation plus forte que celle observée récemment sur les composants. C'est le contexte favorable à une dispersion classique — à confirmer avec la liquidité, les earnings et le coût d'exécution.
          </BeginnerExplanationBox>
        </section>
      )}

      {/* Activité récente — compte vs partagé (cloud uniquement) */}
      {cloudOn && activity && window.ActivityPanel && (
        <section>
          <div style={{ marginBottom: 14 }}>
            <h2 style={{ font: 'var(--type-h2)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: 0 }}>Activité récente</h2>
            <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: '4px 0 0' }}>Qui a modifié quoi, et quand — sur vos listes et celles partagées avec vous (30 derniers jours).</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, alignItems: 'start' }}>
            <window.ActivityPanel title="Activité du compte" subtitle="Modifications sur vos listes" entries={activity.account} nameMap={activity.nameMap} />
            <window.ActivityPanel title="Activité partagée" subtitle="Modifications sur les listes partagées avec vous" entries={activity.shared} nameMap={activity.nameMap} />
          </div>
        </section>
      )}
    </div>
  );
}

window.Dashboard = Dashboard;
