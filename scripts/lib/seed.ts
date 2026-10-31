// Lógica pura de validación y generación del seed del banco de preguntas.
// Solo sintaxis TS borrable (Node 22 quita los tipos): sin enums, namespaces ni parameter properties.
// Reglas: docs/CONTENT.md §2.

export type Intensity = 'ligera' | 'profunda' | 'picante';
export type QuestionType = 'open' | 'choice';
export type GameType = 'wyr' | 'nhie' | 'most_likely' | 'agree';

/** Categoría que el seed crea sola para los ítems de juegos (no va en categories.json). */
export const GAMES_CATEGORY = 'juegos';
export const GAME_TYPES: readonly GameType[] = ['wyr', 'nhie', 'most_likely', 'agree'];
const GAME_SLUG_PREFIX: Record<GameType, string> = {
  wyr: 'prefieres-',
  nhie: 'yo-nunca-',
  most_likely: 'quien-',
  agree: 'acuerdo-',
};

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

/** Archivo de content/games/ (p. ej. "wyr.json" o "drawing.json"). */
export interface GameFile {
  file: string;
  data: unknown;
}

export interface ValidatedDrawingWord {
  slug: string;
  word: string;
  alternates: string[];
  intensity: 'ligera' | 'profunda';
}

export interface ValidatedQuestion {
  slug: string;
  category: string;
  type: QuestionType | GameType;
  intensity: Intensity;
  text: string;
  options: string[] | null;
}

export interface Content {
  /** Solo las de categories.json (la categoría `juegos` la agrega generateSeedSql). */
  categories: Category[];
  /** Preguntas de categorías + ítems de juegos. */
  questions: ValidatedQuestion[];
  drawingWords: ValidatedDrawingWord[];
}

export interface GameSummary {
  game: GameType | 'drawing';
  total: number;
}

export interface CategorySummary {
  slug: string;
  total: number;
  open: number;
  choice: number;
}

export type ValidationResult =
  | { ok: true; content: Content; summary: CategorySummary[]; games: GameSummary[] }
  | { ok: false; errors: string[] };

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
export function validateContent(
  categoriesData: unknown,
  files: QuestionFile[],
  gameFiles: GameFile[] = [],
): ValidationResult {
  const errors: string[] = [];
  const categories = validateCategories(categoriesData, errors);
  if (categories.some((c) => c.slug === GAMES_CATEGORY))
    errors.push(`categories.json: la categoría "${GAMES_CATEGORY}" es reservada (la crea el seed)`);
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

  const drawingWords: ValidatedDrawingWord[] = [];
  const games: GameSummary[] = [];
  for (const { file, data } of gameFiles) {
    validateGameFile(file, data, errors, questions, drawingWords, games, slugOrigin, textOrigin);
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
  // Los ítems de juegos van al final (la categoría `juegos` no tiene position en categories.json).
  const sortedQuestions = [...questions].sort(
    (a, b) =>
      (position.get(a.category) ?? Number.MAX_SAFE_INTEGER) -
        (position.get(b.category) ?? Number.MAX_SAFE_INTEGER) || cmp(a.slug, b.slug),
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
    content: {
      categories: sortedCategories,
      questions: sortedQuestions,
      drawingWords: [...drawingWords].sort((a, b) => cmp(a.slug, b.slug)),
    },
    summary,
    games: [...games].sort((a, b) => cmp(a.game, b.game)),
  };
}

const DRAWING_INTENSITIES = ['ligera', 'profunda'];

/** Valida un archivo de content/games/ y agrega sus ítems a `questions` o `drawingWords`. */
function validateGameFile(
  file: string,
  data: unknown,
  errors: string[],
  questions: ValidatedQuestion[],
  drawingWords: ValidatedDrawingWord[],
  games: GameSummary[],
  slugOrigin: Map<string, string>,
  textOrigin: Map<string, string>,
): void {
  const where0 = `games/${file}`;
  const expected = file.replace(/\.json$/, '');
  const isDrawing = expected === 'drawing';
  const isGame = (GAME_TYPES as readonly string[]).includes(expected);
  if (!isDrawing && !isGame) {
    errors.push(
      `${where0}: juego desconocido (archivos válidos: ${[...GAME_TYPES, 'drawing'].join(', ')})`,
    );
    return;
  }
  const listKey = isDrawing ? 'words' : 'items';
  if (!isRecord(data) || typeof data.game !== 'string' || !Array.isArray(data[listKey])) {
    errors.push(`${where0}: se esperaba { "game": "${expected}", "${listKey}": [...] }`);
    return;
  }
  if (data.game !== expected)
    errors.push(`${where0}: "game" (${data.game}) debe coincidir con el nombre del archivo`);
  const list = data[listKey] as unknown[];
  games.push({ game: expected as GameType | 'drawing', total: list.length });

  const claimSlug = (slug: string, where: string, prefix: string) => {
    if (slug.length === 0 || !SLUG_RE.test(slug)) {
      errors.push(`${where}: slug inválido (minúsculas, números y guiones)`);
      return;
    }
    if (slug.length > 80) errors.push(`${where}: slug de más de 80 caracteres`);
    if (!slug.startsWith(prefix)) errors.push(`${where}: el slug debe empezar con "${prefix}"`);
    const prev = slugOrigin.get(slug);
    if (prev !== undefined) errors.push(`${where}: slug duplicado (ya está en ${prev})`);
    else slugOrigin.set(slug, where0);
  };

  if (isDrawing) {
    // Palabras (y sus alternates) sin repetirse entre sí.
    const wordOrigin = new Map<string, string>();
    const claimWord = (value: string, label: string, where: string) => {
      const norm = normalizeText(value);
      const prev = wordOrigin.get(norm);
      if (prev !== undefined) errors.push(`${where}: ${label} "${value}" duplicada de ${prev}`);
      else wordOrigin.set(norm, where);
    };
    list.forEach((raw: unknown, i: number) => {
      if (!isRecord(raw)) {
        errors.push(`${where0}: la palabra #${i + 1} no es un objeto`);
        return;
      }
      const slug = typeof raw.slug === 'string' ? raw.slug : '';
      const where = `${where0} [${slug || `#${i + 1}`}]`;
      claimSlug(slug, where, 'dibujo-');

      const word = raw.word;
      let wordOk = false;
      if (typeof word !== 'string') errors.push(`${where}: falta word`);
      else {
        const len = charLength(word);
        if (len < 2 || len > 40) errors.push(`${where}: word de ${len} caracteres (2 a 40)`);
        else if (hasEdgeOrDoubleSpaces(word))
          errors.push(`${where}: word con espacios al inicio/fin o dobles`);
        else if (word !== word.normalize('NFC'))
          errors.push(`${where}: word debe estar en Unicode NFC (acentos compuestos)`);
        else wordOk = true;
        if (normalizeText(word) === '') errors.push(`${where}: word sin letras ni números`);
        else claimWord(word, 'palabra', where);
      }

      const alternates: string[] = [];
      if (raw.alternates !== undefined) {
        if (!Array.isArray(raw.alternates)) errors.push(`${where}: alternates debe ser una lista`);
        else {
          if (raw.alternates.length > 6)
            errors.push(`${where}: alternates de más de 6 elementos (${raw.alternates.length})`);
          for (const alt of raw.alternates as unknown[]) {
            if (typeof alt !== 'string') {
              errors.push(`${where}: cada alternate debe ser texto`);
              continue;
            }
            const len = charLength(alt);
            if (len < 2 || len > 40)
              errors.push(`${where}: alternate "${alt}" de ${len} caracteres (2 a 40)`);
            else if (hasEdgeOrDoubleSpaces(alt))
              errors.push(`${where}: alternate "${alt}" con espacios al inicio/fin o dobles`);
            else if (alt !== alt.normalize('NFC'))
              errors.push(`${where}: alternate "${alt}" debe estar en Unicode NFC`);
            if (normalizeText(alt) === '') errors.push(`${where}: alternate "${alt}" sin letras`);
            else claimWord(alt, 'alternate', where);
            alternates.push(alt);
          }
        }
      }

      const intensity = raw.intensity;
      const intensityOk = typeof intensity === 'string' && DRAWING_INTENSITIES.includes(intensity);
      if (!intensityOk)
        errors.push(`${where}: intensity debe ser ${DRAWING_INTENSITIES.join(' o ')}`);

      drawingWords.push({
        slug,
        word: wordOk && typeof word === 'string' ? word : '',
        alternates,
        intensity: intensityOk && intensity === 'profunda' ? 'profunda' : 'ligera',
      });
    });
    return;
  }

  const game = expected as GameType;
  list.forEach((raw: unknown, i: number) => {
    if (!isRecord(raw)) {
      errors.push(`${where0}: el ítem #${i + 1} no es un objeto`);
      return;
    }
    const slug = typeof raw.slug === 'string' ? raw.slug : '';
    const where = `${where0} [${slug || `#${i + 1}`}]`;
    claimSlug(slug, where, GAME_SLUG_PREFIX[game]);

    const intensity = raw.intensity;
    const intensityOk = typeof intensity === 'string' && INTENSITIES.includes(intensity);
    if (!intensityOk) errors.push(`${where}: intensity debe ser ${INTENSITIES.join(', ')}`);

    const text = raw.text;
    if (typeof text !== 'string') {
      errors.push(`${where}: falta text`);
    } else {
      const len = charLength(text);
      if (len < 10 || len > 220) errors.push(`${where}: text de ${len} caracteres (10 a 220)`);
      if (hasEdgeOrDoubleSpaces(text))
        errors.push(`${where}: text con espacios al inicio/fin o dobles`);
      if (game === 'nhie') {
        if (!text.startsWith('Yo nunca')) errors.push(`${where}: text debe empezar con "Yo nunca"`);
        if (/[¿?]/.test(text))
          errors.push(`${where}: text de nhie no lleva signos de interrogación`);
      }
      if (game === 'most_likely' && !text.startsWith('¿Quién es más probable que'))
        errors.push(`${where}: text debe empezar con "¿Quién es más probable que"`);
      const norm = normalizeText(text);
      const prev = textOrigin.get(norm);
      if (prev !== undefined) errors.push(`${where}: texto duplicado de ${prev}`);
      else textOrigin.set(norm, `${slug || `#${i + 1}`} (${where0})`);
    }

    let options: string[] | null = null;
    if (game === 'wyr') {
      const opts = raw.options;
      if (!Array.isArray(opts) || opts.length !== 2) {
        errors.push(`${where}: wyr requiere "options" con exactamente 2 opciones`);
      } else {
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
    } else if (raw.options !== undefined) {
      errors.push(`${where}: "options" está prohibido en ${game}`);
    }

    questions.push({
      slug,
      category: GAMES_CATEGORY,
      type: game,
      intensity: (intensityOk ? intensity : 'ligera') as Intensity,
      text: typeof text === 'string' ? text : '',
      options,
    });
  });
}

function cmp(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Literal SQL de texto: comillas simples duplicadas (standard_conforming_strings = on). */
export function sqlString(s: string): string {
  if (s.includes('\0')) throw new Error('El texto contiene un carácter NUL');
  return `'${s.replace(/'/g, "''")}'`;
}

function sqlTextArray(items: string[]): string {
  return items.length === 0
    ? "'{}'::text[]"
    : `array[${items.map((i) => sqlString(i)).join(', ')}]::text[]`;
}

function sqlJsonb(options: string[] | null): string {
  return options === null ? 'null' : `${sqlString(JSON.stringify(options))}::jsonb`;
}

/** Genera el seed SQL (determinista) a partir del contenido ya validado. */
export function generateSeedSql(content: Content, summary: CategorySummary[]): string {
  const { categories, questions, drawingWords } = content;
  const lines: string[] = [];
  lines.push('-- Generado por scripts/build-seed.ts — no editar a mano');
  lines.push(
    '-- Fuente: content/ (ver docs/CONTENT.md). Idempotente: se puede aplicar las veces que sea.',
  );
  lines.push(`-- Total: ${questions.length} preguntas en ${categories.length + 1} categorías`);
  for (const s of summary) {
    lines.push(`--   ${s.slug}: ${s.total} (open ${s.open}, choice ${s.choice})`);
  }
  const gameItems = questions.filter((q) => q.category === GAMES_CATEGORY);
  lines.push(`--   ${GAMES_CATEGORY}: ${gameItems.length} (ítems de juegos)`);
  lines.push(`-- Palabras de dibujo: ${drawingWords.length}`);
  lines.push('');
  lines.push('begin;');
  lines.push('');
  lines.push('-- Categorías');
  lines.push(
    'insert into public.question_categories (slug, name, emoji, description, intensity, position, kind) values',
  );
  const gamesPosition = categories.reduce((m, c) => Math.max(m, c.position), 0) + 1;
  lines.push(
    [
      ...categories.map(
        (c) =>
          `  (${sqlString(c.slug)}, ${sqlString(c.name)}, ${sqlString(c.emoji)}, ${sqlString(c.description)}, ${sqlString(c.intensity)}, ${c.position}, 'questions')`,
      ),
      `  (${sqlString(GAMES_CATEGORY)}, 'Juegos', '🎲', 'Ítems de los juegos de pareja (no sale en la lista de preguntas).', 'ligera', ${gamesPosition}, 'games')`,
    ].join(',\n'),
  );
  lines.push('on conflict (slug) do update set');
  lines.push('  name = excluded.name,');
  lines.push('  emoji = excluded.emoji,');
  lines.push('  description = excluded.description,');
  lines.push('  intensity = excluded.intensity,');
  lines.push('  position = excluded.position,');
  lines.push('  kind = excluded.kind;');
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
  lines.push('-- Palabras del reto de dibujo (upsert por slug; las que ya no están se desactivan)');
  if (drawingWords.length > 0) {
    lines.push('insert into public.drawing_words (slug, word, alternates, intensity) values');
    lines.push(
      drawingWords
        .map(
          (w) =>
            `  (${sqlString(w.slug)}, ${sqlString(w.word)}, ${sqlTextArray(w.alternates)}, ${sqlString(w.intensity)})`,
        )
        .join(',\n'),
    );
    lines.push('on conflict (slug) do update set');
    lines.push('  word = excluded.word,');
    lines.push('  alternates = excluded.alternates,');
    lines.push('  intensity = excluded.intensity,');
    lines.push('  is_active = true;');
    lines.push('update public.drawing_words set is_active = false');
    lines.push('where slug not in (');
    lines.push(drawingWords.map((w) => `  ${sqlString(w.slug)}`).join(',\n'));
    lines.push(');');
  } else {
    lines.push('update public.drawing_words set is_active = false;');
  }
  lines.push('');
  lines.push('commit;');
  return `${lines.join('\n')}\n`;
}
