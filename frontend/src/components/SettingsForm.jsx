/** Ajudantes para formulários de configuração (salvar seção, campos numéricos). */
import { useEffect, useState } from 'preact/hooks';
import { api } from '../services/api.js';
import { setState, state, toast, useStore } from '../services/store.js';
import { Field } from './ui.jsx';

/** Edita uma seção de /api/settings com rascunho local, salvar e restaurar padrão. */
export function useSettingsSection(section) {
  const value = useStore((s) => s.settings?.[section]);
  const [draft, setDraft] = useState(value);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => setDraft(value), [value]);

  const apply = (v) => setState({ settings: { ...state.settings, [section]: v } });
  const save = async (v = draft) => {
    setBusy(true);
    setError(null);
    try {
      const r = await api.put(`/settings/${section}`, v);
      apply(r.value);
      toast({ title: 'Configuração salva', level: 'ok', timeout: 2500 });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };
  const reset = async () => {
    setBusy(true);
    try {
      const r = await api.del(`/settings/${section}`);
      apply(r.value);
      toast({ title: 'Padrões restaurados', level: 'ok', timeout: 2500 });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };
  return { value, draft, setDraft, save, reset, busy, error, dirty: JSON.stringify(draft) !== JSON.stringify(value) };
}

export function NumberField({ label, value, onChange, min, max, step = 1, suffix, disabled }) {
  return (
    <Field label={suffix ? `${label} (${suffix})` : label}>
      <input class="input num" type="number" value={value} min={min} max={max} step={step} disabled={disabled}
        onInput={(e) => {
          const n = e.currentTarget.valueAsNumber;
          if (Number.isFinite(n)) onChange(n);
        }} />
    </Field>
  );
}
