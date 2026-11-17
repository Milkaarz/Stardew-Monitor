/**
 * Avaliação de alertas (funções puras + rastreador com estado).
 * O backend chama `evaluateSnapshot` a cada leitura e passa o resultado ao `AlertTracker`,
 * que decide QUANDO notificar: respeita o tempo de sustentação, o intervalo mínimo
 * entre alertas (cooldown) e evita notificações repetidas.
 */
import { DEFAULT_THRESHOLDS, levelRank } from './constants.js';
import { gpuSummary } from './snapshot.js';
import { formatPercent, formatTemp } from './format.js';

export const ALERT_TEXT = Object.freeze({
  cpu: {
    warn: 'A fazenda está consumindo muita energia!',
    crit: 'A fazenda chegou ao limite da energia!',
    ok: 'A energia da fazenda voltou ao normal.',
  },
  ram: {
    warn: 'As plantações estão ocupando muito espaço!',
    crit: 'As plantações tomaram conta da fazenda!',
    ok: 'As plantações voltaram ao tamanho normal.',
  },
  disk: {
    warn: 'O silo está quase cheio!',
    crit: 'O silo está transbordando!',
    ok: 'O silo voltou a ter espaço.',
  },
  temperature: {
    warn: 'A casa está ficando muito quente!',
    crit: 'A casa está fervendo! Hora de resfriar.',
    ok: 'A casa refrescou.',
  },
  gpu: {
    warn: 'O moinho está girando sem parar!',
    crit: 'O moinho está prestes a quebrar!',
    ok: 'O moinho voltou ao ritmo normal.',
  },
  battery: {
    warn: 'A estamina está acabando!',
    crit: 'O fazendeiro vai desmaiar! Bateria crítica.',
    ok: 'A estamina foi recuperada.',
  },
  offline: {
    warn: 'Tem algo estranho acontecendo na fazenda!',
    crit: 'Tem algo estranho acontecendo na fazenda! Ela parou de dar sinal.',
    ok: 'A fazenda voltou a dar sinal de vida.',
  },
});

/** Nível para valores em que "maior é pior". */
export function levelAbove(value, warn, crit) {
  if (value == null || !Number.isFinite(+value)) return 'ok';
  if (+value >= crit) return 'crit';
  if (+value >= warn) return 'warn';
  return 'ok';
}

/** Nível para valores em que "menor é pior" (bateria). */
export function levelBelow(value, warn, crit) {
  if (value == null || !Number.isFinite(+value)) return 'ok';
  if (+value <= crit) return 'crit';
  if (+value <= warn) return 'warn';
  return 'ok';
}

export function mergeThresholds(custom = {}) {
  const out = {};
  for (const [k, def] of Object.entries(DEFAULT_THRESHOLDS)) out[k] = { ...def, ...(custom[k] || {}) };
  return out;
}

/**
 * Transforma um snapshot em leituras avaliadas.
 * Cada leitura: { key, category, level, value, unit, detail, sustainSec }
 */
export function evaluateSnapshot(snap, thresholds = DEFAULT_THRESHOLDS) {
  const t = mergeThresholds(thresholds);
  const out = [];
  if (!snap) return out;

  const cpu = snap.cpu?.load;
  if (t.cpu.enabled && cpu != null) {
    out.push({
      key: 'cpu', category: 'cpu', value: cpu, sustainSec: t.cpu.sustainSec,
      level: levelAbove(cpu, t.cpu.warn, t.cpu.crit),
      detail: `CPU em ${formatPercent(cpu)} (aviso ${t.cpu.warn}%, crítico ${t.cpu.crit}%)`,
    });
  }

  const ram = snap.mem?.pct;
  if (t.ram.enabled && ram != null) {
    out.push({
      key: 'ram', category: 'ram', value: ram, sustainSec: t.ram.sustainSec,
      level: levelAbove(ram, t.ram.warn, t.ram.crit),
      detail: `RAM em ${formatPercent(ram)} (aviso ${t.ram.warn}%, crítico ${t.ram.crit}%)`,
    });
  }

  if (t.disk.enabled) {
    for (const d of snap.disks || []) {
      if (d?.pct == null) continue;
      out.push({
        key: `disk:${d.name || d.mount}`, category: 'disk', value: d.pct, sustainSec: t.disk.sustainSec,
        level: levelAbove(d.pct, t.disk.warn, t.disk.crit),
        detail: `Disco ${d.name || d.mount} com ${formatPercent(d.pct)} ocupado (aviso ${t.disk.warn}%, crítico ${t.disk.crit}%)`,
      });
    }
  }

  const temp = snap.cpu?.temp;
  if (t.temperature.enabled && temp != null) {
    out.push({
      key: 'temperature', category: 'temperature', value: temp, sustainSec: t.temperature.sustainSec,
      level: levelAbove(temp, t.temperature.warn, t.temperature.crit),
      detail: `CPU a ${formatTemp(temp)} (aviso ${t.temperature.warn} °C, crítico ${t.temperature.crit} °C)`,
    });
  }

  const gpu = gpuSummary(snap);
  if (t.gpu.enabled && gpu) {
    if (gpu.util != null) {
      out.push({
        key: 'gpu', category: 'gpu', value: gpu.util, sustainSec: t.gpu.sustainSec,
        level: levelAbove(gpu.util, t.gpu.warn, t.gpu.crit),
        detail: `GPU ${gpu.name} em ${formatPercent(gpu.util)} (aviso ${t.gpu.warn}%, crítico ${t.gpu.crit}%)`,
      });
    }
    if (gpu.temp != null) {
      out.push({
        key: 'gpu_temp', category: 'gpu', value: gpu.temp, sustainSec: Math.min(t.gpu.sustainSec, 60),
        level: levelAbove(gpu.temp, t.gpu.tempWarn, t.gpu.tempCrit),
        detail: `GPU ${gpu.name} a ${formatTemp(gpu.temp)} (aviso ${t.gpu.tempWarn} °C, crítico ${t.gpu.tempCrit} °C)`,
      });
    }
  }

  const bat = snap.battery;
  if (t.battery.enabled && bat && bat.pct != null) {
    // bateria baixa só preocupa quando está descarregando
    const discharging = !bat.charging && !bat.acConnected;
    out.push({
      key: 'battery', category: 'battery', value: bat.pct, sustainSec: t.battery.sustainSec,
      level: discharging ? levelBelow(bat.pct, t.battery.warn, t.battery.crit) : 'ok',
      detail: `Bateria em ${formatPercent(bat.pct)}${discharging ? ' e descarregando' : ''}`,
    });
  }
  return out;
}

/** Pior nível entre as leituras. */
export function overallLevel(readings) {
  return readings.reduce((acc, r) => (levelRank(r.level) > levelRank(acc) ? r.level : acc), 'ok');
}

/**
 * Rastreador de estado de alertas de UMA máquina.
 * Estados por chave: nível confirmado, candidato (aguardando sustentação), último nível notificado.
 */
export class AlertTracker {
  constructor({ cooldownMs = 30 * 60e3, notifyRecovery = true } = {}) {
    this.cooldownMs = cooldownMs;
    this.notifyRecovery = notifyRecovery;
    this.state = new Map();
  }

  configure({ cooldownMs, notifyRecovery } = {}) {
    if (cooldownMs != null) this.cooldownMs = cooldownMs;
    if (notifyRecovery != null) this.notifyRecovery = notifyRecovery;
  }

  /** Retorna a lista de eventos a notificar: { type: 'alert'|'recovery', ...leitura } */
  update(readings, now = Date.now()) {
    const events = [];
    for (const r of readings) {
      let s = this.state.get(r.key);
      if (!s) {
        s = { level: 'ok', candidate: 'ok', candidateSince: now, notified: 'ok', lastNotifiedAt: -Infinity };
        this.state.set(r.key, s);
      }
      if (r.level !== s.candidate) {
        s.candidate = r.level;
        s.candidateSince = now;
      }
      const sustainMs = Math.max(0, (r.sustainSec || 0) * 1000);
      if (s.level !== s.candidate && now - s.candidateSince >= sustainMs) s.level = s.candidate;
      s.value = r.value;

      const rankNow = levelRank(s.level);
      const rankNotified = levelRank(s.notified);
      if (rankNow > rankNotified) {
        const escalation = s.notified === 'warn' && s.level === 'crit';
        if (escalation || now - s.lastNotifiedAt >= this.cooldownMs) {
          events.push({ type: 'alert', ...r, level: s.level });
          s.notified = s.level;
          s.lastNotifiedAt = now;
        }
      } else if (s.level === 'ok' && s.notified !== 'ok') {
        if (this.notifyRecovery) events.push({ type: 'recovery', ...r, level: 'ok' });
        s.notified = 'ok';
      } else if (rankNow < rankNotified) {
        s.notified = s.level; // crit -> warn: rebaixa em silêncio
      }
    }
    return events;
  }

  /** Níveis confirmados atuais (para o status da máquina). */
  levels() {
    const out = {};
    for (const [k, s] of this.state) out[k] = s.level;
    return out;
  }

  confirmedLevel() {
    let l = 'ok';
    for (const s of this.state.values()) if (levelRank(s.level) > levelRank(l)) l = s.level;
    return l;
  }
}

export function alertTitle(category, level) {
  const t = ALERT_TEXT[category] || ALERT_TEXT.offline;
  return t[level] || t.warn;
}
