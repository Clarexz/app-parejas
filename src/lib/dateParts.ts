export type DateParts = { day: string; month: string; year: string };

type Result = { ok: true; value: string } | { ok: false; error: string };

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

const pad = (n: number, len: number) => String(n).padStart(len, '0');

function isoOf(d: Date): string {
  return `${pad(d.getFullYear(), 4)}-${pad(d.getMonth() + 1, 2)}-${pad(d.getDate(), 2)}`;
}

/** Valida día/mes/año (texto de formulario) y devuelve 'YYYY-MM-DD' si es una fecha real. */
export function partsToIsoDate(
  parts: DateParts,
  opts: { notAfter?: Date; notBefore?: Date } = {},
): Result {
  const day = parts.day.trim();
  const month = parts.month.trim();
  const year = parts.year.trim();
  if (!/^\d{1,2}$/.test(day) || !/^\d{1,2}$/.test(month)) {
    return { ok: false, error: 'Escribe el día y el mes con números.' };
  }
  if (!/^\d{4}$/.test(year)) return { ok: false, error: 'Escribe el año con 4 dígitos.' };
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  if (y < 1900) return { ok: false, error: 'El año debe ser 1900 o posterior.' };
  if (m < 1 || m > 12) return { ok: false, error: 'El mes debe estar entre 1 y 12.' };
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  if (d < 1 || d > daysInMonth) return { ok: false, error: 'Ese día no existe en ese mes.' };

  const value = `${pad(y, 4)}-${pad(m, 2)}-${pad(d, 2)}`;
  if (opts.notAfter && value > isoOf(opts.notAfter)) {
    return { ok: false, error: 'Esa fecha todavía no llega.' };
  }
  if (opts.notBefore && value < isoOf(opts.notBefore)) {
    return { ok: false, error: 'Esa fecha es demasiado antigua.' };
  }
  return { ok: true, value };
}

export function isoDateToParts(iso: string | null | undefined): DateParts {
  const match = iso ? /^(\d{4})-(\d{2})-(\d{2})/.exec(iso) : null;
  if (!match) return { day: '', month: '', year: '' };
  return { day: String(Number(match[3])), month: String(Number(match[2])), year: match[1] };
}

/** "2023-02-14" -> "14 de febrero de 2023". */
export function formatLongDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return iso;
  const month = MONTHS[Number(match[2]) - 1];
  if (!month) return iso;
  return `${Number(match[3])} de ${month} de ${match[1]}`;
}
