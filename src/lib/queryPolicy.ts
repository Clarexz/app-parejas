/** Política de la caché de TanStack Query: qué se guarda en disco y cuándo se reintenta. */

/**
 * Segmentos de llave que nunca se guardan en disco: URLs firmadas que caducan (avatares, stories,
 * fotos de memorias, audio) y estado que solo vale en vivo (salud del servidor, actualizaciones,
 * permiso de ubicación). Se busca en cualquier posición de la llave.
 */
export const NON_PERSISTED_KEYS: readonly string[] = [
  'signed-url',
  'signed-urls',
  'media',
  'urls',
  'audio',
  'server-health',
  'app-update',
  'distance-permission',
];

type QueryLike = {
  queryKey: readonly unknown[];
  state: { status: string };
};

/** Solo se persisten consultas exitosas y cuya llave no está en `NON_PERSISTED_KEYS`. */
export function shouldPersistQuery(query: QueryLike): boolean {
  if (query.state.status !== 'success') return false;
  return !query.queryKey.some(
    (part) => typeof part === 'string' && NON_PERSISTED_KEYS.includes(part),
  );
}

export const MAX_RETRIES = 3;

/**
 * Los errores de negocio (RPC con `P0001`, códigos de validación/permisos de Postgres) y los 4xx
 * de PostgREST no se arreglan reintentando; los de red y los 5xx sí, hasta `MAX_RETRIES` veces.
 */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_RETRIES) return false;
  if (error == null || typeof error !== 'object') return true;
  const e = error as { code?: unknown; status?: unknown };
  if (typeof e.code === 'string') {
    // P0001: RAISE EXCEPTION de nuestras RPC; 22xxx/23xxx/42xxx: datos, restricciones, permisos;
    // PGRST*: errores de PostgREST (petición mal formada, fila no encontrada...).
    if (e.code === 'P0001' || /^(22|23|42)/.test(e.code) || e.code.startsWith('PGRST')) {
      return false;
    }
    // Códigos en minúsculas de Auth (invalid_credentials...) y de nuestras RPC.
    if (/^[a-z][a-z0-9_]+$/.test(e.code)) return false;
  }
  if (typeof e.status === 'number' && e.status >= 400 && e.status < 500) return false;
  return true;
}

/** Espera exponencial (1 s, 2 s, 4 s...) con tope de 10 s. */
export function retryDelay(attemptIndex: number): number {
  return Math.min(1000 * 2 ** attemptIndex, 10_000);
}
