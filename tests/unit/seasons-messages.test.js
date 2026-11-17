// Estações, ciclo dia/noite, festivais, mensagens do cartão de status e formatação.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getSeason, getDayPhase, easterDate, activeFestival, DEFAULT_FESTIVALS, MessagePicker, messageCondition, MESSAGE_POOLS,
  computeFarmState, formatBytes, formatDuration, splitDuration, formatUptimeLong, describeAchievements,
} from '@stardew-monitor/shared';
import { snapshot } from '../helpers/fixtures.js';

test('estações reais nos dois hemisférios', () => {
  const jan = new Date(2026, 0, 15);
  assert.equal(getSeason(jan, { mode: 'north' }).season, 'winter');
  assert.equal(getSeason(jan, { mode: 'south' }).season, 'summer');
  assert.equal(getSeason(new Date(2026, 6, 1), { mode: 'south' }).season, 'winter');
  assert.equal(getSeason(new Date(2026, 9, 1), { mode: 'north' }).season, 'fall');
  assert.equal(getSeason(new Date(2026, 2, 20), { mode: 'north' }).day, 1);
});

test('calendário próprio: 28 dias por estação', () => {
  const epoch = new Date(2026, 0, 1).getTime();
  assert.deepEqual(
    (({ season, day, year }) => ({ season, day, year }))(getSeason(new Date(2026, 0, 1), { mode: 'farm', farmEpoch: epoch })),
    { season: 'spring', day: 1, year: 1 },
  );
  assert.equal(getSeason(new Date(2026, 0, 29), { mode: 'farm', farmEpoch: epoch }).season, 'summer');
  assert.equal(getSeason(new Date(2026, 3, 23), { mode: 'farm', farmEpoch: epoch }).year, 2);
});

test('ciclo dia e noite pelo horário local', () => {
  const at = (h, m = 0) => getDayPhase(new Date(2026, 5, 1, h, m)).phase;
  assert.equal(at(6), 'dawn');
  assert.equal(at(9), 'morning');
  assert.equal(at(14), 'afternoon');
  assert.equal(at(18), 'sunset');
  assert.equal(at(23), 'night');
  assert.equal(at(3), 'night');
});

test('Páscoa e festivais automáticos', () => {
  assert.deepEqual([easterDate(2025).getMonth(), easterDate(2025).getDate()], [3, 20]);
  assert.deepEqual([easterDate(2026).getMonth(), easterDate(2026).getDate()], [3, 5]);
  assert.equal(activeFestival(new Date(2026, 3, 5)).key, 'egg');
  assert.equal(activeFestival(new Date(2026, 11, 24)).key, 'stars');
  assert.equal(activeFestival(new Date(2026, 9, 31)).key, 'spirits');
  assert.equal(activeFestival(new Date(2026, 7, 3)), null);
  // desativar um festival funciona
  const off = DEFAULT_FESTIVALS.map((f) => (f.key === 'stars' ? { ...f, enabled: false } : f));
  assert.equal(activeFestival(new Date(2026, 11, 24), { festivals: off }), null);
  // festival por estação no calendário próprio
  const epoch = new Date(2026, 0, 1).getTime();
  assert.equal(activeFestival(new Date(2026, 0, 21), { mode: 'farm', farmEpoch: epoch }).key, 'flower');
});

test('mensagem contextual por condição e sem repetição imediata', () => {
  const crit = computeFarmState(snapshot({ disks: [99] }));
  assert.equal(messageCondition(crit), 'disk_crit');
  assert.equal(messageCondition(computeFarmState(snapshot({ cpu: 30 }), { derived: { cpuAvg1m: 30 } })), 'normal');
  assert.equal(messageCondition(null), 'offline');

  let i = 0;
  const seq = [0, 0.99, 0.5, 0.1, 0.7];
  const p = new MessagePicker({ rotateMs: 1000, random: () => seq[i++ % seq.length] });
  const first = p.pick('normal', 0);
  assert.equal(p.pick('normal', 500), first, 'mantém a frase dentro do intervalo');
  const second = p.pick('normal', 1500);
  assert.notEqual(second, first, 'troca sem repetir');
  assert.ok(MESSAGE_POOLS.normal.includes(second));
  assert.ok(MESSAGE_POOLS.disk_crit.includes(p.pick('disk_crit', 1600)), 'condição nova troca na hora');
});

test('formatação de bytes e duração', () => {
  assert.equal(formatBytes(0), '0 B');
  assert.equal(formatBytes(1536), '1.5 KB');
  assert.equal(formatBytes(null), '—');
  assert.deepEqual(splitDuration(90061), { days: 1, hours: 1, minutes: 1, seconds: 1 });
  assert.equal(formatDuration(3700), '1h 1min');
  assert.equal(formatUptimeLong(86400 + 60), '1 dia, 0 horas e 1 minuto');
});

test('progresso das conquistas', () => {
  const list = describeAchievements({}, { totalOnlineSec: 15 * 86400, uptimeSec: 36 * 3600 });
  const dedicated = list.find((a) => a.key === 'dedicated_farmer');
  assert.equal(dedicated.progress, 0.5);
  assert.equal(list.find((a) => a.key === 'tireless_machine').progress, 0.5);
  assert.match(list.find((a) => a.key === 'quiet_day').description, /10% por 60 minutos/);
});
