import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { requireAdmin, requireAuth, sessionCookie, clearSessionCookie, isSecureRequest } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimit.js';
import { changePasswordSchema, createUserSchema, loginSchema, prefsSchema } from '../schemas.js';

export function authRoutes({ auth, audit, config }) {
  const r = Router();
  const loginLimiter = createRateLimiter({
    windowMs: 15 * 60e3,
    max: config.rateLimit.loginPer15Min,
    key: (req) => `${req.ip}|${String(req.body?.username || '').toLowerCase()}`,
    message: 'Muitas tentativas de login. Tente de novo em alguns minutos.',
  });

  r.post('/auth/login', loginLimiter, validate(loginSchema), async (req, res) => {
    const { username, password } = req.body;
    const s = await auth.login(username, password, { ip: req.ip, userAgent: req.get('user-agent') });
    if (!s) {
      await audit.log({ action: 'auth.login', target: username, ip: req.ip, success: false });
      return res.status(401).json({ error: 'Usuário ou senha incorretos.' });
    }
    await audit.log({ user: s.user, action: 'auth.login', target: username, ip: req.ip, success: true });
    res.setHeader('Set-Cookie', sessionCookie(s.token, { maxAgeSec: config.sessionTtlHours * 3600, secure: isSecureRequest(req, config.cookieSecure) }));
    res.json({ user: s.user, csrf: s.csrf });
  });

  r.post('/auth/logout', async (req, res) => {
    if (req.session) await auth.logout(req.session.token);
    res.setHeader('Set-Cookie', clearSessionCookie(isSecureRequest(req, config.cookieSecure)));
    res.json({ ok: true });
  });

  r.get('/auth/me', (req, res) => {
    const features = {
      publicDashboard: config.publicDashboard,
      allowProcessKill: config.allowProcessKill,
      localMonitor: config.localMonitor,
    };
    if (!req.user) return res.status(401).json({ error: 'Não autenticado.', features });
    res.json({ user: req.user, csrf: req.session.csrf, features });
  });

  r.put('/auth/password', requireAuth, validate(changePasswordSchema), async (req, res) => {
    await auth.changePassword(req.user.id, req.body.currentPassword, req.body.newPassword, { keepSessionId: req.session.id });
    await audit.log({ user: req.user, action: 'auth.password.change', target: req.user.username, ip: req.ip });
    res.json({ ok: true });
  });

  r.put('/auth/prefs', requireAuth, validate(prefsSchema), async (req, res) => {
    const user = await auth.savePrefs(req.user.id, { ...req.user.prefs, ...req.body });
    res.json({ user });
  });

  // ----- usuários (somente administradores) -----

  r.get('/users', requireAdmin, async (_req, res) => {
    res.json({ users: await auth.listUsers() });
  });

  r.post('/users', requireAdmin, validate(createUserSchema), async (req, res) => {
    const user = await auth.createUser(req.body);
    await audit.log({ user: req.user, action: 'user.create', target: user.username, details: { role: user.role }, ip: req.ip });
    res.status(201).json({ user });
  });

  r.patch('/users/:id', requireAdmin, validate(createUserSchema.pick({ role: true })), async (req, res) => {
    const user = await auth.setRole(Number(req.params.id), req.body.role);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
    await audit.log({ user: req.user, action: 'user.role', target: user.username, details: { role: user.role }, ip: req.ip });
    res.json({ user });
  });

  r.post('/users/:id/password', requireAdmin, validate(changePasswordSchema.pick({ newPassword: true })), async (req, res) => {
    const target = await auth.getUser(Number(req.params.id));
    if (!target) return res.status(404).json({ error: 'Usuário não encontrado.' });
    await auth.resetPassword(target.id, req.body.newPassword);
    await audit.log({ user: req.user, action: 'user.password.reset', target: target.username, ip: req.ip });
    res.json({ ok: true });
  });

  r.delete('/users/:id', requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (id === req.user.id) return res.status(400).json({ error: 'Você não pode remover a si mesmo.' });
    const target = await auth.getUser(id);
    if (!target || !(await auth.deleteUser(id))) return res.status(404).json({ error: 'Usuário não encontrado.' });
    await audit.log({ user: req.user, action: 'user.delete', target: target.username, ip: req.ip });
    res.json({ ok: true });
  });

  return r;
}
