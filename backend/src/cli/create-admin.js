#!/usr/bin/env node
/**
 * Cria um administrador ou redefine a senha de um usuário existente.
 *   npm run create-admin -- <usuario> <senha>
 */
import fs from 'node:fs';
import path from 'node:path';
import { openDatabase } from '@stardew-monitor/database';
import { ROOT_DIR, loadConfig } from '../config.js';
import { AuthService } from '../services/auth.js';

const envFile = path.join(ROOT_DIR, '.env');
if (fs.existsSync(envFile) && typeof process.loadEnvFile === 'function') process.loadEnvFile(envFile);

const [username, password] = process.argv.slice(2);
if (!username || !password) {
  console.error('Uso: npm run create-admin -- <usuario> <senha>');
  process.exit(1);
}
const config = loadConfig();
const db = await openDatabase({ url: config.databaseUrl, ssl: config.databaseSsl, rootDir: ROOT_DIR });
const auth = new AuthService(db, {});
try {
  const existing = await db.get('SELECT id FROM users WHERE lower(username) = lower(?)', [username]);
  if (existing) {
    await auth.resetPassword(existing.id, password);
    await auth.setRole(existing.id, 'admin');
    console.log(`Senha de "${username}" redefinida e papel ajustado para admin.`);
  } else {
    await auth.createUser({ username, password, role: 'admin' });
    console.log(`Administrador "${username}" criado.`);
  }
} catch (err) {
  console.error(`Erro: ${err.message}`);
  process.exitCode = 1;
} finally {
  await db.close();
}
