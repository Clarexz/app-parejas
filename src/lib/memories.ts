// Lógica pura de las memorias (Fase 7): validación, agrupado, "un día como hoy", reordenar fotos
// en una rejilla y lectura de ubicación/fecha del EXIF de las fotos.

import { addDays, daysInMonth, isLeapYear, parseIsoDate } from './dates';
import { MONTH_NAMES } from './dateParts';

export const MEMORY_TITLE_MAX = 80;
export const MEMORY_BODY_MAX = 2000;
export const MEMORY_PLACE_MAX = 80;
export const MEMORY_PHOTOS_MAX = 10;
/** Fecha mínima aceptada para una memoria (igual que la base de datos). */
export const MEMORY_MIN_DATE = '1900-01-01';

/** Rutas en el bucket: `<pareja>/<usuario>/<id>.jpg` y su miniatura `_thumb.jpg`. */
export function memoryPhotoPaths(
  coupleId: string,
  userId: string,
  fileId: string,
): { path: string; thumb: string } {
  const base = `${coupleId}/${userId}/${fileId}`;
  return { path: `${base}.jpg`, thumb: `${base}_thumb.jpg` };
}

// ---------------------------------------------------------------------------
// Validación
// ---------------------------------------------------------------------------

export type MemoryDraft = {
  title: string;
  body?: string | null;
  placeName?: string | null;
  /** Fecha 'YYYY-MM-DD'; null/'' = sin elegir. */
  happenedOn: string | null | undefined;
  photoCount: number;
};

export type MemoryDraftErrors = {
  title?: 'empty' | 'too_long';
  body?: 'too_long';
  place?: 'too_long';
  photos?: 'none' | 'too_many';
  date?: 'invalid' | 'future';
};

/** Errores por campo (null = se puede guardar). `today` es el "hoy" de la pareja. */
export function validateMemoryDraft(draft: MemoryDraft, today: string): MemoryDraftErrors | null {
  const errors: MemoryDraftErrors = {};

  const title = draft.title.trim();
  if (title.length === 0) errors.title = 'empty';
  else if (title.length > MEMORY_TITLE_MAX) errors.title = 'too_long';

  if ((draft.body ?? '').length > MEMORY_BODY_MAX) errors.body = 'too_long';
  if ((draft.placeName ?? '').trim().length > MEMORY_PLACE_MAX) errors.place = 'too_long';

  if (draft.photoCount < 1) errors.photos = 'none';
  else if (draft.photoCount > MEMORY_PHOTOS_MAX) errors.photos = 'too_many';

  const date = draft.happenedOn;
  if (!date || !parseIsoDate(date) || date.length !== 10 || date < MEMORY_MIN_DATE) {
    errors.date = 'invalid';
  } else if (parseIsoDate(today) && date > addDays(today, 1)) {
    // Un día de margen por si la zona horaria del celular va adelantada.
    errors.date = 'future';
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

// ---------------------------------------------------------------------------
// Agrupar y "un día como hoy"
// ---------------------------------------------------------------------------

export type MemoryLike = { happened_on: string; created_at: string };

/** Más reciente primero: por fecha del recuerdo y luego por creación. */
function byRecency(a: MemoryLike, b: MemoryLike): number {
  if (a.happened_on !== b.happened_on) return a.happened_on < b.happened_on ? 1 : -1;
  if (a.created_at !== b.created_at) return a.created_at < b.created_at ? 1 : -1;
  return 0;
}

export type MemoryMonthGroup<T> = {
  /** 'YYYY-MM' */
  key: string;
  year: number;
  month: number;
  /** 'octubre 2026' */
  label: string;
  items: T[];
};

/** Agrupa por mes del recuerdo (`happened_on`), meses y memorias de la más reciente a la más vieja. */
export function groupByMonth<T extends MemoryLike>(memories: T[]): MemoryMonthGroup<T>[] {
  const groups: MemoryMonthGroup<T>[] = [];
  const byKey = new Map<string, MemoryMonthGroup<T>>();
  for (const memory of [...memories].sort(byRecency)) {
    const p = parseIsoDate(memory.happened_on);
    if (!p) continue;
    const key = `${String(p.year).padStart(4, '0')}-${String(p.month).padStart(2, '0')}`;
    let group = byKey.get(key);
    if (!group) {
      group = {
        key,
        year: p.year,
        month: p.month,
        label: `${MONTH_NAMES[p.month - 1]} ${p.year}`,
        items: [],
      };
      byKey.set(key, group);
      groups.push(group);
    }
    group.items.push(memory);
  }
  return groups;
}

/**
 * Memorias de este mismo día en años anteriores. Una del 29 de febrero se muestra el 28 de
 * febrero en los años que no son bisiestos. Orden: la más reciente (menos años) primero.
 */
export function onThisDay<T extends MemoryLike>(
  memories: T[],
  todayIso: string,
): { memory: T; yearsAgo: number }[] {
  const today = parseIsoDate(todayIso);
  if (!today) return [];
  const out: { memory: T; yearsAgo: number }[] = [];
  for (const memory of memories) {
    const p = parseIsoDate(memory.happened_on);
    if (!p || p.year >= today.year) continue;
    let matches = p.month === today.month && p.day === today.day;
    if (!matches && p.month === 2 && p.day === 29) {
      matches = !isLeapYear(today.year) && today.month === 2 && today.day === 28;
    }
    if (matches) out.push({ memory, yearsAgo: today.year - p.year });
  }
  return out.sort((a, b) => a.yearsAgo - b.yearsAgo || byRecency(a.memory, b.memory));
}

/** "hace 1 año", "hace 3 años". */
export function memoryAgo(yearsAgo: number): string {
  const n = Math.max(1, Math.round(yearsAgo));
  return n === 1 ? 'hace 1 año' : `hace ${n} años`;
}

/** Texto de la tarjeta de inicio: "Un día como hoy, hace 2 años". */
export function onThisDayLabel(yearsAgo: number): string {
  return `Un día como hoy, ${memoryAgo(yearsAgo)}`;
}

/** "1 foto" / "3 fotos". */
export function photoCountLabel(count: number): string {
  return count === 1 ? '1 foto' : `${count} fotos`;
}

/** "3 memorias" / "1 memoria". */
export function memoryCountLabel(count: number): string {
  return count === 1 ? '1 memoria' : `${count} memorias`;
}

// ---------------------------------------------------------------------------
// Rejilla reordenable (arrastrar y soltar)
// ---------------------------------------------------------------------------

/** Copia de `list` con el elemento `from` movido a la posición `to` (índices fuera de rango se acotan). */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const out = [...list];
  if (out.length === 0 || from < 0 || from >= out.length) return out;
  const target = Math.min(Math.max(to, 0), out.length - 1);
  if (target === from) return out;
  const [item] = out.splice(from, 1);
  out.splice(target, 0, item);
  return out;
}

export type GridSpec = {
  columns: number;
  cellWidth: number;
  cellHeight: number;
  /** Cuántas celdas hay (el índice se acota a 0..count-1). */
  count: number;
};

/** Índice de la celda que contiene el punto (x, y) medido desde la esquina de la rejilla. */
export function indexFromOffset(x: number, y: number, grid: GridSpec): number {
  const { columns, cellWidth, cellHeight, count } = grid;
  if (count <= 0 || columns <= 0 || cellWidth <= 0 || cellHeight <= 0) return 0;
  const col = Math.min(Math.max(Math.floor(x / cellWidth), 0), columns - 1);
  const maxRow = Math.floor((count - 1) / columns);
  const row = Math.min(Math.max(Math.floor(y / cellHeight), 0), maxRow);
  return Math.min(row * columns + col, count - 1);
}

/** Esquina superior izquierda de la celda `index`. */
export function offsetFromIndex(
  index: number,
  grid: Pick<GridSpec, 'columns' | 'cellWidth' | 'cellHeight'>,
): { x: number; y: number } {
  const col = index % grid.columns;
  const row = Math.floor(index / grid.columns);
  return { x: col * grid.cellWidth, y: row * grid.cellHeight };
}

// ---------------------------------------------------------------------------
// EXIF
// ---------------------------------------------------------------------------

type Exif = Record<string, unknown> | null | undefined;

/** Número desde un número, "12.5" o un racional "41/1". */
function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const text = value.trim();
  const m = /^(-?\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/.exec(text);
  if (m) {
    const den = Number(m[2]);
    return den === 0 ? null : Number(m[1]) / den;
  }
  if (!/^-?\d+(?:\.\d+)?$/.test(text)) return null;
  return Number(text);
}

/** Grados decimales desde un número, un racional, un array [g, m, s] o "41/1,24/1,0/1". */
function toDegrees(value: unknown): number | null {
  const parts = typeof value === 'string' && value.includes(',') ? value.split(',') : value;
  if (Array.isArray(parts)) {
    if (parts.length === 0 || parts.length > 3) return null;
    const nums = parts.map(toNumber);
    if (nums.some((n) => n === null)) return null;
    const [d, m = 0, s = 0] = nums as number[];
    return Math.abs(d) + m / 60 + s / 3600;
  }
  return toNumber(parts);
}

function signed(value: unknown, ref: unknown, negativeRef: string, positiveRef: string) {
  const degrees = toDegrees(value);
  if (degrees === null) return null;
  const r = typeof ref === 'string' ? ref.trim().toUpperCase() : '';
  if (r === negativeRef) return -Math.abs(degrees);
  if (r === positiveRef) return Math.abs(degrees);
  // Sin referencia (o desconocida): se respeta el signo que ya traiga el número.
  return degrees;
}

/** Ubicación (lat/lng decimales) del EXIF de una foto, o null si no hay o no es válida. */
export function exifLocation(exif: Exif): { lat: number; lng: number } | null {
  if (!exif || typeof exif !== 'object') return null;
  const lat = signed(exif.GPSLatitude, exif.GPSLatitudeRef, 'S', 'N');
  const lng = signed(exif.GPSLongitude, exif.GPSLongitudeRef, 'W', 'E');
  if (lat === null || lng === null) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  // (0, 0) es lo que escriben muchas cámaras cuando no hubo fix de GPS.
  if (lat === 0 && lng === 0) return null;
  return { lat, lng };
}

/** Fecha 'YYYY-MM-DD' de cuando se tomó la foto ("2024:05:01 18:22:10"), o null. */
export function exifDate(exif: Exif): string | null {
  if (!exif || typeof exif !== 'object') return null;
  for (const key of ['DateTimeOriginal', 'DateTimeDigitized', 'DateTime']) {
    const raw = exif[key];
    if (typeof raw !== 'string') continue;
    const m = /^\s*(\d{4})[:\-/](\d{2})[:\-/](\d{2})(?:[ T]|$)/.exec(raw);
    if (!m) continue;
    const year = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);
    if (year < 1900 || month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
      continue;
    }
    return `${m[1]}-${m[2]}-${m[3]}`;
  }
  return null;
}
