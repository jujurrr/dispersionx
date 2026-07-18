/* ─── Mes exécutions : ce que j'ai VRAIMENT payé ───────────────────────────
   Tout ce que le site dit d'une position repose sur une prime THÉORIQUE
   (Black-Scholes au milieu du marché). Le prix réellement payé n'existe nulle
   part. Or la recherche désigne l'exécution comme le seul levier qui reste à un
   particulier — encore faut-il la mesurer.

   Deux voies, l'import d'abord :
   · Rapport IBKR (relevé d'activité ou Flex Query) — rien à saisir.
   · Saisie manuelle — repli pour les autres courtiers, ou pour compléter.

   ⚠ Le fichier est lu DANS LE NAVIGATEUR et n'est jamais transmis : un relevé
   IBKR contient le numéro de compte, les soldes et toutes les positions.

   NON CASSANT : les exécutions sont un ajout facultatif au blob de stratégie.
   Rien d'autre ne les lit pour l'instant — sans saisie, le suivi se comporte
   exactement comme avant. */
function FillsDialog({ strategy, onClose, onSaved, addToast }) {
  const CONTRACT = (window.DXRisk && window.DXRisk.CONTRACT) || 100;
  const IMP = window.DXIbkrImport;
  const [tab, setTab] = React.useState('import');
  const [straddles, setStraddles] = React.useState(() => {
    // Reprend une saisie précédente pour pouvoir la corriger.
    const f = strategy?.fills?.legs;
    if (!f) return null;
    const o = {};
    for (const [k, v] of Object.entries(f)) o[k] = { underlying: k, complete: true, price: v.price, qty: v.qty, comm: v.comm || 0, expiries: [], strikes: [] };
    return o;
  });
  const [source, setSource] = React.useState(strategy?.fills?.source || null);
  const [warnings, setWarnings] = React.useState([]);
  const [manual, setManual] = React.useState(() => {
    const seed = {};
    const f = strategy?.fills?.legs || {};
    const put = (t, q) => { const v = f[String(t).toUpperCase()]; seed[t] = { price: v ? String(v.price) : '', qty: v ? String(v.qty) : String(q ?? ''), comm: v ? String(v.comm || '') : '' }; };
    put(strategy?.indexEtf || strategy?.index, strategy?.nIndex || 1);
    (strategy?.components || []).forEach(c => put(c.ticker, c.nContracts));
    return seed;
  });
  const fileRef = React.useRef(null);

  const fmt = n => (n == null || !isFinite(n)) ? '—' : (window.DXMoney ? window.DXMoney.format(n) : Math.round(n).toLocaleString('fr-FR') + ' $');
  const sym = () => window.DXMoney ? window.DXMoney.symbol() : '$';

  function readFile(file) {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      const parsed = IMP.parse(String(r.result || ''));
      setWarnings(parsed.warnings || []);
      if (!parsed.legs.length) { setStraddles(null); addToast && addToast('Aucune exécution d\'option lue — voir le détail.', 'error'); return; }
      const s = IMP.toStraddles(parsed.legs);
      setStraddles(s);
      setSource('ibkr');
      addToast && addToast(`${parsed.legs.length} exécutions lues (${Object.keys(s).length} sous-jacents).`);
    };
    r.onerror = () => addToast && addToast('Lecture du fichier impossible.', 'error');
    r.readAsText(file);
  }

  // Saisie manuelle → même forme que l'import, pour n'avoir qu'un seul chemin ensuite.
  function buildFromManual() {
    const o = {};
    for (const [t, v] of Object.entries(manual)) {
      const price = parseFloat(String(v.price).replace(',', '.'));
      const qty = parseFloat(String(v.qty).replace(',', '.'));
      if (!(price > 0) || !(qty > 0)) continue;
      o[String(t).toUpperCase()] = { underlying: String(t).toUpperCase(), complete: true, price, qty,
        comm: Math.abs(parseFloat(String(v.comm).replace(',', '.')) || 0), expiries: [], strikes: [] };
    }
    return o;
  }

  const active = tab === 'manuel' ? buildFromManual() : straddles;
  const match = (active && IMP) ? IMP.matchStrategy(active, strategy, CONTRACT) : null;
  const rows = match?.rows || [];
  const chiffrees = rows.filter(r => r.ecart != null);
  const ecartTotal = chiffrees.reduce((s, r) => s + r.ecart, 0);

  // Spread ATTENDU à l'entrée, depuis la table de coûts mesurée : `cv` est le coût
  // ALLER-RETOUR en points de vol ; à l'entrée on n'en paie que la moitié.
  const TAB = window.DXCostComp || {};
  const attendu = (strategy?.components || []).reduce((s, c) => {
    const cv = TAB[String(c.ticker).toUpperCase()]?.cv?.[0];
    return s + ((cv > 0 && c.vega > 0) ? 0.5 * cv * c.vega : 0);
  }, 0);

  function save() {
    if (!active || !Object.keys(active).length) { addToast && addToast('Rien à enregistrer.', 'info'); return; }
    const legs = {};
    for (const [k, v] of Object.entries(active)) if (v.complete && v.price > 0) legs[k] = { price: v.price, qty: v.qty, comm: v.comm || 0 };
    const s = { ...strategy, fills: { at: new Date().toISOString(), source: tab === 'manuel' ? 'manuel' : (source || 'ibkr'), legs } };
    delete s.displayName; delete s.listName;   // champs dérivés au rendu, pas à persister
    DXApi.saveStrategy(strategy.listId, s);
    addToast && addToast(`Exécutions enregistrées (${Object.keys(legs).length} jambes).`);
    onSaved && onSaved(s);
    onClose && onClose();
  }

  const th = { padding: '8px 10px', font: '600 9px/1 var(--font-mono)', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' };
  const td = { padding: '8px 10px', font: '11px/1.4 var(--font-mono)', color: 'var(--text-soft)' };
  const inp = { width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text)', font: '11px/1 var(--font-mono)', padding: '6px 8px', outline: 'none', boxSizing: 'border-box' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose && onClose(); }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-lg)', padding: 22, width: '100%', maxWidth: 780, maxHeight: '88vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <div style={{ font: 'var(--type-h3)', color: 'var(--text)' }}>Mes exécutions réelles</div>
          <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', marginTop: 4 }}>
            Le suivi utilise aujourd'hui une prime théorique. Enregistrez vos vrais prix pour savoir ce que l'exécution vous a réellement coûté.
          </div>
        </div>

        <div style={{ display: 'flex', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-pill)', padding: 3, alignSelf: 'flex-start' }}>
          {[['import', '⇩ Rapport IBKR'], ['manuel', '✎ Saisie manuelle']].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{ font: '600 11px/1 var(--font-sans)', padding: '6px 12px', borderRadius: 'var(--radius-pill)', border: 'none', cursor: 'pointer',
              background: tab === k ? 'var(--accent)' : 'transparent', color: tab === k ? '#fff' : 'var(--text-muted)' }}>{l}</button>
          ))}
        </div>

        {tab === 'import' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display: 'none' }} onChange={e => { readFile(e.target.files[0]); e.target.value = ''; }} />
            <div onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); readFile(e.dataTransfer.files[0]); }}
              style={{ padding: '22px 16px', textAlign: 'center', border: '1px dashed var(--border-strong)', borderRadius: 'var(--radius-lg)', cursor: 'pointer', background: 'var(--bg-elevated)' }}>
              <div style={{ font: 'var(--type-body-sm)', color: 'var(--text-soft)' }}>Déposez votre rapport IBKR, ou cliquez pour le choisir</div>
              <div style={{ font: 'var(--type-caption)', color: 'var(--text-dim)', marginTop: 5 }}>
                TWS ▸ Rapports ▸ Relevés ▸ Activité (CSV), ou un Flex Query « Trades ».
                {' '}Le fichier est lu <strong>dans votre navigateur</strong> et n'est jamais transmis.
              </div>
            </div>
            {warnings.length > 0 && (
              <div style={{ padding: '9px 12px', background: 'var(--warn-soft)', border: '1px solid var(--warn)', borderRadius: 'var(--radius)', font: 'var(--type-caption)', color: 'var(--text-soft)' }}>
                {warnings.slice(0, 4).map((w, i) => <div key={i}>· {w}</div>)}
              </div>
            )}
          </div>
        ) : (
          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 480, borderCollapse: 'collapse' }}>
              <thead><tr style={{ background: 'var(--bg-elevated)' }}>
                {['Jambe', `Prix du straddle (${sym()})`, 'Contrats', `Commissions (${sym()})`].map((h, i) => <th key={h} style={{ ...th, textAlign: i ? 'right' : 'left' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {Object.keys(manual).map(t => (
                  <tr key={t} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    <td style={{ ...td, color: 'var(--text)', fontWeight: 600 }}>{t}</td>
                    {['price', 'qty', 'comm'].map(f => (
                      <td key={f} style={{ padding: '6px 8px', width: 120 }}>
                        <input value={manual[t][f]} inputMode="decimal" placeholder={f === 'comm' ? '0' : ''}
                          onChange={e => setManual(m => ({ ...m, [t]: { ...m[t], [f]: e.target.value } }))}
                          style={{ ...inp, textAlign: 'right' }} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ padding: '8px 10px', font: 'var(--type-caption)', color: 'var(--text-dim)' }}>
              Prix du straddle = call + put, par contrat. Laissez vide une jambe non exécutée.
            </div>
          </div>
        )}

        {/* ── Comparaison : ce que le modèle prévoyait vs ce que vous avez payé ── */}
        {rows.length > 0 && (
          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 560, borderCollapse: 'collapse' }}>
              <thead><tr style={{ background: 'var(--bg-elevated)' }}>
                {['Jambe', 'Sens', 'Prévu', 'Réel', 'Écart défavorable'].map((h, i) => <th key={h} style={{ ...th, textAlign: i ? 'right' : 'left' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.ticker} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    <td style={{ ...td, color: 'var(--text)', fontWeight: 600 }}>
                      {r.ticker}
                      {r.qtyMismatch && <span title="quantité différente de la construction" style={{ color: 'var(--warn)' }}> ⚠</span>}
                      {r.unbalanced && <span title="call et put en quantités différentes" style={{ color: 'var(--warn)' }}> ⚠</span>}
                    </td>
                    <td style={{ ...td, textAlign: 'right', color: r.side === 'sell' ? 'var(--neg-bright)' : 'var(--pos-bright)' }}>{r.side === 'sell' ? 'Vendu' : 'Acheté'}</td>
                    <td style={{ ...td, textAlign: 'right' }}>{fmt(r.planTotal)}</td>
                    <td style={{ ...td, textAlign: 'right', color: r.matched ? 'var(--text)' : 'var(--text-dim)' }}>
                      {r.matched ? (r.complete ? fmt(r.realTotal) : 'jambe incomplète') : 'non exécutée'}
                    </td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: r.ecart == null ? 'var(--text-dim)' : r.ecart > 0 ? 'var(--neg-bright)' : 'var(--pos-bright)' }}>
                      {r.ecart == null ? '—' : (r.ecart > 0 ? '+' : '') + fmt(r.ecart)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: 'var(--bg-elevated)', borderTop: '1px solid var(--border)' }}>
                  <td colSpan={4} style={{ ...td, fontWeight: 700, color: 'var(--text-muted)' }}>
                    Écart total sur {chiffrees.length} jambe{chiffrees.length > 1 ? 's' : ''} chiffrée{chiffrees.length > 1 ? 's' : ''}
                  </td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: ecartTotal > 0 ? 'var(--neg-bright)' : 'var(--pos-bright)' }}>
                    {(ecartTotal > 0 ? '+' : '') + fmt(ecartTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
            <div style={{ padding: '10px 12px', font: 'var(--type-caption)', color: 'var(--text-muted)', lineHeight: 1.6, borderTop: '1px solid var(--border-subtle)' }}>
              {attendu > 0 && (
                <>Spread <strong style={{ color: 'var(--text-soft)' }}>attendu</strong> à l'entrée sur les jambes achetées, d'après la table de coûts mesurée : <strong style={{ color: 'var(--text-soft)' }}>{fmt(attendu)}</strong>. </>
              )}
              L'écart ci-dessus compare votre exécution à la prime <strong>théorique</strong> du modèle : il mêle le spread payé,
              les commissions et l'écart du modèle au marché. Isoler le seul dérapage d'exécution demanderait le prix de marché
              à la seconde de l'ordre — ce n'est pas ce qui est mesuré ici.
            </div>
          </div>
        )}

        {match?.unmatched?.length > 0 && (
          <div style={{ font: 'var(--type-caption)', color: 'var(--warn)' }}>
            Exécutions lues sans jambe correspondante dans cette stratégie : {match.unmatched.join(', ')}.
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ font: '600 12px/1 var(--font-sans)', padding: '9px 16px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>Fermer</button>
          <button onClick={save} disabled={!rows.some(r => r.matched)}
            style={{ font: '600 12px/1 var(--font-sans)', padding: '9px 18px', borderRadius: 'var(--radius)', border: 'none', background: rows.some(r => r.matched) ? 'var(--accent)' : 'var(--bg-elevated)', color: rows.some(r => r.matched) ? '#fff' : 'var(--text-dim)', cursor: rows.some(r => r.matched) ? 'pointer' : 'not-allowed' }}>
            Enregistrer mes exécutions
          </button>
        </div>
      </div>
    </div>
  );
}

window.DXFillsDialog = FillsDialog;
