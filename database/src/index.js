/**
 * Ponto de entrada do banco.
 *   DATABASE_URL=sqlite:./data/stardew.db          (padrão; instalação individual)
 *   DATABASE_URL=postgres://user:senha@host/banco  (várias máquinas)
 */
import path from 'node:path';
import { migrate } from './migrate.js';

export { migrate };

export function parseDatabaseUrl(url, { rootDir = process.cwd() } = {}) {
  const u = String(url || '').trim();
  if (!u || u.startsWith('sqlite:')) {
    const file = u ? u.slice('sqlite:'.length).replace(/^\/\/(?=\.|\/)/, '') : './data/stardew.db';
    return { dialect: 'sqlite', file: file === ':memory:' ? file : path.resolve(rootDir, file || './data/stardew.db') };
  }
  if (/^postgres(ql)?:\/\//.test(u)) return { dialect: 'postgres', url: u };
  throw new Error(`DATABASE_URL não reconhecida: use "sqlite:caminho.db" ou "postgres://..."`);
}

export async function openDatabase({ url, rootDir, ssl, runMigrations = true, logger = console } = {}) {
  const cfg = parseDatabaseUrl(url, { rootDir });
  let db;
  if (cfg.dialect === 'sqlite') {
    const { openSqlite } = await import('./sqlite.js');
    db = openSqlite(cfg.file);
  } else {
    const { openPostgres } = await import('./postgres.js');
    db = await openPostgres(cfg.url, { ssl });
  }
  if (runMigrations) await migrate(db, { logger });
  return db;
}
