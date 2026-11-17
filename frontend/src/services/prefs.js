/** Preferências visuais do usuário, salvas no servidor (acompanham a conta, não o navegador). */
import { api } from './api.js';
import { setState, state, toast } from './store.js';
import { setSoundPrefs } from '../audio/sound.js';

export async function savePrefs(patch) {
  const prev = state.auth.user?.prefs || {};
  const next = { ...prev, ...patch };
  setState({ auth: { ...state.auth, user: { ...state.auth.user, prefs: next } } });
  setSoundPrefs(next);
  try {
    const r = await api.put('/auth/prefs', patch);
    setState({ auth: { ...state.auth, user: r.user } });
  } catch (err) {
    toast({ title: 'Preferência não salva', message: err.message, level: 'warn' });
  }
}
