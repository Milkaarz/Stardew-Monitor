/**
 * Esquemas de validação (zod) de tudo o que entra na API.
 * Campos desconhecidos são descartados; tamanhos de textos e listas são limitados.
 */
import { z } from 'zod';
import {
  ALERT_CATEGORIES, NOTE_CATEGORIES, THEME_KEYS, PROCESS_LIMITS, HISTORY_RANGES, SEASONS,
} from '@stardew-monitor/shared';
import { SECRET_KEYS } from './services/settings.js';

const n = z.number().min(-1e18).max(1e18).nullable().optional();
const str = (max = 256) => z.string().max(max).nullable().optional();
const pct = z.number().min(1).max(100);
const temp = z.number().min(40).max(110);
const sustain = z.number().int().min(0).max(3600);

// ---------- agente ----------

export const snapshotSchema = z.object({
  v: z.number().optional(),
  ts: z.number().min(0),
  host: z.object({ hostname: str(), platform: str(32), os: str(), arch: str(32), kernel: str(), uuid: str(128) }).partial().optional(),
  cpu: z.object({
    load: n,
    cores: z.array(z.number().nullable()).max(1024).optional(),
    model: str(),
    physicalCores: n,
    threads: n,
    speedGHz: n,
    temp: n,
    loadAvg: z.array(z.number()).max(3).nullable().optional(),
  }).optional(),
  mem: z.object({
    total: n, used: n, available: n, pct: n,
    swap: z.object({ total: n, used: n, pct: n }).nullable().optional(),
  }).optional(),
  disks: z.array(z.object({ name: str(), mount: str(), fs: str(64), size: n, used: n, free: n, pct: n })).max(64).optional(),
  diskIO: z.object({ readSec: n, writeSec: n }).nullable().optional(),
  net: z.object({ iface: str(), rxSec: n, txSec: n, rxTotal: n, txTotal: n }).nullable().optional(),
  gpus: z.array(z.object({ name: str(), vendor: str(), util: n, temp: n, vramTotal: n, vramUsed: n, fanPct: n, powerW: n })).max(16).optional(),
  fans: z.array(z.object({ name: str(), rpm: n })).max(64).optional(),
  battery: z.object({ pct: n, charging: z.boolean().optional(), acConnected: z.boolean().optional(), timeRemainingMin: n }).nullable().optional(),
  uptimeSec: n,
  processes: z.array(z.object({
    pid: z.number().int(), name: z.string().max(256), user: str(128), cpu: n, mem: n, memRss: n, started: n, state: str(32),
  })).max(500).optional(),
});

export const agentPayloadSchema = z.object({
  samples: z.array(snapshotSchema).max(100).optional(),
  snapshot: snapshotSchema.optional(),
  commandResults: z.array(z.object({ id: z.number().int(), ok: z.boolean(), error: str(500) })).max(50).optional(),
});

// ---------- autenticação e usuários ----------

export const loginSchema = z.object({
  username: z.string().trim().min(1).max(64),
  password: z.string().min(1).max(200),
});

export const usernameSchema = z.string().trim().regex(/^[a-zA-Z0-9_.-]{3,32}$/, 'use 3 a 32 letras, números, ponto, hífen ou sublinhado');

export const createUserSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1).max(200),
  role: z.enum(['admin', 'viewer']).default('viewer'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(1).max(200),
});

export const prefsSchema = z.object({
  sound: z.boolean().optional(),
  music: z.boolean().optional(),
  alertSound: z.boolean().optional(),
  uiTheme: z.enum(['auto', ...THEME_KEYS]).optional(),
  selectedMachine: z.union([z.number().int(), z.string().max(64)]).nullable().optional(),
  reducedMotion: z.boolean().optional(),
});

// ---------- máquinas ----------

export const machineCreateSchema = z.object({
  name: z.string().trim().min(1).max(60),
  farmName: z.string().trim().min(1).max(60).optional(),
  theme: z.enum(THEME_KEYS).default('standard'),
});

export const machineUpdateSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  farmName: z.string().trim().min(1).max(60).optional(),
  theme: z.enum(THEME_KEYS).optional(),
});

// ---------- diário e missões ----------

export const noteSchema = z.object({
  title: z.string().trim().min(1).max(120),
  body: z.string().max(20000).default(''),
  category: z.enum(NOTE_CATEGORIES.map((c) => c.key)),
  machineId: z.number().int().positive().nullable().optional(),
});

export const noteQuerySchema = z.object({
  q: z.string().max(100).optional(),
  category: z.enum(NOTE_CATEGORIES.map((c) => c.key)).optional(),
  machine: z.string().max(64).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(200),
});

export const questSchema = z.object({
  text: z.string().trim().min(1).max(120),
  daily: z.boolean().default(false),
});

export const questPatchSchema = z.object({
  text: z.string().trim().min(1).max(120).optional(),
  done: z.boolean().optional(),
  daily: z.boolean().optional(),
});

// ---------- processos ----------

export const processQuerySchema = z.object({
  machine: z.string().max(64).optional(),
  sort: z.enum(['cpu', 'mem', 'name', 'pid']).default('cpu'),
  order: z.enum(['asc', 'desc']).default('desc'),
  limit: z.coerce.number().int().refine((v) => PROCESS_LIMITS.includes(v), 'use 10, 25, 50 ou 100').default(25),
  q: z.string().max(100).optional(),
  filter: z.enum(['all', 'active', 'heavy', 'user']).default('all'),
});

export const killSchema = z.object({
  machine: z.union([z.number().int(), z.string().max(64)]).optional(),
  pid: z.number().int().positive(),
  name: z.string().min(1).max(256),
  password: z.string().min(1).max(200),
  confirm: z.literal(true),
});

// ---------- histórico ----------

export const historyQuerySchema = z.object({
  machine: z.string().max(64).optional(),
  range: z.enum(Object.keys(HISTORY_RANGES)).default('1h'),
});

// ---------- configurações ----------

const levelPair = (extra = {}) => z.object({ enabled: z.boolean(), warn: pct, crit: pct, sustainSec: sustain, ...extra })
  .refine((v) => v.warn < v.crit, 'o limite de aviso deve ser menor que o crítico');

export const thresholdsSchema = z.object({
  cpu: levelPair(),
  ram: levelPair(),
  disk: levelPair(),
  temperature: z.object({ enabled: z.boolean(), warn: temp, crit: temp, sustainSec: sustain })
    .refine((v) => v.warn < v.crit, 'o limite de aviso deve ser menor que o crítico'),
  gpu: z.object({ enabled: z.boolean(), warn: pct, crit: pct, sustainSec: sustain, tempWarn: temp, tempCrit: temp })
    .refine((v) => v.warn < v.crit && v.tempWarn < v.tempCrit, 'o limite de aviso deve ser menor que o crítico'),
  battery: z.object({ enabled: z.boolean(), warn: pct, crit: pct, sustainSec: sustain })
    .refine((v) => v.crit < v.warn, 'na bateria, o crítico deve ser menor que o aviso'),
  offline: z.object({ enabled: z.boolean(), afterSec: z.number().int().min(15).max(86400) }),
});

const channelSchema = z.object({ enabled: z.boolean(), categories: z.array(z.enum(ALERT_CATEGORIES)).max(ALERT_CATEGORIES.length) });

export const notificationsSchema = z.object({
  cooldownMin: z.number().int().min(0).max(1440),
  notifyRecovery: z.boolean(),
  notifyAchievements: z.boolean(),
  channels: z.object({ discord: channelSchema, telegram: channelSchema, email: channelSchema }),
});

export const weatherSchema = z.object({
  hotTemp: temp, heatwaveTemp: temp,
  cloudyLoad: pct, rainLoad: pct, stormLoad: pct, idleLoad: pct,
  windRpm: z.number().int().min(100).max(10000),
}).refine((v) => v.hotTemp < v.heatwaveTemp, 'a onda de calor deve ser mais quente que o dia quente');

export const achievementsSettingsSchema = z.object({
  idleLoad: pct,
  idleMinutes: z.number().int().min(5).max(1440),
  tirelessHours: z.number().int().min(1).max(8760),
  diskLimit: z.number().min(10).max(100),
  diskDays: z.number().int().min(1).max(60),
});

export const appearanceSchema = z.object({
  seasonMode: z.enum(['north', 'south', 'farm']),
  farmEpoch: z.number().int().positive().nullable(),
  festivalDecorations: z.boolean(),
});

export const retentionSchema = z.object({
  rawHours: z.number().int().min(2).max(168),
  minuteDays: z.number().int().min(1).max(60),
  hourDays: z.number().int().min(7).max(3650),
  notificationDays: z.number().int().min(1).max(3650),
  auditDays: z.number().int().min(30).max(3650),
});

const mmdd = z.string().regex(/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, 'use MM-DD');
export const festivalsSchema = z.array(z.object({
  key: z.string().regex(/^[a-z0-9_-]{1,32}$/),
  name: z.string().trim().min(1).max(60),
  enabled: z.boolean(),
  decoration: z.enum(['eggs', 'flowers', 'lanterns', 'pumpkins', 'ice', 'stars']),
  message: z.string().max(200),
  rule: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('season'), season: z.enum(SEASONS), from: z.number().int().min(1).max(93), to: z.number().int().min(1).max(93) }),
    z.object({ kind: z.literal('date'), from: mmdd, to: mmdd }),
    z.object({ kind: z.literal('easter'), from: z.number().int().min(-60).max(60), to: z.number().int().min(-60).max(60) }),
  ]),
})).max(30);

export const SETTINGS_SCHEMAS = {
  thresholds: thresholdsSchema,
  notifications: notificationsSchema,
  weather: weatherSchema,
  achievements: achievementsSettingsSchema,
  appearance: appearanceSchema,
  retention: retentionSchema,
  festivals: festivalsSchema,
};

export const secretsSchema = z.object(
  Object.fromEntries(SECRET_KEYS.map((k) => [k, z.string().max(500).nullable().optional()])),
);
