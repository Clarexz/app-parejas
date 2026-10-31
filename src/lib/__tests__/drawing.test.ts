import {
  addPoint,
  BRUSHES,
  CANVAS_H,
  CANVAS_W,
  isValidStrokes,
  MAX_STROKES,
  simplifyStroke,
  STROKE_COLORS,
  strokePath,
  strokesSize,
  strokesToSvg,
  type Stroke,
  type StrokeColor,
} from '../drawing';

const colors = Object.fromEntries(STROKE_COLORS.map((c) => [c, '#123456'])) as Record<
  StrokeColor,
  string
>;
const ok: Stroke = { c: 'ink', w: 8, p: [10, 10, 20, 20] };

describe('constantes', () => {
  it('lienzo y pinceles', () => {
    expect(CANVAS_W).toBe(900);
    expect(CANVAS_H).toBe(1600);
    expect(BRUSHES.map((b) => [b.id, b.label, b.w, b.o])).toEqual([
      ['pen', 'Pluma', 8, undefined],
      ['marker', 'Plumón', 18, undefined],
      ['highlighter', 'Marcatextos', 40, 0.4],
    ]);
    expect(STROKE_COLORS).toHaveLength(8);
  });
});

describe('addPoint', () => {
  it('agrega el primer punto redondeado', () => {
    expect(addPoint([], 10.4, 20.6)).toEqual([10, 21]);
  });
  it('recorta al lienzo', () => {
    expect(addPoint([], -5, 5000)).toEqual([0, 1600]);
    expect(addPoint([], 1000, -1)).toEqual([900, 0]);
  });
  it('descarta puntos cercanos', () => {
    expect(addPoint([0, 0], 3, 3)).toEqual([0, 0]);
    expect(addPoint([0, 0], 5, 0)).toEqual([0, 0]);
  });
  it('acepta puntos a la distancia mínima o más', () => {
    expect(addPoint([0, 0], 6, 0)).toEqual([0, 0, 6, 0]);
    expect(addPoint([0, 0], 20, 0)).toEqual([0, 0, 20, 0]);
  });
  it('respeta minDist personalizado', () => {
    expect(addPoint([0, 0], 3, 0, 2)).toEqual([0, 0, 3, 0]);
    expect(addPoint([0, 0], 3, 0, 10)).toEqual([0, 0]);
  });
  it('no muta el arreglo original', () => {
    const a = [0, 0];
    addPoint(a, 50, 50);
    expect(a).toEqual([0, 0]);
  });
});

describe('simplifyStroke', () => {
  it('no cambia trazos de 0, 1 o 2 puntos', () => {
    expect(simplifyStroke([])).toEqual([]);
    expect(simplifyStroke([1, 2])).toEqual([1, 2]);
    expect(simplifyStroke([1, 2, 3, 4])).toEqual([1, 2, 3, 4]);
  });
  it('quita puntos colineales conservando extremos', () => {
    expect(simplifyStroke([0, 0, 10, 0, 20, 0, 30, 0])).toEqual([0, 0, 30, 0]);
  });
  it('conserva esquinas', () => {
    expect(simplifyStroke([0, 0, 50, 0, 50, 50])).toEqual([0, 0, 50, 0, 50, 50]);
  });
  it('usa la tolerancia', () => {
    const pts = [0, 0, 10, 3, 20, 0];
    expect(simplifyStroke(pts, 2)).toEqual(pts);
    expect(simplifyStroke(pts, 5)).toEqual([0, 0, 20, 0]);
  });
  it('maneja extremos iguales', () => {
    expect(simplifyStroke([0, 0, 10, 10, 0, 0])).toEqual([0, 0, 10, 10, 0, 0]);
  });
  it('soporta trazos largos', () => {
    const pts: number[] = [];
    for (let i = 0; i < 5000; i++) pts.push(i % 900, 100);
    const out = simplifyStroke(pts);
    expect(out[0]).toBe(0);
    expect(out.slice(-2)).toEqual([pts[pts.length - 2], 100]);
  });
});

describe('strokePath', () => {
  it('vacío', () => {
    expect(strokePath([])).toBe('');
  });
  it('un punto dibuja una línea de largo cero', () => {
    expect(strokePath([5, 7])).toBe('M 5 7 L 5 7');
  });
  it('dos puntos son una línea', () => {
    expect(strokePath([0, 0, 10, 20])).toBe('M 0 0 L 10 20');
  });
  it('tres o más usan curvas por puntos medios', () => {
    expect(strokePath([0, 0, 10, 10, 20, 0])).toBe('M 0 0 Q 10 10 15 5 L 20 0');
    const d = strokePath([0, 0, 10, 10, 20, 0, 30, 10]);
    expect(d.startsWith('M 0 0')).toBe(true);
    expect(d.match(/Q/g)).toHaveLength(2);
    expect(d.endsWith('L 30 10')).toBe(true);
  });
});

describe('strokesToSvg', () => {
  it('genera el SVG con fondo y trazos', () => {
    const svg = strokesToSvg(
      [ok, { c: 'jamaica', w: 40, o: 0.4, p: [1, 1, 2, 2] }],
      '#fff',
      colors,
    );
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('viewBox="0 0 900 1600"');
    expect(svg).toContain('width="900" height="1600"');
    expect(svg).toContain('<rect width="900" height="1600" fill="#fff"/>');
    expect(svg.match(/<path /g)).toHaveLength(2);
    expect(svg).toContain('fill="none"');
    expect(svg).toContain('stroke-linecap="round"');
    expect(svg).toContain('stroke-linejoin="round"');
    expect(svg.match(/stroke-opacity/g)).toHaveLength(1);
    expect(svg).toContain('stroke-opacity="0.4"');
    expect(svg.endsWith('</svg>')).toBe(true);
  });
  it('respeta width/height', () => {
    const svg = strokesToSvg([], '#000', colors, { width: 90, height: 160 });
    expect(svg).toContain('width="90" height="160"');
    expect(svg).toContain('viewBox="0 0 900 1600"');
    expect(svg).not.toContain('<path');
  });
  it('escapa atributos', () => {
    const svg = strokesToSvg([ok], 'a"b<c>&', { ...colors, ink: '"><x' });
    expect(svg).toContain('fill="a&quot;b&lt;c&gt;&amp;"');
    expect(svg).toContain('stroke="&quot;&gt;&lt;x"');
    expect(svg).not.toContain('<x');
  });
});

describe('isValidStrokes', () => {
  it('acepta trazos válidos', () => {
    expect(isValidStrokes([])).toBe(true);
    expect(isValidStrokes([ok])).toBe(true);
    expect(isValidStrokes([{ c: 'tapeMint', w: 60, o: 1, p: [0, 0, 900, 1600] }])).toBe(true);
    expect(isValidStrokes([{ c: 'ink', w: 2, o: 0.1, p: [5, 5] }])).toBe(true);
  });
  it('rechaza lo que no es arreglo', () => {
    for (const v of [null, undefined, {}, 'x', 3, [null], [[]], [ok, 'a']]) {
      expect(isValidStrokes(v)).toBe(false);
    }
  });
  it('rechaza más de MAX_STROKES', () => {
    expect(isValidStrokes(Array.from({ length: MAX_STROKES }, () => ok))).toBe(true);
    expect(isValidStrokes(Array.from({ length: MAX_STROKES + 1 }, () => ok))).toBe(false);
  });
  it('valida color', () => {
    expect(isValidStrokes([{ ...ok, c: 'rojo' }])).toBe(false);
    expect(isValidStrokes([{ ...ok, c: 1 }])).toBe(false);
  });
  it('valida grosor', () => {
    expect(isValidStrokes([{ ...ok, w: 1.9 }])).toBe(false);
    expect(isValidStrokes([{ ...ok, w: 61 }])).toBe(false);
    expect(isValidStrokes([{ ...ok, w: '8' }])).toBe(false);
    expect(isValidStrokes([{ ...ok, w: NaN }])).toBe(false);
  });
  it('valida opacidad', () => {
    expect(isValidStrokes([{ ...ok, o: 0.05 }])).toBe(false);
    expect(isValidStrokes([{ ...ok, o: 1.1 }])).toBe(false);
    expect(isValidStrokes([{ ...ok, o: '0.5' }])).toBe(false);
  });
  it('valida puntos', () => {
    expect(isValidStrokes([{ ...ok, p: [] }])).toBe(false);
    expect(isValidStrokes([{ ...ok, p: [1, 2, 3] }])).toBe(false);
    expect(isValidStrokes([{ ...ok, p: [1, '2'] }])).toBe(false);
    expect(isValidStrokes([{ ...ok, p: [1, NaN] }])).toBe(false);
    expect(isValidStrokes([{ ...ok, p: 'abcd' }])).toBe(false);
    expect(isValidStrokes([{ ...ok, p: [-1, 0] }])).toBe(false);
    expect(isValidStrokes([{ ...ok, p: [901, 0] }])).toBe(false);
    expect(isValidStrokes([{ ...ok, p: [0, 1601] }])).toBe(false);
  });
  it('rechaza JSON mayor a 262144 bytes', () => {
    const big: Stroke = { c: 'ink', w: 8, p: Array.from({ length: 80_000 }, () => 899) };
    expect(strokesSize([big])).toBeGreaterThan(262_144);
    expect(isValidStrokes([big])).toBe(false);
  });
});

describe('strokesSize', () => {
  it('cuenta los bytes del JSON', () => {
    expect(strokesSize([])).toBe(2);
    expect(strokesSize([ok])).toBe(JSON.stringify([ok]).length);
  });
  it('cuenta UTF-8 multibyte', () => {
    const odd = { c: 'ñ😀', w: 8, p: [1, 2] } as unknown as Stroke;
    expect(strokesSize([odd])).toBe(Buffer.byteLength(JSON.stringify([odd]), 'utf8'));
  });
});
