/**
 * Formato do "snapshot" (uma leitura completa da máquina) e funções para extrair valores dele.
 *
 * {
 *   v: 1, ts,
 *   host: { hostname, platform, os, arch, kernel, uuid },
 *   cpu: { load, cores: [..%], model, physicalCores, threads, speedGHz, temp, loadAvg: [1,5,15] | null },
 *   mem: { total, used, available, pct, swap: { total, used, pct } | null },
 *   disks: [{ name, mount, fs, size, used, free, pct }],
 *   diskIO: { readSec, writeSec } | null,
 *   net: { iface, rxSec, txSec, rxTotal, txTotal } | null,
 *   gpus: [{ name, vendor, util, temp, vramTotal, vramUsed, fanPct, powerW }],
 *   fans: [{ name, rpm }],
 *   battery: { pct, charging, acConnected, timeRemainingMin } | null,
 *   uptimeSec,
 *   processes?: [{ pid, name, user, cpu, mem, memRss, started, state }]
 * }
 * Qualquer campo pode ser null quando o sensor não existe naquele sistema.
 */

const num = (v) => (v == null || !Number.isFinite(+v) ? null : +v);
const maxOf = (arr) => {
  const vals = arr.map(num).filter((v) => v != null);
  return vals.length ? Math.max(...vals) : null;
};

export function gpuSummary(snap) {
  const gpus = (snap?.gpus || []).filter(Boolean);
  if (!gpus.length) return null;
  // prioriza a GPU com telemetria (útil quando há adaptadores virtuais)
  const withData = gpus.filter((g) => num(g.util) != null || num(g.temp) != null || num(g.vramUsed) != null);
  const main = (withData.length ? withData : gpus).slice().sort((a, b) => (num(b.util) ?? -1) - (num(a.util) ?? -1))[0];
  const vramPct = num(main.vramTotal) && num(main.vramUsed) != null ? (main.vramUsed / main.vramTotal) * 100 : null;
  return {
    name: main.name || main.vendor || 'GPU',
    util: num(main.util),
    temp: num(main.temp),
    vramTotal: num(main.vramTotal),
    vramUsed: num(main.vramUsed),
    vramFree: num(main.vramTotal) != null && num(main.vramUsed) != null ? main.vramTotal - main.vramUsed : null,
    vramPct,
    fanPct: num(main.fanPct),
    powerW: num(main.powerW),
    count: gpus.length,
  };
}

export function diskMaxPct(snap) {
  return maxOf((snap?.disks || []).map((d) => d.pct));
}

export function maxFanRpm(snap) {
  return maxOf((snap?.fans || []).map((f) => f.rpm));
}

/** Converte um snapshot na linha numérica do histórico. */
export function snapshotToRow(snap) {
  const gpu = gpuSummary(snap);
  return {
    cpu: num(snap?.cpu?.load),
    ram: num(snap?.mem?.pct),
    swap: num(snap?.mem?.swap?.pct),
    gpu: gpu ? gpu.util : null,
    vram: gpu ? gpu.vramPct : null,
    cpu_temp: num(snap?.cpu?.temp),
    gpu_temp: gpu ? gpu.temp : null,
    disk: diskMaxPct(snap),
    disk_read: num(snap?.diskIO?.readSec),
    disk_write: num(snap?.diskIO?.writeSec),
    net_rx: num(snap?.net?.rxSec),
    net_tx: num(snap?.net?.txSec),
    battery: snap?.battery ? num(snap.battery.pct) : null,
    fan: maxFanRpm(snap),
  };
}

/** Remove campos que não devem trafegar para a interface/SSE (lista de processos). */
export function stripSnapshot(snap) {
  if (!snap) return snap;
  const { processes: _p, ...rest } = snap;
  return rest;
}
