/** Formatadores usados na interface e nas mensagens de alerta. */

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

export function formatBytes(n, digits = 1) {
  if (n == null || !Number.isFinite(+n)) return '—';
  let v = Math.max(0, +n);
  let i = 0;
  while (v >= 1024 && i < UNITS.length - 1) { v /= 1024; i++; }
  return `${i === 0 ? Math.round(v) : v.toFixed(digits)} ${UNITS[i]}`;
}

export const formatRate = (n) => (n == null ? '—' : `${formatBytes(n)}/s`);

export function formatPercent(v, digits = 0) {
  if (v == null || !Number.isFinite(+v)) return '—';
  return `${(+v).toFixed(digits)}%`;
}

export function formatTemp(v) {
  if (v == null || !Number.isFinite(+v)) return 'indisponível';
  return `${Math.round(+v)} °C`;
}

/** Converte segundos em { days, hours, minutes, seconds }. */
export function splitDuration(sec) {
  const s = Math.max(0, Math.floor(+sec || 0));
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  };
}

export function formatDuration(sec, { seconds = false } = {}) {
  const d = splitDuration(sec);
  const parts = [];
  if (d.days) parts.push(`${d.days}d`);
  if (d.days || d.hours) parts.push(`${d.hours}h`);
  parts.push(`${d.minutes}min`);
  if (seconds) parts.push(`${d.seconds}s`);
  return parts.join(' ');
}

export function formatUptimeLong(sec) {
  const d = splitDuration(sec);
  const p = (n, s, pl) => `${n} ${n === 1 ? s : pl}`;
  return `${p(d.days, 'dia', 'dias')}, ${p(d.hours, 'hora', 'horas')} e ${p(d.minutes, 'minuto', 'minutos')}`;
}

export function clampPct(v) {
  const n = +v;
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

export const round1 = (v) => (v == null || !Number.isFinite(+v) ? null : Math.round(+v * 10) / 10);
