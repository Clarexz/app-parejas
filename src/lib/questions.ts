/** Lógica pura de las preguntas diarias: tipos, parseo de las RPC y validaciones. */
import type { Json } from '@/types/database';

export const ANSWER_MAX_LENGTH = 2000;
export const CHOICE_NOTE_MAX_LENGTH = 500;
export const COMMENT_MAX_LENGTH = 1000;

export type QuestionType = 'open' | 'choice';
export type Intensity = 'ligera' | 'profunda' | 'picante';

export type QuestionInfo = {
  id: string;
  slug: string;
  category: string;
  category_name: string;
  category_emoji: string;
  type: QuestionType;
  text: string;
  options: string[] | null;
  intensity: Intensity;
};

export type AnswerInfo = {
  id: string;
  user_id: string;
  text: string | null;
  choice: number | null;
  created_at: string;
  updated_at: string;
};

export type QuestionCard = {
  question: QuestionInfo;
  /** Día de la pregunta del día ('YYYY-MM-DD'), o null si no fue pregunta del día. */
  day: string | null;
  mine: AnswerInfo | null;
  partner: AnswerInfo | null;
  partner_answered: boolean;
  comment_count: number;
};

export type HistoryItem = QuestionCard & { last_activity: string };

export type Streak = {
  current: number;
  best: number;
  today: string;
  today_done: boolean;
  missing_days: string[];
};

/** Fila de `get_category_questions`. */
export type CategoryQuestion = {
  id: string;
  slug: string;
  type: QuestionType;
  text: string;
  options: string[] | null;
  intensity: Intensity;
  answered_by_me: boolean;
  answered_by_partner: boolean;
};

// ---------------------------------------------------------------------------
// Parseo
// ---------------------------------------------------------------------------

type Obj = { [key: string]: Json | undefined };

function isObj(v: unknown): v is Obj {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function fail(what: string): never {
  throw new Error(`Respuesta inesperada del servidor: ${what}`);
}

function str(o: Obj, key: string, what: string): string {
  const v = o[key];
  if (typeof v !== 'string') fail(`${what}.${key}`);
  return v;
}

function num(o: Obj, key: string, what: string): number {
  const v = o[key];
  if (typeof v !== 'number' || !Number.isFinite(v)) fail(`${what}.${key}`);
  return v;
}

function bool(o: Obj, key: string, what: string): boolean {
  const v = o[key];
  if (typeof v !== 'boolean') fail(`${what}.${key}`);
  return v;
}

function strOrNull(o: Obj, key: string, what: string): string | null {
  const v = o[key];
  if (v === null || v === undefined) return null;
  if (typeof v !== 'string') fail(`${what}.${key}`);
  return v;
}

function numOrNull(o: Obj, key: string, what: string): number | null {
  const v = o[key];
  if (v === null || v === undefined) return null;
  if (typeof v !== 'number' || !Number.isFinite(v)) fail(`${what}.${key}`);
  return v;
}

export function parseOptions(v: Json | undefined, what = 'options'): string[] | null {
  if (v === null || v === undefined) return null;
  if (!Array.isArray(v) || !v.every((x) => typeof x === 'string')) fail(what);
  return v as string[];
}

function parseType(v: string, what: string): QuestionType {
  if (v !== 'open' && v !== 'choice') fail(what);
  return v;
}

function parseIntensity(v: string, what: string): Intensity {
  if (v !== 'ligera' && v !== 'profunda' && v !== 'picante') fail(what);
  return v;
}

function parseQuestion(v: Json | undefined): QuestionInfo {
  if (!isObj(v)) fail('question');
  const w = 'question';
  return {
    id: str(v, 'id', w),
    slug: str(v, 'slug', w),
    category: str(v, 'category', w),
    category_name: str(v, 'category_name', w),
    category_emoji: str(v, 'category_emoji', w),
    type: parseType(str(v, 'type', w), 'question.type'),
    text: str(v, 'text', w),
    options: parseOptions(v.options, 'question.options'),
    intensity: parseIntensity(str(v, 'intensity', w), 'question.intensity'),
  };
}

function parseAnswer(v: Json | undefined, what: string): AnswerInfo | null {
  if (v === null || v === undefined) return null;
  if (!isObj(v)) fail(what);
  return {
    id: str(v, 'id', what),
    user_id: str(v, 'user_id', what),
    text: strOrNull(v, 'text', what),
    choice: numOrNull(v, 'choice', what),
    created_at: str(v, 'created_at', what),
    updated_at: str(v, 'updated_at', what),
  };
}

export function parseQuestionCard(json: Json): QuestionCard {
  if (!isObj(json)) fail('card');
  return {
    question: parseQuestion(json.question),
    day: strOrNull(json, 'day', 'card'),
    mine: parseAnswer(json.mine, 'card.mine'),
    partner: parseAnswer(json.partner, 'card.partner'),
    partner_answered: bool(json, 'partner_answered', 'card'),
    comment_count: num(json, 'comment_count', 'card'),
  };
}

export function parseHistoryItem(json: Json): HistoryItem {
  if (!isObj(json)) fail('history');
  return { ...parseQuestionCard(json), last_activity: str(json, 'last_activity', 'history') };
}

export function parseStreak(json: Json): Streak {
  if (!isObj(json)) fail('streak');
  const missing = json.missing_days;
  if (!Array.isArray(missing) || !missing.every((d) => typeof d === 'string')) {
    fail('streak.missing_days');
  }
  return {
    current: num(json, 'current', 'streak'),
    best: num(json, 'best', 'streak'),
    today: str(json, 'today', 'streak'),
    today_done: bool(json, 'today_done', 'streak'),
    missing_days: missing as string[],
  };
}

export function parseCategoryQuestion(row: {
  id: string;
  slug: string;
  type: string;
  text: string;
  options: Json;
  intensity: string;
  answered_by_me: boolean;
  answered_by_partner: boolean;
}): CategoryQuestion {
  return {
    id: row.id,
    slug: row.slug,
    type: parseType(row.type, 'category_question.type'),
    text: row.text,
    options: parseOptions(row.options, 'category_question.options'),
    intensity: parseIntensity(row.intensity, 'category_question.intensity'),
    answered_by_me: row.answered_by_me,
    answered_by_partner: row.answered_by_partner,
  };
}

// ---------------------------------------------------------------------------
// Estado de una tarjeta
// ---------------------------------------------------------------------------

export type CardState = 'unanswered' | 'waiting' | 'both';

/** unanswered: yo no contesté; waiting: yo sí y mi pareja no; both: los dos. */
export function cardState(card: QuestionCard): CardState {
  if (!card.mine) return 'unanswered';
  return card.partner_answered ? 'both' : 'waiting';
}

/** La tarjeta pasó a 'both' con este cambio (para la celebración). */
export function justCompleted(prev: QuestionCard | undefined, next: QuestionCard): boolean {
  if (!prev) return false;
  return cardState(prev) !== 'both' && cardState(next) === 'both';
}

// ---------------------------------------------------------------------------
// Validación
// ---------------------------------------------------------------------------

/** Largo en caracteres (puntos de código), como `char_length` de Postgres. */
function charLength(s: string): number {
  return Array.from(s).length;
}

export type AnswerInputError = 'empty' | 'too_long' | 'choice_required';
export type AnswerInputResult =
  | { ok: true; value: { text: string | null; choice: number | null } }
  | { ok: false; error: AnswerInputError };

/** Mismas reglas que `submit_answer`. */
export function validateAnswerInput(
  question: Pick<QuestionInfo, 'type' | 'options'>,
  input: { text?: string | null; choice?: number | null },
): AnswerInputResult {
  const text = (input.text ?? '').trim() || null;
  if (question.type === 'open') {
    if (text === null) return { ok: false, error: 'empty' };
    if (charLength(text) > ANSWER_MAX_LENGTH) return { ok: false, error: 'too_long' };
    return { ok: true, value: { text, choice: null } };
  }
  const choice = input.choice;
  const count = question.options?.length ?? 0;
  if (typeof choice !== 'number' || !Number.isInteger(choice) || choice < 0 || choice >= count) {
    return { ok: false, error: 'choice_required' };
  }
  if (text !== null && charLength(text) > CHOICE_NOTE_MAX_LENGTH) {
    return { ok: false, error: 'too_long' };
  }
  return { ok: true, value: { text, choice } };
}

export type CommentResult =
  { ok: true; value: string } | { ok: false; error: 'empty' | 'too_long' };

export function validateComment(body: string | null | undefined): CommentResult {
  const value = (body ?? '').trim();
  if (!value) return { ok: false, error: 'empty' };
  if (charLength(value) > COMMENT_MAX_LENGTH) return { ok: false, error: 'too_long' };
  return { ok: true, value };
}

// ---------------------------------------------------------------------------
// Picantes y reacciones
// ---------------------------------------------------------------------------

/** Las picantes se activan solo si hay 2 miembros y los dos dieron su opt-in. */
export function spicyState(
  members: { user_id: string; spicy_opt_in: boolean }[],
  myId: string,
): { mine: boolean; partner: boolean; active: boolean } {
  const mine = members.some((m) => m.user_id === myId && m.spicy_opt_in);
  const partner = members.some((m) => m.user_id !== myId && m.spicy_opt_in);
  return { mine, partner, active: members.length === 2 && mine && partner };
}

export const REACTION_OPTIONS: readonly string[] = ['❤️', '😂', '🥹', '😮', '🔥', '👏'];

/** `reactions` es `{ [user_id]: emoji }`. Orden: más votado primero, luego el de REACTION_OPTIONS. */
export function reactionSummary(
  reactions: Json,
  myId: string,
): { emoji: string; count: number; mine: boolean }[] {
  if (!isObj(reactions)) return [];
  const byEmoji = new Map<string, { emoji: string; count: number; mine: boolean }>();
  for (const [userId, emoji] of Object.entries(reactions)) {
    if (typeof emoji !== 'string' || !emoji) continue;
    const entry = byEmoji.get(emoji) ?? { emoji, count: 0, mine: false };
    entry.count += 1;
    if (userId === myId) entry.mine = true;
    byEmoji.set(emoji, entry);
  }
  const rank = (e: string) => {
    const i = REACTION_OPTIONS.indexOf(e);
    return i === -1 ? REACTION_OPTIONS.length : i;
  };
  return [...byEmoji.values()].sort((a, b) => b.count - a.count || rank(a.emoji) - rank(b.emoji));
}

/** Aplica mi reacción como lo hace `react_to_comment`: mismo emoji o null la quita; otro la cambia. */
export function applyReaction(reactions: Json, myId: string, emoji: string | null): Obj {
  const current: Obj = isObj(reactions) ? reactions : {};
  const next: Obj = { ...current };
  const trimmed = emoji?.trim() || null;
  if (trimmed === null || current[myId] === trimmed) delete next[myId];
  else next[myId] = trimmed;
  return next;
}
