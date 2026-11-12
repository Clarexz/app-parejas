import { coupleDayZone, coupleToday } from '../coupleDay';

const CDMX = 'America/Mexico_City';
const TIJUANA = 'America/Tijuana';
const TOKYO = 'Asia/Tokyo';

describe('coupleDayZone / coupleToday', () => {
  // 06:30 UTC del 15 de enero: 00:30 en CDMX (UTC-6) y 22:30 del 14 en Tijuana (UTC-8).
  const now = new Date('2026-01-15T06:30:00Z');

  it('gana la zona que va más atrás (Tijuana)', () => {
    expect(coupleDayZone([CDMX, TIJUANA], CDMX, now)).toBe(TIJUANA);
    expect(coupleDayZone([TIJUANA, CDMX], CDMX, now)).toBe(TIJUANA);
    expect(coupleToday([CDMX, TIJUANA], CDMX, now)).toBe('2026-01-14');
  });

  it('una zona adelantada (Tokio) no adelanta el día', () => {
    expect(coupleDayZone([TOKYO, CDMX], CDMX, now)).toBe(CDMX);
    expect(coupleToday([TOKYO, CDMX], CDMX, now)).toBe('2026-01-15');
  });

  it('las zonas nulas o inválidas usan el respaldo', () => {
    expect(coupleDayZone([null, undefined], TIJUANA, now)).toBe(TIJUANA);
    expect(coupleDayZone(['No/Existe', CDMX], TIJUANA, now)).toBe(TIJUANA);
    expect(coupleToday([CDMX, null], TIJUANA, now)).toBe('2026-01-14');
  });

  it('con un respaldo inválido cae a Ciudad de México', () => {
    expect(coupleDayZone([null], 'basura', now)).toBe(CDMX);
    expect(coupleDayZone([], 'basura', now)).toBe(CDMX);
  });

  it('lista vacía: usa el respaldo', () => {
    expect(coupleDayZone([], TIJUANA, now)).toBe(TIJUANA);
    expect(coupleToday([], TOKYO, now)).toBe('2026-01-15');
  });

  it('dos zonas iguales dan esa zona', () => {
    expect(coupleDayZone([CDMX, CDMX], TOKYO, now)).toBe(CDMX);
  });
});
