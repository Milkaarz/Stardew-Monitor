/**
 * Adaptador SQLite usando o módulo nativo `node:sqlite` (sem compilação nativa).
 * Expõe a mesma interface assíncrona do adaptador PostgreSQL.
 */
import fs from 'node:fs';
import path from 'node:path';

// node:sqlite ainda emite um aviso "experimental" em algumas versões do Node; silencia só esse aviso.
// Carregado de forma síncrona (sem await no topo do módulo) para funcionar também no aplicativo empacotado.
let DatabaseSync = null;
function loadSqlite() {
  if (DatabaseSync) return DatabaseSync;
  const originalEmit = process.emitWarning;
  process.emitWarning = function patched(warning, ...rest) {
    const msg = typeof warning === 'string' ? warning : warning?.message;
    if (msg && /SQLite is an experimental feature/i.test(msg)) return;
    return originalEmit.call(process, warning, ...rest);
  };
  try {
    ({ DatabaseSync } = process.getBuiltinModule('node:sqlite'));
  } finally {
    process.emitWarning = originalEmit;
  }
  return DatabaseSync;
}

export function openSqlite(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  const Db = loadSqlite();
  const db = new Db(file);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA synchronous = NORMAL');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec('PRAGMA busy_timeout = 5000');

  const cache = new Map();
  const stmt = (sql) => {
    let s = cache.get(sql);
    if (!s) {
      s = db.prepare(sql);
      if (cache.size > 300) cache.clear();
      cache.set(sql, s);
    }
    return s;
  };
  const norm = (params = []) => params.map((p) => (typeof p === 'boolean' ? (p ? 1 : 0) : p === undefined ? null : p));
  const plain = (row) => (row ? { ...row } : row);

  const api = {
    dialect: 'sqlite',
    async all(sql, params) {
      return stmt(sql).all(...norm(params)).map(plain);
    },
    async get(sql, params) {
      return plain(stmt(sql).get(...norm(params))) ?? null;
    },
    async run(sql, params) {
      const r = stmt(sql).run(...norm(params));
      return { changes: Number(r.changes) };
    },
    async insert(sql, params) {
      const r = stmt(sql).run(...norm(params));
      return Number(r.lastInsertRowid);
    },
    async exec(sql) {
      db.exec(sql);
    },
    async transaction(fn) {
      db.exec('BEGIN');
      try {
        const out = await fn(api);
        db.exec('COMMIT');
        return out;
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
    },
    async close() {
      cache.clear();
      db.close();
    },
  };
  return api;
}
