/** Preferências visuais deste computador (salvas no banco local). */
import { api } from './api.js';
import { setState, state, toast } from './store.js';
import { setSoundPrefs } from '../audio/sound.js';

export async function savePrefs(patch) {
  const next = { ...state.prefs, ...patch };
  setState({ prefs: next });
  setSoundPrefs(next);
  try {
    const r = await api.put('/preferences', patch);
    setState({ prefs: r.preferences });
  } catch (err) {
    toast({ title: 'Preferência não salva', message: err.message, level: 'warn' });
  }
}
