import {
  autoCountdowns,
  buildCountdowns,
  eventCountdowns,
  featuredCountdown,
  nextOccurrence,
  nextVisit,
  pastEvents,
  type EventInput,
} from '../events';

const TODAY = '2026-10-31';

function ev(over: Partial<EventInput> & { id: string }): EventInput {
  return {
    kind: 'custom',
    title: `Evento ${over.id}`,
    emoji: null,
    date: '2026-12-01',
    recurring_yearly: false,
    ...over,
  };
}

describe('nextOccurrence', () => {
  it('sin recurrencia: futura, hoy o pasada', () => {
    expect(nextOccurrence('2026-12-25', false, TODAY)).toBe('2026-12-25');
    expect(nextOccurrence('2026-10-31', false, TODAY)).toBe('2026-10-31');
    expect(nextOccurrence('2026-10-30', false, TODAY)).toBeNull();
    expect(nextOccurrence('2020-01-01', false, TODAY)).toBeNull();
  });

  it('anual: este año si aún no pasa (o es hoy)', () => {
    expect(nextOccurrence('2000-11-15', true, TODAY)).toBe('2026-11-15');
    expect(nextOccurrence('2000-10-31', true, TODAY)).toBe('2026-10-31');
  });

  it('anual: el año siguiente si ya pasó', () => {
    expect(nextOccurrence('2000-10-30', true, TODAY)).toBe('2027-10-30');
    expect(nextOccurrence('1999-01-05', true, TODAY)).toBe('2027-01-05');
  });

  it('anual con fecha de origen en el futuro devuelve esa fecha', () => {
    expect(nextOccurrence('2027-03-10', true, TODAY)).toBe('2027-03-10');
  });

  it('29 de febrero: el 28 en años no bisiestos y el 29 en bisiestos', () => {
    expect(nextOccurrence('2000-02-29', true, '2026-10-31')).toBe('2027-02-28');
    expect(nextOccurrence('2000-02-29', true, '2027-10-31')).toBe('2028-02-29');
    expect(nextOccurrence('2000-02-29', true, '2027-01-10')).toBe('2027-02-28');
    expect(nextOccurrence('2000-02-29', true, '2028-01-10')).toBe('2028-02-29');
  });

  it('fechas inválidas devuelven null', () => {
    expect(nextOccurrence('no-es-fecha', true, TODAY)).toBeNull();
    expect(nextOccurrence('2026-02-30', false, TODAY)).toBeNull();
    expect(nextOccurrence('', true, TODAY)).toBeNull();
    expect(nextOccurrence('2026-12-01', false, 'hoy')).toBeNull();
  });
});

describe('autoCountdowns', () => {
  it('sin datos no hay cuentas', () => {
    expect(autoCountdowns({ anniversary: null, me: null, partner: null, today: TODAY })).toEqual(
      [],
    );
    expect(
      autoCountdowns({
        anniversary: undefined,
        me: { name: 'Ana', birthday: null },
        partner: { name: 'Beto', birthday: undefined },
        today: TODAY,
      }),
    ).toEqual([]);
  });

  it('aniversario futuro: "Empieza su historia"', () => {
    const out = autoCountdowns({
      anniversary: '2026-12-01',
      me: null,
      partner: null,
      today: TODAY,
    });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      key: 'auto:anniversary',
      kind: 'anniversary',
      title: 'Empieza su historia',
      date: '2026-12-01',
      daysUntil: 31,
      eventId: null,
    });
  });

  it('relación en curso: un hito de cada tipo, ordenados por días', () => {
    const out = autoCountdowns({
      anniversary: '2024-03-10',
      me: null,
      partner: null,
      today: TODAY,
    });
    expect(out.map((c) => c.kind).sort()).toEqual(['anniversary', 'days', 'monthiversary']);
    expect(out.every((c) => c.date >= TODAY && c.eventId === null)).toBe(true);
    expect(out.find((c) => c.kind === 'monthiversary')?.title.startsWith('Cumplemés')).toBe(true);
    expect(out.find((c) => c.kind === 'days')?.recurring).toBe(false);
    expect(out.find((c) => c.kind === 'anniversary')?.recurring).toBe(true);
    const days = out.map((c) => c.daysUntil);
    expect(days).toEqual([...days].sort((a, b) => a - b));
  });

  it('cumpleaños: "Tu cumple" y "Cumple de <nombre>"', () => {
    const out = autoCountdowns({
      anniversary: null,
      me: { name: 'Ana', birthday: '1995-11-05' },
      partner: { name: 'Beto', birthday: '1993-10-30' },
      today: TODAY,
    });
    expect(out.map((c) => c.key)).toEqual(['birthday:me', 'birthday:partner']);
    expect(out[0]).toMatchObject({ title: 'Tu cumple', date: '2026-11-05', daysUntil: 5 });
    expect(out[1]).toMatchObject({ title: 'Cumple de Beto', date: '2027-10-30', recurring: true });
  });

  it('ignora cumpleaños vacíos o inválidos', () => {
    const out = autoCountdowns({
      anniversary: null,
      me: { name: 'Ana', birthday: 'xx' },
      partner: { name: 'Beto', birthday: '' },
      today: TODAY,
    });
    expect(out).toEqual([]);
  });
});

describe('eventCountdowns', () => {
  it('omite los eventos pasados y calcula los días', () => {
    const out = eventCountdowns(
      [
        ev({ id: 'a', date: '2026-11-10', emoji: '🎉' }),
        ev({ id: 'b', date: '2026-01-01' }),
        ev({ id: 'c', date: '2026-10-31' }),
      ],
      TODAY,
    );
    expect(out.map((c) => c.eventId)).toEqual(['c', 'a']);
    expect(out[0]).toMatchObject({ key: 'event:c', daysUntil: 0, recurring: false });
    expect(out[1]).toMatchObject({ daysUntil: 10, emoji: '🎉', kind: 'custom' });
  });

  it('los propios recurrentes pasan al siguiente año', () => {
    const [c] = eventCountdowns(
      [ev({ id: 'r', date: '2020-03-10', recurring_yearly: true })],
      TODAY,
    );
    expect(c).toMatchObject({ date: '2027-03-10', recurring: true });
  });

  it('las visitas no recurren aunque recurring_yearly venga true', () => {
    expect(
      eventCountdowns(
        [ev({ id: 'v', kind: 'visit', date: '2020-03-10', recurring_yearly: true })],
        TODAY,
      ),
    ).toEqual([]);
    const [c] = eventCountdowns(
      [ev({ id: 'v', kind: 'visit', date: '2026-12-01', recurring_yearly: true })],
      TODAY,
    );
    expect(c).toMatchObject({ kind: 'visit', date: '2026-12-01', recurring: false });
  });

  it('salen ordenadas por fecha', () => {
    const out = eventCountdowns(
      [
        ev({ id: 'z', date: '2027-02-01' }),
        ev({ id: 'x', date: '2026-11-01' }),
        ev({ id: 'y', date: '2026-12-01' }),
      ],
      TODAY,
    );
    expect(out.map((c) => c.eventId)).toEqual(['x', 'y', 'z']);
  });
});

describe('buildCountdowns', () => {
  it('mezcla automáticos y eventos ordenados por días', () => {
    const out = buildCountdowns({
      anniversary: '2024-03-10',
      me: { name: 'Ana', birthday: '1995-11-05' },
      partner: null,
      events: [ev({ id: 'e', date: '2026-11-20' })],
      today: TODAY,
    });
    const days = out.map((c) => c.daysUntil);
    expect(days).toEqual([...days].sort((a, b) => a - b));
    expect(out.map((c) => c.key)).toEqual(expect.arrayContaining(['birthday:me', 'event:e']));
    expect(out.find((c) => c.key === 'birthday:me')?.daysUntil).toBe(5);
  });

  it('desempate a igual fecha: visita > aniversario > cumpleaños > propio > días > cumplemés', () => {
    // Todos caen el 2026-11-05.
    const date = '2026-11-05';
    const out = buildCountdowns({
      anniversary: null,
      me: { name: 'Ana', birthday: '1995-11-05' },
      partner: null,
      events: [ev({ id: 'c', date }), ev({ id: 'v', kind: 'visit', date })],
      today: TODAY,
    });
    expect(out.map((c) => c.kind)).toEqual(['visit', 'birthday', 'custom']);

    // Con aniversario el 2024-11-05, el aniversario también cae ese día.
    const all = buildCountdowns({
      anniversary: '2024-11-05',
      me: { name: 'Ana', birthday: '1995-11-05' },
      partner: null,
      events: [ev({ id: 'c', date }), ev({ id: 'v', kind: 'visit', date })],
      today: TODAY,
    });
    const sameDay = all.filter((c) => c.date === date).map((c) => c.kind);
    expect(sameDay.slice(0, 4)).toEqual(['visit', 'anniversary', 'birthday', 'custom']);
  });

  it('sin nada devuelve []', () => {
    expect(
      buildCountdowns({ anniversary: null, me: null, partner: null, events: [], today: TODAY }),
    ).toEqual([]);
  });
});

describe('nextVisit', () => {
  it('la visita futura más cercana; hoy cuenta', () => {
    const events = [
      ev({ id: 'c', date: '2026-11-01' }),
      ev({ id: 'v2', kind: 'visit', date: '2027-01-10' }),
      ev({ id: 'v1', kind: 'visit', date: '2026-12-05' }),
      ev({ id: 'old', kind: 'visit', date: '2026-01-01' }),
    ];
    expect(nextVisit(events, TODAY)?.eventId).toBe('v1');
    expect(nextVisit([ev({ id: 'hoy', kind: 'visit', date: TODAY })], TODAY)?.daysUntil).toBe(0);
  });

  it('sin visitas futuras devuelve null', () => {
    expect(nextVisit([ev({ id: 'c', date: '2026-11-01' })], TODAY)).toBeNull();
    expect(nextVisit([ev({ id: 'old', kind: 'visit', date: '2026-01-01' })], TODAY)).toBeNull();
    expect(nextVisit([], TODAY)).toBeNull();
  });
});

describe('featuredCountdown', () => {
  const base = { anniversary: null, me: null, partner: null, today: TODAY };

  it('la visita gana aunque haya algo antes', () => {
    const out = featuredCountdown({
      ...base,
      me: { name: 'Ana', birthday: '1995-11-01' },
      events: [
        ev({ id: 'c', date: '2026-11-02' }),
        ev({ id: 'v', kind: 'visit', date: '2027-03-01' }),
      ],
    });
    expect(out?.eventId).toBe('v');
    expect(out?.kind).toBe('visit');
  });

  it('sin visita: la más próxima', () => {
    const out = featuredCountdown({
      ...base,
      me: { name: 'Ana', birthday: '1995-11-01' },
      events: [ev({ id: 'c', date: '2026-11-02' })],
    });
    expect(out?.key).toBe('birthday:me');
  });

  it('nada por venir devuelve null', () => {
    expect(featuredCountdown({ ...base, events: [] })).toBeNull();
    expect(
      featuredCountdown({ ...base, events: [ev({ id: 'old', date: '2020-01-01' })] }),
    ).toBeNull();
  });
});

describe('pastEvents', () => {
  it('solo los no recurrentes ya pasados, del más reciente al más viejo', () => {
    const events = [
      ev({ id: 'a', date: '2026-01-01' }),
      ev({ id: 'b', date: '2026-10-30' }),
      ev({ id: 'c', date: '2026-10-31' }),
      ev({ id: 'd', date: '2027-01-01' }),
      ev({ id: 'e', date: '2020-05-05', recurring_yearly: true }),
      ev({ id: 'f', kind: 'visit', date: '2025-05-05', recurring_yearly: true }),
      ev({ id: 'g', date: '2024-02-02' }),
    ];
    expect(pastEvents(events, TODAY).map((e) => e.id)).toEqual(['b', 'a', 'f', 'g']);
  });

  it('no muta la entrada y conserva el tipo', () => {
    const events = [ev({ id: 'a', date: '2025-01-01' }), ev({ id: 'b', date: '2026-01-01' })];
    const copy = [...events];
    const out = pastEvents(events, TODAY);
    expect(events).toEqual(copy);
    expect(out[0].id).toBe('b');
  });
});
