/**
 * Definições das conquistas. A lógica de desbloqueio (com dados persistidos) fica no backend;
 * aqui ficam os textos, ícones e o cálculo de progresso, usados também pela interface.
 */
import { DEFAULT_ACHIEVEMENT_SETTINGS } from './constants.js';

const DAY = 86400;

export const ACHIEVEMENTS = Object.freeze([
  {
    key: 'first_harvest', scope: 'machine', icon: 'seed',
    title: 'Primeira Colheita',
    description: () => 'Receber as primeiras métricas de uma fazenda.',
  },
  {
    key: 'dedicated_farmer', scope: 'machine', icon: 'hoe',
    title: 'Fazendeiro Dedicado',
    description: () => 'Acumular 30 dias de uptime na fazenda.',
    goal: () => 30 * DAY, progressOf: (s) => s.totalOnlineSec,
  },
  {
    key: 'farm_veteran', scope: 'machine', icon: 'medal',
    title: 'Veterano da Fazenda',
    description: () => 'Acumular 100 dias de uptime na fazenda.',
    goal: () => 100 * DAY, progressOf: (s) => s.totalOnlineSec,
  },
  {
    key: 'record_harvest', scope: 'machine', icon: 'pumpkin',
    title: 'Colheita Recorde',
    description: () => 'Fechar a semana com a menor média de uso de RAM já registrada.',
  },
  {
    key: 'organized_farm', scope: 'machine', icon: 'silo',
    title: 'Fazenda Organizada',
    description: (c) => `Manter todos os discos abaixo de ${c.diskLimit}% por ${c.diskDays} dias seguidos.`,
    goal: (c) => c.diskDays, progressOf: (s) => s.organizedDays || 0,
  },
  {
    key: 'quiet_day', scope: 'machine', icon: 'tea',
    title: 'Dia Tranquilo',
    description: (c) => `Manter a CPU abaixo de ${c.idleLoad}% por ${c.idleMinutes} minutos seguidos.`,
    goal: (c) => c.idleMinutes * 60, progressOf: (s, now) => (s.idleSince ? (now - s.idleSince) / 1000 : 0),
  },
  {
    key: 'tireless_machine', scope: 'machine', icon: 'gear',
    title: 'Máquina Incansável',
    description: (c) => `Ficar ${c.tirelessHours} horas ligada sem reiniciar.`,
    goal: (c) => c.tirelessHours * 3600, progressOf: (s) => s.uptimeSec || 0,
  },
  {
    key: 'festival_guest', scope: 'machine', icon: 'star',
    title: 'Convidado do Festival',
    description: () => 'Estar com a fazenda ativa durante um festival.',
  },
  {
    key: 'town_founder', scope: 'global', icon: 'house',
    title: 'Fundador de Pelican Town',
    description: () => 'Monitorar 3 ou mais fazendas.',
    goal: () => 3, progressOf: (s) => s.machineCount || 0,
  },
  {
    key: 'diary_writer', scope: 'global', icon: 'book',
    title: 'Escritor do Diário',
    description: () => 'Escrever 10 anotações no diário da fazenda.',
    goal: () => 10, progressOf: (s) => s.noteCount || 0,
  },
]);

export const ACHIEVEMENT_KEYS = ACHIEVEMENTS.map((a) => a.key);
export const achievementByKey = (key) => ACHIEVEMENTS.find((a) => a.key === key) || null;

/** Lista para a API: textos resolvidos + progresso (0..1) quando aplicável. */
export function describeAchievements(config = {}, stats = {}, now = Date.now()) {
  const c = { ...DEFAULT_ACHIEVEMENT_SETTINGS, ...config };
  return ACHIEVEMENTS.map((a) => {
    const goal = a.goal ? a.goal(c) : null;
    const value = a.progressOf ? a.progressOf(stats, now) : null;
    return {
      key: a.key,
      scope: a.scope,
      icon: a.icon,
      title: a.title,
      description: a.description(c),
      goal,
      value,
      progress: goal ? Math.max(0, Math.min(1, (value || 0) / goal)) : null,
    };
  });
}
