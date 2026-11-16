// PM2: sobe o painel local e o agente juntos.
//   pm2 start ecosystem.config.js            (os dois)
//   pm2 start ecosystem.config.js --only painel
//   pm2 start ecosystem.config.js --only agente
//
// Node portátil (sem estar no PATH)? Defina NODE_BIN antes de iniciar:
//   PowerShell:  $env:NODE_BIN="C:/caminho/para/node.exe"; pm2 start ecosystem.config.js
const interpreter = process.env.NODE_BIN || "node";

module.exports = {
  apps: [
    { name: "painel-stardew", script: "index.js", interpreter },
    { name: "agente-stardew", script: "agente-stardew.js", interpreter, node_args: "--env-file=.env" },
  ],
};
