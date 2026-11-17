import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { requireLocalMachine } from '../middleware/local.js';
import { createRateLimiter } from '../middleware/rateLimit.js';
import { killSchema, processQuerySchema } from '../schemas.js';

export function processRoutes({ machines, processes, config }) {
  const r = Router();
  const killLimiter = createRateLimiter({
    windowMs: 60e3,
    max: config.rateLimit.killPerMin,
    key: () => 'kill',
    message: 'Muitas expulsões em sequência. Espere um minuto.',
  });

  /** GET /api/processes?machine=&sort=cpu|mem&limit=10|25|50|100&q=&filter= */
  r.get('/processes', validate(processQuerySchema, 'query'), async (req, res) => {
    const m = machines.resolve(req.validQuery.machine);
    if (!m) return res.status(404).json({ error: 'Fazenda não encontrada.' });
    res.set('Cache-Control', 'no-store');
    res.json(await processes.list(m, req.validQuery));
  });

  /**
   * POST /api/processes/kill — "Expulsar morador".
   * Exige: requisição do próprio computador + cabeçalho do painel (guarda local) + confirmação explícita.
   * O serviço ainda confere se o PID é o mesmo processo e se ele não é protegido.
   */
  r.post('/processes/kill', requireLocalMachine, killLimiter, validate(killSchema), async (req, res) => {
    const { pid, name } = req.body;
    const m = machines.resolve(req.body.machine);
    if (!m) return res.status(404).json({ error: 'Fazenda não encontrada.' });
    res.json(await processes.kill(m, { pid, name }, { ip: req.ip }));
  });

  return r;
}
