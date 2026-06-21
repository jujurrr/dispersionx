// Netlify Function: proxy /api/ib/* → BACKEND_URL (backend FastAPI/IBKR sur VPS).
// Garde une origine unique (pas de CORS) et ajoute le bearer token côté serveur,
// pour que l'URL du backend et le token ne soient jamais exposés au navigateur.

export default async (req) => {
  const base = process.env.BACKEND_URL; // ex: https://api.mondomaine.com
  if (!base) return Response.json({ error: 'no_backend' }, { status: 503 });

  // Récupère la partie après /backend-proxy/ + conserve la query string
  const url = new URL(req.url);
  const sub = url.pathname.split('/.netlify/functions/backend-proxy/')[1] || '';
  const target = base.replace(/\/$/, '') + '/' + sub + url.search;

  const headers = { 'Content-Type': req.headers.get('content-type') || 'application/json' };
  if (process.env.BACKEND_TOKEN) headers['Authorization'] = `Bearer ${process.env.BACKEND_TOKEN}`;

  const init = { method: req.method, headers };
  if (!['GET', 'HEAD'].includes(req.method)) init.body = await req.text();

  try {
    const r = await fetch(target, init);
    const body = await r.text();
    return new Response(body, {
      status: r.status,
      headers: { 'Content-Type': r.headers.get('content-type') || 'application/json' },
    });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 502 });
  }
};
