/**
 * A fazenda: composição da cena SVG em pixel art (480x270 "pixels").
 * Recebe o estado visual calculado por computeFarmState (shared) — nada aqui é inventado.
 */
import { scenePalette } from './palette.js';
import { Sky, Background } from './Scenery.jsx';
import { House, Mill, Barn, Mailbox } from './Buildings.jsx';
import { Field } from './Field.jsx';
import { Chickens, CowPen, Pigs, Pond } from './Animals.jsx';
import { WeatherOverlay, Cart, FestivalDecor } from './Weather.jsx';
import './farm.css';

export function FarmScene({ farm, theme = 'standard', season, day, festival, onSelect = () => {}, focused, label }) {
  const palette = scenePalette({ theme, season: season.season, phase: day.phase });
  const offline = !farm.online;
  return (
    <svg
      class={`farm-scene theme-${theme} ${offline ? 'is-offline' : ''}`}
      viewBox="0 0 480 270"
      shape-rendering="crispEdges"
      style={palette}
      role="group"
      aria-label={label}
    >
      <Sky phase={day.phase} sun={day.sun} moon={day.moon} weather={farm.weather.kind} theme={theme} />
      <Background theme={theme} season={season.season} />
      {festival && <FestivalDecor decoration={festival.decoration} />}

      <House x={36} y={86} state={farm.house} night={day.phase === 'night' || day.phase === 'sunset'} onSelect={onSelect} focused={focused === 'cpu'} />
      <Mailbox x={140} y={150} cart={farm.cart} onSelect={onSelect} />
      <Mill x={176} y={92} state={farm.mill} onSelect={onSelect} focused={focused === 'gpu'} />
      <Barn x={292} y={92} silos={farm.silos} onSelect={onSelect} focused={focused === 'disk'} />

      <Chickens mood={farm.animals.chickens} area={{ x: 232, y: 176 }} />
      <Field x={44} y={190} crops={farm.crops} season={season.season} onSelect={onSelect} focused={focused === 'ram'} />
      <Pond mood={farm.animals.ducks} area={{ x: 250, y: 208 }} theme={theme} />
      <CowPen mood={farm.animals.cows} area={{ x: 340, y: 192 }} />
      <Pigs mood={farm.animals.pigs} area={{ x: 420, y: 170 }} />
      <Cart cart={farm.cart} onSelect={onSelect} />

      <WeatherOverlay kind={farm.weather.kind} wind={farm.weather.wind} season={season.season} phase={day.phase} theme={theme} />

      {/* janelas acesas por cima do escurecimento da noite */}
      {(day.phase === 'night' || day.phase === 'sunset') && !offline && (
        <g pointer-events="none" class="night-lights">
          {[48, 102].map((x) => (
            <g key={x}>
              <rect x={x - 3} y={125} width={18} height={16} style={{ fill: 'rgba(255,214,90,.25)' }} />
              <rect x={x} y={128} width={12} height={10} style={{ fill: '#ffe27a' }} />
              <rect x={x + 5} y={128} width={2} height={10} style={{ fill: '#3b2412' }} />
              <rect x={x} y={132} width={12} height={2} style={{ fill: '#3b2412' }} />
            </g>
          ))}
        </g>
      )}

      {offline && (
        <g>
          <rect width="480" height="270" style={{ fill: 'rgba(60,60,60,.45)' }} />
          <rect x="150" y="118" width="180" height="30" style={{ fill: '#3b2412' }} />
          <rect x="153" y="121" width="174" height="24" style={{ fill: '#f6dca0' }} />
          <text x="240" y="137" text-anchor="middle" class="sign-text big">SEM SINAL DA FAZENDA</text>
        </g>
      )}
    </svg>
  );
}
