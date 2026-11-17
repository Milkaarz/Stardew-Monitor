import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { requireAdmin } from '../middleware/auth.js';
import { machineCreateSchema, machineUpdateSchema, historyQuerySchema } from '../schemas.js';

export function machineRoutes({ machines, achievements, alerts, history, audit }) {
  const r = Router();
  const isAdmin = (req) => req.user?.role === 'admin';

  const find = (req, res) => {
    const m = machines.resolve(req.params.id ?? req.query.machine);
    if (!m) res.status(404).json({ error: 'Fazenda não encontrada.' });
    return m;
  };

  /** GET /api/metrics — métricas atuais (da máquina local, ou ?machine=id|uid). */
  r.get('/metrics', (req, res) => {
    const m = machines.resolve(req.query.machine);
    if (!m) return res.status(404).json({ error: 'Nenhuma fazenda cadastrada ainda.' });
    res.set('Cache-Control', 'no-store');
    res.json(machines.livePayload(m, { farmSeconds: achievements.stateOf(m.row.id).data.totalOnlineSec }));
  });

  /** GET /api/history?machine=&range=15m|1h|6h|24h|7d|30d */
  r.get('/history', validate(historyQuerySchema, 'query'), async (req, res) => {
    const m = machines.resolve(req.validQuery.machine);
    if (!m) return res.status(404).json({ error: 'Fazenda não encontrada.' });
    res.set('Cache-Control', 'no-store');
    res.json({ machineId: m.row.id, ...(await history.query(m.row.id, req.validQuery.range)) });
  });

  r.get('/machines', (req, res) => {
    res.json({ machines: machines.list().map((m) => machines.toPublic(m, { admin: isAdmin(req) })) });
  });

  r.get('/machines/:id', (req, res) => {
    const m = find(req, res);
    if (m) res.json({ machine: machines.toPublic(m, { admin: isAdmin(req) }) });
  });

  r.post('/machines', requireAdmin, validate(machineCreateSchema), async (req, res) => {
    const { machine, token } = await machines.create(req.body);
    await audit.log({ user: req.user, action: 'machine.create', target: machine.row.farm_name, ip: req.ip });
    await achievements.checkGlobal(machines.list().length);
    res.status(201).json({ machine: machines.toPublic(machine, { admin: true }), token });
  });

  r.patch('/machines/:id', requireAdmin, validate(machineUpdateSchema), async (req, res) => {
    const m = find(req, res);
    if (!m) return;
    await machines.update(m.row.id, req.body);
    await audit.log({ user: req.user, action: 'machine.update', target: m.row.farm_name, details: req.body, ip: req.ip });
    res.json({ machine: machines.toPublic(m, { admin: true }) });
  });

  r.post('/machines/:id/token', requireAdmin, async (req, res) => {
    const m = find(req, res);
    if (!m) return;
    if (m.row.is_local) return res.status(400).json({ error: 'A máquina local não usa token.' });
    const token = await machines.rotateToken(m.row.id);
    await audit.log({ user: req.user, action: 'machine.token.rotate', target: m.row.farm_name, ip: req.ip });
    res.json({ token });
  });

  r.delete('/machines/:id', requireAdmin, async (req, res) => {
    const m = find(req, res);
    if (!m) return;
    if (m.row.is_local) return res.status(400).json({ error: 'A máquina local não pode ser removida (desative com LOCAL_MONITOR=false).' });
    const name = m.row.farm_name;
    await machines.remove(m.row.id);
    alerts.forget(m.row.id);
    achievements.forget(m.row.id);
    await audit.log({ user: req.user, action: 'machine.delete', target: name, ip: req.ip });
    res.json({ ok: true });
  });

  return r;
}
