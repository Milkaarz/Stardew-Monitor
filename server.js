const express = require('express');
const si = require('systeminformation');
const os = require('os');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const TIMEZONE = process.env.TZ_NAME || 'America/Sao_Paulo';
const TEMPLATE = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');

const TAREFAS_FILE = path.join(process.env.DATA_DIR || __dirname, 'tarefas.json');
const MAX_TAREFAS = 30;

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

// ---------- quadro de missões (tarefas) ----------
function carregarTarefas() {
  try {
    const db = JSON.parse(fs.readFileSync(TAREFAS_FILE, 'utf8'));
    return { dia: db.dia || '', itens: Array.isArray(db.itens) ? db.itens : [] };
  } catch {
    return { dia: '', itens: [] };
  }
}

function salvarTarefas(db) {
  const tmp = TAREFAS_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, TAREFAS_FILE); // escrita atômica
}

// Reseta as tarefas diárias quando vira o dia
function tarefasDoDia() {
  const db = carregarTarefas();
  const hoje = dataLocal().completo.slice(0, 10);
  if (db.dia !== hoje) {
    db.itens.forEach((t) => { if (t.diaria) t.feita = false; });
    db.dia = hoje;
    salvarTarefas(db);
  }
  return db;
}

function renderTarefas() {
  const { itens } = tarefasDoDia();
  const lista = itens.map((t) => `
    <li class="${t.feita ? 'feita' : ''}">
      <form method="post" action="/tarefas/${esc(t.id)}/toggle">
        <button class="check" title="Marcar/desmarcar">${t.feita ? '☑' : '☐'}</button>
      </form>
      <span class="texto">${esc(t.texto)}${t.diaria ? ' <small>(diária)</small>' : ''}</span>
      <form method="post" action="/tarefas/${esc(t.id)}/apagar">
        <button class="apagar" title="Apagar">✕</button>
      </form>
    </li>`).join('');

  const feitas = itens.filter((t) => t.feita).length;
  return `
    <p class="progresso">${feitas}/${itens.length} concluídas</p>
    <ul class="tarefas">${lista || '<li class="vazio">Nenhuma missão. Que tal plantar algo?</li>'}</ul>
    <form class="nova" method="post" action="/tarefas">
      <input name="texto" maxlength="80" placeholder="Nova tarefa..." required>
      <label><input type="checkbox" name="diaria"> diária</label>
      <button>Adicionar</button>
    </form>`;
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
    TAREFAS: renderTarefas(),
    ATUALIZADO: t.completo,
  };

  return TEMPLATE.replace(/\{\{(\w+)\}\}/g, (_, k) => (k in valores ? valores[k] : ''));
}

// ---------- rotas ----------
app.disable('x-powered-by');
app.use(express.urlencoded({ extended: false, limit: '4kb' }));

app.get('/health', (_req, res) => res.send('ok'));

app.get('/', async (_req, res) => {
  try {
    res.set('Cache-Control', 'no-store').type('html').send(render(await coletar()));
  } catch (e) {
    console.error(e);
    res.status(500).send('Erro ao coletar dados da fazenda.');
  }
});

app.post('/tarefas', (req, res) => {
  const texto = String(req.body.texto || '').trim().slice(0, 80);
  const db = tarefasDoDia();
  if (texto && db.itens.length < MAX_TAREFAS) {
    db.itens.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      texto,
      feita: false,
      diaria: req.body.diaria === 'on',
    });
    salvarTarefas(db);
  }
  res.redirect(303, '/');
});

app.post('/tarefas/:id/toggle', (req, res) => {
  const db = tarefasDoDia();
  const t = db.itens.find((x) => x.id === req.params.id);
  if (t) { t.feita = !t.feita; salvarTarefas(db); }
  res.redirect(303, '/');
});

app.post('/tarefas/:id/apagar', (req, res) => {
  const db = tarefasDoDia();
  db.itens = db.itens.filter((x) => x.id !== req.params.id);
  salvarTarefas(db);
  res.redirect(303, '/');
});

app.listen(PORT, '0.0.0.0', () => console.log(`Stardew Monitor rodando na porta ${PORT}`));
