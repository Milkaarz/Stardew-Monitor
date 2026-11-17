/** Registro de operações administrativas (o quê, quando, de onde e se deu certo). */
import { parseJson } from '../lib/json.js';

export class AuditService {
  constructor(db, { logger } = {}) {
    this.db = db;
    this.logger = logger;
  }

  async log({ user = null, action, target = null, details = {}, ip = null, success = true }) {
    try {
      await this.db.insert(
        'INSERT INTO audit_log (ts, user_id, username, action, target, details, ip, success) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [Date.now(), user?.id ?? null, user?.username ?? null, action, target, JSON.stringify(details || {}), ip, success ? 1 : 0],
      );
    } catch (err) {
      this.logger?.error(`[auditoria] falha ao registrar ${action}: ${err.message}`);
    }
  }

  async list({ limit = 100, offset = 0, action } = {}) {
    const where = action ? 'WHERE action = ?' : '';
    const params = action ? [action] : [];
    const rows = await this.db.all(`SELECT * FROM audit_log ${where} ORDER BY ts DESC, id DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);
    return rows.map((r) => ({ ...r, details: parseJson(r.details, {}), success: !!r.success }));
  }
}
