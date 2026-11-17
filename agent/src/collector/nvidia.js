/**
 * Telemetria de GPUs NVIDIA via `nvidia-smi` (rápido: ~100 ms).
 * Se o comando não existir, desativa e tenta de novo a cada 10 minutos.
 */
import { execFile } from 'node:child_process';

const FIELDS = ['index', 'name', 'utilization.gpu', 'temperature.gpu', 'memory.total', 'memory.used', 'fan.speed', 'power.draw'];

export function parseNvidiaCsv(stdout) {
  const num = (s) => {
    const v = parseFloat(String(s).trim());
    return Number.isFinite(v) ? v : null; // "[N/A]", "[Not Supported]" -> null
  };
  return String(stdout || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const c = l.split(',').map((s) => s.trim());
      const mib = 1024 * 1024;
      return {
        name: c[1] || 'NVIDIA GPU',
        vendor: 'NVIDIA',
        util: num(c[2]),
        temp: num(c[3]),
        vramTotal: num(c[4]) != null ? num(c[4]) * mib : null,
        vramUsed: num(c[5]) != null ? num(c[5]) * mib : null,
        fanPct: num(c[6]),
        powerW: num(c[7]),
      };
    });
}

export class NvidiaProbe {
  constructor() {
    this.disabledUntil = 0;
  }

  query() {
    if (Date.now() < this.disabledUntil) return Promise.resolve(null);
    return new Promise((resolve) => {
      execFile(
        'nvidia-smi',
        [`--query-gpu=${FIELDS.join(',')}`, '--format=csv,noheader,nounits'],
        { windowsHide: true, timeout: 4000 },
        (err, stdout) => {
          if (err) {
            this.disabledUntil = Date.now() + 10 * 60e3;
            return resolve(null);
          }
          resolve(parseNvidiaCsv(stdout));
        },
      );
    });
  }
}
