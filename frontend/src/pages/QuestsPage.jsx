/** Quadro de Missões (lista de tarefas da v2, agora salva no servidor). */
import { useState } from 'preact/hooks';
import { api } from '../services/api.js';
import { toast } from '../services/store.js';
import { sfx } from '../audio/sound.js';
import { Panel, Button, ErrorBox, Loading, Empty, useAsync } from '../components/ui.jsx';

export function QuestsPage() {
  const { data, loading, error, reload, setData } = useAsync(() => api.get('/quests'), []);
  const [text, setText] = useState('');
  const [daily, setDaily] = useState(false);
  const quests = data?.quests || [];
  const done = quests.filter((q) => q.done).length;

  const replace = (quest) => setData((d) => ({ quests: d.quests.map((q) => (q.id === quest.id ? quest : q)) }));
  const add = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      const r = await api.post('/quests', { text: text.trim(), daily });
      setData((d) => ({ quests: [...(d?.quests || []), r.quest] }));
      setText('');
      setDaily(false);
    } catch (err) {
      toast({ title: 'Missão não criada', message: err.message, level: 'warn' });
    }
  };
  const toggle = async (q) => {
    try {
      replace((await api.patch(`/quests/${q.id}`, { done: !q.done })).quest);
      if (!q.done) sfx.ok();
    } catch (err) {
      toast({ title: 'Erro', message: err.message, level: 'warn' });
    }
  };
  const remove = async (q) => {
    try {
      await api.del(`/quests/${q.id}`);
      setData((d) => ({ quests: d.quests.filter((x) => x.id !== q.id) }));
    } catch (err) {
      toast({ title: 'Erro', message: err.message, level: 'warn' });
    }
  };

  return (
    <Panel title="📜 Quadro de Missões">
      <p class="pixel" style={{ fontSize: '.5rem' }}>{done}/{quests.length} concluídas · missões diárias reiniciam à meia-noite</p>
      <ErrorBox error={error} onRetry={reload} />
      {loading && !data ? <Loading /> : (
        <ul class="quests">
          {!quests.length && <li><Empty>Nenhuma missão por aqui.</Empty></li>}
          {quests.map((q) => (
            <li key={q.id} class={q.done ? 'done' : ''}>
              <button class="icon-btn" aria-pressed={q.done} aria-label={q.done ? 'Desmarcar' : 'Marcar como feita'} onClick={() => toggle(q)}>{q.done ? '☑' : '☐'}</button>
              <span class="text">{q.text}{q.daily && <small class="muted"> (diária)</small>}</span>
              <button class="icon-btn" style={{ color: 'var(--crit)' }} aria-label={`Apagar missão ${q.text}`} onClick={() => remove(q)}>✕</button>
            </li>
          ))}
        </ul>
      )}
      <form class="row" onSubmit={add}>
        <input class="input" style={{ flex: '1 1 200px', width: 'auto' }} maxLength={120} value={text} onInput={(e) => setText(e.currentTarget.value)} placeholder="Nova missão: limpar os filtros de poeira..." aria-label="Nova missão" />
        <label class="check"><input type="checkbox" checked={daily} onChange={(e) => setDaily(e.currentTarget.checked)} /> diária</label>
        <Button type="submit">Adicionar</Button>
      </form>
    </Panel>
  );
}
