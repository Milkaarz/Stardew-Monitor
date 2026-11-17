// Coleta de métricas: cálculos e leitores de cada plataforma + uma coleta real nesta máquina.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpuUsageFromTimes, Collector } from '@stardew-monitor/agent/collector';
import { parseNvidiaCsv } from '../../agent/src/collector/nvidia.js';
import { sumNetworkCounters, parseSensors } from '../../agent/src/collector/windowsHelper.js';
import { parseProcNetDev } from '../../agent/src/collector/linux.js';
import { snapshotToRow, gpuSummary, protectionReason, sameProcessName } from '@stardew-monitor/shared';
import { snapshotSchema } from '../../backend/src/schemas.js';

test('uso de CPU por núcleo a partir de duas leituras', () => {
  const t = (user, idle) => ({ times: { user, nice: 0, sys: 0, idle, irq: 0 } });
  const r = cpuUsageFromTimes([t(100, 900), t(0, 1000)], [t(150, 950), t(100, 1000)]);
  assert.deepEqual(r.cores, [50, 100]);
  assert.equal(r.load, 75);
});

test('nvidia-smi: valores ausentes viram null, nunca zero inventado', () => {
  const gpus = parseNvidiaCsv('0, NVIDIA GeForce GTX 1060 3GB, 43, 46, 3072, 1471, 36, 15.11\n1, Tesla T4, [N/A], 40, 15360, 0, [Not Supported], [N/A]\n');
  assert.equal(gpus.length, 2);
  assert.equal(gpus[0].util, 43);
  assert.equal(gpus[0].vramTotal, 3072 * 1048576);
  assert.equal(gpus[1].util, null);
  assert.equal(gpus[1].fanPct, null);
});

test('rede no Windows ignora interfaces virtuais', () => {
  const r = sumNetworkCounters([{ n: 'Realtek PCIe GbE', rx: 100, tx: 50 }, { n: 'Teredo Tunneling Pseudo-Interface', rx: 999, tx: 999 }]);
  assert.deepEqual([r.rx, r.tx, r.names], [100, 50, ['Realtek PCIe GbE']]);
});

test('sensores do LibreHardwareMonitor: CPU Package e ventoinhas', () => {
  const s = parseSensors([
    { n: 'CPU Package', k: 'Temperature', v: 61.5, p: '/amdcpu/0' },
    { n: 'Core #1', k: 'Temperature', v: 58, p: '/amdcpu/0' },
    { n: 'GPU Core', k: 'Temperature', v: 70, p: '/gpu-nvidia/0' },
    { n: 'Fan #1', k: 'Fan', v: 1200, p: '/lpc/nct6798d' },
    { n: 'Fan #2', k: 'Fan', v: 0, p: '/lpc/nct6798d' },
  ]);
  assert.equal(s.cpuTemp, 61.5);
  assert.deepEqual(s.fans, [{ name: 'Fan #1', rpm: 1200 }]);
});

test('/proc/net/dev no Linux ignora loopback e docker', () => {
  const txt = `Inter-|   Receive |  Transmit
 face |bytes    packets errs drop fifo frame compressed multicast|bytes    packets errs drop fifo colls carrier compressed
    lo: 1000 10 0 0 0 0 0 0 1000 10 0 0 0 0 0 0
  eth0: 5000 50 0 0 0 0 0 0 3000 30 0 0 0 0 0 0
docker0: 700 7 0 0 0 0 0 0 700 7 0 0 0 0 0 0`;
  assert.deepEqual(parseProcNetDev(txt), { rx: 5000, tx: 3000, names: ['eth0'] });
  assert.equal(parseProcNetDev(txt, 'lo').rx, 1000);
});

test('linha do histórico a partir do snapshot', () => {
  const row = snapshotToRow({ cpu: { load: 10, temp: null }, mem: { pct: 20 }, disks: [{ pct: 30 }, { pct: 70 }], gpus: [{ util: null, temp: null, vramTotal: null }] });
  assert.equal(row.cpu, 10);
  assert.equal(row.disk, 70);
  assert.equal(row.cpu_temp, null);
  assert.equal(row.gpu, null);
  assert.equal(gpuSummary({ gpus: [] }), null);
});

test('proteção de processos essenciais', () => {
  assert.equal(protectionReason({ pid: 4, name: 'System' }, { platform: 'win32' }).protected, true);
  assert.equal(protectionReason({ pid: 812, name: 'lsass.exe' }, { platform: 'win32' }).protected, true);
  assert.equal(protectionReason({ pid: 1, name: 'systemd' }, { platform: 'linux' }).protected, true);
  assert.equal(protectionReason({ pid: 77, name: 'kworker/0:1' }, { platform: 'linux' }).protected, true);
  assert.equal(protectionReason({ pid: 500, name: 'node' }, { platform: 'linux', selfPid: 500 }).protected, true);
  assert.equal(protectionReason({ pid: 600, name: 'meu-app' }, { platform: 'linux', extra: ['meu-app'] }).protected, true);
  assert.equal(protectionReason({ pid: 4321, name: 'chrome.exe' }, { platform: 'win32' }).protected, false);
  assert.equal(sameProcessName('Code.exe', 'code'), true);
  assert.equal(sameProcessName('', ''), false);
});

test('coleta real nesta máquina devolve um snapshot válido', { timeout: 60e3 }, async () => {
  const c = new Collector({ logger: { warn() {}, info() {} } });
  try {
    await c.start();
    const snap = await c.collect();
    assert.ok(snapshotSchema.safeParse(snap).success, 'snapshot segue o esquema da API');
    assert.ok(snap.cpu.load >= 0 && snap.cpu.load <= 100);
    assert.ok(snap.cpu.threads > 0);
    assert.ok(snap.mem.total > 0 && snap.mem.pct > 0);
    assert.ok(snap.uptimeSec > 0);
    assert.ok(Array.isArray(snap.disks));
    const procs = await c.processes();
    assert.ok(procs.length > 0 && procs.every((p) => Number.isInteger(p.pid)));
  } finally {
    c.stop();
  }
});
