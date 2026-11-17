/**
 * Migration 001: estrutura inicial.
 * `t` traz os tipos de cada dialeto (SQLite / PostgreSQL).
 * Datas são guardadas como milissegundos (BIGINT) para funcionar igual nos dois bancos.
 */
export const id = '001_initial';

// lista congelada nesta migration (novas métricas = nova migration)
const METRICS = ['cpu', 'ram', 'swap', 'gpu', 'vram', 'cpu_temp', 'gpu_temp', 'disk', 'disk_read', 'disk_write', 'net_rx', 'net_tx', 'battery', 'fan'];

export function up(t) {
  const raw = METRICS.map((m) => `${m} ${t.real}`).join(', ');
  const agg = METRICS.map((m) => `${m}_avg ${t.real}, ${m}_max ${t.real}`).join(', ');
  return [
    `CREATE TABLE users (
      id ${t.pk},
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'viewer',
      prefs TEXT NOT NULL DEFAULT '{}',
      created_at ${t.bigint} NOT NULL,
      last_login_at ${t.bigint},
      password_changed_at ${t.bigint}
    )`,
    `CREATE TABLE sessions (
      id TEXT PRIMARY KEY,
      user_id ${t.int} NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      csrf TEXT NOT NULL,
      created_at ${t.bigint} NOT NULL,
      expires_at ${t.bigint} NOT NULL,
      last_seen_at ${t.bigint} NOT NULL,
      ip TEXT,
      user_agent TEXT
    )`,
    'CREATE INDEX idx_sessions_user ON sessions(user_id)',
    `CREATE TABLE machines (
      id ${t.pk},
      uid TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      farm_name TEXT NOT NULL,
      theme TEXT NOT NULL DEFAULT 'standard',
      hostname TEXT,
      host_uuid TEXT,
      is_local INTEGER NOT NULL DEFAULT 0,
      token_hash TEXT UNIQUE,
      token_hint TEXT,
      created_at ${t.bigint} NOT NULL,
      last_seen_at ${t.bigint},
      status TEXT NOT NULL DEFAULT 'offline',
      info TEXT NOT NULL DEFAULT '{}',
      interval_sec INTEGER
    )`,
    `CREATE TABLE metrics_raw (
      machine_id ${t.int} NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
      ts ${t.bigint} NOT NULL,
      ${raw},
      PRIMARY KEY (machine_id, ts)
    )`,
    `CREATE TABLE metrics_agg (
      machine_id ${t.int} NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
      res INTEGER NOT NULL,
      ts ${t.bigint} NOT NULL,
      n INTEGER NOT NULL,
      ${agg},
      PRIMARY KEY (machine_id, res, ts)
    )`,
    `CREATE TABLE machine_state (
      machine_id ${t.int} PRIMARY KEY REFERENCES machines(id) ON DELETE CASCADE,
      data TEXT NOT NULL,
      updated_at ${t.bigint} NOT NULL
    )`,
    `CREATE TABLE settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at ${t.bigint} NOT NULL
    )`,
    `CREATE TABLE secrets (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at ${t.bigint} NOT NULL
    )`,
    `CREATE TABLE achievements (
      id ${t.pk},
      machine_id ${t.int} NOT NULL DEFAULT 0,
      key TEXT NOT NULL,
      unlocked_at ${t.bigint} NOT NULL,
      details TEXT NOT NULL DEFAULT '{}',
      UNIQUE (machine_id, key)
    )`,
    `CREATE TABLE notes (
      id ${t.pk},
      machine_id ${t.int},
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at ${t.bigint} NOT NULL,
      updated_at ${t.bigint} NOT NULL,
      author_id ${t.int}
    )`,
    'CREATE INDEX idx_notes_created ON notes(created_at)',
    `CREATE TABLE quests (
      id ${t.pk},
      text TEXT NOT NULL,
      daily INTEGER NOT NULL DEFAULT 0,
      done_at ${t.bigint},
      created_at ${t.bigint} NOT NULL
    )`,
    `CREATE TABLE notifications (
      id ${t.pk},
      machine_id ${t.int},
      kind TEXT NOT NULL,
      category TEXT,
      level TEXT,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at ${t.bigint} NOT NULL,
      deliveries TEXT NOT NULL DEFAULT '{}',
      is_read INTEGER NOT NULL DEFAULT 0
    )`,
    'CREATE INDEX idx_notifications_created ON notifications(created_at)',
    `CREATE TABLE audit_log (
      id ${t.pk},
      ts ${t.bigint} NOT NULL,
      user_id ${t.int},
      username TEXT,
      action TEXT NOT NULL,
      target TEXT,
      details TEXT NOT NULL DEFAULT '{}',
      ip TEXT,
      success INTEGER NOT NULL DEFAULT 1
    )`,
    'CREATE INDEX idx_audit_ts ON audit_log(ts)',
    `CREATE TABLE agent_commands (
      id ${t.pk},
      machine_id ${t.int} NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      payload TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'pending',
      result TEXT,
      created_by ${t.int},
      created_at ${t.bigint} NOT NULL,
      updated_at ${t.bigint} NOT NULL
    )`,
    'CREATE INDEX idx_agent_commands_machine ON agent_commands(machine_id, status)',
  ];
}
