// Lógica pura de check-content: casi-duplicados, ortografía/estilo básico y reporte contra la taxonomía.
// Solo sintaxis TS borrable (Node 22 quita los tipos): sin enums, namespaces ni parameter properties.
import { GAME_TYPES, normalizeText } from './seed.ts';
import type { Content, ValidatedQuestion } from './seed.ts';

// ---------------------------------------------------------------------------
// Casi-duplicados
// ---------------------------------------------------------------------------
//
// Similitud entre dos textos (0 a 1):
//   1. Se normaliza (sin acentos, mayúsculas ni signos) y se quitan palabras vacías en español.
//      Cada palabra se recorta a sus primeras 6 letras (un "stem" tosco) para que plurales,
//      género y conjugaciones cercanas ("canción"/"canciones", "recuerda"/"recuerdan") coincidan.
//   2. `tokenDice` = coeficiente de Dice entre los conjuntos de palabras restantes.
//   3. `bigramDice` = Dice entre los bigramas de caracteres del texto sin vacías (atrapa
//      plurales, género y typos: "favorito"/"favorita").
//   4. score = 0.6 * tokenDice + 0.4 * bigramDice.
// Para no comparar todo contra todo se usa un índice invertido palabra -> textos con filtro por
// prefijo (ver NearDupIndex.find): solo se puntúan los textos que comparten alguna de las palabras
// más raras del texto consultado, sin perder ningún par por encima del umbral.

/** Un par con score >= ERROR se considera duplicado (falla el check). */
export const NEAR_DUP_ERROR = 0.85;
/** Un par con score >= WARN (y < ERROR) se reporta como aviso. */
export const NEAR_DUP_WARN = 0.7;

export const STOPWORDS: ReadonlySet<string> = new Set(
  [
    'de la el que y a en un una los las te tu mi me se lo por con para es o al del si no le nos ya',
    'como has hay seria alguna algo qué cuál más sus su tus mis les ese esa eso este esta esto',
    'cual mas fue ha he son era eres soy sea ser muy pero cuando donde cuanto quien tan tanto',
    'te lo les nos sobre entre sin vez hacer harias haria harías tienes tiene tendrias podrias',
    'yo tú vos él ella nosotros ustedes cada hoy',
  ]
    .join(' ')
    .split(/\s+/)
    .map((w) => normalizeText(w)),
);

/** Palabras con contenido de un texto (normalizadas, sin vacías). */
export function contentTokens(text: string): string[] {
  const out: string[] = [];
  for (const w of normalizeText(text).split(' ')) {
    if (w.length > 0 && !STOPWORDS.has(w)) out.push(w);
  }
  return out;
}

/** Recorte tosco de una palabra a sus primeras 6 letras. */
function stem(w: string): string {
  return w.length > 6 ? w.slice(0, 6) : w;
}

function bigrams(tokens: string[]): Set<string> {
  const s = tokens.join(' ');
  const out = new Set<string>();
  for (let i = 0; i < s.length - 1; i++) out.add(s.slice(i, i + 2));
  return out;
}

function dice(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  const [small, big] = a.size <= b.size ? [a, b] : [b, a];
  for (const x of small) if (big.has(x)) inter++;
  return (2 * inter) / (a.size + b.size);
}

export interface NearDupItem {
  slug: string;
  text: string;
}

interface Indexed {
  slug: string;
  text: string;
  tokens: Set<string>;
  bigrams: Set<string>;
}

export interface NearDupMatch {
  slug: string;
  text: string;
  score: number;
}

/** Similitud 0..1 entre dos textos (ver el comentario de arriba). */
export function similarity(a: string, b: string): number {
  return scoreIndexed(index(a, ''), index(b, ''));
}

function index(text: string, slug: string): Indexed {
  const tokens = contentTokens(text).map(stem);
  return { slug, text, tokens: new Set(tokens), bigrams: bigrams([...new Set(tokens)]) };
}

function scoreIndexed(a: Indexed, b: Indexed): number {
  if (a.tokens.size === 0 || b.tokens.size === 0) return 0;
  return 0.6 * dice(a.tokens, b.tokens) + 0.4 * dice(a.bigrams, b.bigrams);
}

/** Índice invertido palabra -> textos para buscar casi-duplicados sin comparar todo contra todo. */
export class NearDupIndex {
  private items: Indexed[] = [];
  private postings = new Map<string, number[]>();

  /** Número de textos indexados. */
  get size(): number {
    return this.items.length;
  }

  add(item: NearDupItem): void {
    const idx = index(item.text, item.slug);
    const id = this.items.length;
    this.items.push(idx);
    for (const t of idx.tokens) {
      const list = this.postings.get(t);
      if (list) list.push(id);
      else this.postings.set(t, [id]);
    }
  }

  /** Todos los textos ya indexados con score >= minScore contra `text`, del más parecido al menos. */
  find(text: string, minScore: number = NEAR_DUP_WARN): NearDupMatch[] {
    const q = index(text, '');
    const n = q.tokens.size;
    if (n === 0) return [];
    // Filtro por prefijo: como score <= 0.6 * tokenDice + 0.4, un par con score >= minScore tiene
    // tokenDice >= d y por tanto comparte al menos t = ceil(d * n / (2 - d)) palabras. Entonces basta
    // con buscar en las n - t + 1 palabras más raras del texto (las de listas más cortas).
    const d = Math.min(1, Math.max(0.05, (minScore - 0.4) / 0.6));
    const t = Math.max(1, Math.ceil((d * n) / (2 - d)));
    const rare = [...q.tokens]
      .map((tok) => ({ tok, list: this.postings.get(tok) }))
      .filter((x): x is { tok: string; list: number[] } => x.list !== undefined)
      .sort((x, y) => x.list.length - y.list.length)
      .slice(0, n - t + 1);
    // Las palabras que aparecen en muchísimos textos ("gustaría"...) no generan candidatos
    // (a menos que no quede otra): un par casi-duplicado casi siempre comparte alguna palabra rara.
    const cap = Math.max(300, Math.floor(this.items.length / 8));
    const usable = rare.filter((x) => x.list.length <= cap);
    const seen = new Set<number>();
    const out: NearDupMatch[] = [];
    for (const { list } of usable.length > 0 ? usable : rare) {
      for (const id of list) {
        if (seen.has(id)) continue;
        seen.add(id);
        const other = this.items[id];
        let shared = 0;
        for (const tok of q.tokens) if (other.tokens.has(tok)) shared++;
        if (shared < t) continue;
        const score = scoreIndexed(q, other);
        if (score >= minScore) out.push({ slug: other.slug, text: other.text, score });
      }
    }
    return out.sort((x, y) => y.score - x.score || (x.slug < y.slug ? -1 : 1));
  }
}

export interface NearDupFinding {
  a: NearDupItem;
  b: NearDupItem;
  score: number;
  level: 'error' | 'warn';
}

/** Clave estable de un par para la lista de falsos positivos. */
export function pairKey(a: string, b: string): string {
  return a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`;
}

/** Pares permitidos de `content/near-duplicates-ok.json` ({ "pairs": [["slug-a","slug-b"], ...] }). */
export function parseAllowlist(data: unknown): { keys: Set<string>; errors: string[] } {
  const keys = new Set<string>();
  const errors: string[] = [];
  if (data === undefined) return { keys, errors };
  const pairs = (data as { pairs?: unknown } | null)?.pairs;
  if (!Array.isArray(pairs)) {
    errors.push('near-duplicates-ok.json: se esperaba { "pairs": [["slug-a", "slug-b"], ...] }');
    return { keys, errors };
  }
  pairs.forEach((p: unknown, i: number) => {
    if (!Array.isArray(p) || p.length !== 2 || typeof p[0] !== 'string' || typeof p[1] !== 'string')
      errors.push(`near-duplicates-ok.json: el par #${i + 1} debe ser ["slug-a", "slug-b"]`);
    else keys.add(pairKey(p[0], p[1]));
  });
  return { keys, errors };
}

/** Encuentra pares casi-duplicados entre todos los textos (excepto los permitidos). */
export function findNearDuplicates(
  items: NearDupItem[],
  allowed: ReadonlySet<string> = new Set(),
  opts: { warn?: number; error?: number } = {},
): NearDupFinding[] {
  const warn = opts.warn ?? NEAR_DUP_WARN;
  const error = opts.error ?? NEAR_DUP_ERROR;
  const idx = new NearDupIndex();
  const out: NearDupFinding[] = [];
  for (const item of items) {
    for (const m of idx.find(item.text, warn)) {
      if (allowed.has(pairKey(item.slug, m.slug))) continue;
      out.push({
        a: { slug: m.slug, text: m.text },
        b: item,
        score: m.score,
        level: m.score >= error ? 'error' : 'warn',
      });
    }
    idx.add(item);
  }
  return out.sort((x, y) => y.score - x.score);
}

// ---------------------------------------------------------------------------
// Ortografía y estilo básico
// ---------------------------------------------------------------------------

export interface StyleFinding {
  slug: string;
  level: 'error' | 'warn';
  message: string;
}

const L = '\\p{L}';
// Pronombres y formas verbales de "vosotros" (en México se usa "ustedes").
const VOSOTROS = [
  'vosotros',
  'vosotras',
  'vuestro',
  'vuestra',
  'vuestros',
  'vuestras',
  'sois',
  'habéis',
  'tenéis',
  'queréis',
  'podéis',
  'os',
];
const VOSOTROS_RE = new RegExp(`(?<!${L})(${VOSOTROS.join('|')})(?!${L})`, 'giu');
// Palabras de España que en México se dicen distinto.
const SPAIN_WORDS: Record<string, string> = {
  móvil: 'celular',
  móviles: 'celulares',
  ordenador: 'computadora',
  ordenadores: 'computadoras',
  guay: 'padre',
};
const SPAIN_RE = new RegExp(`(?<!${L})(${Object.keys(SPAIN_WORDS).join('|')})(?!${L})`, 'giu');
// Interrogativos sin tilde justo después de ¿ ("¿Que prefieres?").
const UNACCENTED_RE =
  /¿\s*(que|cual|cuales|quien|quienes|donde|cuando|cuanto|cuanta|cuantos|cuantas|como)(?![\p{L}])/iu;

function count(s: string, ch: string): number {
  return s.split(ch).length - 1;
}

/** Reglas de ortografía/estilo de un texto de pregunta u opción. Nunca lanza. */
export function checkTextStyle(
  text: string,
  isGameNhie = false,
): { level: 'error' | 'warn'; message: string }[] {
  const out: { level: 'error' | 'warn'; message: string }[] = [];
  const err = (message: string) => out.push({ level: 'error', message });
  const warn = (message: string) => out.push({ level: 'warn', message });

  if (count(text, '¿') !== count(text, '?')) err('signos de interrogación sin par (falta ¿ o ?)');
  if (count(text, '¡') !== count(text, '!')) err('signos de exclamación sin par (falta ¡ o !)');
  if (/\s[,.;:?!]/u.test(text)) err('hay un espacio antes de , . ; : ? o !');
  if (/[¿¡]\s/u.test(text)) err('hay un espacio después de ¿ o ¡');
  if (/[?]{2,}|[!]{2,}|[¿]{2,}|[¡]{2,}/u.test(text)) err('signos repetidos (?? o !!)');
  if (/(?<!\.)\.\.(?!\.)/u.test(text)) err('dos puntos seguidos (usa uno o tres)');
  if (/[,;:]\p{L}/u.test(text)) err('falta un espacio después de , ; o :');
  if (/[?!.]\p{Lu}/u.test(text)) err('falta un espacio después de . ? o !');
  if (/^[¿¡]?\s*\p{Ll}/u.test(text)) err('empieza con minúscula');
  if (UNACCENTED_RE.test(text)) err('interrogativo sin tilde después de ¿ (qué, cuál, cómo...)');
  for (const m of text.matchAll(VOSOTROS_RE)) err(`"${m[0]}" es de "vosotros" (usa "ustedes")`);
  for (const m of text.matchAll(SPAIN_RE))
    err(`"${m[0]}" es de España (en México: "${SPAIN_WORDS[m[0].toLowerCase()]}")`);
  if (!/[?!.…:"”)»]$/u.test(text) && !isGameNhie) warn('no termina en signo de puntuación');
  if (isGameNhie && /[¿?]/u.test(text)) err('Yo nunca no lleva signos de interrogación');
  if (count(text, '?') > 1) warn('más de una pregunta en el mismo texto');
  return out;
}

/** Revisa texto y opciones de todas las preguntas. */
export function checkStyle(questions: readonly ValidatedQuestion[]): StyleFinding[] {
  const out: StyleFinding[] = [];
  for (const q of questions) {
    for (const f of checkTextStyle(q.text, q.type === 'nhie')) out.push({ slug: q.slug, ...f });
    for (const o of q.options ?? []) {
      // En opciones solo importa el léxico (sin signos): vosotros / palabras de España.
      for (const m of o.matchAll(VOSOTROS_RE))
        out.push({
          slug: q.slug,
          level: 'error',
          message: `opción "${o}": "${m[0]}" es de "vosotros" (usa "ustedes")`,
        });
      for (const m of o.matchAll(SPAIN_RE))
        out.push({
          slug: q.slug,
          level: 'error',
          message: `opción "${o}": "${m[0]}" es de España (en México: "${SPAIN_WORDS[m[0].toLowerCase()]}")`,
        });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Reporte contra la taxonomía
// ---------------------------------------------------------------------------

export interface Taxonomy {
  daily?: {
    min_total?: number;
    categories?: Record<string, Record<string, Record<string, number>>>;
  };
  games?: {
    min_total?: number;
    items?: Record<string, Record<string, number>>;
    drawing_words?: number;
  };
  packs?: Record<string, number>;
  min_total?: number;
}

export interface TargetRow {
  /** p. ej. "conocernos", "wyr" o "pack-dinero". */
  group: string;
  intensity: string;
  /** open | choice, o '' si la celda no distingue tipo. */
  kind: string;
  target: number;
  actual: number;
  missing: number;
}

export interface Report {
  daily: TargetRow[];
  games: TargetRow[];
  packs: TargetRow[];
  drawingWords: { target: number; actual: number };
  totals: {
    daily: number;
    games: number;
    packs: number;
    total: number;
    minDaily: number;
    minGames: number;
    minTotal: number;
  };
  /** Mensajes de metas "duras" que no se cumplen (solo importan con --strict). */
  strictFailures: string[];
}

function row(
  group: string,
  intensity: string,
  kind: string,
  target: number,
  actual: number,
): TargetRow {
  return { group, intensity, kind, target, actual, missing: Math.max(0, target - actual) };
}

/** Cuenta contra la taxonomía. Las metas faltantes son avisos; los mínimos duros se evalúan en strict. */
export function buildReport(content: Content, taxonomy: Taxonomy): Report {
  const packSlugs = new Set(content.packs.map((p) => p.slug));
  const gameTypes = new Set<string>(GAME_TYPES);
  const daily = content.questions.filter(
    (q) => q.category !== 'juegos' && !packSlugs.has(q.category),
  );
  const games = content.questions.filter((q) => q.category === 'juegos');
  const packQs = content.questions.filter((q) => packSlugs.has(q.category));

  const dailyRows: TargetRow[] = [];
  for (const [cat, byInt] of Object.entries(taxonomy.daily?.categories ?? {})) {
    for (const [intensity, byKind] of Object.entries(byInt)) {
      for (const [kind, target] of Object.entries(byKind)) {
        const actual = daily.filter(
          (q) => q.category === cat && q.intensity === intensity && q.type === kind,
        ).length;
        dailyRows.push(row(cat, intensity, kind, target, actual));
      }
    }
  }
  const gameRows: TargetRow[] = [];
  for (const [game, byInt] of Object.entries(taxonomy.games?.items ?? {})) {
    for (const [intensity, target] of Object.entries(byInt)) {
      const actual = games.filter(
        (q) => gameTypes.has(q.type) && q.type === game && q.intensity === intensity,
      ).length;
      gameRows.push(row(game, intensity, '', target, actual));
    }
  }
  const packRows: TargetRow[] = Object.entries(taxonomy.packs ?? {}).map(([slug, target]) =>
    row(slug, '', '', target, packQs.filter((q) => q.category === slug).length),
  );

  const totals = {
    daily: daily.length,
    games: games.length,
    packs: packQs.length,
    total: content.questions.length,
    minDaily: taxonomy.daily?.min_total ?? 0,
    minGames: taxonomy.games?.min_total ?? 0,
    minTotal: taxonomy.min_total ?? 0,
  };
  const strictFailures: string[] = [];
  if (totals.daily < totals.minDaily)
    strictFailures.push(`diarias: ${totals.daily} < ${totals.minDaily}`);
  if (totals.games < totals.minGames)
    strictFailures.push(`juegos: ${totals.games} < ${totals.minGames}`);
  if (totals.total < totals.minTotal)
    strictFailures.push(`total: ${totals.total} < ${totals.minTotal}`);
  return {
    daily: dailyRows,
    games: gameRows,
    packs: packRows,
    drawingWords: {
      target: taxonomy.games?.drawing_words ?? 0,
      actual: content.drawingWords.length,
    },
    totals,
    strictFailures,
  };
}
