/**
 * Inicialização do Stardew Monitor, reutilizada por `npm start` e pelo aplicativo baixável.
 */
import { openDatabase } from '@stardew-monitor/database';
import { Collector } from '@stardew-monitor/agent/collector';
import { ROOT_DIR, loadConfig, resolveAppSecret } from './config.js';
import { createLogger } from './lib/logger.js';
import { createServices } from './services/index.js';
import { LocalMonitor } from './services/localMonitor.js';
import { createApp } from './app.js';

function listen(app, port, host) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, host);
    server.once('listening', () => resolve(server));
    server.once('error', reject);
  });
}

/**
 * @param {{ env?: object, staticHandler?: Function, portAttempts?: number, logger?: object }} opts
 *   portAttempts > 1: se a porta estiver ocupada, tenta as seguintes (modo aplicativo).
 * @returns {Promise<{ url: string, port: number, close: () => Promise<void> }>}
 */
export async function startServer({ env = process.env, staticHandler = null, portAttempts = 1, logger = createLogger() } = {}) {
  const config = loadConfig(env);
  config.appSecret = resolveAppSecret(env, config.dataDir);

  const db = await openDatabase({ url: config.databaseUrl, ssl: config.databaseSsl, logger, rootDir: ROOT_DIR });
  logger.info(`[banco] usando ${db.dialect} (${config.dataDir})`);

  const collector = config.localMonitor ? new Collector({ logger, windowsHelper: config.windowsHelper }) : null;
  const ctx = await createServices({ config, db, logger, collector });
  const app = createApp({ ...ctx, staticHandler });

  let server = null;
  let port = config.port;
  for (let i = 0; i < Math.max(1, portAttempts); i++) {
    try {
      server = await listen(app, port, config.host);
      break;
    } catch (err) {
      if (err.code !== 'EADDRINUSE' || i === portAttempts - 1) {
        await db.close();
        throw err;
      }
      logger.warn(`[servidor] porta ${port} ocupada, tentando ${port + 1}...`);
      port++;
    }
  }
  server.keepAliveTimeout = 65e3;
  const url = `http://localhost:${port}`;
  logger.info(`🌾 Stardew Monitor pronto em ${url}`);

  let localMonitor = null;
  if (collector) {
    localMonitor = new LocalMonitor({
      collector, machines: ctx.machines, ingest: ctx.ingest, intervalSec: config.localIntervalSec, farmName: config.localFarmName, logger,
    });
    localMonitor.start().catch((err) => logger.error(`[monitor local] não iniciou: ${err.message}`));
  } else {
    logger.info('[monitor local] desativado (LOCAL_MONITOR=false): só agentes de outras máquinas.');
  }
  ctx.scheduler.start();

  let closing = null;
  const close = () => {
    closing ||= (async () => {
      server.close();
      localMonitor?.stop();
      await ctx.scheduler.stop();
      await ctx.notifications.flush();
      await db.close();
    })();
    return closing;
  };
  return { url, port, close, ctx };
}
