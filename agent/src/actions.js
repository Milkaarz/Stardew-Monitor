/**
 * Ação "Expulsar morador" (encerrar processo), com as verificações de segurança:
 *  1. o PID ainda existe e pertence ao MESMO processo (nome confere) — evita PID reaproveitado;
 *  2. o processo não é protegido (essencial do sistema, o próprio monitor, etc.);
 *  3. o sistema operacional decide as permissões (EPERM vira erro claro).
 */
import { protectionReason, sameProcessName } from '@stardew-monitor/shared/processes';

export async function killProcess({ pid, name, collector, extraProtected = [], signal = 'SIGTERM' }) {
  const id = Number(pid);
  if (!Number.isInteger(id) || id <= 0) return { ok: false, code: 'invalid', error: 'PID inválido.' };

  const list = await collector.processes({ maxAgeMs: 0 });
  const proc = list.find((p) => p.pid === id);
  if (!proc) return { ok: false, code: 'not_found', error: 'Esse morador já saiu da cidade (processo não existe mais).' };
  if (!sameProcessName(proc.name, name)) {
    return { ok: false, code: 'mismatch', error: `O PID ${id} agora pertence a "${proc.name}", não a "${name}". Atualize a lista.` };
  }
  const prot = protectionReason(proc, {
    platform: process.platform,
    selfPid: process.pid,
    parentPid: process.ppid,
    extra: extraProtected,
  });
  if (prot.protected) return { ok: false, code: 'protected', error: `Morador protegido: ${prot.reason}` };

  try {
    process.kill(id, signal === 'SIGKILL' ? 'SIGKILL' : 'SIGTERM');
    return { ok: true, process: { pid: proc.pid, name: proc.name, user: proc.user } };
  } catch (err) {
    if (err.code === 'EPERM') return { ok: false, code: 'permission', error: 'Sem permissão do sistema para encerrar esse processo.' };
    if (err.code === 'ESRCH') return { ok: false, code: 'not_found', error: 'O processo terminou antes da ação.' };
    return { ok: false, code: 'error', error: err.message };
  }
}
