/**
 * Laço principal do agente: coleta -> guarda em buffer -> envia em lotes.
 * Se o servidor ficar fora do ar, as leituras ficam no buffer (limitado) e são enviadas
 * quando a conexão voltar, com espera exponencial entre as tentativas.
 */
import { killProcess } from './actions.js';

export class Agent {
  constructor(config, { collector, client, logger = console }) {
    this.config = config;
    this.collector = collector;
    this.client = client;
    this.logger = logger;
    this.buffer = [];
    this.results = [];
    this.failures = 0;
    this.nextAttemptAt = 0;
    this.wantProcessesUntil = 0;
    this.timer = null;
    this.running = false;
    this.lastProcessesAt = 0;
  }

  async start() {
    this.running = true;
    await this.collector.start();
    this.logger.info?.(`[agente] enviando para ${this.config.serverUrl} a cada ${this.config.intervalSec}s`);
    const loop = async () => {
      if (!this.running) return;
      const started = Date.now();
      try {
        await this.tick();
      } catch (err) {
        this.logger.warn?.(`[agente] erro no ciclo: ${err.message}`);
      }
      const wait = Math.max(500, this.config.intervalSec * 1000 - (Date.now() - started));
      this.timer = setTimeout(loop, wait);
    };
    loop();
  }

  async tick(now = Date.now()) {
    const snap = await this.collector.collect();
    const procsEvery = this.config.processEverySec * 1000;
    const wants = now < this.wantProcessesUntil || (procsEvery > 0 && now - this.lastProcessesAt >= procsEvery);
    if (wants) {
      try {
        snap.processes = await this.collector.topProcesses(this.config.processesTop);
        this.lastProcessesAt = now;
      } catch {
        /* sem processos neste ciclo */
      }
    }
    this.buffer.push(snap);
    if (this.buffer.length > this.config.maxBuffer) this.buffer.splice(0, this.buffer.length - this.config.maxBuffer);
    if (now >= this.nextAttemptAt) await this.flush(now);
  }

  async flush(now = Date.now()) {
    const batch = this.buffer.slice(0, 50);
    const results = this.results.splice(0);
    if (!batch.length && !results.length) return;
    try {
      const res = await this.client.post('/api/agent/metrics', { samples: batch, commandResults: results });
      this.buffer.splice(0, batch.length);
      if (this.failures) this.logger.info?.('[agente] conexão restabelecida');
      this.failures = 0;
      this.nextAttemptAt = 0;
      await this.#handleResponse(res || {});
      if (this.buffer.length) await this.flush(now); // descarrega o restante do buffer
    } catch (err) {
      this.results.unshift(...results);
      this.failures++;
      const backoff = Math.min(300e3, this.config.intervalSec * 1000 * 2 ** Math.min(this.failures, 6));
      this.nextAttemptAt = now + backoff;
      const hint = err.status === 401 || err.status === 403 ? ' (token inválido ou máquina removida?)' : '';
      this.logger.warn?.(`[agente] falha no envio: ${err.message}${hint} · ${this.buffer.length} leitura(s) aguardando · nova tentativa em ${Math.round(backoff / 1000)}s`);
    }
  }

  async #handleResponse(res) {
    if (res.sendProcesses) this.wantProcessesUntil = Date.now() + 60e3;
    if (Number.isFinite(res.intervalSec) && res.intervalSec >= 2 && res.intervalSec <= 3600) this.config.intervalSec = res.intervalSec;
    for (const cmd of res.commands || []) {
      this.results.push(await this.execute(cmd));
    }
  }

  async execute(cmd) {
    if (cmd.type === 'kill') {
      if (!this.config.allowRemoteKill) {
        return { id: cmd.id, ok: false, error: 'Este agente não permite encerrar processos remotamente (STARDEW_ALLOW_REMOTE_KILL=false).' };
      }
      const r = await killProcess({
        pid: cmd.payload?.pid,
        name: cmd.payload?.name,
        collector: this.collector,
        extraProtected: this.config.protectedProcesses,
      });
      this.logger.info?.(`[agente] expulsar morador ${cmd.payload?.name} (${cmd.payload?.pid}): ${r.ok ? 'ok' : r.error}`);
      return { id: cmd.id, ...r };
    }
    return { id: cmd.id, ok: false, error: `Comando desconhecido: ${cmd.type}` };
  }

  async stop() {
    this.running = false;
    clearTimeout(this.timer);
    try {
      await this.client.post('/api/agent/goodbye', { reason: 'shutdown' }, { timeoutMs: 3000 });
    } catch {
      /* servidor fora do ar: ele vai detectar a ausência sozinho */
    }
    this.collector.stop();
  }
}
