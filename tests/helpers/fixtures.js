/** Snapshots de exemplo para os testes (formato idêntico ao do coletor). */
const GB = 1024 ** 3;

export function snapshot({ cpu = 25, ram = 50, disks = [60], ioMB = 0, temp = null, gpu = 30, battery = null, ts = Date.now(), uptimeSec = 3600, processes } = {}) {
  return {
    v: 1,
    ts,
    host: { hostname: 'teste', platform: 'linux', os: 'Linux Teste', arch: 'x64', kernel: '6.0', uuid: 'uuid-teste' },
    cpu: { load: cpu, cores: [cpu, cpu], model: 'CPU de Teste', physicalCores: 2, threads: 4, speedGHz: 3, temp, loadAvg: [1, 1, 1] },
    mem: { total: 16 * GB, used: (16 * GB * ram) / 100, available: 16 * GB * (1 - ram / 100), pct: ram, swap: null },
    disks: disks.map((pct, i) => ({ name: i ? `/d${i}` : '/', mount: i ? `/d${i}` : '/', fs: 'ext4', size: 100 * GB, used: pct * GB, free: (100 - pct) * GB, pct })),
    diskIO: { readSec: ioMB * 1024 * 1024, writeSec: 0 },
    net: { iface: 'eth0', rxSec: 1000, txSec: 500, rxTotal: 1e9, txTotal: 5e8 },
    gpus: gpu == null ? [] : [{ name: 'GPU Teste', vendor: 'NVIDIA', util: gpu, temp: 50, vramTotal: 4 * GB, vramUsed: GB, fanPct: 30, powerW: 50 }],
    fans: [],
    battery,
    uptimeSec,
    ...(processes ? { processes } : {}),
  };
}
