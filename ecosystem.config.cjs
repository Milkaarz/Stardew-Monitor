// PM2: mantém o servidor e/ou o agente rodando em segundo plano e ao ligar o PC.
//   pm2 start ecosystem.config.cjs                 (servidor + agente)
//   pm2 start ecosystem.config.cjs --only servidor
//   pm2 start ecosystem.config.cjs --only agente
//   pm2 start ecosystem.config.cjs --only agente-php   (modo legado: hospedagem PHP)
//   pm2 save && pm2 startup
// Node portátil (fora do PATH)? Defina NODE_BIN antes:  $env:NODE_BIN="C:/caminho/node.exe"
const interpreter = process.env.NODE_BIN || 'node';

module.exports = {
  apps: [
    { name: 'servidor', script: 'backend/src/index.js', interpreter, env: { NODE_ENV: 'production' } },
    { name: 'agente', script: 'agent/src/index.js', interpreter },
    { name: 'agente-php', script: 'legacy/agente-stardew.cjs', interpreter, node_args: '--env-file=.env', autorestart: true },
  ],
};
