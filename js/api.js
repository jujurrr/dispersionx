/* ═══════════════════════════════════════════════════════════════
   DispersionX — API client
   Wraps all backend endpoints. Falls back to mock data when the
   FastAPI server (dispersion_v3) is not reachable.
   Base URL: window.location.origin + '/api'
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  // Toujours même origine : en ligne (Vercel) → vraies fonctions serverless ;
  // en local avec Vite → interceptées par le proxy dev (voir vite.config.js),
  // qui les renvoie vers le backend en ligne. (L'ancien backend FastAPI local
  // sur :8000 n'existe plus.)
  const BASE = window.location.origin + '/api';

  // Track connectivity
  let _connected = null;

  async function _get(path, opts) {
    const r = await fetch(BASE + path, opts);
    if (!r.ok) throw new Error(r.statusText);
    return r.json();
  }
  async function _post(path, body) {
    const r = await fetch(BASE + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(r.statusText);
    return r.json();
  }
  // POST avec réessais : abandonne (et déclenche le repli) seulement après
  // plusieurs tentatives. Évite qu'une latence passagère (proxy dev, throttling
  // Cboe) fasse afficher un score de secours à la place du vrai calcul.
  // On ne réessaie PAS une erreur 4xx définitive (hors 429).
  async function _postRetry(path, body, { retries = 2, timeoutMs = 12000 } = {}) {
    for (let attempt = 0; ; attempt++) {
      try {
        const r = await fetch(BASE + path, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (r.ok) return await r.json();
        if (r.status < 500 && r.status !== 429) throw new Error('HTTP ' + r.status);
        if (attempt >= retries) throw new Error('HTTP ' + r.status);
      } catch (e) {
        if (attempt >= retries) throw e;
      }
      await new Promise(res => setTimeout(res, 500 * (attempt + 1)));   // 0,5 s puis 1 s
    }
  }
  async function _delete(path) {
    const r = await fetch(BASE + path, { method: 'DELETE' });
    if (!r.ok) throw new Error(r.statusText);
    return r.json();
  }
  async function _put(path, body) {
    const r = await fetch(BASE + path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(r.statusText);
    return r.json();
  }

  /* ── Health ─────────────────────────────────────────────────── */
  async function checkHealth() {
    try {
      const r = await fetch(BASE + '/health', { signal: AbortSignal.timeout(3000) });
      _connected = r.ok;
    } catch {
      _connected = false;
    }
    window.dispatchEvent(new CustomEvent('dx-api-status', { detail: _connected }));
    return _connected;
  }

  function isConnected() { return _connected; }

  /* ── Indices ─────────────────────────────────────────────────── */
  async function getIndices() {
    try { return await _get('/indices'); }
    catch { return window.DXMock.indices; }
  }
  async function getIndex(symbol) {
    try { return await _get('/indices/' + symbol); }
    catch { return window.DXMock.indices.find(i => i.symbol === symbol) || window.DXMock.indices[0]; }
  }
  async function getSnapshot(symbol) {
    try { return await _get('/indices/' + symbol + '/snapshot'); }
    catch { return window.DXMock.getSnapshot(symbol); }
  }
  async function getComponents(symbol) {
    try { return await _get('/indices/' + symbol + '/components'); }
    catch { return window.DXMock.getComponents(symbol); }
  }
  async function getSources() {
    try { return await _get('/indices/sources'); }
    catch { return window.DXMock.sources; }
  }

  /* ── Quotes ──────────────────────────────────────────────────── */
  async function batchQuotes(symbols, weekly = true, realtime = true) {
    try {
      return await _post('/quotes/batch', { symbols, weekly, realtime });
    } catch {
      return window.DXMock.batchQuotes(symbols);
    }
  }

  // Capitalisations boursières (millions USD) pour pondérer la dispersion.
  // Renvoie [{ ticker, mcap }] ; null si le backend n'est pas joignable
  // (le module Construction retombe alors sur le poids indice / estimé).
  async function getMarketCaps(symbols) {
    try { return await _post('/marketcap', { symbols }); }
    catch { return null; }
  }

  /* ── Stocks (scoring) ────────────────────────────────────────── */
  // Cache mémoïsé : une même (indice, action, durée) renvoie TOUJOURS le
  // même résultat, pour que la table de l'indice, le ScoreModal et les
  // listes affichent exactement le même score. Évite les valeurs qui
  // « changent » entre l'affichage et le chargement.
  const _scoreCache = {};     // key -> résultat résolu
  const _scoreInflight = {};  // key -> promesse en cours (dédoublonnage)
  function _scoreKey(i, s, d, x) { return [i, s, d, x ? 1 : 0].join('|'); }

  async function autoScore(index_symbol, stock_symbol, duration_days, use_ex_action = false) {
    const key = _scoreKey(index_symbol, stock_symbol, duration_days, use_ex_action);
    if (_scoreCache[key]) return _scoreCache[key];
    if (_scoreInflight[key]) return _scoreInflight[key];
    const p = (async () => {
      try {
        return await _postRetry('/stocks/auto-score', { index_symbol, stock_symbol, duration_days, use_ex_action });
      } catch {
        // Repli HONNÊTE : score de démo marqué comme tel, pour ne jamais faire
        // passer un chiffre inventé pour un vrai calcul. L'UI affiche un badge.
        const m = window.DXMock.autoScore(stock_symbol);
        if (m && m.scoring) m.scoring.is_fallback = true;
        return m;
      }
    })().then(r => { _scoreCache[key] = r; delete _scoreInflight[key]; return r; },
            e => { delete _scoreInflight[key]; throw e; });
    _scoreInflight[key] = p;
    return p;
  }
  // Lecture synchrone du score déjà calculé (null si pas encore en cache).
  function getCachedScore(index_symbol, stock_symbol, duration_days, use_ex_action = false) {
    const r = _scoreCache[_scoreKey(index_symbol, stock_symbol, duration_days, use_ex_action)];
    return r ? (r.scoring?.score ?? null) : null;
  }
  function clearScoreCache() {
    for (const k in _scoreCache) delete _scoreCache[k];
  }

  /* ── Options (IV ATM + greeks) ───────────────────────────────── */
  // Tente IBKR d'abord (backend dédié via /api/ib/*), puis MarketData, sinon null.
  async function getOptionAtm(symbol, dte = 30) {
    const qs = 'symbol=' + encodeURIComponent(symbol) + '&dte=' + dte;
    try { return await _get('/ib/options/atm?' + qs); } catch { /* backend IBKR absent */ }
    try { return await _get('/options/atm?' + qs); } catch { /* MarketData absent */ }
    return null; // l'appelant garde ses données estimées
  }

  /* ── Lists ───────────────────────────────────────────────────────
     Si un utilisateur est connecté et Supabase configuré (window.DXCloud.enabled),
     les listes sont stockées/lues CÔTÉ SERVEUR (partagées entre appareils).
     Sinon → localStorage (DXMock), comportement historique. Le format renvoyé
     est identique dans les deux cas, donc l'UI ne change pas. */
  const _cloud = () => (window.DXCloud && window.DXCloud.enabled ? window.DXCloud : null);

  async function getLists() {
    const c = _cloud();
    if (c) { try { return await c.lists.getAll(); } catch (e) { console.warn('cloud getLists', e); } }
    return window.DXMock.lists;
  }
  async function createList(name, index_symbol, description = '') {
    const c = _cloud();
    if (c) { try { return await c.lists.create(name, index_symbol, description); } catch (e) { console.warn('cloud createList', e); } }
    return window.DXMock.createList(name, index_symbol, description);
  }
  async function getList(id) {
    const c = _cloud();
    if (c) { try { return await c.lists.get(id); } catch (e) { console.warn('cloud getList', e); } }
    return window.DXMock.lists.find(l => l.id === id);
  }
  async function updateList(id, name, description) {
    const c = _cloud();
    if (c) { try { return await c.lists.update(id, name, description); } catch (e) { console.warn('cloud updateList', e); } }
    return { id, name, description };
  }
  async function deleteList(id) {
    const c = _cloud();
    if (c) { try { return await c.lists.remove(id); } catch (e) { console.warn('cloud deleteList', e); } }
    return window.DXMock.deleteList(id);
  }
  async function addListItem(id, ticker, score_data, notes = '') {
    const c = _cloud();
    if (c) { try { return await c.lists.addItem(id, ticker, score_data); } catch (e) { console.warn('cloud addListItem', e); } }
    return window.DXMock.addListItem(id, ticker, score_data);
  }
  async function removeListItem(id, ticker) {
    const c = _cloud();
    if (c) { try { return await c.lists.removeItem(id, ticker); } catch (e) { console.warn('cloud removeListItem', e); } }
    return window.DXMock.removeListItem(id, ticker);
  }
  async function getListAnalysis(id) {
    try { return await _get('/lists/' + id + '/analysis'); }
    catch { return window.DXMock.getListAnalysis(id); }
  }
  async function exportList(id) {
    const c = _cloud();
    if (c) { try { const l = await c.lists.get(id); return new Blob([JSON.stringify(l, null, 2)], { type: 'application/json' }); } catch (e) { console.warn('cloud exportList', e); } }
    const list = window.DXMock.lists.find(l => l.id === id) || window.DXMock.lists[0];
    return new Blob([JSON.stringify(list, null, 2)], { type: 'application/json' });
  }
  async function exportAllLists() {
    const c = _cloud();
    if (c) { try { const ls = await c.lists.getAll(); return new Blob([JSON.stringify(ls, null, 2)], { type: 'application/json' }); } catch (e) { console.warn('cloud exportAll', e); } }
    return new Blob([JSON.stringify(window.DXMock.lists, null, 2)], { type: 'application/json' });
  }
  async function importLists(file) {
    const parsed = JSON.parse(await file.text());
    const c = _cloud();
    if (c) {
      // Connecté : l'import va dans le cloud. En cas d'échec, on LÈVE (l'UI lit
      // le cloud, un repli local silencieux serait invisible et trompeur).
      const res = await c.lists.importLocal(Array.isArray(parsed) ? parsed : [parsed]);
      window.dispatchEvent(new CustomEvent('dx-lists-changed'));   // rafraîchit l'UI
      return { imported: res.imported, message: res.imported + ' liste(s) importée(s)' };
    }
    return window.DXMock.importLists(parsed);
  }

  /* ── Partage de listes (tranche 3) ───────────────────────────────
     Cloud uniquement (window.DXCloud.shares). Sans connexion, les listes
     restent privées : getSharedLists → [] et partager lève « connexion requise ». */
  async function getSharedLists() {
    const c = _cloud();
    if (c && c.shares) { try { return await c.shares.sharedWithMe(); } catch (e) { console.warn('cloud getSharedLists', e); } }
    return [];
  }
  async function getListShares(listId) {
    const c = _cloud();
    if (c && c.shares) { try { return await c.shares.forList(listId); } catch (e) { console.warn('cloud getListShares', e); } }
    return [];
  }
  async function shareList(listId, email, role) {
    const c = _cloud();
    if (!(c && c.shares)) throw new Error('connexion requise pour partager');
    return c.shares.share(listId, email, role);
  }
  async function setShareRole(shareId, role) {
    const c = _cloud();
    if (!(c && c.shares)) throw new Error('connexion requise');
    return c.shares.setRole(shareId, role);
  }
  async function revokeShare(shareId) {
    const c = _cloud();
    if (!(c && c.shares)) throw new Error('connexion requise');
    return c.shares.revoke(shareId);
  }
  // Journal d'audit d'une liste (cloud uniquement ; [] sinon).
  async function getListAudit(listId) {
    const c = _cloud();
    if (c && c.audit) { try { return await c.audit.forList(listId); } catch (e) { console.warn('cloud getListAudit', e); } }
    return [];
  }

  /* ── Correlation ─────────────────────────────────────────────── */
  async function getCorrelation(list_id, tickers, index_symbol) {
    const body = { tickers: tickers || [], index: index_symbol || 'SPX', days: 60 };
    try { return await _post('/correlation/matrix', body); }
    catch { return window.DXMock.correlation; }
  }

  /* ── Strategy ────────────────────────────────────────────────── */
  async function buildStrategy(list_id, strategy_type, sizing_method, index_contracts, duration_days, delta_neutral) {
    try {
      return await _post('/strategy/build', { list_id, strategy_type, sizing_method, index_contracts, duration_days, delta_neutral });
    } catch {
      return window.DXMock.strategy;
    }
  }
  async function getSavedStrategy(list_id) {
    try { return await _get('/strategy/saved/' + list_id); }
    catch { return window.DXMock.strategy; }
  }

  /* ── Stratégies construites localement (Builder / Construction) ─────
     Stockées en localStorage sous 'dx-strategy-<listId>'. Source de vérité
     du suivi (Dashboard, Strategy Monitor). */
  function localStrategies(lists) {
    const byId = {}; (lists || []).forEach(l => { if (l && l.id) byId[l.id] = l; });
    const out = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || k.indexOf('dx-strategy-') !== 0) continue;
        const listId = k.slice('dx-strategy-'.length);
        let s; try { s = JSON.parse(localStorage.getItem(k)); } catch { continue; }
        if (!s || !s.components) continue;
        out.push({ ...s, listId, listName: byId[listId] ? byId[listId].name : null });
      }
    } catch {}
    out.sort((a, b) => String(b.builtAt || '').localeCompare(String(a.builtAt || '')));
    return out;
  }
  // Sauvegarde d'une stratégie construite (une par liste). localStorage reste la
  // source SYNCHRONE de la session ; si le cloud est actif, on écrit AUSSI côté
  // serveur (write-through best-effort) → synchro multi-appareil, sans changer
  // les lectures synchrones (ré-hydratées à la connexion). Voir src/cloud.js.
  function saveStrategy(listId, s) {
    try { localStorage.setItem('dx-strategy-' + listId, JSON.stringify(s)); } catch {}
    const c = _cloud();
    if (c && c.strategies) c.strategies.save(listId, s).catch(e => console.warn('cloud saveStrategy', e));
  }
  function deleteLocalStrategy(listId) {
    try { localStorage.removeItem('dx-strategy-' + listId); } catch {}
    const c = _cloud();
    if (c && c.strategies) c.strategies.remove(listId).catch(e => console.warn('cloud deleteStrategy', e));
  }
  // Métriques dérivées d'une stratégie sauvegardée (DTE restant, état, alerte).
  function strategyMetrics(s) {
    const p = s.portfolio || {};
    const built = s.builtAt ? new Date(s.builtAt) : null;
    let daysSince = (built && !isNaN(built)) ? Math.max(0, Math.floor((Date.now() - built.getTime()) / 86400000)) : 0;
    // DTE restant : priorité à la vraie date d'échéance (expiry, vendredi
    // d'expiration options) ; repli : durée initiale − jours écoulés.
    let dte;
    const dteLeft = s.expiry && window.DXExpiry ? window.DXExpiry.dteTo(s.expiry) : null;
    if (dteLeft != null) { dte = dteLeft; daysSince = Math.max(0, (s.duration || 30) - dteLeft); }
    else dte = Math.max(0, (s.duration || 30) - daysSince);
    // Avancée du temps : pour un straddle ATM, vega ∝ √T et theta ∝ 1/√T.
    // Les grecs stockés (à la construction) sont ramenés au DTE restant pour
    // que le suivi reflète la position d'aujourd'hui, pas celle de J0.
    const T0 = Math.max(1, s.duration || 30);
    const k  = Math.sqrt(Math.max(1, dte) / T0);
    const netVega = Math.round((p.netVega || 0) * k);
    const netTheta = Math.round((p.netTheta || 0) / k);
    const netPremium = Math.round(p.netPremium || 0);   // prime d'entrée — figée
    const netDelta = Math.round((p.netDelta != null ? p.netDelta : (p.netDeltaRaw || 0)) * k);
    let status = 'sain', alert = null;
    if (dte <= 7)               { status = 'risque';     alert = 'Theta critique · ' + dte + ' DTE'; }
    else if (Math.abs(netVega) > 250) { status = 'surveiller'; alert = 'Vega déséquilibré (' + netVega + ' $/1%)'; }
    else if (netTheta < -150)   { status = 'surveiller'; alert = 'Coût de portage élevé'; }
    const nComp = (s.components || []).length;
    const idxLabel = (s.indexEtf && s.indexEtf !== s.index) ? s.indexEtf + ' (' + (s.index || '') + ')' : (s.index || 'SPX');
    return { dte, daysSince, netVega, netTheta, netPremium, netDelta, status, alert, nComp,
      name: idxLabel + ' ' + (s.duration || 30) + 'j · dispersion' + (s.listName ? ' · ' + s.listName : '') };
  }

  /* ── Volatility (par ticker ou batch) ───────────────────────── */
  async function getTickerVol(ticker, index) {
    try { return await _post('/vol/ticker', { ticker, index: index || 'SPX' }); }
    catch { return null; }
  }
  async function getBatchVol(tickers, index) {
    try { return await _post('/vol/ticker', { tickers, index: index || 'SPX' }); }
    catch { return null; }
  }

  /* ── Risk ────────────────────────────────────────────────────── */
  async function getRisk(list_id, tickers, index_symbol, duration) {
    const body = { tickers: tickers || [], index: index_symbol || 'SPX', duration: duration || 30 };
    try { return await _post('/risk/portfolio', body); }
    catch { return window.DXMock.risk; }
  }

  /* ── Monitor / Checklist ─────────────────────────────────────── */
  async function getChecklist(list_id) {
    try { return await _get('/monitor/checklist/' + list_id); }
    catch { return window.DXMock.checklist; }
  }

  /* ── Positions locales (repli sans backend serveur) ─────────────
     Committées depuis la Checklist à partir de la VRAIE stratégie
     construite (dx-strategy-<listId>) — plus de positions de démo.
     Suivi honnête : grecs recalculés au DTE restant (lois √T d'un
     straddle ATM) ; le P&L de marché n'est PAS inventé (il nécessite
     de vraies données d'options). Stockage : 'dx-positions'. */
  const LS_POS = 'dx-positions';
  function _loadPositions() { try { return JSON.parse(localStorage.getItem(LS_POS) || '[]') || []; } catch { return []; } }
  function _savePositions(arr) { try { localStorage.setItem(LS_POS, JSON.stringify(arr)); } catch {} }
  function _isLocalPos(cid) { return String(cid).indexOf('loc-') === 0; }

  // Ligne de liste (MonitorList) dérivée d'un objet position BRUT — même forme
  // que la position vienne du store local (dx-positions) ou du cloud (Supabase).
  function _positionRow(p) {
    const s = p.strategy || {};
    const m = strategyMetrics(s);
    return {
      id: p.id, list_id: p.list_id, name: p.name || m.name,
      index_symbol: (s.indexEtf && s.indexEtf !== s.index) ? s.indexEtf + ' (' + s.index + ')' : (s.index || 'SPX'),
      strategy_type: 'dispersion', status: p.status,
      committed_at: p.committed_at, n_snapshots: (p.snapshots || []).length,
      pnl: null, dte: m.dte,
    };
  }
  // Détail (PositionDetail) dérivé d'un objet position BRUT. Suivi THÉORIQUE :
  // grecs recalculés au DTE restant (lois √T du straddle ATM) ; le P&L de marché
  // n'est pas inventé (il faudrait de vraies données d'options).
  function _positionDetail(p) {
    if (!p) return null;
    const s = p.strategy || {}; const port = s.portfolio || {};
    const m = strategyMetrics(s);
    const entryDelta = Math.round(port.netDelta != null ? port.netDelta : (port.netDeltaRaw || 0));
    const legs = [
      { symbol: s.indexEtf || s.index || 'SPX', side: 'short', quantity: s.nIndex || 1, role: 'index_leg', pnl: null },
      ...(s.components || []).map(c => ({ symbol: c.ticker, side: 'long', quantity: c.nContracts, current_iv: c.iv, role: 'component', pnl: null })),
    ];
    return {
      theoretical: true,
      position: { id: p.id, name: p.name || m.name, index_symbol: s.index || 'SPX', strategy_type: 'dispersion', status: p.status, committed_at: p.committed_at, list_id: p.list_id },
      monitoring: {
        total_pnl: null, exit_cost_estimate: null, net_pnl_after_exit: null,
        n_legs_priced: 0, n_legs_total: legs.length,
        entry_greeks:   { delta: entryDelta, vega: Math.round(port.netVega || 0), theta: Math.round(port.netTheta || 0) },
        current_greeks: { delta: m.netDelta, vega: m.netVega, theta: m.netTheta },
        greek_changes:  { delta: m.netDelta - entryDelta, vega: m.netVega - Math.round(port.netVega || 0), theta: m.netTheta - Math.round(port.netTheta || 0) },
        legs,
      },
      correlation_change: null,
      snapshots: p.snapshots || [],
    };
  }

  // Positions committées. Cloud (Supabase) si connecté & configuré → partagées
  // entre appareils ; sinon store local 'dx-positions' (comportement historique).
  // Les positions créées hors-ligne (id « loc-… ») restent gérées en local même
  // une fois le cloud actif. La forme renvoyée est identique dans les deux cas.
  async function commitPosition(list_id, name) {
    let s = null;
    try { s = JSON.parse(localStorage.getItem('dx-strategy-' + list_id) || 'null'); } catch {}
    const c = _cloud();
    if (c && c.positions) {
      if (!s || !s.components) throw new Error("aucune stratégie construite pour cette liste — construisez-la d'abord (Builder ou Construction)");
      try { return await c.positions.commit(list_id, name || null, s); }
      catch (e) { console.warn('cloud commitPosition', e); }
    }
    try { return await _post('/monitor/commit', { list_id, name }); }
    catch {
      if (!s || !s.components) throw new Error("aucune stratégie construite pour cette liste — construisez-la d'abord (Builder ou Construction)");
      const id = 'loc-' + Date.now();
      const arr = _loadPositions();
      arr.push({ id, list_id, name: name || null, strategy: s, committed_at: new Date().toISOString(), status: 'open', snapshots: [] });
      _savePositions(arr);
      return { success: true, commitment_id: id, local: true };
    }
  }
  async function getPositions(list_id) {
    const c = _cloud();
    if (c && c.positions) {
      try { const arr = await c.positions.list(list_id); return { positions: arr.map(_positionRow), cloud: true }; }
      catch (e) { console.warn('cloud getPositions', e); }
    }
    try { return await _get('/monitor/positions' + (list_id ? '?list_id=' + list_id : '')); }
    catch {
      const rows = _loadPositions().filter(p => !list_id || String(p.list_id) === String(list_id)).map(_positionRow);
      return { positions: rows, local: true };
    }
  }
  async function getPosition(cid) {
    if (_isLocalPos(cid)) return _positionDetail(_loadPositions().find(x => x.id === cid));
    const c = _cloud();
    if (c && c.positions) {
      try { return _positionDetail(await c.positions.get(cid)); }
      catch (e) { console.warn('cloud getPosition', e); }
    }
    try { return await _get('/monitor/position/' + cid); }
    catch { return _positionDetail(_loadPositions().find(x => x.id === cid)); }
  }
  async function snapshotPosition(cid) {
    if (_isLocalPos(cid)) {
      const arr = _loadPositions(); const p = arr.find(x => x.id === cid);
      if (!p) return { success: false };
      const m = strategyMetrics(p.strategy || {});
      (p.snapshots = p.snapshots || []).push({ taken_at: new Date().toISOString(), total_pnl: null, daily_pnl: null, dte: m.dte, netVega: m.netVega, netTheta: m.netTheta });
      _savePositions(arr);
      return { success: true, local: true };
    }
    const c = _cloud();
    if (c && c.positions) {
      try {
        const p = await c.positions.get(cid);
        const m = strategyMetrics(p.strategy || {});
        return await c.positions.addSnapshot(cid, { taken_at: new Date().toISOString(), total_pnl: null, daily_pnl: null, dte: m.dte, netVega: m.netVega, netTheta: m.netTheta });
      } catch (e) { console.warn('cloud snapshotPosition', e); }
    }
    try { return await _post('/monitor/position/' + cid + '/snapshot', {}); }
    catch { return { success: true }; }
  }
  async function closePosition(cid) {
    if (_isLocalPos(cid)) {
      const arr = _loadPositions(); const p = arr.find(x => x.id === cid);
      if (p) { p.status = 'closed'; _savePositions(arr); }
      return { success: true, local: true };
    }
    const c = _cloud();
    if (c && c.positions) { try { return await c.positions.setStatus(cid, 'closed'); } catch (e) { console.warn('cloud closePosition', e); } }
    try { return await _post('/monitor/position/' + cid + '/close', {}); }
    catch { return { success: true }; }
  }
  async function deletePosition(cid) {
    if (_isLocalPos(cid)) {
      _savePositions(_loadPositions().filter(x => x.id !== cid));
      return { success: true, local: true };
    }
    const c = _cloud();
    if (c && c.positions) { try { return await c.positions.remove(cid); } catch (e) { console.warn('cloud deletePosition', e); } }
    try { return await _delete('/monitor/position/' + cid); }
    catch { return { success: true }; }
  }

  /* ── Expose ──────────────────────────────────────────────────── */
  window.DXApi = {
    checkHealth, isConnected,
    getIndices, getIndex, getSnapshot, getComponents, getSources,
    batchQuotes, getMarketCaps,
    autoScore, getCachedScore, clearScoreCache, getOptionAtm,
    getLists, createList, getList, updateList, deleteList,
    addListItem, removeListItem, getListAnalysis,
    exportList, exportAllLists, importLists,
    getSharedLists, getListShares, shareList, setShareRole, revokeShare, getListAudit,
    getCorrelation,
    getTickerVol, getBatchVol,
    buildStrategy, getSavedStrategy,
    localStrategies, saveStrategy, deleteLocalStrategy, strategyMetrics,
    getRisk,
    getChecklist, commitPosition,
    getPositions, getPosition, snapshotPosition, closePosition, deletePosition,
  };

  // Auto-health-check on load, then every 15s
  checkHealth();
  setInterval(checkHealth, 15000);
})();
