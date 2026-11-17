/**
 * Conversão das métricas reais em elementos da fazenda.
 * Função pura: recebe o snapshot + médias recentes + configurações e devolve o "estado visual".
 * A interface só desenha o que esta função decide — e os números reais continuam disponíveis.
 */
import { DEFAULT_THRESHOLDS, DEFAULT_WEATHER, maxLevel } from './constants.js';
import { levelAbove, levelBelow, mergeThresholds } from './alerts.js';
import { gpuSummary, maxFanRpm } from './snapshot.js';
import { splitDuration } from './format.js';

export const CROP_PLOTS = 24;

/** Plantação (RAM): quantos canteiros estão ocupados e em que estágio está o último. */
export function cropsFromRam(pct, t = DEFAULT_THRESHOLDS.ram) {
  const p = Math.max(0, Math.min(100, +pct || 0));
  const exact = (p / 100) * CROP_PLOTS;
  const full = Math.floor(exact);
  const partialStage = Math.round((exact - full) * 4); // 0..4
  const level = levelAbove(p, t.warn, t.crit);
  return {
    pct: p,
    plots: CROP_PLOTS,
    full,
    partialStage,
    stage: Math.min(4, Math.floor(p / 20)), // estágio geral (0 = sementes ... 4 = colheita)
    level,
    wilting: level === 'crit',
  };
}

/** Fumaça da chaminé (CPU): 0 a 3. */
export function smokeFromCpu(load) {
  const l = +load || 0;
  if (l < 15) return 0;
  if (l < 45) return 1;
  if (l < 75) return 2;
  return 3;
}

/** Velocidade da carroça (rede): 0 parada .. 3 correndo. Escala logarítmica de bytes/s. */
export function cartSpeed(rxSec, txSec) {
  const total = (+rxSec || 0) + (+txSec || 0);
  if (total < 10 * 1024) return 0;
  if (total < 512 * 1024) return 1;
  if (total < 5 * 1024 * 1024) return 2;
  return 3;
}

/** Velocidade das pás do moinho (GPU): 0..3. */
export function millSpeed(util) {
  if (util == null) return 0;
  const u = +util;
  if (u < 5) return 0;
  if (u < 35) return 1;
  if (u < 75) return 2;
  return 3;
}

/** Vento (ventoinhas): 0..3 a partir do maior RPM ou do % da ventoinha da GPU. */
export function windFromFans(rpm, gpuFanPct, windRpm = DEFAULT_WEATHER.windRpm) {
  let ratio = null;
  if (rpm != null) ratio = rpm / windRpm;
  if (gpuFanPct != null) ratio = Math.max(ratio ?? 0, gpuFanPct / 70);
  if (ratio == null) return { level: 0, known: false };
  return { level: ratio < 0.25 ? 0 : ratio < 0.6 ? 1 : ratio < 1 ? 2 : 3, known: true };
}

/**
 * Clima reativo.
 * Prioridade: tempestade (uso alto prolongado) > onda de calor > calor > chuva > nublado > sol.
 */
export function computeWeather({ cpuTemp = null, cpuAvg1m = null, cpuAvg5m = null }, rules = DEFAULT_WEATHER) {
  const w = { ...DEFAULT_WEATHER, ...rules };
  const reasons = [];
  let kind = 'sunny';
  if (cpuAvg5m != null && cpuAvg5m >= w.stormLoad) {
    kind = 'storm';
    reasons.push(`CPU média de ${Math.round(cpuAvg5m)}% nos últimos 5 minutos`);
  } else if (cpuTemp != null && cpuTemp >= w.heatwaveTemp) {
    kind = 'heatwave';
    reasons.push(`CPU a ${Math.round(cpuTemp)} °C`);
  } else if (cpuTemp != null && cpuTemp >= w.hotTemp) {
    kind = 'hot';
    reasons.push(`CPU a ${Math.round(cpuTemp)} °C`);
  } else if (cpuAvg1m != null && cpuAvg1m >= w.rainLoad) {
    kind = 'rain';
    reasons.push(`CPU média de ${Math.round(cpuAvg1m)}% no último minuto`);
  } else if (cpuAvg1m != null && cpuAvg1m >= w.cloudyLoad) {
    kind = 'cloudy';
    reasons.push(`CPU média de ${Math.round(cpuAvg1m)}% no último minuto`);
  } else {
    reasons.push(cpuAvg1m != null && cpuAvg1m < w.idleLoad ? 'Sistema ocioso' : 'Uso moderado');
  }
  return { kind, reasons };
}

export const WEATHER_LABELS = Object.freeze({
  sunny: 'Ensolarado', cloudy: 'Nublado', rain: 'Chuva', storm: 'Tempestade', hot: 'Dia quente', heatwave: 'Onda de calor',
});

/**
 * Estado completo da fazenda.
 * @param {object} snap snapshot da máquina (ou null)
 * @param {object} opts { thresholds, weather, derived: { cpuAvg1m, cpuAvg5m }, online, farmSeconds }
 */
export function computeFarmState(snap, opts = {}) {
  const t = mergeThresholds(opts.thresholds);
  const derived = opts.derived || {};
  const online = opts.online !== false && !!snap;

  if (!snap) {
    return { online: false, overall: 'offline', empty: true };
  }

  const cpuLoad = snap.cpu?.load ?? null;
  const cpuTemp = snap.cpu?.temp ?? null;
  const cpuAvg1m = derived.cpuAvg1m ?? cpuLoad;
  const cpuAvg5m = derived.cpuAvg5m ?? null;

  const cpuLevel = maxLevel(
    levelAbove(cpuLoad, t.cpu.warn, t.cpu.crit),
    levelAbove(cpuTemp, t.temperature.warn, t.temperature.crit),
  );
  const house = {
    load: cpuLoad,
    temp: cpuTemp,
    level: cpuLevel,
    smoke: smokeFromCpu(cpuLoad),
    hot: cpuTemp != null && cpuTemp >= t.temperature.warn,
    cores: snap.cpu?.physicalCores ?? null,
    threads: snap.cpu?.threads ?? null,
  };

  const crops = cropsFromRam(snap.mem?.pct, t.ram);

  const silos = (snap.disks || []).map((d) => {
    const level = levelAbove(d.pct, t.disk.warn, t.disk.crit);
    return {
      name: d.name || d.mount,
      fill: Math.max(0, Math.min(1, (+d.pct || 0) / 100)),
      pct: d.pct,
      level,
      message: level === 'crit' ? 'O silo está transbordando!' : level === 'warn' ? 'O silo está quase cheio!' : null,
    };
  });

  const net = snap.net;
  const cart = {
    speed: cartSpeed(net?.rxSec, net?.txSec),
    rxSec: net?.rxSec ?? null,
    txSec: net?.txSec ?? null,
    available: !!net,
    mail: (net?.txSec || 0) > 256 * 1024, // bandeira do correio levantada quando há envio forte
  };

  const gpu = gpuSummary(snap);
  const gpuLevel = gpu
    ? maxLevel(levelAbove(gpu.util, t.gpu.warn, t.gpu.crit), levelAbove(gpu.temp, t.gpu.tempWarn, t.gpu.tempCrit))
    : 'ok';
  const mill = {
    available: !!gpu,
    telemetry: !!gpu && (gpu.util != null || gpu.temp != null),
    speed: millSpeed(gpu?.util),
    level: gpuLevel,
    util: gpu?.util ?? null,
    temp: gpu?.temp ?? null,
  };

  const weather = computeWeather({ cpuTemp, cpuAvg1m, cpuAvg5m }, opts.weather);
  const wind = windFromFans(maxFanRpm(snap), gpu?.fanPct ?? null, { ...DEFAULT_WEATHER, ...opts.weather }.windRpm);

  const bat = snap.battery;
  const stamina = bat && bat.pct != null
    ? {
      pct: bat.pct,
      charging: !!bat.charging,
      acConnected: !!bat.acConnected,
      state: bat.charging ? 'charging' : bat.acConnected ? 'plugged' : 'discharging',
      level: !bat.charging && !bat.acConnected ? levelBelow(bat.pct, t.battery.warn, t.battery.crit) : 'ok',
      timeRemainingMin: bat.timeRemainingMin ?? null,
    }
    : null;

  const diskLevel = maxLevel(...silos.map((s) => s.level));
  const overall = online
    ? maxLevel(cpuLevel, crops.level, diskLevel, gpuLevel, stamina?.level || 'ok')
    : 'offline';

  const ioTotal = (snap.diskIO?.readSec || 0) + (snap.diskIO?.writeSec || 0);
  const idle = cpuAvg1m != null && cpuAvg1m < { ...DEFAULT_WEATHER, ...opts.weather }.idleLoad;
  const animals = {
    chickens: overall === 'ok' ? 'happy' : 'scared',
    cows: idle ? 'resting' : 'grazing',
    pigs: snap.diskIO ? (ioTotal > 5 * 1024 * 1024 ? 'digging' : 'sleeping') : 'sleeping',
    ducks: overall === 'ok' ? 'pond' : overall === 'warn' ? 'shore' : 'hiding',
  };

  return {
    online,
    overall,
    levels: { cpu: cpuLevel, ram: crops.level, disk: diskLevel, gpu: gpuLevel, battery: stamina?.level || 'ok' },
    house,
    crops,
    silos,
    cart,
    mill,
    weather: { ...weather, wind },
    animals,
    stamina,
    uptime: splitDuration(snap.uptimeSec),
    farmDays: opts.farmSeconds != null ? splitDuration(opts.farmSeconds) : null,
  };
}

/** Cor do estado da máquina no mapa de Pelican Town. */
export const STATUS_COLORS = Object.freeze({ ok: 'verde', warn: 'amarelo', crit: 'vermelho', offline: 'cinza' });
