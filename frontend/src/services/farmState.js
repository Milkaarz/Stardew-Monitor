/** Junta métricas ao vivo + configurações + relógio no estado visual da fazenda. */
import { useMemo, useRef } from 'preact/hooks';
import { computeFarmState, getSeason, getDayPhase, activeFestival, messageCondition, MessagePicker } from '@stardew-monitor/shared';

export function useFarmView(payload, settings, now) {
  const picker = useRef(new MessagePicker()).current;
  return useMemo(() => {
    if (!payload) return null;
    const s = settings || {};
    const ap = s.appearance || {};
    const season = getSeason(now, { mode: ap.seasonMode || 'south', farmEpoch: ap.farmEpoch });
    const day = getDayPhase(now);
    const festival = ap.festivalDecorations === false ? null : activeFestival(now, { festivals: s.festivals, mode: ap.seasonMode, farmEpoch: ap.farmEpoch });
    const online = payload.machine?.status !== 'offline';
    const farm = computeFarmState(payload.snapshot, {
      thresholds: s.thresholds,
      weather: s.weather,
      derived: payload.derived,
      online,
      farmSeconds: payload.farmSeconds,
    });
    if (farm.empty) return { farm: null, season, day, festival, message: 'Aguardando a primeira leitura desta fazenda...' };
    const condition = messageCondition(farm, { isNight: day.isNight, festival });
    const message = picker.pick(condition, now.getTime(), condition === 'festival' && festival ? [festival.message] : []);
    return { farm, season, day, festival, message, condition };
  }, [payload, settings, now]);
}
