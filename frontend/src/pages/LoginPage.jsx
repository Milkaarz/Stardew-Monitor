import { useState } from 'preact/hooks';
import { api } from '../services/api.js';
import { setState } from '../services/store.js';
import { Panel, Button, Field, ErrorBox, StatusPill, useAsync, Loading } from '../components/ui.jsx';
import { formatPercent } from '@stardew-monitor/shared/format';

function PublicTown() {
  const { data, error, loading } = useAsync(() => api.get('/public/town'), []);
  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  return (
    <ul class="kv">
      {data.farms.map((f) => (
        <li key={f.uid}>
          <span>{f.farmName}</span>
          <b class="row">
            <StatusPill status={f.status} />
            <span class="num">CPU {formatPercent(f.cpu)} · RAM {formatPercent(f.ram)} · Disco {formatPercent(f.disk)}</span>
          </b>
        </li>
      ))}
    </ul>
  );
}

export function LoginPage({ error: bootError, features = {}, onRetry }) {
  const [form, setForm] = useState({ username: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [showPublic, setShowPublic] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await api.post('/auth/login', form);
      setState({ auth: { status: 'authenticated', user: r.user, csrf: r.csrf, features } });
      location.hash = '#/';
      // recarrega /auth/me para obter as "features" atualizadas
      const me = await api.get('/auth/me');
      setState({ auth: { status: 'authenticated', user: me.user, csrf: me.csrf, features: me.features } });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div class="login-wrap">
      <div class="login-card">
        <a class="logo" href="#/" aria-label="Stardew Monitor">
          <h1>STARDEW MONITOR</h1>
        </a>
        <Panel title="🚪 Entrar na fazenda">
          {bootError && <ErrorBox error={{ message: `Servidor indisponível: ${bootError}` }} onRetry={onRetry} />}
          <form class="stack" onSubmit={submit}>
            <Field label="Usuário">
              <input class="input" autocomplete="username" required maxLength={64} value={form.username} onInput={(e) => setForm({ ...form, username: e.currentTarget.value })} />
            </Field>
            <Field label="Senha">
              <input class="input" type="password" autocomplete="current-password" required maxLength={200} value={form.password} onInput={(e) => setForm({ ...form, password: e.currentTarget.value })} />
            </Field>
            <ErrorBox error={error} />
            <div class="row spread">
              <Button type="submit" disabled={busy}>{busy ? 'Entrando...' : 'Entrar'}</Button>
              {features.publicDashboard && (
                <Button variant="light" small onClick={() => setShowPublic(!showPublic)}>{showPublic ? 'Ocultar' : 'Ver'} Pelican Town pública</Button>
              )}
            </div>
            <p class="muted" style={{ fontSize: '1rem' }}>
              Primeiro acesso? A senha do administrador é a de <code>ADMIN_PASSWORD</code> ou a que aparece no log do servidor na primeira inicialização.
            </p>
          </form>
        </Panel>
        {showPublic && (
          <Panel title="🏘️ Pelican Town (público)">
            <PublicTown />
          </Panel>
        )}
      </div>
    </div>
  );
}
