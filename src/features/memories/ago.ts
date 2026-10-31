import { daysBetween, parseIsoDate } from '@/lib/dates';
import { memoryAgo } from '@/lib/memories';
import { shortStamp } from '@/lib/questionsView';

/**
 * Cuánto hace que pasó la memoria: "hace 2 años" desde el año, y para lo reciente
 * "hoy", "ayer", "hace 5 días" o "hace 3 meses". Vacío si la fecha es del futuro.
 */
export function memoryWhen(happenedOn: string, today: string): string {
  const from = parseIsoDate(happenedOn);
  const to = parseIsoDate(today);
  if (!from || !to) return '';
  let years = to.year - from.year;
  if (to.month < from.month || (to.month === from.month && to.day < from.day)) years -= 1;
  if (years >= 1) return memoryAgo(years);
  const days = daysBetween(happenedOn, today);
  if (days < 0) return '';
  if (days === 0) return 'hoy';
  if (days === 1) return 'ayer';
  if (days < 30) return `hace ${days} días`;
  const months = Math.max(1, Math.floor(days / 30.4));
  return months === 1 ? 'hace 1 mes' : `hace ${months} meses`;
}

/** "29 OCT": día y mes para el sello de una polaroid. */
export function dayMonthStamp(iso: string): string {
  return shortStamp(iso).split(' ').slice(0, 2).join(' ');
}
