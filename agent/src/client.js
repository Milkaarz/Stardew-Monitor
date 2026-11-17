/**
 * Cliente HTTP do agente.
 * Autenticação: token individual (Bearer) + assinatura HMAC-SHA256 do corpo com carimbo de tempo,
 * o que impede adulteração e reenvio (replay) de requisições antigas.
 */
import crypto from 'node:crypto';

/** Chave HMAC derivada do token (o servidor guarda apenas este hash, nunca o token). */
export const tokenKey = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

export function signBody(token, timestamp, body) {
  return crypto.createHmac('sha256', tokenKey(token)).update(`${timestamp}.${body}`).digest('hex');
}

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export class AgentClient {
  constructor({ serverUrl, token, timeoutMs = 15000, fetchImpl = globalThis.fetch }) {
    this.base = String(serverUrl || '').replace(/\/+$/, '');
    this.token = token;
    this.timeoutMs = timeoutMs;
    this.fetch = fetchImpl;
  }

  async post(path, payload, { timeoutMs = this.timeoutMs } = {}) {
    const body = JSON.stringify(payload);
    const ts = String(Date.now());
    const res = await this.fetch(`${this.base}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
        'X-Agent-Timestamp': ts,
        'X-Agent-Signature': signBody(this.token, ts, body),
        'User-Agent': 'stardew-monitor-agent/3',
      },
      body,
      redirect: 'error',
      signal: AbortSignal.timeout(timeoutMs),
    });
    let data = null;
    try {
      data = await res.json();
    } catch {
      /* resposta sem JSON */
    }
    if (!res.ok) throw new HttpError(res.status, data?.error || `servidor respondeu ${res.status}`);
    return data;
  }
}
