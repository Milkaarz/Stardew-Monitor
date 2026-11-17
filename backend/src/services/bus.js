/**
 * Barramento de eventos interno. Os serviços publicam; a rota SSE repassa ao navegador.
 * Eventos: metrics, machine, notification, achievement, command, settings.
 */
import { EventEmitter } from 'node:events';

export function createBus() {
  const bus = new EventEmitter();
  bus.setMaxListeners(1000);
  return bus;
}
