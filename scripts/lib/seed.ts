// Lógica pura de validación y generación del seed del banco de preguntas.
// Solo sintaxis TS borrable (Node 22 quita los tipos): sin enums, namespaces ni parameter properties.
// Reglas: docs/CONTENT.md §2.

export type Intensity = 'ligera' | 'profunda' | 'picante';
export type QuestionType = 'open' | 'choice';

export interface Category {
  slug: string;
  name: string;
  emoji: string;
  intensity: string;
  position: number;
  description: string;
}

export interface Question {
  slug: string;
  type: string;
  intensity: string;
  text: string;
  options?: unknown;
}

export interface QuestionFile {
  /** Nombre del archivo (para los mensajes de error), p. ej. "amor.json". */
  file: string;
  data: unknown;
}

export interface ValidatedQuestion {
  slug: string;
  category: string;
  type: QuestionType;
  intensity: Intensity;
  text: string;
  options: string[] | null;
}

export interface Content {
  categories: Category[];
  questions: ValidatedQuestion[];
}

export interface CategorySummary {
  slug: string;
  total: number;
  open: number;
  choice: number;
}

export type ValidationResult =
  { ok: true; content: Content; summary: CategorySummary[] } | { ok: false; errors: string[] };

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const INTENSITIES = ['ligera', 'profunda', 'picante'];
const TYPES = ['open', 'choice'];

/** Longitud en caracteres (puntos de código), como char_length de Postgres. */
export function charLength(s: string): number {
  return Array.from(s).length;
}

/** Normaliza para comparar duplicados: sin acentos, mayúsculas, signos ni espacios repetidos. */
export function normalizeText(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function hasEdgeOrDoubleSpaces(s: string): boolean {
  return s !== s.trim() || /\s{2,}/.test(s);
}

function validateCategories(data: unknown, errors: string[]): Category[] {
  const file = 'categories.json';
  if (!isRecord(data) || !Array.isArray(data.categories)) {
    errors.push(`${file}: se esperaba { "categories": [...] }`);
    return [];
  }
  const out: Category[] = [];
  const seen = new Set<string>();
  const positions = new Set<number>();
  data.categories.forEach((raw: unknown, i: number) => {
    if (!isRecord(raw)) {
      errors.push(`${file}: la categoría #${i + 1} no es un objeto`);
      return;
    }
    const slug = typeof raw.slug === 'string' ? raw.slug : '';
    const where = `${file} [${slug || `#${i + 1}`}]`;
    if (!SLUG_RE.test(slug)) errors.push(`${where}: slug inválido (${SLUG_RE})`);
    else if (seen.has(slug)) errors.push(`${where}: slug de categoría duplicado`);
    seen.add(slug);
    const name = raw.name;
    if (typeof name !== 'string' || charLength(name) < 1 || charLength(name) > 40)
      errors.push(`${where}: name debe ser texto de 1 a 40 caracteres`);
    const emoji = raw.emoji;
    if (typeof emoji !== 'string' || charLength(emoji) < 1 || charLength(emoji) > 16)
      errors.push(`${where}: emoji debe ser texto de 1 a 16 caracteres`);
    const description = raw.description;
    if (typeof description !== 'string' || charLength(description) > 200)
      errors.push(`${where}: description debe ser texto de hasta 200 caracteres`);
    if (typeof raw.intensity !== 'string' || !INTENSITIES.includes(raw.intensity))
      errors.push(`${where}: intensity debe ser ${INTENSITIES.join(', ')}`);
    const position = raw.position;
    if (!Number.isInteger(position) || (position as number) < 0 || (position as number) > 32767)
      errors.push(`${where}: position debe ser un entero entre 0 y 32767`);
    else if (positions.has(position as number))
      errors.push(`${where}: position ${String(position)} repetida`);
    else positions.add(position as number);
    out.push({
      slug,
      name: typeof name === 'string' ? name : '',
      emoji: typeof emoji === 'string' ? emoji : '',
      intensity: typeof raw.intensity === 'string' ? raw.intensity : '',
      position: typeof position === 'number' ? position : 0,
      description: typeof description === 'string' ? description : '',
    });
  });
  return out;
}

/** Valida todo el contenido. Devuelve errores con archivo y slug, o el contenido ordenado. */
export function validateContent(categoriesData: unknown, files: QuestionFile[]): ValidationResult {
  const errors: string[] = [];
  const categories = validateCategories(categoriesData, errors);
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));

  const questions: ValidatedQuestion[] = [];
  const slugOrigin = new Map<string, string>();
  const textOrigin = new Map<string, string>();
  const categoriesWithFile = new Set<string>();

  for (const { file, data } of files) {
    if (!isRecord(data) || typeof data.category !== 'string' || !Array.isArray(data.questions)) {
      errors.push(`${file}: se esperaba { "category": "...", "questions": [...] }`);
      continue;
    }
    const category = data.category;
    const expected = file.replace(/\.json$/, '');
    if (category !== expected)
      errors.push(`${file}: "category" (${category}) debe coincidir con el nombre del archivo`);
    if (!categoryBySlug.has(category))
      errors.push(`${file}: la categoría "${category}" no existe en categories.json`);
    categoriesWithFile.add(category);

    data.questions.forEach((raw: unknown, i: number) => {
      if (!isRecord(raw)) {
        errors.push(`${file}: la pregunta #${i + 1} no es un objeto`);
        return;
      }
      const slug = typeof raw.slug === 'string' ? raw.slug : '';
      const where = `${file} [${slug || `#${i + 1}`}]`;

      if (slug.length === 0 || !SLUG_RE.test(slug)) {
        errors.push(`${where}: slug inválido (minúsculas, números y guiones)`);
      } else {
        if (slug.length > 80) errors.push(`${where}: slug de más de 80 caracteres`);
        if (!slug.startsWith(`${category}-`))
          errors.push(`${where}: el slug debe empezar con "${category}-"`);
        const prev = slugOrigin.get(slug);
        if (prev !== undefined) errors.push(`${where}: slug duplicado (ya está en ${prev})`);
        else slugOrigin.set(slug, file);
      }

      const type = raw.type;
      const typeOk = typeof type === 'string' && TYPES.includes(type);
      if (!typeOk) errors.push(`${where}: type debe ser ${TYPES.join(' o ')}`);

      const intensity = raw.intensity;
      const intensityOk = typeof intensity === 'string' && INTENSITIES.includes(intensity);
      if (!intensityOk) errors.push(`${where}: intensity debe ser ${INTENSITIES.join(', ')}`);
      else {
        if (intensity === 'picante' && category !== 'picantes')
          errors.push(`${where}: "picante" solo se permite en la categoría picantes`);
        if (category === 'picantes' && intensity !== 'picante')
          errors.push(`${where}: toda pregunta de picantes debe ser "picante"`);
      }

      const text = raw.text;
      if (typeof text !== 'string') {
        errors.push(`${where}: falta text`);
      } else {
        const len = charLength(text);
        if (len < 10 || len > 220) errors.push(`${where}: text de ${len} caracteres (10 a 220)`);
        if (hasEdgeOrDoubleSpaces(text))
          errors.push(`${where}: text con espacios al inicio/fin o dobles`);
        const norm = normalizeText(text);
        const prev = textOrigin.get(norm);
        if (prev !== undefined) errors.push(`${where}: texto duplicado de ${prev}`);
        else textOrigin.set(norm, `${slug || `#${i + 1}`} (${file})`);
      }

      let options: string[] | null = null;
      if (type === 'open') {
        if (raw.options !== undefined) errors.push(`${where}: "options" está prohibido en open`);
      } else if (type === 'choice') {
        const opts = raw.options;
        if (!Array.isArray(opts)) {
          errors.push(`${where}: choice requiere "options" (lista de 2 a 4)`);
        } else {
          if (opts.length < 2 || opts.length > 4)
            errors.push(`${where}: options debe tener de 2 a 4 elementos (tiene ${opts.length})`);
          const normSeen = new Set<string>();
          let allStrings = true;
          for (const o of opts as unknown[]) {
            if (typeof o !== 'string') {
              allStrings = false;
              errors.push(`${where}: cada opción debe ser texto`);
              continue;
            }
            const l = charLength(o);
            if (l < 1 || l > 60) errors.push(`${where}: opción "${o}" de ${l} caracteres (1 a 60)`);
            if (o.trim() !== o || /\s{2,}/.test(o))
              errors.push(`${where}: opción "${o}" con espacios al inicio/fin o dobles`);
            const n = normalizeText(o) || o;
            if (normSeen.has(n)) errors.push(`${where}: opción repetida "${o}"`);
            normSeen.add(n);
          }
          if (allStrings) options = opts as string[];
        }
      }

      questions.push({
        slug,
        category,
        type: type === 'choice' ? 'choice' : 'open',
        intensity: (intensityOk ? intensity : 'ligera') as Intensity,
        text: typeof text === 'string' ? text : '',
        options,
      });
    });
  }

  for (const c of categories) {
    if (!categoriesWithFile.has(c.slug))
      errors.push(`categories.json [${c.slug}]: no tiene archivo content/questions/${c.slug}.json`);
  }

  if (errors.length > 0) return { ok: false, errors };

  const position = new Map(categories.map((c) => [c.slug, c.position]));
  const sortedCategories = [...categories].sort(
    (a, b) => a.position - b.position || cmp(a.slug, b.slug),
  );
  const sortedQuestions = [...questions].sort(
    (a, b) =>
      (position.get(a.category) ?? 0) - (position.get(b.category) ?? 0) || cmp(a.slug, b.slug),
  );
  const summary: CategorySummary[] = sortedCategories.map((c) => {
    const qs = sortedQuestions.filter((q) => q.category === c.slug);
    return {
      slug: c.slug,
      total: qs.length,
      open: qs.filter((q) => q.type === 'open').length,
      choice: qs.filter((q) => q.type === 'choice').length,
    };
  });
  return {
    ok: true,
    content: { categories: sortedCategories, questions: sortedQuestions },
    summary,
  };
}

function cmp(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Literal SQL de texto: comillas simples duplicadas (standard_conforming_strings = on). */
export function sqlString(s: string): string {
  if (s.includes('\0')) throw new Error('El texto contiene un carácter NUL');
  return `'${s.replace(/'/g, "''")}'`;
}

function sqlJsonb(options: string[] | null): string {
  return options === null ? 'null' : `${sqlString(JSON.stringify(options))}::jsonb`;
}

/** Genera el seed SQL (determinista) a partir del contenido ya validado. */
export function generateSeedSql(content: Content, summary: CategorySummary[]): string {
  const { categories, questions } = content;
  const lines: string[] = [];
  lines.push('-- Generado por scripts/build-seed.ts — no editar a mano');
  lines.push(
    '-- Fuente: content/ (ver docs/CONTENT.md). Idempotente: se puede aplicar las veces que sea.',
  );
  lines.push(`-- Total: ${questions.length} preguntas en ${categories.length} categorías`);
  for (const s of summary) {
    lines.push(`--   ${s.slug}: ${s.total} (open ${s.open}, choice ${s.choice})`);
  }
  lines.push('');
  lines.push('begin;');
  lines.push('');
  lines.push('-- Categorías');
  lines.push(
    'insert into public.question_categories (slug, name, emoji, description, intensity, position) values',
  );
  lines.push(
    categories
      .map(
        (c) =>
          `  (${sqlString(c.slug)}, ${sqlString(c.name)}, ${sqlString(c.emoji)}, ${sqlString(c.description)}, ${sqlString(c.intensity)}, ${c.position})`,
      )
      .join(',\n'),
  );
  lines.push('on conflict (slug) do update set');
  lines.push('  name = excluded.name,');
  lines.push('  emoji = excluded.emoji,');
  lines.push('  description = excluded.description,');
  lines.push('  intensity = excluded.intensity,');
  lines.push('  position = excluded.position;');
  lines.push('');
  lines.push('-- Preguntas (upsert por slug; no toca id ni created_by)');
  lines.push(
    'insert into public.questions (slug, category, type, text, options, intensity) values',
  );
  lines.push(
    questions
      .map(
        (q) =>
          `  (${sqlString(q.slug)}, ${sqlString(q.category)}, ${sqlString(q.type)}, ${sqlString(q.text)}, ${sqlJsonb(q.options)}, ${sqlString(q.intensity)})`,
      )
      .join(',\n'),
  );
  lines.push('on conflict (slug) do update set');
  lines.push('  category = excluded.category,');
  lines.push('  type = excluded.type,');
  lines.push('  text = excluded.text,');
  lines.push('  options = excluded.options,');
  lines.push('  intensity = excluded.intensity,');
  lines.push('  is_active = true;');
  lines.push('');
  lines.push('-- Las preguntas del seed que ya no están en content/ se desactivan (no se borran)');
  lines.push('update public.questions set is_active = false');
  lines.push('where created_by is null and slug not in (');
  lines.push(questions.map((q) => `  ${sqlString(q.slug)}`).join(',\n'));
  lines.push(');');
  lines.push('');
  lines.push('commit;');
  return `${lines.join('\n')}\n`;
}
