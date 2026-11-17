/**
 * Cliente da API: cookies de sessão + cabeçalho CSRF em toda alteração.
 * Os segredos (Discord, Telegram, SMTP) só trafegam do navegador para o servidor, nunca o contrário.
 */
import { setState, state } from './store.js';

export class ApiError extends Error {
  constructor(message, status, issues) {
    super(message);
    this.status = status;
    this.issues = issues || [];
  }
}

async function request(method, path, body, { signal } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (method !== 'GET' && state.auth.csrf) headers['X-CSRF-Token'] = state.auth.csrf;
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: 'same-origin',
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError('Sem conexão com o servidor da fazenda.', 0);
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* sem corpo */
  }
  if (res.status === 401 && path !== '/auth/login' && path !== '/auth/me') {
    setState({ auth: { ...state.auth, status: 'anonymous', user: null, csrf: null } });
  }
  if (!res.ok) {
    const issues = data?.issues || [];
    throw new ApiError(data?.error ? `${data.error}${issues.length ? ` (${issues.join('; ')})` : ''}` : `Erro ${res.status}`, res.status, issues);
  }
  return data;
}

export const api = {
  get: (p, o) => request('GET', p, undefined, o),
  post: (p, b = {}, o) => request('POST', p, b, o),
  put: (p, b = {}, o) => request('PUT', p, b, o),
  patch: (p, b = {}, o) => request('PATCH', p, b, o),
  del: (p, o) => request('DELETE', p, undefined, o),
};

export const qs = (obj) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) if (v != null && v !== '') p.set(k, v);
  const s = p.toString();
  return s ? `?${s}` : '';
};
