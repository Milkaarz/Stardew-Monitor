// Agente: configuração, assinatura, buffer offline e comandos remotos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { signBody, tokenKey } from '@stardew-monitor/agent/client';
import { Agent } from '@stardew-monitor/agent/agent';
import { loadConfig, validateConfig, parseArgs } from '@stardew-monitor/agent/config';
import { verifyAgentSignature } from '../../backend/src/routes/agent.js';
import { sha256 } from '../../backend/src/lib/crypto.js';
import { snapshot } from '../helpers/fixtures.js';

const TOKEN = 'sdm_' + 'a'.repeat(43);
const quiet = { info() {}, warn() {} };

test('a assinatura do agente é aceita pelo servidor (e só ela)', () => {
  const body = JSON.stringify({ samples: [] });
  const ts = String(Date.now());
  const sig = signBody(TOKEN, ts, body);
  assert.equal(tokenKey(TOKEN), sha256(TOKEN));
  assert.equal(verifyAgentSignature({ tokenHash: sha256(TOKEN), timestamp: ts, signature: sig, rawBody: Buffer.from(body) }), null);
  assert.match(verifyAgentSignature({ tokenHash: sha256(TOKEN), timestamp: ts, signature: sig, rawBody: Buffer.from(body + ' ') }), /inválida/);
  assert.match(verifyAgentSignature({ tokenHash: sha256(TOKEN), timestamp: String(Date.now() - 10 * 60e3), signature: sig, rawBody: Buffer.from(body) }), /janela/);
});

test('configuração: exige HTTPS para servidores remotos e token', () => {
  assert.deepEqual(parseArgs(['--server', 'https://x', '--interval=5', '--once']), { server: 'https://x', interval: '5', once: 'true' });
  const env = { STARDEW_SERVER_URL: 'http://monitor.exemplo.com', STARDEW_AGENT_TOKEN: TOKEN };
  const c = loadConfig([], env);
  assert.ok(validateConfig(c).some((p) => /HTTPS/.test(p)));
  assert.deepEqual(validateConfig(loadConfig([], { ...env, STARDEW_SERVER_URL: 'https://monitor.exemplo.com' })), []);
  assert.deepEqual(validateConfig(loadConfig([], { ...env, STARDEW_SERVER_URL: 'http://localhost:3001' })), []);
  assert.ok(validateConfig(loadConfig([], { STARDEW_SERVER_URL: 'https://x.com' })).some((p) => /TOKEN/.test(p)));
  assert.equal(loadConfig([], env).allowRemoteKill, false, 'expulsão remota desligada por padrão');
});

function fakeCollector() {
  let n = 0;
  return { start: async () => {}, stop() {}, collect: async () => snapshot({ ts: 1000 + n++ }), topProcesses: async () => [], processes: async () => [] };
}

test('servidor fora do ar: guarda leituras e envia tudo quando voltar', async () => {
  let online = false;
  const received = [];
  const client = {
    post: async (path, body) => {
      if (!online) throw Object.assign(new Error('ECONNREFUSED'), {});
      if (path === '/api/agent/metrics') received.push(...body.samples);
      return { ok: true, commands: [] };
    },
  };
  const agent = new Agent({ intervalSec: 10, maxBuffer: 3, processEverySec: 0, processesTop: 10, allowRemoteKill: false, protectedProcesses: [] }, { collector: fakeCollector(), client, logger: quiet });
  for (let i = 0; i < 5; i++) await agent.tick(Date.now() + i * 1e9); // tenta enviar a cada ciclo
  assert.equal(agent.buffer.length, 3, 'buffer limitado (descarta as mais antigas)');
  assert.ok(agent.failures > 0);
  online = true;
  await agent.flush(Date.now() + 1e10);
  assert.equal(agent.buffer.length, 0);
  assert.equal(received.length, 3);
});

test('comando de expulsão é recusado quando o agente não permite', async () => {
  const agent = new Agent({ allowRemoteKill: false, protectedProcesses: [] }, { collector: fakeCollector(), client: {}, logger: quiet });
  const r = await agent.execute({ id: 7, type: 'kill', payload: { pid: 123, name: 'x' } });
  assert.equal(r.ok, false);
  assert.match(r.error, /não permite/);
  assert.equal((await agent.execute({ id: 8, type: 'formatar-disco' })).ok, false);
});
