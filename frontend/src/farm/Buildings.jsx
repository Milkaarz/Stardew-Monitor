/**
 * Construções da fazenda, cada uma ligada a um recurso real:
 *  Casa = CPU · Moinho = GPU · Celeiro e silos = discos · Caixa de correio = rede (envio)
 */
import { R, Sprite } from './pixel.jsx';
import { MAILBOX, LETTER } from './sprites.js';
import { v } from './palette.js';

const LEVEL_COLOR = { ok: '#4caf50', warn: '#f2b600', crit: '#d9381e', offline: '#8d8d8d' };

/** Plaquinha de madeira com o valor (aparece abaixo de cada construção). */
export function Sign({ x, y, text, level = 'ok', w }) {
  const width = w || Math.max(30, text.length * 4.2 + 8);
  return (
    <g class="sign" transform={`translate(${x - width / 2} ${y})`}>
      <rect x={width / 2 - 1} y="8" width="2" height="5" style={{ fill: v('trunk') }} />
      <rect width={width} height="10" style={{ fill: '#8a4b0f' }} />
      <rect x="1" y="1" width={width - 2} height="8" style={{ fill: '#f6dca0' }} />
      <rect x="2" y="2" width="3" height="3" style={{ fill: LEVEL_COLOR[level] }} />
      <text x={width / 2 + 2} y="7.4" text-anchor="middle" class="sign-text">{text}</text>
    </g>
  );
}

/** Balão "!" de alerta acima de uma construção. */
export function AlertBubble({ x, y, level }) {
  if (level !== 'warn' && level !== 'crit') return null;
  return (
    <g class={`bubble bubble-${level}`} transform={`translate(${x} ${y})`}>
      <g class="bubble-inner">
        <rect x="-5" y="-12" width="10" height="11" style={{ fill: '#fff3c4' }} />
        <rect x="-6" y="-11" width="12" height="9" style={{ fill: '#fff3c4' }} />
        <rect x="-1" y="-2" width="2" height="2" style={{ fill: '#fff3c4' }} />
        <rect x="-1" y="-10" width="2" height="5" style={{ fill: LEVEL_COLOR[level] }} />
        <rect x="-1" y="-4" width="2" height="1.5" style={{ fill: LEVEL_COLOR[level] }} />
      </g>
    </g>
  );
}

export function House({ x, y, state, night, onSelect, focused }) {
  const { smoke, hot, level, load } = state;
  const glass = night ? '#ffe27a' : '#9fd8ff';
  return (
    <g
      class={`hotspot ${focused ? 'focused' : ''}`}
      transform={`translate(${x} ${y})`}
      role="button"
      tabIndex={0}
      aria-label={`Casa da fazenda (CPU): ${load != null ? Math.round(load) : '?'}% de uso. Abrir detalhes.`}
      onClick={() => onSelect('cpu')}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onSelect('cpu'))}
    >
      {/* chaminé e fumaça (mais fumaça = mais CPU) */}
      <R x={66} y={-6} w={10} h={20} c="#8a8a8a" />
      <R x={65} y={-8} w={12} h={4} c="#b0b0b0" />
      {Array.from({ length: smoke * 2 }, (_, i) => (
        <g key={i} class={`smoke smoke-${smoke}`} style={{ animationDelay: `${(i * 1.6) / (smoke + 1)}s` }}>
          <rect x={68 + (i % 2) * 3} y={-14} width={5 + (i % 3)} height={4} rx="0" style={{ fill: hot ? '#bdbdbd' : '#e8e8e8' }} />
        </g>
      ))}
      {/* telhado em degraus */}
      <R x={-6} y={18} w={102} h={12} c={v('roof')} />
      <R x={2} y={10} w={86} h={8} c={v('roof')} />
      <R x={12} y={3} w={66} h={7} c={v('roofLight')} />
      <R x={-6} y={28} w={102} h={3} c={v('roofDark')} />
      <R x={14} y={5} w={62} h={2} c="rgba(255,255,255,.18)" />
      {/* paredes de madeira */}
      <R x={0} y={31} w={90} h={42} c={v('wall')} />
      <R x={0} y={31} w={90} h={4} c={v('wallLight')} />
      <R x={0} y={44} w={90} h={2} c={v('wallDark')} />
      <R x={0} y={56} w={90} h={2} c={v('wallDark')} />
      <R x={0} y={68} w={90} h={2} c={v('wallDark')} />
      {/* janelas */}
      {[10, 64].map((wx) => (
        <g key={wx}>
          <R x={wx} y={40} w={16} h={14} c="#3b2412" />
          <R x={wx + 2} y={42} w={12} h={10} c={glass} class={night ? 'window-lit' : ''} />
          <R x={wx + 7} y={42} w={2} h={10} c="#3b2412" />
          <R x={wx + 2} y={46} w={12} h={2} c="#3b2412" />
        </g>
      ))}
      {/* porta */}
      <R x={36} y={46} w={18} h={27} c="#6b3a12" />
      <R x={38} y={48} w={14} h={25} c="#8a4b0f" />
      <R x={49} y={60} w={2} h={2} c="#ffd23f" />
      <R x={34} y={73} w={22} h={4} c={v('wall')} />
      {/* calor (temperatura alta) */}
      {hot && (
        <g class="heat">
          {[8, 28, 48, 68].map((hx) => (
            <path key={hx} d={`M${hx} -2 q3 -4 0 -8 q-3 -4 0 -8`} style={{ stroke: '#ff8a3a', fill: 'none', strokeWidth: 1.5 }} />
          ))}
        </g>
      )}
      <rect class="hit" x={-8} y={-16} width={106} height={96} />
      <AlertBubble x={45} y={-2} level={level} />
      <Sign x={45} y={80} text={`CPU ${load != null ? Math.round(load) : '?'}%`} level={level} />
    </g>
  );
}

export function Mill({ x, y, state, onSelect, focused }) {
  const { speed, available, telemetry, util, level, temp } = state;
  const label = !available ? 'GPU ?' : util != null ? `GPU ${Math.round(util)}%` : 'GPU';
  return (
    <g
      class={`hotspot ${focused ? 'focused' : ''}`}
      transform={`translate(${x} ${y})`}
      role="button"
      tabIndex={0}
      aria-label={available ? `Moinho (GPU): ${util != null ? `${Math.round(util)}% de uso` : 'sem telemetria de uso'}. Abrir detalhes.` : 'Moinho (GPU): nenhuma placa de vídeo detectada.'}
      onClick={() => onSelect('gpu')}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onSelect('gpu'))}
    >
      {/* torre */}
      <path d="M6 70 L10 14 L26 14 L30 70 Z" style={{ fill: v('wallLight') }} />
      <path d="M8 70 L11 30 L14 30 L12 70 Z" style={{ fill: 'rgba(255,255,255,.18)' }} />
      <R x={8} y={8} w={20} h={8} c={v('roof')} />
      <R x={11} y={4} w={14} h={4} c={v('roofLight')} />
      <R x={14} y={52} w={8} h={18} c="#6b3a12" />
      <R x={15} y={30} w={6} h={6} c={temp != null && temp >= 80 ? '#ff8a3a' : '#3b2412'} />
      {/* pás: velocidade = uso da GPU */}
      <g transform="translate(18 14)">
        <g class={`blades speed-${available ? speed : 0}`}>
          {[0, 90, 180, 270].map((a) => (
            <g key={a} transform={`rotate(${a})`}>
              <rect x={-1} y={-26} width={2} height={24} style={{ fill: '#6b4a2a' }} />
              <rect x={1} y={-25} width={6} height={18} style={{ fill: available ? '#f6dca0' : '#b0a080' }} />
              <rect x={1} y={-25} width={6} height={2} style={{ fill: '#d2b06a' }} />
            </g>
          ))}
        </g>
        <rect x={-2} y={-2} width={4} height={4} style={{ fill: '#3b2412' }} />
      </g>
      {!available && <text x="18" y="46" text-anchor="middle" class="sign-text" style={{ fill: '#3b2412' }}>?</text>}
      {available && !telemetry && <text x="18" y="46" text-anchor="middle" class="sign-text" style={{ fill: '#3b2412' }}>~</text>}
      <rect class="hit" x={-10} y={-14} width={56} height={90} />
      <AlertBubble x={18} y={-14} level={level} />
      <Sign x={18} y={74} text={label} level={available ? level : 'offline'} />
    </g>
  );
}

export function Barn({ x, y, silos, onSelect, focused }) {
  const shown = silos.slice(0, 3);
  const extra = silos.length - shown.length;
  const worst = silos.reduce((a, s) => (s.level === 'crit' ? 'crit' : s.level === 'warn' && a !== 'crit' ? 'warn' : a), 'ok');
  const maxPct = silos.reduce((a, s) => Math.max(a, s.pct || 0), 0);
  return (
    <g
      class={`hotspot ${focused ? 'focused' : ''}`}
      transform={`translate(${x} ${y})`}
      role="button"
      tabIndex={0}
      aria-label={`Celeiro e silos (discos): ${silos.map((s) => `${s.name} ${Math.round(s.pct)}%`).join(', ') || 'sem dados'}. Abrir detalhes.`}
      onClick={() => onSelect('disk')}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onSelect('disk'))}
    >
      {/* celeiro */}
      <path d="M0 26 L36 4 L72 26 Z" style={{ fill: v('barnDark') }} />
      <path d="M4 26 L36 8 L68 26 Z" style={{ fill: v('barn') }} />
      <R x={2} y={26} w={68} h={46} c={v('barn')} />
      <R x={2} y={26} w={68} h={3} c={v('barnDark')} />
      <R x={30} y={12} w={12} h={8} c="#f6dca0" />
      <R x={35} y={12} w={2} h={8} c={v('barnDark')} />
      <R x={20} y={40} w={32} h={32} c="#f6dca0" />
      <R x={22} y={42} w={28} h={30} c={v('barnDark')} />
      <path d="M22 42 L50 72 M50 42 L22 72" style={{ stroke: '#f6dca0', strokeWidth: 2 }} />
      {/* silos: nível de grãos = ocupação do disco */}
      {shown.map((s, i) => {
        const sx = 76 + i * 22;
        const fillH = Math.round(44 * s.fill);
        return (
          <g key={s.name} class={`silo silo-${s.level}`}>
            <path d={`M${sx} 14 Q${sx + 9} 2 ${sx + 18} 14 Z`} style={{ fill: v('stoneDark') }} />
            <R x={sx} y={14} w={18} h={58} c={v('stone')} />
            <R x={sx} y={14} w={3} h={58} c="rgba(255,255,255,.25)" />
            <R x={sx + 4} y={22} w={10} h={46} c="#3b2412" />
            <R x={sx + 5} y={23 + 44 - fillH} w={8} h={fillH} c={s.level === 'crit' ? '#d9381e' : s.level === 'warn' ? '#f2b600' : '#ffd23f'} />
            {[0, 1, 2, 3].map((k) => <R key={k} x={sx + 4} y={33 + k * 11} w={3} h={1} c="#f6dca0" />)}
            {s.level !== 'ok' && <R x={sx + 7} y={6} w={4} h={4} c="#d9381e" class="blink" />}
            <text x={sx + 9} y={82} text-anchor="middle" class="tiny-text">{String(s.name).replace(/[:\\/]+$/, '').slice(0, 4) || '/'}</text>
          </g>
        );
      })}
      {extra > 0 && <text x={76 + shown.length * 22 + 4} y={50} class="tiny-text">+{extra}</text>}
      <rect class="hit" x={-4} y={-6} width={80 + shown.length * 22} height={92} />
      <AlertBubble x={36} y={2} level={worst} />
      <Sign x={36} y={78} text={silos.length ? `DISCO ${Math.round(maxPct)}%` : 'DISCO ?'} level={worst} />
    </g>
  );
}

export function Mailbox({ x, y, cart, onSelect }) {
  return (
    <g
      class="hotspot"
      transform={`translate(${x} ${y})`}
      role="button"
      tabIndex={0}
      aria-label="Caixa de correio (rede). Abrir detalhes."
      onClick={() => onSelect('net')}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onSelect('net'))}
    >
      <Sprite rows={MAILBOX.rows} palette={MAILBOX.palette} scale={1.5} />
      {/* bandeira levantada quando há envio forte */}
      <g class={cart.mail ? 'flag up' : 'flag'}>
        <rect x={12} y={0} width={1.5} height={7} style={{ fill: '#6b4a2a' }} />
        <rect x={13.5} y={0} width={4} height={3} style={{ fill: '#ffd23f' }} />
      </g>
      {cart.mail && (
        <g class="letter-fly">
          <Sprite rows={LETTER.rows} palette={LETTER.palette} x={2} y={-8} />
        </g>
      )}
      <rect class="hit" x={-4} y={-10} width={24} height={26} />
    </g>
  );
}
