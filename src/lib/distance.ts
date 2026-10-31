// Lógica pura de "Distancia" (Fase 8, RF-20): une las ubicaciones de la pareja, da formato a los
// kilómetros y decide cuándo vale la pena mandar la ubicación al servidor. Sin I/O.
import { formatNumber } from './dates';
import { haversineKm, type LatLng } from './geo';
import { formatAgo, type SnapshotDistance, type SnapshotPlace } from './widgets';

/** Forma mínima de una fila de `locations` (la tabla guarda solo la última de cada quien). */
export type LocationRowLike = {
  user_id: string;
  lat: number;
  lng: number;
  city: string | null;
  updated_at: string;
};

/** Cómo comparte cada quien (preferencia local del celular). */
export type ShareMode = 'off' | 'foreground' | 'background';
export const SHARE_MODES: readonly ShareMode[] = ['off', 'foreground', 'background'];

export function isShareMode(value: unknown): value is ShareMode {
  return typeof value === 'string' && (SHARE_MODES as readonly string[]).includes(value);
}

/** Tiempo mínimo entre envíos si no te moviste, y distancia que cuenta como "te moviste". */
export const MIN_SEND_INTERVAL_MS = 10 * 60_000;
export const MIN_MOVE_KM = 1;
export const CITY_MAX_LENGTH = 80;

/** Redondea a 2 decimales (~1 km): lo mismo que hace el servidor, para ni siquiera mandar más. */
export function approxCoord(value: number): number {
  return Math.round(value * 100) / 100;
}

export function approxPoint(point: LatLng): LatLng {
  return { lat: approxCoord(point.lat), lng: approxCoord(point.lng) };
}

function placeOf(row: LocationRowLike | undefined): SnapshotPlace {
  return row ? { city: row.city?.trim() || null, at: row.updated_at } : null;
}

/**
 * Snapshot de distancia para los widgets. `km` solo existe si los dos comparten; null si nadie
 * comparte (no hay nada que mostrar).
 */
export function snapshotDistance(
  rows: readonly LocationRowLike[],
  meId: string | null | undefined,
  partnerId: string | null | undefined,
): SnapshotDistance | null {
  const mine = meId ? rows.find((r) => r.user_id === meId) : undefined;
  const theirs = partnerId ? rows.find((r) => r.user_id === partnerId) : undefined;
  if (!mine && !theirs) return null;
  const km =
    mine && theirs
      ? haversineKm({ lat: mine.lat, lng: mine.lng }, { lat: theirs.lat, lng: theirs.lng })
      : null;
  return { me: placeOf(mine), partner: placeOf(theirs), km };
}

/**
 * "menos de 1 km", "12.5 km" (menos de 100 km, un decimal), "707 km", "1,240 km".
 * Vacío si no hay dato.
 */
export function formatKm(km: number | null | undefined): string {
  if (km == null || !Number.isFinite(km) || km < 0) return '';
  if (km < 1) return 'menos de 1 km';
  if (km < 100) {
    const tenths = Math.round(km * 10) / 10;
    if (tenths < 100) {
      return `${Number.isInteger(tenths) ? tenths : tenths.toFixed(1)} km`;
    }
  }
  return `${formatNumber(Math.round(km))} km`;
}

/** Versión para lectores de pantalla: "kilómetros" completo en lugar de "km". */
export function spokenKm(km: number | null | undefined): string {
  const text = formatKm(km);
  if (!text) return '';
  return text.replace(/ km$/, text === 'menos de 1 km' ? ' kilómetro' : ' kilómetros');
}

/** Frase de "qué tan lejos", con humor tierno. */
export function distancePhrase(km: number | null | undefined): string {
  if (km == null || !Number.isFinite(km) || km < 0) return '';
  if (km < 1) return 'Casi se escuchan respirar.';
  if (km < 10) return 'A un café de distancia.';
  if (km < 100) return 'Una escapadita y ya.';
  if (km < 500) return 'Unas horas de carretera y se abrazan.';
  if (km < 1500) return 'Un vuelo cortito los separa.';
  if (km < 5000) return 'Lejos en el mapa, cerquita en todo lo demás.';
  return 'Medio mundo de por medio, y aun así aquí están.';
}

export type DistanceKind = 'both' | 'only_me' | 'only_partner' | 'none';

export type DistanceView = {
  kind: DistanceKind;
  km: number | null;
  kmText: string;
  phrase: string;
  myCity: string | null;
  partnerCity: string | null;
  /** "hace 2 h" de la última ubicación de tu pareja ('' si no comparte). */
  partnerAgo: string;
  /** "Ciudad A ↔ Ciudad B" cuando se conocen las dos ciudades. */
  route: string;
};

/** Lo que ve la UI (pantalla, tarjeta de Inicio) a partir de las filas de la pareja. */
export function distanceView(
  rows: readonly LocationRowLike[],
  meId: string | null | undefined,
  partnerId: string | null | undefined,
  now: Date = new Date(),
): DistanceView {
  const snap = snapshotDistance(rows, meId, partnerId);
  const kind: DistanceKind = !snap
    ? 'none'
    : snap.me && snap.partner
      ? 'both'
      : snap.me
        ? 'only_me'
        : 'only_partner';
  const myCity = snap?.me?.city ?? null;
  const partnerCity = snap?.partner?.city ?? null;
  return {
    kind,
    km: snap?.km ?? null,
    kmText: formatKm(snap?.km),
    phrase: distancePhrase(snap?.km),
    myCity,
    partnerCity,
    partnerAgo: snap?.partner ? formatAgo(snap.partner.at, now) : '',
    route: myCity && partnerCity ? `${myCity} ↔ ${partnerCity}` : '',
  };
}

export type SentLocation = LatLng & { at: number };

/**
 * Throttle del envío: se manda si nunca se ha mandado, si pasaron al menos 10 minutos (para
 * refrescar el "hace cuánto") o si te moviste más de 1 km. Si pasó menos de 10 min y no te moviste,
 * no se manda.
 */
export function shouldSendLocation(
  prev: SentLocation | null | undefined,
  next: LatLng,
  now: number,
): boolean {
  if (!prev) return true;
  const elapsed = now - prev.at;
  if (!Number.isFinite(elapsed) || elapsed < 0 || elapsed >= MIN_SEND_INTERVAL_MS) return true;
  return haversineKm(prev, next) > MIN_MOVE_KM;
}

export type GeocodeLike = {
  city?: string | null;
  subregion?: string | null;
  region?: string | null;
};

/** Ciudad a partir del resultado de `reverseGeocodeAsync`: city ?? subregion ?? region. */
export function cityFromGeocode(results: readonly GeocodeLike[] | null | undefined): string | null {
  for (const r of results ?? []) {
    const name = [r.city, r.subregion, r.region].find((v) => typeof v === 'string' && v.trim());
    if (name) return name.trim().slice(0, CITY_MAX_LENGTH);
  }
  return null;
}
