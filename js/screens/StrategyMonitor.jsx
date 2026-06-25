/* ─── Strategy Monitor: suivi des stratégies construites ──────────────
   Connecté aux VRAIES stratégies de l'utilisateur (Builder / Construction),
   stockées en localStorage (dx-strategy-<listId>). Affiche leur composition,
   grecs nets, prime, DTE restant et état dérivé. Aucune exécution auto. */
function StrategyMonitor({ mode, lists, onNav }) {
  const { MetricCard, Badge, RiskBadge, WarningPanel, BeginnerExplanationBox } = window.DispersionXDesignSystem_cb86be;
  const [strats, setStrats] = React.useState(null);
  const [sel, setSel] = React.useState(0);

  const reload = React.useCallback(() => {
    setStrats((window.DXApi && DXApi.localStrategies) ? DXApi.localStrategies(lists) : []);
  }, [lists]);
  React.useEffect(() => { reload(); }, [reload]);

  const fmtS  = n => (n >= 0 ? '+' : '−') + Math.abs(Math.round(n)).toLocaleString('fr-FR');
  const statusTone = { sain: 'pos', surveiller: 'warn', risque: 'neg' };
  const statusRisk = { sain: 'faible', surveiller: 'modéré', risque: 'élevé' };

  function del(listId) {
    if (DXApi.deleteLocalStrategy) DXApi.deleteLocalStrategy(listId);
    setSel(0); reload();
  }

  if (strats == null) return <div style={{ padding: 80, textAlign: 'center', color: 'var(--text-muted)', font: 'var(--type-body)' }}>Chargement…</div>;

  const rows = strats.map(s => ({ s, m: DXApi.strategyMetrics(s) }));

  // ── En-tête commun ──
  const Header = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
      <div>
        <h1 style={{ font: 'var(--type-h1)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: '0 0 6px' }}>Strategy Monitor</h1>
        <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)', margin: 0, maxWidth: 660 }}>
          Suivi de vos stratégies de dispersion construites : composition, grecs nets, prime et échéance. Outil d'aide à la décision, sans exécution automatique.
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
  const cur = rows[Math.min(sel, rows.length - 1)];

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
        <MetricCard label="Stratégies suivies" value={String(rows.length)} accent="var(--accent)" />
        <MetricCard label="Prime nette cumulée" value={fmtS(totalPrem) + ' $'} hint={totalPrem >= 0 ? 'Crédit net' : 'Débit net'} accent="var(--info)" />
        <MetricCard label="Vega net cumulé" value={fmtS(totalVega) + ' $/1%'} hint={Math.abs(totalVega) < 120 ? 'Quasi-neutre ✓' : 'À surveiller'} accent={Math.abs(totalVega) < 120 ? 'var(--pos)' : 'var(--warn)'} />
        <MetricCard label="Alertes actives" value={String(nAlerts)} accent={nAlerts ? 'var(--warn)' : 'var(--pos)'} />
      </div>

      {/* Tableau des stratégies */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', font: 'var(--type-body-sm)' }}>
          <thead>
            <tr style={{ background: 'var(--bg-elevated)' }}>
              {['Stratégie', 'Comp.', 'DTE', 'Prime nette', 'Vega net', 'Theta/j', 'Delta', 'État'].map((h, i) => (
                <th key={h} style={{ textAlign: i === 0 ? 'left' : 'right', font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', padding: '11px 16px', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const m = r.m;
              return (
                <tr key={r.s.listId || i} onClick={() => setSel(i)} style={{ borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer', background: sel === i ? 'var(--bg-hover)' : 'transparent' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ font: 'var(--type-title)', color: 'var(--text)' }}>{m.name}</div>
                    <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', marginTop: 2 }}>
                      {r.s.nIndex || 1} contrat(s) {r.s.index} short · construit il y a {m.daysSince}j{m.alert && <span style={{ color: 'var(--warn)' }}> · {m.alert}</span>}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', font: 'var(--type-data-sm)', color: 'var(--text-soft)' }}>{m.nComp}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', font: 'var(--type-data-sm)', color: m.dte < 12 ? 'var(--neg-bright)' : 'var(--text-soft)' }}>{m.dte}j</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', font: 'var(--type-data)', color: m.netPremium >= 0 ? 'var(--pos-bright)' : 'var(--neg-bright)' }}>{fmtS(m.netPremium)} $</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', font: 'var(--type-data-sm)', color: Math.abs(m.netVega) > 100 ? 'var(--warn)' : 'var(--text-soft)' }}>{fmtS(m.netVega)}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', font: 'var(--type-data-sm)', color: m.netTheta >= 0 ? 'var(--pos-bright)' : 'var(--neg-bright)' }}>{fmtS(m.netTheta)}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', font: 'var(--type-data-sm)', color: Math.abs(m.netDelta) < 50 ? 'var(--text-soft)' : 'var(--warn)' }}>{fmtS(m.netDelta)}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}><Badge tone={statusTone[m.status] || 'neutral'} dot>{m.status}</Badge></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Détail de la stratégie sélectionnée */}
      {cur && (
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h2 style={{ font: 'var(--type-h2)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: 0 }}>Détail de la stratégie</h2>
              <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: '4px 0 0' }}>{cur.m.name} · {cur.s.sizingMethod === 'vega_neutral' ? 'vega-neutre' : 'poids égaux'}</p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {onNav && <button onClick={() => onNav('risk', { listId: cur.s.listId })} style={{ font: '600 12px/1 var(--font-sans)', padding: '8px 14px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}>Risk Lab →</button>}
              {onNav && <button onClick={() => onNav('construction', { listId: cur.s.listId })} style={{ font: '600 12px/1 var(--font-sans)', padding: '8px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>Ajuster</button>}
              <button onClick={() => del(cur.s.listId)} style={{ font: '600 12px/1 var(--font-sans)', padding: '8px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--neg)', background: 'transparent', color: 'var(--neg-bright)', cursor: 'pointer' }}>Supprimer</button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                <MetricCard label="Prime nette" value={fmtS(cur.m.netPremium) + ' $'} hint={cur.m.netPremium >= 0 ? 'Crédit' : 'Débit'} accent="var(--accent)" />
                <MetricCard label="Vega net" value={fmtS(cur.m.netVega) + ' $/1%'} accent={Math.abs(cur.m.netVega) < 60 ? 'var(--pos)' : 'var(--warn)'} />
                <MetricCard label="Theta /jour" value={fmtS(cur.m.netTheta) + ' $'} accent="var(--warn)" />
                <MetricCard label="Delta net" value={fmtS(cur.m.netDelta) + ' $/1%'} hint={cur.s.deltaHedge && cur.s.deltaHedge !== 'none' ? 'Couvert' : 'Résiduel'} accent={Math.abs(cur.m.netDelta) < 50 ? 'var(--pos)' : 'var(--warn)'} />
                <MetricCard label="DTE restant" value={String(cur.m.dte)} unit="j" accent={cur.m.dte < 12 ? 'var(--neg)' : 'var(--info)'} />
                <MetricCard label="Risque" value={statusRisk[cur.m.status] || 'faible'} accent={'var(--' + (statusTone[cur.m.status] || 'pos') + ')'} />
              </div>

              {/* Composition (jambes) */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 90px 90px', padding: '9px 14px', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
                  {['Jambe', 'Lots', 'Vega $/1%', 'Prime $'].map(h => <span key={h} style={{ font: '600 9px/1 var(--font-mono)', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: h === 'Jambe' ? 'left' : 'right' }}>{h}</span>)}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 90px 90px', padding: '9px 14px', borderBottom: '1px solid var(--border-subtle)', alignItems: 'center' }}>
                  <span style={{ font: '600 12px/1 var(--font-mono)', color: 'var(--neg-bright)' }}>{cur.s.index} (short straddle)</span>
                  <span style={{ font: '700 12px/1 var(--font-mono)', color: 'var(--neg-bright)', textAlign: 'right' }}>{cur.s.nIndex || 1}</span>
                  <span style={{ font: '11px/1 var(--font-mono)', color: 'var(--neg-bright)', textAlign: 'right' }}>−{Math.round((cur.s.portfolio && cur.s.portfolio.idxVega) || 0)}</span>
                  <span style={{ font: '11px/1 var(--font-mono)', color: 'var(--neg-bright)', textAlign: 'right' }}>+{Math.round((cur.s.portfolio && cur.s.portfolio.idxPrem) || 0)}</span>
                </div>
                {(cur.s.components || []).slice(0, 12).map((c, i) => (
                  <div key={c.ticker} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 90px 90px', padding: '8px 14px', borderBottom: i < Math.min(11, (cur.s.components || []).length - 1) ? '1px solid var(--border-subtle)' : 'none', alignItems: 'center' }}>
                    <span style={{ font: '600 12px/1 var(--font-mono)', color: 'var(--text)' }}>{c.ticker} <span style={{ color: 'var(--text-dim)' }}>(long)</span></span>
                    <span style={{ font: '700 12px/1 var(--font-mono)', color: 'var(--accent)', textAlign: 'right' }}>{c.nContracts}</span>
                    <span style={{ font: '11px/1 var(--font-mono)', color: 'var(--pos-bright)', textAlign: 'right' }}>+{Math.round(c.vega || 0)}</span>
                    <span style={{ font: '11px/1 var(--font-mono)', color: 'var(--text-soft)', textAlign: 'right' }}>−{Math.round(c.premium || 0)}</span>
                  </div>
                ))}
                {(cur.s.components || []).length > 12 && (
                  <div style={{ padding: '8px 14px', font: 'var(--type-caption)', color: 'var(--text-dim)', textAlign: 'center' }}>+ {(cur.s.components || []).length - 12} autres composants</div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {cur.m.alert
                ? <WarningPanel tone={cur.m.status === 'risque' ? 'neg' : 'warn'} title="À surveiller">{cur.m.alert} — réévaluez dans le Risk Lab ou ajustez le dimensionnement.</WarningPanel>
                : <WarningPanel tone="pos" title="Profil sain">Vega équilibré et échéance confortable. Surveillez la prime de corrélation dans le Risk Lab.</WarningPanel>}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 16 }}>
                <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 10 }}>Repères</div>
                <MonitorRow k="Indice" v={cur.s.index} />
                <MonitorRow k="Échéance" v={(cur.s.duration || 30) + ' jours'} />
                <MonitorRow k="Composants" v={String(cur.m.nComp)} />
                <MonitorRow k="Sizing" v={cur.s.sizingMethod === 'vega_neutral' ? 'Vega-neutre' : 'Poids égaux'} />
                <MonitorRow k="Couverture delta" v={cur.s.deltaHedge && cur.s.deltaHedge !== 'none' ? (cur.s.deltaHedge === 'index' ? 'Future indice' : 'Par sous-jacent') : 'Aucune'} last />
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function MonitorRow({ k, v, last }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: last ? 'none' : '1px solid var(--border-subtle)' }}>
      <span style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}>{k}</span>
      <span style={{ font: '600 var(--type-body-sm)', color: 'var(--text)' }}>{v}</span>
    </div>
  );
}

window.StrategyMonitor = StrategyMonitor;
