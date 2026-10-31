// Lógica pura del test de lenguajes del amor (Fase 11B). La UI solo la usa.

export type LoveLanguageKey = 'words' | 'time' | 'gifts' | 'acts' | 'touch';

export const LOVE_LANGUAGE_KEYS: readonly LoveLanguageKey[] = [
  'words',
  'time',
  'gifts',
  'acts',
  'touch',
];

export type LoveLanguageScores = Record<LoveLanguageKey, number>;

export type LoveLanguageInfo = {
  key: LoveLanguageKey;
  name: string;
  short: string;
  description: string;
  tips: string[];
  distanceTips: string[];
};

export type LoveLanguageOption = { text: string; language: LoveLanguageKey };
export type LoveLanguageItem = { id: string; a: LoveLanguageOption; b: LoveLanguageOption };
export type LoveLanguageQuiz = {
  version: number;
  languages: LoveLanguageInfo[];
  items: LoveLanguageItem[];
};

export type LoveLanguageResult = {
  user_id: string;
  quiz_version: number;
  answers: string[];
  scores: LoveLanguageScores;
  created_at: string;
  updated_at: string;
};

export type LoveLanguagesOverview = {
  mine: LoveLanguageResult | null;
  partner: LoveLanguageResult | null;
  partnerDone: boolean;
};

/** Casillas del cuaderno por lenguaje: cada lenguaje aparece en 12 de las 30 preguntas. */
export const MAX_LANGUAGE_SCORE = 12;

export function isLoveLanguageKey(value: unknown): value is LoveLanguageKey {
  return typeof value === 'string' && (LOVE_LANGUAGE_KEYS as readonly string[]).includes(value);
}

export function emptyScores(): LoveLanguageScores {
  return { words: 0, time: 0, gifts: 0, acts: 0, touch: 0 };
}

/** Cuenta las respuestas por lenguaje; ignora valores desconocidos. */
export function scoreAnswers(answers: readonly string[]): LoveLanguageScores {
  const scores = emptyScores();
  for (const a of answers) if (isLoveLanguageKey(a)) scores[a] += 1;
  return scores;
}

export type RankedLanguage = { key: LoveLanguageKey; score: number; share: number };

/** Lenguajes de mayor a menor; los empates conservan el orden de las keys. */
export function rankLanguages(scores: LoveLanguageScores): RankedLanguage[] {
  const total = LOVE_LANGUAGE_KEYS.reduce((sum, k) => sum + (scores[k] ?? 0), 0);
  return LOVE_LANGUAGE_KEYS.map((key, index) => ({
    key,
    score: scores[key] ?? 0,
    share: total > 0 ? (scores[key] ?? 0) / total : 0,
    index,
  }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ key, score, share }) => ({ key, score, share }));
}

/** Todos los lenguajes empatados en el máximo; [] si todo es 0. */
export function primaryLanguages(scores: LoveLanguageScores): LoveLanguageKey[] {
  const max = Math.max(...LOVE_LANGUAGE_KEYS.map((k) => scores[k] ?? 0));
  if (max <= 0) return [];
  return LOVE_LANGUAGE_KEYS.filter((k) => (scores[k] ?? 0) === max);
}

export type LoveLanguageComparison = {
  sharedPrimary: LoveLanguageKey[];
  minePrimary: LoveLanguageKey[];
  partnerPrimary: LoveLanguageKey[];
  /** Hablan exactamente el mismo(s) lenguaje(s) principal(es). */
  same: boolean;
};

export function compareLoveLanguages(
  mine: LoveLanguageScores,
  partner: LoveLanguageScores,
): LoveLanguageComparison {
  const minePrimary = primaryLanguages(mine);
  const partnerPrimary = primaryLanguages(partner);
  const sharedPrimary = minePrimary.filter((k) => partnerPrimary.includes(k));
  return {
    sharedPrimary,
    minePrimary,
    partnerPrimary,
    same:
      minePrimary.length > 0 &&
      minePrimary.length === partnerPrimary.length &&
      sharedPrimary.length === minePrimary.length,
  };
}

function nameOf(key: LoveLanguageKey, languages: readonly LoveLanguageInfo[]): string {
  return languages.find((l) => l.key === key)?.name ?? key;
}

/** "Tiempo de calidad" / "Tiempo de calidad y Detalles" / "A, B y C". */
export function primaryLabel(
  keys: readonly LoveLanguageKey[],
  languages: readonly LoveLanguageInfo[],
): string {
  const names = keys.map((k) => nameOf(k, languages));
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
}

/** Frase de comparación entre los dos. */
export function comparisonHeadline(
  mine: LoveLanguageScores,
  partner: LoveLanguageScores,
  languages: readonly LoveLanguageInfo[],
  partnerName: string,
): string {
  const c = compareLoveLanguages(mine, partner);
  if (c.same) return `Los dos hablan ${primaryLabel(c.minePrimary, languages)}`;
  if (c.sharedPrimary.length > 0) {
    return `Los dos hablan ${primaryLabel(c.sharedPrimary, languages)}`;
  }
  return `Tú hablas ${primaryLabel(c.minePrimary, languages)}; ${partnerName}, ${primaryLabel(c.partnerPrimary, languages)}`;
}

/** Valida el JSON del test: 5 lenguajes, 30 ítems, cada par de lenguajes exactamente 3 veces. */
export function validateLoveLanguageQuiz(quiz: LoveLanguageQuiz): string[] {
  const errors: string[] = [];
  const keys = quiz.languages.map((l) => l.key);
  if (quiz.languages.length !== 5) errors.push('Debe haber 5 lenguajes');
  if (keys.join() !== LOVE_LANGUAGE_KEYS.join()) errors.push('Lenguajes fuera de orden o faltan');
  for (const l of quiz.languages) {
    if (!l.name || !l.short || !l.description) errors.push(`Lenguaje ${l.key} incompleto`);
    if (l.tips.length !== 4) errors.push(`Lenguaje ${l.key}: debe tener 4 consejos`);
    if (l.distanceTips.length !== 2) errors.push(`Lenguaje ${l.key}: debe tener 2 de distancia`);
  }
  if (quiz.items.length !== 30) errors.push('Debe haber 30 ítems');
  const ids = new Set<string>();
  const pairs = new Map<string, number>();
  for (const item of quiz.items) {
    if (ids.has(item.id)) errors.push(`Id repetido: ${item.id}`);
    ids.add(item.id);
    if (!item.a.text || !item.b.text) errors.push(`Ítem ${item.id} sin texto`);
    if (!isLoveLanguageKey(item.a.language) || !isLoveLanguageKey(item.b.language)) {
      errors.push(`Ítem ${item.id} con lenguaje desconocido`);
      continue;
    }
    if (item.a.language === item.b.language) {
      errors.push(`Ítem ${item.id} compara un lenguaje consigo mismo`);
      continue;
    }
    const pair = [item.a.language, item.b.language].sort().join('|');
    pairs.set(pair, (pairs.get(pair) ?? 0) + 1);
  }
  if (pairs.size !== 10) errors.push('Deben existir los 10 pares de lenguajes');
  for (const [pair, n] of pairs) if (n !== 3) errors.push(`El par ${pair} aparece ${n} veces`);
  return errors;
}

function asScores(value: unknown): LoveLanguageScores {
  const out = emptyScores();
  if (value && typeof value === 'object') {
    for (const k of LOVE_LANGUAGE_KEYS) {
      const n = (value as Record<string, unknown>)[k];
      if (typeof n === 'number' && Number.isFinite(n)) out[k] = n;
    }
  }
  return out;
}

export function parseLoveLanguageResult(value: unknown): LoveLanguageResult | null {
  if (!value || typeof value !== 'object') return null;
  const r = value as Record<string, unknown>;
  if (typeof r.user_id !== 'string') return null;
  const answers = Array.isArray(r.answers) ? r.answers.filter((a) => typeof a === 'string') : [];
  return {
    user_id: r.user_id,
    quiz_version: typeof r.quiz_version === 'number' ? r.quiz_version : 1,
    answers: answers as string[],
    // Si el servidor no manda scores, se recalculan de las respuestas.
    scores: r.scores ? asScores(r.scores) : scoreAnswers(answers as string[]),
    created_at: typeof r.created_at === 'string' ? r.created_at : '',
    updated_at: typeof r.updated_at === 'string' ? r.updated_at : '',
  };
}

export function parseLoveLanguagesOverview(value: unknown): LoveLanguagesOverview {
  const v = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  return {
    mine: parseLoveLanguageResult(v.mine),
    partner: parseLoveLanguageResult(v.partner),
    partnerDone: v.partner_done === true,
  };
}
