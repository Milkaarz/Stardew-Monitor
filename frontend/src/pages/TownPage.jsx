/**
 * Pelican Town: uma casinha por máquina monitorada.
 * Verde = normal · Amarelo = atenção · Vermelho = problema · Cinza = desconectada
 */
import { useState } from 'preact/hooks';
import { THEMES, formatPercent } from '@stardew-monitor/shared';
import { api } from '../services/api.js';
import { useStore, toast } from '../services/store.js';
import { navigate } from '../services/router.js';
import { selectMachine } from '../components/MachinePicker.jsx';
import { Panel, Button, Field, Modal, ErrorBox, StatusPill, Empty, timeAgo, useNow, levelClass, STATUS_LABEL } from '../components/ui.jsx';

const ROOF = { ok: '#3fae49', warn: '#f2b600', crit: '#d9381e', offline: '#8d8d8d' };

function MiniHouse({ status, theme }) {
  const wall = theme === 'mines' ? '#6b6461' : theme === 'beach' ? '#e9d394' : '#c89a5a';
  return (
    <svg viewBox="0 0 24 20" shape-rendering="crispEdges" aria-hidden="true">
      <rect x="0" y="17" width="24" height="3" fill={theme === 'beach' ? '#e9d394' : theme === 'mines' ? '#3a3548' : '#4caf50'} />
      <rect x="17" y="2" width="3" height="6" fill="#8a8a8a" />
      <rect x="2" y="7" width="20" height="3" fill={ROOF[status]} />
      <rect x="4" y="5" width="16" height="2" fill={ROOF[status]} />
      <rect x="6" y="3" width="12" height="2" fill={ROOF[status]} />
      <rect x="3" y="10" width="18" height="8" fill={wall} />
      <rect x="10" y="12" width="4" height="6" fill="#6b3a12" />
      <rect x="5" y="12" width="3" height="3" fill={status === 'offline' ? '#555' : '#ffe27a'} />
      <rect x="16" y="12" width="3" height="3" fill={status === 'offline' ? '#555' : '#ffe27a'} />
      {status === 'crit' && <rect x="11" y="0" width="2" height="2" fill="#d9381e" />}
    </svg>
  );
}

function AgentInstructions({ token }) {
  const origin = location.origin;
  const env = `STARDEW_SERVER_URL=${origin}\nSTARDEW_AGENT_TOKEN=${token}\nSTARDEW_INTERVAL=10`;
  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Copiado!', level: 'ok', timeout: 2000 });
    } catch {
      toast({ title: 'Não foi possível copiar', message: 'Selecione o texto e copie manualmente.', level: 'warn' });
    }
  };
  return (
    <div class="stack">
      <div class="notice warn">⚠️ Este token aparece <b>só agora</b>. Guarde-o: o servidor armazena apenas um hash.</div>
      <div class="token-box">{token}</div>
      <div class="row"><Button small variant="light" onClick={() => copy(token)}>Copiar token</Button><Button small variant="light" onClick={() => copy(env)}>Copiar .env do agente</Button></div>
      <p>Na máquina que será monitorada (com Node.js 22+), dentro da pasta do projeto:</p>
      <pre class="code">{`# arquivo .env\n${env}\n\nnpm install --omit=dev --workspace agent\nnpm run agent`}</pre>
      <p class="muted">Use HTTPS para servidores na internet. Veja <code>docs/agente.md</code> para rodar como serviço (systemd, PM2 ou Docker).</p>
    </div>
  );
}

function RegisterDialog({ onClose }) {
  const [form, setForm] = useState({ name: '', farmName: '', theme: 'forest' });
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setResult(await api.post('/machines', { ...form, farmName: form.farmName || undefined }));
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title={result ? '🔑 Token do agente' : '🏡 Registrar nova fazenda'} onClose={onClose} wide={!!result}>
      {result ? (
        <>
          <AgentInstructions token={result.token} />
          <div class="row" style={{ marginTop: '14px' }}><Button onClick={onClose}>Pronto</Button></div>
        </>
      ) : (
        <form class="stack" onSubmit={submit}>
          <div class="form-grid">
            <Field label="Nome da máquina"><input class="input" required maxLength={60} value={form.name} onInput={(e) => setForm({ ...form, name: e.currentTarget.value })} placeholder="Servidor da sala" /></Field>
            <Field label="Nome da fazenda"><input class="input" maxLength={60} value={form.farmName} onInput={(e) => setForm({ ...form, farmName: e.currentTarget.value })} placeholder="Fazenda da Floresta" /></Field>
            <Field label="Tema">
              <select class="input" value={form.theme} onChange={(e) => setForm({ ...form, theme: e.currentTarget.value })}>
                {THEMES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </Field>
          </div>
          <ErrorBox error={error} />
          <div class="row"><Button type="submit" disabled={busy}>Registrar e gerar token</Button><Button variant="light" onClick={onClose}>Cancelar</Button></div>
        </form>
      )}
    </Modal>
  );
}

function ManageDialog({ machine, onClose }) {
  const [form, setForm] = useState({ name: machine.name, farmName: machine.farmName, theme: machine.theme });
  const [token, setToken] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState('');
  const [error, setError] = useState(null);
  const save = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`/machines/${machine.id}`, form);
      toast({ title: 'Fazenda atualizada', level: 'ok' });
      onClose();
    } catch (err) {
      setError(err);
    }
  };
  const rotate = async () => {
    try {
      setToken((await api.post(`/machines/${machine.id}/token`)).token);
    } catch (err) {
      setError(err);
    }
  };
  const remove = async () => {
    try {
      await api.del(`/machines/${machine.id}`);
      toast({ title: 'Fazenda removida', message: machine.farmName, level: 'ok' });
      onClose();
    } catch (err) {
      setError(err);
    }
  };
  return (
    <Modal title={`⚙️ ${machine.farmName}`} onClose={onClose} wide={!!token}>
      {token ? (
        <><AgentInstructions token={token} /><div class="row" style={{ marginTop: '14px' }}><Button onClick={onClose}>Pronto</Button></div></>
      ) : (
        <form class="stack" onSubmit={save}>
          <div class="form-grid">
            <Field label="Nome da máquina"><input class="input" required maxLength={60} value={form.name} onInput={(e) => setForm({ ...form, name: e.currentTarget.value })} /></Field>
            <Field label="Nome da fazenda"><input class="input" required maxLength={60} value={form.farmName} onInput={(e) => setForm({ ...form, farmName: e.currentTarget.value })} /></Field>
            <Field label="Tema">
              <select class="input" value={form.theme} onChange={(e) => setForm({ ...form, theme: e.currentTarget.value })}>
                {THEMES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </Field>
          </div>
          <ErrorBox error={error} />
          <div class="row"><Button type="submit">Salvar</Button><Button variant="light" onClick={onClose}>Cancelar</Button></div>
          {!machine.isLocal && (
            <div class="stack" style={{ borderTop: '3px dotted var(--paper-line)', paddingTop: '12px' }}>
              <div class="row spread">
                <span>Token atual: <code>{machine.tokenHint || '—'}</code></span>
                <Button small variant="light" onClick={rotate}>Gerar novo token</Button>
              </div>
              <Field label={`Para remover, digite "${machine.farmName}"`}>
                <input class="input" value={confirmDelete} onInput={(e) => setConfirmDelete(e.currentTarget.value)} />
              </Field>
              <Button variant="danger" disabled={confirmDelete !== machine.farmName} onClick={remove}>Remover fazenda e histórico</Button>
            </div>
          )}
        </form>
      )}
    </Modal>
  );
}

export function TownPage() {
  const machines = useStore((s) => s.machines);
  const isAdmin = useStore((s) => s.auth.user?.role === 'admin');
  const now = useNow(15e3);
  const [dialog, setDialog] = useState(null);
  const list = Object.values(machines).sort((a, b) => (b.machine.isLocal ? 1 : 0) - (a.machine.isLocal ? 1 : 0) || a.machine.id - b.machine.id);
  const counts = list.reduce((acc, m) => ({ ...acc, [m.machine.status]: (acc[m.machine.status] || 0) + 1 }), {});

  return (
    <div class="stack">
      <Panel title="🏘️ Pelican Town">
        <div class="row spread">
          <p style={{ margin: 0 }}>Cada casinha é uma máquina monitorada. Clique para abrir a fazenda.</p>
          {isAdmin && <Button onClick={() => setDialog({ type: 'register' })}>+ Registrar fazenda</Button>}
        </div>
        <div class="legend">
          {['ok', 'warn', 'crit', 'offline'].map((s) => (
            <span key={s} class="row"><span class={`dot ${levelClass(s)}`} /> {STATUS_LABEL[s]}: {counts[s] || 0}</span>
          ))}
        </div>
      </Panel>

      <div class="town-map">
        {!list.length && <Empty>Nenhuma fazenda ainda. {isAdmin ? 'Registre a primeira!' : ''}</Empty>}
        <div class="town-grid">
          {list.map(({ machine: m }) => (
            <div key={m.id} class={`town-house status-${m.status} ${levelClass(m.status)}`}>
              <button
                class="icon-btn"
                style={{ all: 'unset', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', width: '100%' }}
                onClick={() => {
                  selectMachine(m.id);
                  navigate('/');
                }}
                aria-label={`Abrir ${m.farmName}: ${STATUS_LABEL[m.status]}`}
              >
                <MiniHouse status={m.status} theme={m.theme} />
                <span class="name">{m.farmName}</span>
                <StatusPill status={m.status} />
                <span class="muted" style={{ fontSize: '1rem' }}>{m.hostname || m.name}{m.isLocal ? ' · este servidor' : ''}</span>
                {m.summary && m.status !== 'offline' ? (
                  <span class="mini num">
                    <span title="CPU">⚡{formatPercent(m.summary.cpu)}</span>
                    <span title="RAM">🌱{formatPercent(m.summary.ram)}</span>
                    <span title="Disco">🏚️{formatPercent(m.summary.disk)}</span>
                  </span>
                ) : (
                  <span class="muted" style={{ fontSize: '1rem' }}>Último sinal: {timeAgo(m.lastSeenAt, now.getTime())}</span>
                )}
              </button>
              {isAdmin && <Button small variant="light" onClick={() => setDialog({ type: 'manage', machine: m })}>Gerenciar</Button>}
            </div>
          ))}
        </div>
      </div>

      {dialog?.type === 'register' && <RegisterDialog onClose={() => setDialog(null)} />}
      {dialog?.type === 'manage' && <ManageDialog machine={dialog.machine} onClose={() => setDialog(null)} />}
    </div>
  );
}
