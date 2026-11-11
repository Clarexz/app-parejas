import { todayIn, type IsoDate } from './dates';
import { DEFAULT_TIME_ZONE } from './timezone';

/** Hora local de `now` en `timeZone` como milisegundos "de reloj de pared"; null si la zona no es válida. */
function wallClockMs(timeZone: string, now: Date): number | null {
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const parts = fmt.formatToParts(now);
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
    const ms = Date.UTC(
      get('year'),
      get('month') - 1,
      get('day'),
      get('hour') % 24,
      get('minute'),
      get('second'),
    );
    return Number.isNaN(ms) ? null : ms;
  } catch {
    return null;
  }
}

/**
 * Zona que decide "el día" de la pareja: la que va más atrás (la de menor fecha y hora local en
 * `now`). Las zonas nulas o inválidas usan `fallback` (`couples.timezone`); si ese tampoco sirve,
 * Ciudad de México. Es la misma regla que aplica el servidor.
 */
export function coupleDayZone(
  zones: readonly (string | null | undefined)[],
  fallback: string,
  now: Date = new Date(),
): string {
  const safeFallback = wallClockMs(fallback, now) === null ? DEFAULT_TIME_ZONE : fallback;
  const candidates = zones.length === 0 ? [safeFallback] : zones;
  let best = safeFallback;
  let bestMs = Infinity;
  for (const zone of candidates) {
    const tz = zone && wallClockMs(zone, now) !== null ? zone : safeFallback;
    const ms = wallClockMs(tz, now) ?? Infinity;
    if (ms < bestMs) {
      best = tz;
      bestMs = ms;
    }
  }
  return best;
}

/** "Hoy" de la pareja: el día en la zona que va más atrás. */
export function coupleToday(
  zones: readonly (string | null | undefined)[],
  fallback: string,
  now: Date = new Date(),
): IsoDate {
  return todayIn(coupleDayZone(zones, fallback, now), now);
}
