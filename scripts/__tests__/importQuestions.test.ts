import {
  buildImport,
  csvToRecords,
  makeSlug,
  normalizeRecords,
  parseCsv,
  slugify,
} from '../lib/importQuestions.ts';
import type { ExistingContent } from '../lib/importQuestions.ts';
import { normalizeText } from '../lib/seed.ts';
import type { Category } from '../lib/seed.ts';

const cat = (slug: string): Category => ({
  slug,
  name: slug,
  emoji: 'x',
  intensity: 'ligera',
  position: 1,
  description: '',
});

function existing(items: { slug: string; text: string }[] = []): ExistingContent {
  return {
    categories: new Map([cat('amor'), cat('picantes'), cat('conocernos')].map((c) => [c.slug, c])),
    slugs: new Map(items.map((i) => [i.slug, 'content'])),
    texts: new Map(items.map((i) => [normalizeText(i.text), i.slug])),
    items,
  };
}

describe('parseCsv', () => {
  it('maneja comillas, comillas escapadas, comas y saltos dentro de comillas', () => {
    expect(parseCsv('a,"b,c","d ""e""","f\ng"\n')).toEqual([['a', 'b,c', 'd "e"', 'f\ng']]);
  });

  it('quita el BOM y acepta CRLF, campos vacíos y última línea sin salto', () => {
    expect(parseCsv('﻿a,b\r\n,x\r\nc,')).toEqual([
      ['a', 'b'],
      ['', 'x'],
      ['c', ''],
    ]);
  });

  it('ignora líneas vacías', () => {
    expect(parseCsv('a\n\n\nb\n')).toEqual([['a'], ['b']]);
  });
});

describe('csvToRecords / normalizeRecords', () => {
  it('lee encabezados en español, opciones con | y defaults', () => {
    const csv =
      '﻿texto,categoria,tipo,intensidad,opciones\n"¿Café o té, siempre?",gustos,choice,Profunda,Café|Té\n¿Algo más para decir hoy?,amor,,,\n';
    const rows = normalizeRecords(csvToRecords(csv));
    expect(rows[0]).toMatchObject({
      text: '¿Café o té, siempre?',
      category: 'gustos',
      type: 'choice',
      intensity: 'profunda',
      options: ['Café', 'Té'],
      line: 1,
    });
    expect(rows[1]).toMatchObject({ type: 'open', intensity: 'ligera', options: [] });
  });

  it('acepta llaves en inglés y opciones como arreglo (JSON)', () => {
    const rows = normalizeRecords([
      { text: ' hola   mundo ', category: 'AMOR', type: 'choice', options: ['a', ' b '] },
    ]);
    expect(rows[0]).toMatchObject({ text: 'hola mundo', category: 'amor', options: ['a', 'b'] });
  });

  it('detecta punto y coma como separador', () => {
    expect(csvToRecords('texto;categoria\nhola;amor\n')).toEqual([
      { texto: 'hola', categoria: 'amor' },
    ]);
  });
});

describe('slugs', () => {
  it('slugify quita acentos, ñ y signos', () => {
    expect(slugify('¿Qué canción te hace llorar, mi niño?')).toBe(
      'que-cancion-te-hace-llorar-mi-nino',
    );
    expect(slugify('  --Ñandú!! ')).toBe('nandu');
  });

  it('makeSlug usa el prefijo de la categoría y no pasa de 80', () => {
    const long = 'palabra '.repeat(30);
    const s = makeSlug('conocernos', long, new Set());
    expect(s.startsWith('conocernos-')).toBe(true);
    expect(s.length).toBeLessThanOrEqual(80);
    expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('makeSlug evita choques con sufijo numérico', () => {
    const taken = new Set(['amor-hola-mundo']);
    expect(makeSlug('amor', 'Hola mundo', taken)).toBe('amor-hola-mundo-2');
    taken.add('amor-hola-mundo-2');
    expect(makeSlug('amor', 'Hola mundo', taken)).toBe('amor-hola-mundo-3');
  });
});

describe('buildImport', () => {
  const row = (text: string, over: Record<string, unknown> = {}, line = 1) => ({
    text,
    category: 'amor',
    type: 'open',
    intensity: 'ligera',
    options: [] as string[],
    line,
    ...over,
  });

  it('escribe las válidas y salta inválidas, duplicadas y casi-duplicadas', () => {
    const ex = existing([{ slug: 'amor-a', text: '¿Qué canción te recuerda a tu infancia?' }]);
    const r = buildImport(
      [
        row('¿Qué fue lo que más te enamoró de mí?', {}, 1),
        row('corta', {}, 2),
        row('¿Qué canción te recuerda a tu infancia?', {}, 3),
        row('¿Qué canciones te recuerdan tu infancia?', {}, 4),
        row('¿Qué fue lo que más te enamoró de mí?', {}, 5),
        row('¿Dónde quieres vivir algún día?', { category: 'nada' }, 6),
        row(
          '¿Prefieres playa o montaña este año?',
          { type: 'choice', options: ['Playa', 'Montaña'] },
          7,
        ),
      ],
      ex,
    );
    expect(r.questions.map((q) => q.slug)).toEqual([
      'amor-que-fue-lo-que-mas-te-enamoro-de-mi',
      'amor-prefieres-playa-o-montana-este-ano',
    ]);
    expect(r.questions[1].options).toEqual(['Playa', 'Montaña']);
    expect(r.rejected.map((x) => x.line)).toEqual([2, 3, 4, 5, 6]);
    expect(r.rejected[1].reasons.join()).toMatch(/duplicado/);
    expect(r.rejected[2].reasons.join()).toMatch(/casi-duplicada/);
    expect(r.rejected[4].reasons.join()).toMatch(/category "nada"/);
  });

  it('una fila inválida no reclama su texto para las siguientes', () => {
    const r = buildImport(
      [
        row(
          '¿Qué te hace sentir más tranquilo en casa?',
          { type: 'choice', options: ['solo una'] },
          1,
        ),
        row('¿Qué te hace sentir más tranquilo en casa?', {}, 2),
      ],
      existing(),
    );
    expect(r.rejected.map((x) => x.line)).toEqual([1]);
    expect(r.questions).toHaveLength(1);
  });

  it('respeta la regla de picantes y open sin opciones', () => {
    const r = buildImport(
      [
        row('¿Qué fantasía te da más curiosidad contarme?', { intensity: 'picante' }, 1),
        row(
          '¿Qué fantasía te da más curiosidad contarme?',
          { category: 'picantes', intensity: 'picante' },
          2,
        ),
        row('¿Cuál es tu mejor recuerdo de nosotros dos?', { options: ['a', 'b'] }, 3),
      ],
      existing(),
    );
    expect(r.questions.map((q) => q.category)).toEqual(['picantes']);
    expect(r.rejected.map((x) => x.line)).toEqual([1, 3]);
  });
});
