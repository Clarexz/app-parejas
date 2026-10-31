/** Lienzo lógico del dibujo (vertical 9:16). Los puntos viven en estas coordenadas. */
export const CANVAS_W = 900;
export const CANVAS_H = 1600;

export type StrokeColor =
  'ink' | 'jamaica' | 'cempasuchil' | 'nopal' | 'chile' | 'postit' | 'paper' | 'tapeMint';

/** Trazo: color, grosor, opacidad opcional y puntos planos [x0, y0, x1, y1, ...]. */
export type Stroke = { c: StrokeColor; w: number; o?: number; p: number[] };

export type Brush = { id: 'pen' | 'marker' | 'highlighter'; label: string; w: number; o?: number };

export const BRUSHES: readonly Brush[] = [
  { id: 'pen', label: 'Pluma', w: 8 },
  { id: 'marker', label: 'Plumón', w: 18 },
  { id: 'highlighter', label: 'Marcatextos', w: 40, o: 0.4 },
];

export const STROKE_COLORS: readonly StrokeColor[] = [
  'ink',
  'jamaica',
  'cempasuchil',
  'nopal',
  'chile',
  'postit',
  'paper',
  'tapeMint',
];

/** Límites que también valida la base de datos. */
export const MAX_STROKES = 300;
export const MAX_STROKES_BYTES = 262_144;

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/**
 * Agrega un punto al trazo (devuelve un arreglo nuevo): redondea a entero, recorta al lienzo
 * y descarta el punto si queda a menos de `minDist` del último.
 */
export function addPoint(points: number[], x: number, y: number, minDist = 6): number[] {
  const px = Math.round(clamp(x, 0, CANVAS_W));
  const py = Math.round(clamp(y, 0, CANVAS_H));
  const n = points.length;
  if (n >= 2) {
    const dx = px - points[n - 2];
    const dy = py - points[n - 1];
    if (Math.hypot(dx, dy) < minDist) return points;
  }
  return [...points, px, py];
}

function perpDistance(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy);
  if (len === 0) return Math.hypot(px - ax, py - ay);
  return Math.abs(dy * px - dx * py + bx * ay - by * ax) / len;
}

/** Simplifica un trazo con Ramer–Douglas–Peucker conservando los extremos. */
export function simplifyStroke(points: number[], tolerance = 2): number[] {
  const count = Math.floor(points.length / 2);
  if (count <= 2) return points.slice();
  const keep = new Array<boolean>(count).fill(false);
  keep[0] = true;
  keep[count - 1] = true;
  // Pila explícita para no depender de la recursión en trazos largos.
  const stack: [number, number][] = [[0, count - 1]];
  while (stack.length > 0) {
    const [start, end] = stack.pop()!;
    let maxDist = -1;
    let index = -1;
    for (let i = start + 1; i < end; i++) {
      const d = perpDistance(
        points[2 * i],
        points[2 * i + 1],
        points[2 * start],
        points[2 * start + 1],
        points[2 * end],
        points[2 * end + 1],
      );
      if (d > maxDist) {
        maxDist = d;
        index = i;
      }
    }
    if (index !== -1 && maxDist > tolerance) {
      keep[index] = true;
      stack.push([start, index], [index, end]);
    }
  }
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    if (keep[i]) out.push(points[2 * i], points[2 * i + 1]);
  }
  return out;
}

const fmt = (n: number) => String(Math.round(n * 10) / 10);

/**
 * Path SVG suavizado con curvas cuadráticas por puntos medios.
 * Un solo punto genera una línea de largo cero (con `stroke-linecap="round"` se ve como un punto).
 */
export function strokePath(points: number[]): string {
  const count = Math.floor(points.length / 2);
  if (count === 0) return '';
  const x = (i: number) => points[2 * i];
  const y = (i: number) => points[2 * i + 1];
  if (count === 1) return `M ${fmt(x(0))} ${fmt(y(0))} L ${fmt(x(0))} ${fmt(y(0))}`;
  if (count === 2) return `M ${fmt(x(0))} ${fmt(y(0))} L ${fmt(x(1))} ${fmt(y(1))}`;
  let d = `M ${fmt(x(0))} ${fmt(y(0))}`;
  for (let i = 1; i < count - 1; i++) {
    const mx = (x(i) + x(i + 1)) / 2;
    const my = (y(i) + y(i + 1)) / 2;
    d += ` Q ${fmt(x(i))} ${fmt(y(i))} ${fmt(mx)} ${fmt(my)}`;
  }
  d += ` L ${fmt(x(count - 1))} ${fmt(y(count - 1))}`;
  return d;
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** SVG completo del dibujo (viewBox 0 0 900 1600) con fondo `bg`, para el widget. */
export function strokesToSvg(
  strokes: Stroke[],
  bg: string,
  colors: Record<StrokeColor, string>,
  opts?: { width?: number; height?: number },
): string {
  const width = opts?.width ?? CANVAS_W;
  const height = opts?.height ?? CANVAS_H;
  const paths = strokes
    .filter((s) => s.p.length >= 2)
    .map((s) => {
      const op = s.o !== undefined ? ` stroke-opacity="${esc(String(s.o))}"` : '';
      return (
        `<path d="${strokePath(s.p)}" fill="none" stroke="${esc(colors[s.c])}"` +
        ` stroke-width="${esc(String(s.w))}" stroke-linecap="round" stroke-linejoin="round"${op}/>`
      );
    })
    .join('');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS_W} ${CANVAS_H}"` +
    ` width="${esc(String(width))}" height="${esc(String(height))}">` +
    `<rect width="${CANVAS_W}" height="${CANVAS_H}" fill="${esc(bg)}"/>` +
    paths +
    `</svg>`
  );
}

function isValidStroke(v: unknown): v is Stroke {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
  const s = v as Record<string, unknown>;
  if (typeof s.c !== 'string' || !(STROKE_COLORS as readonly string[]).includes(s.c)) return false;
  if (typeof s.w !== 'number' || !Number.isFinite(s.w) || s.w < 2 || s.w > 60) return false;
  if (s.o !== undefined) {
    if (typeof s.o !== 'number' || !Number.isFinite(s.o) || s.o < 0.1 || s.o > 1) return false;
  }
  const p = s.p;
  if (!Array.isArray(p) || p.length < 2 || p.length % 2 !== 0) return false;
  for (let i = 0; i < p.length; i += 2) {
    const px = p[i];
    const py = p[i + 1];
    if (typeof px !== 'number' || typeof py !== 'number') return false;
    if (!Number.isFinite(px) || !Number.isFinite(py)) return false;
    if (px < 0 || px > CANVAS_W || py < 0 || py > CANVAS_H) return false;
  }
  return true;
}

/** Valida la forma de los trazos (lo mismo que acepta la base de datos). */
export function isValidStrokes(v: unknown): v is Stroke[] {
  if (!Array.isArray(v) || v.length > MAX_STROKES) return false;
  if (!v.every(isValidStroke)) return false;
  return strokesSize(v as Stroke[]) <= MAX_STROKES_BYTES;
}

/** Tamaño en bytes (UTF-8) del JSON de los trazos. */
export function strokesSize(strokes: Stroke[]): number {
  const json = JSON.stringify(strokes);
  let bytes = 0;
  for (let i = 0; i < json.length; i++) {
    const c = json.charCodeAt(i);
    if (c < 0x80) bytes += 1;
    else if (c < 0x800) bytes += 2;
    else if (c >= 0xd800 && c <= 0xdbff) {
      bytes += 4;
      i++;
    } else bytes += 3;
  }
  return bytes;
}
