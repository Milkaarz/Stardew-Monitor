/**
 * Ingestão de leituras: o MESMO caminho para o monitor local embutido e para os agentes remotos.
 * leitura -> histórico -> estado ao vivo -> alertas -> conquistas -> evento SSE.
 */
import { stripSnapshot } from '@stardew-monitor/shared';

const MAX_FUTURE_MS = 60e3;

export class IngestService {
  constructor({ machines, history, alerts, achievements, bus, logger }) {
    this.machines = machines;
    this.history = history;
    this.alerts = alerts;
    this.achievements = achievements;
    this.bus = bus;
    this.logger = logger;
  }

  /**
   * @param {object} machine entrada do MachineRegistry
   * @param {object[]} samples snapshots (já validados)
   * @param {{ intervalSec?: number, now?: number }} opts
   */
  async ingest(machine, samples, { intervalSec, now = Date.now() } = {}) {
    if (!samples.length) return { accepted: 0 };
    const retentionMs = 24 * 3600e3;
    // relógio do agente adiantado: usa o horário do servidor; leituras velhas demais são descartadas
    const clean = samples
      .map((s) => ({ ...s, ts: Math.min(Math.round(Number(s.ts) || now), now) }))
      .filter((s) => s.ts >= now - retentionMs && s.ts <= now + MAX_FUTURE_MS)
      .sort((a, b) => a.ts - b.ts);
    if (!clean.length) return { accepted: 0 };

    await this.history.insertSamples(machine.row.id, clean);

    const live = machine.live;
    const wasOnline = live.online;
    const latest = clean[clean.length - 1];
    const isNewest = !live.snapshot || latest.ts >= (live.snapshot.ts || 0);

    for (const s of clean) {
      this.machines.pushCpu(machine, s.ts, s.cpu?.load ?? null);
      await this.achievements.onSample(machine, s, { intervalSec: intervalSec || machine.row.interval_sec || 10 });
    }

    if (isNewest) {
      if (latest.processes) {
        live.processes = latest.processes;
        live.processesAt = now;
      }
      live.snapshot = stripSnapshot(latest);
      live.receivedAt = now;
      live.lastSeenAt = now;
      live.online = true;
      live.goodbye = false;

      // identificação da máquina
      machine.row.hostname = latest.host?.hostname || machine.row.hostname;
      machine.row.host_uuid = latest.host?.uuid || machine.row.host_uuid;
      machine.row.info = {
        os: latest.host?.os || null,
        platform: latest.host?.platform || null,
        arch: latest.host?.arch || null,
        cpuModel: latest.cpu?.model || null,
        threads: latest.cpu?.threads ?? null,
        physicalCores: latest.cpu?.physicalCores ?? null,
        memTotal: latest.mem?.total ?? null,
      };
      if (intervalSec && machine.row.interval_sec !== intervalSec) machine.row.interval_sec = intervalSec;

      if (!wasOnline) await this.alerts.machineOnline(machine, now);
      live.level = await this.alerts.process(machine, latest, now);
      await this.machines.persist(machine, { force: !wasOnline });
      this.bus.emit('metrics', this.machines.livePayload(machine, {
        farmSeconds: this.achievements.stateOf(machine.row.id).data.totalOnlineSec,
      }));
    }
    return { accepted: clean.length };
  }

  /** Marca a máquina como desconectada (sem dados recentes ou despedida do agente). */
  async markOffline(machine, now = Date.now()) {
    if (!machine.live.online) return;
    machine.live.online = false;
    await this.machines.persist(machine, { force: true });
    await this.alerts.machineOffline(machine, now);
    this.bus.emit('metrics', this.machines.livePayload(machine));
  }
}
