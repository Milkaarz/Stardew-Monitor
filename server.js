const express = require('express');
const si = require('systeminformation');
const os = require('os');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const TIMEZONE = process.env.TZ_NAME || 'America/Sao_Paulo';
const TEMPLATE = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');

const ESTACOES = ['Primavera', 'Verão', 'Outono', 'Inverno'];

// ---------- utilidades ----------
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const nivel = (pct) => (pct >= 90 ? 'alerta' : pct >= 70 ? 'aviso' : 'ok');
const pior = (...n) => (n.includes('alerta') ? 'alerta' : n.includes('aviso') ? 'aviso' : 'ok');

function fmtBytes(b) {
  const u = ['B', 'K', 'M', 'G', 'T'];
  let i = 0;
  while (b >= 1024 && i < u.length - 1) { b /= 1024; i++; }
  return (i >= 3 ? b.toFixed(1) : Math.round(b)) + u[i];
}

function dataLocal() {
  const parts = new Intl.DateTimeFormat('pt-BR', {
    timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(new Date()).reduce((a, p) => ((a[p.type] = p.value), a), {});
  return {
    mes: Number(parts.month), dia: Number(parts.day),
    hora: `${parts.hour}:${parts.minute}`,
    completo: `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`,
  };
}

// ---------- diário (log em memória) ----------
const diario = [];
let ultimoNivel = 'ok';
function anotar(msg) {
  diario.push(`[${dataLocal().hora}] ${msg}`);
  if (diario.length > 8) diario.shift();
}

// ---------- coleta de dados ----------
async function coletar() {
  const [load, mem, discos, procs] = await Promise.all([
    si.currentLoad(), si.mem(), si.fsSize(), si.processes(),
  ]);

  const cpu = Math.round(load.currentLoad);
  const ramUsada = mem.total - mem.available;
  const ramPct = Math.round((ramUsada / mem.total) * 100);
  const disco = discos.find((d) => d.mount === '/') ||
    discos.slice().sort((a, b) => b.size - a.size)[0] || { used: 0, size: 1, mount: '/' };
  const discoPct = Math.round((disco.used / disco.size) * 100);

  const energia = Math.max(0, 100 - cpu);
  const slots = Math.max(1, Math.round((ramPct * 36) / 100));

  const nivelEnergia = nivel(cpu);
  const nivelMochila = nivel(ramPct);
  const nivelSilo = nivel(discoPct);

  const top = procs.list
    .filter((p) => p.name)
    .sort((a, b) => b.cpu - a.cpu || b.mem - a.mem)
    .slice(0, 8);

  return {
    cpu, energia, ramPct, ramUsada, ramTotal: mem.total, slots,
    disco, discoPct, nivelEnergia, nivelMochila, nivelSilo, top,
  };
}

// ---------- renderização ----------
const MENSAGENS = {
  ok: 'A fazenda vai bem. Bom trabalho, fazendeiro!',
  aviso: 'Cuidado! Os recursos da fazenda estão ficando escassos.',
  alerta: 'Alerta! A fazenda está sobrecarregada, fazendeiro!',
};

function render(d) {
  const t = dataLocal();
  const geral = pior(d.nivelEnergia, d.nivelMochila, d.nivelSilo);
  if (geral !== ultimoNivel) {
    anotar(geral === 'ok' ? 'A fazenda voltou ao normal.' : `Nível da fazenda mudou para: ${geral}.`);
    ultimoNivel = geral;
  }

  const linhas = d.top.map((p) =>
    `<tr><td>${esc(p.pid)}</td><td>${esc(p.user || '-')}</td><td>${p.cpu.toFixed(1)}%</td><td>${p.mem.toFixed(1)}%</td><td>${esc(p.name)}</td></tr>`
  ).join('\n');

  const valores = {
    DATA: `${ESTACOES[(t.mes - 1) % 4]}, Dia ${t.dia} - ${t.hora}`,
    HOST: esc(os.hostname()),
    ENERGIA_NIVEL: d.nivelEnergia, ENERGIA_PCT: d.energia, ENERGIA_DET: `CPU em uso: ${d.cpu}%`,
    MOCHILA_NIVEL: d.nivelMochila, MOCHILA_PCT: d.ramPct, MOCHILA_VAL: `${d.slots}/36`,
    MOCHILA_DET: `RAM: ${fmtBytes(d.ramUsada)} de ${fmtBytes(d.ramTotal)} (${d.ramPct}%)`,
    SILO_NIVEL: d.nivelSilo, SILO_PCT: d.discoPct,
    SILO_DET: `Disco ${esc(d.disco.mount)}: ${fmtBytes(d.disco.used)} de ${fmtBytes(d.disco.size)}`,
    MENSAGEM: MENSAGENS[geral],
    PROCESSOS: linhas,
    DIARIO: esc(diario.join('\n')),
    ATUALIZADO: t.completo,
  };

  return TEMPLATE.replace(/\{\{(\w+)\}\}/g, (_, k) => (k in valores ? valores[k] : ''));
}

// ---------- rotas ----------
app.disable('x-powered-by');

app.get('/health', (_req, res) => res.send('ok'));

app.get('/', async (_req, res) => {
  try {
    res.set('Cache-Control', 'no-store').type('html').send(render(await coletar()));
  } catch (e) {
    console.error(e);
    res.status(500).send('Erro ao coletar dados da fazenda.');
  }
});

app.listen(PORT, '0.0.0.0', () => console.log(`Stardew Monitor rodando na porta ${PORT}`));