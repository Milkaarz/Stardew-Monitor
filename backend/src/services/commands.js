/**
 * Fila de comandos para agentes remotos (ex.: "Expulsar morador").
 * O agente só recebe comandos na resposta ao seu próprio envio autenticado — o servidor
 * nunca abre conexão com a máquina — e só executa se tiver STARDEW_ALLOW_REMOTE_KILL=true.
 */
import { parseJson } from '../lib/json.js';

const COMMAND_TTL_MS = 5 * 60e3;

export class CommandService {
  constructor(db, { bus, audit }) {
    this.db = db;
    this.bus = bus;
    this.audit = audit;
  }

  async enqueue(machineId, type, payload) {
    const now = Date.now();
    const id = await this.db.insert(
      'INSERT INTO agent_commands (machine_id, type, payload, status, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [machineId, type, JSON.stringify(payload), 'pending', null, now, now],
    );
    return { id, status: 'pending' };
  }

  /** Entrega os comandos pendentes (e expira os antigos demais). */
  async takePending(machineId) {
    const now = Date.now();
    await this.db.run("UPDATE agent_commands SET status = 'expired', updated_at = ? WHERE machine_id = ? AND status = 'pending' AND created_at < ?", [now, machineId, now - COMMAND_TTL_MS]);
    const rows = await this.db.all("SELECT * FROM agent_commands WHERE machine_id = ? AND status = 'pending' ORDER BY id LIMIT 10", [machineId]);
    for (const r of rows) await this.db.run("UPDATE agent_commands SET status = 'sent', updated_at = ? WHERE id = ?", [now, r.id]);
    return rows.map((r) => ({ id: r.id, type: r.type, payload: parseJson(r.payload, {}) }));
  }

  async complete(machine, results = []) {
    for (const r of results) {
      const row = await this.db.get("SELECT * FROM agent_commands WHERE id = ? AND machine_id = ? AND status = 'sent'", [r.id, machine.row.id]);
      if (!row) continue;
      const status = r.ok ? 'done' : 'failed';
      await this.db.run('UPDATE agent_commands SET status = ?, result = ?, updated_at = ? WHERE id = ?', [status, JSON.stringify({ ok: !!r.ok, error: r.error || null }), Date.now(), row.id]);
      const payload = parseJson(row.payload, {});
      await this.audit.log({
        action: 'process.kill.remote.result',
        target: `${machine.row.farm_name}:${payload.pid}`,
        details: { name: payload.name, error: r.error || null },
        success: !!r.ok,
      });
      this.bus.emit('command', { id: row.id, machineId: machine.row.id, type: row.type, status, error: r.error || null, payload });
    }
  }

  async get(id) {
    const r = await this.db.get('SELECT * FROM agent_commands WHERE id = ?', [id]);
    return r ? { id: r.id, machineId: r.machine_id, type: r.type, status: r.status, payload: parseJson(r.payload, {}), result: parseJson(r.result, null) } : null;
  }
}
