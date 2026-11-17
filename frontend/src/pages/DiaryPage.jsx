/**
 * Diário da fazenda: changelog da máquina (hardware, manutenção, problemas...).
 * Salvamento automático enquanto você escreve.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import { NOTE_CATEGORIES } from '@stardew-monitor/shared';
import { api, qs } from '../services/api.js';
import { useStore, selectedMachine, toast } from '../services/store.js';
import { Panel, Button, Field, Modal, ErrorBox, Loading, Empty, useAsync, fmtDateTime } from '../components/ui.jsx';

const catOf = (k) => NOTE_CATEGORIES.find((c) => c.key === k) || NOTE_CATEGORIES[5];
const blank = (machineId) => ({ id: null, title: '', body: '', category: 'maintenance', machineId: machineId ?? null });

export function DiaryPage() {
  const isAdmin = useStore((s) => s.auth.user?.role === 'admin');
  const machines = useStore((s) => s.machines);
  const current = useStore(() => selectedMachine());
  const [filters, setFilters] = useState({ q: '', category: '', onlyThis: false });
  const [q, setQ] = useState('');
  const [draft, setDraft] = useState(null);
  const [saveState, setSaveState] = useState('');
  const [confirmDel, setConfirmDel] = useState(null);
  const timer = useRef(null);
  const draftRef = useRef(null);
  const saving = useRef(Promise.resolve());

  useEffect(() => {
    const t = setTimeout(() => setFilters((f) => ({ ...f, q })), 300);
    return () => clearTimeout(t);
  }, [q]);

  const { data, loading, error, reload, setData } = useAsync(
    () => api.get(`/notes${qs({ q: filters.q, category: filters.category, machine: filters.onlyThis ? current?.machine.id : '' })}`),
    [filters.q, filters.category, filters.onlyThis, current?.machine.id],
  );

  const persist = async (d) => {
    if (!d.title.trim()) {
      setSaveState('Dê um título para salvar.');
      return d;
    }
    setSaveState('Salvando...');
    const body = { title: d.title.trim(), body: d.body, category: d.category, machineId: d.machineId };
    try {
      const r = d.id ? await api.put(`/notes/${d.id}`, body) : await api.post('/notes', body);
      setSaveState(`Salvo às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`);
      setData((old) => {
        const notes = (old?.notes || []).filter((n) => n.id !== r.note.id);
        return { notes: [r.note, ...notes].sort((a, b) => b.createdAt - a.createdAt) };
      });
      return { ...d, id: r.note.id };
    } catch (err) {
      setSaveState(`Não salvou: ${err.message}`);
      return d;
    }
  };

  /** Autosave: espera 1 s sem digitar; salvamentos ficam em fila (sem duplicar notas novas). */
  const edit = (patch) => {
    if (!isAdmin) return;
    const next = { ...draftRef.current, ...patch };
    draftRef.current = next;
    setDraft(next);
    clearTimeout(timer.current);
    setSaveState('Alterações não salvas...');
    timer.current = setTimeout(() => {
      saving.current = saving.current.then(async () => {
        const latest = draftRef.current;
        const saved = await persist(latest);
        // nota nova: guarda o id para os próximos salvamentos atualizarem a mesma nota
        if (saved.id && !latest.id && draftRef.current === latest) {
          draftRef.current = { ...latest, id: saved.id };
          setDraft(draftRef.current);
        } else if (saved.id && !draftRef.current.id) {
          draftRef.current = { ...draftRef.current, id: saved.id };
          setDraft(draftRef.current);
        }
      });
    }, 1000);
  };

  const open = (d) => {
    clearTimeout(timer.current);
    draftRef.current = d;
    setDraft(d);
    setSaveState('');
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  const remove = async () => {
    try {
      await api.del(`/notes/${confirmDel.id}`);
      toast({ title: 'Anotação apagada', level: 'ok' });
      setConfirmDel(null);
      open(null);
      reload();
    } catch (err) {
      toast({ title: 'Erro ao apagar', message: err.message, level: 'crit' });
    }
  };

  // agrupa por dia
  const groups = [];
  for (const n of data?.notes || []) {
    const day = new Date(n.createdAt).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    const g = groups[groups.length - 1];
    if (g && g.day === day) g.items.push(n);
    else groups.push({ day, items: [n] });
  }
  const machineName = (id) => (id ? machines[id]?.machine.farmName || `Fazenda #${id}` : 'Todas as fazendas');

  return (
    <div class="stack">
      <Panel title="📖 Diário da Fazenda">
        <div class="form-grid">
          <Field label="Pesquisar"><input class="input" type="search" value={q} onInput={(e) => setQ(e.currentTarget.value)} placeholder="SSD, driver, limpeza..." /></Field>
          <Field label="Categoria">
            <select class="input" value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.currentTarget.value })}>
              <option value="">Todas</option>
              {NOTE_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.icon} {c.label}</option>)}
            </select>
          </Field>
          <label class="check" style={{ alignSelf: 'end' }}>
            <input type="checkbox" checked={filters.onlyThis} onChange={(e) => setFilters({ ...filters, onlyThis: e.currentTarget.checked })} /> Só de {current?.machine.farmName || 'esta fazenda'}
          </label>
          {isAdmin && <div style={{ alignSelf: 'end' }}><Button onClick={() => open(blank(current?.machine.id))}>+ Nova anotação</Button></div>}
        </div>
      </Panel>
      <ErrorBox error={error} onRetry={reload} />
      <div class="diary">
        <div>
          {loading && !data ? <Loading /> : (
            <ul class="note-list" aria-label="Anotações por data">
              {!groups.length && <li><Empty>Nenhuma anotação{filters.q ? ' encontrada' : ' ainda'}.</Empty></li>}
              {groups.map((g) => (
                <li key={g.day}>
                  <div class="day">{g.day}</div>
                  {g.items.map((n) => (
                    <button key={n.id} aria-current={draft?.id === n.id ? 'true' : undefined} onClick={() => open({ ...n })}>
                      {catOf(n.category).icon} {n.title}
                      <small>{machineName(n.machineId)} · {new Date(n.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</small>
                    </button>
                  ))}
                </li>
              ))}
            </ul>
          )}
        </div>
        <Panel title={draft ? (draft.id ? '✏️ Anotação' : '✏️ Nova anotação') : '📝 Leitura'}>
          {!draft ? <Empty>Escolha uma anotação na lista{isAdmin ? ' ou crie uma nova' : ''}.</Empty> : (
            <div class="stack">
              <Field label="Título">
                <input class="input" maxLength={120} value={draft.title} readOnly={!isAdmin} onInput={(e) => edit({ title: e.currentTarget.value })} placeholder="Troquei a pasta térmica" />
              </Field>
              <div class="form-grid">
                <Field label="Categoria">
                  <select class="input" value={draft.category} disabled={!isAdmin} onChange={(e) => edit({ category: e.currentTarget.value })}>
                    {NOTE_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.icon} {c.label}</option>)}
                  </select>
                </Field>
                <Field label="Fazenda">
                  <select class="input" value={draft.machineId ?? ''} disabled={!isAdmin} onChange={(e) => edit({ machineId: e.currentTarget.value ? Number(e.currentTarget.value) : null })}>
                    <option value="">Todas as fazendas</option>
                    {Object.values(machines).map((m) => <option key={m.machine.id} value={m.machine.id}>{m.machine.farmName}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Texto">
                <textarea class="input" rows={12} maxLength={20000} value={draft.body} readOnly={!isAdmin} onInput={(e) => edit({ body: e.currentTarget.value })} placeholder="O que mudou, por quê, e como ficou..." />
              </Field>
              <div class="row spread">
                <span class="saved-state" aria-live="polite">{saveState || (draft.id ? `Criada em ${fmtDateTime(draft.createdAt)}${draft.updatedAt !== draft.createdAt ? ` · editada em ${fmtDateTime(draft.updatedAt)}` : ''}` : '')}</span>
                {isAdmin && draft.id && <Button small variant="danger" onClick={() => setConfirmDel(draft)}>Apagar</Button>}
              </div>
            </div>
          )}
        </Panel>
      </div>
      {confirmDel && (
        <Modal title="🗑️ Apagar anotação" onClose={() => setConfirmDel(null)}>
          <p>Apagar "<b>{confirmDel.title}</b>"? Isso não pode ser desfeito.</p>
          <div class="row"><Button variant="danger" onClick={remove}>Apagar</Button><Button variant="light" onClick={() => setConfirmDel(null)}>Cancelar</Button></div>
        </Modal>
      )}
    </div>
  );
}
