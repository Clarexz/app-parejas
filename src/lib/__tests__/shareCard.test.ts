import { daysLabel, shareCardCopy } from '../shareCard';

describe('daysLabel', () => {
  it('singular y plural', () => {
    expect(daysLabel(1)).toBe('1 día');
    expect(daysLabel(12)).toBe('12 días');
    expect(daysLabel(1284)).toBe('1,284 días');
  });
});

describe('shareCardCopy', () => {
  it('racha: singular', () => {
    const c = shareCardCopy({ kind: 'streak', days: 1 });
    expect(c.value).toBe('1');
    expect(c.unit).toBe('día');
    expect(c.line).toBe('Llevamos 1 día contestando juntos');
  });

  it('racha: plural', () => {
    const c = shareCardCopy({ kind: 'streak', days: 12 });
    expect(c.label).toBe('Racha');
    expect(c.unit).toBe('días');
    expect(c.line).toBe('Llevamos 12 días contestando juntos');
    expect(c.text).toBe('Llevamos 12 días contestando juntos. Hecho en ahorita.');
  });

  it('tiempo juntos: número con comas y desglose', () => {
    const c = shareCardCopy({
      kind: 'together',
      days: 1284,
      breakdown: '3 años, 6 meses y 2 días',
    });
    expect(c.value).toBe('1,284');
    expect(c.line).toBe('3 años, 6 meses y 2 días');
    expect(c.text).toContain('Llevamos 1,284 días juntos (3 años, 6 meses y 2 días)');
  });

  it('tiempo juntos: primer día y sin desglose', () => {
    const c = shareCardCopy({ kind: 'together', days: 1, breakdown: '' });
    expect(c.unit).toBe('día');
    expect(c.line).toBe('Hoy empieza todo');
    expect(c.text).toBe('Llevamos 1 día juntos. Hecho en ahorita.');
  });

  it('juego: porcentaje y conteo', () => {
    const c = shareCardCopy({
      kind: 'game',
      pct: 87.5,
      matches: 7,
      total: 8,
      gameName: 'Quién es más probable',
    });
    expect(c.label).toBe('Quién es más probable');
    expect(c.value).toBe('88');
    expect(c.unit).toBe('%');
    expect(c.line).toBe('Coincidimos en 7 de 8');
    expect(c.text).toContain('coincidimos en 88%');
  });

  it('no truena con valores raros', () => {
    expect(shareCardCopy({ kind: 'streak', days: NaN }).value).toBe('0');
    expect(
      shareCardCopy({ kind: 'game', pct: 140, matches: 1, total: 1, gameName: 'X' }).value,
    ).toBe('100');
  });
});
