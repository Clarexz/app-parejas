// Formas de los widgets 1×1 con vidrio simulado (docs/DISENO.md §9, manual de marca §09–10).
// Cadenas SVG puras, sin React; geometría y estilo copiados de `docs/design/ahorita-prototipo.html`
// (`wDays`, `wMood`, `wNext`, `wDist`, `wStory`, `wStreak`, `glass`, `glassDefs`).
// Las dibuja `SvgWidget` (AndroidSVG), así que se evita `paint-order`, `rgba()` y `href` sin
// espacio de nombres: el dato va aparte, en un `TextWidget` con sombra.
import { FRUITS, type FruitKey } from '@/lib/fruits';

/** Lienzo de las formas: 100×100 con 2 de margen para el contorno oscuro. */
const VIEWBOX = '-2 -2 104 104';

export type WidgetShapeOptions = {
  /** Fruta de cada quien (tú / tu pareja). */
  me: FruitKey;
  partner: FruitKey;
  /** Vidrio más opaco en modo oscuro. */
  dark: boolean;
  /** Tamaño en dp del cuadrado de la forma. */
  size: number;
  /** Sufijo para los ids de degradados y recortes (únicos por SVG). */
  id?: string;
};

export type MoodFace = 'smile' | 'flat' | 'frown';

const hex = (key: FruitKey): string => FRUITS[key].hex;

const WHITE = '#FFFFFF';

/** Degradados del vidrio: brillo del cuerpo (`s`) y del borde (`r`). */
export function glassDefs(id: string, dark: boolean): string {
  const top = dark ? 0.4 : 0.62;
  return (
    `<linearGradient id="s${id}" x1="0" y1="0" x2="0.6" y2="1">` +
    `<stop offset="0" stop-color="${WHITE}" stop-opacity="${top}"/>` +
    `<stop offset="0.55" stop-color="${WHITE}" stop-opacity="0.14"/>` +
    `<stop offset="1" stop-color="${WHITE}" stop-opacity="0.28"/></linearGradient>` +
    `<linearGradient id="r${id}" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${WHITE}" stop-opacity="0.95"/>` +
    `<stop offset="0.5" stop-color="${WHITE}" stop-opacity="0.25"/>` +
    `<stop offset="1" stop-color="${WHITE}" stop-opacity="0.7"/></linearGradient>`
  );
}

/**
 * Una pieza de vidrio: contorno negro 24 % de 4, relleno de fruta (80 %; 90 % en oscuro),
 * degradado blanco y borde con brillo de 1.8. `clip` es el id de un `clipPath` opcional.
 */
export function glass(d: string, fill: string, id: string, dark: boolean, clip = ''): string {
  const cp = clip ? ` clip-path="url(#${clip})"` : '';
  const opacity = dark ? 0.9 : 0.8;
  return (
    `<path d="${d}" fill="none" stroke="#000000" stroke-opacity="0.24" stroke-width="4"${cp}/>` +
    `<path d="${d}" fill="${fill}" fill-opacity="${opacity}"${cp}/>` +
    `<path d="${d}" fill="url(#s${id})"${cp}/>` +
    `<path d="${d}" fill="none" stroke="url(#r${id})" stroke-width="1.8"${cp}/>`
  );
}

function wrap(o: WidgetShapeOptions, defs: string, inner: string): string {
  const px = Math.max(1, Math.round(o.size));
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ` +
    `width="${px}" height="${px}" viewBox="${VIEWBOX}">` +
    `<defs>${defs}</defs>${inner}</svg>`
  );
}

const idOf = (o: WidgetShapeOptions, base: string): string => `${base}${o.id ?? ''}`;

/** Círculo como trazo `path` (para poder darle vidrio). */
const circle = (cx: number, cy: number, r: number): string =>
  `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0Z`;

// ---------------------------------------------------------------------------
// Días juntos: corazón partido (mitad izquierda tu pareja, derecha tú).
// ---------------------------------------------------------------------------

const HEART =
  'M50 90 C18 68 8 48 8 32 C8 18 19 8 32 8 C40 8 47 12 50 19 C53 12 60 8 68 8 C81 8 92 18 92 32 C92 48 82 68 50 90 Z';

export function daysShapeSvg(o: WidgetShapeOptions): string {
  const id = idOf(o, 'd');
  const defs =
    glassDefs(id, o.dark) +
    `<clipPath id="cl${id}"><rect x="0" y="0" width="47.5" height="100"/></clipPath>` +
    `<clipPath id="cr${id}"><rect x="52.5" y="0" width="47.5" height="100"/></clipPath>`;
  return wrap(
    o,
    defs,
    glass(HEART, hex(o.partner), id, o.dark, `cl${id}`) +
      glass(HEART, hex(o.me), id, o.dark, `cr${id}`),
  );
}

// ---------------------------------------------------------------------------
// Mood de tu pareja: burbuja de diálogo en su fruta con carita.
// ---------------------------------------------------------------------------

const BUBBLE =
  'M36 8 H64 A28 28 0 0 1 92 36 V44 A28 28 0 0 1 64 72 H44 L24 90 L26 71 A28 28 0 0 1 8 44 V36 A28 28 0 0 1 36 8 Z';

const MOUTH: Record<MoodFace, string> = {
  smile: 'M36 48 Q50 61 64 48',
  flat: 'M38 53 H62',
  frown: 'M36 58 Q50 45 64 58',
};

export function moodShapeSvg(o: WidgetShapeOptions & { face?: MoodFace }): string {
  const id = idOf(o, 'm');
  return wrap(
    o,
    glassDefs(id, o.dark),
    glass(BUBBLE, hex(o.partner), id, o.dark) +
      `<circle cx="38" cy="36" r="4.6" fill="${WHITE}"/><circle cx="62" cy="36" r="4.6" fill="${WHITE}"/>` +
      `<path d="${MOUTH[o.face ?? 'smile']}" fill="none" stroke="${WHITE}" stroke-width="4.2" stroke-linecap="round"/>`,
  );
}

// ---------------------------------------------------------------------------
// La próxima vez: media luna de tu fruta que se llena con la de tu pareja.
// ---------------------------------------------------------------------------

const MOON = 'M6 76 A44 44 0 0 1 94 76 Z';
const MOON_BASE = 76;
const MOON_RADIUS = 44;

/** Nivel de llenado (0 a 1) con el que se dibuja la media luna. */
export const clampProgress = (p: number): number =>
  Number.isFinite(p) ? Math.min(1, Math.max(0, p)) : 0.5;

/** Coordenada Y del borde superior del llenado. */
export const fillTop = (progress: number): number =>
  MOON_BASE - MOON_RADIUS * clampProgress(progress);

export function nextShapeSvg(o: WidgetShapeOptions & { progress: number }): string {
  const id = idOf(o, 'n');
  const top = fillTop(o.progress);
  const height = MOON_BASE - top + 2;
  const defs = glassDefs(id, o.dark) + `<clipPath id="cd${id}"><path d="${MOON}"/></clipPath>`;
  const rect = `x="0" y="${top}" width="100" height="${height}"`;
  const fill =
    `<g clip-path="url(#cd${id})">` +
    `<rect ${rect} fill="${hex(o.partner)}" fill-opacity="0.85"/>` +
    `<rect ${rect} fill="url(#s${id})"/></g>`;
  return wrap(
    o,
    defs,
    glass(MOON, hex(o.me), id, o.dark) +
      fill +
      `<path d="${MOON}" fill="none" stroke="url(#r${id})" stroke-width="1.8"/>` +
      `<path d="M2 80 H98" stroke="${WHITE}" stroke-width="3.5" stroke-linecap="round"/>`,
  );
}

// ---------------------------------------------------------------------------
// Distancia: dos círculos, más juntos mientras más cerca.
// ---------------------------------------------------------------------------

const DIST_R = 22;
const DIST_NEAR = 36;
const DIST_FAR = 56;
const DIST_CAP_KM = 3000;

/** Separación de los centros: de 36 (0 km) a 56 (3,000 km o más), en escala logarítmica. */
export function distanceSeparation(km: number | null | undefined): number {
  if (km == null || !Number.isFinite(km) || km < 0) return DIST_FAR - 4;
  const t = Math.min(1, Math.log10(1 + km) / Math.log10(1 + DIST_CAP_KM));
  return DIST_NEAR + (DIST_FAR - DIST_NEAR) * t;
}

export function distShapeSvg(o: WidgetShapeOptions & { km: number | null }): string {
  const id = idOf(o, 'k');
  const sep = distanceSeparation(o.km);
  const ax = 50 - sep / 2;
  const bx = 50 + sep / 2;
  const cy = 52;
  return wrap(
    o,
    glassDefs(id, o.dark),
    glass(circle(ax, cy, DIST_R), hex(o.me), id, o.dark) +
      glass(circle(bx, cy, DIST_R), hex(o.partner), id, o.dark) +
      `<path d="M${ax} ${cy - 28} Q50 ${cy - 50} ${bx} ${cy - 28}" fill="none" stroke="${WHITE}" ` +
      `stroke-width="3.6" stroke-linecap="round" stroke-dasharray="0.1 7"/>`,
  );
}

// ---------------------------------------------------------------------------
// Story de tu pareja: foto en círculo con aro de las dos frutas y punto si hay nueva.
// ---------------------------------------------------------------------------

export function storyShapeSvg(
  o: WidgetShapeOptions & { photo: string | null; dot: boolean },
): string {
  const id = idOf(o, 's');
  const defs =
    glassDefs(id, o.dark) +
    `<linearGradient id="g${id}" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${hex(o.partner)}"/><stop offset="1" stop-color="${hex(o.me)}"/>` +
    `</linearGradient><clipPath id="cs${id}"><circle cx="50" cy="50" r="33"/></clipPath>`;
  // Sin foto el círculo queda como vidrio de la fruta de tu pareja.
  const inner = o.photo
    ? `<image xlink:href="${o.photo}" x="17" y="17" width="66" height="66" ` +
      `preserveAspectRatio="xMidYMid slice" clip-path="url(#cs${id})"/>`
    : `<circle cx="50" cy="50" r="33" fill="${hex(o.partner)}" fill-opacity="${o.dark ? 0.9 : 0.8}"/>`;
  const dot = o.dot
    ? `<circle cx="84" cy="16" r="8" fill="${hex(o.partner)}" stroke="${WHITE}" stroke-width="2.5"/>`
    : '';
  return wrap(
    o,
    defs,
    `<circle cx="50" cy="50" r="45" fill="none" stroke="#000000" stroke-opacity="0.24" stroke-width="4"/>` +
      `<circle cx="50" cy="50" r="42" fill="none" stroke="url(#g${id})" stroke-width="7"/>` +
      inner +
      `<circle cx="50" cy="50" r="33" fill="url(#s${id})" opacity="0.6"/>` +
      `<circle cx="50" cy="50" r="33" fill="none" stroke="url(#r${id})" stroke-width="1.8"/>` +
      dot,
  );
}

// ---------------------------------------------------------------------------
// Racha: chispa grande (tu fruta) y chica (la de tu pareja).
// ---------------------------------------------------------------------------

const SPARK_BIG =
  'M46 4 C51 30 66 46 92 52 C66 58 51 74 46 100 C41 74 26 58 0 52 C26 46 41 30 46 4Z';
const SPARK_SMALL =
  'M80 6 C81 16 85 20 95 22 C85 24 81 28 80 38 C79 28 75 24 65 22 C75 20 79 16 80 6Z';

/** Opacidad de la chispa apagada (racha en 0). */
export const SPARK_OFF_OPACITY = 0.35;

export function streakShapeSvg(o: WidgetShapeOptions & { active: boolean }): string {
  const id = idOf(o, 'r');
  const group = o.active ? '<g>' : `<g opacity="${SPARK_OFF_OPACITY}">`;
  return wrap(
    o,
    glassDefs(id, o.dark),
    `${group}<g transform="translate(5,-4) scale(0.9)">${glass(SPARK_BIG, hex(o.me), id, o.dark)}</g>` +
      `<g transform="translate(2,10)">${glass(SPARK_SMALL, hex(o.partner), id, o.dark)}</g></g>`,
  );
}

// ---------------------------------------------------------------------------
// Estado vacío: el símbolo de dos medias lunas (tú a la izquierda, tu pareja a la derecha).
// ---------------------------------------------------------------------------

const HALF_LEFT = 'M46 10 A40 40 0 0 0 46 90 Z';
const HALF_RIGHT = 'M54 10 A40 40 0 0 1 54 90 Z';

export function emptyShapeSvg(o: WidgetShapeOptions): string {
  const id = idOf(o, 'e');
  return wrap(
    o,
    glassDefs(id, o.dark),
    glass(HALF_LEFT, hex(o.me), id, o.dark) + glass(HALF_RIGHT, hex(o.partner), id, o.dark),
  );
}
