/* ─── IbkrExportDialog : export d'une stratégie vers IBKR (Risk Navigator) ────
   Fonctionnalité Pro. Génère un CSV (window.DXIbkr) reproduisant TOUTE la
   stratégie construite — short straddle indice + long straddles composants +
   jambes de couverture en actions (delta hedge) — importable en « What-If »
   dans le Risk Navigator de TWS. La modale explique pas à pas à un débutant
   comment l'importer, et rappelle que RIEN n'est exécuté : c'est virtuel tant
   qu'aucun ordre n'est transmis. Contrôlée : l'écran rend <IbkrExportDialog
   strategy=… onClose=… /> quand il veut l'ouvrir. */
function IbkrExportDialog({ strategy, onClose }) {
  const s = strategy;
  const [resolved, setResolved] = React.useState(null);
  const [resolving, setResolving] = React.useState(true);
  const [done, setDone] = React.useState(false);

  // Signature stable de la stratégie → évite de re-vérifier à chaque rendu
  // (buildStrategy() renvoie un nouvel objet à chaque fois).
  const sig = s ? [s.index, s.indexEtf, s.expiry, s.duration, s.deltaHedge, (s.components || []).map(c => c.ticker + ':' + c.nContracts).join(',')].join('|') : '';

  // VÉRIFICATION À L'OUVERTURE : résout l'échéance COMMUNE + les strikes réels
  // sur la vraie chaîne d'options AVANT tout téléchargement. Best-effort : en
  // cas d'échec réseau, l'heuristique prend le relais (le fichier reste produit).
  // NB : la résolution NE déclenche AUCUN effet de bord sur le parent (pas
  // d'alignement ici) → aucun risque de boucle de rendu quand l'écran parent
  // se rafraîchit. L'alignement se fait sur le clic « Télécharger » (délibéré).
  React.useEffect(() => {
    if (!s || !window.DXIbkr) return;
    let cancelled = false;
    setResolving(true); setResolved(null);
    window.DXIbkr.resolveContracts(s).then(r => {
      if (cancelled) return;
      setResolved(r); setResolving(false);
    }).catch(() => { if (!cancelled) setResolving(false); });
    return () => { cancelled = true; };
  }, [sig]);   // eslint-disable-line react-hooks/exhaustive-deps

  const stats = React.useMemo(() => (s && window.DXIbkr ? window.DXIbkr.summary(s, resolved) : null), [sig, resolved]);   // eslint-disable-line react-hooks/exhaustive-deps
  if (!s || !window.DXIbkr) return null;

  const hedgeLabel = s.deltaHedge === 'index' ? 'globale (actions ETF indice)'
    : s.deltaHedge === 'legs' ? 'jambe par jambe (actions des composants + ETF indice)'
    : 'aucune';
  // Échéance réellement ÉCRITE = l'échéance commune résolue (sinon celle de la stratégie).
  const usedExp8 = (resolved && resolved.targetExp8) || window.DXIbkr.exportExp8(s);
  const expIso = `${usedExp8.slice(0, 4)}-${usedExp8.slice(4, 6)}-${usedExp8.slice(6, 8)}`;
  const expTxt = window.DXExpiry ? window.DXExpiry.fmtExpiry(expIso) : expIso;

  // Le fichier est produit à partir des contrats DÉJÀ vérifiés à l'ouverture.
  // L'échéance est déjà alignée à la construction (cotée par tous) → rien à
  // recalculer ici : on télécharge simplement.
  function doDownload() {
    if (resolving) return;
    window.DXIbkr.download(s, resolved);
    setDone(true);
  }
  const sum = stats;

  const Card = ({ children, style }) => (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 14px', ...style }}>{children}</div>
  );

  const steps = [
    ['Ouvre TWS', 'Lance Trader Workstation (le logiciel de bureau IBKR) et connecte-toi à ton compte.'],
    ['Ouvre le Risk Navigator', 'Menu du haut → Analytical Tools (ou New Window) → Risk Navigator.'],
    ['Importe le fichier', 'Dans le Risk Navigator : menu Portfolio → Import → sélectionne le fichier .csv que tu viens de télécharger → Open.'],
    ['Les positions arrivent en What-If', 'IBKR ouvre un portefeuille hypothétique (« What-If ») avec toutes tes jambes. RIEN n\'est exécuté : c\'est une simulation.'],
    ['Enregistre le What-If', 'Menu Portfolio → Save (ou Save As) pour le conserver et suivre ses grecs / son P&L virtuel dans le temps.'],
    ['(Optionnel) Passer réellement les ordres', 'Coche la case « Trade » sur les positions à ouvrir, puis clique sur le bouton « Trade » en haut du What-If : IBKR crée les ordres dans TWS. Ils restent en attente — tant que tu ne cliques pas sur Transmit, rien n\'est envoyé au marché.'],
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget && onClose) onClose(); }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-lg)', padding: 26, width: '100%', maxWidth: 560, maxHeight: '88vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16, boxShadow: 'var(--shadow-lg)' }}>

        {/* En-tête */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <div style={{ font: 'var(--type-h3)', color: 'var(--text)', marginBottom: 4 }}>Exporter vers IBKR · What-If</div>
            <div style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Un fichier <strong>.csv</strong> reproduisant toute la stratégie, à importer dans le <strong>Risk Navigator</strong> de TWS. Il s'ouvre en <strong>portefeuille hypothétique</strong> — aucun ordre n'est exécuté.
            </div>
          </div>
          <button onClick={onClose} aria-label="Fermer" style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', font: '700 15px/1 var(--font-mono)' }}>✕</button>
        </div>

        {/* Contenu du fichier */}
        <Card>
          <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 8 }}>Ce que contient le fichier</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, font: 'var(--type-body-sm)', color: 'var(--text-soft)' }}>
            <div>• <strong>Jambe indice</strong> : short straddle {s.indexEtf || s.index} ({s.nIndex || 1} lot{(s.nIndex || 1) > 1 ? 's' : ''}, call + put)</div>
            <div>• <strong>{(s.components || []).length} composants</strong> : long straddle chacun (call + put)</div>
            <div>• <strong>Couverture du delta</strong> : {hedgeLabel}</div>
            <div>• <strong>Échéance</strong> : {expTxt}</div>
            {sum && (
              <div style={{ marginTop: 4, paddingTop: 8, borderTop: '1px solid var(--border-subtle)', font: 'var(--type-caption)', color: 'var(--text-dim)' }}>
                {sum.optionLegs} ligne{sum.optionLegs > 1 ? 's' : ''} d'options ({sum.contracts} contrats){sum.stockLegs > 0 ? ` + ${sum.stockLegs} ligne${sum.stockLegs > 1 ? 's' : ''} d'actions (couverture)` : ''} · {sum.rows} lignes au total.
              </div>
            )}
          </div>
        </Card>

        {/* Bouton de téléchargement — actif seulement après la vérification */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button onClick={doDownload} disabled={resolving} style={{ font: '600 13px/1 var(--font-sans)', padding: '12px 22px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--accent)', color: '#fff', cursor: resolving ? 'default' : 'pointer', opacity: resolving ? 0.7 : 1 }}>
            {resolving ? 'Vérification des échéances…' : '↓ Télécharger le CSV (What-If)'}
          </button>
          {done && (
            <span style={{ font: 'var(--type-body-sm)', color: 'var(--pos-bright)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ font: '700 13px/1 var(--font-mono)' }}>✓</span> Fichier téléchargé — suis les étapes ci-dessous.
            </span>
          )}
        </div>

        {/* Vérification des contrats sur la vraie chaîne d'options — dès l'ouverture */}
        {stats && stats.optionSymbols > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {resolving ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, font: 'var(--type-caption)', lineHeight: 1.5, color: 'var(--text-soft)', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '9px 12px' }}>
                <span className="dx-pulse" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--warn)', flexShrink: 0 }} />
                Validation des strikes sur la chaîne d'options réelle (Cboe)… <span style={{ color: 'var(--text-dim)' }}>(l'échéance est déjà cotée par tous les sous-jacents, fixée à la construction)</span>
              </div>
            ) : (
              <div style={{ font: 'var(--type-caption)', lineHeight: 1.5, color: 'var(--text-muted)', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '9px 12px' }}>
                {stats.validated === stats.optionSymbols ? (
                  <><strong style={{ color: 'var(--pos-bright)' }}>✓ {stats.validated}/{stats.optionSymbols} sous-jacents validés</strong> sur la chaîne d'options réelle (Cboe) — strikes et échéance réellement listés.</>
                ) : (
                  <><strong style={{ color: 'var(--text-soft)' }}>{stats.validated}/{stats.optionSymbols} sous-jacents validés</strong> sur la chaîne d'options réelle. Les {stats.approximated} restant{stats.approximated > 1 ? 's' : ''} (composants sans options US ou chaîne indisponible) utilisent le strike standard le plus proche — si TWS en rejette un, choisis le strike listé voisin.</>
                )}
              </div>
            )}
            {!resolving && stats.expiryAdjusted && stats.usedExp8 && stats.selectedExp8 && (() => {
              const fmt = e => { const iso = `${e.slice(0, 4)}-${e.slice(4, 6)}-${e.slice(6, 8)}`; return window.DXExpiry ? window.DXExpiry.fmtExpiry(iso) : iso; };
              return (
                <div style={{ font: 'var(--type-caption)', lineHeight: 1.5, color: 'var(--text-soft)', background: 'var(--warn-soft, rgba(234,179,8,0.1))', border: '1px solid var(--warn-border, rgba(234,179,8,0.35))', borderRadius: 'var(--radius)', padding: '9px 12px' }}>
                  <strong style={{ color: 'var(--warn)' }}>Échéance alignée sur {fmt(stats.usedExp8)}.</strong> La date sélectionnée ({fmt(stats.selectedExp8)}) n'est pas cotée par toutes les actions — <strong>toutes les jambes</strong> utilisent donc une seule échéance cotée par l'ensemble des sous-jacents, et cette date s'applique partout dans le site (suivi, monitor).
                </div>
              );
            })()}
          </div>
        )}

        {/* Fiche pas à pas */}
        <div>
          <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 10 }}>Comment l'importer dans TWS (pas à pas)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {steps.map(([title, body], i) => (
              <div key={i} style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                <div style={{ flexShrink: 0, width: 22, height: 22, borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent-hover)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '700 11px/1 var(--font-mono)' }}>{i + 1}</div>
                <div>
                  <div style={{ font: '600 13px/1.3 var(--font-sans)', color: 'var(--text)' }}>{title}</div>
                  <div style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', lineHeight: 1.5, marginTop: 2 }}>{body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Rassurance */}
        <div style={{ background: 'var(--pos-soft, rgba(34,197,94,0.08))', border: '1px solid var(--pos-border, rgba(34,197,94,0.3))', borderRadius: 'var(--radius)', padding: '11px 13px', font: 'var(--type-body-sm)', color: 'var(--text-soft)', lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--pos-bright)' }}>Aucun risque d'exécution.</strong> L'import crée seulement une simulation (What-If) : tu peux suivre la position virtuellement, voir ses grecs et son P&L, puis décider — ou non — de passer les ordres. Rien n'est envoyé au marché sans ton clic sur <em>Transmit</em>.
        </div>

        {/* Notes de précision */}
        <div style={{ font: 'var(--type-caption)', color: 'var(--text-dim)', lineHeight: 1.5 }}>
          <strong>Échéance {expTxt}</strong> et <strong>strikes ATM</strong> — exactement ceux de la stratégie construite (le site modélise chaque jambe au plus proche du prix, sur une échéance mensuelle standard). Les contrats sont validés sur la vraie chaîne d'options quand elle est disponible. Le fichier est optimisé pour les sous-jacents cotés aux États-Unis (SPX→SPY, NDX→QQQ, DJI→DIA et leurs composants){sum && sum.foreign ? ' ; pour les composants européens (CAC/DAX), la devise est renseignée mais tu devras éventuellement préciser la place de cotation dans TWS' : ''}.
        </div>
      </div>
    </div>
  );
}

window.IbkrExportDialog = IbkrExportDialog;
