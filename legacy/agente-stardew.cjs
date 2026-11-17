/*
  AGENTE DO PAINEL (roda no seu PC)
  Junta os dados do computador e envia para o receber.php na sua hospedagem.

  1. Copie .env.example para .env e preencha PAINEL_URL e PAINEL_TOKEN
  2. Rode:  npm run agente        (ou: node --env-file=.env agente-stardew.js)
  Em segundo plano:  pm2 start ecosystem.config.stardew.js --only agente  &&  pm2 save
*/
const os = require("os");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

/* =========================
   CONFIGURAÇÃO (vem do arquivo .env, veja o .env.example)
========================= */
const URL_RECEBER = process.env.PAINEL_URL || "";
const TOKEN = process.env.PAINEL_TOKEN || "";
const INTERVALO_MIN = Number(process.env.PAINEL_INTERVALO) || 5; // de quantos em quantos minutos envia

if (!URL_RECEBER || /seu-?dominio/i.test(URL_RECEBER) || !TOKEN) {
  console.error("Configuração incompleta: copie .env.example para .env e preencha PAINEL_URL e PAINEL_TOKEN.");
  console.error("Depois rode: npm run agente");
  process.exit(1);
}
if (TOKEN === "troque-esta-senha") {
  console.warn("Aviso: você está usando a senha de exemplo. Troque PAINEL_TOKEN (aqui e no receber.php) por uma senha sua.");
}

/* =========================
   Registos
========================= */
const logs = [];
function log(msg) {
  const time = new Date().toLocaleTimeString("pt-BR");
  logs.unshift(`[${time}] ${msg}`);
  if (logs.length > 15) logs.pop();
  console.log(`[${time}] ${msg}`);
}

/* =========================
   Coleta de dados
========================= */
const ramHistory = [];

const runGit = (args) =>
  execFileSync("git", args, { cwd: __dirname, windowsHide: true, stdio: ["ignore", "pipe", "ignore"], timeout: 3000 })
    .toString().trim();

function getGit() {
  try {
    return {
      hash: runGit(["rev-parse", "--short", "HEAD"]),
      branch: runGit(["rev-parse", "--abbrev-ref", "HEAD"]),
      msg: runGit(["log", "-1", "--pretty=%B"]),
    };
  } catch (e) {
    return { hash: "N/A", branch: "N/A", msg: "sem dados" };
  }
}

function getDisk() {
  try {
    const s = fs.statfsSync(path.parse(process.cwd()).root);
    const size = s.blocks * s.bsize, avail = s.bavail * s.bsize, used = size - s.bfree * s.bsize;
    const g = (v) => (v / 1024 / 1024 / 1024).toFixed(0) + "G";
    return { size: g(size), used: g(used), avail: g(avail), percent: Math.round((used / size) * 100) + "%" };
  } catch (e) {
    return { size: "N/A", used: "N/A", avail: "N/A", percent: "0%" };
  }
}

// uso real do processador: compara duas leituras com 1 segundo de intervalo
const cpuSnap = () => os.cpus().map((c) => ({ idle: c.times.idle, total: Object.values(c.times).reduce((a, b) => a + b, 0) }));
async function medirCpu() {
  const a = cpuSnap();
  await new Promise((r) => setTimeout(r, 1000));
  const b = cpuSnap();
  let idle = 0, total = 0;
  b.forEach((x, i) => { idle += x.idle - a[i].idle; total += x.total - a[i].total; });
  return total ? Math.round((1 - idle / total) * 100) : 0;
}

async function coletar() {
  const cpus = os.cpus();
  const avgCpu = await medirCpu();
  const ramUsage = Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100);

  ramHistory.push({ time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }), value: ramUsage });
  if (ramHistory.length > 25) ramHistory.shift();

  const ips = Object.values(os.networkInterfaces()).flat().filter((i) => !i.internal && i.family === "IPv4");
  let files = [];
  try { files = fs.readdirSync(__dirname).slice(0, 7); } catch (e) {}

  const status =
    ramUsage > 85 ? { text: "crítico", msg: "a memória está quase cheia. reinicia ou liberta recursos." }
    : ramUsage > 65 ? { text: "sobrecarga", msg: "a memória está a subir. vale a pena vigiar." }
    : { text: "estável", msg: "tudo a funcionar sem problemas." };

  return {
    hostname: os.hostname(),
    ip: ips.length ? ips[0].address : "N/A",
    node: process.version,
    arch: os.arch(),
    sistema: os.type() + " " + os.release(),
    cpuCount: cpus.length,
    cpuModel: cpus[0] ? cpus[0].model.trim() : "N/A",
    avgCpu,
    ramUsage,
    ramTotal: os.totalmem(),
    ramFree: os.freemem(),
    disk: getDisk(),
    git: getGit(),
    files,
    pcUptime: os.uptime(),
    status,
    ramHistory,
    logs,
    enviadoEm: Date.now(),
    intervaloMin: INTERVALO_MIN,
  };
}

/* =========================
   Dados completos do painel local (núcleos, discos, processos, rede...)
   O agente pede ao index.js, que já roda no mesmo PC, e junta com os dados abaixo.
   Opcional no .env: PAINEL_LOCAL (padrão http://localhost:3000) e PAINEL_SENHA (se o painel tiver senha)
========================= */
async function dadosLocais() {
  try {
    const base = process.env.PAINEL_LOCAL || "http://localhost:" + (process.env.PORT || 3000);
    const headers = process.env.PAINEL_SENHA
      ? { Authorization: "Basic " + Buffer.from("agente:" + process.env.PAINEL_SENHA).toString("base64") }
      : {};
    const r = await fetch(base + "/api/dados", { headers, cache: "no-store", signal: AbortSignal.timeout(5000) });
    return r.ok ? await r.json() : null;
  } catch (e) {
    return null; // painel local desligado: segue só com os dados básicos
  }
}

/* =========================
   Envio
========================= */
async function enviar() {
  try {
    const base = await coletar();
    const local = await dadosLocais();
    if (!local) log("painel local não respondeu · enviando só os dados básicos");
    const dados = {
      ...base,
      ...(local || {}),
      // campos que o painel novo lê (e os do agente que não podem ser trocados pelos do painel local)
      ts: base.enviadoEm,
      uptime: base.pcUptime,
      pcUptime: base.pcUptime,
      enviadoEm: base.enviadoEm,
      intervaloMin: base.intervaloMin,
      logs: base.logs,
    };
    const r = await fetch(URL_RECEBER, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Token": TOKEN },
      body: JSON.stringify(dados),
      signal: AbortSignal.timeout(20000),
    });
    if (r.redirected) throw new Error("o endereço foi redirecionado para " + r.url + " · use esse endereço em URL_RECEBER");
    if (!r.ok) throw new Error("o site respondeu " + r.status);
    const resp = await r.json().catch(() => null);
    if (!resp || resp.ok !== true) throw new Error("a resposta não veio do receber.php · confira a URL_RECEBER");
    log("dados enviados");
  } catch (e) {
    log("falha no envio: " + e.message);
  }
}

log("agente iniciado · envia a cada " + INTERVALO_MIN + " min");
enviar();
setInterval(enviar, INTERVALO_MIN * 60 * 1000);
