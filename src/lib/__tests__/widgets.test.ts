import {
  SNAPSHOT_STALE_MS,
  WIDGET_NAMES,
  WIDGET_ROUTES,
  WIDGET_SNAPSHOT_VERSION,
  buildWidgetSnapshot,
  emptyWidgetSnapshot,
  formatAgo,
  nextBirthday,
  nextCountdown,
  parseWidgetSnapshot,
  snapshotChanged,
  widgetModel,
  type SnapshotInput,
  type WidgetSnapshot,
} from '../widgets';

const NOW = new Date('2026-06-15T18:00:00Z');

const input = (over: Partial<SnapshotInput> = {}): SnapshotInput => ({
  anniversary: '2024-01-10',
  timezone: 'America/Mexico_City',
  me: { name: 'Ana', birthday: '1995-03-02' },
  partner: { name: 'Beto', birthday: '1994-12-25' },
  partnerMood: null,
  now: NOW,
  ...over,
});

const snap = (over: Partial<WidgetSnapshot> = {}): WidgetSnapshot => ({
  ...buildWidgetSnapshot(input()),
  ...over,
});

describe('constantes', () => {
  it('cada widget tiene ruta', () => {
    for (const n of WIDGET_NAMES) expect(WIDGET_ROUTES[n]).toMatch(/^\//);
  });
});

describe('buildWidgetSnapshot', () => {
  it('arma un snapshot listo', () => {
    const s = buildWidgetSnapshot(input());
    expect(s.version).toBe(WIDGET_SNAPSHOT_VERSION);
    expect(s.status).toBe('ready');
    expect(s.anniversary).toBe('2024-01-10');
    expect(s.me).toEqual({ name: 'Ana', birthday: '1995-03-02' });
    expect(s.updatedAt).toBe(NOW.toISOString());
    expect(s.distanceKm).toBeNull();
  });

  it('limpia nombres y fechas inválidas', () => {
    const s = buildWidgetSnapshot(
      input({
        anniversary: '2024-02-31',
        me: { name: '   ', birthday: 'nunca' },
        partner: { name: '  Beto  ', birthday: '1994-12-25T00:00:00Z' },
      }),
    );
    expect(s.anniversary).toBeNull();
    expect(s.me).toEqual({ name: 'Tú', birthday: null });
    expect(s.partner).toEqual({ name: 'Beto', birthday: '1994-12-25' });
  });

  it('usa la zona por defecto y tolera perfiles ausentes', () => {
    const s = buildWidgetSnapshot(input({ timezone: null, me: null, partner: null }));
    expect(s.timezone).toBe('America/Mexico_City');
    expect(s.me).toBeNull();
    expect(s.partner).toBeNull();
    expect(buildWidgetSnapshot(input({ timezone: '' })).timezone).toBe('America/Mexico_City');
  });

  it('recorta la nota del mood y descarta las vacías', () => {
    const mood = (note: string | null) => ({ emoji: '😀', note, created_at: NOW.toISOString() });
    expect(buildWidgetSnapshot(input({ partnerMood: mood('  hola ') })).partnerMood).toEqual({
      emoji: '😀',
      note: 'hola',
      at: NOW.toISOString(),
    });
    expect(buildWidgetSnapshot(input({ partnerMood: mood('  ') })).partnerMood?.note).toBeNull();
    expect(buildWidgetSnapshot(input({ partnerMood: mood(null) })).partnerMood?.note).toBeNull();
  });

  it('conserva la distancia', () => {
    expect(buildWidgetSnapshot(input({ distanceKm: 12 })).distanceKm).toBe(12);
  });

  it('guarda la story de tu pareja con trazos simplificados', () => {
    const line = [0, 0, 100, 1, 200, 0, 300, 2, 400, 0];
    const s = buildWidgetSnapshot(
      input({
        partnerId: 'u2',
        partnerStory: {
          id: 's1',
          kind: 'drawing',
          created_at: '2026-06-15T17:00:00Z',
          expires_at: '2026-06-16T17:00:00Z',
          thumb: 'data:image/jpeg;base64,AAAA',
          text: '  ',
          bg: 'paper',
          strokes: [{ c: 'ink', w: 8, p: line }],
        },
      }),
    );
    expect(s.partnerId).toBe('u2');
    expect(s.partnerStory?.createdAt).toBe('2026-06-15T17:00:00Z');
    expect(s.partnerStory?.thumb).toBeNull(); // solo photo lleva miniatura
    expect(s.partnerStory?.text).toBeNull();
    expect(s.partnerStory?.strokes?.[0].p).toEqual([0, 0, 400, 0]);
  });

  it('la miniatura se conserva en photo', () => {
    const s = buildWidgetSnapshot(
      input({
        partnerStory: {
          id: 's1',
          kind: 'photo',
          created_at: '2026-06-15T17:00:00Z',
          expires_at: '2026-06-16T17:00:00Z',
          thumb: 'data:image/jpeg;base64,AAAA',
        },
      }),
    );
    expect(s.partnerStory?.thumb).toBe('data:image/jpeg;base64,AAAA');
    expect(s.partnerStory?.strokes).toBeNull();
  });
});

describe('emptyWidgetSnapshot', () => {
  it('no trae datos', () => {
    const s = emptyWidgetSnapshot('no_couple', NOW);
    expect(s.status).toBe('no_couple');
    expect(s.anniversary).toBeNull();
    expect(s.partner).toBeNull();
    expect(s.updatedAt).toBe(NOW.toISOString());
  });
});

describe('widgetModel / partnerStory', () => {
  const story = {
    id: 's1',
    kind: 'text' as const,
    created_at: '2026-06-15T15:00:00Z',
    expires_at: '2026-06-16T15:00:00Z',
    text: 'Te extraño',
    bg: 'postit' as const,
    font: 'hand' as const,
  };

  it('expone la story activa con su "hace"', () => {
    const m = widgetModel(
      buildWidgetSnapshot(input({ partnerId: 'u2', partnerStory: story })),
      NOW,
    );
    expect(m.partnerId).toBe('u2');
    expect(m.partnerStory).toMatchObject({ id: 's1', kind: 'text', text: 'Te extraño' });
    expect(m.partnerStory?.ago).toBe('hace 3 h');
  });

  it('la oculta cuando ya caducó al dibujar', () => {
    const s = buildWidgetSnapshot(input({ partnerStory: story }));
    expect(widgetModel(s, new Date('2026-06-16T15:00:01Z')).partnerStory).toBeNull();
  });

  it('sin sesión o sin pareja no hay story', () => {
    expect(widgetModel(emptyWidgetSnapshot('no_couple', NOW), NOW).partnerStory).toBeNull();
    expect(widgetModel(null, NOW).partnerStory).toBeNull();
  });
});

describe('parseWidgetSnapshot', () => {
  it('ida y vuelta', () => {
    const s = snap();
    expect(parseWidgetSnapshot(JSON.stringify(s))).toEqual(s);
  });
  it('rechaza lo inválido', () => {
    expect(parseWidgetSnapshot(null)).toBeNull();
    expect(parseWidgetSnapshot(undefined)).toBeNull();
    expect(parseWidgetSnapshot('')).toBeNull();
    expect(parseWidgetSnapshot('{roto')).toBeNull();
    expect(parseWidgetSnapshot('null')).toBeNull();
    expect(parseWidgetSnapshot('5')).toBeNull();
    expect(parseWidgetSnapshot(JSON.stringify({ ...snap(), version: 99 }))).toBeNull();
    expect(parseWidgetSnapshot(JSON.stringify({ ...snap(), version: 1 }))).toBeNull();
    expect(parseWidgetSnapshot(JSON.stringify({ ...snap(), status: 'raro' }))).toBeNull();
    expect(parseWidgetSnapshot(JSON.stringify({ ...snap(), updatedAt: 3 }))).toBeNull();
    expect(parseWidgetSnapshot(JSON.stringify({ ...snap(), timezone: null }))).toBeNull();
  });
});

describe('snapshotChanged', () => {
  it('sin anterior cambió', () => {
    expect(snapshotChanged(null, snap())).toBe(true);
  });
  it('ignora updatedAt', () => {
    const a = snap();
    const b = { ...a, updatedAt: '2030-01-01T00:00:00.000Z' };
    expect(snapshotChanged(a, b)).toBe(false);
  });
  it('detecta cambios visibles', () => {
    const a = snap();
    expect(snapshotChanged(a, { ...a, anniversary: '2024-01-11' })).toBe(true);
    expect(
      snapshotChanged(a, { ...a, partnerMood: { emoji: '😀', note: null, at: NOW.toISOString() } }),
    ).toBe(true);
    expect(snapshotChanged(a, emptyWidgetSnapshot('signed_out', NOW))).toBe(true);
  });
});

describe('nextBirthday', () => {
  it('cumple hoy es hoy', () => {
    expect(nextBirthday('1995-03-02', '2026-03-02')).toBe('2026-03-02');
  });
  it('este año si aún no llega', () => {
    expect(nextBirthday('1995-03-02', '2026-03-01')).toBe('2026-03-02');
  });
  it('ya pasó: año siguiente', () => {
    expect(nextBirthday('1995-03-02', '2026-03-03')).toBe('2027-03-02');
  });
  it('29 de febrero se festeja el 28 en años no bisiestos', () => {
    expect(nextBirthday('1996-02-29', '2026-01-10')).toBe('2026-02-28');
    expect(nextBirthday('1996-02-29', '2027-03-01')).toBe('2028-02-29');
    expect(nextBirthday('1996-02-29', '2028-01-10')).toBe('2028-02-29');
  });
  it('fechas inválidas', () => {
    expect(nextBirthday('no', '2026-01-01')).toBeNull();
    expect(nextBirthday('1995-03-02', 'no')).toBeNull();
  });
});

describe('nextCountdown', () => {
  it('sin aniversario solo cumpleaños, el más cercano', () => {
    const s = snap({ anniversary: null });
    const c = nextCountdown(s, '2026-06-15');
    expect(c?.kind).toBe('birthday');
    expect(c?.title).toBe('Cumple de Beto');
    expect(c?.date).toBe('2026-12-25');
    expect(c?.daysUntil).toBe(193);
  });
  it('sin nada devuelve null', () => {
    const s = snap({
      anniversary: null,
      me: { name: 'Ana', birthday: null },
      partner: { name: 'Beto', birthday: null },
    });
    expect(nextCountdown(s, '2026-06-15')).toBeNull();
    expect(
      nextCountdown(snap({ anniversary: null, me: null, partner: null }), '2026-06-15'),
    ).toBeNull();
  });
  it('tu cumple dice "Tu cumple"', () => {
    const s = snap({ anniversary: null, partner: null });
    expect(nextCountdown(s, '2026-03-01')?.title).toBe('Tu cumple');
  });
  it('aniversario futuro: Empieza su historia', () => {
    const s = snap({ anniversary: '2026-06-20' });
    expect(nextCountdown(s, '2026-06-15')).toEqual({
      kind: 'anniversary',
      title: 'Empieza su historia',
      date: '2026-06-20',
      daysUntil: 5,
    });
  });
  it('hoy cuenta con daysUntil 0 y gana el aniversario en un empate', () => {
    const s = snap({
      anniversary: '2024-06-15',
      me: { name: 'Ana', birthday: '1995-06-15' },
    });
    const c = nextCountdown(s, '2026-06-15');
    expect(c?.daysUntil).toBe(0);
    expect(c?.kind).toBe('anniversary');
  });
  it('elige por cercanía entre hitos y cumpleaños', () => {
    // Aniversario 10 de enero: faltan meses; el cumple de Ana (2 mar) llega antes que el de Beto.
    const s = snap({ anniversary: '2024-01-10' });
    const c = nextCountdown(s, '2026-02-20');
    expect(c).not.toBeNull();
    expect(c!.daysUntil).toBeLessThanOrEqual(10);
    const all = [c!.daysUntil];
    expect(Math.min(...all)).toBe(c!.daysUntil);
  });
  it('ordena por días, luego por tipo', () => {
    const s = snap({ anniversary: null, me: { name: 'Ana', birthday: '1995-07-01' } });
    const c = nextCountdown(s, '2026-06-15');
    expect(c?.title).toBe('Tu cumple');
    expect(c?.daysUntil).toBe(16);
  });
});

describe('formatAgo', () => {
  const at = (ms: number) => new Date(NOW.getTime() - ms).toISOString();
  it('rangos', () => {
    expect(formatAgo(at(10_000), NOW)).toBe('ahorita');
    expect(formatAgo(at(5 * 60_000), NOW)).toBe('hace 5 min');
    expect(formatAgo(at(59 * 60_000), NOW)).toBe('hace 59 min');
    expect(formatAgo(at(2 * 3_600_000), NOW)).toBe('hace 2 h');
    expect(formatAgo(at(24 * 3_600_000), NOW)).toBe('ayer');
    expect(formatAgo(at(3 * 24 * 3_600_000), NOW)).toBe('hace 3 días');
  });
  it('fecha inválida o futura', () => {
    expect(formatAgo('nunca', NOW)).toBe('');
    expect(formatAgo(new Date(NOW.getTime() + 60_000).toISOString(), NOW)).toBe('ahorita');
  });
});

describe('widgetModel', () => {
  it('sin snapshot es signed_out sin datos', () => {
    const m = widgetModel(null, NOW);
    expect(m.status).toBe('signed_out');
    expect(m.daysTogether).toBeNull();
    expect(m.nextEvent).toBeNull();
    expect(m.partnerMood).toBeNull();
    expect(m.partnerName).toBe('Tu pareja');
  });

  it('no_couple no muestra datos aunque existan', () => {
    const m = widgetModel({ ...snap(), status: 'no_couple' }, NOW);
    expect(m.daysTogether).toBeNull();
    expect(m.nextEvent).toBeNull();
  });

  it('calcula días juntos (aniversario = día 1)', () => {
    const m = widgetModel(snap({ anniversary: '2026-06-15' }), NOW);
    expect(m.daysTogether).toBe(1);
    expect(m.daysUntilStart).toBeNull();
    expect(m.partnerName).toBe('Beto');
  });

  it('aniversario futuro: faltan días', () => {
    const m = widgetModel(snap({ anniversary: '2026-06-20' }), NOW);
    expect(m.daysTogether).toBeNull();
    expect(m.daysUntilStart).toBe(5);
  });

  it('el día depende de la zona horaria', () => {
    // 2026-06-15 20:00 UTC: en CDMX (UTC-6) es 15 a las 14:00; en Tokio (UTC+9) ya es 16.
    const instant = new Date('2026-06-15T20:00:00Z');
    const mx = widgetModel(
      snap({ timezone: 'America/Mexico_City', anniversary: '2026-06-15' }),
      instant,
    );
    const tk = widgetModel(snap({ timezone: 'Asia/Tokyo', anniversary: '2026-06-15' }), instant);
    expect(mx.today).toBe('2026-06-15');
    expect(tk.today).toBe('2026-06-16');
    expect(mx.daysTogether).toBe(1);
    expect(tk.daysTogether).toBe(2);
  });

  it('el mood trae etiqueta y hace cuánto', () => {
    const s = snap({
      partnerMood: {
        emoji: '😀',
        note: 'hola',
        at: new Date(NOW.getTime() - 120_000).toISOString(),
      },
    });
    const m = widgetModel(s, NOW);
    expect(m.partnerMood?.emoji).toBe('😀');
    expect(m.partnerMood?.note).toBe('hola');
    expect(m.partnerMood?.ago).toBe('hace 2 min');
  });

  it('stale pasada la hora', () => {
    const s = snap({ updatedAt: NOW.toISOString() });
    expect(widgetModel(s, NOW).stale).toBe(false);
    expect(widgetModel(s, new Date(NOW.getTime() + SNAPSHOT_STALE_MS + 1)).stale).toBe(true);
  });
});
