// Sistema de alertas: limites, sustentação, cooldown, agravamento e recuperação.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AlertTracker, evaluateSnapshot, levelAbove, levelBelow, alertTitle, mergeThresholds } from '@stardew-monitor/shared';
import { snapshot } from '../helpers/fixtures.js';

const r = (level, extra = {}) => ({ key: 'cpu', category: 'cpu', value: 0, level, sustainSec: 0, detail: '', ...extra });

test('níveis acima/abaixo do limite', () => {
  assert.equal(levelAbove(50, 80, 90), 'ok');
  assert.equal(levelAbove(85, 80, 90), 'warn');
  assert.equal(levelAbove(90, 80, 90), 'crit');
  assert.equal(levelAbove(null, 80, 90), 'ok');
  assert.equal(levelBelow(15, 20, 10), 'warn');
  assert.equal(levelBelow(5, 20, 10), 'crit');
});

test('avalia cada categoria com os limites individuais', () => {
  const readings = evaluateSnapshot(snapshot({ cpu: 99, ram: 10, disks: [91, 20], temp: 85 }));
  const by = Object.fromEntries(readings.map((x) => [x.key, x.level]));
  assert.equal(by.cpu, 'crit');
  assert.equal(by.ram, 'ok');
  assert.equal(by['disk:/'], 'warn');
  assert.equal(by['disk:/d1'], 'ok');
  assert.equal(by.temperature, 'warn');
  // categoria desativada não gera leitura
  const off = evaluateSnapshot(snapshot({ cpu: 99 }), mergeThresholds({ cpu: { enabled: false } }));
  assert.ok(!off.some((x) => x.key === 'cpu'));
});

test('sensor ausente não gera alerta (temperatura null)', () => {
  assert.ok(!evaluateSnapshot(snapshot({ temp: null })).some((x) => x.category === 'temperature'));
});

test('sustentação: só alerta depois do tempo configurado', () => {
  const t = new AlertTracker({ cooldownMs: 0 });
  assert.deepEqual(t.update([r('crit', { sustainSec: 60 })], 0), []);
  assert.deepEqual(t.update([r('crit', { sustainSec: 60 })], 30e3), []);
  const ev = t.update([r('crit', { sustainSec: 60 })], 61e3);
  assert.equal(ev.length, 1);
  assert.equal(ev[0].type, 'alert');
  // pico que some antes do tempo não alerta
  const t2 = new AlertTracker();
  t2.update([r('crit', { sustainSec: 60 })], 0);
  t2.update([r('ok', { sustainSec: 60 })], 10e3);
  assert.deepEqual(t2.update([r('ok', { sustainSec: 60 })], 100e3), []);
});

test('não repete o mesmo alerta enquanto a situação continua', () => {
  const t = new AlertTracker({ cooldownMs: 30 * 60e3 });
  assert.equal(t.update([r('warn')], 0).length, 1);
  for (let i = 1; i < 50; i++) assert.equal(t.update([r('warn')], i * 10e3).length, 0);
});

test('agravamento (aviso -> crítico) é avisado mesmo dentro do cooldown', () => {
  const t = new AlertTracker({ cooldownMs: 30 * 60e3 });
  t.update([r('warn')], 0);
  const ev = t.update([r('crit')], 1000);
  assert.equal(ev.length, 1);
  assert.equal(ev[0].level, 'crit');
});

test('recuperação é avisada e o cooldown impede alertas em sequência (oscilação)', () => {
  const t = new AlertTracker({ cooldownMs: 10 * 60e3, notifyRecovery: true });
  assert.equal(t.update([r('warn')], 0)[0].type, 'alert');
  assert.equal(t.update([r('ok')], 60e3)[0].type, 'recovery');
  assert.equal(t.update([r('warn')], 120e3).length, 0, 'dentro do intervalo mínimo');
  assert.equal(t.update([r('warn')], 11 * 60e3).length, 1, 'depois do intervalo mínimo');
});

test('recuperação pode ser desativada', () => {
  const t = new AlertTracker({ cooldownMs: 0, notifyRecovery: false });
  t.update([r('warn')], 0);
  assert.deepEqual(t.update([r('ok')], 1), []);
  assert.equal(t.confirmedLevel(), 'ok');
});

test('mensagens temáticas', () => {
  assert.equal(alertTitle('disk', 'warn'), 'O silo está quase cheio!');
  assert.equal(alertTitle('temperature', 'warn'), 'A casa está ficando muito quente!');
  assert.equal(alertTitle('cpu', 'warn'), 'A fazenda está consumindo muita energia!');
  assert.match(alertTitle('offline', 'crit'), /Tem algo estranho acontecendo na fazenda/);
});
