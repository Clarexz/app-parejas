import {
  addDays,
  addMonths,
  daysBetween,
  daysInMonth,
  daysTogether,
  elapsedBreakdown,
  formatBreakdown,
  formatDaysUntil,
  formatNumber,
  formatTimeIn,
  isLeapYear,
  parseIsoDate,
  todayIn,
  toIsoDate,
  upcomingMilestones,
} from '../dates';

describe('parseIsoDate / toIsoDate', () => {
  it('lee fechas válidas y prefijos de timestamp', () => {
    expect(parseIsoDate('2026-10-30')).toEqual({ year: 2026, month: 10, day: 30 });
    expect(parseIsoDate('2026-10-30T12:00:00Z')).toEqual({ year: 2026, month: 10, day: 30 });
    expect(parseIsoDate('2024-02-29')).toEqual({ year: 2024, month: 2, day: 29 });
  });

  it('rechaza fechas inexistentes o mal formadas', () => {
    expect(parseIsoDate('2026-02-29')).toBeNull();
    expect(parseIsoDate('2026-13-01')).toBeNull();
    expect(parseIsoDate('2026-00-10')).toBeNull();
    expect(parseIsoDate('2026-04-31')).toBeNull();
    expect(parseIsoDate('26-04-01')).toBeNull();
    expect(parseIsoDate('2026-04-01x')).toBeNull();
    expect(parseIsoDate('')).toBeNull();
    expect(parseIsoDate(null)).toBeNull();
    expect(parseIsoDate(undefined)).toBeNull();
  });

  it('toIsoDate rellena con ceros', () => {
    expect(toIsoDate({ year: 2026, month: 3, day: 5 })).toBe('2026-03-05');
  });
});

describe('bisiestos', () => {
  it('isLeapYear', () => {
    expect(isLeapYear(2000)).toBe(true);
    expect(isLeapYear(1900)).toBe(false);
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2026)).toBe(false);
  });

  it('daysInMonth', () => {
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2026, 4)).toBe(30);
    expect(daysInMonth(2026, 12)).toBe(31);
  });

  it('aniversarios de quien empezó un 29 de febrero', () => {
    const list = upcomingMilestones('2024-02-29', '2024-03-01', {
      kinds: ['anniversary'],
      limit: 4,
    });
    expect(list.map((m) => m.date)).toEqual([
      '2025-02-28',
      '2026-02-28',
      '2027-02-28',
      '2028-02-29',
    ]);
  });

  it('elapsedBreakdown con inicio 29 feb', () => {
    expect(elapsedBreakdown('2024-02-29', '2025-02-27')).toEqual({
      years: 0,
      months: 11,
      days: 29,
    });
    expect(elapsedBreakdown('2024-02-29', '2025-02-28')).toEqual({ years: 1, months: 0, days: 0 });
    expect(elapsedBreakdown('2024-02-29', '2028-02-29')).toEqual({ years: 4, months: 0, days: 0 });
  });
});

describe('addDays / addMonths', () => {
  it('addDays cruza mes, año y bisiesto', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2026-10-30', 0)).toBe('2026-10-30');
  });

  it('addMonths recorta al último día del mes y no acumula', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2026-01-31', 2)).toBe('2026-03-31');
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29');
    expect(addMonths('2026-01-31', 13)).toBe('2027-02-28');
    expect(addMonths('2026-10-15', 3)).toBe('2027-01-15');
  });

  it('addMonths con meses negativos', () => {
    expect(addMonths('2026-03-31', -1)).toBe('2026-02-28');
    expect(addMonths('2026-01-15', -1)).toBe('2025-12-15');
    expect(addMonths('2026-01-15', -13)).toBe('2024-12-15');
    expect(addMonths('2026-05-31', -12)).toBe('2025-05-31');
  });
});

describe('daysBetween', () => {
  it('cruza años y bisiestos', () => {
    expect(daysBetween('2025-12-31', '2026-01-01')).toBe(1);
    expect(daysBetween('2026-01-01', '2027-01-01')).toBe(365);
    expect(daysBetween('2024-01-01', '2025-01-01')).toBe(366);
    expect(daysBetween('2024-02-28', '2024-03-01')).toBe(2);
  });

  it('es negativo si to < from y 0 si son iguales', () => {
    expect(daysBetween('2026-10-30', '2026-10-20')).toBe(-10);
    expect(daysBetween('2026-10-30', '2026-10-30')).toBe(0);
  });

  it('da enteros exactos a través de cambios de horario de verano', () => {
    expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2);
    expect(daysBetween('2026-10-31', '2026-11-02')).toBe(2);
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2);
    expect(daysBetween('2026-03-01', '2026-04-01')).toBe(31);
    expect(daysBetween('2026-10-01', '2026-12-01')).toBe(61);
  });
});

describe('todayIn', () => {
  const instant = new Date('2026-10-30T05:30:00Z');

  it('respeta la zona horaria', () => {
    expect(todayIn('America/Mexico_City', instant)).toBe('2026-10-29');
    expect(todayIn('Asia/Tokyo', instant)).toBe('2026-10-30');
  });

  it('zonas extremas cerca de medianoche UTC', () => {
    const near = new Date('2026-10-30T11:00:00Z');
    expect(todayIn('Pacific/Kiritimati', near)).toBe('2026-10-31');
    expect(todayIn('Pacific/Pago_Pago', near)).toBe('2026-10-30');
    const early = new Date('2026-10-30T10:59:00Z');
    expect(todayIn('Pacific/Pago_Pago', early)).toBe('2026-10-29');
  });

  it('Nueva York alrededor del cambio de horario 2026-03-08', () => {
    // 07:00Z: antes del cambio sería 02:00 EST (aún 8 mar); 06:59Z es 01:59 EST.
    expect(todayIn('America/New_York', new Date('2026-03-08T04:59:00Z'))).toBe('2026-03-07');
    expect(todayIn('America/New_York', new Date('2026-03-08T05:00:00Z'))).toBe('2026-03-08');
    expect(todayIn('America/New_York', new Date('2026-03-08T07:00:00Z'))).toBe('2026-03-08');
    expect(todayIn('America/New_York', new Date('2026-03-09T03:59:00Z'))).toBe('2026-03-08');
    expect(todayIn('America/New_York', new Date('2026-03-09T04:00:00Z'))).toBe('2026-03-09');
  });

  it('zona inválida cae a Ciudad de México', () => {
    expect(todayIn('Marte/Base', instant)).toBe('2026-10-29');
    expect(todayIn('', instant)).toBe('2026-10-29');
  });

  it('sin segundo argumento devuelve una fecha válida', () => {
    expect(parseIsoDate(todayIn('America/Mexico_City'))).not.toBeNull();
  });
});

describe('daysTogether', () => {
  it('el aniversario es el día 1', () => {
    expect(daysTogether('2026-10-30', '2026-10-30')).toBe(1);
    expect(daysTogether('2026-10-30', '2026-10-31')).toBe(2);
  });

  it('en el futuro es 0', () => {
    expect(daysTogether('2026-11-01', '2026-10-30')).toBe(0);
  });

  it('ejemplo realista', () => {
    expect(daysTogether('2023-02-14', '2026-10-30')).toBe(1355);
  });
});

describe('elapsedBreakdown', () => {
  it('ejemplo realista', () => {
    expect(elapsedBreakdown('2023-02-14', '2026-10-30')).toEqual({ years: 3, months: 8, days: 16 });
  });

  it('31 ene → 28 feb es un mes', () => {
    expect(elapsedBreakdown('2026-01-31', '2026-02-28')).toEqual({ years: 0, months: 1, days: 0 });
    expect(elapsedBreakdown('2026-01-31', '2026-02-27')).toEqual({ years: 0, months: 0, days: 27 });
    expect(elapsedBreakdown('2026-01-31', '2026-03-01')).toEqual({ years: 0, months: 1, days: 1 });
  });

  it('el mismo día es cero y el futuro también', () => {
    expect(elapsedBreakdown('2026-10-30', '2026-10-30')).toEqual({ years: 0, months: 0, days: 0 });
    expect(elapsedBreakdown('2026-11-30', '2026-10-30')).toEqual({ years: 0, months: 0, days: 0 });
  });

  it('exactamente años cumplidos', () => {
    expect(elapsedBreakdown('2023-02-14', '2026-02-14')).toEqual({ years: 3, months: 0, days: 0 });
  });
});

describe('upcomingMilestones', () => {
  const start = '2023-02-14';
  const today = '2026-10-30'; // día 1355

  it('por defecto da 3 hitos ordenados por fecha', () => {
    const list = upcomingMilestones(start, today);
    expect(list).toHaveLength(3);
    const dates = list.map((m) => m.date);
    expect(dates).toEqual([...dates].sort());
    expect(list[0]).toMatchObject({ kind: 'monthiversary', value: 45, date: '2026-11-14' });
    expect(list[0].daysUntil).toBe(15);
    expect(list[0].label).toBe('3 años y 9 meses');
  });

  it('respeta limit y kinds', () => {
    expect(upcomingMilestones(start, today, { limit: 1 })).toHaveLength(1);
    expect(upcomingMilestones(start, today, { limit: 0 })).toEqual([]);
    const days = upcomingMilestones(start, today, { kinds: ['days'], limit: 3 });
    expect(days.map((m) => m.value)).toEqual([1500, 2000, 2222]);
    expect(days.every((m) => m.kind === 'days')).toBe(true);
  });

  it('el día N cae en start + N - 1', () => {
    const d100 = upcomingMilestones('2026-10-30', '2026-10-30', { kinds: ['days'], limit: 1 })[0];
    expect(d100.value).toBe(100);
    expect(d100.date).toBe(addDays('2026-10-30', 99));
    expect(d100.date).toBe('2027-02-06');
    expect(d100.label).toBe('100 días');
  });

  it('incluye el hito de hoy con daysUntil 0', () => {
    const list = upcomingMilestones('2026-10-30', '2027-02-06', { kinds: ['days'], limit: 1 });
    expect(list[0]).toMatchObject({ value: 100, daysUntil: 0 });
    // y un día después ya no
    const after = upcomingMilestones('2026-10-30', '2027-02-07', { kinds: ['days'], limit: 1 });
    expect(after[0].value).toBe(200);
  });

  it('labels con separador de miles', () => {
    const list = upcomingMilestones('2026-10-30', '2026-10-30', { kinds: ['days'], limit: 12 });
    const labels = list.map((m) => m.label);
    expect(labels).toContain('1,000 días');
    expect(labels).toContain('1,111 días');
    expect(labels).toContain('1,500 días');
    expect(labels.indexOf('1,000 días')).toBeLessThan(labels.indexOf('1,111 días'));
  });

  it('los repetidos 2222…9999 aparecen y no se duplican', () => {
    const list = upcomingMilestones('2000-01-01', '2000-01-01', { kinds: ['days'], limit: 40 });
    const values = list.map((m) => m.value);
    expect(values).toContain(2222);
    expect(values).toContain(9999);
    expect(new Set(values).size).toBe(values.length);
    expect(values.slice(0, 12)).toEqual([
      100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1111, 1500,
    ]);
  });

  it('cumplemés omite múltiplos de 12 (salen como aniversario)', () => {
    const months = upcomingMilestones('2025-01-15', '2025-01-15', {
      kinds: ['monthiversary'],
      limit: 13,
    }).map((m) => m.value);
    expect(months).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14]);
    const all = upcomingMilestones('2025-01-15', '2025-12-10', {
      kinds: ['monthiversary', 'anniversary'],
      limit: 2,
    });
    expect(all[0]).toMatchObject({ kind: 'monthiversary', value: 12 - 1, date: '2025-12-15' });
    expect(all[1]).toMatchObject({ kind: 'anniversary', value: 1, date: '2026-01-15' });
    expect(all[1].label).toBe('1 año');
  });

  it('label del cumplemés con 12 meses o más usa años y meses', () => {
    const l = upcomingMilestones('2025-01-15', '2026-02-01', {
      kinds: ['monthiversary'],
      limit: 2,
    });
    expect(l.map((m) => [m.value, m.label])).toEqual([
      [13, '1 año y 1 mes'],
      [14, '1 año y 2 meses'],
    ]);
    const m25 = upcomingMilestones('2025-01-15', '2027-02-10', {
      kinds: ['monthiversary'],
      limit: 1,
    });
    expect(m25[0]).toMatchObject({ value: 25, label: '2 años y 1 mes' });
  });

  it('labels de meses y años en singular y plural', () => {
    const first = upcomingMilestones('2026-10-30', '2026-10-30', {
      kinds: ['monthiversary'],
      limit: 2,
    });
    expect(first.map((m) => m.label)).toEqual(['1 mes', '2 meses']);
    const years = upcomingMilestones('2026-10-30', '2026-10-30', {
      kinds: ['anniversary'],
      limit: 3,
    });
    expect(years.map((m) => m.label)).toEqual(['1 año', '2 años', '3 años']);
  });

  it('empate real entre días y cumplemés', () => {
    // Día 100 = start + 99. Con start 2026-01-01 → 2026-04-10; cumplemés 3 = 2026-04-01.
    // Con start 2025-12-31 y cumplemés 4 = 2026-04-30; día 100 = 2026-04-08. Se busca por fuerza bruta.
    let found = false;
    for (let i = 0; i < 400 && !found; i++) {
      const s = addDays('2024-01-01', i);
      const list = upcomingMilestones(s, s, { limit: 60 });
      for (let j = 1; j < list.length; j++) {
        if (list[j].date === list[j - 1].date) {
          found = true;
          const order = ['anniversary', 'days', 'monthiversary'];
          expect(order.indexOf(list[j - 1].kind)).toBeLessThan(order.indexOf(list[j].kind));
        }
      }
    }
    expect(found).toBe(true);
  });

  it('si today < start calcula igual sin incluir el día 1', () => {
    const list = upcomingMilestones('2026-12-01', '2026-10-30', { limit: 3 });
    expect(list.map((m) => m.kind)).toEqual(['monthiversary', 'monthiversary', 'monthiversary']);
    expect(list[0]).toMatchObject({ value: 1, date: '2027-01-01' });
    const d = upcomingMilestones('2026-12-01', '2026-10-30', { kinds: ['days'], limit: 1 });
    expect(d[0]).toMatchObject({ value: 100, date: '2027-03-10' });
    expect(list.every((m) => m.daysUntil > 0)).toBe(true);
  });
});

describe('formatos', () => {
  it('formatNumber', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(999)).toBe('999');
    expect(formatNumber(1000)).toBe('1,000');
    expect(formatNumber(1284)).toBe('1,284');
    expect(formatNumber(1234567)).toBe('1,234,567');
    expect(formatNumber(-1284)).toBe('-1,284');
    expect(formatNumber(-5)).toBe('-5');
  });

  it('formatBreakdown', () => {
    expect(formatBreakdown({ years: 2, months: 8, days: 16 })).toBe('2 años, 8 meses y 16 días');
    expect(formatBreakdown({ years: 1, months: 1, days: 1 })).toBe('1 año, 1 mes y 1 día');
    expect(formatBreakdown({ years: 0, months: 3, days: 1 })).toBe('3 meses y 1 día');
    expect(formatBreakdown({ years: 1, months: 0, days: 5 })).toBe('1 año y 5 días');
    expect(formatBreakdown({ years: 0, months: 0, days: 9 })).toBe('9 días');
    expect(formatBreakdown({ years: 4, months: 0, days: 0 })).toBe('4 años');
    expect(formatBreakdown({ years: 0, months: 1, days: 0 })).toBe('1 mes');
    expect(formatBreakdown({ years: 0, months: 0, days: 0 })).toBe('');
  });

  it('formatDaysUntil', () => {
    expect(formatDaysUntil(0)).toBe('hoy');
    expect(formatDaysUntil(1)).toBe('mañana');
    expect(formatDaysUntil(15)).toBe('en 15 días');
    expect(formatDaysUntil(1500)).toBe('en 1,500 días');
  });
});

describe('formatTimeIn', () => {
  it('da la hora de 12 h en la zona dada', () => {
    // 2026-10-30 03:41 UTC = 21:41 del día 29 en Ciudad de México (UTC-6, sin horario de verano).
    expect(formatTimeIn('America/Mexico_City', new Date('2026-10-30T03:41:00Z'))).toBe(
      '9:41 p. m.',
    );
    expect(formatTimeIn('America/Mexico_City', new Date('2026-10-30T15:05:00Z'))).toBe(
      '9:05 a. m.',
    );
  });

  it('medianoche es 12:xx a. m. y mediodía 12:xx p. m.', () => {
    expect(formatTimeIn('UTC', new Date('2026-10-30T00:07:00Z'))).toBe('12:07 a. m.');
    expect(formatTimeIn('UTC', new Date('2026-10-30T12:30:00Z'))).toBe('12:30 p. m.');
  });

  it('zona inválida cae a Ciudad de México', () => {
    expect(formatTimeIn('No/Existe', new Date('2026-10-30T03:41:00Z'))).toBe('9:41 p. m.');
  });
});
