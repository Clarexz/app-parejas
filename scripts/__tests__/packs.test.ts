import { generateSeedSql, validateContent } from '../lib/seed.ts';
import type { ExtraContent, QuestionFile } from '../lib/seed.ts';

const categories = {
  categories: [
    {
      slug: 'amor',
      name: 'Amor',
      emoji: '💌',
      intensity: 'profunda',
      position: 1,
      description: '',
    },
    {
      slug: 'picantes',
      name: 'Picantes',
      emoji: '🌶️',
      intensity: 'picante',
      position: 2,
      description: '',
    },
  ],
};

const packs = {
  packs: [
    {
      slug: 'pack-dinero',
      name: 'Dinero',
      emoji: '💸',
      intensity: 'profunda',
      position: 1,
      description: 'x',
    },
    {
      slug: 'pack-deseo',
      name: 'Deseo',
      emoji: '🌶️',
      intensity: 'picante',
      position: 2,
      description: 'y',
    },
  ],
};

function q(over: Record<string, unknown> = {}) {
  return {
    slug: 'amor-primera-vez',
    type: 'open',
    intensity: 'ligera',
    text: '¿Qué pensaste la primera vez que me viste?',
    ...over,
  };
}

const base: QuestionFile[] = [
  { file: 'amor.json', data: { category: 'amor', questions: [q()] } },
  { file: 'picantes.json', data: { category: 'picantes', questions: [] } },
];

function packFiles(dinero: unknown[] = [], deseo: unknown[] = []) {
  return [
    { file: 'pack-dinero.json', data: { pack: 'pack-dinero', questions: dinero } },
    { file: 'pack-deseo.json', data: { pack: 'pack-deseo', questions: deseo } },
  ];
}

function run(extra: ExtraContent, cats: unknown = categories, files: QuestionFile[] = base) {
  return validateContent(cats, files, [], extra);
}

function errorsOf(extra: ExtraContent, cats: unknown = categories, files = base): string[] {
  const r = run(extra, cats, files);
  return r.ok ? [] : r.errors;
}

const pq = (n: string, over: Record<string, unknown> = {}) => ({
  slug: `pack-dinero-${n}`,
  type: 'open',
  intensity: 'profunda',
  text: `¿Cómo te sientes con el tema número ${n} del dinero?`,
  ...over,
});

describe('packs', () => {
  it('acepta packs (incluso vacíos) y guarda position = índice', () => {
    const r = run({ packsData: packs, packFiles: packFiles([pq('uno'), pq('dos')]) });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const inPack = r.content.questions.filter((x) => x.category === 'pack-dinero');
    expect(inPack.map((x) => [x.slug, x.position])).toEqual([
      ['pack-dinero-uno', 1],
      ['pack-dinero-dos', 2],
    ]);
    expect(r.content.questions.find((x) => x.slug === 'amor-primera-vez')?.position).toBeNull();
    expect(r.packs).toEqual([
      { slug: 'pack-dinero', total: 2 },
      { slug: 'pack-deseo', total: 0 },
    ]);
    // Los packs van después de las categorías.
    expect(r.content.questions.map((x) => x.category)).toEqual([
      'amor',
      'pack-dinero',
      'pack-dinero',
    ]);
  });

  it('un pack sin archivo o un archivo sin pack es error', () => {
    const e1 = errorsOf({ packsData: packs, packFiles: [packFiles()[0]] });
    expect(e1.join()).toMatch(/pack-deseo.*no tiene archivo/);
    const e2 = errorsOf({
      packsData: packs,
      packFiles: [
        ...packFiles(),
        { file: 'pack-otro.json', data: { pack: 'pack-otro', questions: [] } },
      ],
    });
    expect(e2.join()).toMatch(/packs\/pack-otro\.json.*no existe en packs\.json/);
  });

  it('el slug del pack debe usar el prefijo pack- y no chocar con categorías ni juegos', () => {
    const bad = (slug: string) => ({
      packs: [{ ...packs.packs[0], slug }],
    });
    expect(errorsOf({ packsData: bad('dinero'), packFiles: [] }).join()).toMatch(
      /debe empezar con "pack-"/,
    );
    expect(errorsOf({ packsData: bad('juegos'), packFiles: [] }).join()).toMatch(/choca/);
    const withCollision = {
      categories: [
        ...categories.categories,
        { ...categories.categories[0], slug: 'pack-dinero', position: 9 },
      ],
    };
    const files: QuestionFile[] = [
      ...base,
      { file: 'pack-dinero.json', data: { category: 'pack-dinero', questions: [] } },
    ];
    expect(
      errorsOf({ packsData: packs, packFiles: packFiles() }, withCollision, files).join(),
    ).toMatch(/choca con una categoría/);
  });

  it('valida el prefijo del slug, nombre del archivo y duplicados contra todo', () => {
    const e = errorsOf({
      packsData: packs,
      packFiles: packFiles([
        pq('uno', { slug: 'dinero-uno' }),
        pq('dos', { text: '¿Qué pensaste la primera vez que me viste?' }),
        pq('tres', { slug: 'amor-primera-vez' }),
      ]),
    });
    const all = e.join('\n');
    expect(all).toMatch(/packs\/pack-dinero\.json \[dinero-uno\].*debe empezar con "pack-dinero-"/);
    expect(all).toMatch(/\[pack-dinero-dos\].*texto duplicado/);
    expect(all).toMatch(/\[amor-primera-vez\].*slug duplicado/);
  });

  it('regla picante por pack', () => {
    const noSpicy = errorsOf({
      packsData: packs,
      packFiles: packFiles([pq('uno', { intensity: 'picante' })]),
    });
    expect(noSpicy.join()).toMatch(/el pack no es picante/);
    const allSpicy = errorsOf({
      packsData: packs,
      packFiles: packFiles(
        [],
        [
          {
            slug: 'pack-deseo-uno',
            type: 'open',
            intensity: 'profunda',
            text: '¿Qué te gustaría que hiciéramos esta noche?',
          },
        ],
      ),
    });
    expect(allSpicy.join()).toMatch(/el pack es picante/);
    const ok = run({
      packsData: packs,
      packFiles: packFiles(
        [],
        [
          {
            slug: 'pack-deseo-uno',
            type: 'open',
            intensity: 'picante',
            text: '¿Qué te gustaría que hiciéramos esta noche?',
          },
        ],
      ),
    });
    expect(ok.ok).toBe(true);
  });

  it('el seed inserta packs con kind packs, position y desactiva solo lo global', () => {
    const r = run({ packsData: packs, packFiles: packFiles([pq('uno'), pq('dos')]) });
    if (!r.ok) throw new Error(r.errors.join('\n'));
    const sql = generateSeedSql(r.content, r.summary, r.packs, r.imported);
    expect(sql).toContain("'pack-dinero', 'Dinero', '💸', 'x', 'profunda', 1, 'packs'");
    expect(sql).toContain("'ligera', null)");
    expect(sql).toMatch(/'pack-dinero-dos'.*'profunda', 2\)/);
    expect(sql).toContain('  position = excluded.position,');
    expect(sql).toContain('where created_by is null and couple_id is null and slug not in (');
    expect(sql).toContain('--   pack-dinero: 2 (pack)');
  });
});

describe('importadas', () => {
  const imp = (over: Record<string, unknown> = {}) => ({
    slug: 'amor-que-te-enamoro',
    category: 'amor',
    type: 'open',
    intensity: 'ligera',
    text: '¿Qué fue lo que más te enamoró de mí?',
    ...over,
  });
  const run2 = (items: unknown[]) =>
    run({ importedFiles: [{ file: 'lista.json', data: { source: 'prueba', questions: items } }] });

  it('entran a su categoría diaria sin position', () => {
    const r = run2([imp()]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.summary.find((s) => s.slug === 'amor')?.total).toBe(2);
    expect(r.imported).toEqual([{ file: 'lista.json', source: 'prueba', total: 1 }]);
    expect(r.content.questions.find((x) => x.slug === 'amor-que-te-enamoro')?.position).toBeNull();
  });

  it('exige categoría diaria existente, prefijo y no choca con duplicados', () => {
    const all = (items: unknown[]) => {
      const r = run2(items);
      return r.ok ? '' : r.errors.join('\n');
    };
    expect(all([imp({ category: 'pack-dinero', slug: 'pack-dinero-x' })])).toMatch(
      /imported\/lista\.json.*category "pack-dinero"/,
    );
    expect(all([imp({ slug: 'otra-x' })])).toMatch(/debe empezar con "amor-"/);
    expect(all([imp({ text: '¿Qué pensaste la primera vez que me viste?' })])).toMatch(
      /texto duplicado/,
    );
    expect(all([imp({ intensity: 'picante' })])).toMatch(
      /solo se permite en la categoría picantes/,
    );
  });

  it('una carpeta vacía o sin importadas no afecta', () => {
    expect(run({ importedFiles: [] }).ok).toBe(true);
    expect(run({}).ok).toBe(true);
  });
});
