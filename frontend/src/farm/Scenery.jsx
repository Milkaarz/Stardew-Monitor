/**
 * Céu (dia/noite), fundo de cada tema e vegetação. Puramente ambiental: estes elementos
 * não representam métricas (as métricas estão nas construções, plantação e animais).
 */
import { R } from './pixel.jsx';
import { v } from './palette.js';

const W = 480;

export function Sky({ phase, sun, moon, weather, theme }) {
  const isNight = phase === 'night';
  const cloudCount = { sunny: 2, hot: 1, heatwave: 0, cloudy: 5, rain: 6, storm: 7 }[weather] ?? 2;
  const dark = weather === 'rain' || weather === 'storm';
  if (theme === 'mines') {
    return (
      <g>
        {[0, 1, 2, 3].map((i) => <R key={i} x={0} y={i * 30} w={W} h={30} c={`var(--sky${i + 1})`} />)}
        {/* teto de pedra com cristais */}
        <path d="M0 0 H480 V18 L460 26 L440 14 L410 30 L380 16 L350 24 L320 12 L290 28 L260 16 L230 26 L200 12 L170 24 L140 14 L110 30 L80 16 L50 26 L20 12 L0 22 Z" style={{ fill: '#0b0a12' }} />
        {[[40, 30], [150, 26], [262, 32], [390, 28], [452, 34]].map(([x, y], i) => (
          <g key={i} class="crystal-glow" style={{ animationDelay: `${i * 0.7}s` }}>
            <path d={`M${x} ${y} l4 -10 l4 10 z`} style={{ fill: i % 2 ? v('crystal2') : v('crystal') }} />
          </g>
        ))}
        {[60, 210, 330, 420].map((x, i) => <R key={i} x={x} y={44 + (i % 2) * 20} w={2} h={2} c={v('crystal')} class="twinkle" />)}
      </g>
    );
  }
  const sx = 20 + sun * 430;
  const sy = 78 - Math.sin(Math.PI * sun) * 62;
  const mx = 20 + moon * 430;
  const my = 78 - Math.sin(Math.PI * moon) * 60;
  return (
    <g>
      {[0, 1, 2, 3].map((i) => <R key={i} x={0} y={i * 30} w={W} h={30} c={`var(--sky${i + 1})`} />)}
      {isNight && (
        <g class="stars">
          {[[30, 12], [80, 30], [120, 8], [170, 22], [220, 40], [260, 10], [300, 28], [350, 14], [400, 36], [440, 18], [460, 50], [60, 52], [190, 58], [330, 56]].map(([x, y], i) => (
            <R key={i} x={x} y={y} w={i % 3 === 0 ? 2 : 1} h={i % 3 === 0 ? 2 : 1} c="#fff" class={i % 2 ? 'twinkle' : ''} />
          ))}
        </g>
      )}
      {!isNight && !dark && (
        <g class={weather === 'heatwave' ? 'sun big' : 'sun'} transform={`translate(${sx} ${sy})`}>
          <R x={-12} y={-12} w={24} h={24} c="#ffd23f" />
          <R x={-16} y={-6} w={4} h={12} c="#ffd23f" />
          <R x={12} y={-6} w={4} h={12} c="#ffd23f" />
          <R x={-6} y={-16} w={12} h={4} c="#ffe27a" />
          <R x={-6} y={12} w={12} h={4} c="#ffe27a" />
          <R x={-8} y={-8} w={12} h={12} c="#fff3a0" class="twinkle" />
        </g>
      )}
      {isNight && !dark && (
        <g transform={`translate(${mx} ${my})`}>
          <R x={-9} y={-9} w={18} h={18} c="#e9e9f2" />
          <R x={1} y={-9} w={8} h={18} c="#b9b9cc" />
          <R x={-5} y={-3} w={3} h={3} c="#c9c9dc" />
        </g>
      )}
      <g class="clouds">
        {Array.from({ length: cloudCount }, (_, i) => {
          const cx = (i * 97 + 30) % 460;
          const cy = 10 + ((i * 37) % 40);
          const c = dark ? (weather === 'storm' ? '#5a5f78' : '#8f97a8') : isNight ? '#3a4470' : '#fff';
          return (
            <g key={i} class="cloud" style={{ animationDuration: `${80 + i * 23}s`, animationDelay: `-${i * 17}s` }}>
              <R x={cx} y={cy + 6} w={44} h={8} c={c} />
              <R x={cx + 10} y={cy} w={24} h={6} c={c} />
              <R x={cx} y={cy + 12} w={44} h={2} c="rgba(0,0,0,.08)" />
            </g>
          );
        })}
      </g>
    </g>
  );
}

function Tree({ x, y, s = 1, season }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <R x={6} y={16} w={4} h={10} c={v('trunk')} />
      <R x={1} y={6} w={14} h={12} c={v('leafDark')} />
      <R x={3} y={0} w={10} h={7} c={v('leafDark')} />
      <R x={4} y={2} w={4} h={3} c={v('leaf')} />
      <R x={3} y={8} w={4} h={4} c={v('leaf')} />
      <R x={9} y={10} w={3} h={3} c={v('leafLight')} />
      {season === 'winter' && <R x={3} y={0} w={10} h={2} c="#ffffff" />}
      {season === 'spring' && <R x={10} y={4} w={2} h={2} c={v('accent')} />}
    </g>
  );
}

function Palm({ x, y }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M8 30 L10 8 L12 8 L11 30 Z" style={{ fill: v('trunk') }} />
      <R x={0} y={6} w={10} h={3} c={v('leafDark')} />
      <R x={11} y={6} w={10} h={3} c={v('leafDark')} />
      <R x={4} y={2} w={7} h={3} c={v('leaf')} />
      <R x={11} y={2} w={7} h={3} c={v('leaf')} />
      <R x={-2} y={9} w={5} h={3} c={v('leaf')} />
      <R x={18} y={9} w={5} h={3} c={v('leaf')} />
      <R x={9} y={8} w={3} h={3} c="#7a4a2a" />
    </g>
  );
}

function Rock({ x, y, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <R x={0} y={4} w={14} h={7} c={v('stoneDark')} />
      <R x={2} y={1} w={10} h={6} c={v('stone')} />
      <R x={3} y={2} w={4} h={2} c="rgba(255,255,255,.3)" />
    </g>
  );
}

/** Fundo distante + vegetação conforme o tema da fazenda. */
export function Background({ theme, season }) {
  const horizon = 120;
  return (
    <g>
      {theme === 'beach' ? (
        <g>
          <R x={0} y={92} w={W} h={30} c={v('far')} />
          <R x={0} y={92} w={W} h={3} c={v('farSnow')} />
          <g class="waves">
            {[20, 110, 200, 290, 380].map((x) => <R key={x} x={x} y={100 + (x % 3) * 5} w={18} h={2} c="#bfe6ff" />)}
          </g>
          <R x={0} y={horizon - 6} w={W} h={8} c={v('sand')} />
        </g>
      ) : theme === 'hilltop' ? (
        <g>
          <path d="M0 122 V80 L40 56 L70 74 L110 40 L150 70 L190 50 L240 78 L280 46 L330 72 L370 52 L420 76 L460 58 L480 66 V122 Z" style={{ fill: v('far') }} />
          <path d="M100 46 L110 40 L120 46 Z M270 52 L280 46 L290 52 Z M180 56 L190 50 L200 56 Z" style={{ fill: v('farSnow') }} />
          <path d="M0 122 V96 L60 84 L120 98 L190 86 L260 100 L330 88 L400 98 L480 90 V122 Z" style={{ fill: v('far2') }} />
        </g>
      ) : theme === 'ginger' ? (
        <g>
          <path d="M150 122 L210 50 L230 50 L290 122 Z" style={{ fill: v('far') }} />
          <path d="M210 50 L230 50 L226 58 L214 58 Z" style={{ fill: v('farSnow') }} class="lava" />
          <g class="smoke-volcano"><R x={216} y={38} w={8} h={6} c="rgba(90,90,90,.6)" /><R x={220} y={28} w={10} h={6} c="rgba(90,90,90,.4)" /></g>
          <path d="M0 122 V100 L80 92 L150 104 L300 100 L380 90 L480 98 V122 Z" style={{ fill: v('far2') }} />
        </g>
      ) : theme === 'mines' ? (
        <g>
          <path d="M0 122 V96 L40 90 L60 100 L120 92 L180 102 L240 94 L300 104 L360 92 L420 100 L480 94 V122 Z" style={{ fill: v('far') }} />
          {[30, 140, 280, 420].map((x, i) => <path key={x} d={`M${x} 110 l5 -14 l5 14 z`} style={{ fill: i % 2 ? v('crystal2') : v('crystal') }} class="crystal-glow" />)}
        </g>
      ) : (
        <g>
          <path d="M0 122 V96 H30 V90 H56 V82 H80 V88 H104 V94 H140 V86 H172 V78 H196 V84 H224 V92 H256 V88 H292 V80 H318 V86 H350 V94 H384 V84 H412 V90 H440 V96 H480 V122 Z" style={{ fill: v('far') }} />
          <path d="M0 122 V104 H60 V100 H120 V104 H190 V98 H250 V102 H320 V106 H380 V100 H450 V104 H480 V122 Z" style={{ fill: v('far2') }} />
        </g>
      )}

      {/* chão */}
      <R x={0} y={horizon} w={W} h={150} c={theme === 'beach' ? v('grass') : v('grass')} />
      <R x={0} y={horizon} w={W} h={3} c={v('grassLight')} />
      {/* tufos de grama */}
      {[[16, 176], [228, 170], [300, 248], [410, 176], [226, 250], [460, 246], [250, 186]].map(([x, y], i) => (
        <g key={i}>
          <R x={x} y={y} w={1} h={3} c={v('grassDark')} />
          <R x={x + 2} y={y - 2} w={1} h={5} c={v('grassDark')} />
          <R x={x + 4} y={y} w={1} h={3} c={v('grassDark')} />
        </g>
      ))}

      {/* vegetação no horizonte */}
      {theme === 'beach'
        ? [[2, 92], [446, 92]].map(([x, y]) => <Palm key={x} x={x} y={y} />)
        : theme === 'ginger'
          ? [[4, 92], [120, 94], [330, 92], [452, 94]].map(([x, y]) => <Palm key={x} x={x} y={y} />)
          : theme === 'mines'
            ? [[10, 112], [300, 114], [460, 110]].map(([x, y]) => <Rock key={x} x={x} y={y} s={1.4} />)
            : (theme === 'forest'
              ? [4, 22, 210, 228, 300, 318, 440, 458, 120]
              : [6, 222, 300, 452]
            ).map((x, i) => <Tree key={x} x={x} y={92 + (i % 2) * 3} s={theme === 'forest' ? 1.2 : 1} season={season} />)}
      {theme === 'hilltop' && [[230, 150], [300, 172], [466, 150]].map(([x, y]) => <Rock key={x} x={x} y={y} />)}
      {theme === 'forest' && [[226, 150], [470, 140]].map(([x, y]) => <Tree key={x} x={x} y={y} s={0.8} season={season} />)}

      {/* estrada de terra (por onde passa a carroça) */}
      <R x={0} y={254} w={W} h={16} c={v('path')} />
      <R x={0} y={254} w={W} h={2} c={v('pathDark')} />
      {[20, 90, 170, 260, 340, 420].map((x) => <R key={x} x={x} y={261} w={6} h={2} c={v('pathDark')} />)}
    </g>
  );
}
