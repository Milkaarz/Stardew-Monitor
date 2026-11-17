/**
 * Limite de requisições em memória (janela fixa por chave).
 * Suficiente para uma instância; atrás de vários servidores, use o limite do proxy reverso.
 */
export function createRateLimiter({ windowMs, max, key = (req) => req.ip, message = 'Muitas requisições. Espere um pouco.' }) {
  const hits = new Map();
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.reset <= now) hits.delete(k);
  }, Math.max(windowMs, 30e3));
  sweep.unref?.();

  const middleware = (req, res, next) => {
    const k = key(req);
    const now = Date.now();
    let entry = hits.get(k);
    if (!entry || entry.reset <= now) {
      entry = { count: 0, reset: now + windowMs };
      hits.set(k, entry);
    }
    entry.count++;
    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, max - entry.count)));
    res.setHeader('RateLimit-Reset', String(Math.ceil((entry.reset - now) / 1000)));
    if (entry.count > max) {
      res.setHeader('Retry-After', String(Math.ceil((entry.reset - now) / 1000)));
      return res.status(429).json({ error: message });
    }
    next();
  };
  middleware.reset = () => hits.clear();
  return middleware;
}
