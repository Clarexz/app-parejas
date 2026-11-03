import {
  buildWidgetSnapshot,
  emptyWidgetSnapshot,
  WIDGET_NAMES,
  widgetModel,
  type SnapshotInput,
  type WidgetModel,
  type WidgetName,
} from '@/lib/widgets';

import { moodFace, widgetShapeSvg, widgetView } from '../view';

const NOW = new Date('2026-10-30T18:00:00Z');

const input = (over: Partial<SnapshotInput> = {}): SnapshotInput => ({
  anniversary: '2025-09-14',
  timezone: 'America/Mexico_City',
  me: { name: 'Ale', birthday: null },
  partner: { name: 'Caleb', birthday: null },
  partnerMood: { emoji: '😄', note: null, created_at: '2026-10-30T17:35:00Z' },
  partnerId: 'p1',
  streak: { current: 47, answeredToday: true },
  fruits: { me: 'arandano', partner: 'mandarina' },
  distance: {
    me: { city: 'CDMX', at: NOW.toISOString() },
    partner: { city: 'Monterrey', at: NOW.toISOString() },
    km: 1239.6,
  },
  events: [
    {
      id: 'v1',
      kind: 'visit',
      title: 'Nos vemos',
      emoji: null,
      date: '2026-11-11',
      recurring_yearly: false,
    },
  ],
  now: NOW,
  ...over,
});

const model = (over: Partial<SnapshotInput> = {}): WidgetModel =>
  widgetModel(buildWidgetSnapshot(input(over)), NOW);

const text = (name: WidgetName, m: WidgetModel) => widgetView(name, m).text;

describe('widgetView', () => {
  it('el dato de cada widget', () => {
    const m = model();
    expect(text('DaysTogether', m)).toBe('412 días');
    expect(text('PartnerMood', m)).toBe('feliz');
    expect(text('Countdown', m)).toBe('faltan 12');
    expect(text('Distance', m)).toBe('1,240 km');
    expect(text('Streak', m)).toBe('47 días');
    expect(text('PartnerStory', m)).toBe('ver');
  });

  it('las frutas del modelo llegan a la vista', () => {
    expect(widgetView('DaysTogether', model()).fruits).toEqual({
      me: 'arandano',
      partner: 'mandarina',
    });
    // Sin pareja: su fruta es la sugerida de la tuya.
    expect(
      widgetView('DaysTogether', model({ fruits: { me: 'uva', partner: null } })).fruits,
    ).toEqual({ me: 'uva', partner: 'limon' });
  });

  it('días: 1 día, y antes del aniversario "faltan N"', () => {
    expect(text('DaysTogether', model({ anniversary: '2026-10-30' }))).toBe('1 día');
    expect(text('DaysTogether', model({ anniversary: '2026-11-09' }))).toBe('faltan 10');
    expect(widgetView('DaysTogether', model({ anniversary: null })).face.shape).toBe('empty');
  });

  it('mood: etiqueta en minúsculas y carita; sin mood, vacío', () => {
    expect(
      text(
        'PartnerMood',
        model({ partnerMood: { emoji: '🥺', note: null, created_at: NOW.toISOString() } }),
      ),
    ).toBe('sensible');
    expect(moodFace('😄')).toBe('smile');
    expect(moodFace('🥺')).toBe('frown');
    expect(moodFace('🤔')).toBe('flat');
    expect(widgetView('PartnerMood', model({ partnerMood: null })).face.shape).toBe('empty');
  });

  it('la próxima vez: "hoy", "mañana" y progreso', () => {
    expect(
      text('Countdown', model({ events: [{ ...input().events![0], date: '2026-10-30' }] })),
    ).toBe('hoy');
    expect(
      text('Countdown', model({ events: [{ ...input().events![0], date: '2026-10-31' }] })),
    ).toBe('mañana');
    const view = widgetView(
      'Countdown',
      model({ events: [{ ...input().events![0], date: '2026-10-30' }] }),
    );
    expect(view.face).toEqual({ shape: 'next', progress: 1 });
    expect(widgetView('Countdown', model()).face).toEqual({ shape: 'next', progress: 0.5 });
  });

  it('distancia: sin km queda vacío y explica qué falta', () => {
    const m = model({
      distance: { me: { city: null, at: NOW.toISOString() }, partner: null, km: null },
    });
    const view = widgetView('Distance', m);
    expect(view.face.shape).toBe('empty');
    expect(view.a11y).toContain('Cuando Caleb active su distancia');
    expect(widgetView('Distance', model({ distance: null })).a11y).toContain(
      'Activen su distancia',
    );
  });

  it('story: "nueva" con punto y foto; ruta a la story de tu pareja', () => {
    const m = model({
      partnerStory: {
        id: 's1',
        kind: 'photo',
        created_at: '2026-10-30T16:00:00Z',
        expires_at: '2026-10-31T16:00:00Z',
        thumb: 'data:image/jpeg;base64,AAAA',
      },
    });
    const view = widgetView('PartnerStory', m);
    expect(view.text).toBe('nueva');
    expect(view.face).toEqual({ shape: 'story', photo: 'data:image/jpeg;base64,AAAA', dot: true });
    expect(view.route).toBe('/story/view?user=p1');
    expect(widgetView('PartnerStory', model()).route).toBe('/stories');
  });

  it('racha en 0: apagada y "a contestar"', () => {
    const view = widgetView('Streak', model({ streak: { current: 0, answeredToday: false } }));
    expect(view.text).toBe('a contestar');
    expect(view.face).toEqual({ shape: 'streak', active: false });
    expect(text('Streak', model({ streak: { current: 1, answeredToday: true } }))).toBe('1 día');
    expect(widgetView('Streak', model({ streak: null })).face.shape).toBe('empty');
  });

  it('sin sesión o sin pareja, todos los widgets muestran las dos medias lunas', () => {
    const closed = widgetModel(emptyWidgetSnapshot('signed_out', NOW), NOW);
    const noCouple = widgetModel(emptyWidgetSnapshot('no_couple', NOW), NOW);
    for (const name of WIDGET_NAMES) {
      expect(widgetView(name, closed).face.shape).toBe('empty');
      expect(widgetView(name, noCouple).face.shape).toBe('empty');
      expect(widgetView(name, noCouple).text).toBe('sin pareja');
      expect(widgetView(name, closed).text).toMatch(/^abre /);
    }
  });

  it('widgetShapeSvg dibuja una forma por widget', () => {
    const m = model();
    for (const name of WIDGET_NAMES) {
      const svg = widgetShapeSvg(widgetView(name, m), { dark: true, size: 58 });
      expect(svg).toContain('<svg');
      expect(svg).toContain('width="58"');
    }
  });
});
