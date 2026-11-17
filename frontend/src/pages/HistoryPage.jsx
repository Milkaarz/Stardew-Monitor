import { useState } from 'preact/hooks';
import { HISTORY_RANGES, DEFAULT_THRESHOLDS } from '@stardew-monitor/shared';
import { api, qs } from '../services/api.js';
import { useStore, selectedMachine } from '../services/store.js';
import { Panel, Button, Loading, ErrorBox, useAsync, useInterval } from '../components/ui.jsx';
import { PixelChart, SERIES_COLORS as C } from '../components/PixelChart.jsx';

export function HistoryPage() {
  const payload = useStore(() => selectedMachine());
  const thresholds = useStore((s) => s.settings?.thresholds) || DEFAULT_THRESHOLDS;
  const [range, setRange] = useState('1h');
  const id = payload?.machine.id;
  const { data, loading, error, reload } = useAsync(() => (id ? api.get(`/history${qs({ machine: id, range })}`) : Promise.resolve(null)), [id, range]);
  // períodos curtos atualizam sozinhos
  useInterval(reload, range === '15m' || range === '1h' ? 15e3 : range === '6h' ? 60e3 : 0);

  const pts = data?.points || [];
  const has = (k) => pts.some((p) => p[k] != null);
  const pctTh = (t) => [{ value: t.warn, label: `aviso ${t.warn}%` }, { value: t.crit, label: `crítico ${t.crit}%` }];
  const common = { points: pts, from: data?.from, to: data?.to };

  return (
    <div class="stack">
      <Panel title={`📈 Histórico · ${payload?.machine.farmName || ''}`}>
        <div class="row spread">
          <div class="segmented" role="group" aria-label="Período">
            {Object.entries(HISTORY_RANGES).map(([k, r]) => (
              <Button key={k} small variant={range === k ? 'on' : ''} onClick={() => setRange(k)} aria-pressed={range === k} title={r.label}>{k}</Button>
            ))}
          </div>
          {data && <span class="muted">{data.label} · {pts.length} pontos · resolução {data.stepMs >= 3600e3 ? `${data.stepMs / 3600e3} h` : data.stepMs >= 60e3 ? `${data.stepMs / 60e3} min` : `${data.stepMs / 1000} s`}</span>}
        </div>
      </Panel>
      <ErrorBox error={error} onRetry={reload} />
      {loading && !data && <Panel><Loading text="Lendo o almanaque da fazenda..." /></Panel>}
      {data && (
        <div class="grid grid-2">
          <Panel><PixelChart title="⚡ CPU (%)" unit="pct" {...common} thresholds={pctTh(thresholds.cpu)}
            series={[{ key: 'cpu', label: 'Média', color: C[0] }, { key: 'cpu_max', label: 'Pico', color: C[1] }]} /></Panel>
          <Panel><PixelChart title="🌱 RAM (%)" unit="pct" {...common} thresholds={pctTh(thresholds.ram)}
            series={[{ key: 'ram', label: 'RAM', color: C[0] }, ...(has('swap') ? [{ key: 'swap', label: 'Swap', color: C[1] }] : [])]} /></Panel>
          <Panel><PixelChart title="🌬️ GPU (%)" unit="pct" {...common}
            series={[{ key: 'gpu', label: 'Uso da GPU', color: C[0] }, { key: 'vram', label: 'VRAM', color: C[1] }]} /></Panel>
          <Panel><PixelChart title="🌡️ Temperatura (°C)" unit="temp" {...common}
            thresholds={[{ value: thresholds.temperature.warn, label: `aviso ${thresholds.temperature.warn} °C` }]}
            series={[{ key: 'cpu_temp', label: 'CPU', color: C[0] }, { key: 'gpu_temp', label: 'GPU', color: C[1] }]} /></Panel>
          <Panel><PixelChart title="🛒 Rede" unit="rate" {...common}
            series={[{ key: 'net_rx', label: 'Download', color: C[0] }, { key: 'net_tx', label: 'Upload', color: C[1] }]} /></Panel>
          <Panel><PixelChart title="🏚️ Disco: ocupação (%)" unit="pct" {...common} thresholds={pctTh(thresholds.disk)}
            series={[{ key: 'disk', label: 'Disco mais cheio', color: C[0] }]} /></Panel>
          <Panel><PixelChart title="🐷 Disco: leitura e escrita" unit="rate" {...common}
            series={[{ key: 'disk_read', label: 'Leitura', color: C[0] }, { key: 'disk_write', label: 'Escrita', color: C[1] }]} /></Panel>
        </div>
      )}
      <p class="muted" style={{ color: '#fff', textShadow: '1px 1px 0 #000' }}>
        Dados guardados em camadas: leituras completas por ~26 h, médias por minuto por ~8 dias e por hora por ~400 dias (ajustável em Ajustes &gt; Retenção). Sensores ausentes aparecem sem linha.
      </p>
    </div>
  );
}
