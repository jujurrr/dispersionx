/* ─── Module Pro : offre, prix, upsell contextuel, soft-paywall, page Tarifs ──
   Source UNIQUE de la communication Pro (évite de dupliquer le prix/les messages
   sur chaque écran verrouillé). Non-cassant : réutilise window.DXCloud pour le
   checkout Stripe et window.DispersionXDesignSystem_cb86be pour les Badges. */

// Offre commerciale — un seul endroit à éditer.
const DX_PRO = {
  price: '2,99',
  currency: '€',
  period: 'mois',
  annual: { price: '29,99', period: 'an', note: 'Bientôt' }, // activée via VITE_PRO_ANNUAL=1 (+ STRIPE_PRICE_ID_ANNUAL)
  guaranteeDays: 14,
  // Ce que Pro débloque (repris dans la carte et le tableau comparatif).
  perks: [
    'Auto-chercheur d\'opportunités',
    'Marché Pro : baromètre ρ, alertes, calendrier des résultats',
    'Suivi de positions en temps réel (P&L, grecs, snapshots)',
    'Export vers IBKR : stratégie prête à trader (Risk Navigator · What-If)',
    'Partage de listes & stratégies (lien ou e-mail)',
    'Télécharger & importer listes et stratégies (fichiers .json)',
    'Journal / track record',
    'Rapports PDF',
  ],
  // Messages ciblés par écran (le « pourquoi » propre à l'endroit cliqué).
  contexts: {
    opportunities: {
      title: 'Auto-chercheur d\'opportunités',
      desc: 'Laisse l\'algorithme trouver les meilleures dispersions à ta place — prêtes à construire.',
      bullets: ['Meilleurs paniers par indice (5 à 20 actions)', 'Sizing vega-neutre + 3 scénarios de stress', 'Backtest de la prime capturée'],
    },
    positions: {
      title: 'Suivi de positions',
      desc: 'Suis l\'avancée de tes positions en temps réel : P&L au marché réel, grecs, snapshots quotidiens.',
      bullets: ['P&L mark-to-market (spot + IV réels)', 'Courbe P&L + Δ vs entrée / vs veille', 'Relevé automatique quotidien'],
    },
    journal: {
      title: 'Journal de trades',
      desc: 'Bâtis ton track record : réalisé vs attendu, taux de réussite, P&L cumulé.',
      bullets: ['Historique de tes dispersions', 'Statistiques de performance', 'Réalisé vs attendu'],
    },
    'market-pro': {
      title: 'Marché Pro',
      desc: 'Le contexte de marché de la dispersion — pour savoir quand agir.',
      bullets: ['Baromètre de corrélation implicite', 'Alertes de corrélation', 'Calendrier des résultats'],
    },
    ibkr: {
      title: 'Export vers IBKR',
      desc: 'Exporte toute ta stratégie en un fichier prêt à importer dans le Risk Navigator de TWS — options, composants et couverture delta compris.',
      bullets: ['CSV importable en 1 clic (portefeuille What-If)', 'Toutes les jambes + hedge actions reproduits fidèlement', 'Suis la position, puis exécute chez ton courtier'],
    },
    default: {
      title: 'DispersionX Pro',
      desc: 'Débloque les outils avancés : opportunités, marché, suivi et journal.',
      bullets: DX_PRO_PERKS_FALLBACK(),
    },
  },
};
function DX_PRO_PERKS_FALLBACK() { return ['Auto-chercheur d\'opportunités', 'Suivi de positions temps réel', 'Journal / track record']; }

// Ligne de réassurance commune (prix + garantie + Stripe).
function proReassurance() {
  return `${DX_PRO.price} ${DX_PRO.currency}/${DX_PRO.period} · garantie ${DX_PRO.guaranteeDays} j satisfait ou remboursé · sans engagement, résiliable en 1 clic`;
}

// Hook checkout partagé : gère connexion + redirection Stripe + état occupé.
// `source` = origine du clic (tunnel analytics : upsell/benefits/pricing…).
function useProCheckout(onNav, addToast, source = 'unknown') {
  const C = window.DXCloud;
  const signedIn = !!(C && C.user);
  const [busy, setBusy] = React.useState(false);
  const goPro = React.useCallback(async (cycle = 'monthly') => {
    window.DXTrack && window.DXTrack(signedIn ? 'checkout_start' : 'checkout_login_required', { source, cycle });
    if (!signedIn) { onNav && onNav('login'); return; }
    setBusy(true);
    try { await C.startProCheckout(cycle); }
    catch (e) { addToast && addToast('Paiement indisponible : ' + (e && e.message ? e.message : ''), 'error'); setBusy(false); }
  }, [signedIn, onNav, addToast, source]);
  return { signedIn, busy, goPro };
}

function LockIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

/* Carte d'upsell réutilisable — contextuelle, avec prix, garantie et lien Tarifs. */
function ProUpsellCard({ context = 'default', onNav, addToast }) {
  const DS = window.DispersionXDesignSystem_cb86be || {};
  const Badge = DS.Badge || (({ children }) => <span style={{ font: '600 9px/1 var(--font-mono)', padding: '2px 6px', borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent-hover)', border: '1px solid var(--accent-border)' }}>{children}</span>);
  const ctx = DX_PRO.contexts[context] || DX_PRO.contexts.default;
  const { signedIn, busy, goPro } = useProCheckout(onNav, addToast, 'upsell:' + context);
  React.useEffect(() => { window.DXTrack && window.DXTrack('upsell_view', { context }); }, [context]);

  return (
    <div style={{ width: '100%', maxWidth: 460, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', padding: '26px 26px 22px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 52, height: 52, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--accent-soft)', border: '1px solid var(--accent-border)', color: 'var(--accent-hover)' }}>
        <LockIcon />
      </div>
      <div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <h2 style={{ font: 'var(--type-h2)', color: 'var(--text)', margin: 0 }}>{ctx.title}</h2>
          <Badge tone="accent" size="sm">Pro</Badge>
        </div>
        <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: 0, maxWidth: 380 }}>{ctx.desc}</p>
      </div>

      {ctx.bullets && (
        <ul style={{ listStyle: 'none', padding: 0, margin: '2px 0', display: 'flex', flexDirection: 'column', gap: 7, font: 'var(--type-body-sm)', color: 'var(--text-soft)', textAlign: 'left' }}>
          {ctx.bullets.map((b, i) => <li key={i}>✓ {b}</li>)}
        </ul>
      )}

      {/* Prix */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, margin: '2px 0' }}>
        <span style={{ font: '800 30px/1 var(--font-sans)', color: 'var(--text)' }}>{DX_PRO.price} {DX_PRO.currency}</span>
        <span style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}>/ {DX_PRO.period}</span>
      </div>

      <button onClick={goPro} disabled={busy}
        style={{ width: '100%', font: '600 14px/1 var(--font-sans)', padding: '12px 26px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--accent)', color: '#fff', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1 }}>
        {busy ? 'Redirection…' : (signedIn ? `Passer Pro — ${DX_PRO.price} ${DX_PRO.currency}/${DX_PRO.period}` : 'Se connecter pour passer Pro')}
      </button>

      {onNav && (
        <button onClick={() => onNav('pricing')} style={{ font: '600 12px/1 var(--font-sans)', background: 'none', border: 'none', color: 'var(--accent-hover)', cursor: 'pointer', padding: 0 }}>
          Voir tout ce que Pro débloque →
        </button>
      )}

      <div style={{ font: 'var(--type-caption)', color: 'var(--text-dim)', maxWidth: 380 }}>
        Garantie <strong style={{ color: 'var(--text-soft)' }}>{DX_PRO.guaranteeDays} jours satisfait ou remboursé</strong> · paiement sécurisé Stripe · résiliable en 1 clic
      </div>
      {onNav && (
        <div style={{ font: '11px/1.5 var(--font-sans)', color: 'var(--text-dim)', maxWidth: 380 }}>
          En souscrivant, vous acceptez les <a onClick={() => onNav('sales')} style={{ color: 'var(--text-muted)', cursor: 'pointer', borderBottom: '1px dotted var(--border-strong)' }}>CGV</a> (abonnement mensuel à accès immédiat, reconductible, résiliable à tout moment).
        </div>
      )}
    </div>
  );
}

/* Soft-paywall : rend un aperçu (children) flouté + non-interactif, avec la carte
   d'upsell posée par-dessus. « Voir mais ne pas toucher » → crée le désir.
   Voile UNIFORME (pas de dégradé) et PAS de overflow:hidden → l'esquisse reste
   entièrement visible, rien n'est coupé en bas. */
function ProLockedPreview({ context = 'default', onNav, addToast, children, minHeight = 520 }) {
  return (
    <div style={{ position: 'relative' }}>
      {/* Esquisse floutée du module (inerte). minHeight garantit la place pour la carte. */}
      <div aria-hidden style={{ filter: 'blur(4px)', opacity: 0.5, pointerEvents: 'none', userSelect: 'none', minHeight }}>
        {children}
      </div>
      {/* Voile translucide uniforme : l'esquisse transparaît en dessous. */}
      <div style={{ position: 'absolute', inset: 0, background: 'var(--bg-base)', opacity: 0.4, pointerEvents: 'none' }} />
      {/* Carte d'upsell centrée en haut. */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: 44 }}>
        <ProUpsellCard context={context} onNav={onNav} addToast={addToast} />
      </div>
    </div>
  );
}

/* ─── Tableau comparatif Gratuit vs Pro ─────────────────────────── */
const DX_PRO_COMPARE = [
  ['Indices, composants & score de dispersion', true, true],
  ['Mes listes (illimité)', true, true],
  ['Correlation Lab & Volatility Lab', true, true],
  ['Construction & Strategy Builder', true, true],
  ['Risk Lab & stress tests', true, true],
  ['Auto-chercheur d\'opportunités', false, true],
  ['Marché Pro : baromètre ρ, alertes, résultats', false, true],
  ['Suivi de positions en temps réel', false, true],
  ['Export vers IBKR (Risk Navigator · What-If)', false, true],
  ['Partage de listes & stratégies (lien / e-mail)', false, true],
  ['Télécharger / importer listes & stratégies (fichiers)', false, true],
  ['Journal / track record', false, true],
  ['Rapports PDF', false, true],
];

function CheckMark({ on }) {
  return on
    ? <span style={{ color: 'var(--pos-bright)', font: '700 14px/1 var(--font-mono)' }}>✓</span>
    : <span style={{ color: 'var(--text-dim)', font: '600 14px/1 var(--font-mono)' }}>—</span>;
}

function ProComparison() {
  const cell = { padding: '11px 16px', borderBottom: '1px solid var(--border-subtle)', font: 'var(--type-body-sm)' };
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: 'var(--bg-elevated)' }}>
            <th style={{ ...cell, textAlign: 'left', font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>Fonctionnalité</th>
            <th style={{ ...cell, textAlign: 'center', width: 110, font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>Gratuit</th>
            <th style={{ ...cell, textAlign: 'center', width: 110, font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent-hover)', borderBottom: '1px solid var(--border)', background: 'var(--accent-soft)' }}>Pro</th>
          </tr>
        </thead>
        <tbody>
          {DX_PRO_COMPARE.map(([label, free, pro], i) => (
            <tr key={i}>
              <td style={{ ...cell, color: 'var(--text-soft)' }}>{label}</td>
              <td style={{ ...cell, textAlign: 'center' }}><CheckMark on={free} /></td>
              <td style={{ ...cell, textAlign: 'center', background: 'var(--accent-soft)' }}><CheckMark on={pro} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Avantages Pro mis en avant (Opportunités + Suivi = les 2 phares) ─── */
const DX_PRO_FLAGSHIPS = [
  {
    key: 'opportunities',
    badge: 'Gain de temps ×100',
    title: 'L\'auto-chercheur construit vos meilleures stratégies — tout seul',
    tagline: 'Fini les heures à tester des paniers à la main. L\'algorithme explore des milliers de combinaisons et vous sort les dispersions au plus haut potentiel, prêtes à construire — en quelques secondes.',
    points: [
      'Classe automatiquement les meilleurs paniers par indice',
      'Sizing vega-neutre + 3 scénarios de stress déjà calculés',
      'Backtest de la prime de corrélation capturée',
    ],
  },
  {
    key: 'positions',
    badge: 'Pilotage en temps réel',
    title: 'Suivez vos stratégies au marché réel, jour après jour',
    tagline: 'Chaque position est valorisée en direct : P&L, grecs, évolution. Vous savez toujours où vous en êtes — et quand sortir.',
    points: [
      'P&L mark-to-market (spot + IV réels Cboe)',
      'Courbe d\'évolution + Δ vs entrée / vs veille',
      'Relevé automatique quotidien',
    ],
  },
  {
    key: 'ibkr',
    badge: 'Du clic au courtier',
    title: 'Exportez la stratégie vers IBKR — prête à trader',
    tagline: 'Un seul clic et toute la construction part dans un fichier importable dans le Risk Navigator de TWS : options indice, straddles composants et couverture delta en actions. Plus rien à ressaisir — vous suivez la position en What-If, puis vous exécutez chez votre courtier quand vous le décidez.',
    points: [
      'CSV importable en 1 clic — toutes les jambes reproduites fidèlement',
      'Jambes de couverture delta en actions incluses',
      'What-If : suivez virtuellement, puis transmettez l\'ordre — rien n\'est exécuté sans vous',
    ],
  },
];

/* Mock visuel : classement d'opportunités (aperçu de l'auto-chercheur). */
function ProDemoOpportunities() {
  const TR = window.t || ((s) => s);
  const rows = [
    { n: 1, score: 84, tickers: ['NVDA', 'AMD', 'AVGO', 'MU', 'QCOM'], prime: '11.2' },
    { n: 2, score: 78, tickers: ['AAPL', 'MSFT', 'GOOGL', 'META'], prime: '9.4' },
    { n: 3, score: 71, tickers: ['XOM', 'CVX', 'COP', 'SLB'], prime: '7.1' },
  ];
  const chip = t => <span key={t} style={{ font: '600 10px/1 var(--font-mono)', padding: '3px 7px', borderRadius: 999, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-soft)' }}>{t}</span>;
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>{TR('Meilleures opportunités')} · NDX</span>
        <span style={{ font: '600 10px/1 var(--font-mono)', padding: '3px 8px', borderRadius: 999, background: 'var(--accent-soft)', color: 'var(--accent-hover)', border: '1px solid var(--accent-border)' }}>auto</span>
      </div>
      {rows.map((r, i) => (
        <div key={r.n} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < rows.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: i === 0 ? 'var(--accent)' : 'var(--accent-soft)', border: '1px solid var(--accent-border)', font: '700 14px/1 var(--font-mono)', color: i === 0 ? '#fff' : 'var(--accent-hover)' }}>{r.score}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: '600 12px/1.2 var(--font-sans)', color: 'var(--text)', marginBottom: 5 }}>#{r.n} · {r.tickers.length} {TR('actions')}</div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>{r.tickers.map(chip)}</div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ font: 'var(--type-data)', color: 'var(--pos-bright)' }}>+{r.prime}</div>
            <div style={{ font: 'var(--type-caption)', color: 'var(--text-dim)' }}>{TR('prime ρ')}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* Mock visuel : suivi de positions + courbe P&L. */
function ProDemoSuivi() {
  const TR = window.t || ((s) => s);
  const cards = [
    { name: 'Tech US · 14/07', idx: 'NDX', pnl: 1840, dte: 22, up: true },
    { name: 'Semis · 02/07', idx: 'NDX', pnl: 3110, dte: 31, up: true },
  ];
  const pts = [0, 6, 3, 9, 7, 14, 11, 18];
  const W = 480, H = 84, max = Math.max(...pts), min = Math.min(...pts, 0);
  const x = i => (i / (pts.length - 1)) * W, y = v => H - ((v - min) / ((max - min) || 1)) * H;
  const d = pts.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(0)},${y(v).toFixed(0)}`).join(' ');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {cards.map((c, i) => (
        <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: '3px solid var(--pos)', borderRadius: 'var(--radius-lg)', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ font: '600 12px/1 var(--font-sans)', color: 'var(--text)' }}>{c.name}</div>
            <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', marginTop: 3 }}>{c.idx} · {c.dte} DTE</div>
          </div>
          <div style={{ font: 'var(--type-data)', color: 'var(--pos-bright)' }}>+{c.pnl.toLocaleString('fr-FR')} $</div>
        </div>
      ))}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '12px 14px' }}>
        <div style={{ font: 'var(--type-caption)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 8 }}>{TR('Évolution du P&L')}</div>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none">
          <path d={`${d} L${W},${H} L0,${H} Z`} fill="var(--pos-soft)" opacity="0.5" />
          <path d={d} fill="none" stroke="var(--pos-bright)" strokeWidth="2" />
        </svg>
      </div>
    </div>
  );
}

/* Mock visuel : contexte de marché (baromètre ρ + alertes + résultats). */
function ProDemoMarket() {
  const rows = [['Alerte NDX', 'corrélation > 80ᵉ pct', 'var(--pos)'], ['NVDA', 'résultats dans 3 j', 'var(--warn)'], ['AAPL', 'résultats dans 8 j', 'var(--info)']];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Baromètre de corrélation · NDX</span>
          <span style={{ font: '700 12px/1 var(--font-mono)', color: 'var(--pos-bright)' }}>82ᵉ pct</span>
        </div>
        <div style={{ height: 10, borderRadius: 999, background: 'linear-gradient(90deg, var(--neg), var(--warn), var(--pos))', position: 'relative' }}>
          <div style={{ position: 'absolute', left: '82%', top: -4, width: 4, height: 18, background: 'var(--text)', borderRadius: 2 }} />
        </div>
        <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', marginTop: 10 }}>Corrélation implicite élevée — une dispersion est potentiellement attractive.</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 12 }}>
        {rows.map(([t, s, c], i) => (
          <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, flexShrink: 0 }} />
            <div><div style={{ font: '600 12px/1 var(--font-sans)', color: 'var(--text)' }}>{t}</div><div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', marginTop: 3 }}>{s}</div></div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Mock visuel : journal de trades / track record. */
function ProDemoJournal() {
  const stats = [['Trades', '12'], ['Taux de réussite', '67 %'], ['P&L cumulé', '+4 230 $']];
  const trades = [['Dispersion NDX tech', 'NDX', '+1 840', true], ['Value SPX', 'SPX', '−520', false], ['Semis', 'NDX', '+3 110', true]];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {stats.map(([l, v], i) => (
          <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 14px' }}>
            <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)' }}>{l}</div>
            <div style={{ font: 'var(--type-data)', color: i === 2 ? 'var(--pos-bright)' : 'var(--text)', marginTop: 3 }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        {trades.map(([label, idx, pnl, win], i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < trades.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ font: '600 12px/1 var(--font-sans)', color: 'var(--text)' }}>{label}</div><div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', marginTop: 3 }}>{idx} · dispersion</div></div>
            <span style={{ font: '600 10px/1 var(--font-mono)', padding: '3px 8px', borderRadius: 999, background: win ? 'var(--pos-soft)' : 'var(--neg-soft)', color: win ? 'var(--pos-bright)' : 'var(--neg-bright)', border: `1px solid ${win ? 'var(--pos)' : 'var(--neg)'}` }}>{win ? 'Gagnant' : 'Perdant'}</span>
            <span style={{ font: 'var(--type-data)', color: win ? 'var(--pos-bright)' : 'var(--neg-bright)', minWidth: 66, textAlign: 'right' }}>{pnl} $</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Mock visuel : export IBKR (aperçu du CSV → import What-If). */
function ProDemoIbkr() {
  const TR = window.t || ((s) => s);
  const lines = [
    ['SELL', '2', 'SPY', 'call + put', 'neg'],
    ['BUY', '3', 'AAPL', 'call + put', 'pos'],
    ['BUY', '2', 'MSFT', 'call + put', 'pos'],
    ['SELL', '140', 'AAPL', 'actions (hedge)', 'neg'],
  ];
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ font: '600 11px/1 var(--font-mono)', color: 'var(--text-soft)' }}>dx-ibkr-whatif.csv</span>
        <span style={{ font: '600 10px/1 var(--font-mono)', padding: '3px 8px', borderRadius: 999, background: 'var(--accent-soft)', color: 'var(--accent-hover)', border: '1px solid var(--accent-border)' }}>What-If</span>
      </div>
      <div style={{ padding: '4px 0' }}>
        {lines.map((r, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '7px 16px', font: '11px/1 var(--font-mono)' }}>
            <span style={{ width: 34, color: r[4] === 'neg' ? 'var(--neg-bright)' : 'var(--pos-bright)', fontWeight: 700 }}>{r[0]}</span>
            <span style={{ width: 30, color: 'var(--text-muted)', textAlign: 'right' }}>{r[1]}</span>
            <span style={{ width: 46, color: 'var(--text)' }}>{r[2]}</span>
            <span style={{ flex: 1, color: 'var(--text-dim)', textAlign: 'right' }}>{TR(r[3])}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 16px', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', flexWrap: 'wrap' }}>
        <span style={{ font: '600 10px/1 var(--font-mono)', color: 'var(--text-muted)' }}>Portfolio → Import</span>
        <span style={{ color: 'var(--accent-hover)' }}>→</span>
        <span style={{ font: '600 11px/1 var(--font-sans)', color: 'var(--text)' }}>{TR('Risk Navigator · TWS')}</span>
      </div>
    </div>
  );
}

/* Bloc avantages Pro — phares (Opportunités, Suivi, Export IBKR) mis en avant avec démo. */
function ProBenefits({ onNav, addToast, showCta = true }) {
  const demos = { opportunities: ProDemoOpportunities, positions: ProDemoSuivi, ibkr: ProDemoIbkr };
  const { signedIn, busy, goPro } = useProCheckout(onNav, addToast, 'benefits');
  const TR = window.t || ((s) => s);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {DX_PRO_FLAGSHIPS.map((f, i) => {
        const Demo = demos[f.key];
        const reverse = i % 2 === 1;
        return (
          <div key={f.key} style={{ display: 'flex', gap: 26, alignItems: 'center', flexWrap: 'wrap', flexDirection: reverse ? 'row-reverse' : 'row', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '22px 24px' }}>
            <div style={{ flex: '1 1 300px', minWidth: 260 }}>
              <span style={{ display: 'inline-block', font: '600 10px/1 var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '4px 9px', borderRadius: 999, background: 'var(--accent-soft)', color: 'var(--accent-hover)', border: '1px solid var(--accent-border)', marginBottom: 10 }}>{TR(f.badge)}</span>
              <h3 style={{ font: 'var(--type-h3)', color: 'var(--text)', margin: '0 0 8px', letterSpacing: 'var(--track-snug)' }}>{TR(f.title)}</h3>
              <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)', margin: '0 0 12px', lineHeight: 1.6 }}>{TR(f.tagline)}</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
                {f.points.map((p, j) => (
                  <li key={j} style={{ display: 'flex', gap: 8, font: 'var(--type-body-sm)', color: 'var(--text-soft)' }}><span style={{ color: 'var(--pos-bright)', flexShrink: 0 }}>✓</span>{TR(p)}</li>
                ))}
              </ul>
            </div>
            <div style={{ flex: '1 1 300px', minWidth: 260 }}><Demo /></div>
          </div>
        );
      })}
      {showCta && (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={goPro} disabled={busy}
            style={{ font: '600 14px/1 var(--font-sans)', padding: '13px 28px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--accent)', color: '#fff', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1 }}>
            {busy ? TR('Redirection…') : (signedIn ? `${TR('Passer Pro')} — ${DX_PRO.price} ${DX_PRO.currency}/${TR(DX_PRO.period)}` : TR('Se connecter pour passer Pro'))}
          </button>
          {onNav && <button onClick={() => onNav('pricing')} style={{ font: '600 13px/1 var(--font-sans)', background: 'none', border: 'none', color: 'var(--accent-hover)', cursor: 'pointer' }}>{TR('Voir les tarifs →')}</button>}
        </div>
      )}
    </div>
  );
}

/* ─── Page Tarifs ───────────────────────────────────────────────── */
function ProPricing({ onNav, addToast }) {
  const DS = window.DispersionXDesignSystem_cb86be || {};
  const Badge = DS.Badge || (({ children }) => <span>{children}</span>);
  const [cycle, setCycle] = React.useState('monthly');   // 'monthly' | 'annual' (annuel = bientôt)
  const { signedIn, busy, goPro } = useProCheckout(onNav, addToast, 'pricing_plan');
  React.useEffect(() => { window.DXTrack && window.DXTrack('pricing_view'); }, []);
  const pro = !!(window.DXCloud && window.DXCloud.pro);
  const annualSoon = !window.DX_PRO_ANNUAL;   // annuel activé via VITE_PRO_ANNUAL=1

  const faqs = [
    ['Concrètement, qu\'est-ce que l\'auto-chercheur m\'apporte ?', 'Il fait le travail d\'analyse à votre place : au lieu de tester des dizaines de paniers à la main, il explore des milliers de combinaisons et vous classe les meilleures dispersions d\'un indice en quelques secondes — sizing et stress-tests déjà calculés. Des heures gagnées à chaque idée.'],
    ['Pourquoi payer alors que l\'analyse est gratuite ?', 'Le gratuit vous donne les outils pour étudier une stratégie que vous choisissez. Pro vous donne la vitesse et le pilotage : il trouve les meilleures stratégies pour vous (auto-chercheur) et les suit en temps réel (positions). C\'est la différence entre chercher à la main et avoir un assistant.'],
    ['Puis-je passer mes trades directement chez mon courtier ?', 'Oui. En un clic, Pro exporte toute votre stratégie — options indice, straddles composants et couverture delta en actions — dans un fichier .csv importable dans le Risk Navigator de TWS (IBKR). Il s\'ouvre en portefeuille « What-If » : vous suivez la position virtuellement (grecs, P&L), puis vous transmettez l\'ordre quand vous le décidez. Rien n\'est jamais exécuté automatiquement.'],
    ['Puis-je annuler quand je veux ?', 'Oui, en 1 clic depuis « Gérer l\'abonnement » (portail Stripe). Aucun engagement de durée.'],
    ['Comment fonctionne la garantie ?', `Vous êtes remboursé sur simple demande dans les ${DX_PRO.guaranteeDays} jours suivant le paiement.`],
    ['Mes données sont-elles en sécurité ?', 'Oui : accès cloisonné par compte (RLS), chiffrement en transit, aucune donnée revendue. Voir la politique de confidentialité.'],
    ['Est-ce un conseil en investissement ?', 'Non. DispersionX est un outil pédagogique sur données différées — pas un conseil en investissement.'],
  ];

  const planCard = (title, price, per, cta, opts = {}) => (
    <div style={{ flex: 1, minWidth: 240, background: 'var(--bg-card)', border: `1px solid ${opts.highlight ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 'var(--radius-lg)', padding: '22px 22px 24px', display: 'flex', flexDirection: 'column', gap: 12, position: 'relative', boxShadow: opts.highlight ? 'var(--shadow-lg)' : 'none' }}>
      {opts.tag && <span style={{ position: 'absolute', top: -11, left: 22, font: '600 10px/1 var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '4px 10px', borderRadius: 'var(--radius-pill)', background: 'var(--accent)', color: '#fff' }}>{opts.tag}</span>}
      <div style={{ font: 'var(--type-title)', color: 'var(--text)' }}>{title}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
        <span style={{ font: '800 34px/1 var(--font-sans)', color: 'var(--text)' }}>{price}</span>
        {per && <span style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}>/ {per}</span>}
      </div>
      {opts.sub && <div style={{ font: 'var(--type-caption)', color: 'var(--text-dim)', minHeight: 16 }}>{opts.sub}</div>}
      {cta}
      <ul style={{ listStyle: 'none', padding: 0, margin: '4px 0 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {opts.features.map((f, i) => (
          <li key={i} style={{ display: 'flex', gap: 8, font: 'var(--type-body-sm)', color: 'var(--text-soft)' }}>
            <span style={{ color: opts.dim ? 'var(--text-dim)' : 'var(--pos-bright)', flexShrink: 0 }}>{opts.dim ? '·' : '✓'}</span>{f}
          </li>
        ))}
      </ul>
    </div>
  );

  const proPrice = cycle === 'annual' ? DX_PRO.annual.price + ' ' + DX_PRO.currency : DX_PRO.price + ' ' + DX_PRO.currency;
  const proPer = cycle === 'annual' ? DX_PRO.annual.period : DX_PRO.period;

  const proCta = pro ? (
    <button onClick={() => onNav('preferences')} style={{ font: '600 13px/1 var(--font-sans)', padding: '11px 18px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>Gérer l'abonnement</button>
  ) : (cycle === 'annual' && annualSoon) ? (
    <button disabled style={{ font: '600 13px/1 var(--font-sans)', padding: '11px 18px', borderRadius: 'var(--radius)', border: '1px dashed var(--border-strong)', background: 'transparent', color: 'var(--text-muted)', cursor: 'not-allowed' }}>Offre annuelle bientôt disponible</button>
  ) : (
    <button onClick={() => goPro(cycle)} disabled={busy} style={{ font: '600 13px/1 var(--font-sans)', padding: '11px 18px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--accent)', color: '#fff', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1 }}>
      {busy ? 'Redirection…' : (signedIn ? 'Passer Pro →' : 'Se connecter pour passer Pro')}
    </button>
  );

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ font: 'var(--type-h1)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: '0 0 8px' }}>Passez à <span style={{ color: 'var(--accent-hover)' }}>DispersionX Pro</span></h1>
        <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)', margin: '0 auto', maxWidth: 560 }}>
          Tous les outils d'analyse restent gratuits. Pro ajoute la <strong style={{ color: 'var(--text-soft)' }}>recherche automatique d'opportunités</strong>, le <strong style={{ color: 'var(--text-soft)' }}>suivi en temps réel</strong> et l'<strong style={{ color: 'var(--text-soft)' }}>export direct vers votre courtier</strong> (IBKR).
        </p>
      </div>

      {/* Avantages phares mis en avant (auto-chercheur + suivi) */}
      <ProBenefits onNav={onNav} addToast={addToast} showCta={false} />

      {/* Toggle Mensuel / Annuel (annuel = bientôt) */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{ display: 'flex', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-pill)', padding: 3 }}>
          {[['monthly', 'Mensuel'], ['annual', 'Annuel']].map(([key, label]) => (
            <button key={key} onClick={() => setCycle(key)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, font: '600 12px/1 var(--font-sans)', padding: '7px 16px',
              borderRadius: 'var(--radius-pill)', border: 'none', cursor: 'pointer',
              background: cycle === key ? 'var(--accent)' : 'transparent', color: cycle === key ? '#fff' : 'var(--text-muted)',
            }}>
              {label}{key === 'annual' && <span style={{ font: '600 9px/1 var(--font-mono)', padding: '2px 5px', borderRadius: 6, background: cycle === key ? 'rgba(255,255,255,0.2)' : 'var(--accent-soft)', color: cycle === key ? '#fff' : 'var(--accent-hover)' }}>{annualSoon ? DX_PRO.annual.note : '2 mois offerts'}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Cartes de plan */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'stretch' }}>
        {planCard('Gratuit', '0 ' + DX_PRO.currency, null,
          <button onClick={() => onNav('home')} style={{ font: '600 13px/1 var(--font-sans)', padding: '11px 18px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>Continuer en gratuit</button>,
          { dim: true, sub: 'Pour toujours', features: ['Analyse dispersion & corrélation', 'Risk Lab & Builder', 'Mes listes illimitées'] })}
        {planCard('Pro', proPrice, proPer, proCta,
          { highlight: true, tag: 'Recommandé', sub: `Garantie ${DX_PRO.guaranteeDays} j remboursé · sans engagement`, features: DX_PRO.perks })}
      </div>

      {/* Tableau comparatif */}
      <div>
        <h2 style={{ font: 'var(--type-h3)', color: 'var(--text)', margin: '8px 0 12px', textAlign: 'center' }}>Comparatif détaillé</h2>
        <ProComparison />
      </div>

      {/* Réassurance */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', font: 'var(--type-caption)', color: 'var(--text-muted)', padding: '4px 0' }}>
        <span>🔒 Paiement sécurisé Stripe</span>
        <span>↩︎ {DX_PRO.guaranteeDays} jours satisfait ou remboursé</span>
        <span>✕ Résiliable en 1 clic</span>
        <span onClick={() => onNav('privacy')} style={{ cursor: 'pointer', borderBottom: '1px dotted var(--border-strong)' }}>Vos données protégées</span>
        <span onClick={() => onNav('sales')} style={{ cursor: 'pointer', borderBottom: '1px dotted var(--border-strong)' }}>CGV</span>
      </div>
      <div style={{ textAlign: 'center', font: '11px/1.5 var(--font-sans)', color: 'var(--text-dim)', maxWidth: 620, margin: '0 auto' }}>
        En souscrivant, vous acceptez les <span onClick={() => onNav('sales')} style={{ color: 'var(--text-muted)', cursor: 'pointer', borderBottom: '1px dotted var(--border-strong)' }}>Conditions Générales de Vente</span>. Abonnement mensuel à accès immédiat, reconduit tacitement et résiliable à tout moment.
      </div>

      {/* FAQ */}
      <div>
        <h2 style={{ font: 'var(--type-h3)', color: 'var(--text)', margin: '8px 0 12px', textAlign: 'center' }}>Questions fréquentes</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {faqs.map(([q, a], i) => (
            <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '14px 18px' }}>
              <div style={{ font: 'var(--type-title)', color: 'var(--text)', marginBottom: 4 }}>{q}</div>
              <div style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', lineHeight: 1.6 }}>{a}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { DX_PRO, ProUpsellCard, ProLockedPreview, ProComparison, ProPricing, ProBenefits, ProDemoOpportunities, ProDemoSuivi, ProDemoMarket, ProDemoJournal, ProDemoIbkr });
