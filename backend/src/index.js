#!/usr/bin/env node
/**
 * Servidor do Stardew Monitor.
 *   npm start            (produção: serve a API e a interface compilada)
 *   npm run dev          (reinicia ao salvar arquivos)
 */
import fs from 'node:fs';
import path from 'node:path';
import { openDatabase } from '@stardew-monitor/database';
import { Collector } from '@stardew-monitor/agent/collector';
import { ROOT_DIR, loadConfig, resolveAppSecret } from './config.js';
import { createLogger } from './lib/logger.js';
import { createServices } from './services/index.js';
import { LocalMonitor } from './services/localMonitor.js';
import { createApp } from './app.js';

const envFile = path.join(ROOT_DIR, '.env');
if (fs.existsSync(envFile) && typeof process.loadEnvFile === 'function') process.loadEnvFile(envFile);

const logger = createLogger();
const config = loadConfig();
config.appSecret = resolveAppSecret(process.env, config.dataDir);

const db = await openDatabase({ url: config.databaseUrl, ssl: config.databaseSsl, logger, rootDir: ROOT_DIR });
logger.info(`[banco] usando ${db.dialect}`);

const collector = config.localMonitor ? new Collector({ logger, windowsHelper: config.windowsHelper }) : null;
const ctx = await createServices({ config, db, logger, collector });
await ctx.auth.ensureAdmin({ username: config.adminUsername, password: config.adminPassword });

const app = createApp(ctx);
const server = app.listen(config.port, config.host, () => {
  logger.info(`🌾 Stardew Monitor pronto em http://localhost:${config.port}`);
});
server.keepAliveTimeout = 65e3;

let localMonitor = null;
if (collector) {
  localMonitor = new LocalMonitor({
    collector, machines: ctx.machines, ingest: ctx.ingest, intervalSec: config.localIntervalSec, farmName: config.localFarmName, logger,
  });
  localMonitor.start().catch((err) => logger.error(`[monitor local] não iniciou: ${err.message}`));
} else {
  logger.info('[monitor local] desativado (LOCAL_MONITOR=false): só agentes remotos.');
}
ctx.scheduler.start();

let closing = false;
async function shutdown(signal) {
  if (closing) return;
  closing = true;
  logger.info(`[servidor] ${signal}: encerrando...`);
  server.close();
  localMonitor?.stop();
  await ctx.scheduler.stop();
  await ctx.notifications.flush();
  await db.close();
  process.exit(0);
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
