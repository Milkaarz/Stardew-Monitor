/**
 * Executor de migrations. Cada arquivo em database/migrations (listado em migrations/index.js) exporta `id` e `up(tipos)`,
 * que devolve a lista de comandos SQL. Migrations já aplicadas ficam em `schema_migrations`.
 */
import { MIGRATIONS } from '../migrations/index.js';

export const TYPES = {
  sqlite: { pk: 'INTEGER PRIMARY KEY AUTOINCREMENT', int: 'INTEGER', bigint: 'INTEGER', real: 'REAL' },
  postgres: { pk: 'BIGSERIAL PRIMARY KEY', int: 'BIGINT', bigint: 'BIGINT', real: 'DOUBLE PRECISION' },
};

export async function loadMigrations(list = MIGRATIONS) {
  return list.map((m) => ({ id: m.id, up: m.up }));
}

export async function migrate(db, { logger = console, migrations } = {}) {
  await db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, applied_at ${TYPES[db.dialect].bigint} NOT NULL)`);
  const done = new Set((await db.all('SELECT id FROM schema_migrations')).map((r) => r.id));
  const applied = [];
  for (const m of await loadMigrations(migrations)) {
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
