import {
  approxCoord,
  cityFromGeocode,
  distancePhrase,
  distanceView,
  formatKm,
  isShareMode,
  shouldSendLocation,
  snapshotDistance,
  spokenKm,
  type LocationRowLike,
} from '../distance';

const NOW = new Date('2026-10-30T18:00:00Z');
const row = (user_id: string, lat: number, lng: number, city: string | null, at: string) => ({
  user_id,
  lat,
  lng,
  city,
  updated_at: at,
});
const cdmx = row('me', 19.43, -99.13, 'Ciudad de México', '2026-10-30T17:50:00Z');
const mty = row('her', 25.67, -100.31, 'Monterrey', '2026-10-30T16:00:00Z');

describe('snapshotDistance', () => {
  it('con los dos calcula km y conserva ciudades', () => {
    const snap = snapshotDistance([cdmx, mty], 'me', 'her');
    expect(snap?.km).toBeGreaterThan(700);
    expect(snap?.km).toBeLessThan(720);
    expect(snap?.me?.city).toBe('Ciudad de México');
    expect(snap?.partner?.at).toBe(mty.updated_at);
  });

  it('si solo uno comparte no hay km', () => {
    expect(snapshotDistance([cdmx], 'me', 'her')).toEqual({
      me: { city: 'Ciudad de México', at: cdmx.updated_at },
      partner: null,
      km: null,
    });
    expect(snapshotDistance([mty], 'me', 'her')?.me).toBeNull();
  });

  it('si nadie comparte devuelve null', () => {
    expect(snapshotDistance([], 'me', 'her')).toBeNull();
    expect(snapshotDistance([cdmx], null, 'her')).toBeNull();
  });

  it('ignora filas de otras personas y normaliza ciudad vacía', () => {
    const rows: LocationRowLike[] = [row('otro', 0, 0, 'X', 'a'), { ...cdmx, city: '  ' }];
    expect(snapshotDistance(rows, 'me', 'her')?.me?.city).toBeNull();
  });
});

describe('formatKm', () => {
  it.each([
    [0, 'menos de 1 km'],
    [0.4, 'menos de 1 km'],
    [1, '1 km'],
    [12.54, '12.5 km'],
    [12.02, '12 km'],
    [99.96, '100 km'],
    [100, '100 km'],
    [707.4, '707 km'],
    [1239.6, '1,240 km'],
  ])('%s -> %s', (km, text) => expect(formatKm(km)).toBe(text));

  it('sin dato queda vacío', () => {
    expect(formatKm(null)).toBe('');
    expect(formatKm(Number.NaN)).toBe('');
    expect(formatKm(-3)).toBe('');
  });

  it('versión hablada', () => {
    expect(spokenKm(707)).toBe('707 kilómetros');
    expect(spokenKm(0.2)).toBe('menos de 1 kilómetro');
    expect(spokenKm(null)).toBe('');
  });
});

describe('distancePhrase', () => {
  it('cambia por rango y es vacía sin dato', () => {
    const phrases = [0.5, 5, 50, 300, 900, 3000, 9000].map(distancePhrase);
    expect(new Set(phrases).size).toBe(phrases.length);
    expect(distancePhrase(null)).toBe('');
  });
});

describe('distanceView', () => {
  it('los dos comparten', () => {
    const v = distanceView([cdmx, mty], 'me', 'her', NOW);
    expect(v.kind).toBe('both');
    expect(v.kmText).toBe('704 km');
    expect(v.route).toBe('Ciudad de México ↔ Monterrey');
    expect(v.partnerAgo).toBe('hace 2 h');
  });

  it('estados de uno solo y ninguno', () => {
    expect(distanceView([cdmx], 'me', 'her', NOW).kind).toBe('only_me');
    expect(distanceView([mty], 'me', 'her', NOW).kind).toBe('only_partner');
    const none = distanceView([], 'me', 'her', NOW);
    expect(none).toMatchObject({ kind: 'none', km: null, kmText: '', route: '' });
  });

  it('sin una de las ciudades no hay ruta', () => {
    expect(distanceView([cdmx, { ...mty, city: null }], 'me', 'her', NOW).route).toBe('');
  });
});

describe('shouldSendLocation', () => {
  const prev = { lat: 19.43, lng: -99.13, at: 1_000_000 };
  const min = 60_000;

  it('la primera vez siempre manda', () => {
    expect(shouldSendLocation(null, prev, 0)).toBe(true);
  });
  it('no manda si pasó poco y no te moviste', () => {
    expect(shouldSendLocation(prev, { lat: 19.431, lng: -99.131 }, prev.at + 9 * min)).toBe(false);
  });
  it('manda pasados 10 min aunque no te muevas', () => {
    expect(shouldSendLocation(prev, prev, prev.at + 10 * min)).toBe(true);
  });
  it('manda si te moviste más de 1 km aunque haya pasado poco', () => {
    expect(shouldSendLocation(prev, { lat: 19.45, lng: -99.13 }, prev.at + min)).toBe(true);
  });
  it('un reloj que retrocede no bloquea el envío', () => {
    expect(shouldSendLocation(prev, prev, prev.at - 5)).toBe(true);
  });
});

describe('cityFromGeocode', () => {
  it('prefiere city, luego subregion, luego region', () => {
    expect(cityFromGeocode([{ city: 'Monterrey', subregion: 'A', region: 'B' }])).toBe('Monterrey');
    expect(cityFromGeocode([{ city: null, subregion: 'Nuevo León', region: 'B' }])).toBe(
      'Nuevo León',
    );
    expect(cityFromGeocode([{ city: ' ', subregion: null, region: 'Jalisco' }])).toBe('Jalisco');
  });
  it('sin resultados es null y recorta a 80', () => {
    expect(cityFromGeocode([])).toBeNull();
    expect(cityFromGeocode(null)).toBeNull();
    expect(cityFromGeocode([{ city: 'x'.repeat(120) }])).toHaveLength(80);
  });
});

describe('utilidades', () => {
  it('approxCoord redondea a 2 decimales', () => {
    expect(approxCoord(19.4326077)).toBe(19.43);
    expect(approxCoord(-99.1332)).toBe(-99.13);
  });
  it('isShareMode', () => {
    expect(isShareMode('background')).toBe(true);
    expect(isShareMode('siempre')).toBe(false);
  });
});
