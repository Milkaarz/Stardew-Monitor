/**
 * Constantes compartilhadas entre backend, agente e frontend.
 * Tudo aqui é JavaScript puro (sem dependências), para rodar no Node e no navegador.
 */

/** Colunas numéricas guardadas no histórico (uma linha por amostra). */
export const METRIC_KEYS = Object.freeze([
  'cpu',        // uso de CPU (%)
  'ram',        // uso de RAM (%)
  'swap',       // uso de swap/arquivo de paginação (%)
  'gpu',        // uso da GPU mais ocupada (%)
  'vram',       // uso de VRAM (%)
  'cpu_temp',   // temperatura da CPU (°C)
  'gpu_temp',   // temperatura da GPU (°C)
  'disk',       // maior ocupação entre os discos (%)
  'disk_read',  // leitura em disco (bytes/s)
  'disk_write', // escrita em disco (bytes/s)
  'net_rx',     // download (bytes/s)
  'net_tx',     // upload (bytes/s)
  'battery',    // carga da bateria (%)
  'fan',        // maior rotação de ventoinha (RPM)
]);

export const ROLES = Object.freeze({ ADMIN: 'admin', VIEWER: 'viewer' });

export const MACHINE_STATUS = Object.freeze({
  OK: 'ok',           // verde
  WARN: 'warn',       // amarelo
  CRIT: 'crit',       // vermelho
  OFFLINE: 'offline', // cinza
});

export const LEVELS = Object.freeze(['ok', 'warn', 'crit']);
export const levelRank = (l) => (l === 'crit' ? 2 : l === 'warn' ? 1 : 0);
export const maxLevel = (...ls) => ls.reduce((a, b) => (levelRank(b) > levelRank(a) ? b : a), 'ok');

/** Categorias de alerta configuráveis individualmente. */
export const ALERT_CATEGORIES = Object.freeze(['cpu', 'ram', 'disk', 'temperature', 'gpu', 'battery', 'offline']);

/**
 * Limites padrão. `sustainSec` = quanto tempo a condição precisa durar antes de virar alerta
 * (evita alarmes por picos de um segundo).
 */
export const DEFAULT_THRESHOLDS = Object.freeze({
  cpu: { enabled: true, warn: 85, crit: 95, sustainSec: 60 },
  ram: { enabled: true, warn: 85, crit: 95, sustainSec: 60 },
  disk: { enabled: true, warn: 90, crit: 97, sustainSec: 0 },
  temperature: { enabled: true, warn: 80, crit: 90, sustainSec: 30 },
  gpu: { enabled: true, warn: 95, crit: 99, sustainSec: 300, tempWarn: 83, tempCrit: 90 },
  battery: { enabled: true, warn: 20, crit: 10, sustainSec: 0 },
  offline: { enabled: true, afterSec: 60 },
});

/** Faixas aceitas na configuração (respeitando limites térmicos reais). */
export const THRESHOLD_LIMITS = Object.freeze({
  percent: [1, 100],
  temperature: [40, 110],
  sustainSec: [0, 3600],
  offlineSec: [15, 86400],
});

export const DEFAULT_NOTIFICATION_SETTINGS = Object.freeze({
  cooldownMin: 30,          // intervalo mínimo entre alertas repetidos da mesma categoria/máquina
  notifyRecovery: true,     // avisar quando a situação normalizar
  notifyAchievements: true, // também enviar conquistas para os canais externos
  channels: {
    discord: { enabled: false, categories: [...ALERT_CATEGORIES] },
    telegram: { enabled: false, categories: [...ALERT_CATEGORIES] },
    email: { enabled: false, categories: ['disk', 'temperature', 'offline'] },
  },
});

/** Regras do clima reativo (podem ser ajustadas nas configurações). */
export const DEFAULT_WEATHER = Object.freeze({
  hotTemp: 70,       // °C da CPU: dia quente
  heatwaveTemp: 85,  // °C da CPU: onda de calor
  cloudyLoad: 50,    // % de CPU (média 1 min): nublado
  rainLoad: 70,      // % de CPU (média 1 min): chuva
  stormLoad: 85,     // % de CPU (média 5 min): tempestade
  idleLoad: 15,      // % de CPU (média 1 min): sistema ocioso, céu limpo
  windRpm: 1500,     // RPM da ventoinha que conta como "vento forte"
});

export const DEFAULT_ACHIEVEMENT_SETTINGS = Object.freeze({
  idleLoad: 10,       // Dia Tranquilo: CPU abaixo deste %
  idleMinutes: 60,    // ... por este tempo seguido
  tirelessHours: 72,  // Máquina Incansável: horas ligada sem reiniciar
  diskLimit: 80,      // Fazenda Organizada: todos os discos abaixo deste %
  diskDays: 7,        // ... por estes dias seguidos
});

export const DEFAULT_APPEARANCE = Object.freeze({
  seasonMode: 'south',        // 'north' | 'south' | 'farm' (calendário próprio de 28 dias)
  farmEpoch: null,            // data inicial do calendário próprio (ms); null = data de instalação
  festivalDecorations: true,  // mostrar decorações temporárias dos festivais
});

export const DEFAULT_RETENTION = Object.freeze({
  rawHours: 26,      // amostras brutas (alta resolução)
  minuteDays: 8,     // agregação por minuto
  hourDays: 400,     // agregação por hora
  notificationDays: 90,
  auditDays: 365,
});

/** Períodos do histórico e a fonte de dados de cada um. */
export const HISTORY_RANGES = Object.freeze({
  '15m': { ms: 15 * 60e3, source: 'raw', label: 'Últimos 15 minutos' },
  '1h': { ms: 60 * 60e3, source: 'raw', label: 'Última hora' },
  '6h': { ms: 6 * 3600e3, source: 'minute', label: 'Últimas 6 horas' },
  '24h': { ms: 24 * 3600e3, source: 'minute', label: 'Últimas 24 horas' },
  '7d': { ms: 7 * 86400e3, source: 'hour', label: 'Últimos 7 dias' },
  '30d': { ms: 30 * 86400e3, source: 'hour', label: 'Últimos 30 dias' },
});

export const RESOLUTIONS = Object.freeze({ minute: 60, hour: 3600 });

export const PROCESS_LIMITS = Object.freeze([10, 25, 50, 100]);

export const NOTE_CATEGORIES = Object.freeze([
  { key: 'hardware', label: 'Alteração de hardware', icon: '🔧' },
  { key: 'maintenance', label: 'Manutenção', icon: '🧹' },
  { key: 'problem', label: 'Problema', icon: '🐛' },
  { key: 'install', label: 'Instalação', icon: '📦' },
  { key: 'update', label: 'Atualização', icon: '⬆️' },
  { key: 'personal', label: 'Observação pessoal', icon: '📝' },
]);

export const THEMES = Object.freeze([
  { key: 'standard', label: 'Fazenda Padrão', description: 'Visual clássico do vale, com campos e colinas.' },
  { key: 'forest', label: 'Fazenda da Floresta', description: 'Vegetação abundante, árvores e folhas.' },
  { key: 'beach', label: 'Fazenda da Praia', description: 'Areia, mar e coqueiros.' },
  { key: 'hilltop', label: 'Fazenda da Colina', description: 'Montanhas, pedras e construções rústicas.' },
  { key: 'ginger', label: 'Fazenda de Gengibre', description: 'Clima tropical, cores quentes e vulcão ao fundo.' },
  { key: 'mines', label: 'Minas', description: 'Interface escura, pedras e cristais subterrâneos.' },
]);
export const THEME_KEYS = THEMES.map((t) => t.key);

export const SEASONS = Object.freeze(['spring', 'summer', 'fall', 'winter']);
export const SEASON_LABELS = Object.freeze({ spring: 'Primavera', summer: 'Verão', fall: 'Outono', winter: 'Inverno' });
