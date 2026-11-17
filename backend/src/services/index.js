/** Monta todos os serviços a partir da configuração e do banco. */
import { SecretBox } from '../lib/crypto.js';
import { createBus } from './bus.js';
import { SettingsService } from './settings.js';
import { AuditService } from './audit.js';
import { MachineRegistry } from './machines.js';
import { NotificationService } from './notifications.js';
import { AlertService } from './alerts.js';
import { HistoryService } from './history.js';
import { AchievementService } from './achievements.js';
import { IngestService } from './ingest.js';
import { CommandService } from './commands.js';
import { ProcessService } from './processes.js';
import { Scheduler } from './scheduler.js';

export async function createServices({ config, db, logger, collector = null, channels }) {
  const bus = createBus();
  const settings = new SettingsService(db, { secretBox: new SecretBox(config.appSecret), secretsEnv: config.secretsEnv, bus });
  await settings.load();
  const audit = new AuditService(db, { logger });
  const machines = new MachineRegistry(db, { bus, logger, settings });
  await machines.load();
  const notifications = new NotificationService(db, { settings, bus, logger, ...(channels ? { channels } : {}) });
  const alerts = new AlertService({ settings, notifications, logger });
  const history = new HistoryService(db, { settings, logger });
  const achievements = new AchievementService(db, { settings, notifications, history, bus, logger });
  await achievements.load();
  const ingest = new IngestService({ machines, history, alerts, achievements, bus, logger });
  const commands = new CommandService(db, { bus, audit });
  const processes = new ProcessService({ collector, machines, commands, audit, config });
  const scheduler = new Scheduler({ machines, ingest, history, achievements, settings, logger });

  return { db, config, logger, bus, settings, audit, machines, notifications, alerts, history, achievements, ingest, commands, processes, scheduler, collector };
}
