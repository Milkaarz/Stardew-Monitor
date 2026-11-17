// Autenticação, sessões, CSRF, permissões e limite de tentativas.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { makeApp, login, ADMIN, VIEWER } from '../helpers/app.js';

let t;
before(async () => {
  t = await makeApp();
});
after(() => t.close());

test('rotas protegidas exigem login', async () => {
  for (const url of ['/api/metrics', '/api/machines', '/api/processes', '/api/history', '/api/notes', '/api/achievements', '/api/stream', '/api/settings', '/api/audit']) {
    await request(t.app).get(url).expect(401);
  }
  await request(t.app).get('/api/health').expect(200);
});

test('login: senha errada é recusada e registrada na auditoria', async () => {
  const r = await request(t.app).post('/api/auth/login').send({ username: 'admin', password: 'errada-errada' }).expect(401);
  assert.match(r.body.error, /incorretos/);
  await request(t.app).post('/api/auth/login').send({ username: 'nao-existe', password: 'qualquer-coisa' }).expect(401);
  const audit = await t.ctx.audit.list({ action: 'auth.login' });
  assert.ok(audit.some((a) => !a.success));
});

test('login: cookie HttpOnly e SameSite=Strict, sem senha na resposta', async () => {
  const r = await request(t.app).post('/api/auth/login').send(ADMIN).expect(200);
  const cookie = r.headers['set-cookie'][0];
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
  assert.equal(r.body.user.password_hash, undefined);
  assert.ok(r.body.csrf.length > 20);
});

test('CSRF: alterações sem o cabeçalho correto são bloqueadas', async () => {
  const s = await login(t.app);
  await s.agent.post('/api/quests').send({ text: 'sem csrf' }).expect(403);
  await s.agent.post('/api/quests').set('X-CSRF-Token', 'falso').send({ text: 'csrf errado' }).expect(403);
  await s.post('/api/quests').send({ text: 'com csrf' }).expect(201);
});

test('visitante (somente leitura) não altera nada', async () => {
  const v = await login(t.app, VIEWER);
  await v.get('/api/metrics').expect(200);
  await v.post('/api/notes').send({ title: 'x', body: '', category: 'problem' }).expect(403);
  await v.post('/api/machines').send({ name: 'x' }).expect(403);
  await v.put('/api/settings/thresholds').send({}).expect(403);
  await v.post('/api/processes/kill').send({ pid: 999, name: 'x', password: VIEWER.password, confirm: true }).expect(403);
  await v.get('/api/users').expect(403);
  await v.get('/api/audit').expect(403);
  const settings = await v.get('/api/settings').expect(200);
  assert.equal(settings.body.secrets, undefined, 'visitante não vê nem o status dos segredos');
});

test('logout encerra a sessão', async () => {
  const s = await login(t.app);
  await s.post('/api/auth/logout').expect(200);
  await s.agent.get('/api/metrics').expect(401);
});

test('troca de senha: exige a atual, valida a nova e derruba outras sessões', async () => {
  const other = await login(t.app, VIEWER);
  const s = await login(t.app, VIEWER);
  await s.put('/api/auth/password').send({ currentPassword: 'errada-errada', newPassword: 'nova-senha-segura' }).expect(400);
  await s.put('/api/auth/password').send({ currentPassword: VIEWER.password, newPassword: 'curta' }).expect(400);
  await s.put('/api/auth/password').send({ currentPassword: VIEWER.password, newPassword: 'nova-senha-segura' }).expect(200);
  await other.agent.get('/api/metrics').expect(401);
  await s.agent.get('/api/metrics').expect(200);
  await request(t.app).post('/api/auth/login').send({ username: VIEWER.username, password: 'nova-senha-segura' }).expect(200);
  await s.put('/api/auth/password').send({ currentPassword: 'nova-senha-segura', newPassword: VIEWER.password }).expect(200);
});

test('gestão de usuários pelo admin; último admin é protegido', async () => {
  const s = await login(t.app);
  const created = await s.post('/api/users').send({ username: 'novo.user', password: 'senha-nova-123', role: 'viewer' }).expect(201);
  await s.post('/api/users').send({ username: 'novo.user', password: 'senha-nova-123' }).expect(409);
  await s.post('/api/users').send({ username: 'a', password: 'senha-nova-123' }).expect(400);
  const me = (await s.get('/api/auth/me')).body.user;
  await s.del(`/api/users/${me.id}`).expect(400);
  await s.patch(`/api/users/${me.id}`).send({ role: 'viewer' }).expect(400);
  await s.del(`/api/users/${created.body.user.id}`).expect(200);
});

test('limite de tentativas de login', async () => {
  const strict = await (await import('../helpers/app.js')).makeApp({ config: { rateLimit: { loginPer15Min: 3 } } });
  try {
    for (let i = 0; i < 3; i++) await request(strict.app).post('/api/auth/login').send({ username: 'admin', password: 'errada-errada' }).expect(401);
    const r = await request(strict.app).post('/api/auth/login').send(ADMIN).expect(429);
    assert.ok(r.headers['retry-after']);
  } finally {
    await strict.close();
  }
});

test('cabeçalhos de segurança', async () => {
  const r = await request(t.app).get('/api/health');
  assert.ok(r.headers['content-security-policy']);
  assert.equal(r.headers['x-powered-by'], undefined);
  assert.equal(r.headers['x-content-type-options'], 'nosniff');
});
