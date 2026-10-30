// Lógica pura del selector de hora (`TimeField`): 'HH:MM' en 24 h, con pasos de hora y de 15 min.

export const MINUTE_STEP = 15;

export type TimeParts = { hour: number; minute: number };

/** 'HH:MM' → partes numéricas; si no es una hora válida, 21:00. */
export function splitTime(time: string): TimeParts {
  const m = /^(\d{1,2}):(\d{2})/.exec(time);
  const hour = m ? Number(m[1]) : NaN;
  const minute = m ? Number(m[2]) : NaN;
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour > 23 || minute > 59) {
    return { hour: 21, minute: 0 };
  }
  return { hour, minute };
}

const pad2 = (n: number) => String(n).padStart(2, '0');

export function joinTime({ hour, minute }: TimeParts): string {
  return `${pad2(hour)}:${pad2(minute)}`;
}

/** Suma `delta` horas dando la vuelta al día (23 → 00). */
export function stepHour(time: string, delta: number): string {
  const { hour, minute } = splitTime(time);
  return joinTime({ hour: (((hour + delta) % 24) + 24) % 24, minute });
}

/**
 * Suma `delta` pasos de 15 minutos dentro de la misma hora (45 → 00 sin tocar la hora), y
 * primero ajusta a la rejilla de 15 (21:07 + 1 paso → 21:15; − 1 paso → 21:00).
 */
export function stepMinute(time: string, delta: number): string {
  const { hour, minute } = splitTime(time);
  const slots = 60 / MINUTE_STEP;
  const exact = minute / MINUTE_STEP;
  const base = delta > 0 ? Math.floor(exact) : Math.ceil(exact);
  const next = (((base + delta) % slots) + slots) % slots;
  return joinTime({ hour, minute: next * MINUTE_STEP });
}

/** 'HH:MM' → "9:00 p. m." (formato amigable de México). */
export function formatTimeFriendly(time: string): string {
  const { hour, minute } = splitTime(time);
  const suffix = hour < 12 ? 'a. m.' : 'p. m.';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${pad2(minute)} ${suffix}`;
}
