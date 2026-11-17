/**
 * Executor de migrations. Cada arquivo em database/migrations exporta `id` e `up(tipos)`,
 * que devolve a lista de comandos SQL. Migrations já aplicadas ficam em `schema_migrations`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const MIGRATIONS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../migrations');

export const TYPES = {
  sqlite: { pk: 'INTEGER PRIMARY KEY AUTOINCREMENT', int: 'INTEGER', bigint: 'INTEGER', real: 'REAL' },
  postgres: { pk: 'BIGSERIAL PRIMARY KEY', int: 'BIGINT', bigint: 'BIGINT', real: 'DOUBLE PRECISION' },
};

export async function loadMigrations(dir = MIGRATIONS_DIR) {
  const files = fs.readdirSync(dir).filter((f) => /^\d+_.+\.js$/.test(f)).sort();
  const out = [];
  for (const f of files) {
    const mod = await import(pathToFileURL(path.join(dir, f)).href);
    out.push({ id: mod.id || f.replace(/\.js$/, ''), up: mod.up });
  }
  return out;
}

export async function migrate(db, { logger = console, dir } = {}) {
  await db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, applied_at ${TYPES[db.dialect].bigint} NOT NULL)`);
  const done = new Set((await db.all('SELECT id FROM schema_migrations')).map((r) => r.id));
  const applied = [];
  for (const m of await loadMigrations(dir)) {
    if (done.has(m.id)) continue;
    await db.transaction(async (tx) => {
      for (const sql of m.up(TYPES[db.dialect], db.dialect)) await tx.exec(sql);
      await tx.run('INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)', [m.id, Date.now()]);
    });
    applied.push(m.id);
    logger.info?.(`[banco] migration aplicada: ${m.id}`);
  }
  return applied;
}
