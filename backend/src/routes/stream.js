/**
 * Tempo real via Server-Sent Events (GET /api/stream).
 */
import { Router } from 'express';

const MAX_STREAMS = 20;

export function streamRoutes({ bus, machines, achievements }) {
  const r = Router();
  let open = 0;

  r.get('/stream', (req, res) => {
    if (open >= MAX_STREAMS) return res.status(429).json({ error: 'Abas demais abertas.' });
    open++;

    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    res.write('retry: 4000\n\n');

    // estado inicial de todas as fazendas
    send('hello', {
      machines: machines.list().map((m) => machines.livePayload(m, { farmSeconds: achievements.stateOf(m.row.id).data.totalOnlineSec })),
      at: Date.now(),
    });

    const handlers = {
      metrics: (p) => send('metrics', p),
      machine: (p) => send('machine', p),
      notification: (p) => send('notification', p),
      achievement: (p) => send('achievement', p),
      command: (p) => send('command', p),
      settings: (p) => send('settings', p),
    };
    for (const [ev, fn] of Object.entries(handlers)) bus.on(ev, fn);
    const ping = setInterval(() => res.write(`: ping ${Date.now()}\n\n`), 20e3);

    req.on('close', () => {
      clearInterval(ping);
      for (const [ev, fn] of Object.entries(handlers)) bus.off(ev, fn);
      open = Math.max(0, open - 1);
    });
  });

  return r;
}
