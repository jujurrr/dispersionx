/* ─── Score Modal: full auto-score detail ─────────────────────── */
function ScoreModal({ indexSymbol, stockTicker, duration, lists, onClose, onAddedToList, addToast, mode, onScoreLoaded }) {
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
      // Surcouche : IV ATM + greeks réels (MarketData → Alpaca options)
      DXApi.getOptionAtm(stockTicker, duration).then(opt => {
        if (opt && opt.iv) {
          setData(prev => prev ? { ...prev, stock: { ...prev.stock, iv: opt.iv, greeks: opt.greeks, iv_source: opt.source || 'marketdata' } } : prev);
        }
      }).catch(() => {});
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
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', font: 'var(--type-body)' }}>Calcul du score de dispersion…</div>
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

              {/* Hero score */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '18px 22px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
                <div style={{ font: '800 52px/1 var(--font-mono)', color: sigColor[scoring.signal_color] || 'var(--text)' }}>
                  {scoring.score}
                </div>
                <div>
                  <ScoreBadge score={scoring.score} label={scoring.signal} />
                  <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', marginTop: 8 }}>Score de dispersion / 100</div>
                </div>
              </div>

              {/* Components A/B/C */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                {[
                  { l: 'A · Edge ρ', v: (scoring.comp_a_edge >= 0 ? '+' : '') + scoring.comp_a_edge?.toFixed(1), sub: `${(scoring.rho_implicit_final * 100)?.toFixed(0)}% → ${(scoring.rho_real_expected * 100)?.toFixed(0)}%`, color: 'var(--pos-bright)' },
                  { l: 'B · IV − HV', v: (scoring.comp_b_vol_premium >= 0 ? '+' : '') + scoring.comp_b_vol_premium?.toFixed(1), sub: `HV ${stock.hv?.toFixed(1)}% / IV ${stock.iv?.toFixed(1)}%`, color: 'var(--accent-hover)' },
                  { l: 'C · Coûts', v: (scoring.comp_c_costs >= 0 ? '+' : '') + scoring.comp_c_costs?.toFixed(1), sub: scoring.cost_source === 'real_bidask' ? `Spread réel ${scoring.spread_pct_real?.toFixed(2)}%` : 'Estimé', color: 'var(--neg-bright)' },
                  { l: 'β · Poids', v: stock.beta?.toFixed(2) + ' β', sub: `Poids ${stock.weight?.toFixed(1)}%`, color: 'var(--info)' },
                ].map(m => (
                  <div key={m.l} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '12px 14px' }}>
                    <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 6 }}>{m.l}</div>
                    <div style={{ font: '700 18px/1 var(--font-mono)', color: m.color }}>{m.v}</div>
                    <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', marginTop: 4 }}>{m.sub}</div>
                  </div>
                ))}
              </div>

              {/* Sub-scores */}
              <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', padding: '14px 16px', border: '1px solid var(--border)' }}>
                <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 12 }}>Sous-scores décomposés</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {Object.entries({
                    liquidity: 'Liquidité',
                    vol_attractive: 'Attractivité vol',
                    dispersion_contrib: 'Apport dispersion',
                    execution: 'Exécution',
                    event_risk: 'Risque event',
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
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* IV Rank */}
              {stock.iv_rank && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, padding: '14px 16px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 4 }}>IV Rank</div>
                    <div style={{ font: '700 22px/1 var(--font-mono)', color: 'var(--text)' }}>{stock.iv_rank.iv_rank}%</div>
                  </div>
                  <div>
                    <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 4 }}>IV Percentile</div>
                    <div style={{ font: '700 22px/1 var(--font-mono)', color: 'var(--text)' }}>{stock.iv_rank.iv_percentile}%</div>
                  </div>
                  <div>
                    <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 4 }}>Range annuel</div>
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
                      { l: 'Strike', v: '$' + stock.greeks.strike },
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
                  <strong>Pourquoi ce score ?</strong> Le score combine trois composantes : A = l'avantage de corrélation (implicite vs réalisée), B = la prime de volatilité (IV supérieure à HV), et C = les coûts d'exécution (spread bid/ask). Plus le score est élevé, meilleur est le rapport avantage/risque du composant dans la stratégie.
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
