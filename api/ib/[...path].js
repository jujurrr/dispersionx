// Proxy /api/ib/* → BACKEND_URL (FastAPI IBKR sur VPS)
export const config = { runtime: 'edge' };

export default async (req) => {
  const base = process.env.BACKEND_URL;
  if (!base) return Response.json({ error: 'no_backend' }, { status: 503 });

  const url = new URL(req.url);
  const sub = url.pathname.replace(/^\/api\/ib\/?/, '');
  const target = base.replace(/\/$/, '') + '/ib/' + sub + url.search;

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
