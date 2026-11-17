/**
 * Adaptador PostgreSQL (instalações com várias máquinas).
 * As consultas são escritas com `?` e convertidas para `$1, $2...` aqui.
 */
import pg from 'pg';

// BIGINT e NUMERIC como número JS (timestamps em ms cabem com folga em 2^53)
pg.types.setTypeParser(20, (v) => (v == null ? null : Number(v)));
pg.types.setTypeParser(1700, (v) => (v == null ? null : Number(v)));

/** Troca `?` por `$n`, ignorando o conteúdo de strings entre aspas simples. */
export function toPgPlaceholders(sql) {
  let n = 0;
  let out = '';
  let inStr = false;
  for (const ch of sql) {
    if (ch === "'") inStr = !inStr;
    if (ch === '?' && !inStr) out += `$${++n}`;
    else out += ch;
  }
  return out;
}

const norm = (params = []) => params.map((p) => (typeof p === 'boolean' ? (p ? 1 : 0) : p === undefined ? null : p));

function wrap(client, extra = {}) {
  const q = (sql, params) => client.query(toPgPlaceholders(sql), norm(params));
  return {
    dialect: 'postgres',
    async all(sql, params) {
      return (await q(sql, params)).rows;
    },
    async get(sql, params) {
      return (await q(sql, params)).rows[0] ?? null;
    },
    async run(sql, params) {
      return { changes: (await q(sql, params)).rowCount };
    },
    async insert(sql, params) {
      const r = await q(`${sql} RETURNING id`, params);
      return Number(r.rows[0]?.id);
    },
    async exec(sql) {
      await client.query(sql);
    },
    ...extra,
  };
}

export async function openPostgres(connectionString, { ssl } = {}) {
  const pool = new pg.Pool({
    connectionString,
    max: 10,
    ssl: ssl ? { rejectUnauthorized: ssl !== 'no-verify' } : undefined,
  });
  await pool.query('SELECT 1');
  const api = wrap(pool, {
    async transaction(fn) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const out = await fn(wrap(client));
        await client.query('COMMIT');
        return out;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    },
    async close() {
      await pool.end();
    },
  });
  return api;
}
