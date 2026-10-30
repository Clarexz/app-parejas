import { generateSeedSql, normalizeText, sqlString, validateContent } from '../lib/seed.ts';
import type { QuestionFile } from '../lib/seed.ts';

const categories = {
  categories: [
    {
      slug: 'amor',
      name: 'Amor',
      emoji: '💌',
      intensity: 'profunda',
      position: 2,
      description: 'x',
    },
    {
      slug: 'picantes',
      name: 'Picantes',
      emoji: '🌶️',
      intensity: 'picante',
      position: 3,
      description: '',
    },
    {
      slug: 'conocernos',
      name: 'Conocernos',
      emoji: '🔎',
      intensity: 'ligera',
      position: 1,
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

function files(amor: unknown[] = [q()], extra: QuestionFile[] = []): QuestionFile[] {
  return [
    { file: 'amor.json', data: { category: 'amor', questions: amor } },
    { file: 'conocernos.json', data: { category: 'conocernos', questions: [] } },
    { file: 'picantes.json', data: { category: 'picantes', questions: [] } },
    ...extra,
  ];
}

function errorsOf(f: QuestionFile[], cats: unknown = categories): string[] {
  const r = validateContent(cats, f);
  return r.ok ? [] : r.errors;
}

describe('validateContent', () => {
  it('acepta contenido válido y ordena por position y slug', () => {
    const r = validateContent(
      categories,
      files([
        q({ slug: 'amor-b' }),
        q({
          slug: 'amor-a',
          type: 'choice',
          text: 'Elige una opción que te guste más hoy',
          options: ['Uno', 'Dos'],
        }),
      ]),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.content.categories.map((c) => c.slug)).toEqual(['conocernos', 'amor', 'picantes']);
    expect(r.content.questions.map((x) => x.slug)).toEqual(['amor-a', 'amor-b']);
    expect(r.summary.find((s) => s.slug === 'amor')).toEqual({
      slug: 'amor',
      total: 2,
      open: 1,
      choice: 1,
    });
  });

  it('rechaza categoría inexistente y que no coincida con el archivo', () => {
    const e = errorsOf(
      files([q()], [{ file: 'otra.json', data: { category: 'amor', questions: [] } }]),
    );
    expect(e.join('\n')).toMatch(/otra\.json.*debe coincidir con el nombre del archivo/);
    const e2 = errorsOf(
      files([q()], [{ file: 'otra.json', data: { category: 'otra', questions: [] } }]),
    );
    expect(e2.join('\n')).toMatch(/la categoría "otra" no existe/);
  });

  it('rechaza categorías sin archivo', () => {
    const e = errorsOf(files().slice(0, 2));
    expect(e.join('\n')).toMatch(/picantes.*no tiene archivo/);
  });

  it('valida el formato del slug', () => {
    expect(errorsOf(files([q({ slug: 'Amor-X' })])).join()).toMatch(
      /amor\.json \[Amor-X\].*slug inválido/,
    );
    expect(errorsOf(files([q({ slug: 'amor--x' })])).join()).toMatch(/slug inválido/);
    expect(errorsOf(files([q({ slug: `amor-${'a'.repeat(80)}` })])).join()).toMatch(/80/);
    expect(errorsOf(files([q({ slug: 'conocernos-x' })])).join()).toMatch(
      /debe empezar con "amor-"/,
    );
  });

  it('detecta slugs duplicados entre archivos', () => {
    const e = errorsOf([
      { file: 'amor.json', data: { category: 'amor', questions: [q()] } },
      {
        file: 'conocernos.json',
        data: {
          category: 'conocernos',
          questions: [q({ text: 'Otro texto totalmente distinto aquí' })],
        },
      },
      { file: 'picantes.json', data: { category: 'picantes', questions: [] } },
    ]);
    expect(e.join('\n')).toMatch(/slug duplicado/);
  });

  it('valida type', () => {
    expect(errorsOf(files([q({ type: 'wyr' })])).join()).toMatch(/type debe ser open o choice/);
  });

  it('valida intensity y la regla de picantes', () => {
    expect(errorsOf(files([q({ intensity: 'fuerte' })])).join()).toMatch(/intensity debe ser/);
    expect(errorsOf(files([q({ intensity: 'picante' })])).join()).toMatch(
      /solo se permite en la categoría picantes/,
    );
    const e = errorsOf([
      { file: 'amor.json', data: { category: 'amor', questions: [] } },
      { file: 'conocernos.json', data: { category: 'conocernos', questions: [] } },
      {
        file: 'picantes.json',
        data: { category: 'picantes', questions: [q({ slug: 'picantes-x', intensity: 'ligera' })] },
      },
    ]);
    expect(e.join()).toMatch(/toda pregunta de picantes debe ser "picante"/);
  });

  it('valida la longitud y los espacios del texto', () => {
    expect(errorsOf(files([q({ text: 'Corta?' })])).join()).toMatch(/10 a 220/);
    expect(errorsOf(files([q({ text: 'a'.repeat(221) })])).join()).toMatch(/221 caracteres/);
    expect(errorsOf(files([q({ text: ' ¿Qué pensaste de mí?' })])).join()).toMatch(/espacios/);
    expect(errorsOf(files([q({ text: '¿Qué  pensaste de mí?' })])).join()).toMatch(/espacios/);
    expect(errorsOf(files([q({ text: undefined })])).join()).toMatch(/falta text/);
  });

  it('detecta textos duplicados ignorando acentos, mayúsculas, signos y espacios', () => {
    const e = errorsOf(
      files([
        q({ slug: 'amor-a', text: '¿Qué pensaste la primera vez que me viste?' }),
        q({ slug: 'amor-b', text: 'que PENSASTE la primera vez que me viste' }),
      ]),
    );
    expect(e.join()).toMatch(/amor\.json \[amor-b\].*texto duplicado de amor-a/);
  });

  it('valida options en choice y open', () => {
    const choice = (options: unknown) => q({ type: 'choice', options });
    expect(errorsOf(files([choice(undefined)])).join()).toMatch(/choice requiere/);
    expect(errorsOf(files([choice(['Una'])])).join()).toMatch(/2 a 4/);
    expect(errorsOf(files([choice(['1', '2', '3', '4', '5'])])).join()).toMatch(/2 a 4/);
    expect(errorsOf(files([choice(['Sí', 'sí'])])).join()).toMatch(/opción repetida/);
    expect(errorsOf(files([choice(['Sí', ''])])).join()).toMatch(/0 caracteres/);
    expect(errorsOf(files([choice(['Sí', 'a'.repeat(61)])])).join()).toMatch(/61 caracteres/);
    expect(errorsOf(files([choice(['Sí', 3])])).join()).toMatch(/debe ser texto/);
    expect(errorsOf(files([q({ options: ['a', 'b'] })])).join()).toMatch(/prohibido en open/);
    expect(errorsOf(files([choice(['Sí', 'No'])]))).toEqual([]);
  });

  it('valida las categorías', () => {
    const bad = (over: Record<string, unknown>) => ({
      categories: [{ ...categories.categories[0], ...over }, ...categories.categories.slice(1)],
    });
    expect(errorsOf(files(), bad({ slug: 'Amor' })).join()).toMatch(/slug inválido/);
    expect(errorsOf(files(), bad({ name: '' })).join()).toMatch(/name/);
    expect(errorsOf(files(), bad({ intensity: 'x' })).join()).toMatch(/intensity/);
    expect(errorsOf(files(), bad({ position: 3 })).join()).toMatch(/position 3 repetida/);
    expect(errorsOf(files(), bad({ position: 1.5 })).join()).toMatch(/position/);
    expect(errorsOf(files(), { nope: 1 }).join()).toMatch(/categories/);
  });
});

describe('normalizeText', () => {
  it('quita acentos, signos, mayúsculas y espacios repetidos', () => {
    expect(normalizeText('  ¿Qué  CANCIÓN, eh?! ')).toBe('que cancion eh');
  });
});

describe('sqlString', () => {
  it('duplica las comillas simples', () => {
    expect(sqlString("it's 'ok'")).toBe("'it''s ''ok'''");
  });
  it('conserva barras, acentos y saltos de línea', () => {
    expect(sqlString('a\\b ñ\n')).toBe("'a\\b ñ\n'");
  });
  it('rechaza NUL', () => {
    expect(() => sqlString('a\0b')).toThrow();
  });
});

describe('generateSeedSql', () => {
  const r = validateContent(
    categories,
    files([
      q({ slug: 'amor-b', text: "¿Qué es lo que más te gusta de 'nosotros'?" }),
      q({
        slug: 'amor-a',
        type: 'choice',
        text: 'Domingo sin prisas, ¿qué eliges hoy?',
        options: ['Hot cakes', "Lo que sobró d'anoche"],
      }),
    ]),
  );
  if (!r.ok) throw new Error(r.errors.join('\n'));

  it('es determinista', () => {
    const a = generateSeedSql(r.content, r.summary);
    const b = generateSeedSql(r.content, r.summary);
    expect(a).toBe(b);
  });

  it('incluye encabezado, transacción, upserts y desactivación', () => {
    const sql = generateSeedSql(r.content, r.summary);
    expect(sql.startsWith('-- Generado por scripts/build-seed.ts — no editar a mano')).toBe(true);
    expect(sql).toContain('--   amor: 2 (open 1, choice 1)');
    expect(sql).toContain('\nbegin;\n');
    expect(sql.trimEnd().endsWith('commit;')).toBe(true);
    expect(sql).toContain('on conflict (slug) do update set');
    expect(sql).toContain('is_active = true;');
    expect(sql).toContain('where created_by is null and slug not in (');
    expect(sql).not.toMatch(/set[^;]*\bid =|created_by =/);
  });

  it('escapa comillas y arma options como jsonb', () => {
    const sql = generateSeedSql(r.content, r.summary);
    expect(sql).toContain("'¿Qué es lo que más te gusta de ''nosotros''?'");
    expect(sql).toContain(`'["Hot cakes","Lo que sobró d''anoche"]'::jsonb`);
    expect(sql).toContain(', null, ');
  });

  it('ordena por position y slug', () => {
    const sql = generateSeedSql(r.content, r.summary);
    expect(sql.indexOf("('conocernos'")).toBeLessThan(sql.indexOf("('amor'"));
    expect(sql.indexOf("('amor-a'")).toBeLessThan(sql.indexOf("('amor-b'"));
  });
});
