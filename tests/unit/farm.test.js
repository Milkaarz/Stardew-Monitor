// Conversão das métricas em indicadores visuais da fazenda.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeFarmState, cropsFromRam, smokeFromCpu, cartSpeed, millSpeed, windFromFans, computeWeather, CROP_PLOTS,
} from '@stardew-monitor/shared';
import { snapshot } from '../helpers/fixtures.js';

test('plantação: canteiros proporcionais à RAM e murcha no crítico', () => {
  assert.equal(cropsFromRam(0).full, 0);
  assert.equal(cropsFromRam(50).full, CROP_PLOTS / 2);
  assert.equal(cropsFromRam(100).full, CROP_PLOTS);
  assert.equal(cropsFromRam(50).level, 'ok');
  assert.equal(cropsFromRam(90).level, 'warn');
  const crit = cropsFromRam(97);
  assert.equal(crit.level, 'crit');
  assert.equal(crit.wilting, true);
  assert.equal(cropsFromRam(-5).pct, 0);
  assert.equal(cropsFromRam(250).pct, 100);
});

test('fumaça da chaminé cresce com a CPU', () => {
  assert.deepEqual([5, 30, 60, 90].map(smokeFromCpu), [0, 1, 2, 3]);
});

test('carroça acelera com o tráfego de rede', () => {
  assert.equal(cartSpeed(0, 0), 0);
  assert.equal(cartSpeed(100 * 1024, 0), 1);
  assert.equal(cartSpeed(2 * 1024 ** 2, 0), 2);
  assert.equal(cartSpeed(10 * 1024 ** 2, 1), 3);
});

test('moinho: velocidade pela GPU e parado sem telemetria', () => {
  assert.equal(millSpeed(null), 0);
  assert.equal(millSpeed(2), 0);
  assert.equal(millSpeed(20), 1);
  assert.equal(millSpeed(50), 2);
  assert.equal(millSpeed(99), 3);
});

test('vento: ventoinhas desconhecidas não inventam vento', () => {
  assert.deepEqual(windFromFans(null, null), { level: 0, known: false });
  assert.equal(windFromFans(1600, null).level, 3);
  assert.equal(windFromFans(null, 35).known, true);
});

test('clima: tempestade com uso alto prolongado tem prioridade', () => {
  assert.equal(computeWeather({ cpuAvg1m: 5 }).kind, 'sunny');
  assert.equal(computeWeather({ cpuAvg1m: 55 }).kind, 'cloudy');
  assert.equal(computeWeather({ cpuAvg1m: 75 }).kind, 'rain');
  assert.equal(computeWeather({ cpuTemp: 75, cpuAvg1m: 10 }).kind, 'hot');
  assert.equal(computeWeather({ cpuTemp: 95, cpuAvg1m: 10 }).kind, 'heatwave');
  assert.equal(computeWeather({ cpuTemp: 95, cpuAvg1m: 99, cpuAvg5m: 90 }).kind, 'storm');
  // limites configuráveis
  assert.equal(computeWeather({ cpuTemp: 65 }, { hotTemp: 60, heatwaveTemp: 90 }).kind, 'hot');
});

test('estado completo da fazenda a partir de um snapshot real', () => {
  const s = computeFarmState(snapshot({ cpu: 20, ram: 40, disks: [50, 98], ioMB: 8 }), { derived: { cpuAvg1m: 10 } });
  assert.equal(s.online, true);
  assert.equal(s.silos.length, 2);
  assert.equal(s.silos[1].level, 'crit');
  assert.equal(s.silos[1].message, 'O silo está transbordando!');
  assert.equal(s.overall, 'crit');
  assert.equal(s.animals.chickens, 'scared');
  assert.equal(s.animals.cows, 'resting');
  assert.equal(s.animals.pigs, 'digging');
  assert.equal(s.animals.ducks, 'hiding');
  assert.equal(s.mill.available, true);
  assert.equal(s.stamina, null, 'sem bateria: estamina oculta');
});

test('fazenda tranquila: galinhas felizes e patos no lago', () => {
  const s = computeFarmState(snapshot({ cpu: 30, ram: 40, disks: [40] }), { derived: { cpuAvg1m: 30 } });
  assert.equal(s.overall, 'ok');
  assert.equal(s.animals.chickens, 'happy');
  assert.equal(s.animals.ducks, 'pond');
  assert.equal(s.animals.cows, 'grazing');
});

test('bateria vira estamina e alerta só descarregando', () => {
  const low = computeFarmState(snapshot({ battery: { pct: 8, charging: false, acConnected: false } }));
  assert.equal(low.stamina.state, 'discharging');
  assert.equal(low.stamina.level, 'crit');
  const charging = computeFarmState(snapshot({ battery: { pct: 8, charging: true, acConnected: true } }));
  assert.equal(charging.stamina.level, 'ok');
});

test('sem snapshot = fazenda offline e vazia', () => {
  assert.deepEqual(computeFarmState(null), { online: false, overall: 'offline', empty: true });
  assert.equal(computeFarmState(snapshot({}), { online: false }).overall, 'offline');
});
