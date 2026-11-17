/**
 * Plantação = RAM. Cada canteiro representa ~4% da memória: quanto mais memória em uso,
 * mais canteiros crescidos. Perto do limite as plantas murcham (alerta visual).
 */
import { R } from './pixel.jsx';
import { v } from './palette.js';
import { AlertBubble, Sign } from './Buildings.jsx';

const COLS = 8;

function Crop({ stage, wilting, season }) {
  // estágios 0..4 desenhados com retângulos (6x10 px)
  const leaf = wilting ? '#9a7a3a' : v('leaf');
  const leafD = wilting ? '#7a5a2a' : v('leafDark');
  const fruit = wilting ? '#7a5a2a' : v('crop');
  if (stage <= 0) return <g><R x={5} y={12} w={2} h={1} c={v('soilDark')} /><R x={10} y={11} w={2} h={1} c={v('soilDark')} /></g>;
  if (stage === 1) return <g><R x={8} y={9} w={1} h={4} c={leafD} /><R x={7} y={8} w={1} h={1} c={leaf} /><R x={9} y={8} w={1} h={1} c={leaf} /></g>;
  if (stage === 2) {
    return (
      <g>
        <R x={8} y={6} w={1} h={7} c={leafD} />
        <R x={5} y={6} w={3} h={2} c={leaf} />
        <R x={9} y={4} w={3} h={2} c={leaf} />
      </g>
    );
  }
  if (stage === 3) {
    return (
      <g>
        <R x={8} y={3} w={1} h={10} c={leafD} />
        <R x={4} y={5} w={4} h={2} c={leaf} />
        <R x={9} y={3} w={4} h={2} c={leaf} />
        <R x={5} y={9} w={3} h={2} c={leaf} />
        <R x={7} y={1} w={3} h={2} c={fruit} opacity={0.6} />
      </g>
    );
  }
  // maduro: fruto da estação
  const big = season === 'fall';
  return (
    <g class={wilting ? 'wilt' : 'sway'}>
      <R x={8} y={2} w={1} h={11} c={leafD} />
      <R x={3} y={6} w={5} h={2} c={leaf} />
      <R x={9} y={4} w={5} h={2} c={leaf} />
      <R x={big ? 4 : 5} y={big ? 7 : 0} w={big ? 9 : 7} h={big ? 6 : 5} c={fruit} />
      <R x={big ? 5 : 6} y={big ? 8 : 1} w={2} h={2} c="rgba(255,255,255,.35)" />
    </g>
  );
}

export function Field({ x, y, crops, season, onSelect, focused }) {
  const plotW = 24;
  const plotH = 20;
  const rows = Math.ceil(crops.plots / COLS);
  return (
    <g
      class={`hotspot ${focused ? 'focused' : ''}`}
      transform={`translate(${x} ${y})`}
      role="button"
      tabIndex={0}
      aria-label={`Plantação (RAM): ${Math.round(crops.pct)}% de memória em uso. Abrir detalhes.`}
      onClick={() => onSelect('ram')}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onSelect('ram'))}
    >
      <R x={-4} y={-4} w={COLS * plotW + 6} h={rows * plotH + 6} c={v('soilDark')} />
      {Array.from({ length: crops.plots }, (_, i) => {
        const col = i % COLS;
        const row = Math.floor(i / COLS);
        const stage = i < crops.full ? 4 : i === crops.full ? crops.partialStage : 0;
        return (
          <g key={i} transform={`translate(${col * plotW} ${row * plotH})`}>
            <R x={0} y={0} w={plotW - 2} h={plotH - 2} c={stage > 0 ? v('soilWet') : v('soil')} />
            <R x={0} y={plotH - 4} w={plotW - 2} h={2} c={v('soilDark')} />
            <g transform="translate(3 1)">
              <Crop stage={stage} wilting={crops.wilting} season={season} />
            </g>
          </g>
        );
      })}
      <rect class="hit" x={-6} y={-6} width={COLS * plotW + 10} height={rows * plotH + 10} />
      <AlertBubble x={(COLS * plotW) / 2} y={-6} level={crops.level} />
      <Sign x={-18} y={rows * plotH / 2 - 6} text={`RAM ${Math.round(crops.pct)}%`} level={crops.level} />
    </g>
  );
}
