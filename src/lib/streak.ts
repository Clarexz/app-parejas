/**
 * Racha de la pareja: espejo puro de `couple_complete_days` + `get_streak` (servidor).
 * Todas las fechas son días calendario locales de la pareja, 'YYYY-MM-DD'.
 */
import { addDays } from './dates';

/** Días después del día de la pregunta en que todavía se puede reparar la racha. */
export const REPAIR_WINDOW_DAYS = 7;

/**
 * Un día está completo si los dos contestaron y la última respuesta llegó a más
 * tardar `REPAIR_WINDOW_DAYS` días después del día de la pregunta.
 * `answeredOn`: día local en que se contestó cada respuesta (null = sin respuesta).
 */
export function isDayComplete(day: string, answeredOn: (string | null)[]): boolean {
  const answered = answeredOn.filter((d): d is string => typeof d === 'string');
  if (answered.length < 2) return false;
  const latest = answered.reduce((a, b) => (a > b ? a : b));
  return latest <= addDays(day, REPAIR_WINDOW_DAYS);
}

export type StreakInput = {
  completeDays: string[];
  today: string;
  startDay: string | null;
  memberCount: number;
};

export type StreakResult = {
  current: number;
  best: number;
  todayDone: boolean;
  missingDays: string[];
};

export function computeStreak(input: StreakInput): StreakResult {
  const { today, startDay, memberCount } = input;
  // Sin duplicados, ordenados y sin días futuros (como `d <= v_today` del servidor).
  const days = [...new Set(input.completeDays)].filter((d) => d <= today).sort();
  const set = new Set(days);
  const todayDone = set.has(today);
  const anchor = todayDone ? today : addDays(today, -1);

  let best = 0;
  let current = 0;
  let runLength = 0;
  let prev: string | null = null;
  for (const d of days) {
    runLength = prev !== null && addDays(prev, 1) === d ? runLength + 1 : 1;
    if (runLength > best) best = runLength;
    if (d === anchor) current = runLength;
    prev = d;
  }

  const missingDays: string[] = [];
  if (memberCount === 2) {
    const windowStart = addDays(today, -REPAIR_WINDOW_DAYS);
    const start = startDay ?? today; // como `coalesce(v_start, v_today)` del servidor
    const first = start > windowStart ? start : windowStart;
    const last = addDays(today, -1);
    for (let d = first; d <= last; d = addDays(d, 1)) {
      if (!set.has(d)) missingDays.push(d);
    }
  }

  return { current, best, todayDone, missingDays };
}
