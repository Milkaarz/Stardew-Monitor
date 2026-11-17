/**
 * Registro das máquinas (fazendas) e do estado "ao vivo" de cada uma em memória.
 * Tokens de agente: gerados aqui, mostrados uma única vez e guardados só como hash.
 */
import crypto from 'node:crypto';
import { THEME_KEYS, stripSnapshot } from '@stardew-monitor/shared';
import { randomToken, sha256 } from '../lib/crypto.js';
import { parseJson } from '../lib/json.js';

const AGENT_TOKEN_PREFIX = 'sdm_';

export function newAgentToken() {
  return AGENT_TOKEN_PREFIX + randomToken(32);
}

const slug = (s) =>
  String(s || 'fazenda')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'fazenda';

export class MachineRegistry {
  constructor(db, { bus, logger, settings }) {
    this.db = db;
    this.bus = bus;
    this.logger = logger;
    this.settings = settings;
    this.machines = new Map(); // id -> { row, live }
  }

  async load() {
    for (const row of await this.db.all('SELECT * FROM machines ORDER BY id')) {
      this.machines.set(row.id, { row: { ...row, info: parseJson(row.info, {}) }, live: this.#emptyLive(row) });
    }
  }

  #emptyLive(row) {
    return {
      snapshot: null,
      receivedAt: null,
      lastSeenAt: row.last_seen_at || null,
      cpuWindow: [],
      level: 'ok',
      online: false,
      processes: null,
      processesAt: 0,
      wantsProcessesUntil: 0,
      lastPersistAt: 0,
      goodbye: false,
    };
  }

  get(id) {
    return this.machines.get(Number(id)) || null;
  }

  getByUid(uid) {
    for (const m of this.machines.values()) if (m.row.uid === uid) return m;
    return null;
  }

  /** Aceita id numérico ou uid. */
  resolve(ref) {
    if (ref == null || ref === '') return this.local() || this.list()[0] || null;
    if (/^\d+$/.test(String(ref))) return this.get(ref);
    return this.getByUid(String(ref));
  }

  local() {
    for (const m of this.machines.values()) if (m.row.is_local) return m;
    return null;
  }

  list() {
    return [...this.machines.values()];
  }

  findByToken(token) {
    if (!token || typeof token !== 'string' || !token.startsWith(AGENT_TOKEN_PREFIX)) return null;
    const h = sha256(token);
    for (const m of this.machines.values()) {
      if (m.row.token_hash && crypto.timingSafeEqual(Buffer.from(m.row.token_hash), Buffer.from(h))) return m;
    }
    return null;
  }

  async #uniqueUid(base) {
    let uid = slug(base);
    let i = 2;
    while (this.getByUid(uid)) uid = `${slug(base)}-${i++}`;
    return uid;
  }

  async ensureLocal({ hostname, farmName }) {
    const existing = this.local();
    if (existing) return existing;
    const now = Date.now();
    const id = await this.db.insert(
      'INSERT INTO machines (uid, name, farm_name, theme, hostname, is_local, created_at, status) VALUES (?, ?, ?, ?, ?, 1, ?, ?)',
      ['local', hostname || 'Este computador', farmName, 'standard', hostname || null, now, 'offline'],
    );
    const row = await this.db.get('SELECT * FROM machines WHERE id = ?', [id]);
    const m = { row: { ...row, info: {} }, live: this.#emptyLive(row) };
    this.machines.set(id, m);
    return m;
  }

  async create({ name, farmName, theme = 'standard' }) {
    if (!THEME_KEYS.includes(theme)) theme = 'standard';
    const token = newAgentToken();
    const now = Date.now();
    const uid = await this.#uniqueUid(farmName || name);
    const id = await this.db.insert(
      'INSERT INTO machines (uid, name, farm_name, theme, is_local, token_hash, token_hint, created_at, status) VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?)',
      [uid, name, farmName || name, theme, sha256(token), token.slice(-4), now, 'offline'],
    );
    const row = await this.db.get('SELECT * FROM machines WHERE id = ?', [id]);
    const m = { row: { ...row, info: {} }, live: this.#emptyLive(row) };
    this.machines.set(id, m);
    this.bus.emit('machine', { id, action: 'created' });
    return { machine: m, token };
  }

  async rotateToken(id) {
    const m = this.get(id);
    if (!m || m.row.is_local) return null;
    const token = newAgentToken();
    await this.db.run('UPDATE machines SET token_hash = ?, token_hint = ? WHERE id = ?', [sha256(token), token.slice(-4), m.row.id]);
    m.row.token_hash = sha256(token);
    m.row.token_hint = token.slice(-4);
    return token;
  }

  async update(id, patch) {
    const m = this.get(id);
    if (!m) return null;
    const fields = {};
    if (patch.name != null) fields.name = String(patch.name);
    if (patch.farmName != null) fields.farm_name = String(patch.farmName);
    if (patch.theme != null && THEME_KEYS.includes(patch.theme)) fields.theme = patch.theme;
    if (patch.intervalSec !== undefined) fields.interval_sec = patch.intervalSec;
    const keys = Object.keys(fields);
    if (keys.length) {
      await this.db.run(`UPDATE machines SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`, [...keys.map((k) => fields[k]), m.row.id]);
      Object.assign(m.row, fields);
      this.bus.emit('machine', { id: m.row.id, action: 'updated' });
    }
    return m;
  }

  async remove(id) {
    const m = this.get(id);
    if (!m || m.row.is_local) return false;
    await this.db.run('DELETE FROM achievements WHERE machine_id = ?', [m.row.id]);
    await this.db.run('DELETE FROM machines WHERE id = ?', [m.row.id]);
    this.machines.delete(m.row.id);
    this.bus.emit('machine', { id: m.row.id, action: 'removed' });
    return true;
  }

  /** Médias de CPU em janelas recentes (para o clima e as conquistas). */
  pushCpu(m, ts, load) {
    if (load == null) return;
    const w = m.live.cpuWindow;
    w.push([ts, load]);
    const cutoff = ts - 5 * 60e3;
    while (w.length && w[0][0] < cutoff) w.shift();
  }

  derived(m, now = Date.now()) {
    const w = m.live.cpuWindow;
    const avg = (ms) => {
      const vals = w.filter(([t]) => t >= now - ms).map(([, v]) => v);
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    };
    const span = w.length ? (w[w.length - 1][0] - w[0][0]) : 0;
    return {
      cpuAvg1m: avg(60e3),
      // só considera a média de 5 minutos quando há pelo menos ~4 minutos de dados
      cpuAvg5m: span >= 4 * 60e3 ? avg(5 * 60e3) : null,
    };
  }

  status(m) {
    if (!m.live.online) return 'offline';
    return m.live.level || 'ok';
  }

  /** Persistência de last_seen/status/info (no máximo a cada 30 s, ou quando o status muda). */
  async persist(m, { force = false } = {}) {
    const now = Date.now();
    const status = this.status(m);
    if (!force && status === m.row.status && now - m.live.lastPersistAt < 30e3) return;
    m.live.lastPersistAt = now;
    const statusChanged = status !== m.row.status;
    m.row.status = status;
    m.row.last_seen_at = m.live.lastSeenAt;
    await this.db.run('UPDATE machines SET last_seen_at = ?, status = ?, hostname = ?, host_uuid = ?, info = ? WHERE id = ?', [
      m.live.lastSeenAt, status, m.row.hostname, m.row.host_uuid, JSON.stringify(m.row.info || {}), m.row.id,
    ]);
    if (statusChanged) this.bus.emit('machine', { id: m.row.id, action: 'status', status });
  }

  /** Visão pública de uma máquina (sem hash de token). `admin` inclui a dica do token. */
  toPublic(m, { admin = false } = {}) {
    const r = m.row;
    const snap = m.live.snapshot;
    return {
      id: r.id,
      uid: r.uid,
      name: r.name,
      farmName: r.farm_name,
      theme: r.theme,
      hostname: r.hostname,
      isLocal: !!r.is_local,
      status: this.status(m),
      level: m.live.level,
      lastSeenAt: m.live.lastSeenAt,
      createdAt: r.created_at,
      intervalSec: r.interval_sec,
      info: r.info || {},
      summary: snap
        ? {
          cpu: snap.cpu?.load ?? null,
          ram: snap.mem?.pct ?? null,
          disk: (snap.disks || []).reduce((a, d) => Math.max(a, d.pct || 0), 0),
          cpuTemp: snap.cpu?.temp ?? null,
          uptimeSec: snap.uptimeSec ?? null,
        }
        : null,
      ...(admin && !r.is_local ? { tokenHint: r.token_hint ? `…${r.token_hint}` : null } : {}),
    };
  }

  livePayload(m, extra = {}) {
    return {
      machine: this.toPublic(m),
      snapshot: stripSnapshot(m.live.snapshot),
      derived: this.derived(m),
      receivedAt: m.live.receivedAt,
      ...extra,
    };
  }
}
