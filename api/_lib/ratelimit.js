// Rate-limit best-effort EN MÉMOIRE (par isolat edge). Première barrière contre
// les rafales manifestes depuis une même IP (abus/scraping/coût). NON durable :
// pas de store partagé entre instances → à compléter par un vrai limiteur
// (Upstash/Vercel KV) pour une garantie. Conçu FAIL-OPEN : en cas de doute, on
// laisse passer — on ne bloque jamais du trafic légitime.
const buckets = new Map();   // ip -> { start, count }

export function clientIp(req) {
  try {
    const xff = req.headers.get('x-forwarded-for') || '';
    return xff.split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown';
  } catch { return 'unknown'; }
}

// Retourne true si la requête est AUTORISÉE. Limite généreuse par défaut
// (60 req / 10 s / IP) : un usage normal ne l'atteint jamais.
export function allow(req, { limit = 60, windowMs = 10000 } = {}) {
  try {
    const ip = clientIp(req);
    const now = Date.now();
    let b = buckets.get(ip);
    if (!b || now - b.start >= windowMs) { b = { start: now, count: 0 }; buckets.set(ip, b); }
    b.count++;
    // GC opportuniste pour borner la mémoire.
    if (buckets.size > 5000) {
      for (const [k, v] of buckets) if (now - v.start >= windowMs) buckets.delete(k);
    }
    return b.count <= limit;
  } catch {
    return true;   // fail-open
  }
}

// Réponse 429 standard (avec Retry-After) pour les appelants au-dessus du seuil.
export function tooMany(retryAfterSec = 10) {
  return new Response(JSON.stringify({ error: 'rate_limited' }), {
    status: 429,
    headers: { 'Content-Type': 'application/json', 'Retry-After': String(retryAfterSec) },
  });
}
