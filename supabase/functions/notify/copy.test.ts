/** @jest-environment node */
import {
  COPY_LIMITS,
  answerCopy,
  commentCopy,
  moodCopy,
  nudgeCopy,
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
  it('no usa "tu pareja ha respondido" ni signos de exclamación', () => {
    for (const seed of seeds) {
      const all = [
        answerCopy({ ...base, seed, daily: true, recipientAnswered: false, questionText: null }),
        nudgeCopy({ ...base, seed }),
        storyCopy({ ...base, seed, storyKind: 'photo', text: null }),
        storyCopy({ ...base, seed, storyKind: 'drawing', text: null }),
        storyReplyCopy({ ...base, seed, body: 'hola', toAuthor: true }),
        testCopy({ ...base, seed }),
      ];
      for (const c of all) expect(`${c.title} ${c.body}`).not.toMatch(/[¡!]|ha respondido/i);
    }
  });
});
