import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { requireAdmin } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimit.js';
import { killSchema, processQuerySchema } from '../schemas.js';

export function processRoutes({ machines, processes, auth, audit, config }) {
  const r = Router();
  const killLimiter = createRateLimiter({
    windowMs: 60e3,
    max: config.rateLimit.killPerMin,
    key: (req) => `kill|${req.user?.id}`,
    message: 'Muitas expulsões em sequência. Espere um minuto.',
  });

  /** GET /api/processes?machine=&sort=cpu|mem&limit=10|25|50|100&q=&filter= */
  r.get('/processes', validate(processQuerySchema, 'query'), async (req, res) => {
    const m = machines.resolve(req.validQuery.machine);
    if (!m) return res.status(404).json({ error: 'Fazenda não encontrada.' });
    res.set('Cache-Control', 'no-store');
    res.json(await processes.list(m, req.validQuery, { isAdmin: req.user?.role === 'admin' }));
  });

  /**
   * POST /api/processes/kill — "Expulsar morador".
   * Exige: administrador + CSRF (middleware global) + senha digitada de novo + confirmação explícita.
   */
  r.post('/processes/kill', requireAdmin, killLimiter, validate(killSchema), async (req, res) => {
    const { pid, name, password } = req.body;
    const m = machines.resolve(req.body.machine);
    if (!m) return res.status(404).json({ error: 'Fazenda não encontrada.' });
    if (!(await auth.verifyUserPassword(req.user.id, password))) {
      await audit.log({ user: req.user, action: 'process.kill', target: `${m.row.farm_name}:${pid}`, details: { name, reason: 'senha incorreta' }, ip: req.ip, success: false });
      return res.status(401).json({ error: 'Senha incorreta. O morador continua na cidade.' });
    }
    res.json(await processes.kill(m, { pid, name }, { user: req.user, ip: req.ip }));
  });

  return r;
}
