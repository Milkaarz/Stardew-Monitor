// Endpoints da API: métricas, máquinas, agentes, histórico, diário, missões, conquistas,
// notificações, configurações, processos e compatibilidade.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import request from 'supertest';
import { makeApp, client, agentPost, fakeCollector } from '../helpers/app.js';
import { snapshot } from '../helpers/fixtures.js';

let t;
let admin;
let collector;
before(async () => {
  collector = fakeCollector();
  t = await makeApp({ collector });
  admin = client(t.app);
  await t.ctx.ingest.ingest(t.local, [snapshot({ cpu: 33, ram: 44 })]);
});
after(() => t.close());

test('GET /api/metrics devolve a leitura atual da máquina local', async () => {
  const r = await admin.get('/api/metrics').expect(200);
  assert.equal(r.body.machine.isLocal, true);
  assert.equal(r.body.snapshot.cpu.load, 33);
  assert.equal(r.body.snapshot.processes, undefined, 'lista de processos não vai no payload ao vivo');
  assert.ok('cpuAvg1m' in r.body.derived);
  await admin.get('/api/metrics?machine=999').expect(404);
});

test('agente: registro, envio assinado e fazenda própria', async () => {
  const created = await admin.post('/api/machines').send({ name: 'Servidor', farmName: 'Fazenda da Floresta', theme: 'forest' }).expect(201);
  const { token, machine } = created.body;
  assert.match(token, /^sdm_/);
  assert.equal(machine.status, 'offline');
  const list = await admin.get('/api/machines').expect(200);
  assert.ok(!JSON.stringify(list.body).includes(token), 'token nunca aparece na listagem');
  assert.ok(!JSON.stringify(list.body).includes('token_hash'));

  const r = await agentPost(t.app, token, { samples: [snapshot({ cpu: 12, ts: Date.now() - 20e3 }), snapshot({ cpu: 15 })] }).expect(200);
  assert.equal(r.body.accepted, 2);
  assert.ok(Array.isArray(r.body.commands));
  const m = await admin.get(`/api/metrics?machine=${machine.uid}`).expect(200);
  assert.equal(m.body.snapshot.cpu.load, 15);
  assert.equal(m.body.machine.status, 'ok');
  assert.equal(m.body.machine.farmName, 'Fazenda da Floresta');
  assert.equal(m.body.machine.hostname, 'teste');
});

test('agente: token errado, assinatura adulterada, replay e dados inválidos são recusados', async () => {
  const { body } = await admin.post('/api/machines').send({ name: 'B', theme: 'beach' }).expect(201);
  await agentPost(t.app, 'sdm_' + 'x'.repeat(43), { samples: [snapshot()] }).expect(401);
  await agentPost(t.app, body.token, { samples: [snapshot()] }, { tamper: true }).expect(401);
  await agentPost(t.app, body.token, { samples: [snapshot()] }, { ts: Date.now() - 600e3 }).expect(401);
  await request(t.app).post('/api/agent/metrics').set('Authorization', `Bearer ${body.token}`).send({ samples: [] }).expect(401);
  // mesma requisição reenviada (replay)
  const ts = Date.now();
  await agentPost(t.app, body.token, { samples: [snapshot({ ts: ts - 1 })] }, { ts }).expect(200);
  await agentPost(t.app, body.token, { samples: [snapshot({ ts: ts - 1 })] }, { ts }).expect(409);
  // validação do conteúdo
  await agentPost(t.app, body.token, { samples: [{ ts: 'ontem', cpu: { load: 'muito' } }] }).expect(400);
  await agentPost(t.app, body.token, { samples: Array.from({ length: 101 }, () => snapshot()) }).expect(400);
  // o painel não serve para o endpoint do agente (exige token)
  await admin.post('/api/agent/metrics').send({ samples: [snapshot()] }).expect(401);
});

test('agente: despedida marca a fazenda como desconectada (cinza) e gera aviso', async () => {
  const { body } = await admin.post('/api/machines').send({ name: 'C', farmName: 'Fazenda da Colina', theme: 'hilltop' }).expect(201);
  await agentPost(t.app, body.token, { samples: [snapshot()] }).expect(200);
  await agentPost(t.app, body.token, { reason: 'shutdown' }, { path: '/api/agent/goodbye' }).expect(200);
  const m = (await admin.get(`/api/machines/${body.machine.id}`).expect(200)).body.machine;
  assert.equal(m.status, 'offline');
  const n = await admin.get(`/api/notifications?category=offline&machine=${body.machine.id}`).expect(200);
  assert.ok(n.body.items.length >= 1);
});

test('detector de máquinas sem sinal', async () => {
  const { body } = await admin.post('/api/machines').send({ name: 'D' }).expect(201);
  await agentPost(t.app, body.token, { samples: [snapshot()] }).expect(200);
  const m = t.ctx.machines.get(body.machine.id);
  m.live.lastSeenAt = Date.now() - 10 * 60e3;
  await t.ctx.scheduler.checkOffline();
  assert.equal(t.ctx.machines.status(m), 'offline');
});

test('rotação de token invalida o anterior; remoção apaga a fazenda', async () => {
  const { body } = await admin.post('/api/machines').send({ name: 'E' }).expect(201);
  const rotated = await admin.post(`/api/machines/${body.machine.id}/token`).expect(200);
  await agentPost(t.app, body.token, { samples: [snapshot()] }).expect(401);
  await agentPost(t.app, rotated.body.token, { samples: [snapshot()] }).expect(200);
  await admin.patch(`/api/machines/${body.machine.id}`).send({ farmName: 'Fazenda de Gengibre', theme: 'ginger' }).expect(200);
  await admin.del(`/api/machines/${body.machine.id}`).expect(200);
  await agentPost(t.app, rotated.body.token, { samples: [snapshot()] }).expect(401);
  await admin.del(`/api/machines/${t.local.row.id}`).expect(400);
});

test('histórico: brutos, agregação por minuto/hora e períodos', async () => {
  const base = Date.now() - 50 * 60e3;
  const samples = Array.from({ length: 60 }, (_, i) => snapshot({ cpu: i % 2 ? 80 : 20, ts: base + i * 30e3 }));
  await t.ctx.ingest.ingest(t.local, samples);
  const raw = await admin.get('/api/history?range=1h').expect(200);
  assert.equal(raw.body.source, 'raw');
  assert.ok(raw.body.points.length > 10);
  assert.ok(raw.body.points.every((p) => Number.isInteger(p.ts)), 'buckets inteiros');
  await t.ctx.history.rollupMinutes();
  await t.ctx.history.rollupHours();
  const day = await admin.get('/api/history?range=24h').expect(200);
  assert.equal(day.body.source, 'minute');
  const avg = day.body.points.map((p) => p.cpu).filter((v) => v != null);
  assert.ok(avg.length > 5);
  assert.ok(day.body.points.some((p) => p.cpu_max >= 80), 'guarda o pico');
  const week = await admin.get('/api/history?range=7d').expect(200);
  assert.equal(week.body.source, 'hour');
  assert.ok(week.body.points.length >= 1);
  await admin.get('/api/history?range=2anos').expect(400);
});

test('diário: criar, editar, pesquisar, filtrar e apagar', async () => {
  const a = await admin.post('/api/notes').send({ title: 'Troquei o SSD', body: 'Kingston de 1 TB com 100% de saúde', category: 'hardware' }).expect(201);
  await admin.post('/api/notes').send({ title: 'Limpeza', body: 'poeira nos filtros', category: 'maintenance', machineId: t.local.row.id }).expect(201);
  await admin.post('/api/notes').send({ title: '', category: 'hardware' }).expect(400);
  await admin.post('/api/notes').send({ title: 'x', category: 'invalida' }).expect(400);
  const found = await admin.get('/api/notes?q=kingston').expect(200);
  assert.equal(found.body.notes.length, 1);
  const pct = await admin.get('/api/notes?q=100%25').expect(200);
  assert.equal(pct.body.notes.length, 1, 'curinga % é tratado como texto');
  assert.equal((await admin.get('/api/notes?category=maintenance').expect(200)).body.notes.length, 1);
  assert.equal((await admin.get(`/api/notes?machine=${t.local.row.id}`).expect(200)).body.notes.length, 1);
  const edited = await admin.put(`/api/notes/${a.body.note.id}`).send({ title: 'Troquei o SSD (NVMe)', body: 'atualizado', category: 'hardware' }).expect(200);
  assert.ok(edited.body.note.updatedAt >= edited.body.note.createdAt);
  await admin.del(`/api/notes/${a.body.note.id}`).expect(200);
  await admin.del(`/api/notes/${a.body.note.id}`).expect(404);
});

test('quadro de missões com missões diárias', async () => {
  const q = await admin.post('/api/quests').send({ text: 'Regar as plantas', daily: true }).expect(201);
  const done = await admin.patch(`/api/quests/${q.body.quest.id}`).send({ done: true }).expect(200);
  assert.equal(done.body.quest.done, true);
  // feita ontem: missão diária volta a ficar pendente
  await t.db.run('UPDATE quests SET done_at = ? WHERE id = ?', [Date.now() - 2 * 86400e3, q.body.quest.id]);
  const list = await admin.get('/api/quests').expect(200);
  assert.equal(list.body.quests.find((x) => x.id === q.body.quest.id).done, false);
  await admin.del(`/api/quests/${q.body.quest.id}`).expect(200);
});

test('conquistas persistidas com data de desbloqueio', async () => {
  const r = await admin.get('/api/achievements').expect(200);
  const first = r.body.items.find((a) => a.key === 'first_harvest');
  assert.equal(first.unlocked, true);
  assert.ok(first.unlockedAt);
  // Dia Tranquilo: CPU baixa por tempo suficiente (dados reais persistidos)
  const start = Date.now() - 70 * 60e3;
  await t.ctx.ingest.ingest(t.local, Array.from({ length: 15 }, (_, i) => snapshot({ cpu: 2, ts: start + i * 5 * 60e3 })));
  const after = await admin.get('/api/achievements').expect(200);
  assert.equal(after.body.items.find((a) => a.key === 'quiet_day').unlocked, true);
  await t.ctx.achievements.persist();
  const row = await t.db.get('SELECT data FROM machine_state WHERE machine_id = ?', [t.local.row.id]);
  assert.ok(JSON.parse(row.data).totalOnlineSec > 0, 'uptime acumulado salvo no banco');
  // Máquina Incansável usa o uptime do sistema
  await t.ctx.ingest.ingest(t.local, [snapshot({ uptimeSec: 100 * 3600 })]);
  assert.ok(t.ctx.achievements.isUnlocked(t.local.row.id, 'tireless_machine'));
});

test('alertas: limite cruzado gera notificação temática, histórico e entrega no canal', async () => {
  await admin.put('/api/settings/notifications').send({
    cooldownMin: 30, notifyRecovery: true, notifyAchievements: false,
    channels: { discord: { enabled: true, categories: ['disk'] }, telegram: { enabled: false, categories: [] }, email: { enabled: false, categories: [] } },
  }).expect(200);
  t.sent.length = 0;
  await t.ctx.ingest.ingest(t.local, [snapshot({ disks: [99] })]);
  await t.ctx.notifications.flush();
  const n = await admin.get('/api/notifications?category=disk').expect(200);
  assert.ok(n.body.items.some((x) => x.title === 'O silo está transbordando!'));
  assert.ok(t.sent.some((x) => x.category === 'disk'), 'entregue no Discord (falso)');
  const delivered = n.body.items.find((x) => x.title === 'O silo está transbordando!');
  // mesma situação de novo: sem repetição
  const before = t.sent.length;
  await t.ctx.ingest.ingest(t.local, [snapshot({ disks: [99] })]);
  await t.ctx.notifications.flush();
  assert.equal(t.sent.length, before);
  assert.ok(delivered);
  const status = (await admin.get('/api/metrics').expect(200)).body.machine.status;
  assert.equal(status, 'crit');
});

test('configurações: validação dos limites e segredos nunca devolvidos', async () => {
  const s = (await admin.get('/api/settings').expect(200)).body.settings;
  await admin.put('/api/settings/thresholds').send({ ...s.thresholds, cpu: { ...s.thresholds.cpu, warn: 99, crit: 50 } }).expect(400);
  await admin.put('/api/settings/thresholds').send({ ...s.thresholds, temperature: { ...s.thresholds.temperature, crit: 150 } }).expect(400);
  const ok = await admin.put('/api/settings/thresholds').send({ ...s.thresholds, cpu: { ...s.thresholds.cpu, warn: 70 } }).expect(200);
  assert.equal(ok.body.value.cpu.warn, 70);
  await admin.put('/api/settings/inexistente').send({}).expect(404);
  await admin.del('/api/settings/thresholds').expect(200);

  const secret = 'https://discord.com/api/webhooks/123/segredo-super-secreto';
  const r = await admin.put('/api/secrets').send({ 'discord.webhookUrl': secret }).expect(200);
  assert.equal(r.body.secrets['discord.webhookUrl'].configured, true);
  const all = await admin.get('/api/settings').expect(200);
  assert.ok(!JSON.stringify(all.body).includes('segredo-super-secreto'));
  const stored = await t.db.get("SELECT value FROM secrets WHERE key = 'discord.webhookUrl'");
  assert.ok(!stored.value.includes('segredo'), 'guardado criptografado');
  assert.equal(t.ctx.settings.getSecret('discord.webhookUrl'), secret);
  await admin.put('/api/secrets').send({ 'discord.webhookUrl': null }).expect(200);
  assert.equal(t.ctx.settings.getSecret('discord.webhookUrl'), null);
  await admin.put('/api/secrets').send({ 'outro.segredo': 'x' }).expect(200); // chave desconhecida é descartada
});

test('processos: ordenação, filtro, limite e proteção', async () => {
  collector.procList = [
    { pid: 4, name: 'System', cpu: 1, mem: 0, started: Date.now() - 1e6 },
    { pid: 100, name: 'chrome', cpu: 30, mem: 5, started: Date.now() - 1e5 },
    { pid: 200, name: 'node', cpu: 10, mem: 20, started: Date.now() - 1e4 },
    { pid: 300, name: 'idle-app', cpu: 0, mem: 0.1, started: null },
  ];
  const byCpu = await admin.get('/api/processes?sort=cpu&limit=10').expect(200);
  assert.deepEqual(byCpu.body.items.map((p) => p.pid), [100, 200, 4, 300]);
  const byMem = await admin.get('/api/processes?sort=mem&limit=10').expect(200);
  assert.equal(byMem.body.items[0].pid, 200);
  assert.equal((await admin.get('/api/processes?q=chro&limit=10').expect(200)).body.items.length, 1);
  assert.equal((await admin.get('/api/processes?filter=active&limit=10').expect(200)).body.total, 3);
  await admin.get('/api/processes?limit=7').expect(400);
  assert.ok(byCpu.body.items[0].runtimeSec > 0);
});

test('expulsar morador: confirmação, proteção, PID trocado e auditoria', async () => {
  // processo real e descartável para o teste
  const child = spawn(process.execPath, ['-e', 'setTimeout(()=>{}, 60000)'], { stdio: 'ignore' });
  const exited = new Promise((r) => child.on('exit', r));
  collector.procList = [
    { pid: child.pid, name: 'node-descartavel', cpu: 0, mem: 0 },
    { pid: 4, name: 'System', cpu: 0, mem: 0 },
  ];
  const kill = (body) => admin.post('/api/processes/kill').send({ pid: child.pid, name: 'node-descartavel', confirm: true, ...body });
  await kill({ confirm: false }).expect(400);
  await kill({ name: 'outro-processo' }).expect(409);
  await admin.post('/api/processes/kill').send({ pid: 4, name: 'System', confirm: true }).expect(403);
  const ok = await kill({}).expect(200);
  assert.equal(ok.body.mode, 'local');
  await exited;
  const audit = await admin.get('/api/audit?action=process.kill').expect(200);
  assert.ok(audit.body.entries.some((e) => e.success && e.target.endsWith(`:${child.pid}`)));
  assert.ok(audit.body.entries.some((e) => !e.success && e.details.code === 'mismatch'));
});

test('expulsão desativada por configuração', async () => {
  const off = await makeApp({ config: { allowProcessKill: false } });
  try {
    const s = client(off.app);
    await s.post('/api/processes/kill').send({ pid: 12345, name: 'x', confirm: true }).expect(403);
  } finally {
    await off.close();
  }
});

test('expulsão remota vira comando para o agente, que devolve o resultado', async () => {
  const { body } = await admin.post('/api/machines').send({ name: 'Remota' }).expect(201);
  await agentPost(t.app, body.token, { samples: [snapshot({ processes: [{ pid: 4242, name: 'app-remoto', cpu: 5, mem: 1 }] })] }).expect(200);
  const list = await admin.get(`/api/processes?machine=${body.machine.id}&limit=10`).expect(200);
  assert.equal(list.body.live, false);
  assert.equal(list.body.items[0].name, 'app-remoto');
  const r = await admin.post('/api/processes/kill').send({ machine: body.machine.id, pid: 4242, name: 'app-remoto', confirm: true }).expect(200);
  assert.equal(r.body.mode, 'remote');
  const res = await agentPost(t.app, body.token, { samples: [snapshot()] }).expect(200);
  assert.equal(res.body.sendProcesses, true);
  assert.deepEqual(res.body.commands.map((c) => c.type), ['kill']);
  await agentPost(t.app, body.token, { commandResults: [{ id: res.body.commands[0].id, ok: false, error: 'não permitido' }] }).expect(200);
  assert.equal((await t.ctx.commands.get(res.body.commands[0].id)).status, 'failed');
});

test('compatibilidade: /api/dados (formato v2) sem token', async () => {
  const legacy = await request(t.app).get('/api/dados').expect(200);
  assert.ok('avgCpu' in legacy.body && 'ramUsage' in legacy.body && Array.isArray(legacy.body.disks));
  await request(t.app).get('/api/public/town').expect(404);
});

test('preferências visuais salvas no computador (atualização parcial)', async () => {
  const r = await admin.put('/api/preferences').send({ sound: true, uiTheme: 'mines' }).expect(200);
  assert.equal(r.body.preferences.sound, true);
  assert.equal(r.body.preferences.music, false);
  await admin.put('/api/preferences').send({ uiTheme: 'tema-que-nao-existe' }).expect(400);
  const s = await admin.get('/api/settings').expect(200);
  assert.equal(s.body.settings.preferences.uiTheme, 'mines');
});

test('rota inexistente e JSON inválido', async () => {
  await admin.get('/api/nao-existe').expect(404);
  await request(t.app).post('/api/notes').set('X-Stardew-Monitor', '1').set('Content-Type', 'application/json').send('{quebrado').expect(400);
});
