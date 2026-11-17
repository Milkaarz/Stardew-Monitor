/**
 * Configuração do agente: variáveis de ambiente, arquivo .env e argumentos de linha de comando.
 *
 *   STARDEW_SERVER_URL        endereço do servidor central (ex.: https://monitor.exemplo.com)
 *   STARDEW_AGENT_TOKEN       token individual gerado no painel (Pelican Town > Registrar fazenda)
 *   STARDEW_INTERVAL          segundos entre leituras (padrão 10)
 *   STARDEW_ALLOW_REMOTE_KILL permitir "Expulsar morador" vindo do servidor (padrão false)
 *   STARDEW_ALLOW_INSECURE    aceitar http:// para endereços que não são locais (padrão false)
 *   STARDEW_PROCESS_EVERY     enviar a lista de processos a cada N segundos (0 = só quando pedirem)
 *   STARDEW_PROTECTED         nomes de processos extras protegidos, separados por vírgula
 */
import fs from 'node:fs';

const bool = (v, d = false) => (v == null || v === '' ? d : /^(1|true|yes|sim|on)$/i.test(String(v)));

export function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const [k, inline] = a.slice(2).split('=');
    const v = inline ?? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true');
    out[k] = v;
  }
  return out;
}

export function loadConfig(argv = process.argv.slice(2), env = process.env) {
  const args = parseArgs(argv);
  const envFile = args.env || (fs.existsSync('.env') ? '.env' : null);
  if (envFile && typeof process.loadEnvFile === 'function' && env === process.env) {
    try {
      process.loadEnvFile(envFile);
    } catch {
      /* .env opcional */
    }
  }
  const cfg = {
    serverUrl: args.server || env.STARDEW_SERVER_URL || '',
    token: args.token || env.STARDEW_AGENT_TOKEN || '',
    intervalSec: Number(args.interval || env.STARDEW_INTERVAL || 10),
    allowRemoteKill: bool(args['allow-remote-kill'] ?? env.STARDEW_ALLOW_REMOTE_KILL, false),
    allowInsecure: bool(args['allow-insecure'] ?? env.STARDEW_ALLOW_INSECURE, false),
    processEverySec: Number(args['process-every'] ?? env.STARDEW_PROCESS_EVERY ?? 0),
    processesTop: Number(env.STARDEW_PROCESSES_TOP || 60),
    maxBuffer: Number(env.STARDEW_MAX_BUFFER || 360),
    protectedProcesses: String(env.STARDEW_PROTECTED || '').split(',').map((s) => s.trim()).filter(Boolean),
  };
  return cfg;
}

const LOCAL_HOST = /^(localhost|127\.\d+\.\d+\.\d+|\[::1\]|::1)$/i;

/** Retorna a lista de problemas (vazia = configuração válida). */
export function validateConfig(cfg) {
  const problems = [];
  let url = null;
  try {
    url = new URL(cfg.serverUrl);
  } catch {
    problems.push('STARDEW_SERVER_URL ausente ou inválida (ex.: https://monitor.exemplo.com).');
  }
  if (url && !/^https?:$/.test(url.protocol)) problems.push('STARDEW_SERVER_URL deve usar http:// ou https://.');
  if (url && url.protocol === 'http:' && !LOCAL_HOST.test(url.hostname) && !cfg.allowInsecure) {
    problems.push('Conexão sem HTTPS para um servidor remoto. Use https:// (recomendado) ou defina STARDEW_ALLOW_INSECURE=true por sua conta e risco.');
  }
  if (!cfg.token || cfg.token.length < 20) problems.push('STARDEW_AGENT_TOKEN ausente ou curto demais. Gere um token no painel (Pelican Town > Registrar fazenda).');
  if (!Number.isFinite(cfg.intervalSec) || cfg.intervalSec < 2 || cfg.intervalSec > 3600) problems.push('STARDEW_INTERVAL deve estar entre 2 e 3600 segundos.');
  return problems;
}
