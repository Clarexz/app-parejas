import {
  archiveByMonth,
  clampSticker,
  groupStories,
  isStoryActive,
  STORY_BGS,
  STORY_FONT_LABELS,
  STORY_FONTS,
  STORY_REACTIONS,
  STORY_STICKERS,
  STORY_TTL_MS,
  storyAgo,
  storyDurationMs,
  storyPaths,
  storyTimeLeft,
  validateReply,
  validateStoryText,
  type StoryLike,
} from '../stories';

const now = new Date('2026-10-30T18:00:00Z');
const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();
const MIN = 60_000;
const H = 60 * MIN;

function story(id: string, user: string, createdAgoMs: number, over: Partial<StoryLike> = {}) {
  const created = now.getTime() - createdAgoMs;
  return {
    id,
    user_id: user,
    kind: 'photo' as const,
    created_at: new Date(created).toISOString(),
    expires_at: new Date(created + STORY_TTL_MS).toISOString(),
    deleted_at: null,
    ...over,
  };
}

describe('constantes', () => {
  it('catálogos', () => {
    expect(STORY_TTL_MS).toBe(86_400_000);
    expect(STORY_REACTIONS).toHaveLength(6);
    expect(new Set(STORY_REACTIONS).size).toBe(6);
    expect(STORY_STICKERS).toHaveLength(16);
    expect(new Set(STORY_STICKERS).size).toBe(16);
    expect(STORY_BGS).toHaveLength(6);
    expect(STORY_FONTS.map((f) => STORY_FONT_LABELS[f])).toEqual(['A mano', 'Imprenta', 'Máquina']);
  });
});

describe('isStoryActive', () => {
  it('activa, caducada, borrada', () => {
    expect(isStoryActive({ expires_at: ago(-H), deleted_at: null }, now)).toBe(true);
    expect(isStoryActive({ expires_at: ago(H), deleted_at: null }, now)).toBe(false);
    expect(isStoryActive({ expires_at: ago(0), deleted_at: null }, now)).toBe(false);
    expect(isStoryActive({ expires_at: ago(-H), deleted_at: ago(MIN) }, now)).toBe(false);
  });
  it('fecha inválida no es activa', () => {
    expect(isStoryActive({ expires_at: 'x', deleted_at: null }, now)).toBe(false);
  });
});

describe('storyAgo', () => {
  it('rangos', () => {
    expect(storyAgo(ago(0), now)).toBe('hace un momento');
    expect(storyAgo(ago(59_000), now)).toBe('hace un momento');
    expect(storyAgo(ago(MIN), now)).toBe('hace 1 min');
    expect(storyAgo(ago(59 * MIN), now)).toBe('hace 59 min');
    expect(storyAgo(ago(H), now)).toBe('hace 1 h');
    expect(storyAgo(ago(23 * H + 59 * MIN), now)).toBe('hace 23 h');
    expect(storyAgo(ago(24 * H), now)).toBe('ayer');
    expect(storyAgo(ago(47 * H), now)).toBe('ayer');
  });
  it('fecha corta después de ayer', () => {
    expect(storyAgo('2026-10-12T18:00:00Z', now)).toBe('12 oct');
    expect(storyAgo('2026-01-03T18:00:00Z', now)).toBe('3 ene');
  });
  it('futuro cuenta como un momento; inválida vacía', () => {
    expect(storyAgo(ago(-5 * MIN), now)).toBe('hace un momento');
    expect(storyAgo('nada', now)).toBe('');
  });
});

describe('storyTimeLeft', () => {
  it('rangos', () => {
    expect(storyTimeLeft(ago(-5 * H - MIN), now)).toBe('quedan 5 h');
    expect(storyTimeLeft(ago(-H), now)).toBe('quedan 1 h');
    expect(storyTimeLeft(ago(-59 * MIN), now)).toBe('quedan 59 min');
    expect(storyTimeLeft(ago(-20 * MIN), now)).toBe('quedan 20 min');
    expect(storyTimeLeft(ago(-MIN), now)).toBe('quedan 1 min');
    expect(storyTimeLeft(ago(-30_000), now)).toBe('queda un minuto');
    expect(storyTimeLeft(ago(0), now)).toBe('ya se borró');
    expect(storyTimeLeft(ago(H), now)).toBe('ya se borró');
    expect(storyTimeLeft('x', now)).toBe('ya se borró');
  });
});

describe('groupStories', () => {
  const none = new Set<string>();
  it('solo activas, ordenadas de vieja a nueva', () => {
    const list = [
      story('m2', 'me', 1 * H),
      story('m1', 'me', 3 * H),
      story('mdel', 'me', 2 * H, { deleted_at: ago(MIN) }),
      story('mold', 'me', 25 * H),
      story('p2', 'her', 1 * H),
      story('p1', 'her', 5 * H),
      story('x', 'otro', 1 * H),
    ];
    const g = groupStories(list, 'me', 'her', none, now);
    expect(g.mine.map((s) => s.id)).toEqual(['m1', 'm2']);
    expect(g.partner.map((s) => s.id)).toEqual(['p1', 'p2']);
    expect(g.partnerUnseen).toBe(2);
    expect(g.firstUnseenIndex).toBe(0);
  });
  it('calcula no vistas y primera no vista', () => {
    const list = [story('p1', 'her', 5 * H), story('p2', 'her', 3 * H), story('p3', 'her', 1 * H)];
    const g = groupStories(list, 'me', 'her', new Set(['p1', 'p2']), now);
    expect(g.partnerUnseen).toBe(1);
    expect(g.firstUnseenIndex).toBe(2);
  });
  it('todas vistas → índice 0', () => {
    const list = [story('p1', 'her', 5 * H), story('p2', 'her', 3 * H)];
    const g = groupStories(list, 'me', 'her', new Set(['p1', 'p2']), now);
    expect(g.partnerUnseen).toBe(0);
    expect(g.firstUnseenIndex).toBe(0);
  });
  it('sin pareja o sin stories', () => {
    const g = groupStories([story('m', 'me', H), story('p', 'her', H)], 'me', null, none, now);
    expect(g.partner).toEqual([]);
    expect(g.mine).toHaveLength(1);
    expect(groupStories([], 'me', 'her', none, now)).toEqual({
      mine: [],
      partner: [],
      partnerUnseen: 0,
      firstUnseenIndex: 0,
    });
  });
  it('no muta la entrada', () => {
    const list = [story('b', 'me', H), story('a', 'me', 2 * H)];
    groupStories(list, 'me', null, none, now);
    expect(list.map((s) => s.id)).toEqual(['b', 'a']);
  });
});

describe('storyPaths', () => {
  it('arma rutas', () => {
    expect(storyPaths('c1', 'u1', 'f1')).toEqual({
      media: 'c1/u1/f1.jpg',
      thumb: 'c1/u1/f1_thumb.jpg',
    });
  });
});

describe('storyDurationMs', () => {
  it('por tipo', () => {
    expect(storyDurationMs('photo')).toBe(6000);
    expect(storyDurationMs('text')).toBe(5000);
    expect(storyDurationMs('drawing')).toBe(5000);
  });
});

describe('validateStoryText / validateReply', () => {
  it('texto', () => {
    expect(validateStoryText('')).toBe('empty');
    expect(validateStoryText('   ')).toBe('empty');
    expect(validateStoryText('hola')).toBeNull();
    expect(validateStoryText('a'.repeat(280))).toBeNull();
    expect(validateStoryText('a'.repeat(281))).toBe('too_long');
  });
  it('respuesta', () => {
    expect(validateReply(' ')).toBe('empty');
    expect(validateReply('ok')).toBeNull();
    expect(validateReply('a'.repeat(500))).toBeNull();
    expect(validateReply('a'.repeat(501))).toBe('too_long');
  });
});

describe('clampSticker', () => {
  it('deja intacto lo válido', () => {
    const s = { e: '🌮', x: 0.5, y: 0.25, s: 1, r: 10 };
    expect(clampSticker(s)).toEqual(s);
  });
  it('limita rangos', () => {
    expect(clampSticker({ e: 'a', x: -1, y: 2, s: 0.1, r: -90 })).toEqual({
      e: 'a',
      x: 0,
      y: 1,
      s: 0.5,
      r: -45,
    });
    expect(clampSticker({ e: 'a', x: 0.5, y: 0.5, s: 9, r: 90 })).toMatchObject({ s: 3, r: 45 });
  });
  it('redondea', () => {
    expect(clampSticker({ e: 'a', x: 0.12345, y: 0.9996, s: 1.23456, r: 12.6 })).toEqual({
      e: 'a',
      x: 0.123,
      y: 1,
      s: 1.235,
      r: 13,
    });
  });
  it('NaN cae al mínimo', () => {
    expect(clampSticker({ e: 'a', x: NaN, y: 0, s: NaN, r: NaN })).toMatchObject({
      x: 0,
      s: 0.5,
      r: -45,
    });
  });
});

describe('archiveByMonth', () => {
  const items = [
    { id: 1, created_at: '2026-10-20T15:00:00Z' },
    { id: 2, created_at: '2026-10-02T15:00:00Z' },
    { id: 3, created_at: '2026-09-30T15:00:00Z' },
    { id: 4, created_at: '2025-12-31T15:00:00Z' },
  ];
  it('agrupa por mes conservando el orden', () => {
    const g = archiveByMonth(items, 'America/Mexico_City');
    expect(g.map((x) => [x.key, x.label, x.items.map((i) => i.id)])).toEqual([
      ['2026-10', 'octubre 2026', [1, 2]],
      ['2026-09', 'septiembre 2026', [3]],
      ['2025-12', 'diciembre 2025', [4]],
    ]);
  });
  it('respeta la zona horaria en el límite del mes', () => {
    const edge = [{ created_at: '2026-11-01T03:00:00Z' }];
    expect(archiveByMonth(edge, 'America/Mexico_City')[0].key).toBe('2026-10');
    expect(archiveByMonth(edge, 'UTC')[0].key).toBe('2026-11');
  });
  it('vacío', () => {
    expect(archiveByMonth([], 'UTC')).toEqual([]);
  });
});
