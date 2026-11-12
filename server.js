const express = require('express');
const si = require('systeminformation');
const os = require('os');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const TIMEZONE = process.env.TZ_NAME || 'America/Sao_Paulo';
const aplicarExtras = require('./aplicar-template');
const TEMPLATE = aplicarExtras(fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8'));

const TAREFAS_FILE = path.join(process.env.DATA_DIR || __dirname, 'tarefas.json');
const MAX_TAREFAS = 30;

const ESTACOES = ['Primavera', 'Verão', 'Outono', 'Inverno'];

// ---------- utilidades ----------
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const nivel = (pct) => (pct >= 90 ? 'alerta' : pct >= 70 ? 'aviso' : 'ok');
const pior = (...n) => (n.includes('alerta') ? 'alerta' : n.includes('aviso') ? 'aviso' : 'ok');

function fmtBytes(b) {
  b = Number(b) || 0;
  const u = ['B', 'K', 'M', 'G', 'T'];
  let i = 0;
  while (b >= 1024 && i < u.length - 1) { b /= 1024; i++; }
  return (i >= 3 ? b.toFixed(1) : Math.round(b)) + u[i];
}

function uptime(s) {
  return `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h ${Math.floor((s % 3600) / 60)}m ${Math.floor(s % 60)}s`;
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

// ---------- histórico de uso (amostra a cada 10s) e visitas ----------
const hist = { cpu: [], ram: [] };
let visitas = 0;
const empurrar = (arr, v) => { arr.push(v); if (arr.length > 40) arr.shift(); };

async function amostrar() {
  try {
    const [l, m] = await Promise.all([si.currentLoad(), si.mem()]);
    empurrar(hist.cpu, Math.round(l.currentLoad));
    empurrar(hist.ram, Math.round(((m.total - m.available) / m.total) * 100));
  } catch { /* ignora */ }
}
amostrar();
setInterval(amostrar, 10000).unref();

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
const cpuInfoP = si.cpu().catch(() => ({})); // dados fixos do processador: coleta uma vez

async function coletar() {
  const [load, mem, discos, procs, cpuInfo, temp, redes] = await Promise.all([
    si.currentLoad(), si.mem(), si.fsSize(), si.processes(), cpuInfoP,
    si.cpuTemperature().catch(() => ({})), si.networkStats().catch(() => []),
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
    // novos dados
    mem, cpuInfo, discos,
    nucleos: (load.cpus || []).slice(0, 16).map((c) => Math.round(c.load)),
    temp: typeof temp.main === 'number' ? temp.main : null,
    rede: (redes || []).find((n) => n.iface && n.iface !== 'lo') || null,
  };
}

// ---------- painéis extras (usados pelas abas do template) ----------
const barra = (pct) =>
  `<div class="barra ${nivel(pct)}"><div style="width:${Math.min(100, Math.max(0, pct))}%"></div></div>`;
const linha = (rot, pct, txt, det) =>
  `<div class="row"><span class="rot">${esc(rot)}</span>${barra(pct)}<span>${txt}</span>${det ? `<span class="det">${esc(det)}</span>` : ''}</div>`;
const kvs = (rows) =>
  '<ul class="kvs">' + rows.map(([k, v]) => `<li><span class="rot">${esc(k)}</span><b>${esc(v)}</b></li>`).join('') + '</ul>';

function grafico(arr) {
  if (arr.length < 2) return '<p>Coletando histórico...</p>';
  const W = 8, H = 100;
  const barras = arr.map((v, i) =>
    `<rect class="${nivel(v)}" x="${i * W}" y="${H - Math.max(2, v)}" width="${W - 2}" height="${Math.max(2, v)}"/>`).join('');
  return `<svg class="graf" viewBox="0 0 ${40 * W} ${H}" preserveAspectRatio="none" shape-rendering="crispEdges" role="img" aria-label="Histórico de uso"><line x1="0" x2="${40 * W}" y1="30" y2="30"/><line x1="0" x2="${40 * W}" y1="10" y2="10"/>${barras}</svg>`;
}

function paineis(d, geral) {
  const m = d.mem;
  const swapPct = m.swaptotal ? Math.round((m.swapused / m.swaptotal) * 100) : 0;
  const ci = d.cpuInfo || {};
  const r = d.rede;
  const vel = (v) => (v == null ? 'medindo...' : fmtBytes(v) + '/s');

  const cpu =
    kvs([
      ['Processador', `${ci.manufacturer || ''} ${ci.brand || os.cpus()[0].model}`.trim()],
      ['Núcleos', `${ci.physicalCores || '?'} físicos / ${ci.cores || os.cpus().length} lógicos`],
      ['Velocidade', ci.speed ? `${ci.speed} GHz` : 'N/A'],
      ['Temperatura', d.temp != null ? `${d.temp} °C` : 'indisponível'],
      ['Carga média (1/5/15 min)', os.loadavg().map((x) => x.toFixed(2)).join(' / ')],
      ['Uso total', `${d.cpu}%`],
    ]) +
    '<div style="margin-top:14px">' + d.nucleos.map((p, i) => linha(`Núcleo ${i + 1}`, p, `${p}%`)).join('') + '</div>';

  const ram =
    linha('RAM', d.ramPct, `${d.ramPct}%`, `${fmtBytes(d.ramUsada)} de ${fmtBytes(d.ramTotal)}`) +
    (m.swaptotal ? linha('Swap', swapPct, `${swapPct}%`, `${fmtBytes(m.swapused)} de ${fmtBytes(m.swaptotal)}`) : '') +
    kvs([
      ['Total', fmtBytes(d.ramTotal)],
      ['Em uso', fmtBytes(d.ramUsada)],
      ['Disponível', fmtBytes(m.available)],
      ['Em cache', fmtBytes(m.cached)],
      ['Buffers', fmtBytes(m.buffers)],
      ['Node (RSS)', fmtBytes(process.memoryUsage().rss)],
    ]);

  const disco = d.discos.filter((x) => x.size > 0).slice(0, 6).map((x) => {
    const p = Math.round((x.used / x.size) * 100);
    return linha(x.mount, p, `${p}%`, `${fmtBytes(x.used)} usados · ${fmtBytes(x.size - x.used)} livres de ${fmtBytes(x.size)} (${x.fs})`);
  }).join('') || '<p>Nenhum volume encontrado.</p>';

  const rede = kvs([
    ['Interface', r ? r.iface : 'N/A'],
    ['Download agora', r ? vel(r.rx_sec) : 'N/A'],
    ['Upload agora', r ? vel(r.tx_sec) : 'N/A'],
    ['Total recebido', r ? fmtBytes(r.rx_bytes) : 'N/A'],
    ['Total enviado', r ? fmtBytes(r.tx_bytes) : 'N/A'],
    ['Hostname', os.hostname()],
    ['Sistema', `${os.type()} ${os.release()}`],
    ['Node / Porta', `${process.version} / ${PORT}`],
  ]);

  const historico =
    kvs([['Online há', uptime(process.uptime())], ['Visitas ao site', String(visitas)]]) +
    '<p class="rot" style="margin:14px 0 6px">⚡ CPU</p>' + grafico(hist.cpu) +
    '<p class="rot" style="margin:14px 0 6px">🎒 RAM</p>' + grafico(hist.ram) +
    '<small>Cada barra é uma leitura (10s). Linhas: 70% (aviso) e 90% (alerta).</small>';

  return { PAINEL_CPU: cpu, PAINEL_RAM: ram, PAINEL_DISCO: disco, PAINEL_REDE: rede, PAINEL_HIST: historico, ESTADO: geral };
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
    ...paineis(d, geral),
  };

  return TEMPLATE.replace(/\{\{(\w+)\}\}/g, (_, k) => (k in valores ? valores[k] : ''));
}

// ---------- rotas ----------
app.disable('x-powered-by');
app.use(express.urlencoded({ extended: false, limit: '4kb' }));

// conta visitas reais (a atualização automática envia x-live e não conta)
app.use((req, _res, next) => {
  if (req.method === 'GET' && req.path === '/' && !req.get('x-live')) visitas++;
  next();
});

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
