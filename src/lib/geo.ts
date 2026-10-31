// Geometría pura para el mapa de las memorias: agrupar pines cercanos, encuadrar regiones y
// proyectar puntos al "mapa de papel" (sin Google Maps).

export type LatLng = { lat: number; lng: number };

/** Misma forma que la región de react-native-maps. */
export type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export type Cluster<T> = { id: string; lat: number; lng: number; items: T[] };

/** México completo: vista inicial cuando no hay memorias con lugar. */
export const MEXICO_REGION: Region = {
  latitude: 23.6,
  longitude: -102.5,
  latitudeDelta: 20,
  longitudeDelta: 20,
};

const SINGLE_POINT_DELTA = 0.05;
const MIN_DELTA = 0.002;
const MAX_LAT = 85.0511;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Coordenadas web-mercator normalizadas a 0..1 (x hacia el este, y hacia el sur). */
function mercator(lat: number, lng: number): { x: number; y: number } {
  const x = (lng + 180) / 360;
  const sin = Math.sin((clamp(lat, -MAX_LAT, MAX_LAT) * Math.PI) / 180);
  const y = 0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI);
  return { x, y };
}

/**
 * Agrupa puntos que caen en la misma celda de `cellPx` píxeles según la región visible
 * (proyección web-mercator; el ancho del mundo en píxeles sale de `width / longitudeDelta`).
 * El centro de cada grupo es el promedio de sus puntos; un grupo de un solo punto conserva su id.
 */
export function clusterPoints<T extends LatLng & { id: string }>(
  points: readonly T[],
  region: Region,
  opts: { width: number; height: number; cellPx?: number },
): Cluster<T>[] {
  const cellPx = opts.cellPx ?? 64;
  const lonDelta = Math.max(Math.abs(region.longitudeDelta), 1e-9);
  const worldPx = (Math.max(opts.width, 1) * 360) / lonDelta;
  const cells = new Map<string, T[]>();
  for (const point of points) {
    const m = mercator(point.lat, point.lng);
    const key = `${Math.floor((m.x * worldPx) / cellPx)}:${Math.floor((m.y * worldPx) / cellPx)}`;
    const list = cells.get(key);
    if (list) list.push(point);
    else cells.set(key, [point]);
  }
  return [...cells.values()].map((items) => {
    const lat = items.reduce((sum, p) => sum + p.lat, 0) / items.length;
    const lng = items.reduce((sum, p) => sum + p.lng, 0) / items.length;
    return {
      id: items.length === 1 ? items[0].id : `cluster:${items.map((p) => p.id).join('|')}`,
      lat,
      lng,
      items,
    };
  });
}

/** Región que encuadra todos los puntos con un margen (`paddingFactor`). */
export function regionForPoints(points: readonly LatLng[], paddingFactor = 1.4): Region {
  if (points.length === 0) return { ...MEXICO_REGION };
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const p of points) {
    minLat = Math.min(minLat, p.lat);
    maxLat = Math.max(maxLat, p.lat);
    minLng = Math.min(minLng, p.lng);
    maxLng = Math.max(maxLng, p.lng);
  }
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: clamp((maxLat - minLat) * paddingFactor, SINGLE_POINT_DELTA, 170),
    longitudeDelta: clamp((maxLng - minLng) * paddingFactor, SINGLE_POINT_DELTA, 350),
  };
}

/** Región para acercar a un grupo: encuadra sus puntos y siempre se acerca respecto a `region`. */
export function zoomInRegion(
  cluster: Cluster<LatLng> | { items: LatLng[] },
  region: Region,
): Region {
  const fit = regionForPoints(cluster.items, 1.5);
  const half = (d: number) => Math.max(d / 2, MIN_DELTA);
  return {
    latitude: fit.latitude,
    longitude: fit.longitude,
    latitudeDelta: Math.min(fit.latitudeDelta, half(region.latitudeDelta)),
    longitudeDelta: Math.min(fit.longitudeDelta, half(region.longitudeDelta)),
  };
}

/**
 * Proyección equirrectangular al "mapa de papel": encuadra los puntos (con `padding` px) dentro de
 * `box` conservando la proporción (corrige la longitud con cos(lat)) y centrados. Devuelve las
 * posiciones en el mismo orden que `points`.
 */
export function projectEquirect(
  points: readonly LatLng[],
  box: { width: number; height: number; padding?: number },
): { x: number; y: number }[] {
  if (points.length === 0) return [];
  const padding = box.padding ?? 0;
  const innerW = Math.max(box.width - padding * 2, 1);
  const innerH = Math.max(box.height - padding * 2, 1);
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const cos = Math.max(Math.cos((((maxLat + Math.min(...lats)) / 2) * Math.PI) / 180), 0.01);
  const spanLat = maxLat - Math.min(...lats);
  const spanLng = (Math.max(...lngs) - minLng) * cos;
  // Un solo punto (o varios idénticos) cae al centro.
  if (spanLat === 0 && spanLng === 0) {
    return points.map(() => ({ x: box.width / 2, y: box.height / 2 }));
  }
  const scale = Math.min(innerW / Math.max(spanLng, 1e-9), innerH / Math.max(spanLat, 1e-9));
  const left = padding + (innerW - spanLng * scale) / 2;
  const top = padding + (innerH - spanLat * scale) / 2;
  return points.map((p) => ({
    x: left + (p.lng - minLng) * cos * scale,
    y: top + (maxLat - p.lat) * scale,
  }));
}

const EARTH_RADIUS_KM = 6371.0088;

/** Distancia en km sobre la esfera (haversine) entre dos puntos. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}
