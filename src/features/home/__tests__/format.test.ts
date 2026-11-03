import { countdownProgress, shortDate } from '../format';

describe('shortDate', () => {
  it('escribe el día de la semana, el número y el mes corto', () => {
    expect(shortDate('2026-11-03')).toBe('martes 3 nov');
    expect(shortDate('2026-11-15')).toBe('domingo 15 nov');
    expect(shortDate('no')).toBe('');
  });
});

describe('countdownProgress', () => {
  it('cuenta desde que se apuntó la fecha', () => {
    // apuntada hace 8 días, faltan 12: van 8 de 20
    expect(countdownProgress(12, '2026-10-26T10:00:00Z', '2026-11-03')).toBeCloseTo(0.4);
  });
  it('sin fecha de alta usa una ventana de 30 días', () => {
    expect(countdownProgress(15, null, '2026-11-03')).toBeCloseTo(0.5);
    expect(countdownProgress(90, null, '2026-11-03')).toBeCloseTo(0.06);
  });
  it('hoy es lleno', () => {
    expect(countdownProgress(0, null, '2026-11-03')).toBe(1);
  });
});
