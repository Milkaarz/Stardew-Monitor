/**
 * Mensagens do cartão de status, escolhidas conforme a condição atual da máquina.
 * O `MessagePicker` evita repetir a mesma frase e só troca de frase após um intervalo
 * (ou imediatamente quando a condição muda).
 */

export const MESSAGE_POOLS = Object.freeze({
  offline: [
    'A fazenda está silenciosa demais... sem sinal da máquina.',
    'Ninguém responde no portão da fazenda.',
    'O carteiro voltou sem notícias desta fazenda.',
  ],
  disk_crit: ['O silo está transbordando!', 'Não cabe mais nem um grão no silo!'],
  disk_warn: ['O silo está quase cheio!', 'Hora de organizar o celeiro: o espaço está acabando.'],
  temp_crit: ['A casa está fervendo! Abra as janelas!', 'Está quente demais para trabalhar na roça!'],
  temp_warn: ['Está ficando quente por aqui!', 'A casa precisa de um ventinho.'],
  cpu_crit: ['A casa precisa descansar um pouco.', 'O fazendeiro está exausto de tanto trabalho!'],
  cpu_warn: ['Está ficando quente por aqui!', 'Muito trabalho na fazenda hoje.', 'A chaminé não para de soltar fumaça.'],
  ram_crit: ['As plantações tomaram conta da fazenda!', 'Não há mais canteiros livres!'],
  ram_warn: ['As plantações estão ocupando muito espaço!', 'A horta está ficando lotada.'],
  gpu_crit: ['O moinho está prestes a quebrar!'],
  gpu_warn: ['O moinho está girando sem parar!'],
  battery_crit: ['O fazendeiro vai desmaiar! Conecte o carregador.'],
  battery_warn: ['A estamina está acabando. Que tal um lanche (ou uma tomada)?'],
  storm: ['Uma tempestade se aproxima: a máquina trabalha pesado há minutos.'],
  festival: [], // preenchido com a mensagem do festival ativo
  night: ['A fazenda dorme sob as estrelas.', 'Noite tranquila no vale.', 'Os grilos cantam lá fora.'],
  idle: ['Um dia preguiçoso na fazenda.', 'As vacas estão descansando à sombra.', 'Nada para fazer... perfeito para pescar.'],
  normal: [
    'Um belo dia para cuidar da fazenda!',
    'Tudo tranquilo por aqui.',
    'Os moradores estão felizes!',
    'As galinhas estão contentes.',
    'A colheita promete este ano.',
  ],
});

/**
 * Decide qual "condição" a mensagem deve refletir.
 * @param {object} farm resultado de computeFarmState
 * @param {{ isNight?: boolean, festival?: object }} ctx
 */
export function messageCondition(farm, ctx = {}) {
  if (!farm || farm.overall === 'offline' || farm.online === false) return 'offline';
  const order = [
    ['disk', farm.levels?.disk],
    ['temp', farm.house?.hot ? (farm.house.level === 'crit' ? 'crit' : 'warn') : 'ok'],
    ['cpu', farm.house?.level],
    ['ram', farm.levels?.ram],
    ['gpu', farm.levels?.gpu],
    ['battery', farm.levels?.battery],
  ];
  for (const sev of ['crit', 'warn']) {
    for (const [k, l] of order) if (l === sev) return `${k}_${sev}`;
  }
  if (farm.weather?.kind === 'storm') return 'storm';
  if (ctx.festival) return 'festival';
  if (ctx.isNight) return 'night';
  if (farm.animals?.cows === 'resting') return 'idle';
  return 'normal';
}

export class MessagePicker {
  /**
   * @param {{ rotateMs?: number, random?: () => number }} opts
   */
  constructor({ rotateMs = 45e3, random = Math.random } = {}) {
    this.rotateMs = rotateMs;
    this.random = random;
    this.current = null;
    this.condition = null;
    this.since = 0;
    this.recent = [];
  }

  pick(condition, now = Date.now(), extra = []) {
    const pool = [...(MESSAGE_POOLS[condition] || []), ...extra].filter(Boolean);
    const list = pool.length ? pool : MESSAGE_POOLS.normal;
    const expired = now - this.since >= this.rotateMs;
    if (condition === this.condition && this.current && list.includes(this.current) && !expired) return this.current;

    // evita as últimas frases usadas (quando o conjunto permite)
    const fresh = list.filter((m) => !this.recent.includes(m) && m !== this.current);
    const options = fresh.length ? fresh : list.filter((m) => m !== this.current);
    const choice = (options.length ? options : list)[Math.floor(this.random() * (options.length || list.length))];
    this.current = choice;
    this.condition = condition;
    this.since = now;
    this.recent = [choice, ...this.recent.filter((m) => m !== choice)].slice(0, 3);
    return choice;
  }
}
