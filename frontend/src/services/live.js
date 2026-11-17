/**
 * Conexão em tempo real (SSE). Se o EventSource cair repetidamente, usa consulta periódica
 * (polling) até a conexão voltar — o painel nunca fica parado sem avisar.
 */
import { api } from './api.js';
import { setState, state, toast, upsertMachine, removeMachine } from './store.js';
import { sfx } from '../audio/sound.js';

let es = null;
let pollTimer = null;
let failures = 0;
const handlers = new Set();

/** Outros módulos podem ouvir eventos crus (ex.: página de processos ouve "command"). */
export function onLiveEvent(fn) {
  handlers.add(fn);
  return () => handlers.delete(fn);
}

const emit = (type, data) => {
  for (const h of handlers) h(type, data);
};

async function refreshAll() {
  try {
    const { machines } = await api.get('/machines');
    const ids = new Set(machines.map((m) => m.id));
    for (const id of Object.keys(state.machines)) if (!ids.has(Number(id))) removeMachine(Number(id));
    await Promise.all(machines.map(async (m) => upsertMachine(await api.get(`/metrics?machine=${m.id}`))));
  } catch {
    /* tenta de novo no próximo ciclo */
  }
}

function startPolling() {
  if (pollTimer) return;
  setState({ connection: 'polling' });
  refreshAll();
  pollTimer = setInterval(refreshAll, 10e3);
}

function stopPolling() {
  clearInterval(pollTimer);
  pollTimer = null;
}

export function connectLive() {
  disconnectLive();
  setState({ connection: 'connecting' });
  es = new EventSource('/api/stream', { withCredentials: true });

  es.addEventListener('hello', (e) => {
    failures = 0;
    stopPolling();
    const data = JSON.parse(e.data);
    const machines = {};
    for (const p of data.machines) machines[p.machine.id] = p;
    setState({ machines, connection: 'live' });
  });

  es.addEventListener('metrics', (e) => upsertMachine(JSON.parse(e.data)));

  es.addEventListener('machine', (e) => {
    const d = JSON.parse(e.data);
    if (d.action === 'removed') removeMachine(d.id);
    else if (d.action === 'created' || d.action === 'updated') refreshAll();
    emit('machine', d);
  });

  es.addEventListener('notification', (e) => {
    const n = JSON.parse(e.data);
    if (n.kind === 'achievement') return; // o evento "achievement" mostra o aviso especial
    setState({ unread: state.unread + 1 });
    toast({
      title: n.title,
      message: n.message,
      level: n.kind === 'recovery' ? 'ok' : n.level || 'warn',
      icon: n.kind === 'recovery' ? '🌤️' : n.level === 'crit' ? '❗' : '⚠️',
    });
    if (n.kind === 'alert') (n.level === 'crit' ? sfx.alert : sfx.warn)({ alert: true });
    emit('notification', n);
  });

  es.addEventListener('achievement', (e) => {
    const a = JSON.parse(e.data);
    setState({ unread: state.unread + 1 });
    toast({ title: 'Conquista desbloqueada!', message: `${a.title}${a.machineName ? ` · ${a.machineName}` : ''}`, level: 'ok', icon: '🏆', timeout: 9000 });
    sfx.achievement();
    emit('achievement', a);
  });

  es.addEventListener('command', (e) => emit('command', JSON.parse(e.data)));
  es.addEventListener('settings', (e) => emit('settings', JSON.parse(e.data)));

  es.onerror = () => {
    failures++;
    if (state.auth.status !== 'authenticated') return disconnectLive();
    if (failures >= 3) startPolling();
    else setState({ connection: 'connecting' });
  };
}

export function disconnectLive() {
  if (es) es.close();
  es = null;
  stopPolling();
}
