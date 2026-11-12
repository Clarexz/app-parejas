// Lógica pura de validación y generación del seed del banco de preguntas.
// Solo sintaxis TS borrable (Node 22 quita los tipos): sin enums, namespaces ni parameter properties.
// Reglas: docs/CONTENT.md §2.

export type Intensity = 'ligera' | 'profunda' | 'picante';
export type QuestionType = 'open' | 'choice';
export type GameType = 'wyr' | 'nhie' | 'most_likely' | 'agree';

/** Categoría que el seed crea sola para los ítems de juegos (no va en categories.json). */
export const GAMES_CATEGORY = 'juegos';
export const GAME_TYPES: readonly GameType[] = ['wyr', 'nhie', 'most_likely', 'agree'];
export const PACK_PREFIX = 'pack-';
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
  /** Categoría diaria, slug del pack o `juegos`. */
  category: string;
  type: QuestionType | GameType;
  intensity: Intensity;
  text: string;
  options: string[] | null;
  /** Orden dentro del pack (índice 1..N en el archivo); null fuera de los packs. */
  position: number | null;
}

/** Archivo de content/packs/ (p. ej. "pack-dinero.json"). */
export interface PackFile {
  file: string;
  data: unknown;
}

/** Archivo de content/imported/ (p. ej. "mi-lista.json"). */
export interface ImportedFile {
  file: string;
  data: unknown;
}

/** Datos opcionales de la Fase 10: packs e importadas. */
export interface ExtraContent {
  /** Contenido de packs.json (undefined si el archivo no existe). */
  packsData?: unknown;
  packFiles?: PackFile[];
  importedFiles?: ImportedFile[];
}

export interface Content {
  /** Solo las de categories.json (la categoría `juegos` la agrega generateSeedSql). */
  categories: Category[];
  /** Los packs de packs.json (en la BD son categorías con kind = 'packs'). */
  packs: Category[];
  /** Preguntas de categorías + packs + importadas + ítems de juegos. */
  questions: ValidatedQuestion[];
  drawingWords: ValidatedDrawingWord[];
}

export interface PackSummary {
  slug: string;
  total: number;
}

export interface ImportedSummary {
  file: string;
  source: string;
  total: number;
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
  | {
      ok: true;
      content: Content;
      summary: CategorySummary[];
      games: GameSummary[];
      packs: PackSummary[];
      imported: ImportedSummary[];
    }
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

function validateCategories(
  data: unknown,
  errors: string[],
  file = 'categories.json',
  key = 'categories',
): Category[] {
  if (!isRecord(data) || !Array.isArray(data[key])) {
    errors.push(`${file}: se esperaba { "${key}": [...] }`);
    return [];
  }
  const out: Category[] = [];
  const seen = new Set<string>();
  const positions = new Set<number>();
  (data[key] as unknown[]).forEach((raw: unknown, i: number) => {
    if (!isRecord(raw)) {
      errors.push(`${file}: el elemento #${i + 1} no es un objeto`);
      return;
    }
    const slug = typeof raw.slug === 'string' ? raw.slug : '';
    const where = `${file} [${slug || `#${i + 1}`}]`;
    if (!SLUG_RE.test(slug)) errors.push(`${where}: slug inválido (${SLUG_RE})`);
    else if (seen.has(slug)) errors.push(`${where}: slug duplicado`);
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

interface ItemContext {
  /** Etiqueta del archivo para los mensajes (p. ej. "amor.json", "packs/pack-dinero.json"). */
  file: string;
  /** Categoría diaria o slug del pack a la que pertenece la pregunta. */
  category: string;
  /** Prefijo obligatorio del slug (normalmente `<category>-`). */
  slugPrefix: string;
  /** Regla de picante: error si una pregunta picante no está permitida (null = permitida). */
  noSpicyMsg: string | null;
  /** Regla de picante: error si una pregunta no picante no está permitida (null = permitida). */
  allSpicyMsg: string | null;
  /** Posición en el pack (1..N) o null. */
  position: number | null;
  slugOrigin: Map<string, string>;
  textOrigin: Map<string, string>;
}

/** Valida una pregunta de categoría, pack o importada. Agrega los errores y devuelve el resultado. */
function checkQuestion(
  raw: unknown,
  i: number,
  ctx: ItemContext,
  errors: string[],
): ValidatedQuestion | null {
  const { file, category } = ctx;
  if (!isRecord(raw)) {
    errors.push(`${file}: la pregunta #${i + 1} no es un objeto`);
    return null;
  }
  const slug = typeof raw.slug === 'string' ? raw.slug : '';
  const where = `${file} [${slug || `#${i + 1}`}]`;

  if (slug.length === 0 || !SLUG_RE.test(slug)) {
    errors.push(`${where}: slug inválido (minúsculas, números y guiones)`);
  } else {
    if (slug.length > 80) errors.push(`${where}: slug de más de 80 caracteres`);
    if (!slug.startsWith(ctx.slugPrefix))
      errors.push(`${where}: el slug debe empezar con "${ctx.slugPrefix}"`);
    const prev = ctx.slugOrigin.get(slug);
    if (prev !== undefined) errors.push(`${where}: slug duplicado (ya está en ${prev})`);
    else ctx.slugOrigin.set(slug, file);
  }

  const type = raw.type;
  const typeOk = typeof type === 'string' && TYPES.includes(type);
  if (!typeOk) errors.push(`${where}: type debe ser ${TYPES.join(' o ')}`);

  const intensity = raw.intensity;
  const intensityOk = typeof intensity === 'string' && INTENSITIES.includes(intensity);
  if (!intensityOk) errors.push(`${where}: intensity debe ser ${INTENSITIES.join(', ')}`);
  else {
    if (intensity === 'picante' && ctx.noSpicyMsg) errors.push(`${where}: ${ctx.noSpicyMsg}`);
    if (intensity !== 'picante' && ctx.allSpicyMsg) errors.push(`${where}: ${ctx.allSpicyMsg}`);
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
    const prev = ctx.textOrigin.get(norm);
    if (prev !== undefined) errors.push(`${where}: texto duplicado de ${prev}`);
    else ctx.textOrigin.set(norm, `${slug || `#${i + 1}`} (${file})`);
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

  return {
    slug,
    category,
    type: type === 'choice' ? 'choice' : 'open',
    intensity: (intensityOk ? intensity : 'ligera') as Intensity,
    text: typeof text === 'string' ? text : '',
    options,
    position: ctx.position,
  };
}

/** Valida una sola pregunta importada contra el contenido ya conocido (usado por import-questions). */
export function validateImportedItem(
  raw: unknown,
  categories: ReadonlyMap<string, Category>,
  slugOrigin: Map<string, string>,
  textOrigin: Map<string, string>,
  file = 'imported',
): { errors: string[]; question: ValidatedQuestion | null } {
  const errors: string[] = [];
  const category = isRecord(raw) && typeof raw.category === 'string' ? raw.category : '';
  const hadSlug = isRecord(raw) && typeof raw.slug === 'string' && slugOrigin.has(raw.slug);
  const hadText =
    isRecord(raw) && typeof raw.text === 'string' && textOrigin.has(normalizeText(raw.text));
  const question = checkImportedQuestion(
    raw,
    0,
    file,
    category,
    categories,
    slugOrigin,
    textOrigin,
    errors,
  );
  if (errors.length > 0 && isRecord(raw)) {
    // No dejar reclamado el slug/texto de una fila inválida.
    if (!hadSlug && typeof raw.slug === 'string') slugOrigin.delete(raw.slug);
    if (!hadText && typeof raw.text === 'string') textOrigin.delete(normalizeText(raw.text));
  }
  return { errors, question };
}

function checkImportedQuestion(
  raw: unknown,
  i: number,
  file: string,
  category: string,
  categories: ReadonlyMap<string, Category>,
  slugOrigin: Map<string, string>,
  textOrigin: Map<string, string>,
  errors: string[],
): ValidatedQuestion | null {
  const slug = isRecord(raw) && typeof raw.slug === 'string' ? raw.slug : `#${i + 1}`;
  if (!categories.has(category))
    errors.push(
      `${file} [${slug}]: category "${category}" no es una categoría diaria de categories.json`,
    );
  return checkQuestion(
    raw,
    i,
    {
      file,
      category,
      slugPrefix: `${category}-`,
      noSpicyMsg:
        category === 'picantes' ? null : '"picante" solo se permite en la categoría picantes',
      allSpicyMsg: category === 'picantes' ? 'toda pregunta de picantes debe ser "picante"' : null,
      position: null,
      slugOrigin,
      textOrigin,
    },
    errors,
  );
}

/** Valida todo el contenido. Devuelve errores con archivo y slug, o el contenido ordenado. */
export function validateContent(
  categoriesData: unknown,
  files: QuestionFile[],
  gameFiles: GameFile[] = [],
  extra: ExtraContent = {},
): ValidationResult {
  const errors: string[] = [];
  const categories = validateCategories(categoriesData, errors);
  if (categories.some((c) => c.slug === GAMES_CATEGORY))
    errors.push(`categories.json: la categoría "${GAMES_CATEGORY}" es reservada (la crea el seed)`);
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));

  const packs =
    extra.packsData === undefined
      ? []
      : validateCategories(extra.packsData, errors, 'packs.json', 'packs');
  for (const p of packs) {
    const where = `packs.json [${p.slug}]`;
    if (p.slug && !p.slug.startsWith(PACK_PREFIX))
      errors.push(`${where}: el slug de un pack debe empezar con "${PACK_PREFIX}"`);
    if (p.slug === GAMES_CATEGORY || categoryBySlug.has(p.slug))
      errors.push(`${where}: el slug choca con una categoría (o con "${GAMES_CATEGORY}")`);
    if (p.slug.length > 80) errors.push(`${where}: slug de más de 80 caracteres`);
  }
  const packBySlug = new Map(packs.map((p) => [p.slug, p]));

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
      const q = checkQuestion(
        raw,
        i,
        {
          file,
          category,
          slugPrefix: `${category}-`,
          noSpicyMsg:
            category === 'picantes' ? null : '"picante" solo se permite en la categoría picantes',
          allSpicyMsg:
            category === 'picantes' ? 'toda pregunta de picantes debe ser "picante"' : null,
          position: null,
          slugOrigin,
          textOrigin,
        },
        errors,
      );
      if (q) questions.push(q);
    });
  }

  // Packs: el orden del archivo es el orden del quiz (position = índice 1..N).
  const packsWithFile = new Set<string>();
  for (const { file, data } of extra.packFiles ?? []) {
    const label = `packs/${file}`;
    if (!isRecord(data) || typeof data.pack !== 'string' || !Array.isArray(data.questions)) {
      errors.push(`${label}: se esperaba { "pack": "...", "questions": [...] }`);
      continue;
    }
    const pack = data.pack;
    const expected = file.replace(/\.json$/, '');
    if (pack !== expected)
      errors.push(`${label}: "pack" (${pack}) debe coincidir con el nombre del archivo`);
    const def = packBySlug.get(pack);
    if (!def) {
      errors.push(`${label}: el pack "${pack}" no existe en packs.json`);
      continue;
    }
    packsWithFile.add(pack);
    data.questions.forEach((raw: unknown, i: number) => {
      const q = checkQuestion(
        raw,
        i,
        {
          file: label,
          category: pack,
          slugPrefix: `${pack}-`,
          noSpicyMsg:
            def.intensity === 'picante' ? null : '"picante" no se permite: el pack no es picante',
          allSpicyMsg:
            def.intensity === 'picante'
              ? 'el pack es picante: toda pregunta debe ser "picante"'
              : null,
          position: i + 1,
          slugOrigin,
          textOrigin,
        },
        errors,
      );
      if (q) questions.push(q);
    });
  }
  for (const p of packs) {
    if (!packsWithFile.has(p.slug) && p.slug)
      errors.push(`packs.json [${p.slug}]: no tiene archivo content/packs/${p.slug}.json`);
  }

  // Importadas: cada pregunta trae su categoría diaria.
  const imported: ImportedSummary[] = [];
  for (const { file, data } of extra.importedFiles ?? []) {
    const label = `imported/${file}`;
    if (!isRecord(data) || !Array.isArray(data.questions)) {
      errors.push(`${label}: se esperaba { "source": "...", "questions": [...] }`);
      continue;
    }
    if (data.source !== undefined && typeof data.source !== 'string')
      errors.push(`${label}: "source" debe ser texto`);
    data.questions.forEach((raw: unknown, i: number) => {
      const category = isRecord(raw) && typeof raw.category === 'string' ? raw.category : '';
      const q = checkImportedQuestion(
        raw,
        i,
        label,
        category,
        categoryBySlug,
        slugOrigin,
        textOrigin,
        errors,
      );
      if (q) questions.push(q);
    });
    imported.push({
      file,
      source: typeof data.source === 'string' ? data.source : '',
      total: data.questions.length,
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

  const position = new Map<string, number>(categories.map((c) => [c.slug, c.position]));
  for (const p of packs) position.set(p.slug, 100000 + p.position);
  const sortedCategories = [...categories].sort(
    (a, b) => a.position - b.position || cmp(a.slug, b.slug),
  );
  const sortedPacks = [...packs].sort((a, b) => a.position - b.position || cmp(a.slug, b.slug));
  // Los packs van después de las categorías y los ítems de juegos al final
  // (la categoría `juegos` no tiene position en categories.json). Dentro de un pack manda su orden.
  const sortedQuestions = [...questions].sort(
    (a, b) =>
      (position.get(a.category) ?? Number.MAX_SAFE_INTEGER) -
        (position.get(b.category) ?? Number.MAX_SAFE_INTEGER) ||
      (a.position ?? 0) - (b.position ?? 0) ||
      cmp(a.slug, b.slug),
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
      packs: sortedPacks,
      questions: sortedQuestions,
      drawingWords: [...drawingWords].sort((a, b) => cmp(a.slug, b.slug)),
    },
    summary,
    games: [...games].sort((a, b) => cmp(a.game, b.game)),
    packs: sortedPacks.map((p) => ({
      slug: p.slug,
      total: sortedQuestions.filter((q) => q.category === p.slug).length,
    })),
    imported: [...imported].sort((a, b) => cmp(a.file, b.file)),
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
      position: null,
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
export function generateSeedSql(
  content: Content,
  summary: CategorySummary[],
  packSummary: PackSummary[] = [],
  importedSummary: ImportedSummary[] = [],
): string {
  const { categories, packs, questions, drawingWords } = content;
  const lines: string[] = [];
  lines.push('-- Generado por scripts/build-seed.ts — no editar a mano');
  lines.push(
    '-- Fuente: content/ (ver docs/CONTENT.md). Idempotente: se puede aplicar las veces que sea.',
  );
  lines.push(
    `-- Total: ${questions.length} preguntas en ${categories.length + packs.length + 1} categorías`,
  );
  for (const s of summary) {
    lines.push(`--   ${s.slug}: ${s.total} (open ${s.open}, choice ${s.choice})`);
  }
  for (const p of packSummary) {
    lines.push(`--   ${p.slug}: ${p.total} (pack)`);
  }
  for (const i of importedSummary) {
    lines.push(`--   importadas/${i.file}: ${i.total}`);
  }
  const gameItems = questions.filter((q) => q.category === GAMES_CATEGORY);
  lines.push(`--   ${GAMES_CATEGORY}: ${gameItems.length} (ítems de juegos)`);
  lines.push(`-- Palabras de dibujo: ${drawingWords.length}`);
  lines.push('');
  lines.push('begin;');
  lines.push('');
  lines.push('-- Categorías y packs');
  lines.push(
    'insert into public.question_categories (slug, name, emoji, description, intensity, position, kind) values',
  );
  const gamesPosition = categories.reduce((m, c) => Math.max(m, c.position), 0) + 1;
  const categoryRow = (c: Category, kind: string) =>
    `  (${sqlString(c.slug)}, ${sqlString(c.name)}, ${sqlString(c.emoji)}, ${sqlString(c.description)}, ${sqlString(c.intensity)}, ${c.position}, '${kind}')`;
  lines.push(
    [
      ...categories.map((c) => categoryRow(c, 'questions')),
      ...packs.map((p) => categoryRow(p, 'packs')),
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
    'insert into public.questions (slug, category, type, text, options, intensity, position) values',
  );
  lines.push(
    questions
      .map(
        (q) =>
          `  (${sqlString(q.slug)}, ${sqlString(q.category)}, ${sqlString(q.type)}, ${sqlString(q.text)}, ${sqlJsonb(q.options)}, ${sqlString(q.intensity)}, ${q.position === null ? 'null' : String(q.position)})`,
      )
      .join(',\n'),
  );
  lines.push('on conflict (slug) do update set');
  lines.push('  category = excluded.category,');
  lines.push('  type = excluded.type,');
  lines.push('  text = excluded.text,');
  lines.push('  options = excluded.options,');
  lines.push('  intensity = excluded.intensity,');
  lines.push('  position = excluded.position,');
  lines.push('  is_active = true;');
  lines.push('');
  lines.push('-- Las preguntas del seed que ya no están en content/ se desactivan (no se borran);');
  lines.push('-- las de usuarios (created_by) y las propias de una pareja (couple_id) no se tocan');
  lines.push('update public.questions set is_active = false');
  lines.push('where created_by is null and couple_id is null and slug not in (');
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
