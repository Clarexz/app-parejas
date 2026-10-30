import { formatStampDate } from '../stampDate';

describe('formatStampDate', () => {
  it('formatea día, número, mes y año en mayúsculas', () => {
    expect(formatStampDate(new Date(2026, 9, 29))).toBe('JUE 29 OCT 2026');
  });

  it('usa acentos en miércoles y sábado', () => {
    expect(formatStampDate(new Date(2026, 0, 7))).toBe('MIÉ 7 ENE 2026');
    expect(formatStampDate(new Date(2026, 11, 5))).toBe('SÁB 5 DIC 2026');
  });
});
