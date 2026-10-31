// Servicio de ubicación de "Distancia": permisos, lectura aproximada y envío con throttle.
// Solo Android. Nunca pide permisos por su cuenta: `requestForeground`/`requestBackground` los
// llama la pantalla Distancia cuando la persona activa la función.
import * as Location from 'expo-location';
import { Platform } from 'react-native';

import { approxPoint, cityFromGeocode, shouldSendLocation, type ShareMode } from '@/lib/distance';
import type { LatLng } from '@/lib/geo';

import { clearMyLocation, setMyLocation } from './api';
import { readLastSent, writeLastSent, writeShareMode } from './preferences';

export const LOCATION_TASK = 'distance-location-task';
/** Android limita las actualizaciones en segundo plano; con esto pedimos pocas y baratas. */
export const BACKGROUND_INTERVAL_MS = 30 * 60_000;
export const BACKGROUND_DISTANCE_M = 1000;
const POSITION_TIMEOUT_MS = 15_000;
const LAST_KNOWN_MAX_AGE_MS = 30 * 60_000;

export function isLocationSupported(): boolean {
  return Platform.OS === 'android';
}

export type PermissionState = {
  granted: boolean;
  canAskAgain: boolean;
  /** 'undetermined' = aún no se ha pedido. */
  status: 'granted' | 'denied' | 'undetermined';
};

function toState(r: Location.LocationPermissionResponse): PermissionState {
  return {
    granted: r.granted,
    canAskAgain: r.canAskAgain,
    status: r.granted ? 'granted' : r.status === 'undetermined' ? 'undetermined' : 'denied',
  };
}

export async function getForegroundPermission(): Promise<PermissionState> {
  return toState(await Location.getForegroundPermissionsAsync());
}
export async function getBackgroundPermission(): Promise<PermissionState> {
  return toState(await Location.getBackgroundPermissionsAsync());
}
export async function requestForegroundPermission(): Promise<PermissionState> {
  return toState(await Location.requestForegroundPermissionsAsync());
}
/** Solo después de tener el permiso en primer plano. Android manda a Ajustes ("Permitir todo el tiempo"). */
export async function requestBackgroundPermission(): Promise<PermissionState> {
  return toState(await Location.requestBackgroundPermissionsAsync());
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    promise,
    new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

/** Posición aproximada ya redondeada (~1 km). Primero la última conocida; si no, una lectura baja. */
export async function readApproxPosition(): Promise<LatLng | null> {
  try {
    const last = await Location.getLastKnownPositionAsync({ maxAge: LAST_KNOWN_MAX_AGE_MS });
    if (last) return approxPoint({ lat: last.coords.latitude, lng: last.coords.longitude });
    const current = await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }),
      POSITION_TIMEOUT_MS,
    );
    return current
      ? approxPoint({ lat: current.coords.latitude, lng: current.coords.longitude })
      : null;
  } catch {
    return null;
  }
}

/** Nombre de la ciudad (null en web, sin red o sin resultado). */
export async function cityFor(point: LatLng): Promise<string | null> {
  try {
    const results = await Location.reverseGeocodeAsync({
      latitude: point.lat,
      longitude: point.lng,
    });
    return cityFromGeocode(results);
  } catch {
    return null;
  }
}

export type SendResult = 'sent' | 'skipped';

/** Manda `point` al servidor respetando el throttle (salvo `force`). Lanza si el servidor falla. */
export async function sendLocation(
  point: LatLng,
  opts: { now?: number; force?: boolean } = {},
): Promise<SendResult> {
  const now = opts.now ?? Date.now();
  const rounded = approxPoint(point);
  if (!opts.force && !shouldSendLocation(await readLastSent(), rounded, now)) return 'skipped';
  const city = await cityFor(rounded);
  await setMyLocation({ lat: rounded.lat, lng: rounded.lng, city });
  await writeLastSent({ ...rounded, at: now });
  return 'sent';
}

export type ShareNowResult = SendResult | 'no_position';

/** Lee la posición y la manda. Para cuando abres la app o activas el modo. */
export async function shareNow(opts: { force?: boolean } = {}): Promise<ShareNowResult> {
  const point = await readApproxPosition();
  if (!point) return 'no_position';
  return sendLocation(point, opts);
}

// --- Segundo plano ---------------------------------------------------------------------------

export async function isBackgroundRunning(): Promise<boolean> {
  try {
    return await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK);
  } catch {
    return false;
  }
}

/**
 * Actualizaciones de baja frecuencia: precisión baja, ~1 km o 30 min, agrupadas. Sin servicio en
 * primer plano (no hay notificación fija); Android decide cuándo entregarlas.
 */
export async function startBackground(): Promise<void> {
  if (await isBackgroundRunning()) return;
  await Location.startLocationUpdatesAsync(LOCATION_TASK, {
    accuracy: Location.Accuracy.Low,
    distanceInterval: BACKGROUND_DISTANCE_M,
    timeInterval: BACKGROUND_INTERVAL_MS,
    deferredUpdatesDistance: BACKGROUND_DISTANCE_M,
    deferredUpdatesInterval: BACKGROUND_INTERVAL_MS,
    pausesUpdatesAutomatically: true,
  });
}

export async function stopBackground(): Promise<void> {
  try {
    if (await isBackgroundRunning()) await Location.stopLocationUpdatesAsync(LOCATION_TASK);
  } catch {
    // ya estaba detenida
  }
}

// --- Cambiar de modo ------------------------------------------------------------------------

export type ApplyModeResult =
  | { ok: true; mode: ShareMode; position: boolean }
  | {
      ok: false;
      reason: 'unsupported' | 'denied' | 'background_denied';
      /** Modo que quedó guardado (p. ej. 'foreground' si falló solo el de segundo plano). */
      mode: ShareMode;
      canAskAgain: boolean;
    };

/**
 * Cambia el modo de compartir. `off` detiene la tarea y borra la fila del servidor (lanza si no
 * se pudo borrar, sin cambiar el modo guardado). `foreground`/`background` piden permiso aquí (la
 * persona ya lo eligió) y mandan la ubicación enseguida.
 */
export async function applyShareMode(userId: string, mode: ShareMode): Promise<ApplyModeResult> {
  if (!isLocationSupported()) {
    return { ok: false, reason: 'unsupported', mode: 'off', canAskAgain: false };
  }

  if (mode === 'off') {
    await stopBackground();
    await clearMyLocation();
    await writeShareMode(userId, 'off');
    return { ok: true, mode: 'off', position: false };
  }

  let fg = await getForegroundPermission();
  if (!fg.granted) fg = await requestForegroundPermission();
  if (!fg.granted) {
    return { ok: false, reason: 'denied', mode: 'off', canAskAgain: fg.canAskAgain };
  }

  let finalMode: ShareMode = mode;
  let bgFailure: ApplyModeResult | null = null;
  if (mode === 'background') {
    let bg = await getBackgroundPermission();
    if (!bg.granted) bg = await requestBackgroundPermission();
    if (bg.granted) {
      await startBackground();
    } else {
      finalMode = 'foreground';
      bgFailure = {
        ok: false,
        reason: 'background_denied',
        mode: 'foreground',
        canAskAgain: bg.canAskAgain,
      };
    }
  }
  if (finalMode === 'foreground') await stopBackground();

  await writeShareMode(userId, finalMode);
  const result = await shareNow({ force: true });
  return bgFailure ?? { ok: true, mode: finalMode, position: result !== 'no_position' };
}
