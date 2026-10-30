import { dayHeading, homeSummary, milestoneLabel, milestoneStamp } from '../home';

describe('homeSummary', () => {
  it('sin fecha o con fecha inválida → none', () => {
    expect(homeSummary(null, '2026-10-30')).toEqual({ state: 'none' });
    expect(homeSummary('2026-13-45', '2026-10-30')).toEqual({ state: 'none' });
  });

  it('aniversario futuro → cuenta los días que faltan', () => {
    expect(homeSummary('2026-11-04', '2026-10-30')).toEqual({ state: 'future', daysUntil: 5 });
  });

  it('cuenta días, desglose y un hito por tipo ordenados por fecha', () => {
    const s = homeSummary('2023-02-14', '2026-10-30');
    if (s.state !== 'counting') throw new Error('esperaba counting');
    expect(s.days).toBe(1355);
    expect(s.breakdown).toBe('3 años, 8 meses y 16 días');
    expect(s.todayStamp).toBeNull();
    expect(s.upcoming.map((m) => m.kind).sort()).toEqual(['anniversary', 'days', 'monthiversary']);
    const dates = s.upcoming.map((m) => m.date);
    expect([...dates].sort()).toEqual(dates);
    expect(s.upcoming.every((m) => m.daysUntil > 0)).toBe(true);
  });

  it('el primer día no tiene desglose', () => {
    const s = homeSummary('2026-10-30', '2026-10-30');
    if (s.state !== 'counting') throw new Error('esperaba counting');
    expect(s.days).toBe(1);
    expect(s.breakdown).toBe('');
  });

  it('hito de hoy: sello y se excluye de lo que viene', () => {
    // Día 1000 = aniversario + 999 días.
    const s = homeSummary('2023-02-14', '2025-11-09');
    if (s.state !== 'counting') throw new Error('esperaba counting');
    expect(s.days).toBe(1000);
    expect(s.todayStamp).toBe('HOY: 1,000 DÍAS');
    expect(s.upcoming.every((m) => m.daysUntil > 0)).toBe(true);
  });

  it('cumpleaños de relación y cumplemés tienen su sello', () => {
    const a = homeSummary('2023-02-14', '2026-02-14');
    const m = homeSummary('2023-02-14', '2026-10-14');
    if (a.state !== 'counting' || m.state !== 'counting') throw new Error('esperaba counting');
    expect(a.todayStamp).toBe('HOY: 3 AÑOS');
    expect(m.todayStamp).toBe('HOY: CUMPLEMÉS');
  });
});

describe('rótulos', () => {
  it('milestoneLabel antepone Cumplemés', () => {
    expect(
      milestoneLabel({ kind: 'monthiversary', value: 8, date: '', daysUntil: 1, label: '8 meses' }),
    ).toBe('Cumplemés: 8 meses');
    expect(
      milestoneLabel({ kind: 'days', value: 1500, date: '', daysUntil: 1, label: '1,500 días' }),
    ).toBe('1,500 días');
  });

  it('milestoneStamp de 1 año', () => {
    expect(
      milestoneStamp({ kind: 'anniversary', value: 1, date: '', daysUntil: 0, label: '1 año' }),
    ).toBe('HOY: 1 AÑO');
  });

  it('dayHeading', () => {
    expect(dayHeading('2026-10-30', '2026-10-30')).toBe('HOY');
    expect(dayHeading('2026-10-29', '2026-10-30')).toBe('AYER');
    expect(dayHeading('2026-10-23', '2026-10-30')).toBe('VIE 23 OCT 2026');
  });
});
