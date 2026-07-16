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
    DXApi.autoScore(indexSymbol, stockTicker, duration).then(d => {
      setData(d);
      setLoading(false);
      onScoreLoaded && onScoreLoaded(stockTicker, d?.scoring?.score);
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
          const { scoring, stock, index: idx } = data;
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
                <strong style={{ color: 'var(--text-soft)' }}>Comment lire ce score.</strong> Il classe l'<strong>apport de ce composant à une dispersion</strong> : bouge-t-il assez indépendamment de l'indice, sa volatilité est-elle attractive, ses options sont-elles traitables. Nos tests sur 2 ans confirment qu'il <strong>prédit bien la corrélation</strong> à venir — mais il ne prédit <strong>pas le gain</strong> : dans nos backtests, le panier le mieux classé est celui qui capture le mieux la corrélation, et pourtant pas celui au meilleur résultat net de frais. C'est un outil d'<strong>analyse</strong>, pas un signal d'achat : le résultat se joue au moment du trade, sur le coût d'exécution et la taille.
              </div>

              {/* Components A/B/C */}
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

              {/* Prime de corrélation (signal desk) — ρ implicite RÉELLE du panier vs ρ réalisée */}
              {scoring.corr_risk_premium != null && (
                <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', textAlign: 'center', marginTop: -8 }}>
                  Prime de corrélation :{' '}
                  <strong style={{ color: scoring.corr_risk_premium > 0 ? 'var(--pos-bright)' : 'var(--neg-bright)' }}>
                    {scoring.corr_risk_premium > 0 ? '+' : ''}{(scoring.corr_risk_premium * 100).toFixed(0)} pts
                  </strong>{' '}
                  (ρ implicite {scoring.rho_impl_source === 'basket_cboe' ? 'réelle Cboe' : 'défaut'} {(scoring.rho_implicit_final * 100).toFixed(0)}% − ρ réalisée {(scoring.rho_real_expected * 100).toFixed(0)}%)
                </div>
              )}

              {/* Sub-scores */}
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

              {/* IV Rank */}
              {stock.iv_rank && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, padding: '14px 16px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 4 }}>{stock.iv_rank.method === 'true_iv' ? 'IV Rank (réel)' : 'IV Rank (estimé HV)'}</div>
                    <div style={{ font: '700 22px/1 var(--font-mono)', color: 'var(--text)' }}>{stock.iv_rank.iv_rank}%</div>
                    {stock.iv_rank.method !== 'true_iv' && stock.iv_rank.true_days > 0 && (
                      <div style={{ font: 'var(--type-caption)', color: 'var(--text-dim)', marginTop: 2 }}>vrai IV rank en constitution · {stock.iv_rank.true_days} j</div>
                    )}
                  </div>
                  <div>
                    <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 4 }}>IV Percentile</div>
                    <div style={{ font: '700 22px/1 var(--font-mono)', color: 'var(--text)' }}>{stock.iv_rank.iv_percentile}%</div>
                  </div>
                  <div>
                    <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 4 }}>{stock.iv_rank.method === 'true_iv' ? 'Range 52 sem. (IV)' : 'Range 1 an (HV)'}</div>
                    <div style={{ font: 'var(--type-data-sm)', color: 'var(--text-soft)' }}>{stock.iv_rank.iv_min?.toFixed(1)}% – {stock.iv_rank.iv_max?.toFixed(1)}%</div>
                    <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', marginTop: 2 }}>{stock.iv_rank.note}</div>
                  </div>
                </div>
              )}

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
                  <strong>Pourquoi ce score ?</strong> Le score est une <strong>moyenne pondérée</strong> de cinq critères notés sur 100 : la <strong>corrélation</strong> (45 %, le cœur de la dispersion — on cherche des actions qui bougent indépendamment de l'indice), l'<strong>IV rank</strong> (20 % — sur une action on <strong>achète</strong> la volatilité, donc on la préfère <strong>BASSE dans son historique</strong> : la payer moins cher est un meilleur point d'entrée), le <strong>catalyseur d'earnings</strong> (15 % — un résultat dans la fenêtre crée un gap idiosyncratique qui décorrèle le titre de l'indice, <em>favorable</em> à une dispersion), la <strong>vol idiosyncratique</strong> (10 % — combien l'action bouge indépendamment de l'indice, ce qui fait payer le straddle) et la <strong>liquidité</strong> (10 % — spread réel des options). Plus le score est élevé, meilleur est le composant pour la jambe longue de la stratégie.
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
