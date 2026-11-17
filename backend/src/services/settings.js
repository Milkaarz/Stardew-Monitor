/**
 * Configurações persistidas (por seção) e cofre de segredos criptografados.
 * Segredos NUNCA são devolvidos à interface: só o status "configurado / origem".
 */
import {
  DEFAULT_THRESHOLDS, DEFAULT_NOTIFICATION_SETTINGS, DEFAULT_WEATHER, DEFAULT_ACHIEVEMENT_SETTINGS,
  DEFAULT_APPEARANCE, DEFAULT_RETENTION, DEFAULT_FESTIVALS,
} from '@stardew-monitor/shared';
import { deepMerge, parseJson } from '../lib/json.js';

export const SETTING_DEFAULTS = {
  thresholds: DEFAULT_THRESHOLDS,
  notifications: DEFAULT_NOTIFICATION_SETTINGS,
  weather: DEFAULT_WEATHER,
  achievements: DEFAULT_ACHIEVEMENT_SETTINGS,
  appearance: DEFAULT_APPEARANCE,
  retention: DEFAULT_RETENTION,
  festivals: DEFAULT_FESTIVALS,
};

export const SECRET_KEYS = [
  'discord.webhookUrl',
  'telegram.botToken', 'telegram.chatId',
  'email.host', 'email.port', 'email.secure', 'email.user', 'email.pass', 'email.from', 'email.to',
];

export class SettingsService {
  constructor(db, { secretBox, secretsEnv = {}, bus }) {
    this.db = db;
    this.box = secretBox;
    this.secretsEnv = secretsEnv;
    this.bus = bus;
    this.values = {};
    this.secrets = new Map();
  }

  async load() {
    for (const row of await this.db.all('SELECT key, value FROM settings')) this.values[row.key] = parseJson(row.value, null);
    for (const row of await this.db.all('SELECT key, value FROM secrets')) {
      try {
        this.secrets.set(row.key, this.box.decrypt(row.value));
      } catch {
        // APP_SECRET mudou: o segredo antigo não pode mais ser lido
        this.secrets.set(row.key, null);
      }
    }
    // calendário próprio da fazenda começa na data de instalação
    if (!this.values.appearance?.farmEpoch) {
      await this.set('appearance', { ...(this.values.appearance || {}), farmEpoch: Date.now() });
    }
  }

  get(section) {
    const def = SETTING_DEFAULTS[section];
    const v = this.values[section];
    if (Array.isArray(def)) return Array.isArray(v) ? v : def;
    return deepMerge(def, v || {});
  }

  all() {
    const out = {};
    for (const k of Object.keys(SETTING_DEFAULTS)) out[k] = this.get(k);
    return out;
  }

  async set(section, value) {
    if (!(section in SETTING_DEFAULTS)) throw new Error(`seção desconhecida: ${section}`);
    const json = JSON.stringify(value);
    const now = Date.now();
    await this.db.run(
      'INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at',
      [section, json, now],
    );
    this.values[section] = value;
    this.bus?.emit('settings', { section });
    return this.get(section);
  }

  async reset(section) {
    await this.db.run('DELETE FROM settings WHERE key = ?', [section]);
    delete this.values[section];
    this.bus?.emit('settings', { section });
    return this.get(section);
  }

  // ---------- segredos ----------

  getSecret(key) {
    const env = this.secretsEnv[key];
    if (env != null && env !== '') return env;
    return this.secrets.get(key) ?? null;
  }

  async setSecret(key, value) {
    if (!SECRET_KEYS.includes(key)) throw new Error(`segredo desconhecido: ${key}`);
    if (value == null || value === '') {
      await this.db.run('DELETE FROM secrets WHERE key = ?', [key]);
      this.secrets.delete(key);
      return;
    }
    await this.db.run(
      'INSERT INTO secrets (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at',
      [key, this.box.encrypt(String(value)), Date.now()],
    );
    this.secrets.set(key, String(value));
  }

  /** Status seguro para a interface: nunca inclui o valor. */
  secretStatus() {
    const out = {};
    for (const key of SECRET_KEYS) {
      const env = this.secretsEnv[key];
      const fromEnv = env != null && env !== '';
      const stored = this.secrets.get(key);
      out[key] = {
        configured: fromEnv || (stored != null && stored !== ''),
        source: fromEnv ? 'env' : stored ? 'painel' : null,
        unreadable: !fromEnv && this.secrets.has(key) && stored == null,
      };
    }
    return out;
  }
}
