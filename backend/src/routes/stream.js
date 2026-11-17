/**
 * Tempo real via Server-Sent Events (GET /api/stream).
 * Simples, atravessa proxies HTTP comuns e usa o mesmo cookie de sessão.
 */
import { Router } from 'express';

const MAX_STREAMS_PER_USER = 12;

export function streamRoutes({ bus, machines, achievements }) {
  const r = Router();
  const perUser = new Map();

  r.get('/stream', (req, res) => {
    const uid = req.user.id;
    const count = perUser.get(uid) || 0;
    if (count >= MAX_STREAMS_PER_USER) return res.status(429).json({ error: 'Abas demais abertas.' });
    perUser.set(uid, count + 1);

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

    const isAdmin = req.user.role === 'admin';
    const handlers = {
      metrics: (p) => send('metrics', p),
      machine: (p) => send('machine', p),
      notification: (p) => send('notification', p),
      achievement: (p) => send('achievement', p),
      command: (p) => (isAdmin ? send('command', p) : null),
      settings: (p) => send('settings', p),
    };
    for (const [ev, fn] of Object.entries(handlers)) bus.on(ev, fn);
    const ping = setInterval(() => res.write(`: ping ${Date.now()}\n\n`), 20e3);

    req.on('close', () => {
      clearInterval(ping);
      for (const [ev, fn] of Object.entries(handlers)) bus.off(ev, fn);
      perUser.set(uid, Math.max(0, (perUser.get(uid) || 1) - 1));
    });
  });

  return r;
}
