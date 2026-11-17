/**
 * Canais externos de notificação. Os segredos vêm do SettingsService (variáveis de ambiente
 * ou cofre criptografado) e nunca passam pelo navegador.
 */
import nodemailer from 'nodemailer';

const LEVEL_EMOJI = { crit: '🔴', warn: '🟡', ok: '🟢', info: '⭐' };
const LEVEL_COLOR = { crit: 0xd9381e, warn: 0xf2b600, ok: 0x4caf50, info: 0xffd23f };

const fetchJson = async (url, body, timeoutMs = 10000) => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
    redirect: 'error',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}${text ? `: ${text.slice(0, 160)}` : ''}`);
  }
};

export function isDiscordWebhook(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && /(^|\.)discord(app)?\.com$/.test(u.hostname) && u.pathname.startsWith('/api/webhooks/');
  } catch {
    return false;
  }
}

export const channels = {
  discord: {
    label: 'Discord',
    configured: (s) => !!s.getSecret('discord.webhookUrl'),
    async send(n, s) {
      const url = s.getSecret('discord.webhookUrl');
      if (!isDiscordWebhook(url)) throw new Error('URL de webhook do Discord inválida.');
      await fetchJson(url, {
        username: 'Stardew Monitor',
        embeds: [{
          title: `${LEVEL_EMOJI[n.level] || '🌾'} ${n.title}`.slice(0, 250),
          description: n.message.slice(0, 2000),
          color: LEVEL_COLOR[n.level] ?? LEVEL_COLOR.info,
          footer: { text: n.machineName ? `Fazenda: ${n.machineName}` : 'Stardew Monitor' },
          timestamp: new Date(n.createdAt || Date.now()).toISOString(),
        }],
        allowed_mentions: { parse: [] },
      });
    },
  },
  telegram: {
    label: 'Telegram',
    configured: (s) => !!(s.getSecret('telegram.botToken') && s.getSecret('telegram.chatId')),
    async send(n, s) {
      const token = s.getSecret('telegram.botToken');
      const chatId = s.getSecret('telegram.chatId');
      if (!/^\d+:[\w-]{20,}$/.test(token || '')) throw new Error('Token do bot do Telegram inválido.');
      const text = `${LEVEL_EMOJI[n.level] || '🌾'} ${n.title}\n${n.message}${n.machineName ? `\n\nFazenda: ${n.machineName}` : ''}`;
      await fetchJson(`https://api.telegram.org/bot${token}/sendMessage`, { chat_id: chatId, text: text.slice(0, 4000), disable_web_page_preview: true });
    },
  },
  email: {
    label: 'E-mail',
    configured: (s) => !!(s.getSecret('email.host') && s.getSecret('email.to') && s.getSecret('email.from')),
    async send(n, s) {
      const port = Number(s.getSecret('email.port') || 587);
      const transport = nodemailer.createTransport({
        host: s.getSecret('email.host'),
        port,
        secure: /^(1|true|yes)$/i.test(String(s.getSecret('email.secure') || '')) || port === 465,
        auth: s.getSecret('email.user') ? { user: s.getSecret('email.user'), pass: s.getSecret('email.pass') || '' } : undefined,
        connectionTimeout: 10000,
        disableFileAccess: true,
        disableUrlAccess: true,
      });
      await transport.sendMail({
        from: s.getSecret('email.from'),
        to: s.getSecret('email.to'),
        subject: `[Stardew Monitor] ${n.title}`.slice(0, 200),
        text: `${n.message}\n\n${n.machineName ? `Fazenda: ${n.machineName}\n` : ''}Enviado em ${new Date(n.createdAt || Date.now()).toLocaleString('pt-BR')}`,
      });
    },
  },
};
