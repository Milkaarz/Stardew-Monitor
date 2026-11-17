#!/usr/bin/env node
/** `npm run migrate` — aplica as migrations pendentes no banco configurado em DATABASE_URL. */
import fs from 'node:fs';
import { openDatabase } from './index.js';

if (fs.existsSync('.env') && typeof process.loadEnvFile === 'function') process.loadEnvFile('.env');

const db = await openDatabase({ url: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL, runMigrations: true });
console.log(`[banco] ${db.dialect}: migrations em dia.`);
await db.close();
