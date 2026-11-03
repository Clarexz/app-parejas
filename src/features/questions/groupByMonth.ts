import type { HistoryItem } from '@/lib/questions';

export type HistoryRow =
  | { kind: 'month'; key: string; label: string; count: number }
  | { kind: 'item'; key: string; item: HistoryItem };

const MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/** 'YYYY-MM' del renglón: el día de la pregunta o, si no fue del día, la última actividad. */
function monthKey(item: HistoryItem): string {
  return (item.day ?? item.last_activity).slice(0, 7);
}

/** "noviembre" (con el año si no es el actual) a partir de 'YYYY-MM'. */
export function monthLabel(key: string, currentYear: number): string {
  const [year, month] = key.split('-').map(Number);
  const name = MONTHS[(month ?? 1) - 1] ?? key;
  return year === currentYear ? name : `${name} ${year}`;
}

/** "29 oct" a partir de 'YYYY-MM-DD'. */
export function shortDay(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${(MONTHS[m - 1] ?? '').slice(0, 3)}`;
}

/** Aplana el historial en encabezados de mes ("noviembre", con su conteo) y renglones. */
export function groupHistoryByMonth(items: HistoryItem[], currentYear: number): HistoryRow[] {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(monthKey(item), (counts.get(monthKey(item)) ?? 0) + 1);
  const rows: HistoryRow[] = [];
  let last = '';
  for (const item of items) {
    const key = monthKey(item);
    if (key !== last) {
      rows.push({
        kind: 'month',
        key: `month-${key}`,
        label: monthLabel(key, currentYear),
        count: counts.get(key) ?? 0,
      });
      last = key;
    }
    rows.push({ kind: 'item', key: item.question.id, item });
  }
  return rows;
}
