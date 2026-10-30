import { addDays } from '../dates';
import { computeStreak, isDayComplete, REPAIR_WINDOW_DAYS } from '../streak';

describe('isDayComplete', () => {
  it('necesita dos respuestas', () => {
    expect(isDayComplete('2026-10-10', [])).toBe(false);
    expect(isDayComplete('2026-10-10', ['2026-10-10'])).toBe(false);
    expect(isDayComplete('2026-10-10', ['2026-10-10', null])).toBe(false);
    expect(isDayComplete('2026-10-10', [null, null])).toBe(false);
  });

  it('completo el mismo día', () => {
    expect(isDayComplete('2026-10-10', ['2026-10-10', '2026-10-10'])).toBe(true);
  });

  it('reparación hasta 7 días después, no más', () => {
    expect(REPAIR_WINDOW_DAYS).toBe(7);
    expect(isDayComplete('2026-10-10', ['2026-10-10', '2026-10-17'])).toBe(true);
    expect(isDayComplete('2026-10-10', ['2026-10-10', '2026-10-18'])).toBe(false);
  });

  it('cruza mes, año y bisiesto', () => {
    expect(isDayComplete('2026-12-28', ['2026-12-28', '2027-01-04'])).toBe(true);
    expect(isDayComplete('2026-12-28', ['2026-12-28', '2027-01-05'])).toBe(false);
    expect(isDayComplete('2028-02-25', ['2028-02-25', '2028-03-03'])).toBe(true);
    expect(isDayComplete('2028-02-25', ['2028-02-25', '2028-03-04'])).toBe(false);
    expect(isDayComplete('2027-02-25', ['2027-02-25', '2027-03-04'])).toBe(true);
    expect(isDayComplete('2027-02-25', ['2027-02-25', '2027-03-05'])).toBe(false);
  });
});

const base = { today: '2026-10-30', startDay: '2026-01-01', memberCount: 2 };

describe('computeStreak', () => {
  it('sin días completos', () => {
    expect(computeStreak({ ...base, completeDays: [] })).toEqual({
      current: 0,
      best: 0,
      todayDone: false,
      missingDays: [
        '2026-10-23',
        '2026-10-24',
        '2026-10-25',
        '2026-10-26',
        '2026-10-27',
        '2026-10-28',
        '2026-10-29',
      ],
    });
  });

  it('racha que termina hoy', () => {
    const r = computeStreak({
      ...base,
      completeDays: ['2026-10-28', '2026-10-29', '2026-10-30'],
    });
    expect(r).toMatchObject({ current: 3, best: 3, todayDone: true });
  });

  it('hoy incompleto: la racha termina ayer y no se rompe', () => {
    const r = computeStreak({
      ...base,
      completeDays: ['2026-10-27', '2026-10-28', '2026-10-29'],
    });
    expect(r).toMatchObject({ current: 3, best: 3, todayDone: false });
  });

  it('hueco ayer: la racha actual es 0 pero se conserva el récord', () => {
    const r = computeStreak({
      ...base,
      completeDays: ['2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27', '2026-10-30'],
    });
    expect(r).toMatchObject({ current: 1, best: 4, todayDone: true });
    expect(r.missingDays).toEqual(['2026-10-23', '2026-10-28', '2026-10-29']);
    const r2 = computeStreak({
      ...base,
      completeDays: ['2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27'],
    });
    expect(r2).toMatchObject({ current: 0, best: 4, todayDone: false });
  });

  it('reparar un hueco reúne las dos rachas', () => {
    const days = ['2026-10-25', '2026-10-26', '2026-10-28', '2026-10-29', '2026-10-30'];
    expect(computeStreak({ ...base, completeDays: days })).toMatchObject({ current: 3, best: 3 });
    const repaired = computeStreak({ ...base, completeDays: [...days, '2026-10-27'] });
    expect(repaired).toMatchObject({ current: 6, best: 6 });
    expect(repaired.missingDays).toEqual(['2026-10-23', '2026-10-24']);
  });

  it('acepta entrada desordenada y con duplicados', () => {
    const r = computeStreak({
      ...base,
      completeDays: ['2026-10-30', '2026-10-28', '2026-10-29', '2026-10-29', '2026-10-30'],
    });
    expect(r).toMatchObject({ current: 3, best: 3, todayDone: true });
  });

  it('ignora días futuros', () => {
    const r = computeStreak({ ...base, completeDays: ['2026-10-30', '2026-10-31', '2026-11-01'] });
    expect(r).toMatchObject({ current: 1, best: 1, todayDone: true });
  });

  it('cruza fin de mes y de año', () => {
    const r = computeStreak({
      ...base,
      today: '2027-01-02',
      completeDays: ['2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02'],
    });
    expect(r).toMatchObject({ current: 4, best: 4 });
    expect(r.missingDays).toEqual(['2026-12-26', '2026-12-27', '2026-12-28', '2026-12-29']);
  });

  it('cruza febrero bisiesto y no bisiesto', () => {
    const leap = computeStreak({
      ...base,
      today: '2028-03-01',
      completeDays: ['2028-02-28', '2028-02-29', '2028-03-01'],
    });
    expect(leap).toMatchObject({ current: 3, best: 3 });
    const common = computeStreak({
      ...base,
      today: '2027-03-01',
      completeDays: ['2027-02-28', '2027-03-01'],
    });
    expect(common).toMatchObject({ current: 2, best: 2 });
    const gap = computeStreak({
      ...base,
      today: '2027-03-01',
      completeDays: ['2027-02-27', '2027-03-01'],
    });
    expect(gap).toMatchObject({ current: 1, best: 1 });
    expect(gap.missingDays).toContain('2027-02-28');
  });

  it('startDay reciente recorta los días por reparar', () => {
    const r = computeStreak({ ...base, startDay: '2026-10-28', completeDays: [] });
    expect(r.missingDays).toEqual(['2026-10-28', '2026-10-29']);
    const today = computeStreak({ ...base, startDay: '2026-10-30', completeDays: [] });
    expect(today.missingDays).toEqual([]);
    const none = computeStreak({ ...base, startDay: null, completeDays: [] });
    expect(none.missingDays).toEqual([]);
  });

  it('startDay antiguo no amplía la ventana de 7 días', () => {
    const r = computeStreak({ ...base, startDay: '2020-01-01', completeDays: [] });
    expect(r.missingDays).toHaveLength(7);
    expect(r.missingDays[0]).toBe(addDays('2026-10-30', -7));
  });

  it('sin 2 miembros no hay días por reparar', () => {
    expect(computeStreak({ ...base, memberCount: 1, completeDays: [] }).missingDays).toEqual([]);
    expect(computeStreak({ ...base, memberCount: 0, completeDays: [] }).missingDays).toEqual([]);
  });
});
