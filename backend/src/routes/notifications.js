/** Conquistas, notificações (histórico + testes de canal), configurações e auditoria. */
import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { requireAdmin } from '../middleware/auth.js';
import { SETTINGS_SCHEMAS, secretsSchema } from '../schemas.js';

const listQuery = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  kind: z.enum(['alert', 'recovery', 'achievement', 'system']).optional(),
  category: z.string().max(32).optional(),
  machine: z.string().max(64).optional(),
});

export function notificationRoutes({ machines, achievements, notifications, settings, audit }) {
  const r = Router();

  // ---------- conquistas ----------
  r.get('/achievements', async (req, res) => {
    const m = machines.resolve(req.query.machine);
    res.json(await achievements.list({ machineId: m?.row.id, machineCount: machines.list().length }));
  });

  // ---------- notificações ----------
  r.get('/notifications', validate(listQuery, 'query'), async (req, res) => {
    const q = req.validQuery;
    const m = q.machine ? machines.resolve(q.machine) : null;
    res.json(await notifications.list({ ...q, machineId: m?.row.id }));
  });

  r.post('/notifications/read', async (_req, res) => {
    await notifications.markAllRead();
    res.json({ ok: true });
  });

  r.delete('/notifications', requireAdmin, async (req, res) => {
    await notifications.clear();
    await audit.log({ user: req.user, action: 'notifications.clear', ip: req.ip });
    res.json({ ok: true });
  });

  r.post('/notifications/test/:channel', requireAdmin, async (req, res) => {
    try {
      await notifications.test(req.params.channel, { user: req.user });
      await audit.log({ user: req.user, action: 'notifications.test', target: req.params.channel, ip: req.ip });
      res.json({ ok: true });
    } catch (err) {
      await audit.log({ user: req.user, action: 'notifications.test', target: req.params.channel, details: { error: err.message }, ip: req.ip, success: false });
      res.status(err.status || 502).json({ error: `Falha no envio: ${err.message}` });
    }
  });

  // ---------- configurações ----------
  r.get('/settings', (req, res) => {
    const all = settings.all();
    const isAdmin = req.user?.role === 'admin';
    res.json({ settings: all, secrets: isAdmin ? settings.secretStatus() : undefined });
  });

  r.put('/settings/:section', requireAdmin, async (req, res) => {
    const schema = SETTINGS_SCHEMAS[req.params.section];
    if (!schema) return res.status(404).json({ error: 'Seção de configuração desconhecida.' });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Configuração inválida.', issues: parsed.error.issues.slice(0, 8).map((i) => `${i.path.join('.') || req.params.section}: ${i.message}`) });
    }
    const value = await settings.set(req.params.section, parsed.data);
    await audit.log({ user: req.user, action: 'settings.update', target: req.params.section, ip: req.ip });
    res.json({ section: req.params.section, value });
  });

  r.delete('/settings/:section', requireAdmin, async (req, res) => {
    if (!SETTINGS_SCHEMAS[req.params.section]) return res.status(404).json({ error: 'Seção de configuração desconhecida.' });
    const value = await settings.reset(req.params.section);
    await audit.log({ user: req.user, action: 'settings.reset', target: req.params.section, ip: req.ip });
    res.json({ section: req.params.section, value });
  });

  /** Segredos: só escrita. Valor vazio/null apaga. Nunca retornamos o conteúdo. */
  r.put('/secrets', requireAdmin, validate(secretsSchema), async (req, res) => {
    const changed = [];
    for (const [k, v] of Object.entries(req.body)) {
      if (v === undefined) continue;
      await settings.setSecret(k, v);
      changed.push(k);
    }
    await audit.log({ user: req.user, action: 'secrets.update', target: changed.join(','), ip: req.ip });
    res.json({ secrets: settings.secretStatus() });
  });

  return r;
}

export function auditRoutes({ audit }) {
  const r = Router();
  const q = z.object({
    limit: z.coerce.number().int().min(1).max(500).default(100),
    offset: z.coerce.number().int().min(0).default(0),
    action: z.string().max(64).optional(),
  });
  r.get('/audit', requireAdmin, validate(q, 'query'), async (req, res) => {
    res.json({ entries: await audit.list(req.validQuery) });
  });
  return r;
}
