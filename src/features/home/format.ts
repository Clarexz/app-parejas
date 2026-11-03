import { parseIsoDate, type IsoDate } from '@/lib/dates';

const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** "martes 3 nov": día de la semana, número y mes corto, en minúsculas. */
export function shortDate(iso: IsoDate): string {
  const p = parseIsoDate(iso);
  if (!p) return '';
  const d = new Date(0);
  d.setUTCFullYear(p.year, p.month - 1, p.day);
  return `${WEEKDAYS[d.getUTCDay()]} ${p.day} ${MONTHS[p.month - 1]}`;
}

function utcDay(iso: string | null | undefined): number {
  const p = parseIsoDate(iso ? iso.slice(0, 10) : null);
  return p ? Date.UTC(p.year, p.month - 1, p.day) : NaN;
}

const DAY_MS = 86_400_000;
const FALLBACK_WINDOW = 30;

/**
 * Qué tanto de la espera ya pasó (0.06 a 1) para llenar la media luna. Si se sabe cuándo se
 * apuntó la fecha, cuenta desde ahí; si no (fechas automáticas), usa una ventana de 30 días.
 */
export function countdownProgress(
  daysUntil: number,
  createdAt: string | null | undefined,
  today: IsoDate,
): number {
  if (daysUntil <= 0) return 1;
  const elapsed = (utcDay(today) - utcDay(createdAt)) / DAY_MS;
  const total = elapsed + daysUntil;
  const known = Number.isFinite(total) && elapsed >= 0 && total >= 2;
  const done = known ? elapsed : FALLBACK_WINDOW - Math.min(daysUntil, FALLBACK_WINDOW);
  const window = known ? total : FALLBACK_WINDOW;
  return Math.min(1, Math.max(0.06, done / window));
}
