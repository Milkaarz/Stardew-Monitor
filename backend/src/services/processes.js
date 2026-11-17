/**
 * Moradores (processos): listagem com filtros e a ação protegida "Expulsar morador".
 */
import { protectionReason } from '@stardew-monitor/shared';
import { killProcess } from '@stardew-monitor/agent/actions';

export class ProcessService {
  constructor({ collector, machines, commands, audit, config }) {
    this.collector = collector;
    this.machines = machines;
    this.commands = commands;
    this.audit = audit;
    this.config = config;
  }

  async rawList(machine) {
    if (machine.row.is_local) {
      if (!this.collector) throw Object.assign(new Error('O monitor local está desativado neste servidor.'), { status: 409 });
      return { list: await this.collector.processes(), at: Date.now(), platform: process.platform, live: true };
    }
    // máquina remota: pede ao agente para mandar a lista nos próximos envios
    machine.live.wantsProcessesUntil = Date.now() + 60e3;
    return {
      list: machine.live.processes || [],
      at: machine.live.processesAt || null,
      platform: machine.row.info?.platform || 'linux',
      live: false,
    };
  }

  /**
   * @param {{ sort?: 'cpu'|'mem'|'name'|'pid', order?: 'asc'|'desc', limit?: number, q?: string, filter?: string }} opts
   */
  async list(machine, { sort = 'cpu', order = 'desc', limit = 25, q = '', filter = 'all' } = {}, { isAdmin = false } = {}) {
    const { list, at, platform, live } = await this.rawList(machine);
    const now = Date.now();
    const query = String(q || '').trim().toLowerCase();
    let items = list.filter((p) => {
      if (query && !String(p.name).toLowerCase().includes(query) && String(p.pid) !== query) return false;
      if (filter === 'active' && !(p.cpu > 0.5)) return false;
      if (filter === 'heavy' && !(p.cpu >= 5 || p.mem >= 5)) return false;
      if (filter === 'user' && !p.user) return false;
      return true;
    });
    const dir = order === 'asc' ? 1 : -1;
    const key = { cpu: (p) => p.cpu ?? 0, mem: (p) => p.mem ?? 0, name: (p) => String(p.name).toLowerCase(), pid: (p) => p.pid }[sort] || ((p) => p.cpu ?? 0);
    items.sort((a, b) => (key(a) > key(b) ? dir : key(a) < key(b) ? -dir : 0));
    const total = items.length;
    items = items.slice(0, limit).map((p) => {
      const prot = protectionReason(p, {
        platform,
        selfPid: machine.row.is_local ? process.pid : null,
        parentPid: machine.row.is_local ? process.ppid : null,
        extra: this.config.protectedProcesses,
      });
      return {
        pid: p.pid,
        name: p.name,
        user: p.user || null,
        cpu: p.cpu,
        mem: p.mem,
        memRss: p.memRss ?? null,
        runtimeSec: p.started ? Math.max(0, Math.round((now - p.started) / 1000)) : null,
        state: p.state || null,
        protected: prot.protected,
        protectedReason: isAdmin ? prot.reason || null : undefined,
      };
    });
    const canKill = isAdmin && (machine.row.is_local ? this.config.allowProcessKill : true);
    return { machineId: machine.row.id, total, at, live, items, canKill, platform };
  }

  async kill(machine, { pid, name }, { user, ip }) {
    const target = `${machine.row.farm_name}:${pid}`;
    if (machine.row.is_local) {
      if (!this.config.allowProcessKill) {
        await this.audit.log({ user, action: 'process.kill', target, details: { name, reason: 'desativado' }, ip, success: false });
        throw Object.assign(new Error('Encerrar processos está desativado neste servidor (ALLOW_PROCESS_KILL=false).'), { status: 403 });
      }
      const r = await killProcess({ pid, name, collector: this.collector, extraProtected: this.config.protectedProcesses });
      await this.audit.log({ user, action: 'process.kill', target, details: { name, code: r.code || null, error: r.error || null }, ip, success: r.ok });
      if (!r.ok) {
        const status = { protected: 403, permission: 403, not_found: 404, mismatch: 409, invalid: 400 }[r.code] || 500;
        throw Object.assign(new Error(r.error), { status });
      }
      this.collector.procCache.at = 0; // força nova lista
      return { ok: true, mode: 'local', process: r.process };
    }
    // remota: confere a proteção pelo último retrato conhecido e enfileira para o agente
    const known = (machine.live.processes || []).find((p) => p.pid === Number(pid));
    const prot = protectionReason(known || { pid, name }, { platform: machine.row.info?.platform || 'linux', extra: this.config.protectedProcesses });
    if (prot.protected) {
      await this.audit.log({ user, action: 'process.kill.remote', target, details: { name, reason: prot.reason }, ip, success: false });
      throw Object.assign(new Error(`Morador protegido: ${prot.reason}`), { status: 403 });
    }
    const cmd = await this.commands.enqueue(machine.row.id, 'kill', { pid: Number(pid), name }, user);
    await this.audit.log({ user, action: 'process.kill.remote', target, details: { name, commandId: cmd.id }, ip, success: true });
    return { ok: true, mode: 'remote', commandId: cmd.id, message: 'Ordem enviada ao agente. Ela será executada no próximo envio, se o agente permitir.' };
  }
}
