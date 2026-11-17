/**
 * Central de notificações: grava no histórico, avisa o navegador (SSE) e entrega nos canais
 * externos habilitados para a categoria (Discord, Telegram, e-mail).
 */
import { channels as defaultChannels } from '../notifier/channels.js';
import { parseJson } from '../lib/json.js';

export class NotificationService {
  constructor(db, { settings, bus, logger, channels = defaultChannels }) {
    this.db = db;
    this.settings = settings;
    this.bus = bus;
    this.logger = logger;
    this.channels = channels;
    this.pending = new Set();
  }

  /**
   * @param {{ machineId?, machineName?, kind: 'alert'|'recovery'|'achievement'|'system', category?, level?, title, message }} n
   */
  async notify(n) {
    const createdAt = Date.now();
    const id = await this.db.insert(
      'INSERT INTO notifications (machine_id, kind, category, level, title, message, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [n.machineId ?? null, n.kind, n.category ?? null, n.level ?? null, n.title, n.message, createdAt],
    );
    const record = { id, ...n, createdAt, deliveries: {}, read: false };
    this.bus.emit('notification', record);
    const p = this.#deliver(record).finally(() => this.pending.delete(p));
    this.pending.add(p);
    return record;
  }

  /** Para testes e desligamento: espera as entregas em andamento. */
  async flush() {
    await Promise.allSettled([...this.pending]);
  }

  #targets(n) {
    const cfg = this.settings.get('notifications');
    const out = [];
    for (const [name, ch] of Object.entries(cfg.channels || {})) {
      if (!ch?.enabled || !this.channels[name]) continue;
      if (n.kind === 'achievement') {
        if (cfg.notifyAchievements) out.push(name);
      } else if (n.kind === 'alert' || n.kind === 'recovery') {
        if ((ch.categories || []).includes(n.category)) out.push(name);
      } else {
        out.push(name);
      }
    }
    return out;
  }

  async #deliver(n) {
    const targets = this.#targets(n);
    if (!targets.length) return;
    const deliveries = {};
    await Promise.all(targets.map(async (name) => {
      const ch = this.channels[name];
      if (!ch.configured(this.settings)) {
        deliveries[name] = { ok: false, error: 'canal sem credenciais' };
        return;
      }
      try {
        await ch.send(n, this.settings);
        deliveries[name] = { ok: true, at: Date.now() };
      } catch (err) {
        deliveries[name] = { ok: false, error: err.message.slice(0, 200) };
        this.logger?.warn(`[notificações] falha no ${name}: ${err.message}`);
      }
    }));
    await this.db.run('UPDATE notifications SET deliveries = ? WHERE id = ?', [JSON.stringify(deliveries), n.id]);
  }

  async test(channel, { user } = {}) {
    const ch = this.channels[channel];
    if (!ch) throw Object.assign(new Error('Canal desconhecido.'), { status: 400 });
    if (!ch.configured(this.settings)) throw Object.assign(new Error(`${ch.label}: credenciais não configuradas.`), { status: 400 });
    await ch.send({
      title: 'Teste de notificação',
      message: `Se você está lendo isto, o canal ${ch.label} da fazenda está funcionando! (enviado por ${user?.username || 'admin'})`,
      level: 'info',
      createdAt: Date.now(),
    }, this.settings);
    return { ok: true };
  }

  async list({ limit = 50, offset = 0, kind, category, machineId } = {}) {
    const where = [];
    const params = [];
    if (kind) { where.push('kind = ?'); params.push(kind); }
    if (category) { where.push('category = ?'); params.push(category); }
    if (machineId) { where.push('machine_id = ?'); params.push(machineId); }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = await this.db.all(`SELECT * FROM notifications ${w} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);
    const total = Number((await this.db.get(`SELECT COUNT(*) AS n FROM notifications ${w}`, params)).n);
    const unread = Number((await this.db.get('SELECT COUNT(*) AS n FROM notifications WHERE is_read = 0')).n);
    return {
      total,
      unread,
      items: rows.map((r) => ({
        id: r.id,
        machineId: r.machine_id,
        kind: r.kind,
        category: r.category,
        level: r.level,
        title: r.title,
        message: r.message,
        createdAt: r.created_at,
        deliveries: parseJson(r.deliveries, {}),
        read: !!r.is_read,
      })),
    };
  }

  async markAllRead() {
    await this.db.run('UPDATE notifications SET is_read = 1 WHERE is_read = 0');
  }

  async clear() {
    await this.db.run('DELETE FROM notifications');
  }
}
