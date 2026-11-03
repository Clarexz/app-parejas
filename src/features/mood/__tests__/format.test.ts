import { dayTitle } from '../format';

describe('dayTitle', () => {
  it('nombra hoy y ayer, y el resto con día de la semana', () => {
    expect(dayTitle('2026-11-03', '2026-11-03')).toBe('Hoy');
    expect(dayTitle('2026-11-02', '2026-11-03')).toBe('Ayer');
    expect(dayTitle('2026-10-26', '2026-11-03')).toBe('lunes 26 oct');
  });
});
