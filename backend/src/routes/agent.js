/**
 * Endpoints dos agentes. Autenticação por token individual + assinatura HMAC com carimbo de tempo.
 * Nenhuma sessão de navegador é aceita aqui, e nenhum comando é aceito do agente.
 */
import express, { Router } from 'express';
import crypto from 'node:crypto';
import { createRateLimiter } from '../middleware/rateLimit.js';
import { agentPayloadSchema } from '../schemas.js';

const MAX_SKEW_MS = 5 * 60e3;

export function verifyAgentSignature({ tokenHash, timestamp, signature, rawBody, now = Date.now() }) {
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(now - ts) > MAX_SKEW_MS) return 'carimbo de tempo ausente ou fora da janela de 5 minutos (relógio da máquina certo?)';
  if (!/^[a-f0-9]{64}$/.test(String(signature || ''))) return 'assinatura ausente';
  const expected = crypto.createHmac('sha256', tokenHash).update(`${timestamp}.`).update(rawBody || Buffer.alloc(0)).digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(signature)))) return 'assinatura inválida';
  return null;
}

export function agentRoutes({ machines, ingest, commands, config, logger }) {
  const r = Router();
  const seen = new Map(); // assinaturas recentes (anti-replay dentro da janela)

  const limiter = createRateLimiter({
    windowMs: 60e3,
    max: config.rateLimit.agentPerMin,
    key: (req) => `agent|${req.ip}|${String(req.get('authorization') || '').slice(-12)}`,
  });

  r.use(limiter);
  r.use(express.json({ limit: '4mb', verify: (req, _res, buf) => { req.rawBody = buf; } }));

  const authenticate = (req, res, next) => {
    const header = req.get('authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    const m = machines.findByToken(token);
    if (!m) return res.status(401).json({ error: 'Token de agente inválido.' });
    const problem = verifyAgentSignature({
      tokenHash: m.row.token_hash,
      timestamp: req.get('x-agent-timestamp'),
      signature: req.get('x-agent-signature'),
      rawBody: req.rawBody,
    });
    if (problem) {
      logger?.warn(`[agente] requisição recusada de ${req.ip} (${m.row.farm_name}): ${problem}`);
      return res.status(401).json({ error: `Requisição recusada: ${problem}.` });
    }
    const sig = req.get('x-agent-signature');
    const now = Date.now();
    if (seen.has(sig)) return res.status(409).json({ error: 'Requisição repetida (replay) recusada.' });
    seen.set(sig, now);
    if (seen.size > 5000) for (const [k, t] of seen) if (now - t > MAX_SKEW_MS) seen.delete(k);
    req.machine = m;
    next();
  };

  r.post('/agent/metrics', authenticate, async (req, res) => {
    const parsed = agentPayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Leitura inválida.', issues: parsed.error.issues.slice(0, 5).map((i) => `${i.path.join('.')}: ${i.message}`) });
    }
    const m = req.machine;
    const samples = parsed.data.samples || (parsed.data.snapshot ? [parsed.data.snapshot] : []);
    if (parsed.data.commandResults?.length) await commands.complete(m, parsed.data.commandResults);
    const intervalSec = samples.length >= 2 ? Math.round((samples[samples.length - 1].ts - samples[samples.length - 2].ts) / 1000) : undefined;
    const result = await ingest.ingest(m, samples, { intervalSec: intervalSec > 0 && intervalSec < 3600 ? intervalSec : undefined });
    res.json({
      ok: true,
      accepted: result.accepted,
      sendProcesses: Date.now() < (m.live.wantsProcessesUntil || 0),
      commands: await commands.takePending(m.row.id),
    });
  });

  r.post('/agent/goodbye', authenticate, async (req, res) => {
    req.machine.live.goodbye = true;
    await ingest.markOffline(req.machine);
    res.json({ ok: true });
  });

  return r;
}
