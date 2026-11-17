// Partes puras do frontend: paleta da cena (tema x estação x hora) e motor de sprites.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scenePalette, shade, SKY } from '../../frontend/src/farm/palette.js';
import { THEME_KEYS, SEASONS } from '@stardew-monitor/shared';

test('paleta: cada tema, estação e fase produz cores válidas', () => {
  for (const theme of THEME_KEYS) {
    for (const season of SEASONS) {
      for (const phase of Object.keys(SKY)) {
        const p = scenePalette({ theme, season, phase });
        for (const [k, v] of Object.entries(p)) assert.match(v, /^#[0-9a-f]{6}$/i, `${theme}/${season}/${phase} ${k}=${v}`);
      }
    }
  }
});

test('paleta: inverno deixa a grama clara; minas usa céu de caverna', () => {
  assert.equal(scenePalette({ season: 'winter' })['--grass'], '#e8f0f5');
  assert.equal(scenePalette({ theme: 'mines', phase: 'morning' })['--sky1'], '#0b0a12');
  assert.equal(scenePalette({ theme: 'ginger', season: 'winter' })['--grass'] !== '#e8f0f5', true, 'ilha tropical sem neve');
  assert.equal(scenePalette({ phase: 'night' })['--sky1'], SKY.night[0]);
});

test('shade escurece e clareia', () => {
  assert.equal(shade('#808080', -0.5), '#404040');
  assert.equal(shade('#000000', 1), '#ffffff');
});
