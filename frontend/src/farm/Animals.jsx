/**
 * Animais como indicadores de saúde (complementam, não substituem, os números):
 *  galinhas felizes/assustadas (estado geral) · vacas descansando quando a máquina está ociosa
 *  porcos fuçando com E/S de disco intensa · patos no lago quando está tudo bem
 */
import { Sprite, R } from './pixel.jsx';
import { CHICKEN, CHICKEN_BROWN, CHICKEN_SCARED, COW, COW_RESTING, PIG, DUCK } from './sprites.js';
import { v } from './palette.js';

const say = (mood) => ({
  happy: 'Galinhas felizes: todos os recursos normais.',
  scared: 'Galinhas assustadas: há alertas na fazenda.',
  resting: 'Vacas descansando: computador ocioso.',
  grazing: 'Vacas pastando: computador trabalhando.',
  digging: 'Porcos fuçando: muita atividade de disco.',
  sleeping: 'Porcos cochilando: disco tranquilo.',
  pond: 'Patos no lago: situação normal.',
  shore: 'Patos na margem, atentos: há avisos.',
  hiding: 'Patos escondidos: problema detectado.',
}[mood]);

export function Chickens({ mood, area }) {
  const scared = mood === 'scared';
  const birds = [
    { x: 0, y: 6, brown: false, d: 0 },
    { x: 34, y: 0, brown: true, d: 1.3 },
    { x: 70, y: 9, brown: false, d: 2.1 },
  ];
  return (
    <g transform={`translate(${area.x} ${area.y})`} aria-label={say(mood)} role="img">
      <title>{say(mood)}</title>
      {birds.map((b, i) => (
        <g key={i} transform={`translate(${b.x} ${b.y})`}>
          <g class={scared ? 'chicken-scared' : 'chicken-walk'} style={{ animationDelay: `${b.d}s` }}>
            <g class={scared ? '' : 'chicken-peck'} style={{ animationDelay: `${b.d * 0.7}s` }}>
              {scared
                ? <Sprite rows={CHICKEN_SCARED.rows} palette={b.brown ? { ...CHICKEN_SCARED.palette, w: '#d9a066', g: '#b5814a' } : CHICKEN_SCARED.palette} flip={i % 2 === 1} />
                : <Sprite rows={CHICKEN.rows} palette={(b.brown ? CHICKEN_BROWN : CHICKEN).palette} flip={i % 2 === 1} />}
            </g>
          </g>
          {scared && i === 1 && <text x="3" y="-3" class="tiny-text alarm">!</text>}
        </g>
      ))}
    </g>
  );
}

export function CowPen({ mood, area }) {
  const resting = mood === 'resting';
  const cow = resting ? COW_RESTING : COW;
  const w = 104;
  const h = 50;
  return (
    <g transform={`translate(${area.x} ${area.y})`} role="img" aria-label={say(mood)}>
      <title>{say(mood)}</title>
      {/* cerca */}
      {[0, h].map((fy) => <R key={fy} x={0} y={fy} w={w} h={2} c={v('fence')} />)}
      {Array.from({ length: 7 }, (_, i) => <R key={i} x={i * (w / 6) - 1} y={-4} w={3} h={h + 6} c={v('fenceLight')} />)}
      <g transform="translate(14 12)" class={resting ? '' : 'cow-graze'}>
        <Sprite rows={cow.rows} palette={cow.palette} scale={1.4} />
      </g>
      <g transform="translate(58 22)" class={resting ? '' : 'cow-graze'} style={{ animationDelay: '1.2s' }}>
        <Sprite rows={cow.rows} palette={{ ...cow.palette, b: '#2b1a0b', t: '#2b1a0b' }} scale={1.4} flip />
      </g>
      {resting && <text x="34" y="10" class="tiny-text zzz">z z</text>}
    </g>
  );
}

export function Pigs({ mood, area }) {
  const digging = mood === 'digging';
  return (
    <g transform={`translate(${area.x} ${area.y})`} role="img" aria-label={say(mood)}>
      <title>{say(mood)}</title>
      <R x={-4} y={10} w={56} h={14} c={v('soilDark')} opacity={0.5} />
      {[0, 26].map((px, i) => (
        <g key={px} transform={`translate(${px} ${i * 4})`}>
          <g class={digging ? 'pig-dig' : 'pig-sleep'} style={{ animationDelay: `${i * 0.4}s` }}>
            <Sprite rows={PIG.rows} palette={PIG.palette} scale={1.6} flip={i === 1} />
          </g>
          {digging && (
            <g class="dirt" style={{ animationDelay: `${i * 0.3}s` }}>
              <R x={i ? 20 : -2} y={8} w={2} h={2} c={v('soilDark')} />
              <R x={i ? 23 : -5} y={5} w={2} h={2} c={v('soil')} />
            </g>
          )}
          {!digging && i === 0 && <text x="4" y="-2" class="tiny-text zzz">z</text>}
        </g>
      ))}
    </g>
  );
}

export function Pond({ mood, area, theme }) {
  const inWater = mood === 'pond';
  const w = 70;
  const h = 34;
  return (
    <g transform={`translate(${area.x} ${area.y})`} role="img" aria-label={say(mood)}>
      <title>{say(mood)}</title>
      <path d={`M8 0 H${w - 8} V4 H${w} V${h - 4} H${w - 8} V${h} H8 V${h - 4} H0 V4 H8 Z`} style={{ fill: v('water') }} />
      <R x={8} y={4} w={w - 16} h={3} c={v('waterLight')} opacity={0.6} />
      <g class="ripple">
        <R x={16} y={18} w={10} h={1} c={v('waterLight')} />
        <R x={44} y={24} w={8} h={1} c={v('waterLight')} />
      </g>
      {theme !== 'mines' && <R x={w - 14} y={h - 10} w={6} h={6} c={v('leafDark')} />}
      {inWater ? (
        <g>
          <g transform="translate(14 8)" class="duck-bob"><Sprite rows={DUCK.rows} palette={DUCK.palette} scale={1.3} /></g>
          <g transform="translate(40 14)" class="duck-bob" style={{ animationDelay: '0.8s' }}><Sprite rows={DUCK.rows} palette={DUCK.palette} scale={1.3} flip /></g>
        </g>
      ) : mood === 'shore' ? (
        <g>
          <g transform={`translate(${w + 2} 12)`}><Sprite rows={DUCK.rows} palette={DUCK.palette} scale={1.3} /></g>
          <text x={w + 4} y="8" class="tiny-text alarm">?</text>
        </g>
      ) : (
        <text x={w / 2} y={h / 2 + 3} text-anchor="middle" class="tiny-text">...</text>
      )}
    </g>
  );
}
