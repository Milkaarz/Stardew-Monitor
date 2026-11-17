/**
 * Motor de pixel art: sprites escritos como grades de caracteres viram <path> SVG
 * (um por cor, com as linhas horizontais mescladas). As cores podem ser variáveis CSS,
 * o que permite trocar a paleta conforme estação e tema sem redesenhar.
 */
const cache = new Map();

/** Converte a grade em { cor: pathData }. Exportado para testes. */
export function spriteToPaths(rows, palette) {
  const key = rows.join('\n') + JSON.stringify(palette);
  const hit = cache.get(key);
  if (hit) return hit;
  const byColor = {};
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      if (ch === '.' || ch === ' ' || !palette[ch]) {
        x++;
        continue;
      }
      let w = 1;
      while (row[x + w] === ch) w++;
      (byColor[palette[ch]] ||= []).push(`M${x} ${y}h${w}v1h-${w}z`);
      x += w;
    }
  });
  const out = Object.entries(byColor).map(([color, parts]) => [color, parts.join('')]);
  cache.set(key, out);
  return out;
}

export function Sprite({ rows, palette, x = 0, y = 0, scale = 1, flip = false, class: cls, title }) {
  const paths = spriteToPaths(rows, palette);
  const w = rows[0]?.length || 0;
  const transform = `translate(${x} ${y})${flip ? ` translate(${w * scale} 0) scale(${-scale} ${scale})` : ` scale(${scale})`}`;
  return (
    <g transform={transform} class={cls} shape-rendering="crispEdges">
      {title && <title>{title}</title>}
      {paths.map(([color, d]) => (
        <path key={color} d={d} style={{ fill: color }} />
      ))}
    </g>
  );
}

/** Retângulo pixelado com cor por variável CSS. */
export const R = ({ x, y, w, h, c, class: cls, opacity }) => (
  <rect x={x} y={y} width={w} height={h} style={{ fill: c, opacity }} class={cls} />
);
