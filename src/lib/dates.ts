import { DEFAULT_TIME_ZONE } from './timezone';

/** Fecha calendario 'YYYY-MM-DD'. */
export type IsoDate = string;
/** Partes de una fecha calendario; `month` va de 1 a 12. */
export type DateParts3 = { year: number; month: number; day: number };

const MS_PER_DAY = 86_400_000;

function pad(n: number, size: number): string {
  return String(n).padStart(size, '0');
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

/** Lee 'YYYY-MM-DD' (o un timestamp que empiece así) y valida que la fecha exista. */
export function parseIsoDate(iso: string | null | undefined): DateParts3 | null {
  if (typeof iso !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/.exec(iso);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null;
  return { year, month, day };
}

export function toIsoDate(p: DateParts3): IsoDate {
  return `${pad(p.year, 4)}-${pad(p.month, 2)}-${pad(p.day, 2)}`;
}

function mustParse(iso: IsoDate): DateParts3 {
  const p = parseIsoDate(iso);
  if (!p) throw new RangeError(`Fecha inválida: ${iso}`);
  return p;
}

function toUtcMs(p: DateParts3): number {
  const d = new Date(0);
  d.setUTCFullYear(p.year, p.month - 1, p.day);
  return d.getTime();
}

function localToday(now: Date): IsoDate {
  return toIsoDate({ year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() });
}

function todayInZone(timeZone: string, now: Date): IsoDate | null {
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    if (typeof fmt.formatToParts === 'function') {
      const parts = fmt.formatToParts(now);
      const get = (type: string) => Number(parts.find((x) => x.type === type)?.value);
      const year = get('year');
      const month = get('month');
      const day = get('day');
      if (year && month && day) return toIsoDate({ year, month, day });
    }
    // Respaldo: "MM/DD/YYYY"
    const m = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(fmt.format(now));
    if (m) return toIsoDate({ year: Number(m[3]), month: Number(m[1]), day: Number(m[2]) });
  } catch {
    // zona inválida o Intl no disponible
  }
  return null;
}

/** Fecha calendario de "hoy" en la zona IANA dada (inválida → Ciudad de México; sin Intl → fecha del dispositivo). */
export function todayIn(timeZone: string, now: Date = new Date()): IsoDate {
  return todayInZone(timeZone, now) ?? todayInZone(DEFAULT_TIME_ZONE, now) ?? localToday(now);
}

export function addDays(iso: IsoDate, n: number): IsoDate {
  const p = mustParse(iso);
  const d = new Date(toUtcMs(p) + n * MS_PER_DAY);
  return toIsoDate({
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  });
}

/** Suma meses; si el día no existe en el mes destino se usa el último (31 ene + 1 mes = 28/29 feb). */
export function addMonths(iso: IsoDate, n: number): IsoDate {
  const p = mustParse(iso);
  const total = p.year * 12 + (p.month - 1) + n;
  const year = Math.floor(total / 12);
  const month = total - year * 12 + 1;
  return toIsoDate({ year, month, day: Math.min(p.day, daysInMonth(year, month)) });
}

/** `to - from` en días calendario (aritmética en UTC, sin horario de verano). */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((toUtcMs(mustParse(to)) - toUtcMs(mustParse(from))) / MS_PER_DAY);
}

/** Día de relación: el aniversario es el día 1. Si todavía no llega, 0. */
export function daysTogether(start: IsoDate, today: IsoDate): number {
  const diff = daysBetween(start, today);
  return diff < 0 ? 0 : diff + 1;
}

function monthIndex(p: DateParts3): number {
  return p.year * 12 + (p.month - 1);
}

/** Años, meses y días completos transcurridos desde `start`. */
export function elapsedBreakdown(
  start: IsoDate,
  today: IsoDate,
): { years: number; months: number; days: number } {
  if (daysBetween(start, today) < 0) return { years: 0, months: 0, days: 0 };
  let k = monthIndex(mustParse(today)) - monthIndex(mustParse(start));
  if (addMonths(start, k) > today) k -= 1;
  return {
    years: Math.floor(k / 12),
    months: k % 12,
    days: daysBetween(addMonths(start, k), today),
  };
}

export type MilestoneKind = 'days' | 'monthiversary' | 'anniversary';
export type Milestone = {
  kind: MilestoneKind;
  value: number;
  date: IsoDate;
  daysUntil: number;
  label: string;
};

const KIND_ORDER: Record<MilestoneKind, number> = { anniversary: 0, days: 1, monthiversary: 2 };
const MAX_MILESTONE_DAYS = 40_000;

/** Días-hito: cada 100 hasta 1000, luego cada 500, más los repetidos 1111…9999. */
function milestoneDayCounts(): number[] {
  const set = new Set<number>();
  for (let n = 100; n <= 1000; n += 100) set.add(n);
  for (let n = 1500; n <= MAX_MILESTONE_DAYS; n += 500) set.add(n);
  for (let d = 1; d <= 9; d++) set.add(d * 1111);
  return [...set].sort((a, b) => a - b);
}

function monthsLabel(n: number): string {
  if (n >= 12) return formatBreakdown({ years: Math.floor(n / 12), months: n % 12, days: 0 });
  return n === 1 ? '1 mes' : `${formatNumber(n)} meses`;
}

function yearsLabel(n: number): string {
  return n === 1 ? '1 año' : `${formatNumber(n)} años`;
}

/** Próximos hitos con fecha >= today, ordenados por fecha (empate: aniversario, días, cumplemés). */
export function upcomingMilestones(
  start: IsoDate,
  today: IsoDate,
  opts: { limit?: number; kinds?: MilestoneKind[] } = {},
): Milestone[] {
  const limit = opts.limit ?? 3;
  const kinds = opts.kinds ?? ['days', 'monthiversary', 'anniversary'];
  if (limit <= 0) return [];
  const out: Milestone[] = [];
  const make = (kind: MilestoneKind, value: number, date: IsoDate, label: string): Milestone => ({
    kind,
    value,
    date,
    daysUntil: daysBetween(today, date),
    label,
  });

  if (kinds.includes('days')) {
    let count = 0;
    for (const n of milestoneDayCounts()) {
      const date = addDays(start, n - 1);
      if (date < today) continue;
      out.push(make('days', n, date, `${formatNumber(n)} días`));
      if (++count >= limit) break;
    }
  }

  // Mes desde el que conviene empezar a buscar (un margen antes de hoy).
  const firstMonth = Math.max(1, monthIndex(mustParse(today)) - monthIndex(mustParse(start)) - 1);

  if (kinds.includes('monthiversary')) {
    let count = 0;
    for (let m = firstMonth; count < limit; m++) {
      if (m % 12 === 0) continue;
      const date = addMonths(start, m);
      if (date < today) continue;
      out.push(make('monthiversary', m, date, monthsLabel(m)));
      count++;
    }
  }

  if (kinds.includes('anniversary')) {
    let count = 0;
    for (let a = Math.max(1, Math.floor(firstMonth / 12)); count < limit; a++) {
      const date = addMonths(start, 12 * a);
      if (date < today) continue;
      out.push(make('anniversary', a, date, yearsLabel(a)));
      count++;
    }
  }

  out.sort((x, y) =>
    x.date === y.date ? KIND_ORDER[x.kind] - KIND_ORDER[y.kind] : x.date < y.date ? -1 : 1,
  );
  return out.slice(0, limit);
}

/** 1284 → "1,284" (es-MX), sin Intl. */
export function formatNumber(n: number): string {
  const abs = String(Math.abs(Math.trunc(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return n < 0 ? `-${abs}` : abs;
}

/** {2,8,16} → "2 años, 8 meses y 16 días"; omite ceros. */
export function formatBreakdown(b: { years: number; months: number; days: number }): string {
  const parts: string[] = [];
  if (b.years > 0) parts.push(b.years === 1 ? '1 año' : `${formatNumber(b.years)} años`);
  if (b.months > 0) parts.push(b.months === 1 ? '1 mes' : `${formatNumber(b.months)} meses`);
  if (b.days > 0) parts.push(b.days === 1 ? '1 día' : `${formatNumber(b.days)} días`);
  if (parts.length <= 1) return parts[0] ?? '';
  return `${parts.slice(0, -1).join(', ')} y ${parts[parts.length - 1]}`;
}

/** 0 → "hoy", 1 → "mañana", n → "en n días". */
export function formatDaysUntil(n: number): string {
  if (n === 0) return 'hoy';
  if (n === 1) return 'mañana';
  return `en ${formatNumber(n)} días`;
}
