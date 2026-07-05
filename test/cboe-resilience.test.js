// Résilience réseau : réessais/backoff, cache mémoire, déduplication en vol.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isRetryableStatus, backoffDelay, makeCache, fetchJson } from '../api/_lib/cboe.js';

test('isRetryableStatus : transitoires oui, définitifs non', () => {
  for (const s of [408, 425, 429, 500, 502, 503, 504]) assert.equal(isRetryableStatus(s), true, `${s}`);
  for (const s of [200, 301, 400, 401, 403, 404]) assert.equal(isRetryableStatus(s), false, `${s}`);
});

test('backoffDelay : croît avec la tentative et reste borné', () => {
  const d0 = backoffDelay(0), d3 = backoffDelay(3);
  assert.ok(d0 >= 150 && d0 <= 300, `d0=${d0}`);       // base/2..base
  assert.ok(d3 > d0, 'un délai plus tardif est plus long');
  assert.ok(backoffDelay(20) <= 4000, 'plafonné au cap');
});

test('makeCache : déduplique les appels identiques en vol', async () => {
  const cached = makeCache();
  let calls = 0;
  const producer = () => { calls++; return new Promise(r => setTimeout(() => r(42), 10)); };
  const [a, b] = await Promise.all([cached('k', 1000, producer), cached('k', 1000, producer)]);
  assert.equal(a, 42); assert.equal(b, 42);
  assert.equal(calls, 1, 'un seul appel réel pour deux demandes simultanées');
});

test('makeCache : sert depuis le cache dans la fenêtre TTL', async () => {
  const cached = makeCache();
  let calls = 0;
  const producer = () => { calls++; return Promise.resolve('v'); };
  await cached('k', 10000, producer);
  await cached('k', 10000, producer);
  assert.equal(calls, 1, 'deuxième appel servi par le cache');
});

test('makeCache : ne met PAS en cache les valeurs nulles', async () => {
  const cached = makeCache();
  let calls = 0;
  const producer = () => { calls++; return Promise.resolve(null); };
  await cached('k', 10000, producer);
  await cached('k', 10000, producer);
  assert.equal(calls, 2, 'un échec (null) est retenté');
});

// ── fetchJson avec un fetch simulé (pas de réseau réel) ──
function withFakeFetch(impl, run) {
  const original = globalThis.fetch;
  globalThis.fetch = impl;
  return (async () => { try { return await run(); } finally { globalThis.fetch = original; } })();
}

test('fetchJson : réessaie un 429 puis abandonne (renvoie null)', async () => {
  let n = 0;
  await withFakeFetch(async () => { n++; return { ok: false, status: 429, json: async () => ({}) }; }, async () => {
    const out = await fetchJson('http://x', 1000, { retries: 2, backoff: () => 0 });
    assert.equal(out, null);
    assert.equal(n, 3, '1 essai + 2 réessais');
  });
});

test('fetchJson : réussit après deux échecs réseau', async () => {
  let n = 0;
  await withFakeFetch(async () => {
    n++;
    if (n < 3) throw new Error('boom');
    return { ok: true, status: 200, json: async () => ({ iv: 1 }) };
  }, async () => {
    const out = await fetchJson('http://x', 1000, { retries: 3, backoff: () => 0 });
    assert.deepEqual(out, { iv: 1 });
    assert.equal(n, 3);
  });
});

test('fetchJson : ne réessaie PAS un 404 (définitif)', async () => {
  let n = 0;
  await withFakeFetch(async () => { n++; return { ok: false, status: 404, json: async () => ({}) }; }, async () => {
    const out = await fetchJson('http://x', 1000, { retries: 2, backoff: () => 0 });
    assert.equal(out, null);
    assert.equal(n, 1, 'un seul essai');
  });
});
