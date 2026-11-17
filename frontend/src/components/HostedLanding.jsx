/**
 * Tela mostrada quando a interface é aberta FORA do aplicativo (ex.: site publicado no Netlify).
 * Um site na internet não consegue ler o hardware de quem o visita: o monitor roda no próprio
 * computador. Aqui oferecemos baixar o aplicativo ou abrir o painel local, se ele já estiver aberto.
 */
import { useEffect, useState } from 'preact/hooks';
import { Panel } from './ui.jsx';

export const RELEASES_URL = 'https://github.com/Milkaarz/Stardew-Monitor/releases/latest';
// link direto para o arquivo da versão mais recente (o nome precisa ser igual ao anexado na Release)
const DOWNLOADS = {
  windows: { file: 'StardewMonitor-windows-x64.exe', label: 'Baixar para Windows (.exe, ~90 MB)' },
  linux: { file: 'StardewMonitor-linux-x64', label: 'Baixar para Linux (~100 MB)' },
};
const downloadUrl = (file) => `${RELEASES_URL}/download/${file}`;

function detectOs() {
  const ua = `${navigator.userAgentData?.platform || ''} ${navigator.userAgent}`.toLowerCase();
  if (ua.includes('win')) return 'windows';
  if (ua.includes('linux') && !ua.includes('android')) return 'linux';
  return null;
}
const PORTS = [3001, 3002, 3003, 3004, 3005];

/**
 * Procura o aplicativo aberto neste computador. Sem CORS a resposta é "opaca", mas o simples fato
 * de a conexão dar certo indica que há algo escutando na porta.
 */
async function findLocalApp() {
  for (const port of PORTS) {
    try {
      await fetch(`http://localhost:${port}/api/health`, { mode: 'no-cors', cache: 'no-store', signal: AbortSignal.timeout(1500) });
      return `http://localhost:${port}`;
    } catch {
      /* porta fechada */
    }
  }
  return null;
}

export function HostedLanding() {
  const os = detectOs();
  const [local, setLocal] = useState({ checking: true, url: null });
  const check = () => {
    setLocal({ checking: true, url: null });
    findLocalApp().then((url) => setLocal({ checking: false, url }));
  };
  useEffect(check, []);

  return (
    <div class="shell">
      <header class="topbar">
        <a class="logo" href={RELEASES_URL} aria-label="Stardew Monitor">
          <h1>STARDEW MONITOR</h1>
        </a>
      </header>
      <Panel title="🌾 A fazenda mora no seu computador">
        <div class="stack">
          <p>
            O Stardew Monitor mostra os dados <b>reais</b> do computador (CPU, memória, discos, rede, GPU, temperaturas…).
            Um site na internet não consegue ler o hardware de quem o visita, então o monitor roda como um
            <b> aplicativo no seu computador</b> e abre o painel no navegador, em <code>localhost</code>. Sem login e sem conta.
          </p>

          {local.checking ? (
            <div class="notice">🔎 Procurando o Stardew Monitor neste computador...</div>
          ) : local.url ? (
            <div class="notice">
              ✅ Encontrei o aplicativo aberto neste computador.
              <div class="row" style={{ marginTop: '10px' }}>
                <a class="btn" href={local.url}>Abrir meu painel</a>
                <span class="muted">{local.url}</span>
              </div>
            </div>
          ) : (
            <div class="notice warn">O aplicativo não está aberto neste computador (ou o navegador bloqueou a verificação).</div>
          )}

          <h3 style={{ marginTop: '18px' }}>1. Baixe o aplicativo Stardew Monitor</h3>
          <p>
            É um único arquivo: o próprio monitor, com a fazenda dentro. Ele lê os dados do computador onde for aberto e
            mostra o painel no navegador. Não instala nada no sistema e não precisa de internet para funcionar.
          </p>
          <div class="row">
            {(os ? [os, ...Object.keys(DOWNLOADS).filter((k) => k !== os)] : Object.keys(DOWNLOADS)).map((k, i) => (
              <a key={k} class={`btn ${i === 0 && os ? '' : 'light'}`} href={downloadUrl(DOWNLOADS[k].file)}>⬇️ {DOWNLOADS[k].label}</a>
            ))}
          </div>
          <p class="muted">
            Arquivos: <code>StardewMonitor-windows-x64.exe</code> e <code>StardewMonitor-linux-x64</code> ·{' '}
            <a href={RELEASES_URL} target="_blank" rel="noopener">todas as versões e somas SHA-256</a>
          </p>

          <h3 style={{ marginTop: '18px' }}>2. Abra o arquivo</h3>
          <p>
            Dê dois cliques (no Linux: <code>chmod +x StardewMonitor-linux-x64</code> e depois execute). Uma janela mostra o endereço do painel. Na primeira vez o Windows pode avisar que o arquivo não tem
            assinatura digital: clique em <b>Mais informações → Executar assim mesmo</b>.
          </p>

          <h3 style={{ marginTop: '18px' }}>3. Use o painel</h3>
          <p>
            O navegador abre sozinho em <a href="http://localhost:3001">http://localhost:3001</a>, com a fazenda do seu computador.
            Para encerrar, feche a janela do aplicativo.
          </p>

          <div class="row">
            <button class="btn light small" onClick={check}>Verificar de novo</button>
            <a class="btn light small" href="http://localhost:3001">Já está aberto? Ir para localhost:3001</a>
          </div>
        </div>
      </Panel>
      <footer class="footer muted">
        Stardew Monitor · fan-made, inspirado na estética de jogos de fazenda em pixel art · os dados nunca saem do seu computador
      </footer>
    </div>
  );
}
