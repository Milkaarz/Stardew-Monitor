import { useState } from 'preact/hooks';
import { THEMES, SEASON_LABELS, getSeason, activeFestival } from '@stardew-monitor/shared';
import { api } from '../services/api.js';
import { useStore, toast } from '../services/store.js';
import { savePrefs } from '../services/prefs.js';
import { useSettingsSection, NumberField } from '../components/SettingsForm.jsx';
import { Panel, Button, Field, Modal, ErrorBox, Loading, Empty, Pill, useAsync, fmtDateTime } from '../components/ui.jsx';

function Account() {
  const user = useStore((s) => s.auth.user);
  const prefs = user?.prefs || {};
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [error, setError] = useState(null);
  const change = async (e) => {
    e.preventDefault();
    setError(null);
    if (pw.newPassword !== pw.confirm) return setError(new Error('A confirmação não confere.'));
    try {
      await api.put('/auth/password', { currentPassword: pw.currentPassword, newPassword: pw.newPassword });
      setPw({ currentPassword: '', newPassword: '', confirm: '' });
      toast({ title: 'Senha alterada', message: 'As outras sessões foram encerradas.', level: 'ok' });
    } catch (err) {
      setError(err);
    }
  };
  return (
    <div class="grid grid-2">
      <Panel title="🎨 Preferências visuais">
        <div class="stack">
          <Field label="Tema da interface">
            <select class="input" value={prefs.uiTheme || 'auto'} onChange={(e) => savePrefs({ uiTheme: e.currentTarget.value })}>
              <option value="auto">Automático (tema da fazenda selecionada)</option>
              {THEMES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </Field>
          <label class="check"><input type="checkbox" checked={!!prefs.sound} onChange={(e) => savePrefs({ sound: e.currentTarget.checked })} /> Efeitos sonoros 8 bits</label>
          <label class="check"><input type="checkbox" checked={!!prefs.music} disabled={!prefs.sound} onChange={(e) => savePrefs({ music: e.currentTarget.checked })} /> Música de fundo (precisa dos efeitos ligados)</label>
          <label class="check"><input type="checkbox" checked={!!prefs.alertSound} onChange={(e) => savePrefs({ alertSound: e.currentTarget.checked })} /> Som nos alertas</label>
          <label class="check"><input type="checkbox" checked={!!prefs.reducedMotion} onChange={(e) => savePrefs({ reducedMotion: e.currentTarget.checked })} /> Reduzir animações</label>
          <p class="muted">Salvas na sua conta. Sons começam desativados.</p>
        </div>
      </Panel>
      <Panel title="🔑 Trocar senha">
        <form class="stack" onSubmit={change}>
          <Field label="Senha atual"><input class="input" type="password" autocomplete="current-password" required value={pw.currentPassword} onInput={(e) => setPw({ ...pw, currentPassword: e.currentTarget.value })} /></Field>
          <Field label="Nova senha (mín. 10 caracteres)"><input class="input" type="password" autocomplete="new-password" required minLength={10} value={pw.newPassword} onInput={(e) => setPw({ ...pw, newPassword: e.currentTarget.value })} /></Field>
          <Field label="Confirmar nova senha"><input class="input" type="password" autocomplete="new-password" required value={pw.confirm} onInput={(e) => setPw({ ...pw, confirm: e.currentTarget.value })} /></Field>
          <ErrorBox error={error} />
          <Button type="submit">Trocar senha</Button>
        </form>
      </Panel>
    </div>
  );
}

function SaveRow({ s }) {
  return (
    <>
      <ErrorBox error={s.error} />
      <div class="row" style={{ marginTop: '12px' }}>
        <Button disabled={!s.dirty || s.busy} onClick={() => s.save()}>Salvar</Button>
        <Button variant="light" disabled={s.busy} onClick={s.reset}>Restaurar padrões</Button>
      </div>
    </>
  );
}

function Appearance() {
  const s = useSettingsSection('appearance');
  const festivals = useStore((st) => st.settings?.festivals);
  if (!s.draft) return <Loading />;
  const now = new Date();
  const preview = getSeason(now, { mode: s.draft.seasonMode, farmEpoch: s.draft.farmEpoch });
  const fest = activeFestival(now, { festivals, mode: s.draft.seasonMode, farmEpoch: s.draft.farmEpoch });
  return (
    <Panel title="🍂 Estações e calendário">
      <div class="form-grid">
        <Field label="Calendário das estações">
          <select class="input" value={s.draft.seasonMode} onChange={(e) => s.setDraft({ ...s.draft, seasonMode: e.currentTarget.value })}>
            <option value="south">Data real · hemisfério sul</option>
            <option value="north">Data real · hemisfério norte</option>
            <option value="farm">Calendário próprio da fazenda (28 dias por estação)</option>
          </select>
        </Field>
        {s.draft.seasonMode === 'farm' && (
          <Field label="Início do calendário (Primavera, dia 1)">
            <input class="input" type="date" value={new Date(s.draft.farmEpoch || Date.now()).toISOString().slice(0, 10)}
              onInput={(e) => e.currentTarget.valueAsNumber && s.setDraft({ ...s.draft, farmEpoch: e.currentTarget.valueAsNumber + new Date().getTimezoneOffset() * 60e3 })} />
          </Field>
        )}
        <label class="check" style={{ alignSelf: 'end' }}>
          <input type="checkbox" checked={s.draft.festivalDecorations} onChange={(e) => s.setDraft({ ...s.draft, festivalDecorations: e.currentTarget.checked })} /> Mostrar decorações de festival
        </label>
      </div>
      <p>Hoje seria: <b>{SEASON_LABELS[preview.season]}, dia {preview.day}</b>{preview.mode === 'farm' ? `, ano ${preview.year}` : ''}{fest ? ` · 🎉 ${fest.name}` : ''}.</p>
      <p class="muted">O tema de cada fazenda (Padrão, Floresta, Praia, Colina, Gengibre, Minas) é escolhido em Pelican Town &gt; Gerenciar. O céu acompanha o horário local deste navegador.</p>
      <SaveRow s={s} />
    </Panel>
  );
}

function WeatherRules() {
  const s = useSettingsSection('weather');
  if (!s.draft) return <Loading />;
  const f = (k, label, suffix, min, max) => <NumberField key={k} label={label} suffix={suffix} min={min} max={max} value={s.draft[k]} onChange={(v) => s.setDraft({ ...s.draft, [k]: v })} />;
  return (
    <Panel title="⛅ Regras do clima reativo">
      <p class="muted">O clima da fazenda reage à máquina. Ajuste respeitando os limites térmicos do seu hardware (consulte o fabricante).</p>
      <div class="form-grid">
        {f('idleLoad', 'Ocioso (céu limpo) abaixo de', '% CPU 1 min', 1, 100)}
        {f('cloudyLoad', 'Nublado a partir de', '% CPU 1 min', 1, 100)}
        {f('rainLoad', 'Chuva a partir de', '% CPU 1 min', 1, 100)}
        {f('stormLoad', 'Tempestade a partir de', '% CPU média 5 min', 1, 100)}
        {f('hotTemp', 'Dia quente a partir de', '°C CPU', 40, 110)}
        {f('heatwaveTemp', 'Onda de calor a partir de', '°C CPU', 40, 110)}
        {f('windRpm', 'Vento forte a partir de', 'RPM', 100, 10000)}
      </div>
      <SaveRow s={s} />
    </Panel>
  );
}

function AchievementRules() {
  const s = useSettingsSection('achievements');
  if (!s.draft) return <Loading />;
  const f = (k, label, suffix, min, max) => <NumberField key={k} label={label} suffix={suffix} min={min} max={max} value={s.draft[k]} onChange={(v) => s.setDraft({ ...s.draft, [k]: v })} />;
  return (
    <Panel title="🏆 Regras das conquistas">
      <div class="form-grid">
        {f('idleLoad', 'Dia Tranquilo: CPU abaixo de', '%', 1, 100)}
        {f('idleMinutes', 'Dia Tranquilo: por', 'min', 5, 1440)}
        {f('tirelessHours', 'Máquina Incansável: ligada por', 'horas', 1, 8760)}
        {f('diskLimit', 'Fazenda Organizada: discos abaixo de', '%', 10, 100)}
        {f('diskDays', 'Fazenda Organizada: por', 'dias', 1, 60)}
      </div>
      <SaveRow s={s} />
    </Panel>
  );
}

const RULE_TEXT = (r) => (r.kind === 'season' ? `${SEASON_LABELS[r.season]}, dias ${r.from} a ${r.to}` : r.kind === 'date' ? `${r.from.split('-').reverse().join('/')} a ${r.to.split('-').reverse().join('/')}` : `Páscoa ${r.from >= 0 ? '+' : ''}${r.from} a ${r.to >= 0 ? '+' : ''}${r.to} dias`);

function Festivals() {
  const s = useSettingsSection('festivals');
  if (!s.draft) return <Loading />;
  const set = (i, patch) => s.setDraft(s.draft.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  const setRule = (i, patch) => set(i, { rule: { ...s.draft[i].rule, ...patch } });
  return (
    <Panel title="🎉 Festivais e eventos sazonais">
      <p class="muted">Ativados automaticamente nas datas configuradas: decoram a fazenda e mudam as mensagens. Regras por estação usam o calendário escolhido em "Estações".</p>
      <div class="stack">
        {s.draft.map((f, i) => (
          <div key={f.key} class="threshold-row" style={{ gridTemplateColumns: 'minmax(160px,1.4fr) repeat(3, minmax(90px,1fr))' }}>
            <label class="check"><input type="checkbox" checked={f.enabled} onChange={(e) => set(i, { enabled: e.currentTarget.checked })} /> {f.name}</label>
            {f.rule.kind === 'season' && (
              <>
                <Field label="Estação">
                  <select class="input" value={f.rule.season} onChange={(e) => setRule(i, { season: e.currentTarget.value })}>
                    {Object.entries(SEASON_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </Field>
                <NumberField label="Do dia" min={1} max={93} value={f.rule.from} onChange={(v) => setRule(i, { from: v })} />
                <NumberField label="Até o dia" min={1} max={93} value={f.rule.to} onChange={(v) => setRule(i, { to: v })} />
              </>
            )}
            {f.rule.kind === 'date' && (
              <>
                <Field label="De (MM-DD)"><input class="input" value={f.rule.from} pattern="\d{2}-\d{2}" onInput={(e) => setRule(i, { from: e.currentTarget.value })} /></Field>
                <Field label="Até (MM-DD)"><input class="input" value={f.rule.to} pattern="\d{2}-\d{2}" onInput={(e) => setRule(i, { to: e.currentTarget.value })} /></Field>
                <span class="muted">{RULE_TEXT(f.rule)}</span>
              </>
            )}
            {f.rule.kind === 'easter' && (
              <>
                <NumberField label="Dias antes/depois da Páscoa: de" min={-60} max={60} value={f.rule.from} onChange={(v) => setRule(i, { from: v })} />
                <NumberField label="até" min={-60} max={60} value={f.rule.to} onChange={(v) => setRule(i, { to: v })} />
                <span class="muted">{RULE_TEXT(f.rule)}</span>
              </>
            )}
          </div>
        ))}
      </div>
      <SaveRow s={s} />
    </Panel>
  );
}

function Retention() {
  const s = useSettingsSection('retention');
  if (!s.draft) return <Loading />;
  const f = (k, label, suffix, min, max) => <NumberField key={k} label={label} suffix={suffix} min={min} max={max} value={s.draft[k]} onChange={(v) => s.setDraft({ ...s.draft, [k]: v })} />;
  return (
    <Panel title="🗄️ Retenção de dados">
      <p class="muted">As leituras são agregadas por minuto e por hora para o banco não crescer sem limite. Dados mais antigos que o período abaixo são apagados automaticamente a cada hora.</p>
      <div class="form-grid">
        {f('rawHours', 'Leituras completas', 'horas', 2, 168)}
        {f('minuteDays', 'Médias por minuto', 'dias', 1, 60)}
        {f('hourDays', 'Médias por hora', 'dias', 7, 3650)}
        {f('notificationDays', 'Histórico de avisos', 'dias', 1, 3650)}
        {f('auditDays', 'Registro de auditoria', 'dias', 30, 3650)}
      </div>
      <SaveRow s={s} />
    </Panel>
  );
}

function Users() {
  const me = useStore((s) => s.auth.user);
  const { data, loading, error, reload } = useAsync(() => api.get('/users'), []);
  const [form, setForm] = useState({ username: '', password: '', role: 'viewer' });
  const [formError, setFormError] = useState(null);
  const [reset, setReset] = useState(null);
  const [del, setDel] = useState(null);
  const create = async (e) => {
    e.preventDefault();
    setFormError(null);
    try {
      await api.post('/users', form);
      setForm({ username: '', password: '', role: 'viewer' });
      toast({ title: 'Usuário criado', level: 'ok' });
      reload();
    } catch (err) {
      setFormError(err);
    }
  };
  const act = async (fn, msg) => {
    try {
      await fn();
      toast({ title: msg, level: 'ok' });
      reload();
    } catch (err) {
      toast({ title: 'Erro', message: err.message, level: 'crit' });
    }
  };
  return (
    <div class="stack">
      <Panel title="👥 Usuários">
        <ErrorBox error={error} onRetry={reload} />
        {loading && !data ? <Loading /> : (
          <div class="table-wrap">
            <table class="wood">
              <thead><tr><th>Usuário</th><th>Papel</th><th>Último login</th><th>Ações</th></tr></thead>
              <tbody>
                {data?.users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.username}{u.id === me.id ? ' (você)' : ''}</td>
                    <td>
                      <select class="input" style={{ padding: '2px 6px' }} value={u.role} disabled={u.id === me.id}
                        onChange={(e) => act(() => api.patch(`/users/${u.id}`, { role: e.currentTarget.value }), 'Papel alterado')}>
                        <option value="admin">Administrador</option>
                        <option value="viewer">Visitante (leitura)</option>
                      </select>
                    </td>
                    <td>{fmtDateTime(u.lastLoginAt)}</td>
                    <td class="row">
                      <Button small variant="light" onClick={() => setReset(u)}>Redefinir senha</Button>
                      {u.id !== me.id && <Button small variant="danger" onClick={() => setDel(u)}>Remover</Button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <Panel title="➕ Novo usuário">
        <form class="form-grid" onSubmit={create}>
          <Field label="Usuário"><input class="input" required pattern="[a-zA-Z0-9_.\-]{3,32}" value={form.username} onInput={(e) => setForm({ ...form, username: e.currentTarget.value })} /></Field>
          <Field label="Senha (mín. 10)"><input class="input" type="password" autocomplete="new-password" required minLength={10} value={form.password} onInput={(e) => setForm({ ...form, password: e.currentTarget.value })} /></Field>
          <Field label="Papel">
            <select class="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.currentTarget.value })}>
              <option value="viewer">Visitante (somente leitura)</option>
              <option value="admin">Administrador</option>
            </select>
          </Field>
          <div style={{ alignSelf: 'end' }}><Button type="submit">Criar</Button></div>
        </form>
        <ErrorBox error={formError} />
        <p class="muted">Visitantes veem as fazendas, gráficos, diário e conquistas, mas não alteram nada nem encerram processos.</p>
      </Panel>
      {reset && <ResetPassword user={reset} onClose={() => setReset(null)} />}
      {del && (
        <Modal title="Remover usuário" onClose={() => setDel(null)}>
          <p>Remover <b>{del.username}</b>? As sessões dele serão encerradas.</p>
          <div class="row">
            <Button variant="danger" onClick={() => { act(() => api.del(`/users/${del.id}`), 'Usuário removido'); setDel(null); }}>Remover</Button>
            <Button variant="light" onClick={() => setDel(null)}>Cancelar</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ResetPassword({ user, onClose }) {
  const [pw, setPw] = useState('');
  const [error, setError] = useState(null);
  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/users/${user.id}/password`, { newPassword: pw });
      toast({ title: 'Senha redefinida', level: 'ok' });
      onClose();
    } catch (err) {
      setError(err);
    }
  };
  return (
    <Modal title={`Nova senha para ${user.username}`} onClose={onClose}>
      <form class="stack" onSubmit={submit}>
        <Field label="Nova senha (mín. 10)"><input class="input" type="password" autocomplete="new-password" required minLength={10} value={pw} onInput={(e) => setPw(e.currentTarget.value)} /></Field>
        <ErrorBox error={error} />
        <div class="row"><Button type="submit">Salvar</Button><Button variant="light" onClick={onClose}>Cancelar</Button></div>
      </form>
    </Modal>
  );
}

const ACTION_LABEL = {
  'auth.login': 'Login', 'auth.password.change': 'Troca de senha', 'process.kill': 'Expulsar morador (local)', 'process.kill.remote': 'Expulsar morador (remoto)',
  'process.kill.remote.result': 'Resultado da expulsão remota', 'machine.create': 'Fazenda registrada', 'machine.update': 'Fazenda alterada', 'machine.delete': 'Fazenda removida',
  'machine.token.rotate': 'Token do agente trocado', 'settings.update': 'Configuração alterada', 'settings.reset': 'Configuração restaurada', 'secrets.update': 'Credenciais alteradas',
  'user.create': 'Usuário criado', 'user.delete': 'Usuário removido', 'user.role': 'Papel alterado', 'user.password.reset': 'Senha redefinida', 'notifications.test': 'Teste de canal',
  'notifications.clear': 'Histórico de avisos limpo', 'note.delete': 'Anotação apagada',
};

function Audit() {
  const [limit, setLimit] = useState(100);
  const { data, loading, error, reload } = useAsync(() => api.get(`/audit?limit=${limit}`), [limit]);
  return (
    <Panel title="🧾 Registro de auditoria">
      <ErrorBox error={error} onRetry={reload} />
      {loading && !data ? <Loading /> : !data?.entries.length ? <Empty>Nada registrado.</Empty> : (
        <div class="table-wrap" style={{ maxHeight: '60vh' }}>
          <table class="wood">
            <thead><tr><th>Quando</th><th>Quem</th><th>Ação</th><th>Alvo</th><th>Resultado</th><th>IP</th></tr></thead>
            <tbody>
              {data.entries.map((a) => (
                <tr key={a.id}>
                  <td>{fmtDateTime(a.ts)}</td>
                  <td>{a.username || '—'}</td>
                  <td>{ACTION_LABEL[a.action] || a.action}</td>
                  <td title={JSON.stringify(a.details)}>{a.target || '—'}{a.details?.error ? ` · ${a.details.error}` : a.details?.reason ? ` · ${a.details.reason}` : ''}</td>
                  <td><Pill level={a.success ? 'ok' : 'crit'}>{a.success ? 'ok' : 'falhou'}</Pill></td>
                  <td>{a.ip || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data?.entries.length === limit && <Button small variant="light" onClick={() => setLimit(limit + 100)}>Carregar mais</Button>}
    </Panel>
  );
}

export function SettingsPage() {
  const isAdmin = useStore((s) => s.auth.user?.role === 'admin');
  const [tab, setTab] = useState('account');
  const tabs = [
    ['account', '👤 Conta'],
    ...(isAdmin ? [['appearance', '🍂 Estações'], ['weather', '⛅ Clima'], ['achievements', '🏆 Conquistas'], ['festivals', '🎉 Festivais'], ['retention', '🗄️ Retenção'], ['users', '👥 Usuários'], ['audit', '🧾 Auditoria']] : []),
  ];
  return (
    <div class="stack">
      <div class="tabs" role="tablist">
        {tabs.map(([k, l]) => <Button key={k} small variant={tab === k ? 'on' : ''} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{l}</Button>)}
      </div>
      {tab === 'account' && <Account />}
      {tab === 'appearance' && <Appearance />}
      {tab === 'weather' && <WeatherRules />}
      {tab === 'achievements' && <AchievementRules />}
      {tab === 'festivals' && <Festivals />}
      {tab === 'retention' && <Retention />}
      {tab === 'users' && <Users />}
      {tab === 'audit' && <Audit />}
    </div>
  );
}
