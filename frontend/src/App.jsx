/**
 * Casca do aplicativo: carregamento inicial, barra superior, navegação e roteamento.
 * Sem login: o painel roda só neste computador.
 */
import { useEffect } from 'preact/hooks';
import { getSeason, SEASON_LABELS } from '@stardew-monitor/shared';
import { api } from './services/api.js';
import { setState, useStore, selectedMachine } from './services/store.js';
import { connectLive, disconnectLive } from './services/live.js';
import { useRoute } from './services/router.js';
import { setSoundPrefs } from './audio/sound.js';
import { Toasts, Loading, ErrorBox, Panel, useNow } from './components/ui.jsx';
import { MachinePicker } from './components/MachinePicker.jsx';
import { FarmPage } from './pages/FarmPage.jsx';
import { TownPage } from './pages/TownPage.jsx';
import { HistoryPage } from './pages/HistoryPage.jsx';
import { ProcessesPage } from './pages/ProcessesPage.jsx';
import { DiaryPage } from './pages/DiaryPage.jsx';
import { QuestsPage } from './pages/QuestsPage.jsx';
import { AchievementsPage } from './pages/AchievementsPage.jsx';
import { NotificationsPage } from './pages/NotificationsPage.jsx';
import { SettingsPage } from './pages/SettingsPage.jsx';

const ROUTES = [
  { path: '/', label: 'Fazenda', icon: '🌾', page: FarmPage },
  { path: '/town', label: 'Pelican Town', icon: '🏘️', page: TownPage },
  { path: '/history', label: 'Histórico', icon: '📈', page: HistoryPage },
  { path: '/processes', label: 'Moradores', icon: '🧑‍🌾', page: ProcessesPage },
  { path: '/diary', label: 'Diário', icon: '📖', page: DiaryPage },
  { path: '/quests', label: 'Missões', icon: '📜', page: QuestsPage },
  { path: '/achievements', label: 'Conquistas', icon: '🏆', page: AchievementsPage },
  { path: '/notifications', label: 'Avisos', icon: '🔔', page: NotificationsPage },
  { path: '/settings', label: 'Ajustes', icon: '⚙️', page: SettingsPage },
];

/** Carrega configurações e preferências; se o servidor local não responder, mostra o aviso. */
export async function boot() {
  setState({ status: 'loading', error: null });
  try {
    const r = await api.get('/settings');
    const prefs = r.settings.preferences || {};
    setState({ settings: r.settings, secrets: r.secrets || null, prefs, status: 'ready', selectedId: prefs.selectedMachine != null ? Number(prefs.selectedMachine) || null : null });
    setSoundPrefs(prefs);
  } catch (err) {
    setState({ status: 'error', error: err.message });
  }
}

export async function loadSettings() {
  try {
    const r = await api.get('/settings');
    setState({ settings: r.settings, secrets: r.secrets || null });
  } catch {
    /* mantém as anteriores */
  }
}

function Logo() {
  return (
    <a class="logo" href="#/" aria-label="Stardew Monitor: voltar para a fazenda">
      <svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">
        <rect width="16" height="16" fill="#7cc4ec" />
        <rect y="11" width="16" height="5" fill="#4caf50" />
        <rect x="3" y="6" width="10" height="6" fill="#c89a5a" />
        <rect x="2" y="4" width="12" height="3" fill="#b3402a" />
        <rect x="4" y="2" width="8" height="2" fill="#c9503a" />
        <rect x="7" y="8" width="2" height="4" fill="#6b3a12" />
        <rect x="4" y="7" width="2" height="2" fill="#ffe27a" />
        <rect x="10" y="7" width="2" height="2" fill="#ffe27a" />
      </svg>
      <h1>STARDEW MONITOR</h1>
    </a>
  );
}

function ConnectionBadge() {
  const c = useStore((s) => s.connection);
  const map = { live: ['ok', 'Ao vivo'], polling: ['warn', 'Atualização periódica'], connecting: ['warn', 'Conectando...'], offline: ['offline', 'Sem conexão'] };
  const [lvl, text] = map[c] || map.connecting;
  return (
    <span class={`pill lvl-${lvl}`} title="Estado da conexão em tempo real">
      <span class="dot" aria-hidden="true" /> {text}
    </span>
  );
}

function DateBox() {
  const now = useNow(30e3);
  const settings = useStore((s) => s.settings);
  const ap = settings?.appearance || {};
  const s = getSeason(now, { mode: ap.seasonMode || 'south', farmEpoch: ap.farmEpoch });
  return (
    <div class="datebox" title={`Estação ${ap.seasonMode === 'farm' ? 'do calendário da fazenda' : `do hemisfério ${ap.seasonMode === 'north' ? 'norte' : 'sul'}`}`}>
      <span class="pixel">{SEASON_LABELS[s.season]}</span>
      <span class="num">Dia {s.day}</span>
      <span class="pixel">{now.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</span>
      <span class="num">{now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
    </div>
  );
}

function Nav({ path }) {
  const unread = useStore((s) => s.unread);
  return (
    <nav class="nav" aria-label="Seções">
      {ROUTES.map((r) => (
        <a key={r.path} href={`#${r.path}`} aria-current={path === r.path ? 'page' : undefined}>
          <span aria-hidden="true">{r.icon}</span> {r.label}
          {r.path === '/notifications' && unread > 0 && <span class="badge">{unread > 99 ? '99+' : unread}</span>}
        </a>
      ))}
    </nav>
  );
}

export function App() {
  const status = useStore((s) => s.status);
  const error = useStore((s) => s.error);
  const route = useRoute();
  const machine = useStore(() => selectedMachine());
  const uiTheme = useStore((s) => s.prefs.uiTheme || 'auto');
  const reducedMotion = useStore((s) => !!s.prefs.reducedMotion);

  useEffect(() => {
    boot();
  }, []);

  useEffect(() => {
    if (status !== 'ready') return undefined;
    connectLive();
    api.get('/notifications?limit=1').then((r) => setState({ unread: r.unread })).catch(() => {});
    return () => disconnectLive();
  }, [status]);

  // tema da interface: o da fazenda selecionada (ou o escolhido nas preferências)
  const theme = uiTheme === 'auto' ? machine?.machine?.theme || 'standard' : uiTheme;
  useEffect(() => {
    document.documentElement.dataset.ui = theme;
    document.documentElement.dataset.motion = reducedMotion ? 'reduced' : 'full';
  }, [theme, reducedMotion]);

  if (status === 'loading') return <div class="shell"><Loading text="Abrindo o portão da fazenda..." /></div>;
  if (status === 'error') {
    return (
      <div class="shell">
        <header class="topbar"><Logo /></header>
        <Panel title="🚪 Fazenda fechada">
          <ErrorBox error={{ message: error }} onRetry={boot} />
          <p>O painel não conseguiu falar com o Stardew Monitor neste computador. Abra o aplicativo de novo (ou rode <code>npm start</code>) e clique em "Tentar de novo".</p>
        </Panel>
      </div>
    );
  }

  const current = ROUTES.find((r) => r.path === route.path) || ROUTES[0];
  const Page = current.page;
  return (
    <div class="shell">
      <header class="topbar">
        <Logo />
        <MachinePicker />
        <DateBox />
        <ConnectionBadge />
      </header>
      <Nav path={current.path} />
      <main class="page-enter" key={current.path}>
        <Page route={route} />
      </main>
      <footer class="footer muted">
        Stardew Monitor v3 · fan-made, inspirado na estética de jogos de fazenda em pixel art · os números exibidos são leituras reais deste computador
      </footer>
      <Toasts />
    </div>
  );
}
