export const DEFAULT_TIME_ZONE = 'America/Mexico_City';

/** Zona horaria del celular; si no se puede saber, Ciudad de México. */
export function detectTimeZone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (typeof tz === 'string' && tz.includes('/')) return tz;
  } catch {
    // sin Intl: se usa el valor por omisión
  }
  return DEFAULT_TIME_ZONE;
}

/** Nombre corto y legible de una zona IANA. */
export function timeZoneLabel(tz: string): string {
  if (tz === 'America/Mexico_City') return 'Ciudad de México';
  const last = tz.split('/').pop() ?? tz;
  return last.replace(/_/g, ' ');
}
