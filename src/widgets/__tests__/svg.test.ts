import { FRUITS } from '@/lib/fruits';

import {
  clampProgress,
  daysShapeSvg,
  distanceSeparation,
  distShapeSvg,
  emptyShapeSvg,
  fillTop,
  glass,
  glassDefs,
  moodShapeSvg,
  nextShapeSvg,
  SPARK_OFF_OPACITY,
  storyShapeSvg,
  streakShapeSvg,
  type WidgetShapeOptions,
} from '../components/svg';

const base: WidgetShapeOptions = { me: 'uva', partner: 'limon', dark: false, size: 60 };

const ids = (svg: string): string[] => [...svg.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);

describe('vidrio', () => {
  it('glassDefs: degradado blanco 62 → 14 → 28 % (40 % arriba en oscuro)', () => {
    const light = glassDefs('x', false);
    expect(light).toContain('stop-opacity="0.62"');
    expect(light).toContain('stop-opacity="0.14"');
    expect(light).toContain('stop-opacity="0.28"');
    expect(glassDefs('x', true)).toContain('stop-opacity="0.4"');
    expect(glassDefs('x', true)).not.toContain('stop-opacity="0.62"');
  });

  it('glass: contorno negro 24 % de 4, relleno 80 % (90 % en oscuro), brillo de 1.8', () => {
    const d = 'M0 0 L10 10 Z';
    const light = glass(d, '#112233', 'x', false);
    expect(light).toContain('stroke="#000000" stroke-opacity="0.24" stroke-width="4"');
    expect(light).toContain('fill="#112233" fill-opacity="0.8"');
    expect(light).toContain('fill="url(#sx)"');
    expect(light).toContain('stroke="url(#rx)" stroke-width="1.8"');
    expect(glass(d, '#112233', 'x', true)).toContain('fill-opacity="0.9"');
  });

  it('glass: recorte opcional', () => {
    expect(glass('M0 0Z', '#fff', 'x', false, 'c1')).toContain('clip-path="url(#c1)"');
    expect(glass('M0 0Z', '#fff', 'x', false)).not.toContain('clip-path');
  });
});

describe('compatibilidad con AndroidSVG', () => {
  const all = (o: WidgetShapeOptions) => [
    daysShapeSvg(o),
    moodShapeSvg(o),
    nextShapeSvg({ ...o, progress: 0.4 }),
    distShapeSvg({ ...o, km: 800 }),
    storyShapeSvg({ ...o, photo: 'data:image/jpeg;base64,AAAA', dot: true }),
    storyShapeSvg({ ...o, photo: null, dot: false }),
    streakShapeSvg({ ...o, active: true }),
    emptyShapeSvg(o),
  ];

  it('no usa paint-order, rgba() ni href sin espacio de nombres', () => {
    for (const dark of [false, true]) {
      for (const svg of all({ ...base, dark })) {
        expect(svg).not.toContain('paint-order');
        expect(svg).not.toContain('rgba(');
        expect(svg).not.toMatch(/\shref=/);
        expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
        expect(svg).toContain('width="60" height="60"');
      }
    }
  });

  it('los ids no se repiten dentro de un SVG y llevan el sufijo pedido', () => {
    for (const svg of all({ ...base, id: 'Z' })) {
      const found = ids(svg);
      expect(new Set(found).size).toBe(found.length);
      for (const id of found) expect(id.endsWith('Z')).toBe(true);
    }
  });
});

describe('Días juntos', () => {
  it('mitad izquierda de tu pareja, derecha tuya', () => {
    const svg = daysShapeSvg(base);
    const limon = svg.indexOf(FRUITS.limon.hex);
    const uva = svg.indexOf(FRUITS.uva.hex);
    expect(limon).toBeGreaterThan(-1);
    expect(uva).toBeGreaterThan(limon);
    expect(svg).toContain('<clipPath id="cld"><rect x="0" y="0" width="47.5"');
    expect(svg).toContain('<rect x="52.5" y="0" width="47.5"');
  });
});

describe('Mood', () => {
  it('burbuja en la fruta de tu pareja con carita', () => {
    const svg = moodShapeSvg(base);
    expect(svg).toContain(FRUITS.limon.hex);
    expect(svg).not.toContain(FRUITS.uva.hex);
    expect(svg).toContain('M36 48 Q50 61 64 48');
    expect(moodShapeSvg({ ...base, face: 'frown' })).toContain('M36 58 Q50 45 64 58');
  });
});

describe('La próxima vez', () => {
  it('media luna de tu fruta y llenado de la de tu pareja', () => {
    const svg = nextShapeSvg({ ...base, progress: 0.62 });
    expect(svg).toContain(`fill="${FRUITS.uva.hex}"`);
    expect(svg).toContain(`fill="${FRUITS.limon.hex}" fill-opacity="0.85"`);
    expect(svg).toContain('M2 80 H98');
  });

  it('el nivel de llenado sube con el progreso y se acota de 0 a 1', () => {
    expect(fillTop(0)).toBe(76);
    expect(fillTop(1)).toBe(32);
    expect(fillTop(0.5)).toBe(54);
    expect(fillTop(2)).toBe(32);
    expect(fillTop(-3)).toBe(76);
    expect(clampProgress(Number.NaN)).toBe(0.5);
    const svg = nextShapeSvg({ ...base, progress: 0.62 });
    expect(svg).toContain(`y="${76 - 44 * 0.62}"`);
    expect(nextShapeSvg({ ...base, progress: 0 })).toContain('y="76"');
    expect(nextShapeSvg({ ...base, progress: 1 })).toContain('y="32"');
  });
});

describe('Distancia', () => {
  it('más cerca, más juntos, con tope', () => {
    const near = distanceSeparation(0);
    const mid = distanceSeparation(100);
    const far = distanceSeparation(1240);
    expect(near).toBeLessThan(mid);
    expect(mid).toBeLessThan(far);
    expect(distanceSeparation(3000)).toBe(56);
    expect(distanceSeparation(20000)).toBe(56);
    expect(distanceSeparation(null)).toBeGreaterThan(near);
  });

  it('dos círculos, tú y tu pareja', () => {
    const svg = distShapeSvg({ ...base, km: 1240 });
    expect(svg).toContain(`fill="${FRUITS.uva.hex}"`);
    expect(svg).toContain(`fill="${FRUITS.limon.hex}"`);
    expect(svg).toContain('stroke-dasharray="0.1 7"');
  });
});

describe('Story', () => {
  it('con foto: imagen recortada, aro de las dos frutas y punto en la de tu pareja', () => {
    const svg = storyShapeSvg({ ...base, photo: 'data:image/png;base64,AAAA', dot: true });
    expect(svg).toContain('xmlns:xlink="http://www.w3.org/1999/xlink"');
    expect(svg).toContain('xlink:href="data:image/png;base64,AAAA"');
    expect(svg).toContain('preserveAspectRatio="xMidYMid slice"');
    expect(svg).toContain(`stop-color="${FRUITS.limon.hex}"`);
    expect(svg).toContain(`stop-color="${FRUITS.uva.hex}"`);
    expect(svg).toContain(`<circle cx="84" cy="16" r="8" fill="${FRUITS.limon.hex}"`);
  });

  it('sin foto ni story nueva: sin imagen y sin punto', () => {
    const svg = storyShapeSvg({ ...base, photo: null, dot: false });
    expect(svg).not.toContain('<image');
    expect(svg).not.toContain('cx="84"');
  });
});

describe('Racha', () => {
  it('chispa grande tuya y chica de tu pareja', () => {
    const svg = streakShapeSvg({ ...base, active: true });
    expect(svg.indexOf(FRUITS.uva.hex)).toBeLessThan(svg.indexOf(FRUITS.limon.hex));
    expect(svg).not.toContain('<g opacity=');
  });

  it('con racha 0 se ve apagada al 35 %', () => {
    expect(SPARK_OFF_OPACITY).toBe(0.35);
    expect(streakShapeSvg({ ...base, active: false })).toContain('<g opacity="0.35">');
  });
});

describe('Estado vacío', () => {
  it('dos medias lunas, la tuya a la izquierda', () => {
    const svg = emptyShapeSvg(base);
    expect(svg.indexOf(FRUITS.uva.hex)).toBeLessThan(svg.indexOf(FRUITS.limon.hex));
    expect(svg).toContain('A40 40 0 0 0 46 90');
    expect(svg).toContain('A40 40 0 0 1 54 90');
  });
});

describe('frutas', () => {
  it('cada fruta usa su hex', () => {
    for (const fruit of Object.values(FRUITS)) {
      expect(daysShapeSvg({ ...base, me: fruit.key, partner: fruit.key })).toContain(fruit.hex);
    }
  });
});
