/**
 * Monta o aplicativo Express a partir dos serviços (usado pelo servidor e pelos testes).
 */
import fs from 'node:fs';
import path from 'node:path';
import express, { Router } from 'express';
import helmet from 'helmet';
import { createRateLimiter } from './middleware/rateLimit.js';
import { localGuard } from './middleware/local.js';
import { apiNotFound, errorHandler } from './middleware/errors.js';
import { agentRoutes } from './routes/agent.js';
import { machineRoutes } from './routes/machines.js';
import { processRoutes } from './routes/processes.js';
import { journalRoutes } from './routes/journal.js';
import { notificationRoutes, auditRoutes } from './routes/notifications.js';
import { streamRoutes } from './routes/stream.js';
import { publicRoutes, legacyRoutes } from './routes/public.js';

export function createApp(ctx) {
  const { config, logger } = ctx;
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', /^\d+$/.test(String(config.trustProxy)) ? Number(config.trustProxy) : config.trustProxy);

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        fontSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        // sem upgrade-insecure-requests: o painel roda em http://localhost
        upgradeInsecureRequests: null,
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: false,
  }));

  const api = Router();

  // agentes: corpo bruto preservado para a assinatura HMAC (antes do parser JSON global)
  api.use(agentRoutes(ctx));

  api.use(express.json({ limit: '256kb' }));
  api.use(createRateLimiter({ windowMs: 60e3, max: config.rateLimit.apiPerMin, key: (req) => `api|${req.ip}` }));
  // painel local: só localhost, e alterações só vindas do próprio painel
  api.use(localGuard({ allowedHosts: config.allowedHosts }));

  api.use(publicRoutes(ctx));
  api.use(legacyRoutes(ctx));
  api.use(streamRoutes(ctx));
  api.use(machineRoutes(ctx));
  api.use(processRoutes(ctx));
  api.use(journalRoutes(ctx));
  api.use(notificationRoutes(ctx));
  api.use(auditRoutes(ctx));
  api.use(apiNotFound);

  app.use('/api', api);

  // interface: embutida no aplicativo (ctx.staticHandler) ou do build do Vite
  if (ctx.staticHandler) {
    app.use(ctx.staticHandler);
  } else if (fs.existsSync(path.join(config.staticDir, 'index.html'))) {
    app.use('/assets', express.static(path.join(config.staticDir, 'assets'), { immutable: true, maxAge: '365d', index: false }));
    app.use(express.static(config.staticDir, { index: 'index.html', maxAge: 0 }));
  } else {
    app.get('/', (_req, res) => {
      res.type('text/plain').send('Stardew Monitor: API no ar. A interface ainda não foi compilada — rode "npm run build" (ou use "npm run dev:web" em desenvolvimento).');
    });
  }

  app.use(errorHandler(logger));
  return app;
}
