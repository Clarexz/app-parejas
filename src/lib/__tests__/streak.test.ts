import { addDays } from '../dates';
import { computeStreak, REPAIRS_PER_MONTH, type StreakCompletion } from '../streak';

const START = '2026-01-01';

/** Días completos el mismo día. */
const same = (...days: string[]): StreakCompletion[] =>
  days.map((day) => ({ day, completedOn: day }));
/** Rango de días consecutivos [from, to]. */
function range(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}
const run = (
  today: string,
  completions: StreakCompletion[],
  extra: Partial<{ startDay: string | null; memberCount: number }> = {},
) => computeStreak({ completions, today, startDay: START, memberCount: 2, ...extra });

describe('computeStreak', () => {
  it('sin nada: racha 0 y todo el cupo', () => {
    expect(run('2026-10-30', [])).toEqual({
      current: 0,
      best: 0,
      todayDone: false,
      todayIsRepair: false,
      repairDay: null,
      repairsUsed: 0,
      repairsLeft: REPAIRS_PER_MONTH,
    });
    expect(REPAIRS_PER_MONTH).toBe(5);
  });

  it('racha normal que termina ayer; hoy pendiente no rompe', () => {
    const r = run('2026-10-30', same(...range('2026-10-27', '2026-10-29')));
    expect(r).toMatchObject({ current: 3, best: 3, todayDone: false, repairDay: null });
  });

  it('hoy contestado suma', () => {
    const r = run('2026-10-30', same(...range('2026-10-27', '2026-10-30')));
    expect(r).toMatchObject({ current: 4, best: 4, todayDone: true, todayIsRepair: false });
  });

  it('recuperación válida: el día perdido cuenta, hoy queda neutral y no suma', () => {
    // 27 y 28 completos; el 29 se contestó hoy (30). Hoy (aunque tenga su propia pregunta lista) no suma.
    const r = run('2026-10-30', [
      ...same('2026-10-27', '2026-10-28'),
      { day: '2026-10-29', completedOn: '2026-10-30' },
      { day: '2026-10-30', completedOn: '2026-10-30' },
    ]);
    expect(r).toMatchObject({
      current: 3,
      best: 3,
      todayDone: true,
      todayIsRepair: true,
      repairDay: null,
      repairsUsed: 1,
      repairsLeft: 4,
    });
  });

  it('repair_day pendiente: ayer sin completar con racha; hoy contestado no suma', () => {
    const base = same('2026-10-27', '2026-10-28');
    expect(run('2026-10-30', base)).toMatchObject({
      current: 2,
      best: 2,
      repairDay: '2026-10-29',
      todayDone: false,
    });
    const answeredToday = run('2026-10-30', [...base, ...same('2026-10-30')]);
    expect(answeredToday).toMatchObject({
      current: 2,
      repairDay: '2026-10-29',
      todayDone: false,
    });
  });

  it('ayer sin completar y sin racha: no hay repair_day', () => {
    expect(run('2026-10-30', [])).toMatchObject({ current: 0, repairDay: null });
    const r = run('2026-10-30', same('2026-10-30'));
    expect(r).toMatchObject({ current: 1, repairDay: null, todayDone: true });
  });

  it('con un solo miembro no hay repair_day', () => {
    const r = run('2026-10-30', same('2026-10-28'), { memberCount: 1 });
    expect(r).toMatchObject({ current: 0, repairDay: null });
  });

  it('dos días perdidos seguidos: se pierde la racha', () => {
    const r = run('2026-10-30', same('2026-10-25', '2026-10-26', '2026-10-27'));
    expect(r).toMatchObject({ current: 0, best: 3, repairDay: null });
  });

  it('solo se puede recuperar el día inmediatamente anterior', () => {
    // El 27 se contestó el 29 (dos días después): no cuenta y rompe.
    const r = run('2026-10-30', [
      ...same('2026-10-26'),
      { day: '2026-10-27', completedOn: '2026-10-29' },
      ...same('2026-10-28', '2026-10-29'),
    ]);
    expect(r).toMatchObject({ current: 2, best: 2, repairsUsed: 0 });
  });

  it('recuperación sin racha (run 0) no cuenta', () => {
    const r = run('2026-10-30', [
      { day: '2026-10-28', completedOn: '2026-10-29' },
      ...same('2026-10-29'),
    ]);
    // El 28 no se recupera (no había racha); el 29 sí cuenta por sí mismo.
    expect(r).toMatchObject({ current: 1, best: 1, repairsUsed: 0, todayIsRepair: false });
  });

  it('el primer día de la pareja no se puede recuperar sin racha', () => {
    const r = run('2026-10-30', [{ day: '2026-10-29', completedOn: '2026-10-30' }], {
      startDay: '2026-10-29',
    });
    expect(r).toMatchObject({ current: 0, repairsUsed: 0, repairDay: null });
  });

  it('límite de 5 por mes: la 6.ª no cuenta y rompe', () => {
    // Días 1..: cada par (impar completo el mismo día, par contestado al día siguiente).
    // Racha base el 1; recuperaciones de los días 2, 4, 6, 8, 10 (contestados 3, 5, 7, 9, 11).
    // Día 12 completo, día 13 se contesta el 14 (6.ª recuperación).
    const comps: StreakCompletion[] = [...same('2026-05-01')];
    for (const d of [2, 4, 6, 8, 10]) {
      comps.push({
        day: `2026-05-${String(d).padStart(2, '0')}`,
        completedOn: `2026-05-${String(d + 1).padStart(2, '0')}`,
      });
    }
    comps.push(...same('2026-05-12'));
    comps.push({ day: '2026-05-13', completedOn: '2026-05-14' });
    comps.push(...same('2026-05-15'));
    const r = run('2026-05-16', comps, { startDay: '2026-05-01' });
    // 1 + 5 recuperados + 12 (con el 11 neutral) = 7; el 13 no se recupera: racha a 0; 15 suma 1.
    expect(r.best).toBe(7);
    expect(r.current).toBe(1);
    expect(r.repairsUsed).toBe(5);
    expect(r.repairsLeft).toBe(0);
  });

  it('sin cupo en el mes, ayer pendiente no es recuperable', () => {
    const comps: StreakCompletion[] = [...same('2026-05-01')];
    for (const d of [2, 4, 6, 8, 10]) {
      comps.push({
        day: `2026-05-${String(d).padStart(2, '0')}`,
        completedOn: `2026-05-${String(d + 1).padStart(2, '0')}`,
      });
    }
    comps.push(...same('2026-05-12'));
    const r = run('2026-05-14', comps, { startDay: '2026-05-01' });
    // Ayer (13) sin completar y 0 recuperaciones restantes: se rompe.
    expect(r).toMatchObject({ current: 0, best: 7, repairDay: null, repairsLeft: 0 });
  });

  it('cambio de mes renueva el cupo', () => {
    const comps: StreakCompletion[] = [...same('2026-05-01')];
    for (const d of [2, 4, 6, 8, 10]) {
      comps.push({
        day: `2026-05-${String(d).padStart(2, '0')}`,
        completedOn: `2026-05-${String(d + 1).padStart(2, '0')}`,
      });
    }
    comps.push(...same(...range('2026-05-12', '2026-05-31')));
    // 1 de junio: ayer (31 de mayo) completo; el 1 pendiente. Ya en junio hay cupo.
    const june = run('2026-06-02', comps, { startDay: '2026-05-01' });
    expect(june).toMatchObject({ repairDay: '2026-06-01', repairsUsed: 0, repairsLeft: 5 });
    // Recuperar el 31 de mayo el 1 de junio usa el cupo de junio.
    const may31 = [
      ...comps.filter((c) => c.day !== '2026-05-31'),
      { day: '2026-05-31', completedOn: '2026-06-01' },
    ];
    const r = run('2026-06-01', may31, { startDay: '2026-05-01' });
    expect(r).toMatchObject({
      todayIsRepair: true,
      todayDone: true,
      repairsUsed: 1,
      repairsLeft: 4,
    });
  });

  it('cadena de recuperaciones: días alternos', () => {
    const r = run('2026-10-30', [
      ...same('2026-10-24'),
      { day: '2026-10-25', completedOn: '2026-10-26' }, // 26 neutral
      { day: '2026-10-27', completedOn: '2026-10-28' }, // 28 neutral
      ...same('2026-10-29'),
      ...same('2026-10-30'),
    ]);
    expect(r).toMatchObject({ current: 5, best: 5, repairsUsed: 2, todayDone: true });
  });

  it('un día neutral no se recupera a su vez', () => {
    // 25 recuperado el 26 (neutral). El 26 (pregunta) contestado el 27 no cuenta, pero no rompe;
    // el 27 completo suma.
    const r = run('2026-10-28', [
      ...same('2026-10-24'),
      { day: '2026-10-25', completedOn: '2026-10-26' },
      { day: '2026-10-26', completedOn: '2026-10-27' },
      ...same('2026-10-27'),
    ]);
    expect(r).toMatchObject({ current: 3, repairDay: null });
  });

  it('best conserva el récord tras romperse', () => {
    const r = run('2026-10-30', [
      ...same(...range('2026-10-10', '2026-10-15')),
      ...same('2026-10-28', '2026-10-29'),
    ]);
    expect(r).toMatchObject({ current: 2, best: 6 });
  });

  it('best incluye recuperaciones', () => {
    const r = run('2026-10-30', [
      ...same('2026-10-27'),
      { day: '2026-10-28', completedOn: '2026-10-29' },
    ]);
    // 27 + 28 recuperado (29 neutral); hoy sin contestar, ayer neutral.
    expect(r).toMatchObject({ current: 2, best: 2, repairDay: null, todayDone: false });
  });

  it('cruza año y bisiesto', () => {
    const r = run('2028-03-01', same('2028-02-27', '2028-02-28', '2028-02-29'));
    expect(r).toMatchObject({ current: 3, best: 3 });
    const y = run('2027-01-02', same('2026-12-30', '2026-12-31', '2027-01-01'));
    expect(y).toMatchObject({ current: 3 });
  });

  it('ignora días futuros y completedOn null', () => {
    const r = run('2026-10-30', [
      ...same('2026-10-29', '2026-10-31'),
      { day: '2026-10-28', completedOn: null },
    ]);
    expect(r).toMatchObject({ current: 1, best: 1 });
  });

  it('startDay null o futuro: solo hoy', () => {
    expect(run('2026-10-30', same('2026-10-30'), { startDay: null })).toMatchObject({
      current: 1,
      todayDone: true,
    });
    expect(run('2026-10-30', same('2026-10-30'), { startDay: '2026-10-31' })).toMatchObject({
      current: 0,
    });
  });
});
