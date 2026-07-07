/* ─── Journal de trades / track record (module Pro) ───
   Enregistre les dispersions entrées, suit réalisé vs attendu, bâtit une
   performance dans le temps. Stocké côté cloud (RLS). Peut être pré-rempli
   depuis une opportunité (onNav('journal', { prefill })) ou une liste. */

const DXJ_INDICES = ['SPX', 'NDX', 'DJI', 'CAC', 'DAX'];
const DXJ_HORIZONS = [15, 30, 45, 60];
const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtNum = n => (n >= 0 ? '+' : '−') + Math.abs(n).toLocaleString('fr-FR', { maximumFractionDigits: 2 });
const fmtD = d => d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

function Journal({ onNav, addToast, pro, lists, prefill }) {
  const DS = window.DispersionXDesignSystem_cb86be;
  const { Button, Badge } = DS;
  const C = window.DXCloud;
  const canCloud = !!(C && C.enabled && C.trades);

  const [items, setItems] = React.useState(null);
  const [showForm, setShowForm] = React.useState(false);
  const [form, setForm] = React.useState({ label: '', index: 'SPX', tickers: [], entry_date: todayISO(), horizon: 30, entry_pct: '', entry_prime: '', notes: '' });
  const [busy, setBusy] = React.useState(false);
  const [closing, setClosing] = React.useState(null);   // { id, exit_date, pnl, outcome, notes }
  const appliedPrefill = React.useRef(false);

  React.useEffect(() => { if (canCloud) refresh(); /* eslint-disable-next-line */ }, [canCloud]);
  React.useEffect(() => {
    if (prefill && !appliedPrefill.current) {
      appliedPrefill.current = true;
      setForm(f => ({ ...f, label: prefill.label || f.label, index: prefill.index || f.index, tickers: prefill.tickers || [], horizon: prefill.horizon || f.horizon, entry_pct: prefill.entry_pct != null ? prefill.entry_pct : '', entry_prime: prefill.entry_prime != null ? prefill.entry_prime : '', entry_date: todayISO() }));
      setShowForm(true);
    }
  }, [prefill]);

  async function refresh() { try { setItems(await C.trades.list()); } catch { setItems([]); } }

  function pickList(id) {
    const l = (lists || []).find(x => String(x.id) === String(id));
    if (!l) { setForm(f => ({ ...f, tickers: [] })); return; }
    setForm(f => ({ ...f, index: l.index_symbol || f.index, tickers: (l.items || []).map(i => i.ticker).filter(Boolean), label: f.label || `Dispersion ${l.name}` }));
  }
  async function save() {
    if (!form.label.trim()) { addToast && addToast('Donnez un nom au trade.', 'error'); return; }
    setBusy(true);
    try {
      await C.trades.create(form);
      addToast && addToast('Trade enregistré.', 'ok');
      setForm({ label: '', index: 'SPX', tickers: [], entry_date: todayISO(), horizon: 30, entry_pct: '', entry_prime: '', notes: '' });
      setShowForm(false); appliedPrefill.current = false;
      await refresh();
    } catch (e) { addToast && addToast('Enregistrement impossible : ' + (e && e.message ? e.message : ''), 'error'); }
    finally { setBusy(false); }
  }
  async function doClose() {
    setBusy(true);
    try { await C.trades.close(closing.id, closing); setClosing(null); await refresh(); addToast && addToast('Trade clôturé.', 'ok'); }
    catch (e) { addToast && addToast('Clôture impossible : ' + (e && e.message ? e.message : ''), 'error'); }
    finally { setBusy(false); }
  }
  async function reopen(t) { try { await C.trades.reopen(t.id); await refresh(); } catch {} }
  async function remove(t) { try { await C.trades.remove(t.id); await refresh(); } catch {} }

  // ── Écran verrouillé (non Pro) : carte d'upsell contextuelle partagée ──
  if (!pro) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}>
        <window.ProUpsellCard context="journal" onNav={onNav} addToast={addToast} />
      </div>
    );
  }

  const input = { background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '9px 12px', color: 'var(--text)', font: 'var(--type-body-sm)', outline: 'none' };
  const label = { font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 5, display: 'block' };

  // Track record
  const all = items || [];
  const closed = all.filter(t => t.status === 'closed');
  const withOutcome = closed.filter(t => t.outcome);
  const wins = withOutcome.filter(t => t.outcome === 'win').length;
  const winRate = withOutcome.length ? Math.round((wins / withOutcome.length) * 100) : null;
  const cumPnl = closed.reduce((s, t) => s + (Number(t.pnl) || 0), 0);
  const openCount = all.filter(t => t.status === 'open').length;
  const pctVals = all.map(t => t.entry_pct).filter(v => v != null);
  const avgPct = pctVals.length ? Math.round(pctVals.reduce((a, b) => a + b, 0) / pctVals.length) : null;

  const stat = (l, v, c) => (
    <div style={{ padding: '12px 14px', borderRadius: 'var(--radius)', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)' }}>{l}</div>
      <div style={{ font: 'var(--type-data)', color: c || 'var(--text)', marginTop: 3 }}>{v}</div>
    </div>
  );
  const outcomeBadge = o => o === 'win' ? <Badge tone="pos" size="sm">Gagnant</Badge> : o === 'loss' ? <Badge tone="neg" size="sm">Perdant</Badge> : o === 'flat' ? <Badge tone="neutral" size="sm">Neutre</Badge> : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <h1 style={{ font: 'var(--type-h1)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: 0 }}>Journal de trades</h1>
            <Badge tone="accent" size="sm">Pro</Badge>
          </div>
          <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)', margin: 0, maxWidth: 680 }}>
            Enregistrez vos dispersions et suivez votre performance : réalisé vs attendu, taux de réussite, P&L cumulé.
          </p>
        </div>
        {canCloud && <Button variant="primary" size="md" onClick={() => setShowForm(s => !s)}>{showForm ? 'Fermer' : '+ Nouveau trade'}</Button>}
      </div>

      {!canCloud ? (
        <div style={{ padding: '18px 20px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}>
          Connectez-vous pour tenir votre journal de trades et bâtir votre track record.
        </div>
      ) : (
        <>
          {/* Track record */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
            {stat('Trades', all.length)}
            {stat('Ouverts', openCount, 'var(--accent-hover)')}
            {stat('Taux de réussite', winRate != null ? winRate + '%' : '—', winRate != null ? (winRate >= 55 ? 'var(--pos-bright)' : winRate >= 45 ? 'var(--text)' : 'var(--neg-bright)') : 'var(--text-dim)')}
            {stat('P&L cumulé', closed.length ? fmtNum(cumPnl) : '—', cumPnl >= 0 ? 'var(--pos-bright)' : 'var(--neg-bright)')}
            {stat('Entrée moy. (pct ρ)', avgPct != null ? avgPct + 'e' : '—', 'var(--info)')}
          </div>

          {/* Formulaire nouveau trade */}
          {showForm && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--accent-border)', borderRadius: 'var(--radius-lg)', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ font: 'var(--type-title)', color: 'var(--text)' }}>Nouveau trade</div>
              <div>
                <label style={label}>Nom du trade</label>
                <input style={{ ...input, width: '100%', boxSizing: 'border-box' }} value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="ex. Dispersion SPX tech" maxLength={80} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                <div>
                  <label style={label}>Depuis une liste (option)</label>
                  <select style={{ ...input, width: '100%' }} onChange={e => pickList(e.target.value)} defaultValue="">
                    <option value="">— Aucune —</option>
                    {(lists || []).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={label}>Indice</label>
                  <select style={{ ...input, width: '100%' }} value={form.index} onChange={e => setForm(f => ({ ...f, index: e.target.value }))}>
                    {DXJ_INDICES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={label}>Date d'entrée</label>
                  <input type="date" style={{ ...input, width: '100%' }} value={form.entry_date} onChange={e => setForm(f => ({ ...f, entry_date: e.target.value }))} />
                </div>
                <div>
                  <label style={label}>Horizon</label>
                  <select style={{ ...input, width: '100%' }} value={form.horizon} onChange={e => setForm(f => ({ ...f, horizon: Number(e.target.value) }))}>
                    {DXJ_HORIZONS.map(d => <option key={d} value={d}>{d} jours</option>)}
                  </select>
                </div>
                <div>
                  <label style={label}>Percentile ρ à l'entrée</label>
                  <input type="number" min={0} max={100} style={{ ...input, width: '100%' }} value={form.entry_pct} onChange={e => setForm(f => ({ ...f, entry_pct: e.target.value }))} placeholder="ex. 82" />
                </div>
                <div>
                  <label style={label}>Prime attendue (pts)</label>
                  <input type="number" step="0.1" style={{ ...input, width: '100%' }} value={form.entry_prime} onChange={e => setForm(f => ({ ...f, entry_prime: e.target.value }))} placeholder="ex. 9.4" />
                </div>
              </div>
              {form.tickers.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {form.tickers.map(t => <span key={t} style={{ font: '600 11px/1 var(--font-mono)', padding: '4px 9px', borderRadius: 999, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-soft)' }}>{t}</span>)}
                </div>
              )}
              <div>
                <label style={label}>Notes (option)</label>
                <textarea style={{ ...input, width: '100%', boxSizing: 'border-box', resize: 'vertical', minHeight: 54 }} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Thèse, conditions d'entrée…" />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <Button variant="primary" size="md" onClick={save} disabled={busy || !form.label.trim()}>{busy ? 'Enregistrement…' : 'Enregistrer le trade'}</Button>
                <Button variant="ghost" size="md" onClick={() => setShowForm(false)}>Annuler</Button>
              </div>
            </div>
          )}

          {/* Liste des trades */}
          {items === null ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', font: 'var(--type-body-sm)' }}>Chargement…</div>
          ) : all.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', font: 'var(--type-body-sm)', background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)' }}>
              Aucun trade pour l'instant. Enregistrez votre première dispersion, ou utilisez « Journaliser » depuis une opportunité.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {all.map(t => (
                <div key={t.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 180 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ font: 'var(--type-title)', color: 'var(--text)' }}>{t.label || 'Trade'}</span>
                        {t.index_symbol && <span style={{ font: '700 11px/1 var(--font-mono)', color: 'var(--text-muted)' }}>{t.index_symbol}</span>}
                        {t.status === 'open' ? <Badge tone="accent" size="sm">Ouvert</Badge> : outcomeBadge(t.outcome) || <Badge tone="neutral" size="sm">Clôturé</Badge>}
                      </div>
                      <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', marginTop: 3 }}>
                        Entrée {fmtD(t.entry_date)}{t.horizon ? ` · ${t.horizon}j` : ''}{t.entry_pct != null ? ` · ${t.entry_pct}e pct` : ''}{t.entry_prime != null ? ` · prime att. ${t.entry_prime > 0 ? '+' : ''}${t.entry_prime} pts` : ''}
                        {t.status === 'closed' ? ` · sortie ${fmtD(t.exit_date)}` : ''}
                      </div>
                    </div>
                    {t.status === 'closed' && t.pnl != null && (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ font: 'var(--type-data)', color: Number(t.pnl) >= 0 ? 'var(--pos-bright)' : 'var(--neg-bright)' }}>{fmtNum(Number(t.pnl))}</div>
                        <div style={{ font: 'var(--type-caption)', color: 'var(--text-dim)' }}>P&L</div>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 6 }}>
                      {window.DXReport && (
                        <button onClick={() => window.DXReport.trade(t)} title="Rapport PDF" style={{ font: '600 11px/1 var(--font-sans)', padding: '6px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>Rapport</button>
                      )}
                      {t.status === 'open'
                        ? <button onClick={() => setClosing({ id: t.id, exit_date: todayISO(), pnl: '', outcome: 'win', notes: t.notes || '' })} style={{ font: '600 11px/1 var(--font-sans)', padding: '6px 12px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}>Clôturer</button>
                        : <button onClick={() => reopen(t)} style={{ font: '600 11px/1 var(--font-sans)', padding: '6px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>Rouvrir</button>}
                      <button onClick={() => remove(t)} title="Supprimer" style={{ font: '600 12px/1 var(--font-mono)', padding: '6px 9px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
                    </div>
                  </div>

                  {t.tickers && t.tickers.length > 0 && (
                    <div style={{ padding: '0 18px 12px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {t.tickers.slice(0, 14).map(tk => <span key={tk} style={{ font: '600 10px/1 var(--font-mono)', padding: '3px 8px', borderRadius: 999, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-soft)' }}>{tk}</span>)}
                    </div>
                  )}
                  {t.notes && <div style={{ padding: '0 18px 12px', font: 'var(--type-caption)', color: 'var(--text-muted)' }}>{t.notes}</div>}

                  {/* Formulaire de clôture */}
                  {closing && closing.id === t.id && (
                    <div style={{ padding: '14px 18px', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                        <div><label style={label}>Date de sortie</label><input type="date" style={{ ...input, width: '100%' }} value={closing.exit_date} onChange={e => setClosing(c => ({ ...c, exit_date: e.target.value }))} /></div>
                        <div><label style={label}>P&L réalisé</label><input type="number" step="0.01" style={{ ...input, width: '100%' }} value={closing.pnl} onChange={e => setClosing(c => ({ ...c, pnl: e.target.value }))} placeholder="ex. 1250 ou 5.2" /></div>
                        <div>
                          <label style={label}>Issue</label>
                          <select style={{ ...input, width: '100%' }} value={closing.outcome} onChange={e => setClosing(c => ({ ...c, outcome: e.target.value }))}>
                            <option value="win">Gagnant</option><option value="loss">Perdant</option><option value="flat">Neutre</option>
                          </select>
                        </div>
                      </div>
                      <div><label style={label}>Notes (option)</label><textarea style={{ ...input, width: '100%', boxSizing: 'border-box', resize: 'vertical', minHeight: 46 }} value={closing.notes} onChange={e => setClosing(c => ({ ...c, notes: e.target.value }))} placeholder="Ce que tu retiens de ce trade…" /></div>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <Button variant="primary" size="sm" onClick={doClose} disabled={busy}>{busy ? '…' : 'Confirmer la clôture'}</Button>
                        <Button variant="ghost" size="sm" onClick={() => setClosing(null)}>Annuler</Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div style={{ font: 'var(--type-caption)', color: 'var(--text-dim)' }}>
            Le P&L est celui que vous saisissez (votre suivi réel). Les chiffres du site restent indicatifs sur données différées/estimées.
          </div>
        </>
      )}
    </div>
  );
}

window.Journal = Journal;
