/**
 * Lógica pura del calendario de visitas (Fase 11B): cada vez que la pareja se ve en persona.
 * Todas las fechas son 'YYYY-MM-DD' (día calendario de la pareja); "hoy" siempre se pasa de fuera.
 */
import { addDays, daysBetween, daysInMonth, parseIsoDate, toIsoDate, type IsoDate } from './dates';
import { MONTH_NAMES } from './dateParts';

/** Lo mínimo de una fila de `visits` que necesita la lógica. */
export type VisitLike = {
  id: string;
  start_date: string;
  end_date: string;
  event_id?: string | null;
};

/** Máximo de días que dura una visita (igual que el servidor: end - start <= 365). */
export const MAX_VISIT_DAYS = 366;
export const VISIT_PLACE_MAX = 80;
export const VISIT_NOTE_MAX = 280;

const day = (iso: string): IsoDate => iso.slice(0, 10);

/** Días que dura la visita, contando llegada y despedida. */
export function visitLength(v: Pick<VisitLike, 'start_date' | 'end_date'>): number {
  return daysBetween(day(v.start_date), day(v.end_date)) + 1;
}

/** ¿Se encimen dos rangos (extremos incluidos)? */
export function rangesOverlap(
  a: { start: string; end: string },
  b: { start: string; end: string },
): boolean {
  return day(a.start) <= day(b.end) && day(b.start) <= day(a.end);
}

/** Mismo criterio que `save_visit`: fechas reales, fin >= inicio, <= 366 días, no empieza en el futuro. */
export function validateVisit(input: {
  start: string | null | undefined;
  end: string | null | undefined;
  today: string;
}): 'invalid_visit' | null {
  const { start, end, today } = input;
  if (!parseIsoDate(start) || !parseIsoDate(end)) return 'invalid_visit';
  const s = day(start as string);
  const e = day(end as string);
  if (e < s) return 'invalid_visit';
  if (daysBetween(s, e) + 1 > MAX_VISIT_DAYS) return 'invalid_visit';
  if (s > today) return 'invalid_visit';
  return null;
}

/** ¿Con qué otra visita (distinta de `ignoreId`) se encima este rango? */
export function findOverlap<T extends VisitLike>(
  visits: readonly T[],
  range: { start: string; end: string },
  ignoreId?: string,
): T | null {
  return (
    visits.find(
      (v) =>
        v.id !== ignoreId &&
        rangesOverlap(range, { start: day(v.start_date), end: day(v.end_date) }),
    ) ?? null
  );
}

function byStart<T extends VisitLike>(visits: readonly T[]): T[] {
  return [...visits].sort((a, b) =>
    a.start_date === b.start_date
      ? a.end_date < b.end_date
        ? -1
        : 1
      : a.start_date < b.start_date
        ? -1
        : 1,
  );
}

export type VisitStats<T extends VisitLike = VisitLike> = {
  /** Visitas que ya empezaron. */
  count: number;
  daysTogether: number;
  daysApart: number;
  /** 0–100 entero; null si no hay periodo que medir. */
  pctTogether: number | null;
  longestVisit: number | null;
  /** Días entre una visita y la siguiente (sin contar las visitas). */
  longestGap: number | null;
  averageGap: number | null;
  /** La que está en curso hoy. */
  current: T | null;
  /** La más reciente que ya empezó. */
  last: T | null;
  /** 0 si están juntos; null si nunca se han visto. */
  daysSinceLast: number | null;
};

/**
 * Estadísticas dentro de [inicio, hoy]. Inicio = `start` (aniversario) o, si no hay o es posterior
 * a la primera visita, la primera visita. Una visita en curso cuenta hasta hoy.
 */
export function visitStats<T extends VisitLike>(
  visits: readonly T[],
  opts: { start: string | null; today: string },
): VisitStats<T> {
  const { today } = opts;
  const started = byStart(visits).filter((v) => day(v.start_date) <= today);
  const first = started[0];
  const anniversary = opts.start && parseIsoDate(opts.start) ? day(opts.start) : null;
  let periodStart: IsoDate | null = anniversary;
  if (first && (!periodStart || periodStart > day(first.start_date))) {
    periodStart = day(first.start_date);
  }
  const periodDays = periodStart && periodStart <= today ? daysBetween(periodStart, today) + 1 : 0;

  // Rangos recortados a hoy, fusionando traslapes por si llegara algo inconsistente.
  const clipped: { start: IsoDate; end: IsoDate }[] = [];
  for (const v of started) {
    const range = {
      start: day(v.start_date),
      end: day(v.end_date) > today ? today : day(v.end_date),
    };
    const prev = clipped[clipped.length - 1];
    if (prev && range.start <= prev.end) {
      if (range.end > prev.end) prev.end = range.end;
    } else clipped.push(range);
  }

  let together = 0;
  const gaps: number[] = [];
  let longestVisit: number | null = null;
  clipped.forEach((r, i) => {
    const len = daysBetween(r.start, r.end) + 1;
    together += len;
    if (longestVisit === null || len > longestVisit) longestVisit = len;
    const prev = clipped[i - 1];
    if (prev) {
      const gap = daysBetween(prev.end, r.start) - 1;
      if (gap > 0) gaps.push(gap);
    }
  });

  const current = started.find((v) => day(v.start_date) <= today && day(v.end_date) >= today);
  // La más reciente por inicio (con el mismo inicio, la que termina después).
  const last = started[started.length - 1] ?? null;
  const lastEnd = clipped[clipped.length - 1]?.end ?? null;

  return {
    count: started.length,
    daysTogether: together,
    daysApart: Math.max(0, periodDays - together),
    pctTogether: periodDays > 0 ? Math.round((together * 100) / periodDays) : null,
    longestVisit,
    longestGap: gaps.length ? Math.max(...gaps) : null,
    averageGap: gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : null,
    current: current ?? null,
    last,
    daysSinceLast: current ? 0 : lastEnd ? daysBetween(lastEnd, today) : null,
  };
}

export type VisitEventLike = { id: string; kind: string; date: string; title: string };

/**
 * Cuentas regresivas de visita que ya pasaron y no tienen visita apuntada: ni ligada por
 * `event_id` ni con su fecha dentro de alguna visita. Las más recientes primero.
 */
export function pendingVisitEvents<E extends VisitEventLike>(
  events: readonly E[],
  visits: readonly VisitLike[],
  today: string,
): E[] {
  const linked = new Set(visits.map((v) => v.event_id).filter(Boolean));
  return events
    .filter((e) => {
      if (e.kind !== 'visit') return false;
      const date = day(e.date);
      if (date > today || linked.has(e.id)) return false;
      return !visits.some((v) => day(v.start_date) <= date && date <= day(v.end_date));
    })
    .sort((a, b) => (day(a.date) < day(b.date) ? 1 : day(a.date) > day(b.date) ? -1 : 0));
}

export type CalendarDay = {
  day: number;
  iso: IsoDate;
  together: boolean;
  future: boolean;
  today: boolean;
};
export type CalendarMonth = {
  /** 1–12 */
  month: number;
  /** "ene", "feb"… */
  label: string;
  /** Casillas vacías antes del día 1 (semana que empieza en lunes). */
  offset: number;
  days: CalendarDay[];
};

const SHORT_MONTHS = MONTH_NAMES.map((m) => m.slice(0, 3));

/** Los 12 meses de un año con cada día marcado (juntos, futuro, hoy). */
export function visitCalendar(
  visits: readonly VisitLike[],
  year: number,
  today: string,
): CalendarMonth[] {
  const ranges = visits.map((v) => ({ start: day(v.start_date), end: day(v.end_date) }));
  return Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const first = new Date(0);
    first.setUTCFullYear(year, i, 1);
    const offset = (first.getUTCDay() + 6) % 7;
    const days: CalendarDay[] = [];
    for (let d = 1; d <= daysInMonth(year, month); d++) {
      const iso = toIsoDate({ year, month, day: d });
      days.push({
        day: d,
        iso,
        together: ranges.some((r) => r.start <= iso && iso <= r.end),
        future: iso > today,
        today: iso === today,
      });
    }
    return { month, label: SHORT_MONTHS[i] ?? '', offset, days };
  });
}

/** Años que mostrar en el calendario, de menor a mayor, sin huecos; siempre incluye el de hoy. */
export function visitYears(visits: readonly VisitLike[], today: string): number[] {
  const currentYear = Number(today.slice(0, 4));
  let min = currentYear;
  let max = currentYear;
  for (const v of visits) {
    const a = Number(v.start_date.slice(0, 4));
    const b = Number(v.end_date.slice(0, 4));
    if (Number.isFinite(a)) min = Math.min(min, a);
    if (Number.isFinite(b)) max = Math.max(max, b);
  }
  return Array.from({ length: max - min + 1 }, (_, i) => min + i);
}

/** "12–18 oct 2026" · "28 sep – 2 oct 2026" · "28 dic 2026 – 3 ene 2027" · "12 oct 2026". */
export function visitRangeLabel(v: Pick<VisitLike, 'start_date' | 'end_date'>): string {
  const s = parseIsoDate(v.start_date);
  const e = parseIsoDate(v.end_date);
  if (!s || !e) return '';
  const mon = (m: number) => SHORT_MONTHS[m - 1] ?? '';
  if (s.year === e.year && s.month === e.month && s.day === e.day) {
    return `${s.day} ${mon(s.month)} ${s.year}`;
  }
  if (s.year === e.year && s.month === e.month) {
    return `${s.day}–${e.day} ${mon(s.month)} ${s.year}`;
  }
  if (s.year === e.year) return `${s.day} ${mon(s.month)} – ${e.day} ${mon(e.month)} ${s.year}`;
  return `${s.day} ${mon(s.month)} ${s.year} – ${e.day} ${mon(e.month)} ${e.year}`;
}

/** Fecha más tardía a la que puede terminar una visita que empieza en `start` (para ayudas). */
export function maxVisitEnd(start: string): string {
  return addDays(day(start), MAX_VISIT_DAYS - 1);
}
