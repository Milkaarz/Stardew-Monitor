import { setState, state, useStore, selectedMachine } from '../services/store.js';
import { savePrefs } from '../services/prefs.js';

const STATUS_ICON = { ok: '🟢', warn: '🟡', crit: '🔴', offline: '⚪' };

export function MachinePicker() {
  const machines = useStore((s) => s.machines);
  const current = useStore(() => selectedMachine());
  const list = Object.values(machines).sort((a, b) => (b.machine.isLocal ? 1 : 0) - (a.machine.isLocal ? 1 : 0) || a.machine.id - b.machine.id);
  if (list.length <= 1) return null;
  return (
    <label class="field" style={{ minWidth: '190px' }}>
      <span class="sr-only">Fazenda selecionada</span>
      <select
        class="input"
        value={current?.machine.id}
        onChange={(e) => {
          const id = Number(e.currentTarget.value);
          setState({ selectedId: id });
          savePrefs({ selectedMachine: id });
        }}
      >
        {list.map((m) => (
          <option key={m.machine.id} value={m.machine.id}>
            {STATUS_ICON[m.machine.status] || '⚪'} {m.machine.farmName}
          </option>
        ))}
      </select>
    </label>
  );
}

export function selectMachine(id) {
  setState({ selectedId: id });
  if (state.auth.user) savePrefs({ selectedMachine: id });
}
