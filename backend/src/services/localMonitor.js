/**
 * Monitor local embutido: um "agente" rodando dentro do servidor, que coleta as métricas da
 * própria máquina e usa o mesmo caminho de ingestão dos agentes remotos.
 * Hospedado em nuvem (Render, VPS...), ele mostra as métricas DO SERVIDOR — para monitorar
 * seu PC, rode o agente nele (veja docs/deploy.md).
 */
import os from 'node:os';

export class LocalMonitor {
  constructor({ collector, machines, ingest, intervalSec = 5, farmName, logger }) {
    this.collector = collector;
    this.machines = machines;
    this.ingest = ingest;
    this.intervalSec = intervalSec;
    this.farmName = farmName;
    this.logger = logger;
    this.timer = null;
    this.running = false;
    this.machine = null;
  }

  async start() {
    this.machine = await this.machines.ensureLocal({ hostname: os.hostname(), farmName: this.farmName });
    await this.machines.update(this.machine.row.id, { intervalSec: this.intervalSec });
    await this.collector.start();
    this.running = true;
    const loop = async () => {
      if (!this.running) return;
      const t0 = Date.now();
      try {
        const snap = await this.collector.collect();
        await this.ingest.ingest(this.machine, [snap], { intervalSec: this.intervalSec });
      } catch (err) {
        this.logger?.warn(`[monitor local] falha na coleta: ${err.message}`);
      }
      this.timer = setTimeout(loop, Math.max(500, this.intervalSec * 1000 - (Date.now() - t0)));
    };
    loop();
    this.logger?.info(`[monitor local] coletando a cada ${this.intervalSec}s`);
  }

  stop() {
    this.running = false;
    clearTimeout(this.timer);
    this.collector.stop();
  }
}
