import {
  findOverlap,
  maxVisitEnd,
  pendingVisitEvents,
  rangesOverlap,
  validateVisit,
  visitCalendar,
  visitLength,
  visitRangeLabel,
  visitStats,
  visitYears,
  type VisitLike,
} from '../visits';

const v = (id: string, start_date: string, end_date: string, event_id?: string): VisitLike => ({
  id,
  start_date,
  end_date,
  event_id,
});

describe('visitLength', () => {
  it('cuenta llegada y despedida', () => {
    expect(visitLength(v('a', '2026-10-12', '2026-10-12'))).toBe(1);
    expect(visitLength(v('a', '2026-10-12', '2026-10-18'))).toBe(7);
  });
  it('cruza fin de año y año bisiesto', () => {
    expect(visitLength(v('a', '2026-12-30', '2027-01-02'))).toBe(4);
    expect(visitLength(v('a', '2028-02-27', '2028-03-01'))).toBe(4);
    expect(visitLength(v('a', '2027-02-27', '2027-03-01'))).toBe(3);
  });
});

describe('rangesOverlap / findOverlap', () => {
  it('extremos incluidos', () => {
    expect(
      rangesOverlap(
        { start: '2026-10-01', end: '2026-10-05' },
        { start: '2026-10-05', end: '2026-10-09' },
      ),
    ).toBe(true);
    expect(
      rangesOverlap(
        { start: '2026-10-01', end: '2026-10-04' },
        { start: '2026-10-05', end: '2026-10-09' },
      ),
    ).toBe(false);
  });
  it('findOverlap ignora la propia visita', () => {
    const list = [v('a', '2026-10-01', '2026-10-05'), v('b', '2026-10-10', '2026-10-12')];
    expect(findOverlap(list, { start: '2026-10-04', end: '2026-10-06' })?.id).toBe('a');
    expect(findOverlap(list, { start: '2026-10-04', end: '2026-10-06' }, 'a')).toBeNull();
    expect(findOverlap(list, { start: '2026-10-06', end: '2026-10-09' })).toBeNull();
  });
});

describe('validateVisit', () => {
  const today = '2026-10-31';
  it('acepta rangos normales y visitas en curso', () => {
    expect(validateVisit({ start: '2026-10-12', end: '2026-10-18', today })).toBeNull();
    expect(validateVisit({ start: today, end: today, today })).toBeNull();
    expect(validateVisit({ start: '2026-10-30', end: '2026-11-05', today })).toBeNull();
  });
  it('rechaza lo inválido', () => {
    expect(validateVisit({ start: '2026-11-01', end: '2026-11-02', today })).toBe('invalid_visit');
    expect(validateVisit({ start: '2026-10-18', end: '2026-10-12', today })).toBe('invalid_visit');
    expect(validateVisit({ start: null, end: '2026-10-12', today })).toBe('invalid_visit');
    expect(validateVisit({ start: '2026-02-30', end: '2026-03-01', today })).toBe('invalid_visit');
  });
  it('máximo 366 días', () => {
    expect(validateVisit({ start: '2025-10-31', end: '2026-10-31', today })).toBeNull(); // 366
    expect(validateVisit({ start: '2025-10-30', end: '2026-10-31', today })).toBe('invalid_visit'); // 367
    expect(maxVisitEnd('2025-10-31')).toBe('2026-10-31');
  });
});

describe('visitStats', () => {
  const today = '2026-10-31';

  it('sin visitas ni aniversario', () => {
    const s = visitStats([], { start: null, today });
    expect(s).toMatchObject({
      count: 0,
      daysTogether: 0,
      daysApart: 0,
      pctTogether: null,
      longestVisit: null,
      longestGap: null,
      averageGap: null,
      current: null,
      last: null,
      daysSinceLast: null,
    });
  });

  it('sin visitas pero con aniversario: todo separados', () => {
    const s = visitStats([], { start: '2026-10-22', today });
    expect(s.daysApart).toBe(10);
    expect(s.pctTogether).toBe(0);
    expect(s.daysSinceLast).toBeNull();
  });

  it('aniversario futuro y sin visitas no mide nada', () => {
    const s = visitStats([], { start: '2027-01-01', today });
    expect(s.daysApart).toBe(0);
    expect(s.pctTogether).toBeNull();
  });

  it('calcula juntos, separados, huecos y porcentaje', () => {
    // periodo 2026-10-01..2026-10-31 = 31 días
    const visits = [
      v('a', '2026-10-03', '2026-10-05'), // 3
      v('b', '2026-10-10', '2026-10-19'), // 10, hueco 4
      v('c', '2026-10-21', '2026-10-22'), // 2, hueco 1
    ];
    const s = visitStats(visits, { start: '2026-10-01', today });
    expect(s.count).toBe(3);
    expect(s.daysTogether).toBe(15);
    expect(s.daysApart).toBe(16);
    expect(s.pctTogether).toBe(48);
    expect(s.longestVisit).toBe(10);
    expect(s.longestGap).toBe(4);
    expect(s.averageGap).toBe(3); // (4 + 1) / 2 = 2.5 -> 3
    expect(s.last?.id).toBe('c');
    expect(s.current).toBeNull();
    expect(s.daysSinceLast).toBe(9);
  });

  it('el periodo arranca en la primera visita si el aniversario es posterior o no hay', () => {
    const visits = [v('a', '2026-10-20', '2026-10-22')];
    const a = visitStats(visits, { start: null, today });
    expect(a.daysTogether + a.daysApart).toBe(12);
    const b = visitStats(visits, { start: '2026-10-25', today });
    expect(b.daysTogether + b.daysApart).toBe(12);
    // aniversario anterior: se cuenta desde el aniversario
    const c = visitStats(visits, { start: '2026-10-01', today });
    expect(c.daysTogether + c.daysApart).toBe(31);
  });

  it('visita en curso: cuenta hasta hoy y está junta', () => {
    const visits = [v('a', '2026-10-28', '2026-11-04')];
    const s = visitStats(visits, { start: '2026-10-01', today });
    expect(s.current?.id).toBe('a');
    expect(s.daysTogether).toBe(4);
    expect(s.longestVisit).toBe(4);
    expect(s.daysSinceLast).toBe(0);
    expect(s.daysApart).toBe(27);
  });

  it('visita que termina hoy está en curso', () => {
    const s = visitStats([v('a', '2026-10-29', today)], { start: null, today });
    expect(s.current?.id).toBe('a');
    expect(s.pctTogether).toBe(100);
  });

  it('ignora visitas que empiezan después de hoy', () => {
    const s = visitStats([v('a', '2026-11-05', '2026-11-08')], { start: null, today });
    expect(s.count).toBe(0);
    expect(s.last).toBeNull();
  });

  it('cambio de año y bisiesto', () => {
    const visits = [v('a', '2027-12-29', '2028-01-02'), v('b', '2028-02-27', '2028-03-01')];
    const s = visitStats(visits, { start: '2027-12-01', today: '2028-03-10' });
    expect(s.daysTogether).toBe(5 + 4);
    expect(s.longestGap).toBe(55); // 3 ene .. 26 feb (2028 bisiesto): 29 + 26 = 55
    expect(s.daysSinceLast).toBe(9);
    expect(s.daysApart + s.daysTogether).toBe(101);
  });

  it('visitas pegadas no generan hueco', () => {
    const s = visitStats([v('a', '2026-10-01', '2026-10-03'), v('b', '2026-10-04', '2026-10-06')], {
      start: null,
      today,
    });
    expect(s.longestGap).toBeNull();
    expect(s.averageGap).toBeNull();
  });

  it('no depende del orden de entrada', () => {
    const visits = [v('b', '2026-10-10', '2026-10-12'), v('a', '2026-10-01', '2026-10-02')];
    const s = visitStats(visits, { start: null, today });
    expect(s.longestGap).toBe(7);
    expect(s.last?.id).toBe('b');
  });
});

describe('pendingVisitEvents', () => {
  const today = '2026-10-31';
  const ev = (id: string, date: string, kind = 'visit') => ({ id, kind, date, title: id });
  it('solo visitas pasadas sin visita', () => {
    const events = [
      ev('past', '2026-10-12'),
      ev('future', '2026-11-12'),
      ev('custom', '2026-10-10', 'custom'),
      ev('today', today),
    ];
    expect(pendingVisitEvents(events, [], today).map((e) => e.id)).toEqual(['today', 'past']);
  });
  it('descarta las ligadas y las que caen dentro de una visita', () => {
    const events = [
      ev('linked', '2026-09-01'),
      ev('inside', '2026-10-14'),
      ev('free', '2026-08-01'),
    ];
    const visits = [
      v('x', '2026-09-01', '2026-09-03', 'linked'),
      v('y', '2026-10-12', '2026-10-18'),
    ];
    expect(pendingVisitEvents(events, visits, today).map((e) => e.id)).toEqual(['free']);
  });
});

describe('visitCalendar / visitYears', () => {
  it('marca juntos, hoy y futuro', () => {
    const cal = visitCalendar([v('a', '2026-10-29', '2026-11-02')], 2026, '2026-10-31');
    expect(cal).toHaveLength(12);
    const oct = cal[9]!;
    expect(oct.days).toHaveLength(31);
    expect(oct.days.filter((d) => d.together).map((d) => d.day)).toEqual([29, 30, 31]);
    expect(oct.days.find((d) => d.today)?.day).toBe(31);
    expect(oct.days.find((d) => d.day === 30)?.future).toBe(false);
    expect(cal[10]!.days.filter((d) => d.together).map((d) => d.day)).toEqual([1, 2]);
    expect(cal[10]!.days[0]?.future).toBe(true);
  });
  it('febrero bisiesto y desfase de semana (lunes primero)', () => {
    const cal = visitCalendar([], 2028, '2026-10-31');
    expect(cal[1]!.days).toHaveLength(29);
    expect(visitCalendar([], 2027, '2026-10-31')[1]!.days).toHaveLength(28);
    // 1 ene 2026 fue jueves -> 3 casillas vacías; 1 oct 2026 fue jueves
    expect(visitCalendar([], 2026, '2026-10-31')[0]!.offset).toBe(3);
    // 1 ene 2024 fue lunes
    expect(visitCalendar([], 2024, '2026-10-31')[0]!.offset).toBe(0);
    // 1 sep 2024 fue domingo
    expect(visitCalendar([], 2024, '2026-10-31')[8]!.offset).toBe(6);
  });
  it('años sin huecos e incluye el actual', () => {
    expect(visitYears([], '2026-10-31')).toEqual([2026]);
    expect(
      visitYears(
        [v('a', '2024-05-01', '2024-05-03'), v('b', '2026-12-30', '2027-01-02')],
        '2026-10-31',
      ),
    ).toEqual([2024, 2025, 2026, 2027]);
  });
});

describe('visitRangeLabel', () => {
  it('formatos', () => {
    expect(visitRangeLabel(v('a', '2026-10-12', '2026-10-18'))).toBe('12–18 oct 2026');
    expect(visitRangeLabel(v('a', '2026-09-28', '2026-10-02'))).toBe('28 sep – 2 oct 2026');
    expect(visitRangeLabel(v('a', '2026-10-12', '2026-10-12'))).toBe('12 oct 2026');
    expect(visitRangeLabel(v('a', '2026-12-28', '2027-01-03'))).toBe('28 dic 2026 – 3 ene 2027');
  });
});
