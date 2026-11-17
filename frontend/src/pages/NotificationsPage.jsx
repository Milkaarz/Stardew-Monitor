/**
 * Avisos: histórico de notificações + limites de alerta + canais externos (Discord, Telegram, e-mail).
 * Credenciais só são ENVIADAS ao servidor; a interface nunca recebe os valores de volta.
 */
import { useEffect, useState } from 'preact/hooks';
import { ALERT_CATEGORIES } from '@stardew-monitor/shared';
import { api, qs } from '../services/api.js';
import { setState, state, toast, useStore } from '../services/store.js';
import { onLiveEvent } from '../services/live.js';
import { savePrefs } from '../services/prefs.js';
import { useSettingsSection, NumberField } from '../components/SettingsForm.jsx';
import { Panel, Button, Field, Modal, ErrorBox, Loading, Empty, Pill, useAsync, fmtDateTime } from '../components/ui.jsx';

const CAT_LABEL = { cpu: '⚡ CPU', ram: '🌱 RAM', disk: '🏚️ Disco', temperature: '🌡️ Temperatura', gpu: '🌬️ GPU', battery: '🔋 Bateria', offline: '📡 Fazenda sem sinal' };
const KIND_LABEL = { alert: 'Alerta', recovery: 'Normalizado', achievement: 'Conquista', system: 'Sistema' };

function History() {
  const isAdmin = useStore((s) => s.auth.user?.role === 'admin');
  const machines = useStore((s) => s.machines);
  const [filter, setFilter] = useState({ kind: '', category: '' });
  const [limit, setLimit] = useState(30);
  const [confirmClear, setConfirmClear] = useState(false);
  const { data, loading, error, reload } = useAsync(() => api.get(`/notifications${qs({ ...filter, limit })}`), [filter.kind, filter.category, limit]);
  useEffect(() => onLiveEvent((t) => (t === 'notification' || t === 'achievement') && reload()), [filter.kind, filter.category, limit]);
  useEffect(() => {
    api.post('/notifications/read').then(() => setState({ unread: 0 })).catch(() => {});
  }, []);

  const clear = async () => {
    try {
      await api.del('/notifications');
      setConfirmClear(false);
      reload();
    } catch (err) {
      toast({ title: 'Erro', message: err.message, level: 'warn' });
    }
  };

  return (
    <Panel title="🔔 Histórico de avisos">
      <div class="form-grid">
        <Field label="Tipo">
          <select class="input" value={filter.kind} onChange={(e) => setFilter({ ...filter, kind: e.currentTarget.value })}>
            <option value="">Todos</option>
            {Object.entries(KIND_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </Field>
        <Field label="Categoria">
          <select class="input" value={filter.category} onChange={(e) => setFilter({ ...filter, category: e.currentTarget.value })}>
            <option value="">Todas</option>
            {ALERT_CATEGORIES.map((c) => <option key={c} value={c}>{CAT_LABEL[c]}</option>)}
          </select>
        </Field>
        {isAdmin && <div style={{ alignSelf: 'end' }}><Button small variant="light" onClick={() => setConfirmClear(true)}>Limpar histórico</Button></div>}
      </div>
      <ErrorBox error={error} onRetry={reload} />
      {loading && !data ? <Loading /> : !data?.items.length ? <Empty>Nenhum aviso. A fazenda está em paz. 🐔</Empty> : (
        <ul class="notif-list">
          {data.items.map((n) => (
            <li key={n.id} class={n.read ? '' : 'unread'}>
              <Pill level={n.kind === 'recovery' ? 'ok' : n.kind === 'achievement' ? 'ok' : n.level}>{KIND_LABEL[n.kind]}</Pill>
              <div>
                <b>{n.title}</b>
                <div>{n.message}</div>
                <div class="muted" style={{ fontSize: '1rem' }}>
                  {fmtDateTime(n.createdAt)}
                  {n.machineId ? ` · ${machines[n.machineId]?.machine.farmName || `Fazenda #${n.machineId}`}` : ''}
                  {n.category ? ` · ${CAT_LABEL[n.category] || n.category}` : ''}
                  {Object.entries(n.deliveries || {}).map(([ch, d]) => ` · ${ch}: ${d.ok ? 'enviado' : `falhou (${d.error})`}`).join('')}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {data && data.items.length < data.total && <Button small variant="light" onClick={() => setLimit(limit + 30)}>Carregar mais ({data.total - data.items.length})</Button>}
      {confirmClear && (
        <Modal title="🗑️ Limpar histórico" onClose={() => setConfirmClear(false)}>
          <p>Apagar todo o histórico de avisos? A ação fica registrada na auditoria.</p>
          <div class="row"><Button variant="danger" onClick={clear}>Apagar tudo</Button><Button variant="light" onClick={() => setConfirmClear(false)}>Cancelar</Button></div>
        </Modal>
      )}
    </Panel>
  );
}

function Thresholds() {
  const t = useSettingsSection('thresholds');
  const n = useSettingsSection('notifications');
  if (!t.draft || !n.draft) return <Loading />;
  const set = (cat, patch) => t.setDraft({ ...t.draft, [cat]: { ...t.draft[cat], ...patch } });
  const row = (cat, unit, extra) => {
    const c = t.draft[cat];
    return (
      <div class="threshold-row" key={cat}>
        <label class="check"><input type="checkbox" checked={c.enabled} onChange={(e) => set(cat, { enabled: e.currentTarget.checked })} /> {CAT_LABEL[cat]}</label>
        <NumberField label={cat === 'battery' ? 'Aviso abaixo de' : 'Aviso'} suffix={unit} value={c.warn} onChange={(v) => set(cat, { warn: v })} disabled={!c.enabled} />
        <NumberField label={cat === 'battery' ? 'Crítico abaixo de' : 'Crítico'} suffix={unit} value={c.crit} onChange={(v) => set(cat, { crit: v })} disabled={!c.enabled} />
        <NumberField label="Durante" suffix="s" min={0} max={3600} value={c.sustainSec} onChange={(v) => set(cat, { sustainSec: v })} disabled={!c.enabled} />
        {extra || <span />}
      </div>
    );
  };
  return (
    <div class="stack">
      <Panel title="📏 Limites de alerta">
        <p class="muted">Cada categoria tem seus próprios limites. "Durante" é quanto tempo a condição precisa durar antes de alertar (evita alarmes por picos). Temperaturas aceitam de 40 a 110 °C.</p>
        <div class="thresholds">
          {row('cpu', '%')}
          {row('ram', '%')}
          {row('disk', '%')}
          {row('temperature', '°C')}
          {row('gpu', '%', (
            <div class="row" style={{ flexWrap: 'nowrap' }}>
              <NumberField label="Temp. aviso" suffix="°C" value={t.draft.gpu.tempWarn} onChange={(v) => set('gpu', { tempWarn: v })} />
              <NumberField label="Temp. crítica" suffix="°C" value={t.draft.gpu.tempCrit} onChange={(v) => set('gpu', { tempCrit: v })} />
            </div>
          ))}
          {row('battery', '%')}
          <div class="threshold-row">
            <label class="check"><input type="checkbox" checked={t.draft.offline.enabled} onChange={(e) => set('offline', { enabled: e.currentTarget.checked })} /> {CAT_LABEL.offline}</label>
            <NumberField label="Após" suffix="s sem dados" min={15} value={t.draft.offline.afterSec} onChange={(v) => set('offline', { afterSec: v })} />
          </div>
        </div>
        <ErrorBox error={t.error} />
        <div class="row" style={{ marginTop: '12px' }}>
          <Button disabled={!t.dirty || t.busy} onClick={() => t.save()}>Salvar limites</Button>
          <Button variant="light" disabled={t.busy} onClick={t.reset}>Restaurar padrões</Button>
        </div>
      </Panel>
      <Panel title="⏱️ Repetição e intervalos">
        <div class="form-grid">
          <NumberField label="Intervalo mínimo entre alertas repetidos" suffix="min" min={0} max={1440} value={n.draft.cooldownMin} onChange={(v) => n.setDraft({ ...n.draft, cooldownMin: v })} />
          <label class="check"><input type="checkbox" checked={n.draft.notifyRecovery} onChange={(e) => n.setDraft({ ...n.draft, notifyRecovery: e.currentTarget.checked })} /> Avisar quando normalizar</label>
          <label class="check"><input type="checkbox" checked={n.draft.notifyAchievements} onChange={(e) => n.setDraft({ ...n.draft, notifyAchievements: e.currentTarget.checked })} /> Enviar conquistas aos canais</label>
        </div>
        <p class="muted">O mesmo alerta não se repete enquanto a situação continuar; ele só volta a ser enviado depois de normalizar e passar o intervalo mínimo. Agravamento (aviso → crítico) é avisado na hora.</p>
        <ErrorBox error={n.error} />
        <Button disabled={!n.dirty || n.busy} onClick={() => n.save()}>Salvar</Button>
      </Panel>
    </div>
  );
}

const CHANNEL_FIELDS = {
  discord: [['discord.webhookUrl', 'URL do webhook', 'https://discord.com/api/webhooks/...']],
  telegram: [['telegram.botToken', 'Token do bot', '123456:ABC...'], ['telegram.chatId', 'ID do chat', '-100123456']],
  email: [
    ['email.host', 'Servidor SMTP', 'smtp.exemplo.com'], ['email.port', 'Porta', '587'], ['email.secure', 'TLS direto (true/false)', 'false'],
    ['email.user', 'Usuário', ''], ['email.pass', 'Senha', ''], ['email.from', 'Remetente', 'monitor@exemplo.com'], ['email.to', 'Destinatário', 'voce@exemplo.com'],
  ],
};
const CHANNEL_LABEL = { discord: '💬 Discord (webhook)', telegram: '✈️ Telegram (Bot API)', email: '✉️ E-mail (SMTP)' };

function Channels() {
  const n = useSettingsSection('notifications');
  const secrets = useStore((s) => s.secrets);
  const prefs = useStore((s) => s.auth.user?.prefs || {});
  const [values, setValues] = useState({});
  const [busy, setBusy] = useState(null);
  if (!n.draft || !secrets) return <Loading />;

  const setCh = (ch, patch) => n.setDraft({ ...n.draft, channels: { ...n.draft.channels, [ch]: { ...n.draft.channels[ch], ...patch } } });
  const saveSecrets = async (ch, clear = false) => {
    const body = {};
    for (const [k] of CHANNEL_FIELDS[ch]) {
      if (clear) body[k] = null;
      else if (values[k] != null && values[k] !== '') body[k] = values[k];
    }
    if (!Object.keys(body).length) return toast({ title: 'Nada para salvar', message: 'Preencha os campos que deseja alterar.', level: 'warn' });
    setBusy(ch);
    try {
      const r = await api.put('/secrets', body);
      setState({ secrets: r.secrets });
      setValues({});
      toast({ title: clear ? 'Credenciais removidas' : 'Credenciais salvas (criptografadas)', level: 'ok' });
    } catch (err) {
      toast({ title: 'Erro', message: err.message, level: 'crit' });
    } finally {
      setBusy(null);
    }
  };
  const test = async (ch) => {
    setBusy(ch);
    try {
      await api.post(`/notifications/test/${ch}`);
      toast({ title: 'Teste enviado!', message: `Confira o ${ch}.`, level: 'ok' });
    } catch (err) {
      toast({ title: 'O teste falhou', message: err.message, level: 'crit', timeout: 10000 });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div class="stack">
      <Panel title="🔊 Sons deste navegador">
        <div class="row">
          <label class="check"><input type="checkbox" checked={!!prefs.alertSound} onChange={(e) => savePrefs({ alertSound: e.currentTarget.checked })} /> Tocar som 8 bits nos alertas</label>
          <label class="check"><input type="checkbox" checked={!!prefs.sound} onChange={(e) => savePrefs({ sound: e.currentTarget.checked })} /> Efeitos sonoros da interface</label>
        </div>
        <p class="muted">Desativados por padrão. O navegador só toca sons depois que você interagir com a página.</p>
      </Panel>
      {['discord', 'telegram', 'email'].map((ch) => {
        const c = n.draft.channels[ch];
        const fields = CHANNEL_FIELDS[ch];
        const configured = fields.filter(([k]) => secrets[k]?.configured).length;
        return (
          <Panel key={ch} title={CHANNEL_LABEL[ch]}>
            <div class="stack">
              <div class="row spread">
                <label class="check"><input type="checkbox" checked={c.enabled} onChange={(e) => setCh(ch, { enabled: e.currentTarget.checked })} /> Ativar canal</label>
                <Pill level={configured === fields.length || (ch === 'email' && ['email.host', 'email.from', 'email.to'].every((k) => secrets[k]?.configured)) ? 'ok' : 'offline'}>
                  {configured}/{fields.length} campos configurados
                </Pill>
              </div>
              <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
                <legend class="muted">Categorias enviadas por este canal:</legend>
                <div class="row">
                  {ALERT_CATEGORIES.map((cat) => (
                    <label class="check" key={cat}>
                      <input type="checkbox" checked={c.categories.includes(cat)} disabled={!c.enabled}
                        onChange={(e) => setCh(ch, { categories: e.currentTarget.checked ? [...c.categories, cat] : c.categories.filter((x) => x !== cat) })} />
                      {CAT_LABEL[cat]}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div class="form-grid">
                {fields.map(([k, label, ph]) => (
                  <Field key={k} label={`${label}${secrets[k]?.configured ? ` · ✓ ${secrets[k].source === 'env' ? 'definido no .env' : 'salvo'}` : ''}`}>
                    <input class="input" type={/pass|token|webhook/i.test(k) ? 'password' : 'text'} autocomplete="off" disabled={secrets[k]?.source === 'env'}
                      placeholder={secrets[k]?.configured ? '•••••• (deixe vazio para manter)' : ph} value={values[k] || ''}
                      onInput={(e) => setValues({ ...values, [k]: e.currentTarget.value })} />
                  </Field>
                ))}
              </div>
              <div class="row">
                <Button small disabled={busy === ch} onClick={() => saveSecrets(ch)}>Salvar credenciais</Button>
                <Button small variant="light" disabled={busy === ch} onClick={() => test(ch)}>Enviar teste</Button>
                <Button small variant="light" disabled={busy === ch} onClick={() => saveSecrets(ch, true)}>Apagar credenciais salvas</Button>
              </div>
            </div>
          </Panel>
        );
      })}
      <ErrorBox error={n.error} />
      <div class="row"><Button disabled={!n.dirty || n.busy} onClick={() => n.save()}>Salvar canais e categorias</Button></div>
      <p class="muted" style={{ color: '#fff', textShadow: '1px 1px 0 #000' }}>As credenciais ficam criptografadas no banco (AES-256-GCM) ou nas variáveis de ambiente do servidor, que têm prioridade. Elas nunca são enviadas de volta ao navegador.</p>
    </div>
  );
}

export function NotificationsPage() {
  const isAdmin = useStore((s) => s.auth.user?.role === 'admin');
  const [tab, setTab] = useState('history');
  useEffect(() => {
    if (!state.settings) api.get('/settings').then((r) => setState({ settings: r.settings, secrets: r.secrets || null })).catch(() => {});
  }, []);
  return (
    <div class="stack">
      {isAdmin && (
        <div class="tabs" role="tablist">
          {[['history', '🔔 Histórico'], ['thresholds', '📏 Limites'], ['channels', '📨 Canais']].map(([k, l]) => (
            <Button key={k} small variant={tab === k ? 'on' : ''} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{l}</Button>
          ))}
        </div>
      )}
      {tab === 'history' && <History />}
      {isAdmin && tab === 'thresholds' && <Thresholds />}
      {isAdmin && tab === 'channels' && <Channels />}
    </div>
  );
}
