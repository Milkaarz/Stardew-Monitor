/**
 * Casca do aplicativo: autenticação, barra superior, navegação e roteamento.
 */
import { useEffect } from 'preact/hooks';
import { getSeason, SEASON_LABELS } from '@stardew-monitor/shared';
import { api } from './services/api.js';
import { setState, state, useStore, selectedMachine } from './services/store.js';
import { connectLive, disconnectLive } from './services/live.js';
import { navigate, useRoute } from './services/router.js';
import { setSoundPrefs } from './audio/sound.js';
import { Toasts, Loading, useNow } from './components/ui.jsx';
import { MachinePicker } from './components/MachinePicker.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
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

export async function loadSession() {
  try {
    const me = await api.get('/auth/me');
    setState({ auth: { status: 'authenticated', user: me.user, csrf: me.csrf, features: me.features } });
  } catch (err) {
    setState({ auth: { status: err.status === 401 ? 'anonymous' : 'error', user: null, csrf: null, features: {}, error: err.message } });
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

function UserMenu() {
  const user = useStore((s) => s.auth.user);
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      disconnectLive();
      setState({ auth: { ...state.auth, status: 'anonymous', user: null, csrf: null }, machines: {} });
      navigate('/');
    }
  };
  return (
    <div class="row">
      <span class="muted" title={user?.role === 'admin' ? 'Administrador' : 'Visitante (somente leitura)'}>
        {user?.role === 'admin' ? '👑' : '👀'} {user?.username}
      </span>
      <button class="btn small light" onClick={logout}>Sair</button>
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
  const auth = useStore((s) => s.auth);
  const route = useRoute();
  const machine = useStore(() => selectedMachine());
  const uiTheme = useStore((s) => s.auth.user?.prefs?.uiTheme || 'auto');

  useEffect(() => {
    loadSession();
  }, []);

  useEffect(() => {
    if (auth.status !== 'authenticated') return undefined;
    connectLive();
    loadSettings();
    api.get('/notifications?limit=1').then((r) => setState({ unread: r.unread })).catch(() => {});
    setSoundPrefs(auth.user?.prefs || {});
    const sel = auth.user?.prefs?.selectedMachine;
    if (sel != null) setState({ selectedId: Number(sel) || null });
    return () => disconnectLive();
  }, [auth.status]);

  // tema da interface: o da fazenda selecionada (ou o escolhido nas preferências)
  const theme = uiTheme === 'auto' ? machine?.machine?.theme || 'standard' : uiTheme;
  useEffect(() => {
    document.documentElement.dataset.ui = theme;
    document.documentElement.dataset.motion = auth.user?.prefs?.reducedMotion ? 'reduced' : 'full';
  }, [theme, auth.user?.prefs?.reducedMotion]);

  if (auth.status === 'loading') return <div class="shell"><Loading text="Abrindo o portão da fazenda..." /></div>;
  if (auth.status !== 'authenticated') {
    return (
      <>
        <LoginPage error={auth.status === 'error' ? auth.error : null} features={auth.features} onRetry={loadSession} />
        <Toasts />
      </>
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
        <UserMenu />
      </header>
      <Nav path={current.path} />
      <main class="page-enter" key={current.path}>
        <Page route={route} />
      </main>
      <footer class="footer muted">
        Stardew Monitor v3 · fan-made, inspirado na estética de jogos de fazenda em pixel art · os números exibidos são leituras reais das máquinas
      </footer>
      <Toasts />
    </div>
  );
}
