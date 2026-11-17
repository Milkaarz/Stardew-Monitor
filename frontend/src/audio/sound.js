/**
 * Efeitos sonoros e música em 8 bits, gerados no navegador (sem arquivos de áudio).
 * DESATIVADOS por padrão; o usuário liga nas preferências (salvas na conta).
 */
const prefs = { sound: false, music: false, alertSound: false };
let ctx = null;
let musicTimer = null;
let step = 0;
let next = 0;

export function setSoundPrefs(p = {}) {
  Object.assign(prefs, { sound: !!p.sound, music: !!p.music, alertSound: !!p.alertSound });
  if (prefs.music && prefs.sound) startMusic();
  else stopMusic();
}

function audio() {
  ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function note(freq, at, dur, type = 'square', vol = 0.05) {
  const a = audio();
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(vol, at);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g);
  g.connect(a.destination);
  o.start(at);
  o.stop(at + dur + 0.02);
}

function play(seq, { alert = false } = {}) {
  if (!prefs.sound && !(alert && prefs.alertSound)) return;
  try {
    const t = audio().currentTime;
    for (const [f, delay, dur, type, vol] of seq) note(f, t + delay, dur, type, vol);
  } catch {
    /* áudio bloqueado pelo navegador até a primeira interação */
  }
}

export const sfx = {
  click: () => play([[660, 0, 0.06], [990, 0.06, 0.08]]),
  ok: () => play([[523, 0, 0.08], [784, 0.09, 0.14]]),
  warn: (o) => play([[440, 0, 0.15, 'triangle', 0.08], [440, 0.2, 0.15, 'triangle', 0.08]], o),
  alert: (o) => play([[220, 0, 0.2, 'square', 0.06], [165, 0.24, 0.3, 'square', 0.06]], o),
  achievement: () => play([[523, 0, 0.1], [659, 0.1, 0.1], [784, 0.2, 0.1], [1047, 0.3, 0.3, 'triangle', 0.07]]),
  kick: () => play([[300, 0, 0.08, 'sawtooth', 0.05], [150, 0.08, 0.2, 'sawtooth', 0.05]]),
};

const SCALE = [261.63, 293.66, 329.63, 392, 440, 523.25];
const MELODY = [0, 2, 4, 2, 3, 1, 2, 0, 4, 5, 4, 3, 2, 3, 1, 0];

function startMusic() {
  if (musicTimer) return;
  try {
    const a = audio();
    next = a.currentTime + 0.1;
    musicTimer = setInterval(() => {
      while (next < a.currentTime + 0.3) {
        const n = MELODY[step % MELODY.length];
        note(SCALE[n], next, 0.26, 'square', 0.02);
        if (step % 4 === 0) note(SCALE[n] / 2, next, 0.55, 'triangle', 0.045);
        next += 0.28;
        step++;
      }
    }, 100);
  } catch {
    musicTimer = null;
  }
}

function stopMusic() {
  clearInterval(musicTimer);
  musicTimer = null;
}
