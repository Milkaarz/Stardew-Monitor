/**
 * Rotas utilitárias:
 *  - /api/health: verificação de saúde (Docker, Render, uptime robots);
 *  - /api/dados: formato do painel v2 (compatibilidade com o agente PHP antigo).
 */
import os from 'node:os';
import { Router } from 'express';

export function publicRoutes() {
  const r = Router();

  // "app" permite ao aplicativo reconhecer uma instância já aberta e só abrir o navegador
  r.get('/health', (_req, res) => {
    // a página de download (ex.: site no Netlify) verifica se o aplicativo está aberto: só esta rota,
    // sem dados sensíveis, pode ser lida por outra origem
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.json({ ok: true, app: 'stardew-monitor', uptimeSec: Math.round(process.uptime()) });
  });

  return r;
}

/** Monta o JSON no formato do painel v2 (index.js antigo) a partir da máquina local. */
export function legacyPayload(m, { port }) {
  const s = m?.live.snapshot;
  if (!s) return null;
  const ramUsage = Math.round(s.mem?.pct ?? 0);
  return {
    ts: s.ts,
    hostname: s.host?.hostname,
    ip: Object.values(os.networkInterfaces()).flat().find((i) => i && !i.internal && i.family === 'IPv4')?.address || 'N/A',
    node: process.version,
    arch: s.host?.arch,
    sistema: s.host?.os,
    porta: String(port),
    cpuCount: s.cpu?.threads,
    cpuModel: s.cpu?.model,
    cpuSpeed: s.cpu?.speedGHz,
    avgCpu: Math.round(s.cpu?.load ?? 0),
    cores: (s.cpu?.cores || []).map((v) => Math.round(v ?? 0)),
    load: s.cpu?.loadAvg || [0, 0, 0],
    temp: s.cpu?.temp,
    ramUsage,
    ramTotal: s.mem?.total,
    ramFree: s.mem?.available,
    swap: s.mem?.swap ? { total: s.mem.swap.total, used: s.mem.swap.used, pct: Math.round(s.mem.swap.pct ?? 0) } : null,
    rss: process.memoryUsage().rss,
    disks: (s.disks || []).map((d, i) => ({ name: d.name, size: d.size, used: d.used, free: d.free, pct: Math.round(d.pct ?? 0), principal: i === 0 })),
    procs: (m.live.processes || []).slice(0, 8),
    net: s.net ? { iface: s.net.iface, down: s.net.rxSec || 0, up: s.net.txSec || 0, rx: s.net.rxTotal, tx: s.net.txTotal } : null,
    uptime: s.uptimeSec,
    status: ramUsage > 85
      ? { text: 'crítico', msg: 'a memória está quase cheia. reinicia ou liberta recursos.' }
      : ramUsage > 65
        ? { text: 'sobrecarga', msg: 'a memória está a subir. vale a pena vigiar.' }
        : { text: 'estável', msg: 'tudo a funcionar sem problemas.' },
    logs: [],
  };
}

export function legacyRoutes({ machines, config }) {
  const r = Router();
  r.get('/dados', (req, res) => {
    const payload = legacyPayload(machines.local(), { port: config.port });
    if (!payload) return res.status(503).json({ error: 'Monitor local sem dados ainda.' });
    res.set('Cache-Control', 'no-store');
    res.json(payload);
  });
  return r;
}
