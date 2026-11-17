#!/usr/bin/env node
/**
 * Gera app/icon.ico (ícone do executável) a partir do mesmo desenho em pixel art do logo:
 * a casinha da fazenda em 16x16, ampliada sem suavização para 16, 32, 48, 64, 128 e 256 px.
 * Sem dependências: escreve PNG (zlib) e empacota no formato ICO.
 *
 *   node scripts/make-icon.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// mesmos retângulos do logo (frontend/public/favicon.svg)
const RECTS = [
  [0, 0, 16, 16, '#7cc4ec'], [0, 11, 16, 5, '#4caf50'], [3, 6, 10, 6, '#c89a5a'], [2, 4, 12, 3, '#b3402a'],
  [4, 2, 8, 2, '#c9503a'], [7, 8, 2, 4, '#6b3a12'], [4, 7, 2, 2, '#ffe27a'], [10, 7, 2, 2, '#ffe27a'],
];
const hex = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16), 255];

const grid = Array.from({ length: 16 }, () => Array(16).fill([0, 0, 0, 0]));
for (const [x, y, w, h, c] of RECTS) {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) grid[j][i] = hex(c);
}

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return (buf) => {
    let c = 0xffffffff;
    for (const b of buf) c = t[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
})();

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(CRC(td));
  return Buffer.concat([len, td, crc]);
}

function png(size) {
  const scale = size / 16;
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filtro "none"
    for (let x = 0; x < size; x++) {
      const px = grid[Math.floor(y / scale)][Math.floor(x / scale)];
      raw.set(px, y * (size * 4 + 1) + 1 + x * 4);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bits por canal
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

export function makeIco(sizes = [16, 32, 48, 64, 128, 256]) {
  const images = sizes.map(png);
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // ícone
  header.writeUInt16LE(sizes.length, 4);
  let offset = 6 + 16 * sizes.length;
  const entries = sizes.map((s, i) => {
    const e = Buffer.alloc(16);
    e[0] = s >= 256 ? 0 : s;
    e[1] = s >= 256 ? 0 : s;
    e.writeUInt16LE(1, 4); // planos
    e.writeUInt16LE(32, 6); // bits por pixel
    e.writeUInt32LE(images[i].length, 8);
    e.writeUInt32LE(offset, 12);
    offset += images[i].length;
    return e;
  });
  return Buffer.concat([header, ...entries, ...images]);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const out = path.join(ROOT, 'app', 'icon.ico');
  fs.writeFileSync(out, makeIco());
  fs.writeFileSync(path.join(ROOT, 'app', 'icon-256.png'), png(256));
  console.log(`ícone gerado: ${path.relative(ROOT, out)}`);
}
