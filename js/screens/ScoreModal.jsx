/* ─── Score Modal: full auto-score detail ─────────────────────── */
function ScoreModal({ indexSymbol, stockTicker, duration, lists, onClose, onAddedToList, addToast, mode, onScoreLoaded }) {
  const _fx = window.useCurrency ? window.useCurrency() : null;   // re-render au changement de devise
  const dxSym = () => window.DXMoney ? window.DXMoney.symbol() : '$';
  const { ScoreBadge, WarningPanel, BeginnerExplanationBox } = window.DispersionXDesignSystem_cb86be;
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [selectedList, setSelectedList] = React.useState('');
  const [adding, setAdding] = React.useState(false);

  React.useEffect(() => {
    setLoading(true);
    // Ancre le score sur la ρ implicite RÉELLE de l'indice, déjà calculée par le store pour le
    // scoring de ses composants. Sans elle, le serveur applique le fail-safe 0,65 et ce détail
    // afficherait un score différent de celui de la même action dans la liste (~24 points).
    // null (indice pas encore chargé) → fail-safe serveur, comportement d'avant, non-cassant.
    const rhoImpl = (window.DXStore && window.DXStore.getRhoImpl) ? window.DXStore.getRhoImpl(indexSymbol, duration) : null;
    DXApi.autoScore(indexSymbol, stockTicker, duration, false, rhoImpl).then(d => {
      setData(d);
      setLoading(false);
      // L'indice et l'horizon accompagnent le score : sans eux, l'appelant ne peut
      // pas le ranger sous une clé qui le distingue d'un autre indice/échéance.
      onScoreLoaded && onScoreLoaded(stockTicker, d?.scoring?.score, indexSymbol, duration);
      // On N'ÉCRASE PLUS l'IV avec une 2e source (options ATM). L'IV affichée,
      // « IV − HV » et le score doivent provenir du MÊME calcul (auto-score),
      // sinon l'écran montre une IV qui ne colle pas à « IV − HV » — bug
      // constaté sur ZS (IV 128 / HV 58 mais « IV − HV » incohérent) et écart
      // local↔Vercel. Les grecs « straddle » viennent aussi d'auto-score.
    }).catch(() => setLoading(false));
  }, [indexSymbol, stockTicker, duration]);

  const eligibleLists = (lists || []).filter(l => l.index_symbol === indexSymbol);

  async function handleAdd() {
    if (!selectedList) return;
    setAdding(true);
    try {
      await DXApi.addListItem(selectedList, stockTicker, data?.scoring || null, '');
      addToast && addToast(`${stockTicker} ajouté à la liste.`);
      onAddedToList && onAddedToList(selectedList);
      onClose();
    } catch {
      addToast && addToast('Erreur lors de l\'ajout.', 'error');
    } finally {
      setAdding(false);
    }
  }

  const sigColor = { green: 'var(--pos-bright)', lime: 'var(--lime)', amber: 'var(--warn)', red: 'var(--neg-bright)', muted: 'var(--text-muted)' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 20px', overflowY: 'auto' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 680, boxShadow: 'var(--shadow-lg)' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img
                  src={`https://assets.parqet.com/logos/symbol/${stockTicker.split('.')[0]}`}
                  alt=""
                  style={{ width: 30, height: 30, objectFit: 'contain' }}
                  onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.insertAdjacentHTML('afterend', `<span style="font:700 10px/1 var(--font-mono);color:var(--text-soft)">${stockTicker.slice(0,3)}</span>`); }}
                />
              </div>
              <div>
                <div style={{ font: '800 16px/1 var(--font-mono)', color: 'var(--text)' }}>{stockTicker}</div>
                <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', marginTop: 2 }}>vs {indexSymbol} · {duration}j</div>
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 'var(--radius)', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-soft)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>×</button>
        </div>

        {loading ? (
          window.DXLoader ? (
            <window.DXLoader title="Calcul du score" pad={40} steps={['Volatilité implicite et historique…', 'Corrélation, beta et liquidité…', 'Risque événement (earnings)…']} />
          ) : <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', font: 'var(--type-body)' }}>Calcul du score de dispersion…</div>
        ) : !data ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--neg)', font: 'var(--type-body)' }}>Erreur de chargement. Réessayez.</div>
        ) : (() => {
          const { stock, index: idx } = data;
          // Modèle de VUE (choix utilisateur dans Préférences : V2 ou ALT), INDÉPENDANT du flag
          // serveur. Le store fournit les deux scores ; l'affichage s'adapte à la vue choisie.
          let scoring = data.scoring;
          const vm = (window.DXStore && window.DXStore.getViewModel) ? window.DXStore.getViewModel() : (scoring.score_model || 'V2');
          const isAlt = vm === 'ALT';
          const isV2 = vm === 'V2';
          if (isAlt) {
            // ALT est CROSS-SECTIONNEL : le vrai rang (percentile sur l'indice) vient du STORE, pas
            // de la réponse par-action. Repli sur le score V2 de la réponse si l'indice n'est pas
            // encore en contexte dans le store (non-cassant).
            const ad = (window.DXStore && window.DXStore.getAltDetail) ? window.DXStore.getAltDetail(indexSymbol, stockTicker, duration) : null;
            if (ad) scoring = { ...scoring, score: ad.score, signal: ad.signal, alt_detail: ad,
              signal_color: ad.signal === 'FORT' ? 'green' : ad.signal === 'MODÉRÉ' ? 'amber' : 'red' };
          } else if (scoring.score_v2 != null && scoring.score !== scoring.score_v2) {
            // Vue V2 alors que le flag serveur est ALT/V1 → afficher le score_v2 (toujours renvoyé).
            const s2 = scoring.score_v2, sig = s2 >= 62 ? 'FORT' : s2 >= 19 ? 'MODÉRÉ' : 'FAIBLE';
            scoring = { ...scoring, score: s2, signal: sig, signal_color: sig === 'FORT' ? 'green' : sig === 'MODÉRÉ' ? 'amber' : 'red' };
          }
          const v2 = scoring.v2_parts || {};
          return (
            <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Earnings warning */}
              {stock.earnings_in_strategy && (
                <WarningPanel tone="warn">
                  Earnings dans {stock.days_to_earnings} jours ({stock.earnings_date}) — risque de vol crush autour de l'annonce.
                </WarningPanel>
              )}

              {/* Repli : données non chargées → score estimé, marqué comme tel */}
              {scoring.is_fallback && (
                <WarningPanel tone="warn">
                  Score <strong>estimé</strong> — les données de marché de ce composant n'ont pas pu être chargées (backend momentanément indisponible ou surchargé). Ce chiffre est une approximation, <strong>pas le vrai score</strong> : recharge la page pour relancer le calcul.
                </WarningPanel>
              )}

              {/* Coût d'exécution : LE facteur qui décide du P&L net (verrou de la dispersion).
                  Le score classe l'apport à la dispersion, pas le coût de le trader — on rend donc
                  ce coût impossible à rater dès qu'il est élevé, indépendamment du modèle de score. */}
              {scoring.spread_pct_real != null && scoring.spread_pct_real > 8 && (
                <WarningPanel tone={scoring.spread_pct_real > 15 ? 'neg' : 'warn'}>
                  Coût d'exécution <strong>{scoring.spread_pct_real > 15 ? 'très élevé' : 'élevé'}</strong> — le spread bid/ask du straddle ATM vaut <strong>{scoring.spread_pct_real.toFixed(0)} % du prix</strong>{scoring.cost_source === 'estimated' ? ' (estimé — options peu ou pas cotées)' : ' (réel Cboe)'}. C'est le facteur qui <strong>décide du P&L net</strong> : à ce niveau, une dispersion sur ce nom peut être <strong>non rentable net de frais</strong>, même avec un bon score. Le score classe l'apport à la dispersion, <strong>pas le coût de le trader</strong>.
                </WarningPanel>
              )}

              {/* Hero score */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '18px 22px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: `1px solid ${scoring.is_fallback ? 'var(--warn)' : 'var(--border)'}` }}>
                <div style={{ font: '800 52px/1 var(--font-mono)', color: sigColor[scoring.signal_color] || 'var(--text)' }}>
                  {scoring.score}
                </div>
                <div>
                  <ScoreBadge score={scoring.score} label={scoring.signal} />
                  <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', marginTop: 8 }}>Score de dispersion / 100</div>
                  {scoring.confidence && (
                    <div title={(scoring.confidence.details || []).join(' · ')}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, padding: '3px 9px', borderRadius: 999, background: 'var(--bg-card)', border: `1px solid ${scoring.confidence.tier === 'A' ? 'var(--pos)' : scoring.confidence.tier === 'B' ? 'var(--warn)' : 'var(--neg)'}`, cursor: 'help' }}>
                      <span style={{ font: '700 12px/1 var(--font-mono)', color: scoring.confidence.tier === 'A' ? 'var(--pos-bright)' : scoring.confidence.tier === 'B' ? 'var(--warn)' : 'var(--neg-bright)' }}>Confiance {scoring.confidence.tier}</span>
                      <span style={{ font: 'var(--type-caption)', color: 'var(--text-muted)' }}>{scoring.confidence.label}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Ce que le score mesure — et ce qu'il ne mesure pas.
                  Nos backtests (backtest/backtest_level1.mjs, _level2_basket.mjs) tranchent net :
                  le score PRÉDIT bien la corrélation future (IC ~0,6 ; le panier le mieux classé
                  capture +0,25 de corrélation, 94 % de réussite) mais il ne prédit PAS le P&L net
                  — ce même panier a le PIRE résultat tradeable, parce que le portage de volatilité
                  et le spread pilotent le profit autant que la corrélation. Le présenter comme un
                  signal d'achat serait donc faux. On le dit là où le chiffre se lit. */}
              <div style={{ padding: '10px 13px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', font: 'var(--type-caption)', color: 'var(--text-muted)', lineHeight: 1.55 }}>
                {isAlt ? (
                  <><strong style={{ color: 'var(--text-soft)' }}>Comment lire ce score.</strong> Il classe ce composant par « <strong>vol idiosyncratique réalisée − coût d'exécution</strong> », <strong>rangé parmi les titres de l'indice</strong> (percentile). Il ne dépend <strong>pas de la prime de corrélation</strong>. Sur notre backtest en dollars, ce classement <strong>bat le modèle actuel</strong> et reste positif <strong>delta-hedgé net sur l'indice</strong> — mais c'est un <strong>facteur expérimental</strong> (long vol idio bon marché), sensible au régime, <strong>pas une promesse de rendement</strong> : à valider en conditions réelles.</>
                ) : (
                  <><strong style={{ color: 'var(--text-soft)' }}>Comment lire ce score.</strong> Il classe l'<strong>apport de ce composant à une dispersion</strong> : bouge-t-il assez indépendamment de l'indice, sa volatilité est-elle attractive, ses options sont-elles traitables. Nos tests sur 2 ans confirment qu'il <strong>prédit bien la corrélation</strong> à venir — mais il ne prédit <strong>pas le gain</strong> : dans nos backtests, le panier le mieux classé est celui qui capture le mieux la corrélation, et pourtant pas celui au meilleur résultat net de frais. C'est un outil d'<strong>analyse</strong>, pas un signal d'achat : le résultat se joue au moment du trade, sur le coût d'exécution et la taille.</>
                )}
              </div>

              {isAlt ? (
                /* ALT : vignette « vol idio − coût → rang percentile », même moule visuel que V2. */
                <div style={{ padding: 16, background: 'var(--accent-soft, var(--bg-elevated))', border: '1px solid var(--accent)', borderRadius: 'var(--radius-lg)' }}>
                  <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent-hover)', marginBottom: 14 }}>Comment le score se construit</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, flexWrap: 'wrap' }}>
                    {[
                      { l: 'Vol idio réal.', v: scoring.alt_idio != null ? scoring.alt_idio.toFixed(0) : '—', sub: 'mouvement propre (pts)', c: 'var(--pos-bright)' },
                      { op: '−' },
                      { l: 'Coût exéc.', v: scoring.alt_cost != null ? scoring.alt_cost.toFixed(0) + '%' : '—', sub: 'spread straddle ATM', c: 'var(--warn)' },
                      { op: '→' },
                      { l: 'Rang', v: scoring.score, sub: scoring.signal, c: sigColor[scoring.signal_color] || 'var(--text)', big: true },
                    ].map((m, i) => m.op
                      ? <div key={i} style={{ font: '300 24px/1 var(--font-mono)', color: 'var(--text-dim)', flex: '0 0 auto' }}>{m.op}</div>
                      : <div key={i} style={{ textAlign: 'center', flex: '1 1 70px', minWidth: 70 }}>
                          <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', marginBottom: 5 }}>{m.l}</div>
                          <div style={{ font: `700 ${m.big ? 32 : 24}px/1 var(--font-mono)`, color: m.c }}>{m.v}</div>
                          <div style={{ font: 'var(--type-caption)', color: 'var(--text-dim)', marginTop: 5 }}>{m.sub}</div>
                        </div>
                    )}
                  </div>
                  <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', marginTop: 14, lineHeight: 1.5, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
                    Le score est le <strong>rang percentile</strong> de « vol idio − coût » parmi les titres de l'indice. <strong>Sans prime de corrélation.</strong> À trader delta-hedgé <strong style={{ color: 'var(--text-soft)' }}>net sur l'indice</strong> (pas jambe par jambe). Corrélation, IV-rank et earnings sont <strong>hors modèle</strong> — affichés plus bas pour information.
                  </div>
                </div>
              ) : isV2 ? (
                /* V2 : UNE seule vignette « porte × qualité = score » — lecture immédiate. Elle
                   remplace le bandeau + les 4 cartes + le bloc sous-scores (redondants en V2). */
                <div style={{ padding: 16, background: 'var(--accent-soft, var(--bg-elevated))', border: '1px solid var(--accent)', borderRadius: 'var(--radius-lg)' }}>
                  <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent-hover)', marginBottom: 14 }}>Comment le score se construit</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, flexWrap: 'wrap' }}>
                    {[
                      { l: 'Porte corrél.', v: v2.corr_gate != null ? Math.round(v2.corr_gate * 100) + '%' : '—', sub: v2.edge != null ? `edge ${v2.edge >= 0 ? '+' : ''}${(v2.edge * 100).toFixed(0)} pts` : 'ρ impl−réal', c: 'var(--pos-bright)' },
                      { op: '×' },
                      { l: 'Qualité', v: v2.quality ?? '—', sub: `IV-rank ${scoring.subscores?.vol_attractive?.score ?? '—'} · idio ${scoring.subscores?.idio_vol?.score ?? '—'}`, c: 'var(--accent-hover)' },
                      { op: '=' },
                      { l: 'Score', v: scoring.score, sub: scoring.signal, c: sigColor[scoring.signal_color] || 'var(--text)', big: true },
                    ].map((m, i) => m.op
                      ? <div key={i} style={{ font: '300 24px/1 var(--font-mono)', color: 'var(--text-dim)', flex: '0 0 auto' }}>{m.op}</div>
                      : <div key={i} style={{ textAlign: 'center', flex: '1 1 70px', minWidth: 70 }}>
                          <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', marginBottom: 5 }}>{m.l}</div>
                          <div style={{ font: `700 ${m.big ? 32 : 24}px/1 var(--font-mono)`, color: m.c }}>{m.v}</div>
                          <div style={{ font: 'var(--type-caption)', color: 'var(--text-dim)', marginTop: 5 }}>{m.sub}</div>
                        </div>
                    )}
                  </div>
                  <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', marginTop: 14, lineHeight: 1.5, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
                    Un <strong>produit</strong> : une corrélation trop haute <strong style={{ color: 'var(--text-soft)' }}>ferme la porte</strong> (→ 0) et aucun IV-rank ne la rattrape. Earnings et liquidité sont <strong>hors modèle</strong> en V2.
                  </div>
                </div>
              ) : (
                <>
                  {/* V1 : bandeau de formule + 4 cartes pondérées */}
                  <div style={{ padding: '9px 13px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', font: 'var(--type-caption)', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    <strong style={{ color: 'var(--text-soft)' }}>Modèle V1</strong> — <strong>moyenne pondérée</strong> de 5 sous-scores (45 / 20 / 15 / 10 / 10). Un bon critère peut compenser une corrélation moyenne.
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                    {[
                      { l: 'Corrélation · 45%', v: scoring.subscores?.dispersion_contrib?.score ?? '—', sub: `ρ impl ${(scoring.rho_implicit_final * 100)?.toFixed(0)}% → réal ${(scoring.rho_real_expected * 100)?.toFixed(0)}%`, color: 'var(--pos-bright)' },
                      { l: 'IV Rank · 20%', v: scoring.subscores?.vol_attractive?.score ?? '—', sub: `rank ${stock.iv_rank?.iv_rank ?? '—'}% · bas = favorable`, color: 'var(--accent-hover)' },
                      { l: 'Earnings · 15%', v: scoring.subscores?.earnings_catalyst?.score ?? '—', sub: stock.earnings_in_strategy ? `gap dans ${stock.days_to_earnings}j · décorrélation` : 'pas de catalyseur', color: 'var(--info)' },
                      { l: 'Vol idio · 10%', v: scoring.subscores?.idio_vol?.score ?? '—', sub: `mouvement propre · β ${stock.beta?.toFixed(2)}`, color: 'var(--info)' },
                    ].map(m => (
                      <div key={m.l} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '12px 14px' }}>
                        <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 6 }}>{m.l}</div>
                        <div style={{ font: '700 18px/1 var(--font-mono)', color: m.color }}>{m.v}</div>
                        <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', marginTop: 4 }}>{m.sub}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* ALT : les facteurs HORS modèle (corrélation, IV-rank, earnings), pour information —
                  un trader de dispersion veut les voir même s'ils n'entrent pas dans le score ALT. */}
              {isAlt && scoring.subscores && (
                <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', padding: '14px 16px', border: '1px solid var(--border)' }}>
                  <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 12 }}>Pour information — hors modèle ALT</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                    {[
                      { l: 'Corrélation', v: scoring.subscores.dispersion_contrib?.score ?? '—', sub: scoring.rho_real_expected != null ? `ρ réal ${(scoring.rho_real_expected * 100).toFixed(0)}% vs impl ${(scoring.rho_implicit_final * 100).toFixed(0)}%` : 'apport dispersion' },
                      { l: 'IV Rank', v: scoring.subscores.vol_attractive?.score ?? '—', sub: `rank ${stock.iv_rank?.iv_rank ?? '—'}% · bas = favorable` },
                      { l: 'Earnings', v: scoring.subscores.earnings_catalyst?.score ?? '—', sub: stock.earnings_in_strategy ? `résultat dans ${stock.days_to_earnings} j` : 'pas de catalyseur' },
                    ].map(m => (
                      <div key={m.l} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius)', padding: '10px 12px' }}>
                        <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 5 }}>{m.l}</div>
                        <div style={{ font: '700 16px/1 var(--font-mono)', color: 'var(--text-soft)' }}>{m.v}</div>
                        <div style={{ font: 'var(--type-caption)', color: 'var(--text-dim)', marginTop: 4 }}>{m.sub}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Prime de corrélation (signal desk) — ρ implicite RÉELLE du panier vs ρ réalisée.
                  En V2 l'edge est déjà dans la vignette « porte » → on ne la répète pas. */}
              {!isV2 && !isAlt && scoring.corr_risk_premium != null && (
                <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', textAlign: 'center', marginTop: -8 }}>
                  Prime de corrélation :{' '}
                  <strong style={{ color: scoring.corr_risk_premium > 0 ? 'var(--pos-bright)' : 'var(--neg-bright)' }}>
                    {scoring.corr_risk_premium > 0 ? '+' : ''}{(scoring.corr_risk_premium * 100).toFixed(0)} pts
                  </strong>{' '}
                  (ρ implicite {scoring.rho_impl_source === 'basket_cboe' ? 'réelle Cboe' : 'défaut'} {(scoring.rho_implicit_final * 100).toFixed(0)}% − ρ réalisée {(scoring.rho_real_expected * 100).toFixed(0)}%)
                </div>
              )}

              {/* Sous-scores décomposés — V1 UNIQUEMENT (en V2 la vignette « porte × qualité »
                  suffit ; en ALT le bloc « hors modèle » ci-dessus tient ce rôle). */}
              {!isV2 && !isAlt && (
              <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', padding: '14px 16px', border: '1px solid var(--border)' }}>
                <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 12 }}>Sous-scores décomposés</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {Object.entries({
                    dispersion_contrib: 'Corrélation (45%)',
                    vol_attractive: 'IV Rank (20%)',
                    earnings_catalyst: 'Earnings · décorrélation (15%)',
                    idio_vol: 'Vol idio (10%)',
                    liquidity: 'Liquidité (10%)',
                  }).map(([key, label]) => {
                    const s = scoring.subscores[key];
                    if (!s) return null;
                    const barColor = s.score >= 70 ? 'var(--pos-bright)' : s.score >= 45 ? 'var(--warn)' : 'var(--neg-bright)';
                    return (
                      <div key={key}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ font: 'var(--type-body-sm)', color: 'var(--text-soft)' }}>{label}</span>
                          <span style={{ font: 'var(--type-data-sm)', color: barColor }}>{s.score}</span>
                        </div>
                        <div style={{ height: 4, borderRadius: 2, background: 'var(--bg-card)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: s.score + '%', background: barColor, borderRadius: 2, transition: 'width 0.8s var(--ease)' }} />
                        </div>
                        <div style={{ font: 'var(--type-caption)', color: 'var(--text-dim)', marginTop: 2 }}>{s.reason}</div>
                        {/* Vol idio : l'arbitrage que le sous-score seul ne dit pas (brique 7).
                            Mesuré (backtest/sweep_untested.mjs) : sélectionner par vol idio plutôt
                            que par liquidité améliore le Sharpe (0,99 vs 0,82) MAIS retourne la
                            skew (+0,16 vs −0,41) et perd 2× plus dans le vrai pic de corrélation
                            d'avril 2025. Plus de prime CONTRE plus de queue — pas un repas gratuit. */}
                        {key === 'idio_vol' && s.score >= 70 && (
                          <div style={{ font: 'var(--type-caption)', color: 'var(--warn)', marginTop: 3, lineHeight: 1.5 }}>
                            ⚠ Une vol idio élevée est le <strong>moteur</strong> d'une dispersion — c'est ce qui la fait payer. Mais ce sont aussi les titres qui <strong>chutent le plus fort quand tout le marché tombe ensemble</strong> : dans nos tests, un panier sélectionné sur ce critère perd deux fois plus lors d'un vrai pic de corrélation. Vous achetez plus de prime en échange de plus de risque de queue, pas un avantage gratuit.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              )}

              {/* IV Rank */}
              {stock.iv_rank && (() => {
                // Deux méthodes rangent une VRAIE IV dans de VRAIES IV : `true_iv` (historique de
                // snapshots accumulé) et `true_iv_snapshot` (plage 52 sem. mesurée sur notre
                // historique d'options). Seul `hv_estimated` est un proxy — il ne corrèle qu'à
                // 0,38 avec le vrai rang, d'où l'intérêt de ne PAS l'étiqueter « réel ».
                const ivrTrue = stock.iv_rank.method === 'true_iv' || stock.iv_rank.method === 'true_iv_snapshot';
                return (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, padding: '14px 16px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 4 }}>{ivrTrue ? 'IV Rank (réel)' : 'IV Rank (estimé HV)'}</div>
                    <div style={{ font: '700 22px/1 var(--font-mono)', color: 'var(--text)' }}>{stock.iv_rank.iv_rank}%</div>
                    {!ivrTrue && stock.iv_rank.true_days > 0 && (
                      <div style={{ font: 'var(--type-caption)', color: 'var(--text-dim)', marginTop: 2 }}>vrai IV rank en constitution · {stock.iv_rank.true_days} j</div>
                    )}
                  </div>
                  <div>
                    <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 4 }}>IV Percentile</div>
                    <div style={{ font: '700 22px/1 var(--font-mono)', color: 'var(--text)' }}>{stock.iv_rank.iv_percentile}%</div>
                  </div>
                  <div>
                    <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 4 }}>{ivrTrue ? 'Range 52 sem. (IV)' : 'Range 1 an (HV)'}</div>
                    <div style={{ font: 'var(--type-data-sm)', color: 'var(--text-soft)' }}>{stock.iv_rank.iv_min?.toFixed(1)}% – {stock.iv_rank.iv_max?.toFixed(1)}%</div>
                    <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', marginTop: 2 }}>{stock.iv_rank.note}</div>
                  </div>
                </div>
                );
              })()}

              {/* Greeks (IBKR) */}
              {stock.greeks && (
                <div style={{ padding: '12px 16px', background: 'var(--pos-soft)', border: '1px solid var(--pos)', borderRadius: 'var(--radius-lg)' }}>
                  <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--pos-bright)', marginBottom: 8 }}>{stock.iv_source === 'ibkr' ? 'Grecs straddle · IBKR temps réel' : stock.iv_source === 'marketdata' ? 'Grecs straddle · MarketData temps réel' : stock.iv_source === 'alpaca' ? 'Grecs straddle · Alpaca temps réel' : 'Grecs straddle · estimés'}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
                    {[
                      { l: 'Delta', v: stock.greeks.delta?.toFixed(3) },
                      { l: 'Gamma', v: stock.greeks.gamma?.toFixed(4) },
                      { l: 'Vega', v: stock.greeks.vega?.toFixed(1) },
                      { l: 'Theta', v: stock.greeks.theta?.toFixed(1) },
                      { l: 'Strike', v: dxSym() + (window.DXMoney ? Math.round(window.DXMoney.convert(stock.greeks.strike) * 100) / 100 : stock.greeks.strike) },
                      { l: 'Expiry', v: stock.greeks.expiry },
                    ].map(g => (
                      <div key={g.l}>
                        <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: 2 }}>{g.l}</div>
                        <div style={{ font: 'var(--type-data-sm)', color: 'var(--text)' }}>{g.v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendation */}
              <div style={{ padding: '12px 16px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', font: 'var(--type-body-sm)', color: 'var(--text-soft)', lineHeight: 1.6 }}>
                <strong style={{ color: 'var(--text)', display: 'block', marginBottom: 4 }}>Recommandation</strong>
                {scoring.recommendation}
              </div>

              {/* Beginner box */}
              {mode === 'Débutant' && (
                <BeginnerExplanationBox>
                  {isAlt ? (
                    <><strong>Pourquoi ce score ?</strong> Le modèle <strong>ALT</strong> classe les titres sur deux choses seulement : la <strong>vol idiosyncratique réalisée</strong> (combien l'action bouge toute seule, indépendamment de l'indice — c'est ce qui fait payer le straddle long) <strong>moins</strong> le <strong>coût d'exécution</strong> (le spread des options : cher à trader = pénalisé). Le score est le <strong>rang</strong> du titre parmi ceux de l'indice, de 0 à 100. <strong>Pas de prime de corrélation</strong> : nos tests en dollars montrent qu'elle ne prédit pas le gain, alors que « bouge beaucoup, pas cher » le prédit mieux. ⚠️ Modèle <strong>expérimental</strong> — à trader delta-hedgé <strong>net sur l'indice</strong>, et à confirmer en conditions réelles.</>
                  ) : isV2 ? (
                    <><strong>Pourquoi ce score ?</strong> Le modèle V2 <strong>multiplie</strong> deux choses. D'abord une <strong>porte de corrélation</strong> : ce titre bouge-t-il vraiment indépendamment de l'indice ? Si sa corrélation est trop élevée, la porte se ferme (→ 0) et le score tombe — <em>un titre qui suit l'indice n'apporte rien à une dispersion, quelle que soit sa vol</em>. Ensuite une <strong>qualité</strong> : 60 % d'<strong>IV rank</strong> (on <strong>achète</strong> la volatilité, donc on la préfère <strong>basse dans son historique</strong>) + 40 % de <strong>vol idiosyncratique</strong> (bouge-t-il assez, tout seul, pour payer le straddle ?). C'est un <strong>produit, pas une moyenne</strong> : contrairement à V1, un bon critère ne compense jamais une corrélation trop haute. Les <strong>earnings</strong> et la <strong>liquidité</strong> sont affichés pour information mais n'entrent pas dans V2.</>
                  ) : (
                    <><strong>Pourquoi ce score ?</strong> Le score est une <strong>moyenne pondérée</strong> de cinq critères notés sur 100 : la <strong>corrélation</strong> (45 %, le cœur de la dispersion — on cherche des actions qui bougent indépendamment de l'indice), l'<strong>IV rank</strong> (20 % — sur une action on <strong>achète</strong> la volatilité, donc on la préfère <strong>BASSE dans son historique</strong> : la payer moins cher est un meilleur point d'entrée), le <strong>catalyseur d'earnings</strong> (15 % — un résultat dans la fenêtre crée un gap idiosyncratique qui décorrèle le titre de l'indice, <em>favorable</em> à une dispersion), la <strong>vol idiosyncratique</strong> (10 % — combien l'action bouge indépendamment de l'indice, ce qui fait payer le straddle) et la <strong>liquidité</strong> (10 % — spread réel des options). Plus le score est élevé, meilleur est le composant pour la jambe longue de la stratégie.</>
                  )}
                </BeginnerExplanationBox>
              )}

              {/* Add to list */}
              <div style={{ padding: '14px 16px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ font: 'var(--type-body-sm)', color: 'var(--text-soft)', flex: '0 0 auto' }}>Ajouter à une liste :</span>
                <select value={selectedList} onChange={e => setSelectedList(e.target.value)} style={{
                  flex: 1, minWidth: 160, background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                  color: 'var(--text)', font: 'var(--type-body-sm)', padding: '7px 10px', cursor: 'pointer', outline: 'none',
                }}>
                  <option value="">— Choisir une liste —</option>
                  {eligibleLists.map(l => <option key={l.id} value={l.id}>{l.name} ({l.index_symbol})</option>)}
                </select>
                <button onClick={handleAdd} disabled={!selectedList || adding}
                  style={{ font: '600 12px/1 var(--font-sans)', padding: '8px 16px', borderRadius: 'var(--radius)', border: 'none', background: selectedList && !adding ? 'var(--accent)' : 'var(--bg-hover)', color: selectedList && !adding ? '#fff' : 'var(--text-muted)', cursor: selectedList && !adding ? 'pointer' : 'not-allowed', transition: 'all var(--dur-fast) var(--ease)' }}>
                  {adding ? '…' : 'Ajouter'}
                </button>
                <button onClick={() => { onClose(); window.dispatchEvent(new CustomEvent('dx-new-list', { detail: { indexSymbol, ticker: stockTicker } })); }}
                  style={{ font: '600 12px/1 var(--font-sans)', padding: '8px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>
                  + Nouvelle
                </button>
              </div>

              {/* IV source */}
              <div style={{ font: 'var(--type-caption)', color: 'var(--text-dim)', textAlign: 'center' }}>
                Source IV : {stock.iv_source === 'ibkr' ? '✓ IBKR (réelle)' : stock.iv_source === 'marketdata' ? '✓ MarketData (réelle)' : stock.iv_source === 'alpaca' ? '✓ Alpaca (réelle)' : stock.iv_source === 'yahoo' ? '✓ Yahoo Finance (réelle)' : stock.iv_source === 'thetadata' ? '✓ ThetaData (réelle)' : stock.iv_source === 'estimated_from_hv' ? '⚠ Estimée depuis HV' : stock.iv_source || 'Inconnue'}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

window.ScoreModal = ScoreModal;
