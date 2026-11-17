/**
 * Proteção do painel local (sem login).
 *
 * O Stardew Monitor roda no próprio computador e escuta só em 127.0.0.1. Sem senha, os riscos
 * que sobram são OUTROS SITES abertos no navegador tentando falar com http://localhost:
 *  - cabeçalho Host precisa ser localhost/127.0.0.1/::1 (ou um nome liberado em ALLOWED_HOSTS):
 *    bloqueia ataques de "DNS rebinding";
 *  - toda alteração precisa do cabeçalho X-Stardew-Monitor e, se houver Origin, ele precisa ser
 *    o próprio painel: um site externo não consegue enviar esse cabeçalho sem permissão de CORS,
 *    que nunca é concedida (bloqueia CSRF);
 *  - ações perigosas (encerrar processo) exigem que a requisição venha do próprio computador.
 */
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);
const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);
export const CLIENT_HEADER = 'x-stardew-monitor';

export function hostName(hostHeader = '') {
  const h = String(hostHeader).trim().toLowerCase();
  if (h.startsWith('[')) return h.slice(0, h.indexOf(']') + 1);
  return h.split(':')[0];
}

export function isLoopbackAddress(ip = '') {
  const a = String(ip).replace(/^::ffff:/, '');
  return a === '127.0.0.1' || a === '::1' || a.startsWith('127.');
}

export function localGuard({ allowedHosts = [] } = {}) {
  const allowed = new Set([...LOOPBACK_HOSTS, ...allowedHosts.map((h) => h.toLowerCase())]);
  return (req, res, next) => {
    const host = hostName(req.headers.host);
    if (!allowed.has(host)) {
      return res.status(403).json({ error: `Acesso recusado: o painel só responde em localhost (host recebido: ${host || 'vazio'}). Para liberar outro nome, use ALLOWED_HOSTS.` });
    }
    if (SAFE.has(req.method)) return next();
    if (!req.get(CLIENT_HEADER)) {
      return res.status(403).json({ error: 'Requisição recusada: só o painel do Stardew Monitor pode fazer alterações.' });
    }
    const origin = req.get('origin');
    if (origin) {
      let originHost = '';
      try {
        originHost = new URL(origin).hostname.toLowerCase();
      } catch {
        /* origem inválida */
      }
      const normalized = originHost.includes(':') && !originHost.startsWith('[') ? `[${originHost}]` : originHost;
      if (!allowed.has(normalized) && !allowed.has(originHost)) {
        return res.status(403).json({ error: 'Requisição de outro site recusada.' });
      }
    }
    next();
  };
}

/** Só aceita requisições feitas a partir deste mesmo computador. */
export function requireLocalMachine(req, res, next) {
  if (isLoopbackAddress(req.socket.remoteAddress)) return next();
  return res.status(403).json({ error: 'Esta ação só pode ser feita no próprio computador onde o Stardew Monitor está rodando.' });
}
