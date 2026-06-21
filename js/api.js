/* ═══════════════════════════════════════════════════════════════
   DispersionX — API client
   Wraps all backend endpoints. Falls back to mock data when the
   FastAPI server (dispersion_v3) is not reachable.
   Base URL: window.location.origin + '/api'
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const BASE = (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost')
    ? 'http://localhost:8000/api'
    : window.location.origin + '/api';

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

  /* ── Stocks (scoring) ────────────────────────────────────────── */
  async function autoScore(index_symbol, stock_symbol, duration_days, use_ex_action = false) {
    try {
      return await _post('/stocks/auto-score', { index_symbol, stock_symbol, duration_days, use_ex_action });
    } catch {
      return window.DXMock.autoScore(stock_symbol);
    }
  }

  /* ── Options (IV ATM + greeks) ───────────────────────────────── */
  // Tente IBKR d'abord (backend dédié via /api/ib/*), puis MarketData, sinon null.
  async function getOptionAtm(symbol, dte = 30) {
    const qs = 'symbol=' + encodeURIComponent(symbol) + '&dte=' + dte;
    try { return await _get('/ib/options/atm?' + qs); } catch { /* backend IBKR absent */ }
    try { return await _get('/options/atm?' + qs); } catch { /* MarketData absent */ }
    return null; // l'appelant garde ses données estimées
  }

  /* ── Lists ───────────────────────────────────────────────────── */
  async function getLists() {
    try { return await _get('/lists'); }
    catch { return window.DXMock.lists; }
  }
  async function createList(name, index_symbol, description = '') {
    try { return await _post('/lists', { name, index_symbol, description }); }
    catch { return window.DXMock.createList(name, index_symbol, description); }
  }
  async function getList(id) {
    try { return await _get('/lists/' + id); }
    catch { return window.DXMock.lists.find(l => l.id === id); }
  }
  async function updateList(id, name, description) {
    try { return await _put('/lists/' + id, { name, description }); }
    catch { return { id, name, description }; }
  }
  async function deleteList(id) {
    try { return await _delete('/lists/' + id); }
    catch { return window.DXMock.deleteList(id); }
  }
  async function addListItem(id, ticker, score_data, notes = '') {
    try { return await _post('/lists/' + id + '/items', { ticker, score_data, notes }); }
    catch { return window.DXMock.addListItem(id, ticker, score_data); }
  }
  async function removeListItem(id, ticker) {
    try { return await _delete('/lists/' + id + '/items/' + ticker); }
    catch { return window.DXMock.removeListItem(id, ticker); }
  }
  async function getListAnalysis(id) {
    try { return await _get('/lists/' + id + '/analysis'); }
    catch { return window.DXMock.getListAnalysis(id); }
  }
  async function exportList(id) {
    try {
      const r = await fetch(BASE + '/lists/' + id + '/export');
      if (!r.ok) throw new Error(r.statusText);
      return r.blob();
    } catch {
      const list = window.DXMock.lists.find(l => l.id === id) || window.DXMock.lists[0];
      return new Blob([JSON.stringify(list, null, 2)], { type: 'application/json' });
    }
  }
  async function exportAllLists() {
    try {
      const r = await fetch(BASE + '/lists/export/all');
      if (!r.ok) throw new Error(r.statusText);
      return r.blob();
    } catch {
      return new Blob([JSON.stringify(window.DXMock.lists, null, 2)], { type: 'application/json' });
    }
  }
  async function importLists(file) {
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await fetch(BASE + '/lists/import', { method: 'POST', body: fd });
      if (!r.ok) throw new Error(r.statusText);
      return await r.json();
    } catch {
      const parsed = JSON.parse(await file.text());
      return window.DXMock.importLists(parsed);
    }
  }

  /* ── Correlation ─────────────────────────────────────────────── */
  async function getCorrelation(list_id) {
    try { return await _get('/correlation/list/' + list_id); }
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

  /* ── Risk ────────────────────────────────────────────────────── */
  async function getRisk(list_id) {
    try { return await _get('/risk/list/' + list_id); }
    catch { return window.DXMock.risk; }
  }

  /* ── Monitor / Checklist ─────────────────────────────────────── */
  async function getChecklist(list_id) {
    try { return await _get('/monitor/checklist/' + list_id); }
    catch { return window.DXMock.checklist; }
  }
  async function commitPosition(list_id, name) {
    try { return await _post('/monitor/commit', { list_id, name }); }
    catch { return { success: true, commitment_id: 'demo-' + Date.now() }; }
  }
  async function getPositions(list_id) {
    try { return await _get('/monitor/positions' + (list_id ? '?list_id=' + list_id : '')); }
    catch { return window.DXMock.positions; }
  }
  async function getPosition(cid) {
    try { return await _get('/monitor/position/' + cid); }
    catch { return window.DXMock.positions.find(p => p.id === cid) || window.DXMock.positions[0]; }
  }
  async function snapshotPosition(cid) {
    try { return await _post('/monitor/position/' + cid + '/snapshot', {}); }
    catch { return { success: true }; }
  }
  async function closePosition(cid) {
    try { return await _post('/monitor/position/' + cid + '/close', {}); }
    catch { return { success: true }; }
  }
  async function deletePosition(cid) {
    try { return await _delete('/monitor/position/' + cid); }
    catch { return { success: true }; }
  }

  /* ── Expose ──────────────────────────────────────────────────── */
  window.DXApi = {
    checkHealth, isConnected,
    getIndices, getIndex, getSnapshot, getComponents, getSources,
    batchQuotes,
    autoScore, getOptionAtm,
    getLists, createList, getList, updateList, deleteList,
    addListItem, removeListItem, getListAnalysis,
    exportList, exportAllLists, importLists,
    getCorrelation,
    buildStrategy, getSavedStrategy,
    getRisk,
    getChecklist, commitPosition,
    getPositions, getPosition, snapshotPosition, closePosition, deletePosition,
  };

  // Auto-health-check on load, then every 15s
  checkHealth();
  setInterval(checkHealth, 15000);
})();
