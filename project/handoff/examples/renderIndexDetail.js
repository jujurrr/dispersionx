/* ════════════════════════════════════════════════════════════════════════
   EXEMPLE HANDOFF — renderIndexDetail re-skiné, PRÊT À COLLER dans views.js
   ────────────────────────────────────────────────────────────────────────
   Remplace `views.renderIndexDetail` (et ses 3 helpers) du fichier réel
   dispersion_v3/frontend/js/views.js.

   ⚠ LA LOGIQUE EST IDENTIQUE À L'ORIGINAL :
     - mêmes appels : api.getIndex / api.getSnapshot / api.batchQuotes
     - même état _comp { symbol, rows, sortKey, sortDir, filter }
     - même filtre de recherche, même cycle de tri asc→desc→aucun
     - même chargement quotes par lots de 40 (realtime=true)
   Seuls le HTML produit et les classes CSS changent pour adopter la DA.

   PRÉREQUIS (déjà fournis dans handoff/) :
     - dispersionx-theme.css chargé après style.css (variables + classes DA)
     - les classes ci-dessous (.ix-head, .snap, .search, table.comp, etc.)
       sont à ajouter à style.css OU dispersionx-theme.css. Le bloc CSS de
       référence est en bas de ce fichier (commenté).
   ════════════════════════════════════════════════════════════════════════ */

views.renderIndexDetail = async function (symbol) {
  app.setBreadcrumb([
    { label: 'Indices', href: '#/' },
    { label: symbol, current: true },
  ]);

  const view = document.getElementById('view');
  view.innerHTML = '<div class="empty-state"><div class="empty-title">Chargement…</div></div>';

  let idx, snapshot;
  utils.showLoader(`Récupération des données ${symbol}…`);
  try {
    [idx, snapshot] = await Promise.all([
      api.getIndex(symbol),
      api.getSnapshot(symbol).catch(() => null),
    ]);
  } catch (err) {
    utils.hideLoader();
    view.innerHTML = `<div class="empty-state"><div class="empty-title">Erreur</div><div class="empty-desc">${err.message}</div></div>`;
    return;
  }
  utils.hideLoader();

  app.state.currentIndex = idx;
  app.state.duration = app.state.duration || 30;
  if (snapshot && snapshot.error) snapshot = null;

  const up = (snapshot?.change_pct ?? 0) >= 0;

  view.innerHTML = `
    <div class="ix-head">
      <div class="ix-title">
        <span class="ix-flag">${idx.country_flag}</span>
        <div>
          <h1>${utils.escapeHtml(idx.name)}</h1>
          <div class="tags">
            <span class="tag">${idx.symbol}</span>
            <span class="tag">${idx.currency}</span>
            <span class="tag">${idx.components.length} actions</span>
            <span class="tag">ETF ${idx.etf_proxy}</span>
            ${idx.options_liquid ? '<span class="tag live">Options liquides</span>' : ''}
          </div>
        </div>
      </div>
      <div class="ix-price">
        ${snapshot ? `
          <div class="p">${utils.fmtNum(snapshot.last_price, 2)}</div>
          <div class="c ${up ? 'up' : 'down'}">${up ? '▲' : '▼'} ${utils.fmtPct(snapshot.change_pct, 2)}</div>
        ` : '<div style="color:var(--text-muted);font-size:12px;">Snapshot indisponible</div>'}
      </div>
    </div>

    ${snapshot ? `
      <div class="snap">
        <div class="snap-cell"><div class="l">HV 30j</div><div class="v" style="color:var(--amber)">${utils.fmtPct(snapshot.hv_30, 1)}</div></div>
        <div class="snap-cell"><div class="l">HV 1Y</div><div class="v">${utils.fmtPct(snapshot.hv_252, 1)}</div></div>
        <div class="snap-cell"><div class="l">IV estimée</div><div class="v">${utils.fmtPct(snapshot.iv_estimate, 1)}</div></div>
        <div class="snap-cell"><div class="l">Perf 5j</div><div class="v ${(snapshot.perf_5d ?? 0) >= 0 ? 'up' : 'down'}">${utils.fmt(snapshot.perf_5d, 2)}%</div></div>
        <div class="snap-cell"><div class="l">Perf 30j</div><div class="v ${(snapshot.perf_30d ?? 0) >= 0 ? 'up' : 'down'}">${utils.fmt(snapshot.perf_30d, 2)}%</div></div>
        <div class="snap-cell"><div class="l">YTD</div><div class="v ${(snapshot.perf_ytd ?? 0) >= 0 ? 'up' : 'down'}">${utils.fmt(snapshot.perf_ytd, 2)}%</div></div>
      </div>
    ` : ''}

    <div class="strat-bar">
      <span>Durée stratégie</span>
      <div class="pills">
        ${[14, 30, 45, 60, 90].map(d => `<button class="pill ${app.state.duration === d ? 'active' : ''}" data-duration="${d}">${d}j</button>`).join('')}
      </div>
      <span class="hint">Cliquez sur une action pour calculer son score de dispersion</span>
    </div>

    <div class="search">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input type="text" id="component-search" placeholder="Rechercher une action par ticker ou nom..." autocomplete="off">
      <span id="search-count" class="search-count"></span>
    </div>

    <div class="tbl-wrap">
      <table class="comp" id="components-table">
        <thead><tr>
          <th class="l sortable" data-sort="ticker">Action <span class="sort-arrow"></span></th>
          <th class="sortable" data-sort="weight">Poids <span class="sort-arrow"></span></th>
          <th class="sortable" data-sort="price">Prix <span class="sort-arrow"></span></th>
          <th class="sortable" data-sort="day">Jour <span class="sort-arrow"></span></th>
          <th class="sortable" data-sort="week">Semaine <span class="sort-arrow"></span></th>
          <th class="l sortable" data-sort="sector">Secteur <span class="sort-arrow"></span></th>
          <th>Score</th>
        </tr></thead>
        <tbody id="components-tbody"></tbody>
      </table>
    </div>
  `;

  document.querySelectorAll('.pill').forEach(b => {
    b.addEventListener('click', () => {
      app.state.duration = parseInt(b.dataset.duration);
      document.querySelectorAll('.pill').forEach(p => p.classList.toggle('active', parseInt(p.dataset.duration) === app.state.duration));
    });
  });

  // État de la vue — INCHANGÉ par rapport à l'original
  views._comp = {
    symbol: idx.symbol,
    rows: idx.components.map(c => ({ ...c, price: null, day: null, week: null })),
    sortKey: null,
    sortDir: 0,
    filter: '',
  };

  const searchInput = document.getElementById('component-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      views._comp.filter = e.target.value.trim().toLowerCase();
      views.renderComponentsBody();
    });
  }

  views.renderComponentsBody();
  views.wireSortHeaders();
  views.loadQuotesForComponents();
};

// ── corps de table — filtre + tri INCHANGÉS, seul le HTML des lignes change ──
views.renderComponentsBody = function () {
  const st = views._comp;
  let rows = [...st.rows];

  if (st.filter) {
    rows = rows.filter(c =>
      c.ticker.toLowerCase().includes(st.filter) ||
      (c.name || '').toLowerCase().includes(st.filter)
    );
  }
  if (st.filter && (!st.sortKey || st.sortDir === 0)) {
    rows.sort((a, b) => a.ticker.localeCompare(b.ticker));
  }
  if (st.sortKey && st.sortDir !== 0) {
    const k = st.sortKey;
    rows.sort((a, b) => {
      let va = a[k], vb = b[k];
      if (k === 'ticker' || k === 'sector') {
        va = (va || '').toString(); vb = (vb || '').toString();
        return st.sortDir * va.localeCompare(vb);
      }
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      return st.sortDir * (va - vb);
    });
  }

  const countEl = document.getElementById('search-count');
  if (countEl) countEl.textContent = st.filter ? `${rows.length} / ${st.rows.length}` : '';

  const tbody = document.getElementById('components-tbody');
  if (!tbody) return;

  tbody.innerHTML = rows.map(c => {
    const dCls = c.day == null ? '' : (c.day >= 0 ? 'up' : 'down');
    const wCls = c.week == null ? '' : (c.week >= 0 ? 'up' : 'down');
    const dA = c.day == null ? '' : (c.day >= 0 ? '▲' : '▼');
    const wA = c.week == null ? '' : (c.week >= 0 ? '▲' : '▼');
    return `
      <tr data-ticker="${c.ticker}">
        <td><div class="stk">${utils.stockLogoHtml(c.ticker)}<div><div class="stk-ticker">${c.ticker}</div><div class="stk-name">${utils.escapeHtml(c.name)}</div></div></div></td>
        <td><span class="wbar"><span class="wbar-fill" style="width:${Math.min(100, c.weight * 8)}%"></span></span>${utils.fmtPct(c.weight, 2)}</td>
        <td>${c.price == null ? '<span class="q-load">···</span>' : utils.fmtNum(c.price, 2)}</td>
        <td class="${dCls}">${c.day == null ? '<span class="q-load">···</span>' : `${dA} ${utils.fmt(c.day, 2)}%`}</td>
        <td class="${wCls}">${c.week == null ? '<span class="q-load">···</span>' : `${wA} ${utils.fmt(c.week, 2)}%`}</td>
        <td class="l" style="text-align:left;"><span class="sec-tag">${c.sector}</span></td>
        <td><button class="btn-score" data-ticker="${c.ticker}">▶ Score</button></td>
      </tr>`;
  }).join('');

  tbody.querySelectorAll('.btn-score').forEach(b => {
    b.addEventListener('click', (e) => { e.stopPropagation(); views.openStockScoreModal(views._comp.symbol, b.dataset.ticker); });
  });
  tbody.querySelectorAll('tr[data-ticker]').forEach(row => {
    row.addEventListener('click', () => views.openStockScoreModal(views._comp.symbol, row.dataset.ticker));
  });
};

// ── tri au clic — INCHANGÉ ──
views.wireSortHeaders = function () {
  document.querySelectorAll('#components-table th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.dataset.sort;
      const st = views._comp;
      if (st.sortKey === key) {
        st.sortDir = st.sortDir === 1 ? -1 : st.sortDir === -1 ? 0 : 1;
        if (st.sortDir === 0) st.sortKey = null;
      } else {
        st.sortKey = key;
        st.sortDir = 1;
      }
      document.querySelectorAll('#components-table th.sortable .sort-arrow').forEach(a => a.textContent = '');
      if (st.sortKey) {
        const arrow = th.querySelector('.sort-arrow');
        if (arrow) arrow.textContent = st.sortDir === 1 ? ' ↑' : ' ↓';
      }
      views.renderComponentsBody();
    });
  });
};

// ── quotes live par lots de 40 — INCHANGÉ (api.batchQuotes réel) ──
views.loadQuotesForComponents = async function () {
  const st = views._comp;
  const symbols = st.rows.map(r => r.ticker);
  const chunkSize = 40;
  for (let i = 0; i < symbols.length; i += chunkSize) {
    const chunk = symbols.slice(i, i + chunkSize);
    try {
      const quotes = await api.batchQuotes(chunk, true, true);
      st.rows.forEach(r => {
        const q = quotes[r.ticker];
        if (q) {
          if (q.price != null) r.price = q.price;
          if (q.change_pct_day != null) r.day = q.change_pct_day;
          if (q.change_pct_week != null) r.week = q.change_pct_week;
        }
      });
      if (views._comp && views._comp.symbol === st.symbol) views.renderComponentsBody();
      else break;
    } catch (e) {
      console.warn('quotes chunk failed', e);
    }
  }
};

/* ════════════════════════════════════════════════════════════════════════
   CSS DE RÉFÉRENCE — à ajouter à dispersionx-theme.css (ou style.css).
   (Identique au bloc <style> de IndexDetail.reskin.html, section table.)
   ────────────────────────────────────────────────────────────────────────
   .ix-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:18px;}
   .ix-title{display:flex;gap:14px;align-items:center;}
   .ix-flag{font-size:30px;}
   .ix-title h1{font:800 24px/1.1 var(--font-sans);letter-spacing:-0.01em;margin:0;}
   .tags{display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;}
   .tag{font:600 10px/1 var(--font-sans);text-transform:uppercase;letter-spacing:0.05em;padding:4px 8px;border-radius:999px;background:var(--bg-elevated);border:1px solid var(--border);color:var(--text-muted);}
   .tag.live{background:var(--green-soft);border-color:var(--green);color:var(--green-bright);}
   .ix-price .p{font:800 26px/1 var(--font-mono);text-align:right;}
   .ix-price .c{font:600 13px/1 var(--font-mono);margin-top:6px;text-align:right;}
   .snap{display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-bottom:20px;}
   .snap-cell{background:var(--bg-card);border:1px solid var(--border);border-radius:8px;padding:12px 14px;}
   .snap-cell .l{font:600 10px/1 var(--font-sans);text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);margin-bottom:7px;}
   .snap-cell .v{font:700 18px/1 var(--font-mono);}
   .strat-bar{display:flex;align-items:center;gap:14px;margin-bottom:14px;flex-wrap:wrap;}
   .strat-bar>span{font:600 11px/1 var(--font-sans);text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);}
   .pills{display:flex;gap:4px;background:var(--bg-elevated);border:1px solid var(--border);border-radius:999px;padding:3px;}
   .pill{font:600 12px/1 var(--font-mono);padding:6px 13px;border-radius:999px;border:none;background:transparent;color:var(--text-muted);cursor:pointer;transition:all .12s;}
   .pill.active{background:var(--accent);color:#fff;}
   .hint{margin-left:auto;font:400 12px/1.4 var(--font-sans);color:var(--text-dim);}
   .search{display:flex;align-items:center;gap:10px;background:var(--bg-input);border:1px solid var(--border);border-radius:6px;padding:0 14px;margin-bottom:14px;}
   .search:focus-within{border-color:var(--accent);}
   .search svg{color:var(--text-muted);flex-shrink:0;}
   .search input{flex:1;background:none;border:none;outline:none;color:var(--text);font:400 14px/1.5 var(--font-sans);padding:11px 0;}
   .search-count{font:500 12px/1.3 var(--font-mono);color:var(--text-muted);}
   .tbl-wrap{background:var(--bg-card);border:1px solid var(--border);border-radius:8px;overflow:hidden;}
   table.comp{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums;}
   table.comp thead tr{background:var(--bg-elevated);}
   table.comp th{font:600 10px/1 var(--font-sans);text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);padding:11px 14px;text-align:right;border-bottom:1px solid var(--border);white-space:nowrap;}
   table.comp th.l{text-align:left;}
   table.comp th.sortable{cursor:pointer;user-select:none;}
   table.comp th.sortable:hover{color:var(--text-soft);}
   table.comp tbody tr{border-bottom:1px solid var(--border-subtle);cursor:pointer;}
   table.comp tbody tr:hover{background:var(--bg-hover);}
   table.comp td{padding:10px 14px;text-align:right;font:500 12px/1.3 var(--font-mono);color:var(--text-soft);}
   .stk{display:flex;gap:10px;align-items:center;text-align:left;}
   .stk-logo{width:26px;height:26px;border-radius:6px;background:var(--bg-elevated);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font:700 9px/1 var(--font-mono);color:var(--text-soft);}
   .stk-ticker{font:700 13px/1.2 var(--font-mono);color:var(--text);}
   .stk-name{font:400 12px/1.45 var(--font-sans);color:var(--text-muted);margin-top:1px;}
   .wbar{width:54px;height:5px;border-radius:3px;background:var(--bg-elevated);overflow:hidden;display:inline-block;vertical-align:middle;margin-right:7px;}
   .wbar-fill{height:100%;background:var(--accent);}
   .up{color:var(--green-bright);} .down{color:var(--red-bright);}
   .sec-tag{font:600 10px/1 var(--font-sans);padding:3px 7px;border-radius:4px;background:var(--bg-elevated);border:1px solid var(--border);color:var(--text-muted);}
   .q-load{color:var(--text-dim);}
   .btn-score{font:600 11px/1 var(--font-sans);padding:6px 11px;border-radius:4px;border:1px solid var(--accent);background:var(--accent);color:#fff;cursor:pointer;}
   .btn-score:hover{background:var(--accent-hover);}
   ════════════════════════════════════════════════════════════════════════ */
