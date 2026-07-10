/* ─── DXReport : génération de rapports imprimables / PDF (sans dépendance) ───
   Ouvre une fenêtre avec un rapport mis en forme et déclenche l'impression →
   l'utilisateur enregistre en PDF. window.DXReport.trade(t) / .opportunity(ctx). */

function dxEsc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function dxRow(k, v, cls) { return `<div class="row"><span class="k">${k}</span><span class="v ${cls || ''}">${v}</span></div>`; }
function dxMoney(n) {
  const M = (typeof window !== 'undefined') ? window.DXMoney : null;   // devise d'affichage (au moment de la génération du rapport)
  const v = M ? M.convert(Number(n)) : Number(n);
  const sym = M ? M.symbol() : '$';
  return (Number(n) >= 0 ? '+' : '−') + Math.abs(Math.round(v)).toLocaleString('fr-FR') + ' ' + sym;
}

function dxReportShell(title, body) {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${dxEsc(title)}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0f172a;margin:0;padding:32px;background:#fff}
  .wrap{max-width:720px;margin:auto}
  .brand{display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #4f46e5;padding-bottom:12px;margin-bottom:8px}
  .brand h1{font-size:19px;margin:0}.brand .x{color:#4f46e5}
  .muted{color:#64748b;font-size:12px}
  h2{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#475569;margin:22px 0 8px}
  .lead{font-size:16px;font-weight:700;margin:14px 0 2px}
  .row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eef2f7;font-size:13px}
  .row .k{color:#64748b}.row .v{font-weight:600}
  .chips span{display:inline-block;font:600 11px/1 ui-monospace,monospace;padding:4px 8px;margin:3px 3px 0 0;border:1px solid #e2e8f0;border-radius:999px}
  .cards{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px}
  .card{flex:1 1 150px;border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px}
  .card .cl{font-size:11px;color:#64748b}.card .cv{font-size:15px;font-weight:700;margin-top:3px}
  .pos{color:#059669}.neg{color:#dc2626}.warn{color:#d97706}
  .note{font-size:11px;color:#94a3b8;margin-top:26px;border-top:1px solid #eef2f7;padding-top:12px;line-height:1.5}
  @media print{body{padding:0}.wrap{max-width:none}}
</style></head><body><div class="wrap">${body}</div>
<script>window.onload=function(){setTimeout(function(){try{window.print()}catch(e){}},300)}</script>
</body></html>`;
}
function dxOpenReport(title, body) {
  const w = window.open('', '_blank');
  if (!w) { alert('Autorisez les fenêtres pop-up pour générer le rapport PDF.'); return; }
  w.document.open(); w.document.write(dxReportShell(title, body)); w.document.close();
}
function dxBrand(sub) {
  return `<div class="brand"><h1>Dispersion<span class="x">X</span> · ${dxEsc(sub)}</h1><span class="muted">${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>`;
}
const dxNote = 'Rapport indicatif — DispersionX. Données différées/estimées, pas un conseil en investissement.';

window.DXReport = {
  // Rapport d'un trade du journal.
  trade(t) {
    const status = t.status === 'closed' ? (t.outcome === 'win' ? 'Gagnant' : t.outcome === 'loss' ? 'Perdant' : t.outcome === 'flat' ? 'Neutre' : 'Clôturé') : 'Ouvert';
    let b = dxBrand('Rapport de trade');
    b += `<div class="lead">${dxEsc(t.label || 'Trade')}</div>`;
    b += `<div class="muted">${dxEsc(t.index_symbol || '')} · ${status}</div>`;
    b += '<h2>Entrée</h2><div>';
    b += dxRow("Date d'entrée", dxEsc(t.entry_date || '—'));
    if (t.horizon) b += dxRow('Horizon', t.horizon + ' jours');
    if (t.entry_pct != null) b += dxRow('Percentile ρ à l\'entrée', t.entry_pct + 'ᵉ');
    if (t.entry_prime != null) b += dxRow('Prime attendue', (t.entry_prime > 0 ? '+' : '') + t.entry_prime + ' pts');
    b += '</div>';
    if (t.status === 'closed') {
      b += '<h2>Sortie</h2><div>';
      b += dxRow('Date de sortie', dxEsc(t.exit_date || '—'));
      b += dxRow('Issue', status);
      if (t.pnl != null) b += dxRow('P&L réalisé', (Number(t.pnl) >= 0 ? '+' : '') + Number(t.pnl).toLocaleString('fr-FR'), Number(t.pnl) >= 0 ? 'pos' : 'neg');
      b += '</div>';
    }
    if (t.tickers && t.tickers.length) b += `<h2>Composants (${t.tickers.length})</h2><div class="chips">${t.tickers.map(x => `<span>${dxEsc(x)}</span>`).join('')}</div>`;
    if (t.notes) b += `<h2>Notes</h2><p style="font-size:13px;white-space:pre-wrap">${dxEsc(t.notes)}</p>`;
    b += `<div class="note">${dxNote} Le P&L est saisi par l'utilisateur (suivi réel).</div>`;
    dxOpenReport('Rapport de trade — ' + (t.label || 'DispersionX'), b);
  },

  // Rapport d'une opportunité (sizing + risque + coûts + scénarios).
  opportunity({ index, duration, o }) {
    const r = o.risk || {};
    const card = (cl, cv, c) => `<div class="card"><div class="cl">${cl}</div><div class="cv ${c || ''}">${cv}</div></div>`;
    let b = dxBrand('Rapport d\'opportunité');
    b += `<div class="lead">Dispersion ${dxEsc(index)} · ${o.k} actions</div>`;
    b += `<div class="muted">Score d'opportunité ${o.opp}/100 · horizon ${duration} jours</div>`;
    b += '<h2>Signal</h2><div>';
    b += dxRow('Prime de corrélation', (o.prime >= 0 ? '+' : '') + o.prime.toFixed(1) + ' pts');
    b += dxRow('Score moyen', Math.round(o.avgScore) + '/100');
    b += dxRow('ρ réalisée du panier', o.rhoReal.toFixed(2));
    b += '</div>';
    if (r.totalContracts != null) {
      b += '<h2>Construction vega-neutre</h2><div class="cards">';
      b += card('Contrats long', r.totalContracts + ' · 1 indice short');
      b += card('Vega net', dxMoney(r.netVega) + '/1%', Math.abs(r.netVega) < 60 ? 'pos' : 'warn');
      b += card('Theta', dxMoney(r.netTheta) + '/j');
      if (r.edgeRisk != null) b += card('Edge / risque', r.edgeRisk.toFixed(2) + '×', r.edgeRisk >= 1 ? 'pos' : 'warn');
      b += '</div>';
    }
    if (r.cost) {
      b += '<h2>Coûts &amp; capital (estimés)</h2><div class="cards">';
      b += card('Débours net', dxMoney(r.cost.netDebit));
      b += card('Coût d\'exécution', dxMoney(r.cost.execCost), 'warn');
      b += card('Capital estimé', dxMoney(r.cost.capitalEst));
      b += '</div>';
    }
    if (r.scen && r.scen.length) {
      b += '<h2>Scénarios de stress</h2><div class="cards">';
      r.scen.forEach(s => { b += card(dxEsc(s.name), dxMoney(s.pnl), s.pnl >= 0 ? 'pos' : 'neg'); });
      b += '</div>';
    }
    b += `<h2>Composants (${o.members.length})</h2><div class="chips">${o.members.map(x => `<span>${dxEsc(x)}</span>`).join('')}</div>`;
    b += `<div class="note">${dxNote} Coûts/capital : estimations (bid/ask ~2,5% de la prime brute, commissions ~0,65 $/jambe, marge short indice ~15% du notionnel).</div>`;
    dxOpenReport('Rapport opportunité ' + index, b);
  },
};
