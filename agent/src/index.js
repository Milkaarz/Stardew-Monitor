#!/usr/bin/env node
/**
 * Agente do Stardew Monitor.
 *
 *   node agent/src/index.js --server https://monitor.exemplo.com --token <TOKEN>
 *   (ou defina STARDEW_SERVER_URL e STARDEW_AGENT_TOKEN no ambiente / arquivo .env)
 *
 * Opções: --interval 10  --allow-remote-kill  --allow-insecure  --once (uma leitura impressa na tela)
 */
import { fileURLToPath } from 'node:url';
import { Collector } from './collector/index.js';
import { AgentClient } from './client.js';
import { Agent } from './agent.js';
import { loadConfig, parseArgs, validateConfig } from './config.js';

const logger = {
  info: (m) => console.log(`[${new Date().toLocaleTimeString('pt-BR')}] ${m}`),
  warn: (m) => console.warn(`[${new Date().toLocaleTimeString('pt-BR')}] ${m}`),
};

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const collector = new Collector({ logger });

  if (args.once) {
    // diagnóstico: mostra exatamente o que seria enviado
    await collector.start();
    await new Promise((r) => setTimeout(r, 2500)); // dá tempo para os contadores de taxa
    const snap = await collector.collect();
    console.log(JSON.stringify(snap, null, 2));
    collector.stop();
    return;
  }

  const config = loadConfig();
  const problems = validateConfig(config);
  if (problems.length) {
    console.error('Configuração do agente incompleta:\n - ' + problems.join('\n - '));
    process.exit(1);
  }
  const client = new AgentClient({ serverUrl: config.serverUrl, token: config.token });
  const agent = new Agent(config, { collector, client, logger });
  await agent.start();

  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    logger.info('[agente] encerrando...');
    await agent.stop();
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export { Collector, AgentClient, Agent, loadConfig, validateConfig };
