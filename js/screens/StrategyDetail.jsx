/* ─── Détail d'une stratégie : récapitulatif de la construction ────────
   Page d'atterrissage d'une stratégie (depuis « Mes stratégies »). Reprend ce
   qui a été choisi dans le module Construction, mais en LECTURE et en langage
   clair : une phrase de synthèse, les chiffres clés, la structure, puis la
   composition. Le module Construction reste l'endroit où l'on AJUSTE.

   Toutes les actions de bout de chaîne sont ici : suivre la position (Pro),
   Risk Lab, ajuster, partager (Pro), exporter IBKR (Pro), supprimer. */
// Lecture SYNCHRONE (localStorage) : pas d'écran de chargement, le premier
// rendu porte déjà la stratégie. Hors composant pour servir d'initialiseur
// paresseux à useState — un effet ne s'exécute pas au premier rendu.
function readStrategy(listId, lists) {
  const all = (window.DXApi && DXApi.localStrategies) ? (DXApi.localStrategies(lists) || []) : [];
  return all.find(s => String(s.listId) === String(listId)) || null;
}

function StrategyDetail({ listId, onNav, lists, addToast, pro, mode }) {
  const { MetricCard, Badge, WarningPanel, EmptyState } = window.DispersionXDesignSystem_cb86be;
  const resolveStrategy = () => readStrategy(listId, lists);
  const _fx = window.useCurrency ? window.useCurrency() : null;   // re-render au changement de devise
  const [strat, setStrat] = React.useState(resolveStrategy);      // null = absente
  const [editing, setEditing] = React.useState(false);
  const [nameDraft, setNameDraft] = React.useState('');
  const [shareFor, setShareFor] = React.useState(null);
  const [ibkrOpen, setIbkrOpen] = React.useState(false);
  const [fillsOpen, setFillsOpen] = React.useState(false);
  const [committing, setCommitting] = React.useState(false);
  const [dialog, setDialog] = React.useState(null);
  const [dialogBusy, setDialogBusy] = React.useState(false);

  const cloudOn = !!(window.DXCloud && window.DXCloud.enabled);
  const isProUser = pro != null ? !!pro : !!(window.DXCloud && window.DXCloud.pro);

  const load = React.useCallback(() => { setStrat(readStrategy(listId, lists)); }, [listId, lists]);
  React.useEffect(() => {
    load();
    window.addEventListener('dx-strategies-changed', load);
    return () => window.removeEventListener('dx-strategies-changed', load);
  }, [load]);

  async function runDialog() {
    if (!dialog?.onConfirm) return;
    setDialogBusy(true);
    try { await dialog.onConfirm(); } finally { setDialogBusy(false); setDialog(null); }
  }

  if (!strat) return (
    <EmptyState icon="🧱" title="Stratégie introuvable"
      description="Cette stratégie n'existe plus (supprimée, ou construite sur un autre appareil sans synchronisation)."
      action={<button onClick={() => onNav('strategies')} style={{ font: '600 12px/1 var(--font-sans)', padding: '9px 20px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}>← Mes stratégies</button>} />
  );

  const s = strat;
  const m = DXApi.strategyMetrics(s);
  const p = s.portfolio || {};
  const comps = s.components || [];

  const fmtS  = n => window.DXMoney ? window.DXMoney.value(n) : ((n >= 0 ? '+' : '−') + Math.abs(Math.round(n)).toLocaleString('fr-FR'));
  const dxSym = () => window.DXMoney ? window.DXMoney.symbol() : '$';
  // Magnitude CONVERTIE (sans signe) : la table porte son propre signe (+ acheté /
  // − vendu). Sans passer par DXMoney, le corps de table resterait en dollars
  // pendant que la ligne « Net » se convertirait → un total ≠ somme des lignes.
  const fmtMag = n => window.DXMoney ? window.DXMoney.value(Math.abs(n || 0), { sign: false }) : Math.abs(Math.round(n || 0)).toLocaleString('fr-FR');
  // IV et poids sont stockés en POURCENTAGE par Construction (`indexIV = 18`,
  // `weightUsed = … * 100`, et `sigma: c.iv / 100` côté maths) → afficher tel quel.
  const pct1 = v => (v != null && isFinite(v)) ? v.toFixed(1) + '%' : '—';
  // Le gamma est stocké comme COEFFICIENT de convexité : P&L = gamma · (ΔS/S)².
  // Brut, le nombre ne veut rien dire pour l'utilisateur — on l'exprime au
  // mouvement de référence de 1 % (× 1e-4), lisible à côté du vega et du theta.
  // Absent des stratégies construites avant qu'on le stocke → « — », jamais un 0
  // qui laisserait croire à une convexité nulle.
  const gammaCell = (g, sign) => (g == null || !isFinite(g)) ? '—' : sign + fmtMag(g * 1e-4);
  const CONTRACT = (window.DXRisk && window.DXRisk.CONTRACT) || 100;
  const statusTone = { sain: 'pos', surveiller: 'warn', risque: 'neg' };
  const statusRisk = { sain: 'faible', surveiller: 'modéré', risque: 'élevé' };

  // Libellés lisibles des choix de construction.
  const SIZING_LABEL = { vega_neutral: 'Vega-neutre', gamma_flat: 'Gamma-flat', theta_flat: 'Theta-flat', premium_neutral: 'Premium-neutral', equal_weight: '1 lot par composant' };
  const SIZING_GREEK = { vega_neutral: 'vega', gamma_flat: 'gamma', theta_flat: 'theta', premium_neutral: 'prime' };
  const WEIGHT_LABEL = { capped: 'Poids indice plafonnés', index: 'Poids indice (wᵢ)', variance: 'Poids de variance (wᵢ²)', equal: 'Équipondéré' };
  const HEDGE_LABEL  = { index: "Par l'indice (future / ETF)", legs: 'Par sous-jacent (actions)', none: 'Aucune' };
  const sizingKey   = s.sizingMethod || 'vega_neutral';
  const sizingLabel = SIZING_LABEL[sizingKey] || sizingKey;
  const neutralised = SIZING_GREEK[sizingKey];
  const idxLabel    = (s.indexEtf && s.indexEtf !== s.index) ? `${s.indexEtf} (${s.index})` : (s.index || '—');
  const expiryTxt   = s.expiry && window.DXExpiry ? window.DXExpiry.fmtExpiry(s.expiry) : `${s.duration || 30} jours`;
  const builtTxt    = s.builtAt ? new Date(s.builtAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

  function saveName() {
    const nm = nameDraft.trim();
    if (!nm || nm === s.displayName) { setEditing(false); return; }
    try { DXApi.renameStrategy(s.listId, nm); setEditing(false); addToast && addToast('Stratégie renommée.'); load(); }
    catch (e) { addToast && addToast('Renommage impossible : ' + (e?.message || 'erreur') + '.', 'error'); }
  }

  // Suivi de position = module Pro. Sans accès on redirige vers l'onglet Suivi
  // (qui propose de passer Pro) SANS créer de position — même règle que Checklist.
  async function follow() {
    if (!isProUser) { addToast && addToast('Le suivi de position est réservé à l\'offre Pro.', 'info'); onNav('positions'); return; }
    setCommitting(true);
    try {
      await DXApi.commitPosition(s.listId, s.displayName || null);
      addToast && addToast('Position créée et suivie.', 'ok');
      onNav('positions');
    } catch (err) {
      addToast && addToast('Impossible de suivre cette stratégie : ' + (err?.message || 'erreur') + '.', 'error');
    } finally { setCommitting(false); }
  }

  function confirmDelete() {
    setDialog({
      title: 'Supprimer la stratégie ?',
      message: <>Voulez-vous vraiment supprimer « <strong style={{ color: 'var(--text)' }}>{s.displayName}</strong> » ? La liste source n'est pas affectée, et les positions déjà suivies restent dans le Suivi.</>,
      confirmLabel: 'Supprimer',
      onConfirm: async () => {
        DXApi.deleteLocalStrategy(s.listId);
        addToast && addToast('Stratégie supprimée.');
        onNav('strategies');
      },
    });
  }

  // ── Styles d'action partagés ──
  const btnPrimary = { font: '600 12px/1 var(--font-sans)', padding: '9px 16px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer' };
  const btnGhost   = { font: '600 12px/1 var(--font-sans)', padding: '9px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' };
  const btnAccent  = { font: '600 12px/1 var(--font-sans)', padding: '9px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--accent)', background: 'transparent', color: 'var(--accent-hover)', cursor: 'pointer' };
  const btnDanger  = { font: '600 12px/1 var(--font-sans)', padding: '9px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--neg)', background: 'transparent', color: 'var(--neg-bright)', cursor: 'pointer' };
  // Bouton verrouillé (fonction Pro) — même signalétique que le reste du site.
  const lockedBtn = (label, title) => (
    <button onClick={() => onNav('pricing')} title={title}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, font: '600 12px/1 var(--font-sans)', padding: '9px 12px', borderRadius: 'var(--radius)', border: '1px dashed var(--border-strong)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
      🔒 {label}
      <span style={{ font: '600 9px/1 var(--font-mono)', padding: '2px 5px', borderRadius: 7, background: 'var(--accent-soft)', color: 'var(--accent-hover)', border: '1px solid var(--accent-border)', textTransform: 'uppercase' }}>Pro</span>
    </button>
  );

  const Row = ({ k, v, hint, last }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, padding: '9px 0', borderBottom: last ? 'none' : '1px solid var(--border-subtle)' }}>
      <span style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', flexShrink: 0 }}>{k}</span>
      <span style={{ font: '600 var(--type-body-sm)', color: 'var(--text)', textAlign: 'right' }}>
        {v}
        {hint && <span style={{ display: 'block', font: 'var(--type-caption)', fontWeight: 400, color: 'var(--text-dim)', marginTop: 2 }}>{hint}</span>}
      </span>
    </div>
  );
  const card = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 18 };
  const cardTitle = { font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 10 };

  // Total des lots long (composants), pour la phrase de synthèse.
  const totalLots = comps.reduce((a, c) => a + (c.nContracts || 0), 0);

  // Barre d'actions — placée EN BAS de page : on lit d'abord ce qu'est la
  // stratégie (phrase → chiffres → composition → structure), on agit ensuite.
  const actionBar = (
    <div style={{ ...card, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
      {isProUser
        ? <button onClick={follow} disabled={committing} style={{ ...btnPrimary, opacity: committing ? 0.6 : 1, cursor: committing ? 'not-allowed' : 'pointer' }}>
            {committing ? '⏳ Création…' : '▶ Suivre cette position'}
          </button>
        : lockedBtn('Suivre cette position', "Le suivi de position est réservé à l'offre Pro")}
      <button onClick={() => onNav('risk', { listId: s.listId })} style={btnAccent}>Risk Lab →</button>
      <button onClick={() => onNav('construction', { listId: s.listId })} style={btnGhost}>Ajuster la construction</button>
      {isProUser
        ? <button onClick={() => setIbkrOpen(true)} title="CSV importable dans le Risk Navigator de TWS (What-If)" style={btnGhost}>⇪ Exporter IBKR</button>
        : lockedBtn('Exporter IBKR', "Export IBKR réservé à l'offre Pro")}
      {/* Symétrique de l'export : relire ses vraies exécutions. Ouvert à tous —
          mesurer ce qu'on a payé n'est pas un privilège, c'est la base. */}
      <button onClick={() => setFillsOpen(true)} title="Importer un rapport IBKR ou saisir vos prix d'exécution"
        style={s.fills ? btnAccent : btnGhost}>
        {s.fills ? '✓ Mes exécutions' : '⇩ Mes exécutions'}
      </button>
      {cloudOn && (isProUser
        ? <button onClick={() => setShareFor({ id: s.listId, name: s.displayName })} style={btnGhost}>🔗 Partager</button>
        : lockedBtn('Partager', "Partage réservé à l'offre Pro"))}
      <span style={{ flex: 1 }} />
      <button onClick={confirmDelete} style={btnDanger}>Supprimer</button>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* ── En-tête : fil d'Ariane + nom éditable + statut ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button onClick={() => onNav('strategies')} style={{ alignSelf: 'flex-start', font: 'var(--type-caption)', color: 'var(--text-muted)', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}>← Mes stratégies</button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ font: 'var(--type-caption)', color: 'var(--accent-hover)', marginBottom: 4 }}>{idxLabel}</div>
            {editing ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input value={nameDraft} onChange={e => setNameDraft(e.target.value)} autoFocus maxLength={60}
                  onKeyDown={e => { if (e.key === 'Enter') saveName(); else if (e.key === 'Escape') setEditing(false); }}
                  style={{ font: 'var(--type-h1)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', background: 'var(--bg-input)', border: '1px solid var(--accent)', borderRadius: 'var(--radius)', padding: '2px 10px', outline: 'none', maxWidth: 440 }} />
                <button onClick={saveName} title="Enregistrer" style={{ ...btnPrimary, padding: '8px 12px' }}>✓</button>
                <button onClick={() => setEditing(false)} title="Annuler" style={{ ...btnGhost, padding: '8px 12px' }}>✕</button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h1 style={{ font: 'var(--type-h1)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: 0 }}>{s.displayName}</h1>
                <button onClick={() => { setNameDraft(s.displayName); setEditing(true); }} title="Renommer la stratégie"
                  style={{ font: '14px/1 var(--font-sans)', padding: '5px 9px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>✎</button>
                <Badge tone={statusTone[m.status] || 'neutral'} dot>{m.status}</Badge>
              </div>
            )}
            <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: '6px 0 0' }}>
              Construite le {builtTxt}
              {s.listName && <> · liste source <button onClick={() => onNav('list-detail', { listId: s.listId })} style={{ font: 'inherit', color: 'var(--accent-hover)', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}>{s.listName} ↗</button></>}
              {s.group_name && <> · 🗂 {s.group_name}</>}
            </p>
          </div>
        </div>
      </div>

      {/* Filet anti-écrasement : si cette stratégie en a remplacé une autre, on
          l'annonce et on rend l'ancienne restaurable (cf. PrevStrategyBand). */}
      {window.DXPrevStrategyBand && (
        <window.DXPrevStrategyBand listId={s.listId} addToast={addToast} onRestored={load} />
      )}

      {/* ── Synthèse en une phrase : ce que vous tradez, en clair ── */}
      <div style={{ ...card, borderLeft: '3px solid var(--accent)' }}>
        <div style={cardTitle}>La stratégie en une phrase</div>
        <p style={{ font: 'var(--type-body)', color: 'var(--text-soft)', margin: 0, lineHeight: 1.6 }}>
          Vous <strong style={{ color: 'var(--neg-bright)' }}>vendez {s.nIndex || 1} straddle{(s.nIndex || 1) > 1 ? 's' : ''} sur {s.index}</strong> et
          {' '}<strong style={{ color: 'var(--pos-bright)' }}>achetez {totalLots} straddle{totalLots > 1 ? 's' : ''} répartis sur {comps.length} composant{comps.length > 1 ? 's' : ''}</strong>,
          {' '}échéance <strong style={{ color: 'var(--text)' }}>{expiryTxt}</strong> ({m.dte} jours restants).
          {' '}La structure <strong style={{ color: 'var(--accent-hover)' }}>{sizingLabel.toLowerCase()}</strong>
          {neutralised ? <> neutralise le <strong style={{ color: 'var(--text-soft)' }}>{neutralised}</strong> : vous pariez sur la <strong style={{ color: 'var(--text)' }}>dispersion</strong>, pas sur le sens du marché.</> : <> répartit les lots uniformément.</>}
          {' '}{m.netPremium >= 0
            ? <>Vous encaissez <strong style={{ color: 'var(--pos-bright)' }}>{fmtS(m.netPremium)} {dxSym()}</strong> de prime à l'ouverture.</>
            : <>Vous payez <strong style={{ color: 'var(--neg-bright)' }}>{fmtS(Math.abs(m.netPremium))} {dxSym()}</strong> de prime à l'ouverture.</>}
        </p>
      </div>

      {/* ── Chiffres clés ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <MetricCard label="Prime nette" value={fmtS(m.netPremium) + ' ' + dxSym()} accent="var(--accent)"
          hint={m.netPremium >= 0 ? "Crédit reçu à l'ouverture." : "Débit payé pour être long dispersion."} />
        {/* Le vega n'est « déséquilibré » que si la structure prétend le neutraliser.
            En theta-flat/gamma-flat/premium-neutral il est libre PAR CHOIX : le
            colorer en alerte contredirait la structure choisie (même règle que
            Construction, qui affiche « Libre (structure ≠ vega) »). */}
        <MetricCard label="Vega net" value={fmtS(m.netVega) + ' ' + dxSym() + '/1%'}
          accent={m.neutralised !== 'vega' ? 'var(--text-soft)' : (Math.abs(m.netVega) < 60 ? 'var(--pos)' : 'var(--warn)')}
          hint={m.neutralised !== 'vega'
            ? `Gain/perte pour +1 point de volatilité implicite. Libre ici : la structure ${sizingLabel.toLowerCase()} neutralise le ${neutralised}, pas le vega.`
            : 'Gain/perte pour +1 point de volatilité implicite. Proche de 0 = équilibré.'} />
        <MetricCard label="Theta /jour" value={fmtS(m.netTheta) + ' ' + dxSym()} accent="var(--warn)"
          hint="Valeur temps perdue (ou gagnée) chaque jour qui passe." />
        <MetricCard label="Delta net" value={fmtS(m.netDelta) + ' ' + dxSym() + '/1%'} accent={Math.abs(m.netDelta) < 50 ? 'var(--pos)' : 'var(--warn)'}
          hint={s.deltaHedge && s.deltaHedge !== 'none' ? 'Couvert : exposition directionnelle neutralisée.' : 'Résidu NON couvert : la position bouge avec le marché.'} />
        <MetricCard label="DTE restant" value={String(m.dte)} unit="j" accent={m.dte < 12 ? 'var(--neg)' : 'var(--info)'}
          hint="Sous ~7-12 jours, le theta s'accélère fortement." />
        <MetricCard label="Risque" value={statusRisk[m.status] || 'faible'} accent={'var(--' + (statusTone[m.status] || 'pos') + ')'}
          hint="Déduit du vega, du theta et de l'échéance restante." />
      </div>

      {m.alert && <WarningPanel tone={m.status === 'risque' ? 'neg' : 'warn'} title="À surveiller">{m.alert} — réévaluez dans le Risk Lab, ou ajustez le dimensionnement.</WarningPanel>}

      {/* ── Composition : la jambe indice puis chaque composant ── */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h2 style={{ font: 'var(--type-h2)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: 0 }}>Composition</h2>
        <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: 0 }}>
          Une ligne par jambe. <span style={{ color: 'var(--neg-bright)' }}>Rouge = vendu</span> (l'indice), <span style={{ color: 'var(--pos-bright)' }}>vert = acheté</span> (les composants).
          {' '}<strong style={{ color: 'var(--text-soft)' }}>Vega</strong> = gain pour +1 point de volatilité ·
          {' '}<strong style={{ color: 'var(--text-soft)' }}>Theta</strong> = valeur temps par jour ·
          {' '}<strong style={{ color: 'var(--text-soft)' }}>Gamma</strong> = gain pour un mouvement de ±1 % du sous-jacent.
        </p>
        {/* Piège vécu : comparer ce gamma à celui d'un courtier donne un écart
            énorme et différent pour chaque titre (le facteur vaut S²/2). Ce n'est
            pas une erreur — les deux mesurent autre chose. Le dire ici évite de
            chercher un bug qui n'existe pas. */}
        <p style={{ font: 'var(--type-caption)', color: 'var(--text-dim)', margin: 0, lineHeight: 1.6 }}>
          Notre <strong>gamma</strong> se rapporte à un mouvement <strong>relatif</strong> (±1 %), parce que c'est
          {' '}ce qui compte pour une dispersion : il rend la position neutre quand tout bouge du même pourcentage.
          {' '}Votre courtier affiche le Γ classique, rapporté à <strong>+1 $</strong> de sous-jacent. Les deux sont
          {' '}justes mais ne se comparent pas directement — le rapport entre eux vaut S²/2, donc il diffère pour
          {' '}chaque titre. L'écran « Mes exécutions » fait la conversion pour vous.
        </p>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 820, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
                {['Jambe', 'Sens', 'Lots', 'Poids', 'IV', `Vega ${dxSym()}/1%`, `Theta ${dxSym()}/j`, `Gamma ${dxSym()}/1% spot`, `Prime ${dxSym()}`].map((h, i) => (
                  <th key={h} style={{ padding: '9px 14px', textAlign: i === 0 ? 'left' : 'right', font: '600 9px/1 var(--font-mono)', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Jambe indice (vendue) */}
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--neg-soft)' }}>
                <td style={{ padding: '10px 14px', font: '600 12px/1 var(--font-mono)', color: 'var(--neg-bright)' }}>{idxLabel}</td>
                <td style={{ padding: '10px 14px', textAlign: 'right', font: 'var(--type-caption)', color: 'var(--neg-bright)' }}>Vendu</td>
                <td style={{ padding: '10px 14px', textAlign: 'right', font: '700 12px/1 var(--font-mono)', color: 'var(--neg-bright)' }}>{s.nIndex || 1}</td>
                <td style={{ padding: '10px 14px', textAlign: 'right', font: '11px/1 var(--font-mono)', color: 'var(--text-dim)' }}>—</td>
                <td style={{ padding: '10px 14px', textAlign: 'right', font: '11px/1 var(--font-mono)', color: 'var(--text-soft)' }}>{pct1(p.idxIV)}</td>
                <td style={{ padding: '10px 14px', textAlign: 'right', font: '11px/1 var(--font-mono)', color: 'var(--neg-bright)' }}>−{fmtMag(p.idxVega)}</td>
                {/* Jambe VENDUE : elle encaisse le temps (theta positif) et subit la
                    convexité (gamma négatif) — signes opposés aux composants. */}
                <td style={{ padding: '10px 14px', textAlign: 'right', font: '11px/1 var(--font-mono)', color: 'var(--pos-bright)' }}>+{fmtMag(p.idxTheta)}</td>
                <td style={{ padding: '10px 14px', textAlign: 'right', font: '11px/1 var(--font-mono)', color: 'var(--neg-bright)' }}>{gammaCell(p.idxGamma, '−')}</td>
                <td style={{ padding: '10px 14px', textAlign: 'right', font: '11px/1 var(--font-mono)', color: 'var(--pos-bright)' }}>+{fmtMag(p.idxPrem)}</td>
              </tr>
              {comps.map((c, i) => (
                <tr key={c.ticker} style={{ borderBottom: i < comps.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                  <td style={{ padding: '9px 14px', font: '600 12px/1 var(--font-mono)', color: 'var(--text)' }}>{c.ticker}</td>
                  <td style={{ padding: '9px 14px', textAlign: 'right', font: 'var(--type-caption)', color: 'var(--pos-bright)' }}>Acheté</td>
                  <td style={{ padding: '9px 14px', textAlign: 'right', font: '700 12px/1 var(--font-mono)', color: 'var(--accent)' }}>{c.nContracts}</td>
                  <td style={{ padding: '9px 14px', textAlign: 'right', font: '11px/1 var(--font-mono)', color: 'var(--text-soft)' }}>{(c.weightEst ? '~' : '') + pct1(c.weight)}</td>
                  <td style={{ padding: '9px 14px', textAlign: 'right', font: '11px/1 var(--font-mono)', color: 'var(--text-soft)' }}>{pct1(c.iv)}</td>
                  <td style={{ padding: '9px 14px', textAlign: 'right', font: '11px/1 var(--font-mono)', color: 'var(--pos-bright)' }}>+{fmtMag(c.vega)}</td>
                  {/* Jambes ACHETÉES : elles paient le temps et gagnent la convexité. */}
                  <td style={{ padding: '9px 14px', textAlign: 'right', font: '11px/1 var(--font-mono)', color: 'var(--neg-bright)' }}>−{fmtMag(c.theta)}</td>
                  <td style={{ padding: '9px 14px', textAlign: 'right', font: '11px/1 var(--font-mono)', color: 'var(--pos-bright)' }}>{gammaCell(c.gamma, '+')}</td>
                  <td style={{ padding: '9px 14px', textAlign: 'right', font: '11px/1 var(--font-mono)', color: 'var(--neg-bright)' }}>−{fmtMag(c.premium)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: 'var(--bg-elevated)', borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: '10px 14px', font: '600 11px/1 var(--font-sans)', color: 'var(--text-muted)' }}>Net</td>
                <td colSpan={2} style={{ padding: '10px 14px', textAlign: 'right', font: '11px/1 var(--font-mono)', color: 'var(--text-dim)' }}>{comps.length + 1} jambes</td>
                <td colSpan={2} />
                {/* Nets de CONSTRUCTION, comme les lignes au-dessus : la ligne « Net »
                    doit être la somme de ce qui est affiché. Les valeurs vieillies du
                    temps écoulé sont dans les cartes en haut de page — les mélanger ici
                    donnait un total qui ne correspondait à aucune addition visible. */}
                <td style={{ padding: '10px 14px', textAlign: 'right', font: '700 12px/1 var(--font-mono)', color: (m.neutralised === 'vega' && Math.abs(p.netVega) >= 60) ? 'var(--warn)' : 'var(--pos-bright)' }}>{fmtS(p.netVega || 0)}</td>
                <td style={{ padding: '10px 14px', textAlign: 'right', font: '700 12px/1 var(--font-mono)', color: (p.netTheta || 0) >= 0 ? 'var(--pos-bright)' : 'var(--neg-bright)' }}>{fmtS(p.netTheta || 0)}</td>
                <td style={{ padding: '10px 14px', textAlign: 'right', font: '700 12px/1 var(--font-mono)', color: 'var(--text-soft)' }}>{gammaCell(p.netGamma, (p.netGamma || 0) >= 0 ? '+' : '−')}</td>
                <td style={{ padding: '10px 14px', textAlign: 'right', font: '700 12px/1 var(--font-mono)', color: (p.netPremium || 0) >= 0 ? 'var(--pos-bright)' : 'var(--neg-bright)' }}>{fmtS(p.netPremium || 0)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        {/* Honnêteté sur la nature des chiffres : ce sont les grecs de CONSTRUCTION
            vieillis du temps écoulé, PAS une reprise au marché. Seul le Suivi
            (api/_lib/reprice.js) recalcule avec le spot et l'IV du jour. Le taire
            reviendrait à présenter une estimation comme une mesure. */}
        <p style={{ font: 'var(--type-caption)', color: 'var(--text-dim)', margin: 0, lineHeight: 1.6 }}>
          Ces chiffres sont ceux de la <strong>construction</strong>, seulement vieillis du temps écoulé
          (vega ∝ √T, theta ∝ 1/√T). Ils ne tiennent pas compte des mouvements de prix ni de volatilité
          depuis {builtTxt} — pour une valorisation au marché du jour, suivez la position.
        </p>
      </section>

      {/* ── Structure choisie + couverture ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14, alignItems: 'start' }}>
        <div style={card}>
          <div style={cardTitle}>Structure choisie</div>
          <Row k="Structure" v={sizingLabel} hint={neutralised ? `${neutralised} net neutralisé — les autres grecs sont libres` : 'Répartition uniforme des lots'} />
          <Row k="Pondération" v={WEIGHT_LABEL[s.weightBasis] || s.weightBasis || '—'} />
          <Row k="Jambe indice" v={`${s.nIndex || 1} straddle${(s.nIndex || 1) > 1 ? 's' : ''} vendu${(s.nIndex || 1) > 1 ? 's' : ''}`} hint={idxLabel} />
          <Row k="Composants" v={`${comps.length} · ${totalLots} lots achetés`} />
          <Row k="Échéance" v={expiryTxt} hint={`${m.dte} DTE restant · ${s.duration || 30} j à la construction`} last />
        </div>

        <div style={card}>
          <div style={cardTitle}>Couverture du delta</div>
          <Row k="Méthode" v={HEDGE_LABEL[s.deltaHedge] || 'Aucune'} />
          {s.deltaHedge === 'index' ? (
            <>
              {/* `hedgeUnits` est en LOTS ; l'ordre réel se passe en actions (× CONTRACT). */}
              <Row k="Ordre de couverture" v={`${s.hedgeUnits >= 0 ? 'Acheter' : 'Vendre'} ${Math.round(Math.abs(s.hedgeUnits || 0) * CONTRACT).toLocaleString('fr-FR')} ${s.indexEtf || s.index || 'actions'}`}
                hint={`soit ${Math.abs(s.hedgeUnits || 0).toFixed(2)} lot(s) de ${CONTRACT}`} />
              <Row k="Notionnel couvert" v={fmtS(s.hedgeNotional || 0) + ' ' + dxSym()} />
              <Row k="Delta à la construction" v={fmtS(m.netDelta) + ' ' + dxSym() + '/1%'}
                hint="Couverture FIGÉE à l'entrée : le delta réel dérive ensuite avec le marché. Le Suivi le recalcule au prix du jour." last />
            </>
          ) : s.deltaHedge === 'legs' ? (
            <>
              {/* Mode « legs » : chaque composant est couvert par SON sous-jacent
                  (c.hedgeShares) et la jambe indice par l'indice (s.hedgeUnits, en lots).
                  Les deux ne sont pas la même unité — ne pas les fusionner. */}
              <Row k="Composants couverts" v={`${comps.filter(c => c.hedgeShares).length} / ${comps.length}`}
                hint="chaque straddle neutralisé par son propre sous-jacent" />
              <Row k="Jambe indice" v={`${s.hedgeUnits >= 0 ? 'Acheter' : 'Vendre'} ${Math.round(Math.abs(s.hedgeUnits || 0) * CONTRACT).toLocaleString('fr-FR')} ${s.indexEtf || s.index || 'actions'}`} />
              <Row k="Notionnel total" v={fmtS(s.hedgeNotional || 0) + ' ' + dxSym()} hint="composants + jambe indice" />
              <Row k="Delta à la construction" v={fmtS(m.netDelta) + ' ' + dxSym() + '/1%'}
                hint="Couverture FIGÉE à l'entrée : le delta réel dérive ensuite avec le marché. Le Suivi le recalcule au prix du jour." last />
            </>
          ) : (
            <Row k="Delta net" v={fmtS(m.netDelta) + ' ' + dxSym() + '/1%'}
              hint="Sans couverture, la position a une exposition directionnelle résiduelle." last />
          )}
        </div>
      </div>

      {actionBar}

      {shareFor && window.ShareDialog && (
        <window.ShareDialog list={shareFor} kind="construction" onClose={() => setShareFor(null)} addToast={addToast} />
      )}
      {fillsOpen && window.DXFillsDialog && (
        <window.DXFillsDialog strategy={s} onClose={() => setFillsOpen(false)} onSaved={load} addToast={addToast} />
      )}
      {ibkrOpen && window.IbkrExportDialog && (
        <window.IbkrExportDialog strategy={s} onClose={() => setIbkrOpen(false)} />
      )}
      <window.ConfirmDialog open={!!dialog} title={dialog?.title} message={dialog?.message} confirmLabel={dialog?.confirmLabel} tone={dialog?.tone} busy={dialogBusy}
        onCancel={() => !dialogBusy && setDialog(null)} onConfirm={runDialog} />
    </div>
  );
}

window.StrategyDetail = StrategyDetail;
