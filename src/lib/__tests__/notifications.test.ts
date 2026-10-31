import {
  CHANNELS,
  DEFAULT_PREFS,
  normalizePrefs,
  normalizeTime,
  reminderDates,
  reminderId,
  routeForNotification,
  shortName,
  shouldShowInForeground,
  toPrefsRow,
} from '../notifications';

const UUID = '3f2b8c1e-5a4d-4e6f-9b0a-1c2d3e4f5a6b';

describe('CHANNELS', () => {
  it('define los tres canales del servidor y el recordatorio', () => {
    expect(CHANNELS.map((c) => c.id)).toEqual(['actividad', 'toques', 'recordatorio']);
    expect(CHANNELS.find((c) => c.id === 'toques')?.importance).toBe('high');
  });
});

describe('routeForNotification', () => {
  it.each([
    '/',
    '/question',
    '/moods',
    '/settings/notifications',
    `/question?id=${UUID}`,
    '/question?day=2026-11-02',
    `/story/view?user=${UUID}`,
    `/story/view?story=${UUID}`,
    `/memory/${UUID}`,
    `/game/${UUID}`,
    `/drawing/${UUID}`,
  ])('acepta %s', (url) => {
    expect(routeForNotification({ url })).toBe(url);
  });

  it.each([
    'https://evil.com',
    '//evil.com',
    'javascript:alert(1)',
    'question',
    '/admin',
    '/question?id=123',
    '/question?day=2026-02-31',
    '/question?day=2026-11-02&x=1',
    '/question?id=' + UUID + '#x',
    '/question/../moods',
    '/story/view',
    '/memory/123',
    '/memory',
    '/game',
    '/game/123',
    '/drawing/123',
    `/game/${UUID}/x`,
    `/drawing/${UUID}?x=1`,
    `/games/${UUID}`,
    `/memory/${UUID}/x`,
    `/memory/${UUID}?x=1`,
    '/story/view?user=123',
    `/story/view?story=${UUID}&x=1`,
    `/story/view?user=${UUID}#x`,
    `/story/archive?user=${UUID}`,
    '/\\evil',
    '/question ',
    '',
  ])('rechaza %j', (url) => {
    expect(routeForNotification({ url })).toBeNull();
  });

  it('rechaza datos que no son un objeto con url string', () => {
    expect(routeForNotification(null)).toBeNull();
    expect(routeForNotification(undefined)).toBeNull();
    expect(routeForNotification('/moods')).toBeNull();
    expect(routeForNotification({ url: 5 })).toBeNull();
    expect(routeForNotification({})).toBeNull();
  });
});

describe('push de datos para widgets', () => {
  it('kind widget no produce ruta', () => {
    expect(routeForNotification({ kind: 'widget', scope: 'mood' })).toBeNull();
  });
});

describe('shouldShowInForeground', () => {
  it('solo muestra pruebas y desconocidos', () => {
    expect(shouldShowInForeground({ kind: 'test' })).toBe(true);
    expect(shouldShowInForeground({ kind: 'otra-cosa' })).toBe(true);
    expect(shouldShowInForeground(null)).toBe(true);
    for (const kind of ['answer', 'comment', 'mood', 'nudge', 'reminder', 'widget']) {
      expect(shouldShowInForeground({ kind })).toBe(false);
    }
  });
});

describe('preferencias', () => {
  it('sin fila usa los valores por omisión', () => {
    expect(normalizePrefs(null)).toEqual(DEFAULT_PREFS);
    expect(DEFAULT_PREFS.reminderTime).toBe('21:00');
  });

  it('normaliza la fila y recorta los segundos', () => {
    expect(
      normalizePrefs({
        answers: false,
        comments: true,
        moods: false,
        nudges: true,
        stories: false,
        memories: false,
        games: false,
        reminder_enabled: false,
        reminder_time: '08:30:00',
      }),
    ).toEqual({
      answers: false,
      comments: true,
      moods: false,
      nudges: true,
      stories: false,
      memories: false,
      games: false,
      reminderEnabled: false,
      reminderTime: '08:30',
    });
  });

  it('hora inválida cae al valor por omisión', () => {
    expect(normalizePrefs({ reminder_time: '25:00:00' }).reminderTime).toBe('21:00');
    expect(normalizeTime('9:05')).toBe('09:05');
    expect(normalizeTime('nope')).toBeNull();
  });

  it('toPrefsRow convierte solo lo que viene', () => {
    expect(toPrefsRow({ moods: false })).toEqual({ moods: false });
    expect(toPrefsRow({ stories: false })).toEqual({ stories: false });
    expect(toPrefsRow({ memories: false })).toEqual({ memories: false });
    expect(toPrefsRow({ games: false })).toEqual({ games: false });
    expect(toPrefsRow({ reminderEnabled: true, reminderTime: '07:15' })).toEqual({
      reminder_enabled: true,
      reminder_time: '07:15:00',
    });
    expect(toPrefsRow({ reminderTime: 'basura' })).toEqual({});
  });
});

describe('reminderDates', () => {
  it('incluye hoy si la hora no ha pasado y no he contestado', () => {
    const now = new Date(2026, 10, 2, 10, 0);
    const dates = reminderDates({ now, time: '21:00', answeredToday: false });
    expect(dates).toHaveLength(7);
    expect(dates[0]).toEqual(new Date(2026, 10, 2, 21, 0));
    expect(dates[6]).toEqual(new Date(2026, 10, 8, 21, 0));
  });

  it('omite hoy si ya pasó la hora', () => {
    const now = new Date(2026, 10, 2, 22, 0);
    const dates = reminderDates({ now, time: '21:00', answeredToday: false });
    expect(dates).toHaveLength(7);
    expect(dates[0]).toEqual(new Date(2026, 10, 3, 21, 0));
  });

  it('omite hoy si ya contestó', () => {
    const now = new Date(2026, 10, 2, 10, 0);
    const dates = reminderDates({ now, time: '21:00', answeredToday: true, days: 3 });
    expect(dates).toEqual([
      new Date(2026, 10, 3, 21, 0),
      new Date(2026, 10, 4, 21, 0),
      new Date(2026, 10, 5, 21, 0),
    ]);
  });

  it('cruza el fin de mes y de año', () => {
    const now = new Date(2026, 11, 30, 7, 0);
    const dates = reminderDates({ now, time: '08:05', answeredToday: false, days: 4 });
    expect(dates.map((d) => [d.getFullYear(), d.getMonth(), d.getDate()])).toEqual([
      [2026, 11, 30],
      [2026, 11, 31],
      [2027, 0, 1],
      [2027, 0, 2],
    ]);
    const feb = reminderDates({
      now: new Date(2028, 1, 28, 23, 0),
      time: '21:00',
      answeredToday: false,
      days: 2,
    });
    expect(feb.map((d) => d.getDate())).toEqual([29, 1]);
  });

  it('days = 0 no devuelve nada y la hora inválida usa 21:00', () => {
    const now = new Date(2026, 10, 2, 10, 0);
    expect(reminderDates({ now, time: '21:00', answeredToday: false, days: 0 })).toEqual([]);
    expect(reminderDates({ now, time: 'x', answeredToday: false, days: 1 })[0].getHours()).toBe(21);
  });
});

describe('utilidades', () => {
  it('reminderId usa el día local', () => {
    expect(reminderId(new Date(2026, 0, 5, 21, 0))).toBe('reminder-2026-01-05');
  });

  it('shortName recorta a 20 caracteres', () => {
    expect(shortName('  Ana   María ')).toBe('Ana María');
    expect(shortName('A'.repeat(30))).toHaveLength(20);
    expect(shortName('A'.repeat(30))?.endsWith('…')).toBe(true);
    expect(shortName(null)).toBeNull();
    expect(shortName('   ')).toBeNull();
  });
});
