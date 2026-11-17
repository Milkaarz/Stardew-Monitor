// Painel local sem login: só responde em localhost, só aceita alterações do próprio painel
// e ações perigosas só a partir do próprio computador.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { makeApp, client } from '../helpers/app.js';
import { hostName, isLoopbackAddress, requireLocalMachine } from '../../backend/src/middleware/local.js';
import { loadConfig } from '../../backend/src/config.js';

let t;
before(async () => {
  t = await makeApp();
});
after(() => t.close());

test('não existe mais login, sessão nem usuários', async () => {
  for (const url of ['/api/auth/login', '/api/auth/me', '/api/users', '/api/auth/password']) {
    const r = await client(t.app).post(url).send({});
    assert.equal(r.status, 404, url);
  }
  await request(t.app).get('/api/metrics').expect(200);
  const tables = t.db.dialect === 'sqlite'
    ? await t.db.all("SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('users', 'sessions')")
    : await t.db.all("SELECT table_name AS name FROM information_schema.tables WHERE table_name IN ('users', 'sessions')");
  assert.deepEqual(tables, [], 'tabelas de login removidas pela migration 002');
});

test('por padrão o servidor escuta só neste computador', () => {
  assert.equal(loadConfig({}).host, '127.0.0.1');
  assert.equal(loadConfig({ HOST: '0.0.0.0' }).host, '0.0.0.0');
});

test('outro nome de host é recusado (proteção contra DNS rebinding)', async () => {
  await request(t.app).get('/api/metrics').set('Host', 'site-malicioso.com').expect(403);
  await request(t.app).get('/api/metrics').set('Host', 'localhost:3001').expect(200);
  await request(t.app).get('/api/metrics').set('Host', '[::1]:3001').expect(200);
  const lan = await makeApp({ config: { allowedHosts: ['meu-pc.local'] } });
  try {
    await request(lan.app).get('/api/metrics').set('Host', 'meu-pc.local:3001').expect(200);
  } finally {
    await lan.close();
  }
});

test('alterações exigem o cabeçalho do painel e origem local (proteção contra CSRF)', async () => {
  await request(t.app).post('/api/quests').send({ text: 'sem cabeçalho' }).expect(403);
  await request(t.app).post('/api/quests').set('X-Stardew-Monitor', '1').set('Origin', 'https://site-malicioso.com').send({ text: 'outro site' }).expect(403);
  await request(t.app).post('/api/quests').set('X-Stardew-Monitor', '1').set('Origin', 'http://localhost:3001').send({ text: 'do painel' }).expect(201);
  await client(t.app).post('/api/quests').send({ text: 'sem Origin (mesma origem)' }).expect(201);
  // leitura não precisa do cabeçalho
  await request(t.app).get('/api/quests').expect(200);
});

test('agentes continuam usando token próprio (não passam pela guarda do painel)', async () => {
  await request(t.app).post('/api/agent/metrics').set('Host', '192.168.0.10:3001').send({ samples: [] }).expect(401);
});

test('encerrar processo só a partir do próprio computador', () => {
  assert.equal(isLoopbackAddress('127.0.0.1'), true);
  assert.equal(isLoopbackAddress('::ffff:127.0.0.1'), true);
  assert.equal(isLoopbackAddress('::1'), true);
  assert.equal(isLoopbackAddress('192.168.0.20'), false);
  const run = (ip) => {
    let status = 200;
    let nextCalled = false;
    requireLocalMachine({ socket: { remoteAddress: ip } }, { status: (s) => ((status = s), { json: () => {} }) }, () => (nextCalled = true));
    return { status, nextCalled };
  };
  assert.deepEqual(run('127.0.0.1'), { status: 200, nextCalled: true });
  assert.deepEqual(run('192.168.0.20'), { status: 403, nextCalled: false });
  assert.equal(hostName('LocalHost:3001'), 'localhost');
  assert.equal(hostName('[::1]:3001'), '[::1]');
});

test('health identifica o aplicativo (para não abrir duas cópias)', async () => {
  const r = await request(t.app).get('/api/health').expect(200);
  assert.equal(r.body.app, 'stardew-monitor');
});
