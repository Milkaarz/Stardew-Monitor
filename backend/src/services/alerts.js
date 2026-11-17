/**
 * Motor de alertas: um AlertTracker por máquina, alimentado a cada leitura.
 * A decisão de notificar (sustentação, cooldown, sem repetição) fica no AlertTracker (shared).
 */
import { AlertTracker, alertTitle, evaluateSnapshot, overallLevel } from '@stardew-monitor/shared';

export class AlertService {
  constructor({ settings, notifications, logger }) {
    this.settings = settings;
    this.notifications = notifications;
    this.logger = logger;
    this.trackers = new Map();
  }

  #tracker(machineId) {
    const cfg = this.settings.get('notifications');
    let t = this.trackers.get(machineId);
    if (!t) {
      t = new AlertTracker({ cooldownMs: cfg.cooldownMin * 60e3, notifyRecovery: cfg.notifyRecovery });
      this.trackers.set(machineId, t);
    } else {
      t.configure({ cooldownMs: cfg.cooldownMin * 60e3, notifyRecovery: cfg.notifyRecovery });
    }
    return t;
  }

  /** Avalia uma leitura. Retorna o nível confirmado da máquina (ok/warn/crit). */
  async process(machine, snapshot, now = Date.now()) {
    const readings = evaluateSnapshot(snapshot, this.settings.get('thresholds'));
    const tracker = this.#tracker(machine.row.id);
    const events = tracker.update(readings, now);
    for (const e of events) await this.#emit(machine, e);
    // nível exibido no mapa: o confirmado pelo rastreador (respeita o tempo de sustentação)
    return tracker.confirmedLevel();
  }

  /** Nível instantâneo, sem esperar a sustentação (usado em testes e diagnósticos). */
  instantLevel(snapshot) {
    return overallLevel(evaluateSnapshot(snapshot, this.settings.get('thresholds')));
  }

  async machineOffline(machine, now = Date.now()) {
    const t = this.settings.get('thresholds').offline;
    if (!t.enabled) return;
    const events = this.#tracker(machine.row.id).update([{
      key: 'offline', category: 'offline', level: 'crit', value: null, sustainSec: 0,
      detail: `A fazenda "${machine.row.farm_name}" não envia dados desde ${new Date(machine.live.lastSeenAt || now).toLocaleString('pt-BR')}.`,
    }], now);
    for (const e of events) await this.#emit(machine, e);
  }

  async machineOnline(machine, now = Date.now()) {
    const tracker = this.trackers.get(machine.row.id);
    if (!tracker || !tracker.state.has('offline')) return;
    const events = tracker.update([{
      key: 'offline', category: 'offline', level: 'ok', value: null, sustainSec: 0,
      detail: `A fazenda "${machine.row.farm_name}" voltou a enviar dados.`,
    }], now);
    for (const e of events) await this.#emit(machine, e);
  }

  async #emit(machine, e) {
    await this.notifications.notify({
      machineId: machine.row.id,
      machineName: machine.row.farm_name,
      kind: e.type,
      category: e.category,
      level: e.level,
      title: alertTitle(e.category, e.type === 'recovery' ? 'ok' : e.level),
      message: e.detail,
    });
  }

  forget(machineId) {
    this.trackers.delete(machineId);
  }
}
