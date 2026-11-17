/**
 * Leituras diretas do Linux (/proc e /sys): rápidas, sem abrir processos.
 * Todas devolvem null/[] quando o arquivo não existe (contêiner, WSL, VM...).
 */
import fs from 'node:fs';
import path from 'node:path';

const read = (p) => {
  try {
    return fs.readFileSync(p, 'utf8').trim();
  } catch {
    return null;
  }
};
const list = (p) => {
  try {
    return fs.readdirSync(p);
  } catch {
    return [];
  }
};

/** Totais de rede (bytes) somando interfaces físicas; ignora loopback e virtuais comuns. */
export function parseProcNetDev(text, preferIface = null) {
  if (!text) return null;
  let rx = 0, tx = 0, names = [];
  const rows = text.split('\n').slice(2);
  const parsed = [];
  for (const l of rows) {
    const [nameRaw, rest] = l.split(':');
    if (!rest) continue;
    const name = nameRaw.trim();
    const f = rest.trim().split(/\s+/).map(Number);
    parsed.push({ name, rx: f[0], tx: f[8] });
  }
  const preferred = preferIface && parsed.find((p) => p.name === preferIface);
  const chosen = preferred ? [preferred] : parsed.filter((p) => !/^(lo|docker\d*|veth|br-|virbr|vnet|tun|tap|cni|flannel|kube)/.test(p.name));
  for (const p of chosen) {
    rx += p.rx || 0;
    tx += p.tx || 0;
    names.push(p.name);
  }
  return { rx, tx, names };
}

export const readNetTotals = (preferIface) => parseProcNetDev(read('/proc/net/dev'), preferIface);

/** Ventoinhas via hwmon (RPM). */
export function readHwmonFans(base = '/sys/class/hwmon') {
  const fans = [];
  for (const dir of list(base)) {
    const d = path.join(base, dir);
    const chip = read(path.join(d, 'name')) || dir;
    for (const f of list(d)) {
      const m = f.match(/^fan(\d+)_input$/);
      if (!m) continue;
      const rpm = Number(read(path.join(d, f)));
      if (!Number.isFinite(rpm) || rpm <= 0) continue;
      const label = read(path.join(d, `fan${m[1]}_label`));
      fans.push({ name: label || `${chip} fan${m[1]}`, rpm });
    }
  }
  return fans;
}

/** GPUs AMD/Intel via DRM (uso, VRAM e temperatura quando o driver expõe). */
export function readDrmGpus(base = '/sys/class/drm') {
  const gpus = [];
  for (const card of list(base)) {
    if (!/^card\d+$/.test(card)) continue;
    const dev = path.join(base, card, 'device');
    const busy = read(path.join(dev, 'gpu_busy_percent'));
    const vramTotal = read(path.join(dev, 'mem_info_vram_total'));
    const vramUsed = read(path.join(dev, 'mem_info_vram_used'));
    if (busy == null && vramTotal == null) continue;
    let temp = null;
    for (const h of list(path.join(dev, 'hwmon'))) {
      const v = read(path.join(dev, 'hwmon', h, 'temp1_input'));
      if (v != null) temp = Number(v) / 1000;
    }
    const vendorId = read(path.join(dev, 'vendor'));
    gpus.push({
      name: card,
      vendor: vendorId === '0x1002' ? 'AMD' : vendorId === '0x8086' ? 'Intel' : vendorId || 'GPU',
      util: busy != null ? Number(busy) : null,
      temp,
      vramTotal: vramTotal != null ? Number(vramTotal) : null,
      vramUsed: vramUsed != null ? Number(vramUsed) : null,
      fanPct: null,
      powerW: null,
    });
  }
  return gpus;
}
