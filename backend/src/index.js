#!/usr/bin/env node
/**
 * Servidor do Stardew Monitor (a partir do código-fonte).
 *   npm start            serve a API e a interface compilada em http://localhost:3001
 *   npm run dev          reinicia ao salvar arquivos
 * Para o aplicativo baixável (sem precisar de Node), veja app/ e `npm run app:build`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT_DIR } from './config.js';
import { createLogger } from './lib/logger.js';
import { startServer } from './server.js';

const envFile = path.join(ROOT_DIR, '.env');
if (fs.existsSync(envFile) && typeof process.loadEnvFile === 'function') process.loadEnvFile(envFile);

const logger = createLogger();
startServer({ logger })
  .then(({ close }) => {
    const shutdown = async (signal) => {
      logger.info(`[servidor] ${signal}: encerrando...`);
      await close();
      process.exit(0);
    };
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  })
  .catch((err) => {
    logger.error(err.code === 'EADDRINUSE' ? `A porta já está em uso. Feche o outro Stardew Monitor ou defina PORT no .env.` : err.stack || err.message);
    process.exit(1);
  });
