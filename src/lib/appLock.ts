// Lógica pura del bloqueo con huella (Fase 12). Sin React ni módulos nativos.

export type AppLockTimeout = 'immediate' | '1m' | '5m';

export const APP_LOCK_TIMEOUTS: readonly AppLockTimeout[] = ['immediate', '1m', '5m'];

export function isAppLockTimeout(value: unknown): value is AppLockTimeout {
  return typeof value === 'string' && (APP_LOCK_TIMEOUTS as readonly string[]).includes(value);
}

/**
 * Con "Al salir" no bloquea cualquier ida a segundo plano: el selector de fotos, el permiso del
 * sistema o la huella misma sacan la app de primer plano un instante. Solo bloquea si pasó más de
 * este margen.
 */
export const IMMEDIATE_GRACE_MS = 2_000;

const LIMIT_MS: Record<AppLockTimeout, number> = {
  immediate: IMMEDIATE_GRACE_MS,
  '1m': 60_000,
  '5m': 300_000,
};

export type ShouldLockInput = {
  enabled: boolean;
  timeout: AppLockTimeout;
  /** Marca de tiempo (ms) en que la app pasó a segundo plano; `null` si no se fue. */
  backgroundedAt: number | null;
  now: number;
  /** Primer arranque del proceso: con el bloqueo activo siempre se pide desbloquear. */
  coldStart: boolean;
};

/** ¿Hay que pedir desbloqueo ahora? */
export function shouldLock({
  enabled,
  timeout,
  backgroundedAt,
  now,
  coldStart,
}: ShouldLockInput): boolean {
  if (!enabled) return false;
  if (coldStart) return true;
  if (backgroundedAt === null) return false;
  const elapsed = now - backgroundedAt;
  return timeout === 'immediate' ? elapsed > LIMIT_MS.immediate : elapsed >= LIMIT_MS[timeout];
}

const LABELS: Record<AppLockTimeout, string> = {
  immediate: 'Al salir',
  '1m': '1 minuto',
  '5m': '5 minutos',
};

export function timeoutLabel(timeout: AppLockTimeout): string {
  return LABELS[timeout];
}
