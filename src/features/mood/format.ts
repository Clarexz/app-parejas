import { daysBetween, type IsoDate } from '@/lib/dates';

const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Título del día en el historial: "Hoy", "Ayer" o "lunes 26 oct". */
export function dayTitle(day: IsoDate, today: IsoDate): string {
  const diff = daysBetween(day, today);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Ayer';
  const [y, m, d] = day.split('-').map(Number);
  if (!y || !m || !d) return day;
  const date = new Date(Date.UTC(y, m - 1, d));
  return `${WEEKDAYS[date.getUTCDay()]} ${d} ${MONTHS[m - 1]}`;
}
