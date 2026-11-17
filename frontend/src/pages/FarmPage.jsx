/**
 * Painel principal: a fazenda interativa + cartões com os números reais de cada recurso.
 */
import { useState } from 'preact/hooks';
import {
  formatBytes, formatRate, formatPercent, formatTemp, formatUptimeLong, splitDuration,
  gpuSummary, WEATHER_LABELS, PHASE_LABELS, SEASON_LABELS,
} from '@stardew-monitor/shared';
import { useStore, selectedMachine } from '../services/store.js';
import { useFarmView } from '../services/farmState.js';
import { FarmScene } from '../farm/FarmScene.jsx';
import { Panel, Metric, KV, Bar, Empty, Loading, StatusPill, useNow, timeAgo, levelClass } from '../components/ui.jsx';

const WEATHER_ICON = { sunny: '☀️', cloudy: '⛅', rain: '🌧️', storm: '⛈️', hot: '🌡️', heatwave: '🔥' };
const weatherIcon = (kind, season, phase) => {
  if (season === 'winter' && (kind === 'rain' || kind === 'storm')) return '❄️';
  if (phase === 'night' && kind === 'sunny') return '🌙';
  return WEATHER_ICON[kind] || '☀️';
};
const weatherLabel = (kind, phase) => (phase === 'night' && kind === 'sunny' ? 'Céu limpo' : WEATHER_LABELS[kind]);

function Stamina({ stamina }) {
  if (!stamina) return null;
  const icon = stamina.state === 'charging' ? '⚡' : stamina.state === 'plugged' ? '🔌' : '';
  return (
    <div class={`stamina ${levelClass(stamina.level)}`} title={`Bateria: ${Math.round(stamina.pct)}%`} role="img" aria-label={`Estamina (bateria) ${Math.round(stamina.pct)}%`}>
      <span class="charging" aria-hidden="true">{icon}</span>
      <div class="tube"><div class="fill" style={{ height: `${Math.max(2, Math.min(100, stamina.pct))}%` }} /></div>
      <span class="e">E</span>
    </div>
  );
}

function CoreGrid({ cores }) {
  return (
    <div class="cores">
      {cores.map((c, i) => {
        const lvl = c >= 90 ? 'crit' : c >= 70 ? 'warn' : 'ok';
        return (
          <div class={`core ${levelClass(lvl)}`} key={i} title={`Núcleo ${i + 1}: ${Math.round(c)}%`}>
            <div class="col"><div style={{ height: `${Math.max(0, Math.min(100, c))}%` }} /></div>
            <span class="num">{Math.round(c)}%</span>
          </div>
        );
      })}
    </div>
  );
}

/** Detalhes completos do recurso escolhido (clique numa construção ou cartão). */
function Detail({ kind, snap, farm, view, payload }) {
  const gpu = gpuSummary(snap);
  switch (kind) {
    case 'cpu':
      return (
        <>
          <h3>🏠 Casa da fazenda · Processador</h3>
          <KV rows={[
            ['Modelo', snap.cpu?.model],
            ['Núcleos / threads', `${snap.cpu?.physicalCores ?? '?'} / ${snap.cpu?.threads ?? '?'}`],
            ['Velocidade', snap.cpu?.speedGHz ? `${snap.cpu.speedGHz} GHz` : null],
            ['Uso agora', formatPercent(snap.cpu?.load, 1)],
            ['Média (1 min)', formatPercent(payload.derived?.cpuAvg1m, 1)],
            ['Média (5 min)', payload.derived?.cpuAvg5m != null ? formatPercent(payload.derived.cpuAvg5m, 1) : 'coletando...'],
            ['Temperatura', formatTemp(snap.cpu?.temp)],
            ['Carga média (1/5/15)', snap.cpu?.loadAvg ? snap.cpu.loadAvg.join(' / ') : null],
          ]} />
          {snap.cpu?.temp == null && <p class="muted">Sensor de temperatura indisponível neste sistema. No Windows, rode o LibreHardwareMonitor para habilitar.</p>}
          <h3 style={{ marginTop: '14px' }}>Núcleos</h3>
          <CoreGrid cores={snap.cpu?.cores || []} />
        </>
      );
    case 'ram':
      return (
        <>
          <h3>🌱 Plantação · Memória RAM</h3>
          <Metric label="RAM" value={formatPercent(snap.mem?.pct, 1)} bar={snap.mem?.pct} level={farm.crops.level} detail={`${farm.crops.full} de ${farm.crops.plots} canteiros crescidos`} />
          {snap.mem?.swap && <Metric label="Swap" value={formatPercent(snap.mem.swap.pct, 1)} bar={snap.mem.swap.pct} level={snap.mem.swap.pct >= 80 ? 'warn' : 'ok'} detail={`${formatBytes(snap.mem.swap.used)} de ${formatBytes(snap.mem.swap.total)}`} />}
          <KV rows={[['Em uso', formatBytes(snap.mem?.used)], ['Disponível', formatBytes(snap.mem?.available)], ['Total', formatBytes(snap.mem?.total)]]} />
        </>
      );
    case 'disk':
      return (
        <>
          <h3>🏚️ Celeiro e silos · Armazenamento</h3>
          {(snap.disks || []).map((d, i) => (
            <Metric key={d.mount} label={`${d.name} ${d.fs ? `(${d.fs})` : ''}`} value={formatPercent(d.pct, 1)} bar={d.pct} level={farm.silos[i]?.level}
              detail={`${formatBytes(d.used)} usados · ${formatBytes(d.free)} livres · ${formatBytes(d.size)} no total${farm.silos[i]?.message ? ` · ${farm.silos[i].message}` : ''}`} />
          ))}
          {!snap.disks?.length && <Empty>Nenhum disco informado.</Empty>}
          <KV rows={[['Leitura agora', formatRate(snap.diskIO?.readSec)], ['Escrita agora', formatRate(snap.diskIO?.writeSec)]]} />
          {!snap.diskIO && <p class="muted">Atividade de disco indisponível neste sistema.</p>}
        </>
      );
    case 'net':
      return (
        <>
          <h3>🛒 Carroça e correio · Rede</h3>
          {snap.net ? (
            <KV rows={[
              ['Interface', snap.net.iface],
              ['⬇ Download', formatRate(snap.net.rxSec)],
              ['⬆ Upload', formatRate(snap.net.txSec)],
              ['Total recebido', formatBytes(snap.net.rxTotal)],
              ['Total enviado', formatBytes(snap.net.txTotal)],
              ['Carroça', ['parada', 'devagar', 'trotando', 'a todo galope'][farm.cart.speed]],
            ]} />
          ) : <Empty>Dados de rede indisponíveis.</Empty>}
        </>
      );
    case 'gpu':
      return (
        <>
          <h3>🌬️ Moinho · Placa de vídeo</h3>
          {(snap.gpus || []).length ? (snap.gpus || []).map((g, i) => (
            <div key={i} class="stack" style={{ marginBottom: '12px' }}>
              <b>{g.name}</b>
              {g.util != null && <Metric label="Uso" value={formatPercent(g.util)} bar={g.util} level={farm.mill.level} />}
              {g.vramTotal != null && g.vramUsed != null && (
                <Metric label="VRAM" value={formatPercent((g.vramUsed / g.vramTotal) * 100)} bar={(g.vramUsed / g.vramTotal) * 100} level="ok"
                  detail={`${formatBytes(g.vramUsed)} usados · ${formatBytes(g.vramTotal - g.vramUsed)} livres · ${formatBytes(g.vramTotal)} no total`} />
              )}
              <KV rows={[['Temperatura', formatTemp(g.temp)], ['Ventoinha', g.fanPct != null ? `${g.fanPct}%` : null], ['Consumo', g.powerW != null ? `${g.powerW.toFixed(1)} W` : null], ['Fabricante', g.vendor]]} />
              {g.util == null && <p class="muted">Sem telemetria de uso para esta placa (suportado: NVIDIA via nvidia-smi e AMD no Linux).</p>}
            </div>
          )) : <Empty>Nenhuma placa de vídeo detectada.</Empty>}
          {gpu?.count > 1 && <p class="muted">O moinho mostra a GPU mais ocupada.</p>}
        </>
      );
    case 'weather':
      return (
        <>
          <h3>{weatherIcon(farm.weather.kind, view.season.season, view.day.phase)} Clima · Temperatura e ventoinhas</h3>
          <KV rows={[
            ['Clima agora', weatherLabel(farm.weather.kind, view.day.phase)],
            ['Por quê', farm.weather.reasons.join('; ')],
            ['CPU', formatTemp(snap.cpu?.temp)],
            ['GPU', formatTemp(gpu?.temp)],
            ['Vento', farm.weather.wind.known ? ['calmo', 'brisa', 'ventania', 'vendaval'][farm.weather.wind.level] : 'sem sensores de ventoinha'],
          ]} />
          <h3 style={{ marginTop: '14px' }}>Ventoinhas</h3>
          {snap.fans?.length ? (
            <KV rows={snap.fans.map((f) => [f.name, `${f.rpm} RPM`])} />
          ) : (
            <p class="muted">RPM indisponível neste hardware/sistema{gpu?.fanPct != null ? ` (ventoinha da GPU: ${gpu.fanPct}%)` : ''}. No Linux é lido do hwmon; no Windows, via LibreHardwareMonitor.</p>
          )}
        </>
      );
    case 'battery':
      return (
        <>
          <h3>⚡ Estamina · Bateria</h3>
          {snap.battery ? (
            <>
              <Metric label="Carga" value={formatPercent(snap.battery.pct)} bar={snap.battery.pct} level={farm.stamina?.level} />
              <KV rows={[
                ['Estado', snap.battery.charging ? 'Carregando' : snap.battery.acConnected ? 'Conectado na energia' : 'Descarregando'],
                ['Tempo restante', snap.battery.timeRemainingMin != null ? `${snap.battery.timeRemainingMin} min` : null],
              ]} />
            </>
          ) : <Empty>Esta máquina não tem bateria.</Empty>}
        </>
      );
    case 'uptime': {
      const d = splitDuration(payload.farmSeconds || 0);
      return (
        <>
          <h3>📅 Dias na fazenda · Uptime</h3>
          <KV rows={[
            ['Ligado há', formatUptimeLong(snap.uptimeSec)],
            ['Tempo acumulado na fazenda', `${d.days} dias, ${d.hours} h e ${d.minutes} min`],
            ['Última leitura', timeAgo(payload.receivedAt)],
          ]} />
          <p class="muted">O tempo acumulado conta enquanto a fazenda envia dados e vale para as conquistas Fazendeiro Dedicado e Veterano da Fazenda.</p>
          <a class="btn light small" href="#/achievements">Ver conquistas</a>
        </>
      );
    }
    default:
      return null;
  }
}

function ResourceCard({ icon, title, value, sub, level = 'ok', pct, onClick, active }) {
  return (
    <Panel class={`resource-card ${active ? 'focused' : ''}`} onClick={onClick} aria-pressed={active}>
      <div class="head">
        <span class="pixel" style={{ fontSize: '.55rem' }}>{icon} {title}</span>
        <span class={`dot ${levelClass(level)}`} aria-hidden="true" />
      </div>
      <span class="big num">{value}</span>
      {pct != null && <Bar value={pct} level={level} label={title} />}
      {sub && <span class="sub">{sub}</span>}
    </Panel>
  );
}

export function FarmPage() {
  const payload = useStore(() => selectedMachine());
  const settings = useStore((s) => s.settings);
  const now = useNow(30e3);
  const view = useFarmView(payload, settings, now);
  const [focus, setFocus] = useState(null);

  if (!payload) return <Panel><Loading text="Procurando fazendas..." /></Panel>;
  const m = payload.machine;
  if (!view?.farm) {
    return (
      <Panel title={`🌾 ${m.farmName}`}>
        <Empty>{m.status === 'offline' ? 'Esta fazenda ainda não enviou dados. Verifique se o agente está rodando.' : view?.message || 'Aguardando dados...'}</Empty>
      </Panel>
    );
  }
  const { farm, season, day, festival } = view;
  const snap = payload.snapshot;
  const gpu = gpuSummary(snap);
  const toggle = (k) => setFocus((f) => (f === k ? null : k));

  return (
    <div class={`farm-layout ${focus ? 'with-detail' : ''}`}>
      <div class="stack">
        <div class="farm-frame">
          <FarmScene
            farm={farm}
            theme={m.theme}
            season={season}
            day={day}
            festival={festival}
            focused={focus}
            onSelect={toggle}
            label={`Fazenda ${m.farmName}: ${view.message}`}
          />
          <div class="hud hud-message">
            <div class="status-card" role="status" aria-live="polite">
              <svg class="face" viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">
                <rect x="4" y="4" width="8" height="7" fill="#3b2412" /><rect x="5" y="1" width="6" height="3" fill="#f2d06b" /><rect x="2" y="4" width="12" height="1" fill="#e8c25a" />
                <rect x="5" y="6" width="6" height="4" fill="#f5c49a" /><rect x="6" y="7" width="1" height="1" fill="#3b2412" /><rect x="9" y="7" width="1" height="1" fill="#3b2412" />
                <rect x="7" y="9" width="2" height="1" fill={farm.overall === 'ok' ? '#b3402a' : '#3b2412'} /><rect x="3" y="11" width="10" height="5" fill="#d9381e" /><rect x="5" y="11" width="6" height="5" fill="#3a6fb8" />
              </svg>
              <span>{view.message}</span>
            </div>
          </div>
          <div class="hud hud-date">
            <div class="datebox">
              <span class="pixel">{SEASON_LABELS[season.season]}</span>
              <span class="num">Dia {season.day}</span>
              <span aria-hidden="true">{weatherIcon(farm.weather.kind, season.season, day.phase)}</span>
              <span>{weatherLabel(farm.weather.kind, day.phase)}</span>
              <span class="pixel">{PHASE_LABELS[day.phase]}</span>
              <span class="num">{now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
          <div class="hud hud-stamina">
            <Stamina stamina={farm.stamina} />
          </div>
        </div>

        <div class="row spread">
          <div class="row">
            <StatusPill status={m.status} />
            <span class="pixel" style={{ fontSize: '.6rem', color: '#fff', textShadow: '2px 2px 0 #000' }}>{m.farmName}</span>
            <span style={{ color: '#fff', textShadow: '1px 1px 0 #000' }}>· {m.hostname || m.name} · atualizado {timeAgo(payload.receivedAt, now.getTime())}</span>
          </div>
          {festival && <span class="pill lvl-ok">🎉 {festival.name}</span>}
        </div>

        <div class="grid grid-4">
          <ResourceCard icon="🏠" title="Casa · CPU" value={formatPercent(snap.cpu?.load)} pct={snap.cpu?.load} level={farm.house.level} active={focus === 'cpu'}
            sub={`${snap.cpu?.physicalCores ?? '?'} núcleos / ${snap.cpu?.threads ?? '?'} threads · ${formatTemp(snap.cpu?.temp)}`} onClick={() => toggle('cpu')} />
          <ResourceCard icon="🌱" title="Plantação · RAM" value={formatPercent(snap.mem?.pct)} pct={snap.mem?.pct} level={farm.crops.level} active={focus === 'ram'}
            sub={`${formatBytes(snap.mem?.used)} de ${formatBytes(snap.mem?.total)} · ${formatBytes(snap.mem?.available)} livres`} onClick={() => toggle('ram')} />
          <ResourceCard icon="🏚️" title="Silo · Disco" value={farm.silos.length ? formatPercent(Math.max(...farm.silos.map((s) => s.pct || 0))) : '—'}
            pct={farm.silos.length ? Math.max(...farm.silos.map((s) => s.pct || 0)) : null} level={farm.levels.disk} active={focus === 'disk'}
            sub={farm.silos.find((s) => s.message)?.message || `${farm.silos.length} unidade(s)`} onClick={() => toggle('disk')} />
          <ResourceCard icon="🛒" title="Carroça · Rede" value={`⬇ ${formatRate(snap.net?.rxSec)}`} active={focus === 'net'}
            sub={`⬆ ${formatRate(snap.net?.txSec)} · ${snap.net?.iface || 'sem interface'}`} onClick={() => toggle('net')} />
          <ResourceCard icon="🌬️" title="Moinho · GPU" value={gpu ? (gpu.util != null ? formatPercent(gpu.util) : 'sem uso') : 'sem GPU'} pct={gpu?.util} level={farm.mill.level} active={focus === 'gpu'}
            sub={gpu ? `${formatTemp(gpu.temp)}${gpu.vramTotal ? ` · VRAM ${formatBytes(gpu.vramUsed)} / ${formatBytes(gpu.vramTotal)}` : ''}` : 'Nenhuma placa detectada'} onClick={() => toggle('gpu')} />
          <ResourceCard icon={weatherIcon(farm.weather.kind, season.season, day.phase)} title="Clima · Temperatura" value={weatherLabel(farm.weather.kind, day.phase)} active={focus === 'weather'}
            level={farm.house.hot ? farm.house.level : 'ok'} sub={`CPU ${formatTemp(snap.cpu?.temp)}${snap.fans?.length ? ` · ${Math.max(...snap.fans.map((f) => f.rpm))} RPM` : ''}`} onClick={() => toggle('weather')} />
          {farm.stamina && (
            <ResourceCard icon="⚡" title="Estamina · Bateria" value={formatPercent(farm.stamina.pct)} pct={farm.stamina.pct} level={farm.stamina.level} active={focus === 'battery'}
              sub={{ charging: 'Carregando', plugged: 'Na tomada', discharging: 'Descarregando' }[farm.stamina.state]} onClick={() => toggle('battery')} />
          )}
          <ResourceCard icon="📅" title="Dias na fazenda" value={`${farm.uptime.days}d ${farm.uptime.hours}h ${farm.uptime.minutes}m`} active={focus === 'uptime'}
            sub={`Acumulado: ${Math.floor((payload.farmSeconds || 0) / 86400)} dias`} onClick={() => toggle('uptime')} />
        </div>
      </div>

      {focus && (
        <aside class="detail-panel">
          <Panel title="🔎 Detalhes">
            <Detail kind={focus} snap={snap} farm={farm} view={view} payload={payload} />
            <div class="row" style={{ marginTop: '12px' }}>
              <button class="btn small light" onClick={() => setFocus(null)}>Fechar</button>
              <a class="btn small" href="#/history">Ver histórico</a>
            </div>
          </Panel>
        </aside>
      )}
    </div>
  );
}
