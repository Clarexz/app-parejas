/**
 * Racha de la pareja: espejo puro de `private.compute_streak` + `get_streak` (servidor).
 * Todas las fechas son días calendario locales de la pareja, 'YYYY-MM-DD'.
 *
 * Reglas (estilo TikTok), recorriendo CADA día desde `startDay` hasta hoy:
 *  - Día neutral (día en que se hizo una recuperación): ni suma ni rompe.
 *  - completedOn <= día: la racha suma.
 *  - completedOn = día + 1, con racha > 0 y menos de 5 recuperaciones usadas en el mes de
 *    día + 1: recuperación. El día perdido cuenta, se gasta 1 y día + 1 queda neutral.
 *  - Cualquier otro caso en días anteriores a ayer: la racha vuelve a 0.
 *  - Ayer sin completar y recuperable: `repairDay` pendiente, la racha queda "en riesgo" y
 *    hoy no suma aunque contesten a tiempo.
 */
import { addDays } from './dates';

/** Recuperaciones disponibles por mes calendario. */
export const REPAIRS_PER_MONTH = 5;

export type StreakCompletion = {
  /** Día de la pregunta del día. */
  day: string;
  /** Día local en que los dos miembros ya habían contestado; null si falta alguno. */
  completedOn: string | null;
};

export type StreakInput = {
  completions: StreakCompletion[];
  today: string;
  startDay: string | null;
  memberCount: number;
};

export type StreakResult = {
  current: number;
  best: number;
  todayDone: boolean;
  todayIsRepair: boolean;
  repairDay: string | null;
  repairsUsed: number;
  repairsLeft: number;
};

const monthOf = (iso: string): string => iso.slice(0, 7);

export function computeStreak(input: StreakInput): StreakResult {
  const { today, memberCount } = input;
  const start = input.startDay ?? today; // como `coalesce(start, today)` del servidor
  const completedOn = new Map<string, string>();
  for (const c of input.completions) {
    if (c.completedOn !== null && c.day <= today) completedOn.set(c.day, c.completedOn);
  }

  let run = 0;
  let best = 0;
  const repairs: string[] = []; // días (día + 1) en que se gastó una recuperación
  let neutral: string | null = null;
  let repairDay: string | null = null;
  let todayDone = false;
  let todayIsRepair = false;
  const usedIn = (month: string) => repairs.filter((r) => monthOf(r) === month).length;

  for (let d = start; d <= today; d = addDays(d, 1)) {
    if (neutral === d) {
      if (d === today) {
        todayDone = true;
        todayIsRepair = true;
      }
      continue;
    }
    const c = completedOn.get(d) ?? null;

    if (d < today) {
      const used = usedIn(monthOf(addDays(d, 1)));
      if (c !== null && c <= d) {
        run += 1;
      } else if (c !== null && c === addDays(d, 1) && run > 0 && used < REPAIRS_PER_MONTH) {
        run += 1;
        repairs.push(addDays(d, 1));
        neutral = addDays(d, 1);
      } else if (d === addDays(today, -1) && run > 0 && memberCount === 2 && used < REPAIRS_PER_MONTH) {
        repairDay = d; // ayer pendiente: todavía se puede recuperar hoy
      } else {
        run = 0;
      }
      if (run > best) best = run;
    } else if (repairDay === null && c !== null && c <= d) {
      run += 1;
      todayDone = true;
      if (run > best) best = run;
    }
  }

  const repairsUsed = usedIn(monthOf(today));
  return {
    current: run,
    best,
    todayDone,
    todayIsRepair,
    repairDay,
    repairsUsed,
    repairsLeft: Math.max(REPAIRS_PER_MONTH - repairsUsed, 0),
  };
}
