/**
 * Configuração do servidor (variáveis de ambiente). Veja .env.example para a lista comentada.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const bool = (v, d) => (v == null || v === '' ? d : /^(1|true|yes|sim|on)$/i.test(String(v)));
const int = (v, d) => (Number.isFinite(Number(v)) && v !== '' && v != null ? Number(v) : d);
const list = (v) => String(v || '').split(',').map((s) => s.trim()).filter(Boolean);

/** APP_SECRET: usa a variável; senão gera uma vez e guarda em data/.app-secret (permissão 600). */
export function resolveAppSecret(env, dataDir) {
  if (env.APP_SECRET && env.APP_SECRET.length >= 32) return env.APP_SECRET;
  if (env.APP_SECRET) throw new Error('APP_SECRET precisa ter pelo menos 32 caracteres.');
  const file = path.join(dataDir, '.app-secret');
  try {
    const s = fs.readFileSync(file, 'utf8').trim();
    if (s.length >= 32) return s;
  } catch {
    /* ainda não existe */
  }
  fs.mkdirSync(dataDir, { recursive: true });
  const secret = crypto.randomBytes(48).toString('base64url');
  fs.writeFileSync(file, secret, { mode: 0o600 });
  return secret;
}

export function loadConfig(env = process.env) {
  const dataDir = path.resolve(ROOT_DIR, env.DATA_DIR || 'data');
  const nodeEnv = env.NODE_ENV || 'development';
  return {
    nodeEnv,
    isProduction: nodeEnv === 'production',
    port: int(env.PORT, 3001),
    host: env.HOST || '0.0.0.0',
    dataDir,
    databaseUrl: env.DATABASE_URL || `sqlite:${path.join(dataDir, 'stardew.db')}`,
    databaseSsl: env.DATABASE_SSL || '',
    appSecret: env.APP_SECRET_RESOLVED || null, // preenchido no boot (resolveAppSecret)
    sessionTtlHours: int(env.SESSION_TTL_HOURS, 12),
    cookieSecure: (env.COOKIE_SECURE || 'auto').toLowerCase(), // auto | true | false
    trustProxy: env.TRUST_PROXY || (nodeEnv === 'production' ? '1' : 'loopback'),
    adminUsername: env.ADMIN_USERNAME || 'admin',
    adminPassword: env.ADMIN_PASSWORD || '',
    localMonitor: bool(env.LOCAL_MONITOR, true),
    localIntervalSec: Math.max(2, int(env.LOCAL_INTERVAL, 5)),
    localFarmName: env.LOCAL_FARM_NAME || 'Fazenda Principal',
    allowProcessKill: bool(env.ALLOW_PROCESS_KILL, true),
    protectedProcesses: list(env.PROTECTED_PROCESSES),
    publicDashboard: bool(env.PUBLIC_DASHBOARD, false),
    legacyApiToken: env.LEGACY_API_TOKEN || '',
    staticDir: path.resolve(ROOT_DIR, env.STATIC_DIR || 'frontend/dist'),
    windowsHelper: bool(env.WINDOWS_HELPER, true),
    rateLimit: {
      apiPerMin: int(env.RATE_LIMIT_API_PER_MIN, 600),
      loginPer15Min: int(env.RATE_LIMIT_LOGIN_PER_15MIN, 10),
      agentPerMin: int(env.RATE_LIMIT_AGENT_PER_MIN, 240),
      killPerMin: int(env.RATE_LIMIT_KILL_PER_MIN, 10),
    },
    // segredos dos canais de notificação (têm prioridade sobre o que for salvo pelo painel)
    secretsEnv: {
      'discord.webhookUrl': env.DISCORD_WEBHOOK_URL,
      'telegram.botToken': env.TELEGRAM_BOT_TOKEN,
      'telegram.chatId': env.TELEGRAM_CHAT_ID,
      'email.host': env.SMTP_HOST,
      'email.port': env.SMTP_PORT,
      'email.secure': env.SMTP_SECURE,
      'email.user': env.SMTP_USER,
      'email.pass': env.SMTP_PASS,
      'email.from': env.SMTP_FROM,
      'email.to': env.SMTP_TO,
    },
  };
}
