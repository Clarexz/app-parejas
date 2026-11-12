import {
  NEAR_DUP_ERROR,
  NEAR_DUP_WARN,
  NearDupIndex,
  buildReport,
  checkStyle,
  checkTextStyle,
  contentTokens,
  findNearDuplicates,
  parseAllowlist,
  pairKey,
  similarity,
} from '../lib/contentCheck.ts';
import type { Content, ValidatedQuestion } from '../lib/seed.ts';

const msgs = (t: string, nhie = false) =>
  checkTextStyle(t, nhie)
    .filter((f) => f.level === 'error')
    .map((f) => f.message)
    .join(' | ');

describe('casi-duplicados', () => {
  it('quita palabras vacías y normaliza', () => {
    expect(contentTokens('¿Cuál es el color favorito de tu mamá?')).toEqual([
      'color',
      'favorito',
      'mama',
    ]);
  });

  it('textos idénticos o casi idénticos superan el umbral de error', () => {
    expect(similarity('¿Cuál es tu color favorito?', 'Cual es tu color favorito')).toBe(1);
    expect(
      similarity(
        '¿Qué canción te recuerda a tu infancia?',
        '¿Qué canciones te recuerdan tu infancia?',
      ),
    ).toBeGreaterThanOrEqual(NEAR_DUP_ERROR);
  });

  it('preguntas distintas con el mismo tema quedan por debajo del aviso', () => {
    expect(similarity('¿Cuál es tu color favorito?', '¿Cuál es tu comida favorita?')).toBeLessThan(
      NEAR_DUP_WARN,
    );
    expect(
      similarity('¿Qué harías con un millón de pesos?', '¿Dónde viviríamos en un año?'),
    ).toBeLessThan(0.2);
  });

  it('findNearDuplicates marca error y aviso, y respeta la lista de permitidos', () => {
    const items = [
      { slug: 'a-1', text: '¿Qué canción te recuerda a tu infancia?' },
      { slug: 'a-2', text: '¿Qué canciones te recuerdan tu infancia?' },
      { slug: 'a-3', text: '¿Qué canción te recuerda a tu primer viaje largo?' },
      { slug: 'a-4', text: '¿Dónde te gustaría vivir en diez años?' },
    ];
    const found = findNearDuplicates(items);
    expect(found.some((f) => f.level === 'error' && f.a.slug === 'a-1' && f.b.slug === 'a-2')).toBe(
      true,
    );
    expect(found.every((f) => f.a.slug !== 'a-4' && f.b.slug !== 'a-4')).toBe(true);
    const allowed = new Set([pairKey('a-2', 'a-1')]);
    const filtered = findNearDuplicates(items, allowed);
    expect(filtered.some((f) => f.a.slug === 'a-1' && f.b.slug === 'a-2')).toBe(false);
  });

  it('parseAllowlist valida el formato', () => {
    expect(parseAllowlist(undefined).errors).toEqual([]);
    expect(parseAllowlist({ pairs: [['a', 'b']] }).keys.has(pairKey('b', 'a'))).toBe(true);
    expect(parseAllowlist({ pairs: [['a']] }).errors).toHaveLength(1);
    expect(parseAllowlist({}).errors).toHaveLength(1);
  });

  it('NearDupIndex.find devuelve los más parecidos primero', () => {
    const idx = new NearDupIndex();
    idx.add({ slug: 'x-1', text: '¿Qué te hace reír sin parar?' });
    idx.add({ slug: 'x-2', text: '¿Qué te hace reír sin parar con tus amigos?' });
    const r = idx.find('¿Qué te hace reír sin parar?');
    expect(r[0].slug).toBe('x-1');
    expect(r[0].score).toBe(1);
  });

  it('corre rápido con ~4,000 textos', () => {
    const verbs = ['comer', 'viajar', 'bailar', 'cantar', 'dormir', 'correr', 'leer', 'pintar'];
    const things = Array.from(
      { length: 40 },
      (_, i) => `cosa${String.fromCharCode(97 + (i % 26))}${i}`,
    );
    const items = [];
    for (let i = 0; i < 4000; i++) {
      items.push({
        slug: `s-${i}`,
        text: `¿Te gustaría ${verbs[i % 8]} con ${things[i % 40]} y planear ${things[(i * 7) % 40]} número ${i}?`,
      });
    }
    const t0 = Date.now();
    findNearDuplicates(items);
    expect(Date.now() - t0).toBeLessThan(10000);
  });
});

describe('ortografía y estilo', () => {
  it('acepta texto correcto', () => {
    expect(msgs('¿Qué canción te transporta a tu infancia?')).toBe('');
    expect(msgs('Domingo sin prisas: ¿qué desayuno te hace más feliz?')).toBe('');
    expect(msgs('Yo nunca he mandado un mensaje al contacto equivocado.', true)).toBe('');
    expect(msgs('¡Qué ganas de verte pronto!')).toBe('');
  });

  it('exige ¿ y ¡ de apertura', () => {
    expect(msgs('Qué canción te transporta a tu infancia?')).toMatch(/interrogación/);
    expect(msgs('¿Qué canción te transporta a tu infancia')).toMatch(/interrogación/);
    expect(msgs('Qué ganas de verte!')).toMatch(/exclamación/);
  });

  it('espacios y signos repetidos', () => {
    expect(msgs('¿Qué canción te gusta ?')).toMatch(/espacio antes/);
    expect(msgs('Hola , ¿cómo estás?')).toMatch(/espacio antes/);
    expect(msgs('¿ Qué canción te gusta?')).toMatch(/espacio después de ¿/);
    expect(msgs('¿Qué canción te gusta??')).toMatch(/repetidos/);
    expect(msgs('¡Qué ganas de verte!!')).toMatch(/repetidos/);
    expect(msgs('Hola,mundo, ¿cómo estás?')).toMatch(/falta un espacio después de ,/);
  });

  it('minúscula inicial e interrogativos sin tilde', () => {
    expect(msgs('¿qué canción te gusta?')).toMatch(/minúscula/);
    expect(msgs('¿Que canción te gusta?')).toMatch(/sin tilde/);
    expect(msgs('A veces, ¿como te sientes?')).toMatch(/sin tilde/);
  });

  it('vosotros y palabras de España', () => {
    expect(msgs('¿Qué queréis hacer vosotros?')).toMatch(/vosotros/);
    expect(msgs('¿Os gusta vuestra casa?')).toMatch(/"Os"/);
    expect(msgs('¿Dónde dejaste tu móvil?')).toMatch(/celular/);
    expect(msgs('¿Dónde dejaste tu celular?')).toBe('');
    // "os" dentro de otra palabra no cuenta.
    expect(msgs('¿Qué cosas nos hacen reír?')).toBe('');
  });

  it('Yo nunca no lleva interrogación', () => {
    expect(msgs('Yo nunca he dicho ¿qué?', true)).toMatch(/Yo nunca/);
  });

  it('checkStyle revisa las opciones y devuelve el slug', () => {
    const qs: ValidatedQuestion[] = [
      {
        slug: 'amor-x',
        category: 'amor',
        type: 'choice',
        intensity: 'ligera',
        text: '¿Qué prefieres para hoy?',
        options: ['Mi móvil', 'Nada'],
        position: null,
      },
    ];
    const f = checkStyle(qs);
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ slug: 'amor-x', level: 'error' });
  });

  it('avisos: sin puntuación final y varias preguntas', () => {
    const w = checkTextStyle('¿Has soñado conmigo? ¿Qué pasaba?').map((f) => f.level);
    expect(w).toEqual(['warn']);
    expect(checkTextStyle('Elige el superpoder que quieras tener hoy').map((f) => f.level)).toEqual(
      ['warn'],
    );
  });
});

describe('buildReport', () => {
  const mk = (
    category: string,
    n: number,
    type = 'open',
    intensity = 'ligera',
  ): ValidatedQuestion => ({
    slug: `${category}-${type}-${n}`,
    category,
    type: type as 'open',
    intensity: intensity as 'ligera',
    text: `texto ${n}`,
    options: null,
    position: null,
  });
  const content: Content = {
    categories: [],
    packs: [
      { slug: 'pack-a', name: '', emoji: '', intensity: 'ligera', position: 1, description: '' },
    ],
    questions: [
      mk('amor', 1),
      mk('amor', 2),
      mk('amor', 3, 'choice'),
      mk('pack-a', 1),
      mk('juegos', 1, 'wyr'),
    ],
    drawingWords: [],
  };

  it('compara por celda, por juego, por pack y totales', () => {
    const r = buildReport(content, {
      daily: { min_total: 5, categories: { amor: { ligera: { open: 3, choice: 1 } } } },
      games: { min_total: 2, items: { wyr: { ligera: 4 } } },
      packs: { 'pack-a': 3 },
      min_total: 10,
    });
    expect(r.daily).toEqual([
      { group: 'amor', intensity: 'ligera', kind: 'open', target: 3, actual: 2, missing: 1 },
      { group: 'amor', intensity: 'ligera', kind: 'choice', target: 1, actual: 1, missing: 0 },
    ]);
    expect(r.games[0]).toMatchObject({ group: 'wyr', actual: 1, missing: 3 });
    expect(r.packs[0]).toMatchObject({ group: 'pack-a', actual: 1, missing: 2 });
    expect(r.totals).toMatchObject({ daily: 3, games: 1, packs: 1, total: 5 });
    expect(r.strictFailures).toEqual(['diarias: 3 < 5', 'juegos: 1 < 2', 'total: 5 < 10']);
  });

  it('sin taxonomía no hay fallas estrictas', () => {
    expect(buildReport(content, {}).strictFailures).toEqual([]);
  });
});
