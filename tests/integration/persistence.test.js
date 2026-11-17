// Persistência no banco real: SQLite em arquivo por padrão, PostgreSQL se TEST_DATABASE_URL estiver definida
// (o GitHub Actions roda este arquivo com um serviço PostgreSQL).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDatabase, migrate } from '@stardew-monitor/database';
import { toPgPlaceholders } from '../../database/src/postgres.js';
import { makeApp, login, silent } from '../helpers/app.js';
import { snapshot } from '../helpers/fixtures.js';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stardew-db-'));
const URL = process.env.TEST_DATABASE_URL || `sqlite:${path.join(dir, 'teste.db')}`;

async function resetPg(db) {
  if (db.dialect !== 'postgres') return;
  await db.exec('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
}

let t;
before(async () => {
  const pre = await openDatabase({ url: URL, runMigrations: false, logger: silent });
  await resetPg(pre);
  await pre.close();
  t = await makeApp({ dbUrl: URL });
});
after(async () => {
  await t?.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

test(`migrations são idempotentes (${URL.split(':')[0]})`, async () => {
  assert.deepEqual(await migrate(t.db, { logger: silent }), []);
  const ids = (await t.db.all('SELECT id FROM schema_migrations')).map((r) => r.id);
  assert.ok(ids.includes('001_initial'));
});

test('placeholders do PostgreSQL ignoram "?" dentro de strings', () => {
  assert.equal(toPgPlaceholders("SELECT ? , '?' , ?"), "SELECT $1 , '?' , $2");
});

test('leituras duplicadas (reenvio do agente) não duplicam o histórico', async () => {
  const s = snapshot({ ts: Date.now() - 1000 });
  await t.ctx.history.insertSamples(t.local.row.id, [s]);
  await t.ctx.history.insertSamples(t.local.row.id, [s]);
  const n = await t.db.get('SELECT COUNT(*) AS n FROM metrics_raw WHERE machine_id = ? AND ts = ?', [t.local.row.id, Math.round(s.ts)]);
  assert.equal(Number(n.n), 1);
});

test('agregação por minuto e hora com média ponderada e retenção', async () => {
  const H = 3600e3;
  const start = Math.floor((Date.now() - 3 * H) / H) * H;
  // 2 horas de leituras a cada minuto: CPU 10% na primeira hora, 50% na segunda
  const samples = Array.from({ length: 120 }, (_, i) => snapshot({ ts: start + i * 60e3 + 5000, cpu: i < 60 ? 10 : 50 }));
  await t.ctx.history.insertSamples(t.local.row.id, samples);
  await t.ctx.history.rollupMinutes();
  await t.ctx.history.rollupHours();
  const hours = await t.db.all('SELECT ts, cpu_avg, cpu_max, n FROM metrics_agg WHERE machine_id = ? AND res = 3600 AND ts >= ? ORDER BY ts', [t.local.row.id, start]);
  assert.equal(Math.round(hours[0].cpu_avg), 10);
  assert.equal(Math.round(hours[1].cpu_avg), 50);
  assert.equal(Number(hours[0].n), 60);

  // reagregação idempotente (upsert)
  t.ctx.history.dirtyMinute.set(t.local.row.id, start);
  await t.ctx.history.rollupMinutes();
  await t.ctx.history.rollupHours();
  const again = await t.db.get('SELECT n FROM metrics_agg WHERE machine_id = ? AND res = 3600 AND ts = ?', [t.local.row.id, start]);
  assert.equal(Number(again.n), 60);

  // retenção: brutos mais antigos que o limite somem; agregados por hora ficam
  await t.ctx.settings.set('retention', { ...t.ctx.settings.get('retention'), rawHours: 2 });
  await t.ctx.history.applyRetention();
  const oldRaw = await t.db.get('SELECT COUNT(*) AS n FROM metrics_raw WHERE ts < ?', [Date.now() - 2 * H]);
  assert.equal(Number(oldRaw.n), 0);
  const kept = await t.db.get('SELECT COUNT(*) AS n FROM metrics_agg WHERE res = 3600');
  assert.ok(Number(kept.n) >= 2);
});

test('configurações, conquistas, anotações e máquinas sobrevivem a um reinício', async () => {
  const s = await login(t.app);
  await s.post('/api/notes').send({ title: 'Persistida', body: 'texto', category: 'personal' }).expect(201);
  const created = await s.post('/api/machines').send({ name: 'Persistente', farmName: 'Fazenda Persistente', theme: 'mines' }).expect(201);
  await t.ctx.settings.set('weather', { ...t.ctx.settings.get('weather'), hotTemp: 66 });
  await t.ctx.ingest.ingest(t.local, [snapshot()]);
  await t.ctx.achievements.persist();
  await t.close();

  // "reinicia" o servidor no mesmo banco
  const { createServices } = await import('../../backend/src/services/index.js');
  const { loadConfig } = await import('../../backend/src/config.js');
  const db = await openDatabase({ url: URL, logger: silent });
  const ctx = await createServices({ config: { ...loadConfig({}), appSecret: 'segredo-de-teste-com-mais-de-32-caracteres' }, db, logger: silent });
  assert.equal(ctx.settings.get('weather').hotTemp, 66);
  assert.ok(ctx.machines.list().some((m) => m.row.farm_name === 'Fazenda Persistente' && m.row.theme === 'mines'));
  assert.ok(ctx.machines.findByToken(created.body.token), 'token do agente continua válido');
  assert.ok(ctx.achievements.isUnlocked(t.local.row.id, 'first_harvest'));
  assert.ok(ctx.achievements.stateOf(t.local.row.id).data.lastSampleTs > 0);
  const notes = await db.all("SELECT * FROM notes WHERE title = 'Persistida'");
  assert.equal(notes.length, 1);
  await db.close();
  t = null;
});
