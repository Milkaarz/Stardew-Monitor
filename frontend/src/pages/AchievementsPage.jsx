import { useEffect } from 'preact/hooks';
import { api, qs } from '../services/api.js';
import { useStore, selectedMachine } from '../services/store.js';
import { onLiveEvent } from '../services/live.js';
import { Sprite } from '../farm/pixel.jsx';
import { ICONS } from '../farm/sprites.js';
import { Panel, Bar, Loading, ErrorBox, Empty, useAsync, fmtDateTime } from '../components/ui.jsx';

export function AchievementIcon({ name, size = 48 }) {
  const icon = ICONS[name] || ICONS.star;
  return (
    <svg viewBox="0 0 12 12" width={size} height={size} shape-rendering="crispEdges" aria-hidden="true">
      <Sprite rows={icon.rows} palette={icon.palette} />
    </svg>
  );
}

const progressText = (a) => {
  if (a.goal == null) return null;
  if (['dedicated_farmer', 'farm_veteran'].includes(a.key)) return `${Math.floor((a.value || 0) / 86400)} de ${a.goal / 86400} dias`;
  if (a.key === 'quiet_day') return `${Math.floor((a.value || 0) / 60)} de ${a.goal / 60} min`;
  if (a.key === 'tireless_machine') return `${Math.floor((a.value || 0) / 3600)} de ${a.goal / 3600} h`;
  if (a.key === 'organized_farm') return `${a.value || 0} de ${a.goal} dias`;
  return `${a.value || 0} de ${a.goal}`;
};

export function AchievementsPage() {
  const payload = useStore(() => selectedMachine());
  const machines = useStore((s) => s.machines);
  const id = payload?.machine.id;
  const { data, loading, error, reload } = useAsync(() => api.get(`/achievements${qs({ machine: id })}`), [id]);
  useEffect(() => onLiveEvent((t) => t === 'achievement' && reload()), [id]);

  if (loading && !data) return <Panel><Loading /></Panel>;
  const unlocked = data?.items.filter((a) => a.unlocked).length || 0;

  return (
    <div class="stack">
      <ErrorBox error={error} onRetry={reload} />
      {data && (
        <>
          <Panel title={`🏆 Conquistas · ${payload?.machine.farmName || ''}`}>
            <p class="pixel" style={{ fontSize: '.5rem' }}>{unlocked} de {data.items.length} desbloqueadas</p>
            <div class="achievements">
              {data.items.map((a) => (
                <div key={a.key} class={`achievement ${a.unlocked ? 'unlocked' : 'locked'}`}>
                  <AchievementIcon name={a.unlocked ? a.icon : a.icon} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b>{a.unlocked ? '★ ' : ''}{a.title}</b>
                    <span>{a.description}</span>
                    {a.scope === 'global' && <div class="muted" style={{ fontSize: '1rem' }}>Conquista de Pelican Town (todas as fazendas)</div>}
                    {a.unlocked ? (
                      <div class="muted" style={{ fontSize: '1rem' }}>Desbloqueada em {fmtDateTime(a.unlockedAt)}</div>
                    ) : a.progress != null ? (
                      <div style={{ marginTop: '6px' }}>
                        <Bar value={a.progress * 100} level="ok" label={`Progresso de ${a.title}`} />
                        <span class="muted num" style={{ fontSize: '1rem' }}>{progressText(a)}</span>
                      </div>
                    ) : <div class="muted" style={{ fontSize: '1rem' }}>Ainda não alcançada</div>}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="📜 Histórico de conquistas">
            {!data.history.length ? <Empty>Nenhuma conquista ainda.</Empty> : (
              <ul class="kv">
                {data.history.map((h) => (
                  <li key={`${h.machineId}-${h.key}`}>
                    <span class="row"><AchievementIcon name={h.icon} size={24} /> {h.title} · {h.machineId ? machines[h.machineId]?.machine.farmName || `Fazenda #${h.machineId}` : 'Pelican Town'}</span>
                    <b>{fmtDateTime(h.unlockedAt)}</b>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
