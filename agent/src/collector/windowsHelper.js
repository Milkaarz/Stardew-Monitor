/**
 * Ajudante do Windows: UM processo PowerShell de longa duração que imprime, a cada intervalo,
 * os contadores acumulados de rede e disco (Performance Counters) e — se o LibreHardwareMonitor
 * ou OpenHardwareMonitor estiver rodando — as temperaturas e ventoinhas.
 *
 * Manter um processo vivo custa bem menos CPU do que abrir um PowerShell a cada leitura.
 */
import { spawn } from 'node:child_process';

const SCRIPT = (intervalMs) => `
$ErrorActionPreference = 'SilentlyContinue'
$ns = $null
foreach ($c in @('root/LibreHardwareMonitor','root/OpenHardwareMonitor')) {
  try { Get-CimInstance -Namespace $c -ClassName Sensor -ErrorAction Stop | Select-Object -First 1 | Out-Null; $ns = $c; break } catch {}
}
$tick = 0
while ($true) {
  $o = @{ t = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds(); lhm = [bool]$ns }
  $o.net = @(Get-CimInstance Win32_PerfRawData_Tcpip_NetworkInterface | ForEach-Object { @{ n = $_.Name; rx = [uint64]$_.BytesReceivedPersec; tx = [uint64]$_.BytesSentPersec } })
  $d = Get-CimInstance Win32_PerfRawData_PerfDisk_PhysicalDisk -Filter "Name='_Total'"
  if ($d) { $o.dr = [uint64]$d.DiskReadBytesPersec; $o.dw = [uint64]$d.DiskWriteBytesPersec }
  if ($ns) {
    $o.s = @(Get-CimInstance -Namespace $ns -ClassName Sensor | Where-Object { $_.SensorType -eq 'Temperature' -or $_.SensorType -eq 'Fan' } | ForEach-Object { @{ n = $_.Name; k = $_.SensorType; v = $_.Value; p = $_.Parent } })
  } elseif (($tick % 60) -eq 59) {
    foreach ($c in @('root/LibreHardwareMonitor','root/OpenHardwareMonitor')) {
      try { Get-CimInstance -Namespace $c -ClassName Sensor -ErrorAction Stop | Select-Object -First 1 | Out-Null; $ns = $c; break } catch {}
    }
  }
  try { [Console]::Out.WriteLine(($o | ConvertTo-Json -Compress -Depth 4)); [Console]::Out.Flush() } catch { exit }
  # se o processo Node que nos criou sumir, encerra também
  if (-not (Get-Process -Id ${process.pid} -ErrorAction SilentlyContinue)) { exit }
  $tick++
  Start-Sleep -Milliseconds ${Math.max(1000, intervalMs | 0)}
}
`;

const IGNORED_NET = /teredo|isatap|loopback|pseudo|6to4|kernel debug/i;

/** Escolhe e soma as interfaces relevantes (exportado para testes). */
export function sumNetworkCounters(list = []) {
  let rx = 0, tx = 0, used = [];
  for (const n of list) {
    if (!n || IGNORED_NET.test(n.n || '')) continue;
    rx += Number(n.rx) || 0;
    tx += Number(n.tx) || 0;
    used.push(n.n);
  }
  return { rx, tx, names: used };
}

/** Separa sensores do LibreHardwareMonitor em temperatura de CPU e ventoinhas. */
export function parseSensors(sensors = []) {
  const temps = sensors.filter((s) => s && s.k === 'Temperature' && Number.isFinite(+s.v));
  const cpuTemps = temps.filter((s) => /cpu|amdcpu|intelcpu/i.test(s.p || '') || /cpu package|tctl|tdie|core/i.test(s.n || ''));
  const pkg = cpuTemps.find((s) => /package|tctl|tdie/i.test(s.n || ''));
  const cpuTemp = pkg ? +pkg.v : cpuTemps.length ? Math.max(...cpuTemps.map((s) => +s.v)) : null;
  const fans = sensors
    .filter((s) => s && s.k === 'Fan' && Number.isFinite(+s.v) && +s.v > 0)
    .map((s) => ({ name: s.n, rpm: Math.round(+s.v) }));
  return { cpuTemp, fans };
}

export class WindowsHelper {
  constructor({ intervalMs = 2000, logger = console } = {}) {
    this.intervalMs = intervalMs;
    this.logger = logger;
    this.child = null;
    this.latest = null;
    this.prev = null;
    this.rates = null;
    this.stopped = false;
    this.failures = 0;
    this.buffer = '';
  }

  start() {
    if (process.platform !== 'win32' || this.child) return;
    this.stopped = false;
    const encoded = Buffer.from(SCRIPT(this.intervalMs), 'utf16le').toString('base64');
    const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encoded], {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    this.child = child;
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => this.#onData(chunk));
    child.on('error', (err) => {
      this.logger.warn?.(`[coletor] ajudante do Windows indisponível: ${err.message}`);
    });
    child.on('exit', () => {
      this.child = null;
      if (this.stopped) return;
      this.failures++;
      const delay = Math.min(60e3, 2000 * 2 ** Math.min(this.failures, 5));
      setTimeout(() => !this.stopped && this.start(), delay).unref?.();
    });
  }

  #onData(chunk) {
    this.buffer += chunk;
    let idx;
    while ((idx = this.buffer.indexOf('\n')) >= 0) {
      const line = this.buffer.slice(0, idx).trim();
      this.buffer = this.buffer.slice(idx + 1);
      if (!line.startsWith('{')) continue;
      try {
        this.#ingest(JSON.parse(line));
        this.failures = 0;
      } catch {
        /* linha incompleta: ignora */
      }
    }
    if (this.buffer.length > 1e6) this.buffer = '';
  }

  #ingest(o) {
    const net = sumNetworkCounters([].concat(o.net || []));
    const cur = { t: o.t, rx: net.rx, tx: net.tx, dr: Number(o.dr) || 0, dw: Number(o.dw) || 0, iface: net.names[0] || null };
    if (this.prev && cur.t > this.prev.t) {
      const dt = (cur.t - this.prev.t) / 1000;
      const rate = (a, b) => (a >= b ? (a - b) / dt : null); // contador zerado: descarta
      this.rates = {
        rxSec: rate(cur.rx, this.prev.rx),
        txSec: rate(cur.tx, this.prev.tx),
        readSec: rate(cur.dr, this.prev.dr),
        writeSec: rate(cur.dw, this.prev.dw),
      };
    }
    this.prev = cur;
    const sensors = o.lhm ? parseSensors([].concat(o.s || [])) : null;
    this.latest = { ...cur, at: Date.now(), sensors };
  }

  /** Último dado (descarta se estiver velho demais). */
  read() {
    if (!this.latest || Date.now() - this.latest.at > this.intervalMs * 5) return null;
    return { ...this.latest, rates: this.rates };
  }

  stop() {
    this.stopped = true;
    if (this.child) {
      this.child.kill();
      this.child = null;
    }
  }
}
