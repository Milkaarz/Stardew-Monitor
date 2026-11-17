/**
 * Serve a interface de dentro do executável (assets embutidos pelo Node "single executable").
 * Fora do executável (rodando `node app/main.js` no código-fonte), usa frontend/dist.
 */
import path from 'node:path';
import fs from 'node:fs';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

function getSea() {
  try {
    const sea = process.getBuiltinModule?.('node:sea');
    return sea?.isSea() ? sea : null;
  } catch {
    return null;
  }
}

/** Lê um arquivo da interface: do executável ou do disco. Devolve Buffer ou null. */
function makeReader() {
  const sea = getSea();
  if (sea) {
    const cache = new Map();
    return (rel) => {
      if (cache.has(rel)) return cache.get(rel);
      let buf = null;
      try {
        buf = Buffer.from(sea.getAsset(`web/${rel}`));
      } catch {
        buf = null;
      }
      cache.set(rel, buf);
      return buf;
    };
  }
  const dist = path.resolve(process.env.STATIC_DIR || path.join(process.cwd(), 'frontend', 'dist'));
  return (rel) => {
    const file = path.join(dist, rel);
    if (!file.startsWith(dist)) return null;
    try {
      return fs.readFileSync(file);
    } catch {
      return null;
    }
  };
}

export function createStaticHandler() {
  const read = makeReader();
  return (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    let rel = decodeURIComponent(req.path).replace(/^\/+/, '');
    if (!rel) rel = 'index.html';
    if (rel.includes('..')) return next();
    const buf = read(rel);
    if (!buf) return next();
    res.setHeader('Content-Type', TYPES[path.extname(rel).toLowerCase()] || 'application/octet-stream');
    res.setHeader('Cache-Control', rel.startsWith('assets/') ? 'public, max-age=31536000, immutable' : 'no-cache');
    res.end(req.method === 'HEAD' ? undefined : buf);
  };
}
