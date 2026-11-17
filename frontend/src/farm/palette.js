/**
 * Paleta da cena: combina tema da fazenda + estação + fase do dia.
 * Devolve variáveis CSS aplicadas no <svg> da fazenda.
 */

export const SKY = {
  dawn: ['#3b4a8a', '#a86aa0', '#f2a07a', '#ffd6a0'],
  morning: ['#4fa3e0', '#6dbbe8', '#8fd0f0', '#bfe6ff'],
  afternoon: ['#3f95d8', '#5fb0e0', '#7cc4ec', '#a8dcf5'],
  sunset: ['#2a2f6b', '#8a3f7a', '#e8743a', '#ffb35a'],
  night: ['#070b24', '#0e1638', '#18224f', '#243063'],
};

const CAVE = ['#0b0a12', '#141220', '#1d1a2b', '#262238'];

const SEASON = {
  spring: { grass: '#5cbf4a', grassDark: '#3f9a3a', grassLight: '#8be36a', leaf: '#3fae49', leafDark: '#2e7d3a', leafLight: '#7fd66a', accent: '#ff7ab0', accent2: '#fff3f8', crop: '#f5f5f5' },
  summer: { grass: '#4caf50', grassDark: '#2e8a3a', grassLight: '#7ad35a', leaf: '#2e9a3a', leafDark: '#1f6b2a', leafLight: '#5fc25f', accent: '#ffd23f', accent2: '#ff7a3a', crop: '#d9381e' },
  fall: { grass: '#a8a040', grassDark: '#7a7a2a', grassLight: '#c9b85a', leaf: '#e8861a', leafDark: '#b35a10', leafLight: '#f5b042', accent: '#d9381e', accent2: '#ffd23f', crop: '#e8861a' },
  winter: { grass: '#e8f0f5', grassDark: '#b8c8d8', grassLight: '#ffffff', leaf: '#dfe9ef', leafDark: '#9fb3c4', leafLight: '#ffffff', accent: '#7ad6ff', accent2: '#c46ad9', crop: '#9b6ad9' },
};

const BASE = {
  trunk: '#6b4a2a',
  trunkDark: '#4a2f18',
  soil: '#8a5a2a',
  soilDark: '#5e3a18',
  soilWet: '#6b4220',
  water: '#3a8fd8',
  waterLight: '#8fd0f0',
  path: '#c9a36a',
  pathDark: '#a8824a',
  far: '#6a9cc2',
  far2: '#4f86ab',
  farSnow: '#eaf5ff',
  sand: '#e9d394',
  sandDark: '#cdb06a',
  stone: '#8f8f9a',
  stoneDark: '#5d5d68',
  crystal: '#7df9ff',
  crystal2: '#c46ad9',
  roof: '#b3402a',
  roofLight: '#c9503a',
  roofDark: '#7a2a1a',
  wall: '#c89a5a',
  wallLight: '#d8aa68',
  wallDark: '#a87a3a',
  barn: '#b33a2a',
  barnDark: '#7a2418',
  fence: '#8a5a2a',
  fenceLight: '#b8691c',
};

const THEME = {
  standard: {},
  forest: { far: '#1f5a2a', far2: '#174a22', grassShift: -0.12, leafShift: -0.1 },
  beach: { far: '#2f8fb8', far2: '#1f6f98', farSnow: '#bfe6ff', path: '#e9d394', pathDark: '#cdb06a', water: '#2f8fb8' },
  hilltop: { far: '#7a8a9a', far2: '#5f6f80', path: '#a89a8a', pathDark: '#8a7c6c', grassShift: -0.05 },
  ginger: { far: '#7a3a2a', far2: '#5a2418', farSnow: '#ff7a3a', grassShift: 0.05, accentOverride: '#ff5a3a', water: '#1fa8a8' },
  mines: {
    far: '#2a2638', far2: '#1d1a2b', farSnow: '#7df9ff', path: '#4a4458', pathDark: '#3a3548', soil: '#3a3040', soilDark: '#2a2230',
    water: '#1d4a6b', waterLight: '#3fc6d0', wall: '#6b6461', wallLight: '#8f8580', wallDark: '#4a4644',
  },
};

/** Escurece/clareia uma cor hex (fator -1..1). */
export function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v) => Math.max(0, Math.min(255, Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f)));
  const r = ch(n >> 16), g = ch((n >> 8) & 255), b = ch(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

export function scenePalette({ theme = 'standard', season = 'spring', phase = 'morning' } = {}) {
  const t = THEME[theme] || THEME.standard;
  const s = { ...SEASON[season] || SEASON.spring };
  if (theme === 'mines') {
    Object.assign(s, { grass: '#3a3548', grassDark: '#2a2638', grassLight: '#4a4458', leaf: '#7df9ff', leafDark: '#3fc6d0', leafLight: '#c4fdff' });
  } else if (theme === 'ginger' && season === 'winter') {
    Object.assign(s, SEASON.summer); // ilha tropical: sem neve
  }
  if (t.grassShift) {
    s.grass = shade(s.grass, t.grassShift);
    s.grassDark = shade(s.grassDark, t.grassShift);
  }
  if (t.leafShift) {
    s.leaf = shade(s.leaf, t.leafShift);
    s.leafDark = shade(s.leafDark, t.leafShift);
  }
  if (t.accentOverride) s.accent = t.accentOverride;
  const sky = theme === 'mines' ? CAVE : SKY[phase] || SKY.morning;
  const p = { ...BASE, ...t, ...s };
  delete p.grassShift;
  delete p.leafShift;
  delete p.accentOverride;
  const vars = {};
  sky.forEach((c, i) => {
    vars[`--sky${i + 1}`] = c;
  });
  for (const [k, v] of Object.entries(p)) vars[`--${k}`] = v;
  return vars;
}

/** Variáveis -> nome de cor usado nos sprites. */
export const v = (name) => `var(--${name})`;
