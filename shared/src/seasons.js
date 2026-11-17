/**
 * Estações, ciclo dia/noite e festivais.
 * Todas as funções recebem a data explicitamente (fáceis de testar) e usam o horário LOCAL.
 */
import { SEASONS, SEASON_LABELS } from './constants.js';

const DAY = 86400e3;
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const daysBetween = (a, b) => Math.round((startOfDay(b) - startOfDay(a)) / DAY);

/** Início aproximado de cada estação astronômica no hemisfério norte: [mês(0-11), dia]. */
const NORTH_STARTS = { spring: [2, 20], summer: [5, 21], fall: [8, 22], winter: [11, 21] };
const SOUTH_OF = { spring: 'fall', summer: 'winter', fall: 'spring', winter: 'summer' };

function realSeason(date, hemisphere) {
  const y = date.getFullYear();
  // candidatos: início de cada estação neste ano e no anterior; pega o mais recente <= data
  let best = null;
  for (const yy of [y - 1, y]) {
    for (const s of SEASONS) {
      const [m, d] = NORTH_STARTS[s];
      const start = new Date(yy, m, d);
      if (start <= date && (!best || start > best.start)) best = { season: s, start };
    }
  }
  const season = hemisphere === 'south' ? SOUTH_OF[best.season] : best.season;
  return { season, day: daysBetween(best.start, date) + 1, year: y };
}

/**
 * @param {Date} date
 * @param {{ mode?: 'north'|'south'|'farm', farmEpoch?: number }} opts
 * @returns {{ season, label, day, year, mode }}
 */
export function getSeason(date = new Date(), { mode = 'south', farmEpoch = null } = {}) {
  let r;
  if (mode === 'farm') {
    const epoch = new Date(farmEpoch ?? date.getTime());
    const idx = Math.max(0, daysBetween(epoch, date));
    r = { season: SEASONS[Math.floor(idx / 28) % 4], day: (idx % 28) + 1, year: Math.floor(idx / 112) + 1 };
  } else {
    r = realSeason(date, mode === 'north' ? 'north' : 'south');
  }
  return { ...r, label: SEASON_LABELS[r.season], mode };
}

/** Fases do dia: dawn (amanhecer), morning, afternoon, sunset (pôr do sol), night. */
export function getDayPhase(date = new Date()) {
  const h = date.getHours() + date.getMinutes() / 60;
  let phase;
  if (h >= 5 && h < 7) phase = 'dawn';
  else if (h >= 7 && h < 12) phase = 'morning';
  else if (h >= 12 && h < 17) phase = 'afternoon';
  else if (h >= 17 && h < 19.5) phase = 'sunset';
  else phase = 'night';
  // posição do sol (0 = nascente, 1 = poente) entre 5h e 19h30; da lua entre 19h30 e 5h
  const sun = Math.min(1, Math.max(0, (h - 5) / 14.5));
  const nightH = h >= 19.5 ? h - 19.5 : h + 4.5;
  const moon = Math.min(1, Math.max(0, nightH / 9.5));
  return { phase, hour: h, sun, moon, isNight: phase === 'night' };
}

export const PHASE_LABELS = Object.freeze({
  dawn: 'Amanhecer', morning: 'Manhã', afternoon: 'Tarde', sunset: 'Pôr do sol', night: 'Noite',
});

/** Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher). */
export function easterDate(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

/**
 * Festivais padrão. Tipos de regra:
 *  - season: { season, from, to }   dias da estação (funciona no calendário real e no próprio)
 *  - date:   { from: 'MM-DD', to: 'MM-DD' } datas fixas (pode virar o ano)
 *  - easter: { from, to }           dias relativos ao domingo de Páscoa
 */
export const DEFAULT_FESTIVALS = Object.freeze([
  { key: 'egg', name: 'Festival do Ovo', rule: { kind: 'easter', from: -3, to: 1 }, decoration: 'eggs', enabled: true,
    message: 'Festival do Ovo! Há ovos coloridos escondidos pela fazenda.' },
  { key: 'flower', name: 'Dança das Flores', rule: { kind: 'season', season: 'spring', from: 20, to: 24 }, decoration: 'flowers', enabled: true,
    message: 'Dança das Flores! A fazenda está enfeitada com guirlandas.' },
  { key: 'luau', name: 'Luau de Verão', rule: { kind: 'season', season: 'summer', from: 9, to: 11 }, decoration: 'lanterns', enabled: true,
    message: 'Luau de Verão! Lanternas acesas e sopa no caldeirão.' },
  { key: 'spirits', name: 'Noite dos Espíritos', rule: { kind: 'date', from: '10-29', to: '10-31' }, decoration: 'pumpkins', enabled: true,
    message: 'Noite dos Espíritos! Cuidado com as abóboras que brilham no escuro.' },
  { key: 'ice', name: 'Festival da Lua Gelada', rule: { kind: 'season', season: 'winter', from: 6, to: 8 }, decoration: 'ice', enabled: true,
    message: 'Festival da Lua Gelada! Esculturas de gelo enfeitam a fazenda.' },
  { key: 'stars', name: 'Festival das Estrelas', rule: { kind: 'date', from: '12-20', to: '12-26' }, decoration: 'stars', enabled: true,
    message: 'Festival das Estrelas! Troque presentes com os moradores.' },
]);

const mmdd = (d) => (d.getMonth() + 1) * 100 + d.getDate();
const parseMmdd = (s) => {
  const [m, d] = String(s).split('-').map(Number);
  return m * 100 + d;
};

export function festivalMatches(festival, date, seasonInfo) {
  const r = festival?.rule;
  if (!r || festival.enabled === false) return false;
  if (r.kind === 'season') return seasonInfo.season === r.season && seasonInfo.day >= r.from && seasonInfo.day <= r.to;
  if (r.kind === 'date') {
    const v = mmdd(date), a = parseMmdd(r.from), b = parseMmdd(r.to);
    return a <= b ? v >= a && v <= b : v >= a || v <= b; // intervalo que atravessa o ano
  }
  if (r.kind === 'easter') {
    const diff = daysBetween(easterDate(date.getFullYear()), date);
    return diff >= r.from && diff <= r.to;
  }
  return false;
}

export function activeFestival(date = new Date(), { festivals = DEFAULT_FESTIVALS, mode = 'south', farmEpoch = null } = {}) {
  const s = getSeason(date, { mode, farmEpoch });
  return festivals.find((f) => festivalMatches(f, date, s)) || null;
}
