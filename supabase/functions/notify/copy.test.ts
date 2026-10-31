/** @jest-environment node */
import {
  COPY_LIMITS,
  answerCopy,
  commentCopy,
  drawingCopy,
  formatDateRange,
  gameCopy,
  loveLanguageCopy,
  visitCopy,
  moodCopy,
  nudgeCopy,
  memoryCopy,
  storyCopy,
  storyReplyCopy,
  testCopy,
  truncate,
  type Copy,
} from './copy';

const LONG_NAME = 'Maria Guadalupe Hernandez de la Cruz Villanueva';
const LONG_TEXT = 'palabra '.repeat(80);
const base = { actor: LONG_NAME, recipient: LONG_NAME };

function within(c: Copy) {
  expect(c.title.length).toBeLessThanOrEqual(COPY_LIMITS.title);
  expect(c.body.length).toBeLessThanOrEqual(COPY_LIMITS.body);
  expect(c.title.length).toBeGreaterThan(0);
  expect(c.body.length).toBeGreaterThan(0);
}

describe('truncate', () => {
  it('colapsa espacios y saltos de línea', () => {
    expect(truncate('  hola \n\n  mundo\t!  ', 50)).toBe('hola mundo !');
  });
  it('no toca textos que caben', () => {
    expect(truncate('hola', 4)).toBe('hola');
  });
  it('recorta por palabra y agrega puntos suspensivos', () => {
    const out = truncate('uno dos tres cuatro cinco', 14);
    expect(out).toBe('uno dos tres…');
    expect(out.length).toBeLessThanOrEqual(14);
  });
  it('corta duro si no hay espacios', () => {
    const out = truncate('a'.repeat(50), 10);
    expect(out).toBe('a'.repeat(9) + '…');
  });
  it('nunca supera max', () => {
    for (let m = 0; m < 30; m++) expect(truncate(LONG_TEXT, m).length).toBeLessThanOrEqual(m);
  });
  it('no parte un emoji por la mitad', () => {
    const out = truncate('😀😀😀😀😀😀', 4);
    expect(out).not.toMatch(/[\ud800-\udbff]…$/);
  });
});

describe('copys', () => {
  const seeds = [0, 1, 2, 3, 4, 5, 17];
  it('respetan los límites con nombres y textos largos', () => {
    for (const seed of seeds) {
      const b = { ...base, seed };
      for (const daily of [true, false])
        for (const recipientAnswered of [true, false])
          within(answerCopy({ ...b, daily, recipientAnswered, questionText: LONG_TEXT }));
      within(commentCopy({ ...b, body: LONG_TEXT, questionText: LONG_TEXT }));
      within(commentCopy({ ...b, body: null, questionText: LONG_TEXT }));
      within(moodCopy({ ...b, emoji: '😀', note: LONG_TEXT }));
      within(moodCopy({ ...b, emoji: '😀', note: null }));
      within(nudgeCopy(b));
      for (const storyKind of ['photo', 'text', 'drawing'] as const) {
        within(storyCopy({ ...b, storyKind, text: LONG_TEXT }));
        within(storyCopy({ ...b, storyKind, text: null }));
      }
      for (const toAuthor of [true, false]) {
        within(storyReplyCopy({ ...b, body: LONG_TEXT, toAuthor }));
        within(storyReplyCopy({ ...b, body: '', toAuthor }));
      }
      within(memoryCopy({ ...b, title: LONG_TEXT, placeName: LONG_TEXT }));
      within(memoryCopy({ ...b, title: null, placeName: null }));
      for (const game of ['wyr', 'nhie', 'most_likely', 'agree', 'x']) {
        within(gameCopy({ ...b, game, event: 'started', matchPct: null }));
        within(gameCopy({ ...b, game, event: 'finished', matchPct: 100 }));
        within(gameCopy({ ...b, game, event: 'finished', matchPct: null }));
      }
      for (const event of ['ready', 'solved', 'gave_up'] as const) {
        within(drawingCopy({ ...b, event, word: LONG_TEXT }));
        within(drawingCopy({ ...b, event, word: null }));
      }
      for (const recipientDone of [true, false]) within(loveLanguageCopy({ ...b, recipientDone }));
      within(visitCopy({ ...b, startDate: '2025-12-28', endDate: '2026-01-02', place: LONG_TEXT }));
      within(visitCopy({ ...b, startDate: '2026-10-12', endDate: '2026-10-12', place: null }));
      within(visitCopy({ ...b, startDate: '', endDate: '', place: null }));
      within(testCopy(b));
    }
  });
  it('son deterministas por seed y cambian entre seeds', () => {
    const f = (seed: number) => nudgeCopy({ actor: 'Ale', recipient: 'Beto', seed });
    expect(f(7)).toEqual(f(7));
    expect(new Set([0, 1, 2, 3].map((s) => JSON.stringify(f(s)))).size).toBeGreaterThan(1);
    expect(f(0)).toEqual(f(4));
  });
  it('commentCopy con body null no revela nada del comentario', () => {
    const secret = 'SECRETO-del-comentario';
    for (const seed of seeds) {
      const c = commentCopy({
        actor: 'Ale',
        recipient: 'Beto',
        seed,
        body: null,
        questionText: 'pregunta',
      });
      expect(JSON.stringify(c)).not.toContain(secret);
      expect(c.body.toLowerCase()).toContain('contest');
    }
  });
  it('commentCopy con body lo muestra recortado', () => {
    const c = commentCopy({
      actor: 'Ale',
      recipient: 'Beto',
      seed: 0,
      body: 'Qué bonito',
      questionText: null,
    });
    expect(c.body).toBe('Qué bonito');
  });
  it('moodCopy incluye el emoji y la nota', () => {
    const c = moodCopy({
      actor: 'Ale',
      recipient: 'Beto',
      seed: 0,
      emoji: '🥹',
      note: 'Día largo',
    });
    expect(c.title).toContain('🥹');
    expect(c.body).toBe('Día largo');
  });
  it('storyCopy: título con el nombre y cuerpo según el tipo', () => {
    const b = { actor: 'Ale', recipient: 'Beto', seed: 0 };
    expect(storyCopy({ ...b, storyKind: 'photo', text: null }).title).toBe('Ale pegó una story');
    const text = storyCopy({ ...b, storyKind: 'text', text: 'Te quiero harto' });
    expect(text.title).toContain('Ale');
    expect(text.body).toBe('Te quiero harto');
    // Una story de texto sin texto cae al aviso genérico.
    expect(storyCopy({ ...b, storyKind: 'text', text: null }).body.length).toBeGreaterThan(0);
    expect(storyCopy({ ...b, storyKind: 'drawing', text: null }).body).toMatch(
      /dibujo|verla|verlo/,
    );
  });
  it('storyReplyCopy distingue si quien recibe es el autor de la story', () => {
    const b = { actor: 'Ale', recipient: 'Beto', seed: 0, body: 'Qué bonita' };
    const toAuthor = storyReplyCopy({ ...b, toAuthor: true });
    expect(toAuthor.title).toBe('Ale respondió tu story');
    expect(toAuthor.body).toBe('Qué bonita');
    for (const seed of seeds) {
      expect(storyReplyCopy({ ...b, seed, toAuthor: true }).title).toMatch(/story/);
      expect(storyReplyCopy({ ...b, seed, toAuthor: false }).title).not.toMatch(/tu story/);
    }
  });
  it('memoryCopy: título con el nombre y el título de la memoria en el cuerpo', () => {
    const b = { actor: 'Ale', recipient: 'Beto', seed: 0 };
    const c = memoryCopy({ ...b, title: 'Playa en Mazatlán', placeName: null });
    expect(c.title).toBe('Ale pegó una memoria');
    expect(c.body).toBe('Playa en Mazatlán');
    for (const seed of seeds) {
      const v = memoryCopy({ ...b, seed, title: 'Playa en Mazatlán', placeName: 'Malecón' });
      expect(v.title).toContain('Ale');
      expect(v.body).toContain('Playa en Mazatlán');
    }
    // Sin título cae a un cuerpo genérico.
    expect(memoryCopy({ ...b, title: null, placeName: null }).body.length).toBeGreaterThan(0);
    // Las tres variantes existen.
    const titles = new Set(
      [0, 1, 2].map((seed) => memoryCopy({ ...b, seed, title: 'x', placeName: null }).title),
    );
    expect(titles.size).toBe(3);
  });
  it('gameCopy y drawingCopy: nombre del juego, porcentaje y palabra', () => {
    const b = { actor: 'Ale', recipient: 'Beto', seed: 0 };
    const g = gameCopy({ ...b, game: 'wyr', event: 'started', matchPct: null });
    expect(g.title).toBe('Ale te retó a ¿Qué prefieres?');
    expect(gameCopy({ ...b, game: 'nhie', event: 'finished', matchPct: 70 }).body).toContain(
      '70 %',
    );
    expect(drawingCopy({ ...b, event: 'solved', word: 'Piñata' }).body).toContain('Piñata');
    expect(drawingCopy({ ...b, event: 'ready', word: 'Piñata' }).body).not.toContain('Piñata');
  });
  it('no usa "tu pareja ha respondido" ni signos de exclamación', () => {
    for (const seed of seeds) {
      const all = [
        answerCopy({ ...base, seed, daily: true, recipientAnswered: false, questionText: null }),
        nudgeCopy({ ...base, seed }),
        storyCopy({ ...base, seed, storyKind: 'photo', text: null }),
        storyCopy({ ...base, seed, storyKind: 'drawing', text: null }),
        storyReplyCopy({ ...base, seed, body: 'hola', toAuthor: true }),
        memoryCopy({ ...base, seed, title: 'Playa', placeName: 'Malecón' }),
        gameCopy({ ...base, seed, game: 'wyr', event: 'started', matchPct: null }),
        gameCopy({ ...base, seed, game: 'wyr', event: 'finished', matchPct: 70 }),
        drawingCopy({ ...base, seed, event: 'ready', word: null }),
        drawingCopy({ ...base, seed, event: 'solved', word: 'Piñata' }),
        drawingCopy({ ...base, seed, event: 'gave_up', word: 'Piñata' }),
        loveLanguageCopy({ ...base, seed, recipientDone: true }),
        loveLanguageCopy({ ...base, seed, recipientDone: false }),
        visitCopy({
          ...base,
          seed,
          startDate: '2026-10-12',
          endDate: '2026-10-18',
          place: 'Monterrey',
        }),
        testCopy({ ...base, seed }),
      ];
      for (const c of all) expect(`${c.title} ${c.body}`).not.toMatch(/[¡!]|ha respondido/i);
    }
  });
  it('formatDateRange: mismo mes, distinto mes, distinto año, un día e inválida', () => {
    expect(formatDateRange('2026-10-12', '2026-10-18')).toBe('del 12 al 18 de octubre');
    expect(formatDateRange('2026-09-28', '2026-10-02')).toBe('del 28 de sep. al 2 de oct.');
    expect(formatDateRange('2025-12-28', '2026-01-02')).toBe(
      'del 28 de dic. de 2025 al 2 de ene. de 2026',
    );
    expect(formatDateRange('2026-10-12', '2026-10-12')).toBe('el 12 de octubre');
    expect(formatDateRange('2026-13-01', '2026-10-12')).toBe('');
    expect(formatDateRange('hola', '')).toBe('');
  });
  it('visitCopy: con y sin lugar', () => {
    const b = { actor: 'Ale', recipient: 'Beto', seed: 0 };
    const withPlace = visitCopy({
      ...b,
      startDate: '2026-10-12',
      endDate: '2026-10-18',
      place: 'Monterrey',
    });
    expect(withPlace.body).toBe('Se vieron del 12 al 18 de octubre en Monterrey.');
    const noPlace = visitCopy({
      ...b,
      startDate: '2026-10-12',
      endDate: '2026-10-12',
      place: null,
    });
    expect(noPlace.body).toBe('Se vieron el 12 de octubre.');
  });
  it('loveLanguageCopy: invita o invita a comparar, sin resultado', () => {
    const b = { actor: 'Ale', recipient: 'Beto', seed: 0 };
    expect(loveLanguageCopy({ ...b, recipientDone: false }).body).toMatch(
      /Hazlo|el tuyo|Haz el tuyo/,
    );
    expect(
      loveLanguageCopy({ ...b, recipientDone: true }).title +
        loveLanguageCopy({ ...b, recipientDone: true }).body,
    ).toMatch(/compar|resultados/i);
  });
});
