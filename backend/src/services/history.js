/**
 * Histórico de métricas.
 *  - metrics_raw: cada leitura (mantida por ~26 h);
 *  - metrics_agg res=60: média e máximo por minuto (~8 dias);
 *  - metrics_agg res=3600: média e máximo por hora (~400 dias).
 * A agregação reprocessa só o trecho "sujo" (que recebeu dados novos), então o custo é pequeno
 * e leituras atrasadas (agente que ficou sem rede) também entram na agregação.
 */
import { HISTORY_RANGES, METRIC_KEYS, snapshotToRow } from '@stardew-monitor/shared';

const COLS = METRIC_KEYS;
const MAX_POINTS = 360;
const MIN = 60e3;
const HOUR = 3600e3;

export class HistoryService {
  constructor(db, { settings, logger }) {
    this.db = db;
    this.settings = settings;
    this.logger = logger;
    this.dirtyMinute = new Map(); // machineId -> menor ts recebido desde a última agregação
    this.dirtyHour = new Map();
  }

  /** Grava várias leituras de uma máquina (ignora duplicadas: reenvio do agente é seguro). */
  async insertSamples(machineId, snapshots) {
    if (!snapshots.length) return 0;
    const rows = snapshots.map((s) => ({ ts: Math.round(s.ts), ...snapshotToRow(s) }));
    const placeholders = `(${['?', '?', ...COLS.map(() => '?')].join(', ')})`;
    const sql = `INSERT INTO metrics_raw (machine_id, ts, ${COLS.join(', ')}) VALUES ${rows.map(() => placeholders).join(', ')} ON CONFLICT (machine_id, ts) DO NOTHING`;
    const params = rows.flatMap((r) => [machineId, r.ts, ...COLS.map((c) => r[c])]);
    await this.db.run(sql, params);
    const minTs = Math.min(...rows.map((r) => r.ts));
    this.dirtyMinute.set(machineId, Math.min(this.dirtyMinute.get(machineId) ?? Infinity, minTs));
    return rows.length;
  }

  /** Agrega leituras brutas em minutos (inclui o minuto atual, que é atualizado depois). */
  async rollupMinutes(now = Date.now()) {
    const machines = [...this.dirtyMinute.entries()];
    this.dirtyMinute.clear();
    for (const [machineId, minTs] of machines) {
      const from = Math.floor(Math.min(minTs, now) / MIN) * MIN;
      const selects = COLS.map((c) => `AVG(${c}), MAX(${c})`).join(', ');
      const cols = COLS.map((c) => `${c}_avg, ${c}_max`).join(', ');
      const updates = ['n', ...COLS.flatMap((c) => [`${c}_avg`, `${c}_max`])].map((c) => `${c} = excluded.${c}`).join(', ');
      await this.db.run(
        `INSERT INTO metrics_agg (machine_id, res, ts, n, ${cols})
         SELECT machine_id, 60, (ts / 60000) * 60000 AS bucket, COUNT(*), ${selects}
         FROM metrics_raw WHERE machine_id = ? AND ts >= ?
         GROUP BY machine_id, bucket
         ON CONFLICT (machine_id, res, ts) DO UPDATE SET ${updates}`,
        [machineId, from],
      );
      this.dirtyHour.set(machineId, Math.min(this.dirtyHour.get(machineId) ?? Infinity, from));
    }
  }

  /** Agrega minutos em horas (média ponderada pelo número de leituras). */
  async rollupHours() {
    const machines = [...this.dirtyHour.entries()];
    this.dirtyHour.clear();
    for (const [machineId, minTs] of machines) {
      const from = Math.floor(minTs / HOUR) * HOUR;
      const selects = COLS.map(
        (c) => `SUM(${c}_avg * n) / NULLIF(SUM(CASE WHEN ${c}_avg IS NOT NULL THEN n ELSE 0 END), 0), MAX(${c}_max)`,
      ).join(', ');
      const cols = COLS.map((c) => `${c}_avg, ${c}_max`).join(', ');
      const updates = ['n', ...COLS.flatMap((c) => [`${c}_avg`, `${c}_max`])].map((c) => `${c} = excluded.${c}`).join(', ');
      await this.db.run(
        `INSERT INTO metrics_agg (machine_id, res, ts, n, ${cols})
         SELECT machine_id, 3600, (ts / 3600000) * 3600000 AS bucket, SUM(n), ${selects}
         FROM metrics_agg WHERE machine_id = ? AND res = 60 AND ts >= ?
         GROUP BY machine_id, bucket
         ON CONFLICT (machine_id, res, ts) DO UPDATE SET ${updates}`,
        [machineId, from],
      );
    }
  }

  /** Remove dados antigos conforme a política de retenção. */
  async applyRetention(now = Date.now()) {
    const r = this.settings.get('retention');
    await this.db.run('DELETE FROM metrics_raw WHERE ts < ?', [now - r.rawHours * HOUR]);
    await this.db.run('DELETE FROM metrics_agg WHERE res = 60 AND ts < ?', [now - r.minuteDays * 24 * HOUR]);
    await this.db.run('DELETE FROM metrics_agg WHERE res = 3600 AND ts < ?', [now - r.hourDays * 24 * HOUR]);
    await this.db.run('DELETE FROM notifications WHERE created_at < ?', [now - r.notificationDays * 24 * HOUR]);
    await this.db.run('DELETE FROM audit_log WHERE ts < ?', [now - r.auditDays * 24 * HOUR]);
    await this.db.run("DELETE FROM agent_commands WHERE status <> 'pending' AND updated_at < ?", [now - 7 * 24 * HOUR]);
  }

  /**
   * Série histórica de uma máquina.
   * @returns {{ range, stepMs, source, points: Array<{ ts, cpu, cpu_max, ... }> }}
   */
  async query(machineId, range = '1h', now = Date.now()) {
    const def = HISTORY_RANGES[range];
    if (!def) throw Object.assign(new Error('Período inválido.'), { status: 400 });
    const from = now - def.ms;
    const baseStep = def.source === 'raw' ? 0 : def.source === 'minute' ? MIN : HOUR;
    const stepMs = Math.max(baseStep, Math.ceil(def.ms / MAX_POINTS / 1000) * 1000);
    let rows;
    if (def.source === 'raw') {
      const selects = COLS.map((c) => `AVG(${c}) AS ${c}, MAX(${c}) AS ${c}_max`).join(', ');
      rows = await this.db.all(
        `SELECT CAST(ts / ? AS BIGINT) * ? AS bucket, ${selects} FROM metrics_raw
         WHERE machine_id = ? AND ts >= ? GROUP BY bucket ORDER BY bucket`,
        [stepMs, stepMs, machineId, from],
      );
    } else {
      const res = def.source === 'minute' ? 60 : 3600;
      const selects = COLS.map(
        (c) => `SUM(${c}_avg * n) / NULLIF(SUM(CASE WHEN ${c}_avg IS NOT NULL THEN n ELSE 0 END), 0) AS ${c}, MAX(${c}_max) AS ${c}_max`,
      ).join(', ');
      rows = await this.db.all(
        `SELECT CAST(ts / ? AS BIGINT) * ? AS bucket, ${selects} FROM metrics_agg
         WHERE machine_id = ? AND res = ? AND ts >= ? GROUP BY bucket ORDER BY bucket`,
        [stepMs, stepMs, machineId, res, from],
      );
    }
    const round = (v) => (v == null ? null : Math.round(Number(v) * 100) / 100);
    const points = rows.map((r) => {
      const p = { ts: Number(r.bucket) };
      for (const c of COLS) {
        p[c] = round(r[c]);
        p[`${c}_max`] = round(r[`${c}_max`]);
      }
      return p;
    });
    return { range, label: def.label, stepMs, source: def.source, from, to: now, points };
  }

  /** Máximo diário de ocupação de disco (para a conquista Fazenda Organizada). */
  async dailyDiskMax(machineId, days, now = Date.now()) {
    const rows = await this.db.all(
      `SELECT (ts / 86400000) AS day, MAX(disk_max) AS disk FROM metrics_agg
       WHERE machine_id = ? AND res = 3600 AND ts >= ? GROUP BY day ORDER BY day`,
      [machineId, now - (days + 1) * 24 * HOUR],
    );
    return rows.map((r) => ({ day: Number(r.day), disk: r.disk == null ? null : Number(r.disk) }));
  }

  /** Médias semanais de RAM (semana começando na segunda-feira, UTC). */
  async weeklyRam(machineId) {
    const WEEK = 7 * 24 * HOUR;
    const OFFSET = 4 * 24 * HOUR; // 01/01/1970 foi quinta-feira
    const rows = await this.db.all(
      `SELECT ((ts - ${OFFSET}) / ${WEEK}) AS week,
              SUM(ram_avg * n) / NULLIF(SUM(CASE WHEN ram_avg IS NOT NULL THEN n ELSE 0 END), 0) AS ram,
              COUNT(*) AS hours
       FROM metrics_agg WHERE machine_id = ? AND res = 3600
       GROUP BY week ORDER BY week`,
      [machineId],
    );
    return rows.map((r) => ({ week: Number(r.week), ram: r.ram == null ? null : Number(r.ram), hours: Number(r.hours) }));
  }
}

export const WEEK_MS = 7 * 24 * HOUR;
export const WEEK_OFFSET_MS = 4 * 24 * HOUR;
