import {
  MEXICO_REGION,
  clusterPoints,
  haversineKm,
  projectEquirect,
  regionForPoints,
  zoomInRegion,
  type Region,
} from '../geo';

const CDMX = { lat: 19.4326, lng: -99.1332 };
const REGION: Region = {
  latitude: 19.43,
  longitude: -99.13,
  latitudeDelta: 0.5,
  longitudeDelta: 0.25,
};
const SIZE = { width: 360, height: 640 };

describe('clusterPoints', () => {
  it('sin puntos no hay grupos', () => {
    expect(clusterPoints([], REGION, SIZE)).toEqual([]);
  });

  it('puntos lejanos quedan separados y conservan su id', () => {
    const out = clusterPoints(
      [
        { id: 'a', ...CDMX },
        { id: 'b', lat: 20.9674, lng: -89.5926 },
      ],
      MEXICO_REGION,
      SIZE,
    );
    expect(out.map((c) => c.id).sort()).toEqual(['a', 'b']);
    expect(out.every((c) => c.items.length === 1)).toBe(true);
  });

  it('puntos muy cercanos se agrupan y el centro es el promedio', () => {
    const out = clusterPoints(
      [
        { id: 'a', lat: 19.4326, lng: -99.1332 },
        { id: 'b', lat: 19.4328, lng: -99.1334 },
      ],
      MEXICO_REGION,
      SIZE,
    );
    expect(out).toHaveLength(1);
    expect(out[0].items.map((p) => p.id)).toEqual(['a', 'b']);
    expect(out[0].lat).toBeCloseTo(19.4327, 6);
    expect(out[0].lng).toBeCloseTo(-99.1333, 6);
    expect(out[0].id).toBe('cluster:a|b');
  });

  it('al acercar el mapa los grupos se separan', () => {
    const points = [
      { id: 'a', lat: 19.4326, lng: -99.1332 },
      { id: 'b', lat: 19.4426, lng: -99.1432 },
    ];
    expect(clusterPoints(points, MEXICO_REGION, SIZE)).toHaveLength(1);
    expect(
      clusterPoints(points, { ...REGION, latitudeDelta: 0.05, longitudeDelta: 0.025 }, SIZE),
    ).toHaveLength(2);
  });

  it('respeta cellPx', () => {
    const points = [
      { id: 'a', lat: 19.4326, lng: -99.1332 },
      { id: 'b', lat: 19.4326, lng: -99.1032 },
    ];
    const region = { ...REGION, longitudeDelta: 1 }; // ~360 px por grado → ~108 px de distancia
    expect(clusterPoints(points, region, { ...SIZE, cellPx: 32 })).toHaveLength(2);
    expect(clusterPoints(points, region, { ...SIZE, cellPx: 1000 })).toHaveLength(1);
  });

  it('conserva los extras del punto y no se rompe con delta cero o ancho cero', () => {
    const out = clusterPoints(
      [{ id: 'a', ...CDMX, title: 'x' }],
      { ...REGION, longitudeDelta: 0 },
      SIZE,
    );
    expect(out[0].items[0].title).toBe('x');
    expect(clusterPoints([{ id: 'a', ...CDMX }], REGION, { width: 0, height: 0 })).toHaveLength(1);
  });

  it('puntos idénticos siempre se agrupan', () => {
    const out = clusterPoints(
      [
        { id: 'a', ...CDMX },
        { id: 'b', ...CDMX },
        { id: 'c', ...CDMX },
      ],
      { ...REGION, longitudeDelta: 0.001 },
      SIZE,
    );
    expect(out).toHaveLength(1);
    expect(out[0].items).toHaveLength(3);
  });

  it('latitudes extremas no producen NaN', () => {
    const out = clusterPoints(
      [
        { id: 'a', lat: 90, lng: 0 },
        { id: 'b', lat: -90, lng: 180 },
      ],
      MEXICO_REGION,
      SIZE,
    );
    expect(out).toHaveLength(2);
  });
});

describe('regionForPoints', () => {
  it('sin puntos: México', () => {
    expect(regionForPoints([])).toEqual({
      latitude: 23.6,
      longitude: -102.5,
      latitudeDelta: 20,
      longitudeDelta: 20,
    });
    expect(regionForPoints([])).not.toBe(MEXICO_REGION);
  });

  it('un punto: delta 0.05', () => {
    expect(regionForPoints([CDMX])).toEqual({
      latitude: CDMX.lat,
      longitude: CDMX.lng,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    });
  });

  it('varios puntos: centro y margen', () => {
    const r = regionForPoints([
      { lat: 19, lng: -100 },
      { lat: 21, lng: -98 },
    ]);
    expect(r.latitude).toBe(20);
    expect(r.longitude).toBe(-99);
    expect(r.latitudeDelta).toBeCloseTo(2.8, 6);
    expect(r.longitudeDelta).toBeCloseTo(2.8, 6);
  });

  it('padding personalizado', () => {
    const r = regionForPoints(
      [
        { lat: 0, lng: 0 },
        { lat: 10, lng: 20 },
      ],
      1,
    );
    expect(r.latitudeDelta).toBe(10);
    expect(r.longitudeDelta).toBe(20);
  });

  it('puntos idénticos o casi: delta mínimo', () => {
    const r = regionForPoints([CDMX, CDMX]);
    expect(r.latitudeDelta).toBe(0.05);
    const near = regionForPoints([CDMX, { lat: CDMX.lat + 0.001, lng: CDMX.lng }]);
    expect(near.latitudeDelta).toBe(0.05);
  });

  it('el mundo entero no se pasa de los límites', () => {
    const r = regionForPoints([
      { lat: -85, lng: -180 },
      { lat: 85, lng: 180 },
    ]);
    expect(r.latitudeDelta).toBeLessThanOrEqual(170);
    expect(r.longitudeDelta).toBeLessThanOrEqual(350);
  });
});

describe('zoomInRegion', () => {
  it('encuadra el grupo y es más cercano que la región actual', () => {
    const items = [
      { lat: 19.43, lng: -99.14 },
      { lat: 19.44, lng: -99.13 },
    ];
    const r = zoomInRegion({ items }, MEXICO_REGION);
    expect(r.latitude).toBeCloseTo(19.435, 6);
    expect(r.longitude).toBeCloseTo(-99.135, 6);
    expect(r.latitudeDelta).toBeLessThan(MEXICO_REGION.latitudeDelta);
    expect(r.longitudeDelta).toBeLessThan(MEXICO_REGION.longitudeDelta);
  });

  it('puntos idénticos: baja a la mitad de la región', () => {
    const r = zoomInRegion(
      { items: [CDMX, CDMX] },
      { ...REGION, latitudeDelta: 0.04, longitudeDelta: 0.02 },
    );
    expect(r.latitudeDelta).toBeCloseTo(0.02, 6);
    expect(r.longitudeDelta).toBeCloseTo(0.01, 6);
  });

  it('nunca baja del mínimo', () => {
    const r = zoomInRegion(
      { items: [CDMX, CDMX] },
      { ...REGION, latitudeDelta: 0.001, longitudeDelta: 0.001 },
    );
    expect(r.latitudeDelta).toBeGreaterThanOrEqual(0.002);
  });
});

describe('projectEquirect', () => {
  const box = { width: 200, height: 100, padding: 10 };

  it('sin puntos: vacío', () => {
    expect(projectEquirect([], box)).toEqual([]);
  });

  it('un punto cae al centro', () => {
    expect(projectEquirect([CDMX], box)).toEqual([{ x: 100, y: 50 }]);
    expect(projectEquirect([CDMX, CDMX], box)).toEqual([
      { x: 100, y: 50 },
      { x: 100, y: 50 },
    ]);
  });

  it('norte arriba y este a la derecha, dentro del área con padding', () => {
    const pts = [
      { lat: 10, lng: -100 }, // suroeste
      { lat: 20, lng: -90 }, // noreste
    ];
    const [sw, ne] = projectEquirect(pts, box);
    expect(ne.x).toBeGreaterThan(sw.x);
    expect(ne.y).toBeLessThan(sw.y);
    for (const p of [sw, ne]) {
      expect(p.x).toBeGreaterThanOrEqual(10 - 1e-9);
      expect(p.x).toBeLessThanOrEqual(190 + 1e-9);
      expect(p.y).toBeGreaterThanOrEqual(10 - 1e-9);
      expect(p.y).toBeLessThanOrEqual(90 + 1e-9);
    }
  });

  it('conserva la proporción: caja ancha y puntos en vertical se centran horizontalmente', () => {
    const [a, b] = projectEquirect(
      [
        { lat: 0, lng: 0 },
        { lat: 10, lng: 0 },
      ],
      { width: 400, height: 100 },
    );
    expect(a.x).toBeCloseTo(200, 6);
    expect(b.x).toBeCloseTo(200, 6);
    expect(a.y).toBeCloseTo(100, 6);
    expect(b.y).toBeCloseTo(0, 6);
  });

  it('puntos en una línea horizontal se centran verticalmente', () => {
    const [a, b] = projectEquirect(
      [
        { lat: 5, lng: 0 },
        { lat: 5, lng: 10 },
      ],
      { width: 200, height: 100 },
    );
    expect(a.y).toBeCloseTo(50, 6);
    expect(b.y).toBeCloseTo(50, 6);
    expect(a.x).toBeCloseTo(0, 6);
    expect(b.x).toBeCloseTo(200, 6);
  });

  it('el orden de salida coincide con el de entrada', () => {
    const pts = [
      { lat: 20, lng: -90 },
      { lat: 10, lng: -100 },
      { lat: 15, lng: -95 },
    ];
    const out = projectEquirect(pts, box);
    expect(out).toHaveLength(3);
    expect(out[2].x).toBeGreaterThan(out[1].x);
    expect(out[2].x).toBeLessThan(out[0].x);
  });
});

describe('haversineKm', () => {
  const MONTERREY = { lat: 25.6866, lng: -100.3161 };
  const MADRID = { lat: 40.4168, lng: -3.7038 };

  it('el mismo punto está a 0 km', () => {
    expect(haversineKm(CDMX, CDMX)).toBe(0);
  });

  it('CDMX y Monterrey, unos 705 km', () => {
    expect(Math.abs(haversineKm(CDMX, MONTERREY) - 705)).toBeLessThanOrEqual(5);
  });

  it('CDMX y Madrid, unos 9,070 km', () => {
    expect(Math.abs(haversineKm(CDMX, MADRID) - 9070)).toBeLessThanOrEqual(30);
  });

  it('es simétrica', () => {
    expect(haversineKm(CDMX, MADRID)).toBeCloseTo(haversineKm(MADRID, CDMX), 9);
  });

  it('antípodas, unos 20,015 km', () => {
    const d = haversineKm({ lat: 0, lng: 0 }, { lat: 0, lng: 180 });
    expect(Math.abs(d - 20015)).toBeLessThanOrEqual(10);
    expect(
      Math.abs(haversineKm({ lat: 90, lng: 0 }, { lat: -90, lng: 0 }) - 20015),
    ).toBeLessThanOrEqual(10);
  });
});
