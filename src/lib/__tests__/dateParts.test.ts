import { formatLongDate, isoDateToParts, optionalIsoDate, partsToIsoDate } from '../dateParts';

const p = (day: string, month: string, year: string) => ({ day, month, year });

describe('partsToIsoDate', () => {
  it('acepta fechas reales', () => {
    expect(partsToIsoDate(p('14', '2', '2023'))).toEqual({ ok: true, value: '2023-02-14' });
    expect(partsToIsoDate(p('29', '2', '2024'))).toEqual({ ok: true, value: '2024-02-29' });
  });
  it('rechaza fechas inexistentes', () => {
    expect(partsToIsoDate(p('31', '2', '2023')).ok).toBe(false);
    expect(partsToIsoDate(p('29', '2', '2023')).ok).toBe(false);
    expect(partsToIsoDate(p('0', '2', '2023')).ok).toBe(false);
    expect(partsToIsoDate(p('1', '13', '2023')).ok).toBe(false);
  });
  it('rechaza años mal escritos o anteriores a 1900', () => {
    expect(partsToIsoDate(p('1', '1', '23')).ok).toBe(false);
    expect(partsToIsoDate(p('1', '1', '1899')).ok).toBe(false);
    expect(partsToIsoDate(p('', '1', '2000')).ok).toBe(false);
  });
  it('respeta notAfter y notBefore', () => {
    const now = new Date(2026, 9, 30);
    expect(partsToIsoDate(p('30', '10', '2026'), { notAfter: now }).ok).toBe(true);
    expect(partsToIsoDate(p('31', '10', '2026'), { notAfter: now }).ok).toBe(false);
    expect(partsToIsoDate(p('1', '1', '2000'), { notBefore: new Date(2010, 0, 1) }).ok).toBe(false);
  });
});

describe('isoDateToParts / formatLongDate', () => {
  it('convierte', () => {
    expect(isoDateToParts('2023-02-04')).toEqual(p('4', '2', '2023'));
    expect(isoDateToParts(null)).toEqual(p('', '', ''));
  });
  it('formatea', () => {
    expect(formatLongDate('2023-02-14')).toBe('14 de febrero de 2023');
    expect(formatLongDate('2023-12-01')).toBe('1 de diciembre de 2023');
  });
});

describe('optionalIsoDate', () => {
  it('vacío es null y lleno se valida', () => {
    expect(optionalIsoDate(p('', '', ''))).toEqual({ ok: true, value: null });
    expect(optionalIsoDate(p('14', '2', '2023'))).toEqual({ ok: true, value: '2023-02-14' });
    expect(optionalIsoDate(p('14', '', '')).ok).toBe(false);
  });
});
