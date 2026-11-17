/**
 * Aplicativo Stardew Monitor (o que vai dentro do executável baixável).
 *
 * Ao abrir:
 *  1. se já houver um Stardew Monitor aberto neste computador, só abre o navegador nele;
 *  2. senão, inicia o servidor local (somente 127.0.0.1) coletando os dados DESTE computador;
 *  3. abre o painel no navegador padrão.
 * Fechar a janela do aplicativo encerra o monitor.
 *
 * Opções: --no-browser (não abre o navegador) · --port 3001 · --data <pasta>
 */
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { startServer } from '../backend/src/server.js';
import { createLogger } from '../backend/src/lib/logger.js';
import { createStaticHandler } from './static.js';

const FIRST_PORT = 3001;
const PORT_ATTEMPTS = 10;

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  if (i < 0) return null;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
}

/** Pasta de dados do usuário (banco, segredo e configurações). */
export function defaultDataDir(platform = process.platform, env = process.env, home = os.homedir()) {
  if (platform === 'win32') return path.join(env.LOCALAPPDATA || path.join(home, 'AppData', 'Local'), 'StardewMonitor');
  if (platform === 'darwin') return path.join(home, 'Library', 'Application Support', 'StardewMonitor');
  return path.join(env.XDG_DATA_HOME || path.join(home, '.local', 'share'), 'stardew-monitor');
}

export function openBrowser(url) {
  const [cmd, args] = process.platform === 'win32'
    ? ['cmd', ['/c', 'start', '""', url]]
    : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
  try {
    spawn(cmd, args, { detached: true, stdio: 'ignore', windowsHide: true }).unref();
  } catch {
    /* sem navegador: o endereço aparece na janela */
  }
}

/** Procura um Stardew Monitor já aberto nas portas usadas pelo aplicativo. */
async function findRunning(first, attempts) {
  for (let port = first; port < first + attempts; port++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/api/health`, { signal: AbortSignal.timeout(600) });
      const j = await r.json();
      if (j?.app === 'stardew-monitor') return `http://localhost:${port}`;
    } catch {
      /* porta livre ou outro programa */
    }
  }
  return null;
}

function banner(url, dataDir) {
  const line = '='.repeat(60);
  console.log(`\n${line}\n  🌾 STARDEW MONITOR\n${line}`);
  console.log(`  Painel:  ${url}`);
  console.log(`  Dados:   ${dataDir}`);
  console.log('  Monitorando ESTE computador. Feche esta janela para encerrar.');
  console.log(`${line}\n`);
}

async function main() {
  const port = Number(arg('port')) || Number(process.env.PORT) || FIRST_PORT;
  const noBrowser = !!arg('no-browser');

  const running = await findRunning(port, PORT_ATTEMPTS);
  if (running) {
    console.log(`O Stardew Monitor já está aberto em ${running}. Abrindo o navegador...`);
    if (!noBrowser) openBrowser(running);
    setTimeout(() => process.exit(0), 1500);
    return;
  }

  const dataDir = path.resolve(String(arg('data') || process.env.DATA_DIR || defaultDataDir()));
  fs.mkdirSync(dataDir, { recursive: true });
  const env = {
    ...process.env,
    NODE_ENV: 'production',
    HOST: process.env.HOST || '127.0.0.1',
    PORT: String(port),
    DATA_DIR: dataDir,
    LOG_LEVEL: process.env.LOG_LEVEL || 'warn',
  };

  const logger = createLogger(env.LOG_LEVEL);
  const { url, close } = await startServer({ env, logger, staticHandler: createStaticHandler(), portAttempts: PORT_ATTEMPTS });
  banner(url, dataDir);
  if (!noBrowser) openBrowser(url);

  let closing = false;
  const shutdown = async () => {
    if (closing) return;
    closing = true;
    console.log('Encerrando o Stardew Monitor...');
    await close().catch(() => {});
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  process.on('SIGHUP', shutdown); // janela do console fechada (Windows) / terminal fechado
}

main().catch((err) => {
  console.error('\nNão foi possível iniciar o Stardew Monitor:\n', err?.message || err);
  console.error('\nPressione Enter para fechar.');
  process.stdin.resume();
  process.stdin.once('data', () => process.exit(1));
});
