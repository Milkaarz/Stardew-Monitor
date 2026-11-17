/**
 * Autenticação por cookie de sessão (HttpOnly, SameSite=Strict) + proteção CSRF por cabeçalho.
 */
import { ROLES } from '@stardew-monitor/shared';
import { safeEqual } from '../lib/crypto.js';

export const SESSION_COOKIE = 'sm_session';

export function parseCookies(header = '') {
  const out = {};
  for (const part of String(header).split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    if (!k) continue;
    try {
      out[k] = decodeURIComponent(part.slice(i + 1).trim());
    } catch {
      out[k] = part.slice(i + 1).trim();
    }
  }
  return out;
}

export function sessionCookie(token, { maxAgeSec, secure }) {
  const parts = [`${SESSION_COOKIE}=${encodeURIComponent(token)}`, 'Path=/', 'HttpOnly', 'SameSite=Strict', `Max-Age=${maxAgeSec}`];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export const clearSessionCookie = (secure) => sessionCookie('', { maxAgeSec: 0, secure });

export function isSecureRequest(req, mode) {
  if (mode === 'true') return true;
  if (mode === 'false') return false;
  return !!req.secure;
}

/** Carrega a sessão (se houver) sem bloquear a requisição. */
export function loadSession(auth) {
  return async (req, _res, next) => {
    const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
    if (token) {
      const s = await auth.getSession(token);
      if (s) {
        req.user = s.user;
        req.session = { id: s.sessionId, csrf: s.csrf, token };
      }
    }
    next();
  };
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Faça login para entrar na fazenda.' });
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Faça login para entrar na fazenda.' });
  if (req.user.role !== ROLES.ADMIN) return res.status(403).json({ error: 'Apenas administradores podem fazer isso.' });
  next();
}

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Toda alteração feita com sessão precisa do cabeçalho X-CSRF-Token correto. */
export function csrfProtect(req, res, next) {
  if (SAFE.has(req.method) || !req.session) return next();
  const sent = req.get('x-csrf-token') || '';
  if (!sent || !safeEqual(sent, req.session.csrf)) {
    return res.status(403).json({ error: 'Token CSRF ausente ou inválido. Recarregue a página.' });
  }
  next();
}
