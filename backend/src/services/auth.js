/**
 * Usuários e sessões.
 * - Senhas com scrypt; sessões aleatórias guardadas apenas como hash SHA-256.
 * - Cada sessão tem um token CSRF próprio, exigido em toda requisição que altera dados.
 */
import { ROLES } from '@stardew-monitor/shared';
import { DUMMY_HASH, hashPassword, randomToken, sha256, verifyPassword } from '../lib/crypto.js';
import { parseJson } from '../lib/json.js';

export const MIN_PASSWORD = 10;

export function passwordProblem(pw) {
  if (typeof pw !== 'string' || pw.length < MIN_PASSWORD) return `A senha precisa ter pelo menos ${MIN_PASSWORD} caracteres.`;
  if (pw.length > 200) return 'Senha longa demais.';
  if (/^(.)\1+$/.test(pw)) return 'A senha não pode ser um único caractere repetido.';
  return null;
}

const publicUser = (u) => u && ({
  id: u.id,
  username: u.username,
  role: u.role,
  prefs: parseJson(u.prefs, {}),
  createdAt: u.created_at,
  lastLoginAt: u.last_login_at,
});

export class AuthService {
  constructor(db, { ttlHours = 12, logger }) {
    this.db = db;
    this.ttlMs = ttlHours * 3600e3;
    this.logger = logger;
  }

  /** Garante um administrador inicial. Sem ADMIN_PASSWORD, gera uma senha e mostra no log UMA vez. */
  async ensureAdmin({ username = 'admin', password = '' } = {}) {
    const count = (await this.db.get('SELECT COUNT(*) AS n FROM users')).n;
    if (Number(count) > 0) return null;
    let generated = false;
    let pw = password;
    if (!pw) {
      pw = randomToken(12);
      generated = true;
    } else if (passwordProblem(pw)) {
      throw new Error(`ADMIN_PASSWORD inválida: ${passwordProblem(pw)}`);
    }
    await this.createUser({ username, password: pw, role: ROLES.ADMIN });
    if (generated) {
      this.logger?.warn('==========================================================');
      this.logger?.warn(` Administrador criado: usuário "${username}"`);
      this.logger?.warn(` Senha gerada: ${pw}`);
      this.logger?.warn(' Guarde-a e troque em Configurações > Conta. Ela não será mostrada de novo.');
      this.logger?.warn('==========================================================');
    }
    return { username, generated };
  }

  async createUser({ username, password, role = ROLES.VIEWER }) {
    const problem = passwordProblem(password);
    if (problem) throw Object.assign(new Error(problem), { status: 400 });
    if (!Object.values(ROLES).includes(role)) throw Object.assign(new Error('Papel inválido.'), { status: 400 });
    const exists = await this.db.get('SELECT id FROM users WHERE lower(username) = lower(?)', [username]);
    if (exists) throw Object.assign(new Error('Esse nome de usuário já existe.'), { status: 409 });
    const now = Date.now();
    const id = await this.db.insert(
      'INSERT INTO users (username, password_hash, role, created_at, password_changed_at) VALUES (?, ?, ?, ?, ?)',
      [username, await hashPassword(password), role, now, now],
    );
    return this.getUser(id);
  }

  async getUser(id) {
    return publicUser(await this.db.get('SELECT * FROM users WHERE id = ?', [id]));
  }

  async listUsers() {
    return (await this.db.all('SELECT * FROM users ORDER BY id')).map(publicUser);
  }

  async deleteUser(id) {
    const user = await this.db.get('SELECT * FROM users WHERE id = ?', [id]);
    if (!user) return false;
    if (user.role === ROLES.ADMIN) {
      const admins = Number((await this.db.get("SELECT COUNT(*) AS n FROM users WHERE role = 'admin'")).n);
      if (admins <= 1) throw Object.assign(new Error('Não é possível remover o último administrador.'), { status: 400 });
    }
    await this.db.run('DELETE FROM sessions WHERE user_id = ?', [id]);
    await this.db.run('DELETE FROM users WHERE id = ?', [id]);
    return true;
  }

  async setRole(id, role) {
    if (!Object.values(ROLES).includes(role)) throw Object.assign(new Error('Papel inválido.'), { status: 400 });
    if (role !== ROLES.ADMIN) {
      const u = await this.db.get('SELECT role FROM users WHERE id = ?', [id]);
      const admins = Number((await this.db.get("SELECT COUNT(*) AS n FROM users WHERE role = 'admin'")).n);
      if (u?.role === ROLES.ADMIN && admins <= 1) throw Object.assign(new Error('Não é possível rebaixar o último administrador.'), { status: 400 });
    }
    await this.db.run('UPDATE users SET role = ? WHERE id = ?', [role, id]);
    return this.getUser(id);
  }

  /** Confere usuário/senha sem criar sessão. Retorna o usuário ou null. */
  async checkCredentials(username, password) {
    const row = await this.db.get('SELECT * FROM users WHERE lower(username) = lower(?)', [String(username || '')]);
    const ok = await verifyPassword(String(password || ''), row ? row.password_hash : DUMMY_HASH);
    return ok && row ? row : null;
  }

  async verifyUserPassword(userId, password) {
    const row = await this.db.get('SELECT password_hash FROM users WHERE id = ?', [userId]);
    return row ? verifyPassword(String(password || ''), row.password_hash) : false;
  }

  async login(username, password, { ip, userAgent } = {}) {
    const row = await this.checkCredentials(username, password);
    if (!row) return null;
    const token = randomToken(32);
    const csrf = randomToken(24);
    const now = Date.now();
    await this.db.run(
      'INSERT INTO sessions (id, user_id, csrf, created_at, expires_at, last_seen_at, ip, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [sha256(token), row.id, csrf, now, now + this.ttlMs, now, ip || null, String(userAgent || '').slice(0, 200)],
    );
    await this.db.run('UPDATE users SET last_login_at = ? WHERE id = ?', [now, row.id]);
    return { token, csrf, user: publicUser(row), expiresAt: now + this.ttlMs };
  }

  /** Valida o cookie de sessão; renova a expiração (sessão deslizante) no máximo 1x por minuto. */
  async getSession(token) {
    if (!token || typeof token !== 'string' || token.length > 200) return null;
    const id = sha256(token);
    const row = await this.db.get(
      'SELECT s.id AS sid, s.csrf, s.expires_at, s.last_seen_at, u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ?',
      [id],
    );
    const now = Date.now();
    if (!row) return null;
    if (row.expires_at < now) {
      await this.db.run('DELETE FROM sessions WHERE id = ?', [id]);
      return null;
    }
    if (now - row.last_seen_at > 60e3) {
      await this.db.run('UPDATE sessions SET last_seen_at = ?, expires_at = ? WHERE id = ?', [now, now + this.ttlMs, id]);
    }
    return { sessionId: id, csrf: row.csrf, user: publicUser(row) };
  }

  async logout(token) {
    if (token) await this.db.run('DELETE FROM sessions WHERE id = ?', [sha256(token)]);
  }

  async changePassword(userId, currentPassword, newPassword, { keepSessionId } = {}) {
    if (!(await this.verifyUserPassword(userId, currentPassword))) {
      throw Object.assign(new Error('Senha atual incorreta.'), { status: 400 });
    }
    return this.resetPassword(userId, newPassword, { keepSessionId });
  }

  async resetPassword(userId, newPassword, { keepSessionId } = {}) {
    const problem = passwordProblem(newPassword);
    if (problem) throw Object.assign(new Error(problem), { status: 400 });
    await this.db.run('UPDATE users SET password_hash = ?, password_changed_at = ? WHERE id = ?', [await hashPassword(newPassword), Date.now(), userId]);
    // encerra as outras sessões do usuário
    await this.db.run('DELETE FROM sessions WHERE user_id = ? AND id <> ?', [userId, keepSessionId || '']);
  }

  async savePrefs(userId, prefs) {
    await this.db.run('UPDATE users SET prefs = ? WHERE id = ?', [JSON.stringify(prefs), userId]);
    return this.getUser(userId);
  }

  async purgeExpired() {
    await this.db.run('DELETE FROM sessions WHERE expires_at < ?', [Date.now()]);
  }
}
