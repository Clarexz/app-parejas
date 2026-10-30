import { formatStampDate, formatStampIsoDate } from '../stampDate';

describe('formatStampDate', () => {
  it('formatea día, número, mes y año en mayúsculas', () => {
    expect(formatStampDate(new Date(2026, 9, 29))).toBe('JUE 29 OCT 2026');
  });

  it('usa acentos en miércoles y sábado', () => {
    expect(formatStampDate(new Date(2026, 0, 7))).toBe('MIÉ 7 ENE 2026');
    expect(formatStampDate(new Date(2026, 11, 5))).toBe('SÁB 5 DIC 2026');
  });
});

describe('formatStampIsoDate', () => {
  it('da el mismo formato que formatStampDate', () => {
    expect(formatStampIsoDate('2026-10-29')).toBe('JUE 29 OCT 2026');
    expect(formatStampIsoDate('2026-10-29')).toBe(formatStampDate(new Date(2026, 9, 29)));
  });

  it('usa acentos y acepta timestamps', () => {
    expect(formatStampIsoDate('2026-01-07')).toBe('MIÉ 7 ENE 2026');
    expect(formatStampIsoDate('2026-12-05T10:00:00Z')).toBe('SÁB 5 DIC 2026');
  });

  it('maneja bisiestos y fechas inválidas', () => {
    expect(formatStampIsoDate('2024-02-29')).toBe('JUE 29 FEB 2024');
    expect(formatStampIsoDate('2026-02-30')).toBe('');
    expect(formatStampIsoDate('nada')).toBe('');
  });
});
