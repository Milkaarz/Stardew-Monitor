/** Monta um servidor completo para testes: banco em memória (ou TEST_DATABASE_URL), coletor e canais falsos. */
import request from 'supertest';
import { openDatabase } from '@stardew-monitor/database';
import { loadConfig } from '../../backend/src/config.js';
import { createServices } from '../../backend/src/services/index.js';
import { createApp } from '../../backend/src/app.js';
import { signBody } from '@stardew-monitor/agent/client';
import { snapshot } from './fixtures.js';

export const silent = { debug() {}, info() {}, warn() {}, error() {} };
export const ADMIN = { username: 'admin', password: 'senha-admin-123' };
export const VIEWER = { username: 'visitante', password: 'senha-visit-123' };

export function fakeCollector(list = []) {
  return {
    procList: list,
    procCache: { at: 0 },
    start: async () => {},
    stop() {},
    collect: async () => snapshot(),
    processes: async function processes() {
      return this.procList;
    },
    topProcesses: async () => [],
  };
}

/**
 * Com API_TEST_PG=postgres://... (servidor de testes), cada app recebe um banco PostgreSQL novo,
 * para rodar a suíte de API inteira também no PostgreSQL.
 */
async function freshPgDatabase(adminUrl) {
  const { default: pg } = await import('pg');
  const name = `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const client = new pg.Client({ connectionString: adminUrl });
  await client.connect();
  await client.query(`CREATE DATABASE ${name}`);
  await client.end();
  const u = new URL(adminUrl);
  u.pathname = `/${name}`;
  return u.toString();
}

export async function makeApp({ config: cfg = {}, collector = fakeCollector(), dbUrl } = {}) {
  if (!dbUrl && process.env.API_TEST_PG) dbUrl = await freshPgDatabase(process.env.API_TEST_PG);
  const config = {
    ...loadConfig({ NODE_ENV: 'test' }),
    appSecret: 'segredo-de-teste-com-mais-de-32-caracteres',
    staticDir: '/nao/existe',
    ...cfg,
    rateLimit: { apiPerMin: 10000, loginPer15Min: 100, agentPerMin: 10000, killPerMin: 100, ...(cfg.rateLimit || {}) },
  };
  const db = await openDatabase({ url: dbUrl || 'sqlite::memory:', logger: silent });
  const sent = [];
  const channels = {
    discord: { label: 'Discord', configured: () => true, send: async (n) => sent.push(n) },
  };
  const ctx = await createServices({ config, db, logger: silent, collector, channels });
  await ctx.auth.createUser({ ...ADMIN, role: 'admin' });
  await ctx.auth.createUser({ ...VIEWER, role: 'viewer' });
  const local = await ctx.machines.ensureLocal({ hostname: 'servidor-teste', farmName: 'Fazenda Principal' });
  const app = createApp(ctx);
  return {
    app, ctx, db, sent, local,
    close: async () => {
      await ctx.notifications.flush();
      await db.close();
    },
  };
}

/** Faz login e devolve um "agente" supertest com cookie + helper que já envia o CSRF. */
export async function login(app, who = ADMIN) {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/login').send(who).expect(200);
  const csrf = res.body.csrf;
  const withCsrf = (method) => (url) => agent[method](url).set('X-CSRF-Token', csrf);
  return { agent, csrf, post: withCsrf('post'), put: withCsrf('put'), patch: withCsrf('patch'), del: withCsrf('delete'), get: (url) => agent.get(url) };
}

/** Envia leituras como um agente de verdade (Bearer + HMAC). */
export function agentPost(app, token, body, { path = '/api/agent/metrics', ts = Date.now(), tamper = false } = {}) {
  const raw = JSON.stringify(body);
  return request(app)
    .post(path)
    .set('Content-Type', 'application/json')
    .set('Authorization', `Bearer ${token}`)
    .set('X-Agent-Timestamp', String(ts))
    .set('X-Agent-Signature', signBody(token, String(ts), tamper ? `${raw} ` : raw))
    .send(raw);
}
