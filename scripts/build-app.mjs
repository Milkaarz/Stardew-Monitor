#!/usr/bin/env node
/**
 * Gera o aplicativo baixável do Stardew Monitor: UM executável, sem precisar instalar Node.js.
 *
 *   npm run app:build
 *
 * Etapas:
 *  1. compila a interface (Vite);
 *  2. junta backend + coletor + banco num único arquivo (esbuild);
 *  3. embute esse arquivo e a interface no próprio Node.js ("single executable application");
 *  4. resultado em release/: StardewMonitor-<sistema>-<arquitetura>(.exe)
 *
 * O executável funciona no mesmo sistema/arquitetura em que foi gerado (Windows gera .exe,
 * Linux gera o binário Linux). O GitHub Actions gera as duas versões.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'build', 'app');
const RELEASE = path.join(ROOT, 'release');
const WIN = process.platform === 'win32';
const SENTINEL = 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2';

const step = (msg) => console.log(`\n▶ ${msg}`);
const run = (cmd, args) => execFileSync(cmd, args, { stdio: 'inherit', cwd: ROOT });

const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 22 || (major === 22 && minor < 13)) {
  console.error(`Node ${process.version} é antigo demais: use Node 22.13+ (o executável usa o Node que roda este script).`);
  process.exit(1);
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(RELEASE, { recursive: true });

step('1/4 Compilando a interface');
execFileSync('npm run build', { stdio: 'inherit', cwd: ROOT, shell: true });
const dist = path.join(ROOT, 'frontend', 'dist');

step('2/4 Empacotando o servidor num único arquivo');
const bundle = path.join(OUT, 'main.cjs');
await build({
  entryPoints: [path.join(ROOT, 'app', 'main.js')],
  outfile: bundle,
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node22',
  minify: true,
  legalComments: 'none',
  // dependências opcionais que não existem/não são usadas no Windows/Linux
  external: ['pg-native', 'osx-temperature-sensor', 'cpu-features'],
  logLevel: 'warning',
  logOverride: { 'empty-import-meta': 'silent' },
});

step('3/4 Embutindo no Node.js');
const assets = {};
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else assets[`web/${path.relative(dist, full).split(path.sep).join('/')}`] = full;
  }
};
walk(dist);
const blob = path.join(OUT, 'sea-prep.blob');
const seaConfig = path.join(OUT, 'sea-config.json');
fs.writeFileSync(seaConfig, JSON.stringify({
  main: bundle,
  output: blob,
  disableExperimentalSEAWarning: true,
  useSnapshot: false,
  useCodeCache: false,
  assets,
}, null, 2));
run(process.execPath, ['--experimental-sea-config', seaConfig]);

const arch = process.arch;
const osName = { win32: 'windows', linux: 'linux', darwin: 'macos' }[process.platform] || process.platform;
const exe = path.join(RELEASE, `StardewMonitor-${osName}-${arch}${WIN ? '.exe' : ''}`);
fs.rmSync(exe, { force: true });
fs.copyFileSync(process.execPath, exe);
if (process.platform === 'darwin') {
  try {
    execFileSync('codesign', ['--remove-signature', exe]);
  } catch {
    /* sem codesign */
  }
}
const postject = path.join(ROOT, 'node_modules', 'postject', 'dist', 'cli.js');
run(process.execPath, [postject, exe, 'NODE_SEA_BLOB', blob, '--sentinel-fuse', SENTINEL, ...(process.platform === 'darwin' ? ['--macho-segment-name', 'NODE_SEA'] : [])]);
if (process.platform === 'darwin') {
  try {
    execFileSync('codesign', ['--sign', '-', exe]);
  } catch {
    /* sem codesign */
  }
}
if (!WIN) fs.chmodSync(exe, 0o755);

step('4/4 Pronto');
const mb = (fs.statSync(exe).size / 1048576).toFixed(0);
console.log(`  ${path.relative(ROOT, exe)} (${mb} MB, ${Object.keys(assets).length} arquivos da interface embutidos)`);
console.log('  Dê dois cliques (ou rode no terminal) para abrir o painel deste computador.');
