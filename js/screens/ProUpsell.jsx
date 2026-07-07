/* ─── Module Pro : offre, prix, upsell contextuel, soft-paywall, page Tarifs ──
   Source UNIQUE de la communication Pro (évite de dupliquer le prix/les messages
   sur chaque écran verrouillé). Non-cassant : réutilise window.DXCloud pour le
   checkout Stripe et window.DispersionXDesignSystem_cb86be pour les Badges. */

// Offre commerciale — un seul endroit à éditer.
const DX_PRO = {
  price: '2,99',
  currency: '€',
  period: 'mois',
  annual: { available: false, price: '29,99', period: 'an', note: 'Bientôt' }, // offre annuelle à venir
  guaranteeDays: 14,
  // Ce que Pro débloque (repris dans la carte et le tableau comparatif).
  perks: [
    'Auto-chercheur d\'opportunités',
    'Marché Pro : baromètre ρ, alertes, calendrier des résultats',
    'Suivi de positions en temps réel (P&L, grecs, snapshots)',
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
function useProCheckout(onNav, addToast) {
  const C = window.DXCloud;
  const signedIn = !!(C && C.user);
  const [busy, setBusy] = React.useState(false);
  const goPro = React.useCallback(async () => {
    if (!signedIn) { onNav && onNav('login'); return; }
    setBusy(true);
    try { await C.startProCheckout(); }
    catch (e) { addToast && addToast('Paiement indisponible : ' + (e && e.message ? e.message : ''), 'error'); setBusy(false); }
  }, [signedIn, onNav, addToast]);
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
  const { signedIn, busy, goPro } = useProCheckout(onNav, addToast);

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
    </div>
  );
}

/* Soft-paywall : rend un aperçu (children) flouté + non-interactif, avec la carte
   d'upsell posée par-dessus. « Voir mais ne pas toucher » → crée le désir. */
function ProLockedPreview({ context = 'default', onNav, addToast, children, minHeight = 460 }) {
  return (
    <div style={{ position: 'relative', minHeight, overflow: 'hidden', borderRadius: 'var(--radius-lg)' }}>
      {/* Aperçu flouté, inerte */}
      <div aria-hidden style={{ filter: 'blur(5px)', opacity: 0.55, pointerEvents: 'none', userSelect: 'none' }}>
        {children}
      </div>
      {/* Voile + carte */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent, var(--bg-base) 82%)' }} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: 40 }}>
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

/* ─── Page Tarifs ───────────────────────────────────────────────── */
function ProPricing({ onNav, addToast }) {
  const DS = window.DispersionXDesignSystem_cb86be || {};
  const Badge = DS.Badge || (({ children }) => <span>{children}</span>);
  const [cycle, setCycle] = React.useState('monthly');   // 'monthly' | 'annual' (annuel = bientôt)
  const { signedIn, busy, goPro } = useProCheckout(onNav, addToast);
  const pro = !!(window.DXCloud && window.DXCloud.pro);
  const annualSoon = !DX_PRO.annual.available;

  const faqs = [
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
    <button onClick={goPro} disabled={busy} style={{ font: '600 13px/1 var(--font-sans)', padding: '11px 18px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--accent)', color: '#fff', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1 }}>
      {busy ? 'Redirection…' : (signedIn ? 'Passer Pro →' : 'Se connecter pour passer Pro')}
    </button>
  );

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ font: 'var(--type-h1)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: '0 0 8px' }}>Passez à <span style={{ color: 'var(--accent-hover)' }}>DispersionX Pro</span></h1>
        <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)', margin: '0 auto', maxWidth: 560 }}>
          Tous les outils d'analyse restent gratuits. Pro ajoute la <strong style={{ color: 'var(--text-soft)' }}>recherche automatique d'opportunités</strong>, le <strong style={{ color: 'var(--text-soft)' }}>contexte de marché</strong> et le <strong style={{ color: 'var(--text-soft)' }}>suivi en temps réel</strong>.
        </p>
      </div>

      {/* Toggle Mensuel / Annuel (annuel = bientôt) */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{ display: 'flex', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-pill)', padding: 3 }}>
          {[['monthly', 'Mensuel'], ['annual', 'Annuel']].map(([key, label]) => (
            <button key={key} onClick={() => setCycle(key)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, font: '600 12px/1 var(--font-sans)', padding: '7px 16px',
              borderRadius: 'var(--radius-pill)', border: 'none', cursor: 'pointer',
              background: cycle === key ? 'var(--accent)' : 'transparent', color: cycle === key ? '#fff' : 'var(--text-muted)',
            }}>
              {label}{key === 'annual' && <span style={{ font: '600 9px/1 var(--font-mono)', padding: '2px 5px', borderRadius: 6, background: cycle === key ? 'rgba(255,255,255,0.2)' : 'var(--accent-soft)', color: cycle === key ? '#fff' : 'var(--accent-hover)' }}>{DX_PRO.annual.note}</span>}
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

Object.assign(window, { DX_PRO, ProUpsellCard, ProLockedPreview, ProComparison, ProPricing });
