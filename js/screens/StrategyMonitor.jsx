/* ─── Strategy Monitor : vue comparative des stratégies construites ───
   Connecté aux VRAIES stratégies de l'utilisateur (Builder / Construction),
   stockées en localStorage (dx-strategy-<listId>).

   Le Monitor fait ce qu'il est SEUL à faire : comparer et agréger TOUTES les
   stratégies (exposition de portefeuille, grecs nets, échéances). Le détail
   d'une stratégie — composition, structure, actions — vit sur sa page dédiée
   (StrategyDetail) ; une ligne du tableau y mène.

   Il a longtemps embarqué ce détail en plus, en double de StrategyDetail : deux
   implémentations à maintenir, et des correctifs (devise mixte, alerte vega) à
   appliquer deux fois. Cette branche a été supprimée. */
function StrategyMonitor({ mode, lists, onNav, addToast, listId }) {
  const _fx = window.useCurrency ? window.useCurrency() : null;   // re-render au changement de devise
  const { MetricCard, BeginnerExplanationBox, Badge } = window.DispersionXDesignSystem_cb86be;
  const [strats, setStrats] = React.useState(null);

  const reload = React.useCallback(() => {
    setStrats((window.DXApi && DXApi.localStrategies) ? DXApi.localStrategies(lists) : []);
  }, [lists]);
  React.useEffect(() => {
    reload();
    // Ré-hydratation cloud des stratégies (connexion) → recharger la liste.
    const onChg = () => reload();
    window.addEventListener('dx-strategies-changed', onChg);
    return () => window.removeEventListener('dx-strategies-changed', onChg);
  }, [reload]);

  // Entrée ciblée (`onNav('monitor', { listId })`) : le détail d'UNE stratégie a
  // sa propre page — on y renvoie directement plutôt que de la présélectionner.
  React.useEffect(() => {
    if (listId && onNav) onNav('strategy-detail', { listId });
  }, [listId, onNav]);

  const fmtS = n => window.DXMoney ? window.DXMoney.value(n) : ((n >= 0 ? '+' : '−') + Math.abs(Math.round(n)).toLocaleString('fr-FR'));
  const dxSym = () => window.DXMoney ? window.DXMoney.symbol() : '$';
  // Magnitude CONVERTIE : la table porte son propre signe (+ long / − short). Sans
  // ça, la composition restait en dollars pendant que les cartes au-dessus se
  // convertissaient — deux devises sur le même écran.
  const fmtMag = n => window.DXMoney ? window.DXMoney.value(Math.abs(n || 0), { sign: false }) : Math.abs(Math.round(n || 0)).toLocaleString('fr-FR');
  // Seuils partagés avec le Risk Lab / la Construction (mêmes couleurs partout)
  const VEGA_NEUTRAL = (window.DXRisk && window.DXRisk.VEGA_NEUTRAL) || 60;
  const VEGA_ALERT   = (window.DXRisk && window.DXRisk.VEGA_ALERT) || 250;
  const statusTone = { sain: 'pos', surveiller: 'warn', risque: 'neg' };

  if (strats == null) return window.DXLoader
    ? <window.DXLoader title="Chargement des stratégies" steps={['Récupération de vos constructions…', 'Grecs recalculés au DTE restant…']} />
    : <div style={{ padding: 80, textAlign: 'center', color: 'var(--text-muted)', font: 'var(--type-body)' }}>Chargement…</div>;

  const rows = strats.map(s => ({ s, m: DXApi.strategyMetrics(s) }));

  // ── En-tête commun ──
  const Header = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
      <div>
        <h1 style={{ font: 'var(--type-h1)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: '0 0 6px' }}>Strategy Monitor</h1>
        <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)', margin: 0, maxWidth: 660 }}>
          Toutes vos dispersions côte à côte : exposition agrégée, grecs nets et échéances. Ouvrez-en une pour le détail complet.
        </p>
      </div>
      {rows.length > 0 && onNav && (
        <button onClick={() => onNav('builder')} style={{ font: '600 12px/1 var(--font-sans)', padding: '8px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>+ Nouvelle stratégie</button>
      )}
    </div>
  );

  if (!rows.length) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {Header}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '56px 24px', background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
        <div style={{ font: 'var(--type-title)', color: 'var(--text)' }}>Aucune stratégie construite</div>
        <div style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', maxWidth: 420 }}>
          Construisez une dispersion dans le <strong style={{ color: 'var(--text-soft)' }}>Strategy Builder</strong> ou dimensionnez-la dans la <strong style={{ color: 'var(--text-soft)' }}>Construction</strong> à partir d'une liste — elle apparaîtra ici pour le suivi.
        </div>
        {onNav && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => onNav('builder')} style={{ font: '600 12px/1 var(--font-sans)', padding: '10px 18px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}>Strategy Builder →</button>
            <button onClick={() => onNav('construction')} style={{ font: '600 12px/1 var(--font-sans)', padding: '10px 18px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>Construction →</button>
          </div>
        )}
      </div>
    </div>
  );

  const totalPrem = rows.reduce((a, r) => a + r.m.netPremium, 0);
  const totalVega = rows.reduce((a, r) => a + r.m.netVega, 0);
  const nAlerts   = rows.filter(r => r.m.alert).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {Header}

      {mode === 'Débutant' && (
        <BeginnerExplanationBox>
          Une stratégie de dispersion paie une prime nette (débit) pour être longue de dispersion. Surveillez le <strong>theta</strong> (le temps qui passe), le <strong>vega net</strong> (proche de 0 = équilibré) et le <strong>DTE restant</strong> : sous ~7 jours, le risque de portage augmente.
        </BeginnerExplanationBox>
      )}

      {/* Synthèse portefeuille */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <MetricCard label="Stratégies suivies" value={String(rows.length)} accent="var(--accent)"
          hint="Nombre de constructions (dispersions) que vous suivez ici." />
        <MetricCard label="Prime nette cumulée" value={fmtS(totalPrem) + ' ' + dxSym()} accent="var(--info)"
          hint={'Somme des primes d\'entrée de toutes vos stratégies. ' + (totalPrem >= 0 ? 'Ici : crédit net (encaissé à l\'ouverture).' : 'Ici : débit net (payé pour être long dispersion).')} />
        <MetricCard label="Vega net cumulé" value={fmtS(totalVega) + ' ' + dxSym() + '/1%'} accent={Math.abs(totalVega) < VEGA_NEUTRAL ? 'var(--pos)' : 'var(--warn)'}
          hint="Sensibilité totale à la volatilité, en $ pour +1 point d'IV. Proche de 0 = position équilibrée en vol ; élevé = exposée à un mouvement de volatilité." />
        <MetricCard label="Alertes actives" value={String(nAlerts)} accent={nAlerts ? 'var(--warn)' : 'var(--pos)'}
          hint="Nombre de stratégies avec un signal à surveiller : échéance proche, coût de portage élevé, ou grec censé être neutralisé qui ne l'est pas." />
      </div>

      {/* Tableau des stratégies */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', font: 'var(--type-body-sm)' }}>
          <thead>
            <tr style={{ background: 'var(--bg-elevated)' }}>
              {['Stratégie', 'Comp.', 'DTE', 'Prime nette', 'Vega net', 'Theta/j', 'Delta', 'État', ''].map((h, i) => (
                <th key={h} style={{ textAlign: i === 0 ? 'left' : 'right', font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', padding: '11px 16px', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const m = r.m;
              return (
                <tr key={r.s.listId || i}
                  // La ligne OUVRE la stratégie : son détail vit sur sa propre page.
                  onClick={() => onNav && onNav('strategy-detail', { listId: r.s.listId })}
                  style={{ borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ font: 'var(--type-title)', fontWeight: 700, color: 'var(--accent-hover)' }}>{m.name}</div>
                    <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', marginTop: 2 }}>
                      {r.s.nIndex || 1} contrat(s) {r.s.index} short · construit il y a {m.daysSince}j{m.alert && <span style={{ color: 'var(--warn)' }}> · {m.alert}</span>}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', font: 'var(--type-data-sm)', color: 'var(--text-soft)' }}>{m.nComp}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', font: 'var(--type-data-sm)', color: m.dte < 12 ? 'var(--neg-bright)' : 'var(--text-soft)' }}>{m.dte}j</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', font: 'var(--type-data)', color: m.netPremium >= 0 ? 'var(--pos-bright)' : 'var(--neg-bright)' }}>{fmtS(m.netPremium)} {dxSym()}</td>
                  {/* Vega en alerte SEULEMENT si la structure prétend le neutraliser
                      (sinon il est libre par choix — cf. strategyMetrics.neutralised). */}
                  <td style={{ padding: '12px 16px', textAlign: 'right', font: 'var(--type-data-sm)', color: (m.neutralised === 'vega' && Math.abs(m.netVega) > VEGA_ALERT) ? 'var(--warn)' : 'var(--text-soft)' }}>{fmtS(m.netVega)}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', font: 'var(--type-data-sm)', color: m.netTheta >= 0 ? 'var(--pos-bright)' : 'var(--neg-bright)' }}>{fmtS(m.netTheta)}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', font: 'var(--type-data-sm)', color: Math.abs(m.netDelta) < 50 ? 'var(--text-soft)' : 'var(--warn)' }}>{fmtS(m.netDelta)}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}><Badge tone={statusTone[m.status] || 'neutral'} dot>{m.status}</Badge></td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', font: 'var(--type-body-sm)', color: 'var(--accent-hover)', whiteSpace: 'nowrap' }}>Ouvrir →</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

window.StrategyMonitor = StrategyMonitor;
