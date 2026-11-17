/**
 * Gráfico de linha em "degraus" (visual pixelado), leve e sem bibliotecas.
 * Regras: um único eixo Y por gráfico, linhas de 2px, grade discreta, legenda para 2+ séries,
 * cruz + dica ao passar o mouse e alternativa em tabela.
 * Paleta validada (daltonismo e contraste) sobre a madeira escura #2b1a0b.
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { formatRate } from '@stardew-monitor/shared/format';

export const SERIES_COLORS = ['#c08a00', '#3a9ad9', '#e0603a'];

const H = 210;
const PAD = { l: 62, r: 10, t: 12, b: 26 };
const FONT = 14;

export const UNITS = {
  pct: { fmt: (v) => `${Math.round(v)}%`, max: () => 100 },
  temp: { fmt: (v) => `${Math.round(v)} °C`, max: (m) => Math.max(60, Math.ceil(m / 10) * 10 + 10) },
  rate: { fmt: (v) => formatRate(v), max: (m) => niceMax(m) },
};

function niceMax(m) {
  if (!m || m <= 0) return 1024;
  const pow = 1024 ** Math.floor(Math.log(m) / Math.log(1024));
  const base = m / pow;
  const step = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000].find((s) => s >= base * 1.1) || 1024;
  return step * pow;
}

const timeLabel = (ts, spanMs) =>
  new Date(ts).toLocaleString('pt-BR', spanMs > 36 * 3600e3 ? { day: '2-digit', month: '2-digit', hour: '2-digit' } : { hour: '2-digit', minute: '2-digit' });

export function PixelChart({ title, series, points, unit = 'pct', from, to, thresholds = [] }) {
  const [hover, setHover] = useState(null);
  const [table, setTable] = useState(false);
  const ref = useRef(null);
  const box = useRef(null);
  const [W, setW] = useState(600);
  const u = UNITS[unit];

  // usa a largura real (em px) para o texto ficar sempre legível
  useEffect(() => {
    if (!box.current || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(box.current);
    return () => ro.disconnect();
  }, [table]);

  const geo = useMemo(() => {
    const vals = points.flatMap((p) => series.map((s) => p[s.key])).filter((v) => v != null);
    const yMax = u.max(vals.length ? Math.max(...vals) : 0);
    const t0 = from ?? points[0]?.ts ?? 0;
    const t1 = to ?? points[points.length - 1]?.ts ?? 1;
    const x = (ts) => PAD.l + ((ts - t0) / Math.max(1, t1 - t0)) * (W - PAD.l - PAD.r);
    const y = (v) => H - PAD.b - (Math.min(v, yMax) / yMax) * (H - PAD.t - PAD.b);
    // linha em degraus; valores nulos quebram a linha (sem dados = sem traço)
    const paths = series.map((s) => {
      let d = '';
      let prev = null;
      for (const p of points) {
        const v = p[s.key];
        if (v == null) {
          prev = null;
          continue;
        }
        const px = x(p.ts).toFixed(1);
        const py = y(v).toFixed(1);
        d += prev == null ? `M${px} ${py}` : `H${px}V${py}`;
        prev = py;
      }
      return d;
    });
    return { yMax, x, y, paths, t0, t1 };
  }, [points, series, unit, from, to, W]);

  const onMove = (e) => {
    if (!points.length) return;
    const rect = ref.current.getBoundingClientRect();
    const sx = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0;
    for (let i = 1; i < points.length; i++) if (Math.abs(geo.x(points[i].ts) - sx) < Math.abs(geo.x(points[best].ts) - sx)) best = i;
    setHover({ i: best, left: (geo.x(points[best].ts) / W) * 100 });
  };

  const hp = hover != null ? points[hover.i] : null;
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const span = geo.t1 - geo.t0;

  return (
    <div class="chart">
      <div class="row spread" style={{ marginBottom: '6px' }}>
        <h3 style={{ margin: 0 }}>{title}</h3>
        <button class="btn small light" onClick={() => setTable(!table)} aria-pressed={table}>{table ? 'Ver gráfico' : 'Ver tabela'}</button>
      </div>
      {table ? (
        <div class="table-wrap" style={{ maxHeight: '260px' }}>
          <table class="wood">
            <thead><tr><th>Horário</th>{series.map((s) => <th key={s.key}>{s.label}</th>)}</tr></thead>
            <tbody>
              {[...points].reverse().map((p) => (
                <tr key={p.ts}><td>{new Date(p.ts).toLocaleString('pt-BR')}</td>{series.map((s) => <td key={s.key} class="num">{p[s.key] != null ? u.fmt(p[s.key]) : '—'}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ position: 'relative' }} ref={box}>
          <svg ref={ref} style={{ height: `${H}px` }} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title}: gráfico com ${points.length} pontos`}
            onPointerMove={onMove} onPointerLeave={() => setHover(null)} shape-rendering="crispEdges">
            {ticks.map((t) => {
              const yy = geo.y(geo.yMax * t);
              return (
                <g key={t}>
                  <line x1={PAD.l} x2={W - PAD.r} y1={yy} y2={yy} stroke="rgba(255,243,196,.12)" stroke-width="1" />
                  <text x={PAD.l - 6} y={yy + 3} text-anchor="end" fill="#e0c890" font-size={FONT} font-family="VT323, monospace">{u.fmt(geo.yMax * t)}</text>
                </g>
              );
            })}
            {thresholds.map((th) => th.value <= geo.yMax && (
              <g key={th.label}>
                <line x1={PAD.l} x2={W - PAD.r} y1={geo.y(th.value)} y2={geo.y(th.value)} stroke="rgba(255,243,196,.45)" stroke-dasharray="4 4" stroke-width="1" />
                <text x={PAD.l + 4} y={geo.y(th.value) - 3} text-anchor="start" fill="#e0c890" font-size={FONT} font-family="VT323, monospace">{th.label}</text>
              </g>
            ))}
            {[0, 0.33, 0.66, 1].map((t) => {
              const ts = geo.t0 + span * t;
              return <text key={t} x={geo.x(ts)} y={H - 6} text-anchor={t === 0 ? 'start' : t === 1 ? 'end' : 'middle'} fill="#e0c890" font-size={FONT} font-family="VT323, monospace">{timeLabel(ts, span)}</text>;
            })}
            {geo.paths.map((d, i) => d && <path key={series[i].key} d={d} fill="none" stroke={series[i].color || SERIES_COLORS[i]} stroke-width="2" shape-rendering="auto" stroke-linejoin="round" />)}
            {hp && (
              <g>
                <line x1={geo.x(hp.ts)} x2={geo.x(hp.ts)} y1={PAD.t} y2={H - PAD.b} stroke="#fff3c4" stroke-width="1" opacity="0.6" />
                {series.map((s, i) => hp[s.key] != null && (
                  <rect key={s.key} x={geo.x(hp.ts) - 4} y={geo.y(hp[s.key]) - 4} width="8" height="8" fill={s.color || SERIES_COLORS[i]} stroke="#2b1a0b" stroke-width="2" />
                ))}
              </g>
            )}
            {!points.length && <text x={W / 2} y={H / 2} text-anchor="middle" fill="#e0c890" font-size={FONT + 2} font-family="VT323, monospace">Sem dados neste período</text>}
          </svg>
          {hp && (
            <div class="tooltip" style={{ left: hover.left > 60 ? 'auto' : `calc(${hover.left}% + 12px)`, right: hover.left > 60 ? `calc(${100 - hover.left}% + 12px)` : 'auto' }}>
              <div class="muted">{new Date(hp.ts).toLocaleString('pt-BR')}</div>
              {series.map((s, i) => (
                <div key={s.key}><span class="swatch" style={{ background: s.color || SERIES_COLORS[i] }} />{s.label}: <b class="num">{hp[s.key] != null ? u.fmt(hp[s.key]) : '—'}</b></div>
              ))}
            </div>
          )}
        </div>
      )}
      {series.length > 1 && (
        <div class="legend-row">
          {series.map((s, i) => <span key={s.key}><span class="swatch" style={{ background: s.color || SERIES_COLORS[i] }} />{s.label}</span>)}
        </div>
      )}
    </div>
  );
}
