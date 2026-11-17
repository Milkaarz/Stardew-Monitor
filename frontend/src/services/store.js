/**
 * Estado global mínimo (sem dependências): `useStore(selector)` re-renderiza quando o pedaço muda.
 */
import { useEffect, useState, useRef } from 'preact/hooks';

const listeners = new Set();

export const state = {
  auth: { status: 'loading', user: null, csrf: null, features: {} },
  machines: {}, // id -> { machine, snapshot, derived, receivedAt, farmSeconds }
  selectedId: null,
  connection: 'connecting', // connecting | live | polling | offline
  unread: 0,
  toasts: [],
  settings: null,
  secrets: null,
};

export function setState(patch) {
  Object.assign(state, typeof patch === 'function' ? patch(state) : patch);
  for (const l of listeners) l();
}

export function useStore(selector) {
  const [value, setValue] = useState(() => selector(state));
  const sel = useRef(selector);
  sel.current = selector;
  useEffect(() => {
    const check = () => {
      const next = sel.current(state);
      setValue((prev) => (Object.is(prev, next) ? prev : next));
    };
    listeners.add(check);
    check();
    return () => listeners.delete(check);
  }, []);
  return value;
}

/** Atualiza (ou insere) a fazenda vinda da API/SSE. */
export function upsertMachine(payload) {
  if (!payload?.machine) return;
  const id = payload.machine.id;
  const prev = state.machines[id] || {};
  setState({ machines: { ...state.machines, [id]: { ...prev, ...payload, farmSeconds: payload.farmSeconds ?? prev.farmSeconds } } });
}

export function removeMachine(id) {
  const next = { ...state.machines };
  delete next[id];
  setState({ machines: next, selectedId: state.selectedId === id ? null : state.selectedId });
}

let toastId = 0;
export function toast(t) {
  const id = ++toastId;
  const item = { id, level: 'info', timeout: 6000, ...t };
  setState({ toasts: [...state.toasts, item].slice(-5) });
  if (item.timeout) setTimeout(() => dismissToast(id), item.timeout);
  return id;
}

export function dismissToast(id) {
  setState({ toasts: state.toasts.filter((t) => t.id !== id) });
}

export function selectedMachine() {
  const list = Object.values(state.machines);
  return state.machines[state.selectedId] || list.find((m) => m.machine.isLocal) || list[0] || null;
}
