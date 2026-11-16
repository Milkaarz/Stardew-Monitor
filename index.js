const express = require("express");
const os = require("os");
const fs = require("fs");
const path = require("path");
const { execFile, execFileSync } = require("child_process");
const run = require("util").promisify(execFile);

const app = express();
const PORT = process.env.PORT || 3001;
const WIN = process.platform === "win32";

/* =========================
   Senha opcional (defina PAINEL_SENHA nas variáveis de ambiente da hospedagem)
   Usuário: qualquer um · Senha: o valor de PAINEL_SENHA
========================= */
const SENHA = process.env.PAINEL_SENHA;
if (SENHA) {
  app.use((req, res, next) => {
    const h = req.headers.authorization || "";
    const dec = Buffer.from(h.split(" ")[1] || "", "base64").toString();
    if (dec.slice(dec.indexOf(":") + 1) === SENHA) return next();
    res.set("WWW-Authenticate", 'Basic realm="painel"').status(401).send("senha necessária");
  });
}

/* =========================
   Registos e contadores
========================= */
let totalRequests = 0;
const logsArray = [];
const ramHistory = [];
const cpuHistory = [];

const originalLog = console.log;
console.log = function (...args) {
  const time = new Date().toLocaleTimeString("pt-PT");
  logsArray.unshift(`[${time}] ${args.join(" ")}`);
  if (logsArray.length > 15) logsArray.pop();
  originalLog.apply(console, args);
};

// conta só as visitas à página (não as atualizações automáticas)
app.use((req, res, next) => { if (req.path === "/") totalRequests++; next(); });

const calcPercent = (p, t) => (t ? ((p / t) * 100).toFixed(0) : "0");
const push = (arr, v, max = 40) => { arr.push(v); if (arr.length > max) arr.shift(); };

/* =========================
   Amostragem a cada 10 s (CPU, rede e processos precisam de duas leituras)
========================= */
let prevTimes = os.cpus().map((c) => c.times);
let cores = [], avgCpu = 0;
let procs = [], prevProcs = new Map();
let net = { iface: "N/A", down: 0, up: 0, rx: 0, tx: 0 }, prevNet = null;
let ultimaAmostra = 0;

function amostrarCpu() {
  const agora = os.cpus();
  cores = agora.map((c, i) => {
    const a = prevTimes[i], b = c.times;
    const total = Object.keys(b).reduce((s, k) => s + b[k] - a[k], 0);
    return total ? Math.round((1 - (b.idle - a.idle) / total) * 100) : 0;
  });
  prevTimes = agora.map((c) => c.times);
  avgCpu = cores.length ? Math.round(cores.reduce((s, v) => s + v, 0) / cores.length) : 0;
}

async function netBytes() {
  try {
    if (WIN) {
      const { stdout } = await run("netstat", ["-e"], { windowsHide: true, timeout: 4000 });
      const m = stdout.match(/^\s*Bytes\s+(\d+)\s+(\d+)/im);
      return m ? { rx: Number(m[1]), tx: Number(m[2]) } : null;
    }
    let rx = 0, tx = 0;
    for (const l of fs.readFileSync("/proc/net/dev", "utf8").split("\n").slice(2)) {
      const [nome, v] = l.split(":");
      if (!v || nome.trim() === "lo") continue;
      const f = v.trim().split(/\s+/);
      rx += Number(f[0]); tx += Number(f[8]);
    }
    return { rx, tx };
  } catch (e) { return null; }
}

async function listarProcessos(dt) {
  try {
    if (WIN) {
      const { stdout } = await run("powershell", ["-NoProfile", "-Command",
        "Get-Process | Select-Object Id,ProcessName,CPU,WorkingSet64 | ConvertTo-Json -Compress"],
        { windowsHide: true, timeout: 8000, maxBuffer: 8 * 1024 * 1024 });
      const lista = [].concat(JSON.parse(stdout));
      const atual = new Map();
      const out = lista.map((p) => {
        const cpuSeg = Number(p.CPU) || 0;
        atual.set(p.Id, cpuSeg);
        const antes = prevProcs.get(p.Id);
        const cpu = antes != null && dt ? Math.max(0, (cpuSeg - antes) / dt / os.cpus().length * 100) : 0;
        return { pid: p.Id, user: "-", cpu, mem: (p.WorkingSet64 / os.totalmem()) * 100, name: p.ProcessName + ".exe" };
      });
      prevProcs = atual;
      return out.sort((a, b) => b.cpu - a.cpu).slice(0, 8);
    }
    const { stdout } = await run("ps", ["-eo", "pid=,user=,pcpu=,pmem=,comm=", "--sort=-pcpu"], { timeout: 4000 });
    return stdout.trim().split("\n").slice(0, 8).map((l) => {
      const f = l.trim().split(/\s+/);
      return { pid: Number(f[0]), user: f[1], cpu: Number(f[2]), mem: Number(f[3]), name: f.slice(4).join(" ") };
    });
  } catch (e) { return procs; }
}

async function amostrar() {
  const agora = Date.now(), dt = ultimaAmostra ? (agora - ultimaAmostra) / 1000 : 0;
  ultimaAmostra = agora;
  amostrarCpu();
  push(cpuHistory, avgCpu);
  push(ramHistory, {
    time: new Date().toLocaleTimeString("pt-PT"),
    value: Number(calcPercent(os.totalmem() - os.freemem(), os.totalmem())),
  });
  const b = await netBytes();
  const iface = Object.entries(os.networkInterfaces()).find(([, l]) => (l || []).some((i) => !i.internal && i.family === "IPv4"));
  if (b) {
    net = {
      iface: iface ? iface[0] : "N/A",
      down: prevNet && dt ? Math.max(0, (b.rx - prevNet.rx) / dt) : 0,
      up: prevNet && dt ? Math.max(0, (b.tx - prevNet.tx) / dt) : 0,
      rx: b.rx, tx: b.tx,
    };
    prevNet = b;
  }
  procs = await listarProcessos(dt);
}
setTimeout(() => { amostrar(); setInterval(amostrar, 10000); }, 1000);

/* =========================
   Dados do sistema
========================= */
const runGit = (args) =>
  execFileSync("git", args, { windowsHide: true, stdio: ["ignore", "pipe", "ignore"], timeout: 3000 }).toString().trim();

let gitCache = { hash: "N/A", branch: "N/A", msg: "sem dados" }, gitAt = 0;
function getGit() {
  if (Date.now() - gitAt < 60000) return gitCache;
  gitAt = Date.now();
  try {
    gitCache = {
      hash: runGit(["rev-parse", "--short", "HEAD"]),
      branch: runGit(["rev-parse", "--abbrev-ref", "HEAD"]),
      msg: runGit(["log", "-1", "--pretty=%B"]),
    };
  } catch (e) {}
  return gitCache;
}

// todos os discos (Windows: letras A-Z; Linux/macOS: "/"). O disco do projeto vira o "Silo".
function getDisks() {
  const raiz = path.parse(process.cwd()).root;
  const montagens = WIN ? "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((l) => l + ":") : ["/"];
  const out = [];
  for (const m of montagens) {
    try {
      const s = fs.statfsSync(WIN ? m + "\\" : m);
      const size = s.blocks * s.bsize, free = s.bavail * s.bsize, used = size - s.bfree * s.bsize;
      if (size > 0) out.push({
        name: m, size, used, free, pct: Math.round((used / size) * 100),
        principal: WIN ? raiz.slice(0, 2).toUpperCase() === m : true,
      });
    } catch (e) {}
  }
  return out;
}

function getSwap() {
  try {
    const t = fs.readFileSync("/proc/meminfo", "utf8");
    const kb = (k) => Number(t.match(new RegExp("^" + k + ":\\s+(\\d+)", "m"))[1]) * 1024;
    const total = kb("SwapTotal"), used = total - kb("SwapFree");
    return total ? { total, used, pct: Math.round((used / total) * 100) } : null;
  } catch (e) { return null; }   // Windows/macOS: sem swap no painel
}

function getSystemData() {
  const cpus = os.cpus();
  const ips = Object.values(os.networkInterfaces()).flat().filter((i) => !i.internal && i.family === "IPv4");
  const ramUsage = Number(calcPercent(os.totalmem() - os.freemem(), os.totalmem()));
  const status =
    ramUsage > 85 ? { text: "crítico", msg: "a memória está quase cheia. reinicia ou liberta recursos." }
    : ramUsage > 65 ? { text: "sobrecarga", msg: "a memória está a subir. vale a pena vigiar." }
    : { text: "estável", msg: "tudo a funcionar sem problemas." };

  let files = [];
  try { files = fs.readdirSync(".").slice(0, 7); } catch (e) {}

  if (ramHistory.length === 0) ramHistory.push({ time: new Date().toLocaleTimeString("pt-PT"), value: ramUsage });

  return {
    ts: Date.now(),
    hostname: os.hostname(),
    ip: ips.length ? ips[0].address : "N/A",
    node: process.version,
    arch: os.arch(),
    sistema: os.type() + " " + os.release(),
    porta: String(PORT),
    cpuCount: cpus.length,
    cpuModel: cpus[0] ? cpus[0].model.trim() : "N/A",
    cpuSpeed: cpus[0] ? Number((cpus[0].speed / 1000).toFixed(1)) : null,
    avgCpu,
    cores,
    load: os.loadavg(),
    ramUsage,
    ramTotal: os.totalmem(),
    ramFree: os.freemem(),
    swap: getSwap(),
    rss: process.memoryUsage().rss,
    disks: getDisks(),
    procs,
    net,
    git: getGit(),
    files,
    uptime: process.uptime(),
    requests: totalRequests,
    status,
    cpuHistory,
    ramHistory,
    logs: logsArray,
  };
}

/* =========================
   Rotas
========================= */
app.get("/api/dados", (req, res) => {
  res.set("Cache-Control", "no-store");
  res.json(getSystemData());
});

// a página (HTML, CSS e JS do navegador) fica em public/index.html
app.use(express.static(path.join(__dirname, "public")));

app.listen(PORT, () => console.log("painel pronto na porta " + PORT));
