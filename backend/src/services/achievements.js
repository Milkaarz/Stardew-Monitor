/**
 * Conquistas persistentes.
 * Contadores por máquina (uptime acumulado, sequência ociosa...) ficam em `machine_state`
 * e as conquistas desbloqueadas em `achievements`, com a data do desbloqueio.
 * Conquistas de longo prazo usam o histórico agregado (não dependem da interface aberta).
 */
import {
  ACHIEVEMENTS, DEFAULT_ACHIEVEMENT_SETTINGS, activeFestival, achievementByKey, describeAchievements,
} from '@stardew-monitor/shared';
import { parseJson } from '../lib/json.js';
import { WEEK_MS, WEEK_OFFSET_MS } from './history.js';

const DAY = 86400e3;

export class AchievementService {
  constructor(db, { settings, notifications, history, bus, logger }) {
    this.db = db;
    this.settings = settings;
    this.notifications = notifications;
    this.history = history;
    this.bus = bus;
    this.logger = logger;
    this.state = new Map(); // machineId -> { data, dirty }
    this.unlocked = new Set(); // `${machineId}:${key}`
  }

  async load() {
    for (const r of await this.db.all('SELECT machine_id, key FROM achievements')) this.unlocked.add(`${r.machine_id}:${r.key}`);
    for (const r of await this.db.all('SELECT machine_id, data FROM machine_state')) {
      this.state.set(r.machine_id, { data: parseJson(r.data, {}), dirty: false });
    }
  }

  config() {
    return { ...DEFAULT_ACHIEVEMENT_SETTINGS, ...this.settings.get('achievements') };
  }

  stateOf(machineId) {
    let s = this.state.get(machineId);
    if (!s) {
      s = { data: { totalOnlineSec: 0, lastSampleTs: null, idleSince: null, uptimeSec: 0, organizedDays: 0 }, dirty: true };
      this.state.set(machineId, s);
    }
    return s;
  }

  isUnlocked(machineId, key) {
    return this.unlocked.has(`${machineId}:${key}`);
  }

  async unlock(machineId, key, details = {}, { machineName } = {}) {
    if (this.isUnlocked(machineId, key)) return false;
    const def = achievementByKey(key);
    if (!def) return false;
    const now = Date.now();
    const r = await this.db.run(
      'INSERT INTO achievements (machine_id, key, unlocked_at, details) VALUES (?, ?, ?, ?) ON CONFLICT (machine_id, key) DO NOTHING',
      [machineId, key, now, JSON.stringify(details)],
    );
    this.unlocked.add(`${machineId}:${key}`);
    if (!r.changes) return false;
    const payload = { machineId, key, title: def.title, icon: def.icon, unlockedAt: now, machineName: machineName || null };
    this.bus.emit('achievement', payload);
    await this.notifications.notify({
      machineId: machineId || null,
      machineName,
      kind: 'achievement',
      level: 'info',
      category: null,
      title: `Conquista desbloqueada: ${def.title}`,
      message: def.description(this.config()) + (machineName ? ` (${machineName})` : ''),
    });
    return true;
  }

  /** Chamado a cada leitura recebida (ordem cronológica). */
  async onSample(machine, snap, { intervalSec = 10 } = {}) {
    const id = machine.row.id;
    const name = machine.row.farm_name;
    const c = this.config();
    const s = this.stateOf(id);
    const d = s.data;
    const ts = snap.ts;

    // uptime acumulado: soma o intervalo entre leituras, desde que a máquina não tenha sumido
    if (d.lastSampleTs != null && ts > d.lastSampleTs) {
      const gap = ts - d.lastSampleTs;
      if (gap <= Math.max(intervalSec * 3000, 120e3)) d.totalOnlineSec = (d.totalOnlineSec || 0) + gap / 1000;
    }
    if (d.lastSampleTs == null || ts > d.lastSampleTs) d.lastSampleTs = ts;

    // ociosidade contínua
    const cpu = snap.cpu?.load;
    if (cpu != null && cpu < c.idleLoad) d.idleSince = d.idleSince ?? ts;
    else if (cpu != null) d.idleSince = null;
    d.uptimeSec = snap.uptimeSec ?? d.uptimeSec;
    s.dirty = true;

    await this.unlock(id, 'first_harvest', {}, { machineName: name });
    if (d.totalOnlineSec >= 30 * 86400) await this.unlock(id, 'dedicated_farmer', { totalOnlineSec: Math.round(d.totalOnlineSec) }, { machineName: name });
    if (d.totalOnlineSec >= 100 * 86400) await this.unlock(id, 'farm_veteran', { totalOnlineSec: Math.round(d.totalOnlineSec) }, { machineName: name });
    if (d.idleSince != null && ts - d.idleSince >= c.idleMinutes * 60e3) {
      await this.unlock(id, 'quiet_day', { idleMinutes: Math.round((ts - d.idleSince) / 60e3) }, { machineName: name });
    }
    if ((snap.uptimeSec || 0) >= c.tirelessHours * 3600) {
      await this.unlock(id, 'tireless_machine', { uptimeSec: snap.uptimeSec }, { machineName: name });
    }
    if (!this.isUnlocked(id, 'festival_guest')) {
      const ap = this.settings.get('appearance');
      const fest = activeFestival(new Date(ts), { festivals: this.settings.get('festivals'), mode: ap.seasonMode, farmEpoch: ap.farmEpoch });
      if (fest) await this.unlock(id, 'festival_guest', { festival: fest.name }, { machineName: name });
    }
  }

  /** Verificações periódicas baseadas no histórico agregado (a cada hora). */
  async periodic(machines, now = Date.now()) {
    const c = this.config();
    for (const m of machines) {
      const id = m.row.id;
      const name = m.row.farm_name;
      try {
        // Fazenda Organizada: N dias seguidos (até hoje) com todos os discos abaixo do limite
        const days = await this.history.dailyDiskMax(id, c.diskDays + 1, now);
        let streak = 0;
        const today = Math.floor(now / DAY);
        for (let day = today; day > today - (c.diskDays + 1); day--) {
          const row = days.find((x) => x.day === day);
          if (!row || row.disk == null) {
            if (day === today) continue; // hoje ainda pode não ter hora fechada
            break;
          }
          if (row.disk < c.diskLimit) streak++;
          else break;
        }
        const st = this.stateOf(id);
        st.data.organizedDays = streak;
        st.dirty = true;
        if (streak >= c.diskDays) await this.unlock(id, 'organized_farm', { days: streak, limit: c.diskLimit }, { machineName: name });

        // Colheita Recorde: a última semana completa teve a menor média de RAM já registrada
        const weeks = await this.history.weeklyRam(id);
        const current = Math.floor((now - WEEK_OFFSET_MS) / WEEK_MS);
        const complete = weeks.filter((w) => w.week < current && w.ram != null && w.hours >= 24);
        if (complete.length >= 2) {
          const last = complete[complete.length - 1];
          if (last.week === current - 1) {
            const previousMin = Math.min(...complete.slice(0, -1).map((w) => w.ram));
            if (last.ram < previousMin) {
              await this.unlock(id, 'record_harvest', { week: last.week, ramAvg: Math.round(last.ram * 10) / 10 }, { machineName: name });
            }
          }
        }
      } catch (err) {
        this.logger?.warn(`[conquistas] verificação periódica falhou (${name}): ${err.message}`);
      }
    }
    await this.checkGlobal(machines.length);
  }

  async checkGlobal(machineCount) {
    if (machineCount >= 3) await this.unlock(0, 'town_founder', { machines: machineCount });
    const notes = Number((await this.db.get('SELECT COUNT(*) AS n FROM notes')).n);
    if (notes >= 10) await this.unlock(0, 'diary_writer', { notes });
  }

  async persist() {
    const now = Date.now();
    for (const [machineId, s] of this.state) {
      if (!s.dirty) continue;
      s.dirty = false;
      try {
        await this.db.run(
          'INSERT INTO machine_state (machine_id, data, updated_at) VALUES (?, ?, ?) ON CONFLICT (machine_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at',
          [machineId, JSON.stringify(s.data), now],
        );
      } catch (err) {
        // máquina removida: descarta o estado
        if (/FOREIGN KEY|foreign key/i.test(err.message)) this.state.delete(machineId);
        else throw err;
      }
    }
  }

  forget(machineId) {
    this.state.delete(machineId);
    for (const k of [...this.unlocked]) if (k.startsWith(`${machineId}:`)) this.unlocked.delete(k);
  }

  /** Lista para a API: definições + progresso + desbloqueios. */
  async list({ machineId, machineCount = 0 } = {}) {
    const now = Date.now();
    const rows = await this.db.all('SELECT * FROM achievements ORDER BY unlocked_at DESC');
    const noteCount = Number((await this.db.get('SELECT COUNT(*) AS n FROM notes')).n);
    const st = machineId ? this.stateOf(machineId).data : {};
    const stats = { ...st, machineCount, noteCount };
    const items = describeAchievements(this.config(), stats, now).map((a) => {
      const scopeId = a.scope === 'global' ? 0 : machineId;
      const row = rows.find((r) => r.key === a.key && Number(r.machine_id) === Number(scopeId));
      return { ...a, unlocked: !!row, unlockedAt: row?.unlocked_at ?? null, details: row ? parseJson(row.details, {}) : null };
    });
    const history = rows.map((r) => ({
      key: r.key,
      machineId: Number(r.machine_id) || null,
      unlockedAt: r.unlocked_at,
      title: achievementByKey(r.key)?.title || r.key,
      icon: achievementByKey(r.key)?.icon || 'star',
      details: parseJson(r.details, {}),
    }));
    return {
      items,
      history,
      total: ACHIEVEMENTS.length,
      farm: machineId ? { totalOnlineSec: Math.round(st.totalOnlineSec || 0) } : null,
    };
  }
}
