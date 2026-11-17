/**
 * Coletor de métricas multiplataforma (Windows, Linux e, quando possível, macOS).
 *
 * Estratégia de baixo consumo, em camadas:
 *  - a cada leitura: CPU (delta de os.cpus), memória, rede, E/S de disco, GPU NVIDIA, sensores rápidos;
 *  - a cada 30 s: ocupação dos discos e bateria;
 *  - a cada 10 min: informações estáticas (modelo da CPU, SO, lista de GPUs).
 * As camadas lentas são atualizadas em segundo plano: `collect()` nunca espera por elas.
 * Sensor indisponível = null (nunca um valor inventado).
 */
import os from 'node:os';
import fs from 'node:fs';
import si from 'systeminformation';
import { WindowsHelper } from './windowsHelper.js';
import { NvidiaProbe } from './nvidia.js';
import { readNetTotals, readHwmonFans, readDrmGpus } from './linux.js';

const WIN = process.platform === 'win32';
const LINUX = process.platform === 'linux';

const IGNORED_FS = /^(tmpfs|devtmpfs|squashfs|overlay|efivarfs|ramfs|iso9660|udf|autofs|proc|sysfs|cgroup2?|nsfs|fuse\.snapfuse)$/i;
const VIRTUAL_GPU = /virtual|basic display|basic render|parsec|remote|vmware svga|hyper-v|citrix|spacedesk|meta virtual|llvmpipe/i;

const round = (v, d = 1) => (v == null || !Number.isFinite(v) ? null : Math.round(v * 10 ** d) / 10 ** d);
const withTimeout = (p, ms, fallback = null) =>
  Promise.race([p, new Promise((r) => setTimeout(() => r(fallback), ms).unref?.())]).catch(() => fallback);

/** Uso de CPU por núcleo a partir de duas leituras de os.cpus(). Exportado para testes. */
export function cpuUsageFromTimes(prev, cur) {
  const cores = cur.map((c, i) => {
    const a = prev[i];
    if (!a) return 0;
    const b = c.times;
    const total = Object.keys(b).reduce((s, k) => s + (b[k] - a.times[k]), 0);
    const idle = b.idle - a.times.idle;
    return total > 0 ? Math.max(0, Math.min(100, (1 - idle / total) * 100)) : 0;
  });
  const load = cores.length ? cores.reduce((s, v) => s + v, 0) / cores.length : 0;
  return { load, cores };
}

export class Collector {
  /**
   * @param {{ logger?: Console, windowsHelper?: boolean, helperIntervalMs?: number }} opts
   */
  constructor(opts = {}) {
    this.logger = opts.logger || console;
    this.useHelper = opts.windowsHelper !== false;
    this.helper = WIN && this.useHelper ? new WindowsHelper({ intervalMs: opts.helperIntervalMs || 2000, logger: this.logger }) : null;
    this.nvidia = new NvidiaProbe();
    this.prevCpu = os.cpus();
    this.prevNet = null;
    this.static = { cpu: null, os: null, uuid: null, gpus: [], defaultIface: null };
    this.cache = { disks: [], diskList: null, battery: null, swap: null, temp: null, tempTried: 0 };
    this.timers = { medium: 0, slow: 0 };
    this.refreshing = { medium: false, slow: false };
    this.procCache = { at: 0, list: null, pending: null };
    this.started = false;
  }

  async start() {
    if (this.started) return;
    this.started = true;
    this.helper?.start();
    // primeira carga das camadas lentas (com limite de tempo para não travar a inicialização)
    await withTimeout(this.#refreshSlow(), 15000);
    await withTimeout(this.#refreshMedium(), 10000);
    this.prevCpu = os.cpus();
    await new Promise((r) => setTimeout(r, 300));
  }

  stop() {
    this.helper?.stop();
    this.started = false;
  }

  async #refreshSlow() {
    if (this.refreshing.slow) return;
    this.refreshing.slow = true;
    try {
      const [cpu, osInfo, uuid, graphics, iface] = await Promise.all([
        si.cpu().catch(() => null),
        si.osInfo().catch(() => null),
        si.uuid().catch(() => null),
        si.graphics().catch(() => null),
        si.networkInterfaceDefault().catch(() => null),
      ]);
      if (cpu) this.static.cpu = cpu;
      if (osInfo) this.static.os = osInfo;
      if (uuid) this.static.uuid = uuid.os || uuid.hardware || null;
      if (graphics) {
        this.static.gpus = (graphics.controllers || [])
          .filter((c) => !VIRTUAL_GPU.test(`${c.vendor} ${c.model}`))
          .map((c) => ({
            name: c.model || c.name || 'GPU',
            vendor: c.vendor || '',
            util: c.utilizationGpu ?? null,
            temp: c.temperatureGpu ?? null,
            vramTotal: c.memoryTotal != null ? c.memoryTotal * 1048576 : c.vram ? c.vram * 1048576 : null,
            vramUsed: c.memoryUsed != null ? c.memoryUsed * 1048576 : null,
            fanPct: c.fanSpeed ?? null,
            powerW: c.powerDraw ?? null,
          }));
      }
      if (iface) this.static.defaultIface = iface;
      if (WIN) {
        // lista de unidades (as ocupações são lidas por statfs, que é instantâneo)
        const fsList = await si.fsSize().catch(() => null);
        if (fsList?.length) this.cache.diskList = fsList.map((f) => ({ name: f.fs, mount: f.mount, fs: f.type }));
      }
      // temperatura no Windows sem LibreHardwareMonitor: tenta WMI de vez em quando
      if (WIN && !this.helper?.read()?.sensors) {
        const t = await si.cpuTemperature().catch(() => null);
        this.cache.temp = t?.main ?? t?.max ?? null;
      }
    } finally {
      this.refreshing.slow = false;
      this.timers.slow = Date.now();
    }
  }

  async #refreshMedium() {
    if (this.refreshing.medium) return;
    this.refreshing.medium = true;
    try {
      this.cache.disks = await this.#readDisks();
      const bat = await si.battery().catch(() => null);
      this.cache.battery = bat && bat.hasBattery
        ? {
          pct: bat.percent ?? null,
          charging: !!bat.isCharging,
          acConnected: !!bat.acConnected,
          timeRemainingMin: bat.timeRemaining != null && bat.timeRemaining >= 0 ? bat.timeRemaining : null,
        }
        : null;
      if (WIN) {
        const mem = await si.mem().catch(() => null);
        this.cache.swap = mem && mem.swaptotal ? { total: mem.swaptotal, used: mem.swapused, pct: (mem.swapused / mem.swaptotal) * 100 } : null;
      }
    } finally {
      this.refreshing.medium = false;
      this.timers.medium = Date.now();
    }
  }

  async #readDisks() {
    if (WIN) {
      const list = this.cache.diskList || [{ name: 'C:', mount: 'C:', fs: 'NTFS' }];
      const out = [];
      for (const d of list) {
        try {
          const s = fs.statfsSync(`${d.mount}\\`);
          const size = s.blocks * s.bsize;
          if (!size) continue;
          const free = s.bavail * s.bsize;
          const used = size - s.bfree * s.bsize;
          out.push({ name: d.name, mount: d.mount, fs: d.fs, size, used, free, pct: round((used / size) * 100) });
        } catch {
          /* unidade removível sem mídia, etc. */
        }
      }
      return out;
    }
    const list = await si.fsSize().catch(() => []);
    const seen = new Set();
    return list
      .filter((f) => f.size > 1e9 && !IGNORED_FS.test(f.type || '') && !seen.has(f.fs) && seen.add(f.fs))
      .map((f) => ({
        name: f.mount === '/' ? '/' : f.mount,
        mount: f.mount,
        fs: f.type,
        size: f.size,
        used: f.used,
        free: f.available,
        pct: round(f.use),
      }));
  }

  #maybeRefresh() {
    const now = Date.now();
    if (now - this.timers.medium > 30e3) this.#refreshMedium().catch(() => {});
    if (now - this.timers.slow > 10 * 60e3) this.#refreshSlow().catch(() => {});
  }

  #cpu() {
    const cur = os.cpus();
    const { load, cores } = cpuUsageFromTimes(this.prevCpu, cur);
    this.prevCpu = cur;
    const c = this.static.cpu;
    const la = os.loadavg();
    return {
      load: round(load),
      cores: cores.map((v) => round(v)),
      model: c ? `${c.manufacturer || ''} ${c.brand || ''}`.trim() : cur[0]?.model?.trim() || null,
      physicalCores: c?.physicalCores ?? null,
      threads: c?.cores ?? cur.length,
      speedGHz: c?.speed ?? (cur[0] ? round(cur[0].speed / 1000) : null),
      temp: null,
      loadAvg: WIN ? null : la.map((v) => round(v, 2)),
    };
  }

  async #mem() {
    if (!WIN) {
      const m = await si.mem().catch(() => null);
      if (m) {
        const used = m.total - m.available;
        return {
          total: m.total, used, available: m.available, pct: round((used / m.total) * 100),
          swap: m.swaptotal ? { total: m.swaptotal, used: m.swapused, pct: round((m.swapused / m.swaptotal) * 100) } : null,
        };
      }
    }
    const total = os.totalmem();
    const available = os.freemem();
    const used = total - available;
    const swap = this.cache.swap ? { ...this.cache.swap, pct: round(this.cache.swap.pct) } : null;
    return { total, used, available, pct: round((used / total) * 100), swap };
  }

  #rates(totals, now) {
    // calcula bytes/s a partir de contadores acumulados
    const prev = this.prevNet;
    this.prevNet = { ...totals, t: now };
    if (!prev || now <= prev.t) return null;
    const dt = (now - prev.t) / 1000;
    const r = (a, b) => (a != null && b != null && a >= b ? (a - b) / dt : null);
    return { rxSec: r(totals.rx, prev.rx), txSec: r(totals.tx, prev.tx) };
  }

  async #netAndIO(now) {
    if (WIN) {
      const h = this.helper?.read();
      if (!h) return { net: null, diskIO: null, sensors: null };
      return {
        net: {
          iface: this.static.defaultIface || h.iface,
          rxSec: round(h.rates?.rxSec ?? null, 0),
          txSec: round(h.rates?.txSec ?? null, 0),
          rxTotal: h.rx,
          txTotal: h.tx,
        },
        diskIO: h.rates ? { readSec: round(h.rates.readSec, 0), writeSec: round(h.rates.writeSec, 0) } : null,
        sensors: h.sensors,
      };
    }
    let net = null;
    if (LINUX) {
      const t = readNetTotals(this.static.defaultIface);
      if (t) {
        const r = this.#rates(t, now);
        net = { iface: this.static.defaultIface || t.names[0] || null, rxSec: round(r?.rxSec ?? null, 0), txSec: round(r?.txSec ?? null, 0), rxTotal: t.rx, txTotal: t.tx };
      }
    } else {
      const ns = await si.networkStats().catch(() => null);
      const n = ns?.[0];
      if (n) net = { iface: n.iface, rxSec: round(n.rx_sec, 0), txSec: round(n.tx_sec, 0), rxTotal: n.rx_bytes, txTotal: n.tx_bytes };
    }
    const fsStats = await si.fsStats().catch(() => null);
    const diskIO = fsStats && fsStats.rx_sec != null ? { readSec: round(fsStats.rx_sec, 0), writeSec: round(fsStats.wx_sec, 0) } : null;
    return { net, diskIO, sensors: null };
  }

  async #gpus() {
    const nv = await this.nvidia.query();
    const others = this.static.gpus.filter((g) => !/nvidia/i.test(g.vendor) || !nv);
    const drm = LINUX ? readDrmGpus() : [];
    if (drm.length) return [...(nv || []), ...drm];
    return [...(nv || []), ...others];
  }

  /** Uma leitura completa (snapshot). */
  async collect() {
    if (!this.started) await this.start();
    const now = Date.now();
    this.#maybeRefresh();
    const cpu = this.#cpu();
    const [mem, io, gpus, linuxTemp] = await Promise.all([
      this.#mem(),
      this.#netAndIO(now),
      this.#gpus(),
      WIN ? Promise.resolve(null) : si.cpuTemperature().catch(() => null),
    ]);

    let fans = [];
    if (WIN) {
      cpu.temp = round(io.sensors?.cpuTemp ?? this.cache.temp ?? null);
      fans = io.sensors?.fans || [];
    } else {
      cpu.temp = round(linuxTemp?.main ?? linuxTemp?.max ?? null);
      if (LINUX) fans = readHwmonFans();
    }

    const o = this.static.os;
    return {
      v: 1,
      ts: now,
      host: {
        hostname: os.hostname(),
        platform: process.platform,
        os: o ? `${o.distro || o.platform} ${o.release || ''}`.trim() : `${os.type()} ${os.release()}`,
        arch: os.arch(),
        kernel: o?.kernel || os.release(),
        uuid: this.static.uuid,
      },
      cpu,
      mem,
      disks: this.cache.disks,
      diskIO: io.diskIO,
      net: io.net,
      gpus,
      fans,
      battery: this.cache.battery,
      uptimeSec: Math.round(os.uptime()),
    };
  }

  /**
   * Lista de processos (cara no Windows: ~2 s). Cache curto e chamadas simultâneas compartilhadas.
   */
  async processes({ maxAgeMs = 3000 } = {}) {
    const now = Date.now();
    if (this.procCache.list && now - this.procCache.at < maxAgeMs) return this.procCache.list;
    if (this.procCache.pending) return this.procCache.pending;
    this.procCache.pending = si
      .processes()
      .then((p) => {
        const total = os.totalmem();
        const list = (p?.list || [])
          .filter((x) => x.pid > 0 || !WIN)
          .map((x) => {
            const started = x.started ? Date.parse(x.started.replace(' ', 'T')) : NaN;
            return {
              pid: x.pid,
              name: x.name || x.command || '?',
              user: x.user || null,
              cpu: round(x.cpu ?? 0),
              mem: round(x.mem ?? (x.memRss ? (x.memRss * 1024 * 100) / total : 0), 2),
              memRss: x.memRss != null ? x.memRss * 1024 : null,
              started: Number.isFinite(started) ? started : null,
              state: x.state && x.state !== 'unknown' ? x.state : null,
            };
          });
        this.procCache = { at: Date.now(), list, pending: null };
        return list;
      })
      .catch((err) => {
        this.procCache.pending = null;
        throw err;
      });
    return this.procCache.pending;
  }

  /** Top N processos por CPU e por memória (para os agentes enviarem). */
  async topProcesses(n = 60) {
    const list = await this.processes();
    const byCpu = [...list].sort((a, b) => b.cpu - a.cpu).slice(0, n);
    const byMem = [...list].sort((a, b) => b.mem - a.mem).slice(0, n);
    const map = new Map();
    for (const p of [...byCpu, ...byMem]) map.set(p.pid, p);
    return [...map.values()];
  }
}

export { si };
