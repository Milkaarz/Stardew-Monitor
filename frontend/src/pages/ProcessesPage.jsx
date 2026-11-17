/**
 * Moradores de Pelican Town = processos do sistema.
 * "Expulsar morador" (encerrar processo): só administradores, com senha e confirmação.
 */
import { useEffect, useState } from 'preact/hooks';
import { PROCESS_LIMITS, formatBytes, formatDuration } from '@stardew-monitor/shared';
import { api, qs } from '../services/api.js';
import { useStore, selectedMachine, toast } from '../services/store.js';
import { onLiveEvent } from '../services/live.js';
import { sfx } from '../audio/sound.js';
import { Panel, Button, Field, Modal, ErrorBox, Loading, Empty, useAsync, useInterval, timeAgo } from '../components/ui.jsx';

function KickDialog({ proc, machine, onClose, onDone }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await api.post('/processes/kill', { machine: machine.id, pid: proc.pid, name: proc.name, password, confirm: true });
      sfx.kick();
      toast({
        title: r.mode === 'remote' ? 'Ordem enviada ao agente' : 'Morador expulso',
        message: r.mode === 'remote' ? r.message : `${proc.name} (PID ${proc.pid}) foi encerrado.`,
        level: 'ok',
        icon: '👢',
      });
      onDone();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title="👢 Expulsar morador" onClose={onClose}>
      <form class="stack" onSubmit={submit}>
        <p>Você vai encerrar <b>{proc.name}</b> (PID {proc.pid}) na fazenda <b>{machine.farmName}</b>.</p>
        <div class="notice warn">Trabalho não salvo nesse programa pode ser perdido. Processos essenciais do sistema são protegidos e não podem ser encerrados.</div>
        <Field label="Confirme sua senha de administrador">
          <input class="input" type="password" autocomplete="current-password" required value={password} onInput={(e) => setPassword(e.currentTarget.value)} />
        </Field>
        <label class="check"><input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.currentTarget.checked)} /> Sim, quero encerrar este processo.</label>
        <ErrorBox error={error} />
        <div class="row">
          <Button type="submit" variant="danger" disabled={!confirm || !password || busy}>{busy ? 'Expulsando...' : 'Expulsar'}</Button>
          <Button variant="light" onClick={onClose}>Cancelar</Button>
        </div>
      </form>
    </Modal>
  );
}

export function ProcessesPage() {
  const payload = useStore(() => selectedMachine());
  const isAdmin = useStore((s) => s.auth.user?.role === 'admin');
  const machine = payload?.machine;
  const [opts, setOpts] = useState({ sort: 'cpu', order: 'desc', limit: 25, q: '', filter: 'all' });
  const [query, setQuery] = useState('');
  const [auto, setAuto] = useState(true);
  const [kick, setKick] = useState(null);

  // pesquisa com pequena espera para não consultar a cada tecla
  useEffect(() => {
    const t = setTimeout(() => setOpts((o) => ({ ...o, q: query })), 300);
    return () => clearTimeout(t);
  }, [query]);

  const { data, loading, error, reload } = useAsync(
    () => (machine ? api.get(`/processes${qs({ machine: machine.id, ...opts })}`) : Promise.resolve(null)),
    [machine?.id, opts.sort, opts.order, opts.limit, opts.q, opts.filter],
  );
  useInterval(() => auto && !kick && reload(), machine?.isLocal ? 5e3 : 10e3);

  useEffect(() => onLiveEvent((type, d) => {
    if (type !== 'command' || d.machineId !== machine?.id) return;
    toast({
      title: d.status === 'done' ? 'Morador expulso pelo agente' : 'O agente recusou a expulsão',
      message: d.status === 'done' ? `${d.payload?.name} (PID ${d.payload?.pid})` : d.error,
      level: d.status === 'done' ? 'ok' : 'warn',
    });
    reload();
  }), [machine?.id]);

  const sortBy = (key) => setOpts((o) => ({ ...o, sort: key, order: o.sort === key && o.order === 'desc' ? 'asc' : 'desc' }));
  const arrow = (key) => (opts.sort === key ? (opts.order === 'desc' ? ' ▼' : ' ▲') : '');

  return (
    <div class="stack">
      <Panel title={`🧑‍🌾 Moradores · ${machine?.farmName || ''}`}>
        <div class="form-grid">
          <Field label="Pesquisar por nome ou PID">
            <input class="input" type="search" value={query} onInput={(e) => setQuery(e.currentTarget.value)} placeholder="chrome, node, 1234..." />
          </Field>
          <Field label="Filtro">
            <select class="input" value={opts.filter} onChange={(e) => setOpts({ ...opts, filter: e.currentTarget.value })}>
              <option value="all">Todos</option>
              <option value="active">Ativos (CPU &gt; 0,5%)</option>
              <option value="heavy">Pesados (CPU ou RAM ≥ 5%)</option>
              <option value="user">Com usuário identificado</option>
            </select>
          </Field>
          <Field label="Ordenar por">
            <select class="input" value={opts.sort} onChange={(e) => setOpts({ ...opts, sort: e.currentTarget.value, order: 'desc' })}>
              <option value="cpu">Maior uso de CPU</option>
              <option value="mem">Maior uso de RAM</option>
              <option value="name">Nome</option>
              <option value="pid">PID</option>
            </select>
          </Field>
          <Field label="Mostrar">
            <select class="input" value={opts.limit} onChange={(e) => setOpts({ ...opts, limit: Number(e.currentTarget.value) })}>
              {PROCESS_LIMITS.map((n) => <option key={n} value={n}>{n} moradores</option>)}
            </select>
          </Field>
        </div>
        <div class="row spread" style={{ marginTop: '10px' }}>
          <label class="check"><input type="checkbox" checked={auto} onChange={(e) => setAuto(e.currentTarget.checked)} /> Atualizar sozinho</label>
          <span class="muted">
            {data && `${data.items.length} de ${data.total} processos · ${data.live ? 'lista ao vivo' : `enviada pelo agente ${timeAgo(data.at)}`}`}
          </span>
          <Button small variant="light" onClick={reload}>Atualizar agora</Button>
        </div>
      </Panel>

      <ErrorBox error={error} onRetry={reload} />
      {loading && !data && <Panel><Loading text="Batendo nas portas da vila..." /></Panel>}
      {data && !data.live && !data.items.length && (
        <Panel><Empty>O agente desta fazenda ainda não enviou a lista. Ela chega no próximo envio (até ~1 intervalo).</Empty></Panel>
      )}
      {data && data.items.length > 0 && (
        <div class="table-wrap">
          <table class="wood">
            <thead>
              <tr>
                <th><button onClick={() => sortBy('name')}>Nome{arrow('name')}</button></th>
                <th><button onClick={() => sortBy('pid')}>PID{arrow('pid')}</button></th>
                <th>Usuário</th>
                <th><button onClick={() => sortBy('cpu')}>CPU{arrow('cpu')}</button></th>
                <th><button onClick={() => sortBy('mem')}>Memória{arrow('mem')}</button></th>
                <th>Tempo</th>
                <th>Estado</th>
                {isAdmin && <th>Ação</th>}
              </tr>
            </thead>
            <tbody>
              {data.items.map((p) => (
                <tr key={p.pid}>
                  <td class="proc-name" title={p.name}>{p.protected && <span class="lock" title={p.protectedReason || 'Processo protegido'}>🔒 </span>}{p.name}</td>
                  <td class="num">{p.pid}</td>
                  <td>{p.user || '—'}</td>
                  <td class="num">{p.cpu != null ? `${p.cpu.toFixed(1)}%` : '—'}</td>
                  <td class="num">{p.mem != null ? `${p.mem.toFixed(1)}%` : '—'}{p.memRss ? ` · ${formatBytes(p.memRss)}` : ''}</td>
                  <td class="num">{p.runtimeSec != null ? formatDuration(p.runtimeSec) : '—'}</td>
                  <td>{p.state || '—'}</td>
                  {isAdmin && (
                    <td>
                      <Button small variant="danger" disabled={p.protected || !data.canKill} title={p.protected ? p.protectedReason : !data.canKill ? 'Encerramento desativado neste servidor' : 'Encerrar processo'}
                        onClick={() => setKick(p)}>Expulsar</Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {kick && <KickDialog proc={kick} machine={machine} onClose={() => setKick(null)} onDone={() => { setKick(null); reload(); }} />}
    </div>
  );
}
