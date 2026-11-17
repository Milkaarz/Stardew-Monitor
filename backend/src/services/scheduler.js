/**
 * Tarefas periódicas:
 *  - a cada 5 s: detecta máquinas sem sinal (cinza no mapa);
 *  - a cada 60 s: agrega o histórico e salva os contadores das conquistas;
 *  - a cada hora: retenção de dados e conquistas de longo prazo.
 */
export class Scheduler {
  constructor({ machines, ingest, history, achievements, settings, logger }) {
    Object.assign(this, { machines, ingest, history, achievements, settings, logger });
    this.timers = [];
    this.lastHourly = 0;
  }

  offlineAfterMs(m) {
    const cfg = this.settings.get('thresholds').offline;
    const interval = (m.row.interval_sec || 10) * 1000;
    return Math.max((cfg.afterSec || 60) * 1000, interval * 3);
  }

  async checkOffline(now = Date.now()) {
    for (const m of this.machines.list()) {
      if (!m.live.online) continue;
      const silent = now - (m.live.lastSeenAt || 0);
      if (m.live.goodbye || silent > this.offlineAfterMs(m)) await this.ingest.markOffline(m, now);
    }
  }

  async minutely(now = Date.now()) {
    await this.history.rollupMinutes(now);
    await this.history.rollupHours(now);
    await this.achievements.persist();
  }

  async hourly(now = Date.now()) {
    this.lastHourly = now;
    await this.history.applyRetention(now);
    await this.achievements.periodic(this.machines.list(), now);
  }

  #every(ms, fn, name) {
    let busy = false;
    const t = setInterval(async () => {
      if (busy) return;
      busy = true;
      try {
        await fn();
      } catch (err) {
        this.logger?.error(`[agendador] ${name}: ${err.message}`);
      } finally {
        busy = false;
      }
    }, ms);
    t.unref?.();
    this.timers.push(t);
  }

  start() {
    this.#every(5e3, () => this.checkOffline(), 'offline');
    this.#every(60e3, () => this.minutely(), 'agregação');
    this.#every(3600e3, () => this.hourly(), 'tarefas horárias');
    // primeira rodada horária logo após iniciar (sem bloquear o boot)
    setTimeout(() => this.hourly().catch((e) => this.logger?.error(`[agendador] ${e.message}`)), 30e3).unref?.();
  }

  async stop() {
    for (const t of this.timers) clearInterval(t);
    this.timers = [];
    try {
      await this.minutely();
    } catch {
      /* banco já fechado */
    }
  }
}
