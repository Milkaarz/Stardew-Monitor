/** Componentes reutilizáveis no estilo madeira/pergaminho. */
import { useEffect, useRef, useState, useCallback } from 'preact/hooks';
import { clampPct } from '@stardew-monitor/shared/format';
import { dismissToast, useStore } from '../services/store.js';
import { sfx } from '../audio/sound.js';

export function Panel({ title, children, class: cls = '', onClick, ...rest }) {
  const clickable = !!onClick;
  return (
    <section
      class={`panel ${title ? '' : 'flat'} ${clickable ? 'clickable' : ''} ${cls}`}
      onClick={onClick}
      onKeyDown={clickable ? (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onClick(e)) : undefined}
      tabIndex={clickable ? 0 : undefined}
      role={clickable ? 'button' : undefined}
      {...rest}
    >
      {title && <h2 class="panel-title">{title}</h2>}
      {children}
    </section>
  );
}

export function Button({ variant = '', small, children, onClick, type = 'button', ...rest }) {
  return (
    <button
      type={type}
      class={`btn ${variant} ${small ? 'small' : ''}`}
      onClick={(e) => {
        sfx.click();
        onClick?.(e);
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

export const levelClass = (l) => `lvl-${l || 'ok'}`;

export function Bar({ value, level = 'ok', label }) {
  const v = clampPct(value);
  return (
    <div class={`bar ${levelClass(level)}`} role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin="0" aria-valuemax="100" aria-label={label}>
      <div style={{ width: `${v}%` }} />
    </div>
  );
}

export function Metric({ label, value, bar, level, detail }) {
  return (
    <div class="metric">
      <span class="label">{label}</span>
      <span class="value num">{value}</span>
      {bar != null && <Bar value={bar} level={level} label={label} />}
      {detail && <span class="detail">{detail}</span>}
    </div>
  );
}

export function KV({ rows }) {
  return (
    <ul class="kv">
      {rows
        .filter((r) => r && r[1] != null && r[1] !== '')
        .map(([k, v]) => (
          <li key={k}>
            <span>{k}</span>
            <b class="num">{v}</b>
          </li>
        ))}
    </ul>
  );
}

export function Pill({ level, children }) {
  return <span class={`pill ${levelClass(level)}`}>{children}</span>;
}

export const STATUS_LABEL = { ok: 'Tudo bem', warn: 'Atenção', crit: 'Problema', offline: 'Sem sinal' };

export function StatusPill({ status }) {
  return <Pill level={status}>{STATUS_LABEL[status] || status}</Pill>;
}

export function Loading({ text = 'Carregando...' }) {
  return (
    <div class="loading" role="status">
      <span class="spinner" aria-hidden="true" />
      {text}
    </div>
  );
}

export function ErrorBox({ error, onRetry }) {
  if (!error) return null;
  return (
    <div class="notice error row spread" role="alert">
      <span>⚠️ {error.message || String(error)}</span>
      {onRetry && <Button small variant="light" onClick={onRetry}>Tentar de novo</Button>}
    </div>
  );
}

export function Empty({ children }) {
  return <div class="empty">{children}</div>;
}

export function Field({ label, children }) {
  return (
    <label class="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function Modal({ title, onClose, children, wide }) {
  const ref = useRef(null);
  useEffect(() => {
    const prev = document.activeElement;
    const el = ref.current?.querySelector('input, textarea, select, button');
    el?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    addEventListener('keydown', onKey);
    return () => {
      removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, []);
  return (
    <div class="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div class="modal" style={wide ? { width: 'min(820px, 100%)' } : undefined} ref={ref} role="dialog" aria-modal="true" aria-label={title}>
        <Panel title={title}>{children}</Panel>
      </div>
    </div>
  );
}

export function Toasts() {
  const toasts = useStore((s) => s.toasts);
  return (
    <div class="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div class={`toast ${levelClass(t.level === 'info' ? 'ok' : t.level)}`} key={t.id}>
          <span aria-hidden="true">{t.icon || '🌾'}</span>
          <div>
            <b>{t.title}</b>
            {t.message && <span>{t.message}</span>}
          </div>
          <button class="icon-btn" aria-label="Fechar aviso" onClick={() => dismissToast(t.id)}>✕</button>
        </div>
      ))}
    </div>
  );
}

/** Carrega dados assíncronos com estados de carregamento e erro. */
export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const seq = useRef(0);
  const run = useCallback(async () => {
    const id = ++seq.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fn();
      if (id === seq.current) setState({ loading: false, error: null, data });
    } catch (error) {
      if (id === seq.current && error.name !== 'AbortError') setState((s) => ({ loading: false, error, data: s.data }));
    }
  }, deps);
  useEffect(() => {
    run();
  }, [run]);
  return { ...state, reload: run, setData: (data) => setState((s) => ({ ...s, data: typeof data === 'function' ? data(s.data) : data })) };
}

export function useInterval(fn, ms) {
  const saved = useRef(fn);
  saved.current = fn;
  useEffect(() => {
    if (!ms) return undefined;
    const t = setInterval(() => saved.current(), ms);
    return () => clearInterval(t);
  }, [ms]);
}

/** Relógio que atualiza a cada `ms` (para ciclo dia/noite e "há X minutos"). */
export function useNow(ms = 30e3) {
  const [now, setNow] = useState(() => new Date());
  useInterval(() => setNow(new Date()), ms);
  return now;
}

export function timeAgo(ts, now = Date.now()) {
  if (!ts) return 'nunca';
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 10) return 'agora';
  if (s < 60) return `há ${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `há ${m} min`;
  const h = Math.round(m / 60);
  if (h < 48) return `há ${h} h`;
  return `há ${Math.round(h / 24)} dias`;
}

export const fmtDateTime = (ts) => (ts ? new Date(ts).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—');
