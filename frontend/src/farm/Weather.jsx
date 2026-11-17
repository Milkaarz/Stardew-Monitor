/**
 * Clima reativo (CPU/temperatura), vento (ventoinhas), noite e decorações de festival.
 */
import { R, Sprite } from './pixel.jsx';
import { CART } from './sprites.js';
import { v } from './palette.js';

export function WeatherOverlay({ kind, wind, season, phase, theme }) {
  const snow = season === 'winter' && theme !== 'ginger';
  const precip = kind === 'rain' || kind === 'storm';
  return (
    <g class="weather" pointer-events="none">
      <defs>
        <pattern id="farm-rain" width="12" height="24" patternUnits="userSpaceOnUse">
          <rect x="6" y="0" width="1" height="6" fill="rgba(200,225,255,.75)" />
          <rect x="1" y="12" width="1" height="6" fill="rgba(200,225,255,.6)" />
        </pattern>
        <pattern id="farm-snow" width="24" height="24" patternUnits="userSpaceOnUse">
          <rect x="4" y="3" width="2" height="2" fill="#fff" />
          <rect x="16" y="14" width="2" height="2" fill="#fff" />
          <rect x="10" y="20" width="1" height="1" fill="#fff" />
        </pattern>
        <pattern id="farm-leaves" width="60" height="60" patternUnits="userSpaceOnUse">
          <rect x="10" y="8" width="3" height="2" fill="#e8861a" />
          <rect x="40" y="30" width="3" height="2" fill="#b35a10" />
          <rect x="24" y="50" width="2" height="2" fill="#f5b042" />
        </pattern>
        <pattern id="farm-petals" width="70" height="70" patternUnits="userSpaceOnUse">
          <rect x="12" y="10" width="2" height="2" fill="#ffc0dc" />
          <rect x="48" y="40" width="2" height="2" fill="#fff3f8" />
        </pattern>
      </defs>

      {kind === 'cloudy' && <rect width="480" height="270" style={{ fill: 'rgba(110,120,140,.15)' }} />}
      {kind === 'rain' && <rect width="480" height="270" style={{ fill: 'rgba(60,70,95,.22)' }} />}
      {kind === 'storm' && <rect width="480" height="270" style={{ fill: 'rgba(25,28,50,.42)' }} />}
      {(kind === 'hot' || kind === 'heatwave') && (
        <g>
          <rect width="480" height="270" style={{ fill: kind === 'heatwave' ? 'rgba(255,120,40,.22)' : 'rgba(255,170,60,.13)' }} />
          <g class="shimmer">
            {[40, 140, 250, 360, 440].map((x) => (
              <path key={x} d={`M${x} 200 q4 -6 0 -12 q-4 -6 0 -12`} style={{ stroke: 'rgba(255,240,200,.55)', fill: 'none', strokeWidth: 1 }} />
            ))}
          </g>
        </g>
      )}

      {precip && (
        <g class={snow ? 'snowfall' : 'rainfall'}>
          <rect y="-48" width="480" height="318" fill={snow ? 'url(#farm-snow)' : 'url(#farm-rain)'} />
        </g>
      )}
      {!precip && snow && <g class="snowfall slow"><rect y="-48" width="480" height="318" fill="url(#farm-snow)" opacity="0.6" /></g>}
      {!precip && season === 'fall' && theme !== 'mines' && <g class="leaffall"><rect y="-60" width="480" height="330" fill="url(#farm-leaves)" /></g>}
      {!precip && season === 'spring' && theme !== 'mines' && <g class="leaffall slow"><rect y="-70" width="480" height="340" fill="url(#farm-petals)" /></g>}
      {kind === 'storm' && <rect class="lightning" width="480" height="270" style={{ fill: '#fff' }} />}

      {/* vento: velocidade proporcional às ventoinhas */}
      {wind?.level > 0 && (
        <g class={`wind wind-${wind.level}`}>
          {[[30, 140], [160, 176], [300, 150], [90, 210], [380, 196], [220, 236]].slice(0, wind.level * 2).map(([x, y], i) => (
            <g key={i}>
              <R x={x} y={y} w={22} h={1} c="rgba(255,255,255,.7)" />
              <R x={x + 8} y={y + 3} w={12} h={1} c="rgba(255,255,255,.5)" />
            </g>
          ))}
        </g>
      )}

      {/* noite / entardecer / amanhecer */}
      {phase === 'night' && <rect width="480" height="270" style={{ fill: 'rgba(8,14,50,.48)' }} />}
      {phase === 'sunset' && <rect width="480" height="270" style={{ fill: 'rgba(255,110,50,.14)' }} />}
      {phase === 'dawn' && <rect width="480" height="270" style={{ fill: 'rgba(255,170,120,.12)' }} />}
      {phase === 'night' && season === 'summer' && (
        <g class="fireflies">
          {[[60, 200], [250, 190], [330, 230], [150, 170], [420, 215]].map(([x, y], i) => (
            <rect key={i} x={x} y={y} width="2" height="2" style={{ fill: '#e6ff7a', animationDelay: `${i * 0.6}s` }} class="firefly" />
          ))}
        </g>
      )}
    </g>
  );
}

/** Carroça na estrada: velocidade = tráfego de rede. */
export function Cart({ cart, onSelect }) {
  const cls = cart.speed > 0 ? `cart-move speed-${cart.speed}` : 'cart-idle';
  return (
    <g
      class="hotspot"
      role="button"
      tabIndex={0}
      aria-label="Carroça (rede): abrir detalhes de download e upload."
      onClick={() => onSelect('net')}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onSelect('net'))}
    >
      <g transform="translate(0 246)">
        <g class={cls}>
          <Sprite rows={CART.rows} palette={CART.palette} scale={1.4} />
          {cart.speed > 0 && <rect class="hit" x="-4" y="-4" width="34" height="16" />}
        </g>
      </g>
      {cart.speed === 0 && <rect class="hit" x="-4" y="242" width="34" height="16" />}
    </g>
  );
}

/** Decorações temporárias dos festivais. */
export function FestivalDecor({ decoration }) {
  if (!decoration) return null;
  const garland = (color1, color2) => (
    <g>
      <path d="M0 6 Q120 22 240 6 Q360 22 480 6" style={{ stroke: '#6b4a2a', fill: 'none', strokeWidth: 1 }} />
      {Array.from({ length: 24 }, (_, i) => {
        const x = i * 20 + 10;
        const y = 6 + Math.sin((x / 240) * Math.PI) * 14 * (x < 240 ? 1 : 1);
        return <R key={i} x={x} y={Math.abs(y) + 1} w={4} h={5} c={i % 2 ? color1 : color2} />;
      })}
    </g>
  );
  switch (decoration) {
    case 'eggs':
      return (
        <g class="festival" pointer-events="none">
          {[[18, 236, '#ff7ab0'], [238, 172, '#7ad6ff'], [312, 246, '#ffd23f'], [404, 178, '#9be36a'], [140, 250, '#c46ad9'], [470, 240, '#ff8a3a']].map(([x, y, c], i) => (
            <g key={i}>
              <R x={x} y={y} w={4} h={6} c={c} />
              <R x={x - 1} y={y + 1} w={6} h={4} c={c} />
              <R x={x} y={y + 2} w={4} h={1} c="#fff" />
            </g>
          ))}
        </g>
      );
    case 'flowers':
      return (
        <g class="festival" pointer-events="none">
          {garland('#ff7ab0', '#fff3f8')}
          {[[232, 160], [300, 176], [120, 178], [460, 172]].map(([x, y], i) => (
            <g key={i}><R x={x} y={y + 3} w={1} h={5} c={v('leafDark')} /><R x={x - 2} y={y} w={5} h={4} c={i % 2 ? '#ff7ab0' : '#ffd23f'} /></g>
          ))}
        </g>
      );
    case 'lanterns':
      return (
        <g class="festival" pointer-events="none">
          <path d="M0 10 Q240 30 480 10" style={{ stroke: '#3b2412', fill: 'none', strokeWidth: 1 }} />
          {Array.from({ length: 12 }, (_, i) => {
            const x = 20 + i * 40;
            const y = 10 + Math.sin((x / 480) * Math.PI) * 20;
            return <g key={i} class="twinkle" style={{ animationDelay: `${i * 0.3}s` }}><R x={x} y={y} w={6} h={8} c={i % 2 ? '#ff8a3a' : '#ffd23f'} /><R x={x + 2} y={y + 8} w={2} h={2} c="#d9381e" /></g>;
          })}
        </g>
      );
    case 'pumpkins':
      return (
        <g class="festival" pointer-events="none">
          {[[24, 236], [232, 166], [300, 244], [470, 186]].map(([x, y], i) => (
            <g key={i}>
              <R x={x} y={y} w={10} h={8} c="#e8861a" />
              <R x={x + 4} y={y - 2} w={2} h={2} c="#2e7d3a" />
              <R x={x + 2} y={y + 2} w={2} h={2} c="#ffe27a" class="twinkle" />
              <R x={x + 6} y={y + 2} w={2} h={2} c="#ffe27a" class="twinkle" />
              <R x={x + 3} y={y + 5} w={4} h={1} c="#ffe27a" />
            </g>
          ))}
        </g>
      );
    case 'ice':
      return (
        <g class="festival" pointer-events="none">
          {[[236, 150], [462, 166]].map(([x, y], i) => (
            <g key={i}>
              <R x={x} y={y + 10} w={14} h={10} c="#cfefff" />
              <R x={x + 3} y={y + 2} w={8} h={8} c="#e8f8ff" />
              <R x={x + 5} y={y} w={4} h={3} c="#bfe6ff" />
              <R x={x + 5} y={y + 5} w={1} h={1} c="#3a6fb8" />
              <R x={x + 8} y={y + 5} w={1} h={1} c="#3a6fb8" />
            </g>
          ))}
        </g>
      );
    case 'stars':
      return (
        <g class="festival" pointer-events="none">
          {garland('#d9381e', '#2e9a3a')}
          <g transform="translate(232 128)">
            <path d="M8 0 L16 26 H0 Z" style={{ fill: '#2e7d3a' }} />
            <R x={6} y={26} w={4} h={4} c="#6b4a2a" />
            <R x={6} y={-4} w={4} h={4} c="#ffd23f" class="twinkle" />
            {[[4, 12, '#d9381e'], [10, 18, '#ffd23f'], [5, 22, '#7ad6ff']].map(([x, y, c], i) => <R key={i} x={x} y={y} w={2} h={2} c={c} class="twinkle" />)}
          </g>
        </g>
      );
    default:
      return null;
  }
}
