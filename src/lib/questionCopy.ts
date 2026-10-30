/** Textos y decisiones de presentación de las preguntas (funciones puras, es-MX). */
import type { QuestionCard, Streak } from '@/lib/questions';

export const LONG_QUESTION_CHARS = 140;

/** Gochi Hand solo hasta ~140 caracteres (DISENO §2.2); más largo va en Figtree. */
export function questionTextVariant(text: string): 'title' | 'heading' {
  return Array.from(text).length <= LONG_QUESTION_CHARS ? 'title' : 'heading';
}

export function pluralDays(n: number): string {
  return n === 1 ? '1 día' : `${n} días`;
}

/** "<n> días seguidos contestando." */
export function streakLine(current: number): string {
  if (current <= 0) return 'Todavía no hay racha. Contesten hoy y empieza la cuenta.';
  return `${current === 1 ? '1 día seguido' : `${current} días seguidos`} contestando.`;
}

export function repairLine(missing: number): string {
  return missing === 1 ? 'Les falta 1 día por reparar' : `Les faltan ${missing} días por reparar`;
}

export function commentCountLabel(n: number): string {
  if (n <= 0) return 'Sin comentarios todavía';
  return n === 1 ? '1 comentario' : `${n} comentarios`;
}

/** Texto de la respuesta doblada de la pareja cuando aún no se puede leer. */
export function partnerFoldedLabel(name: string, partnerAnswered: boolean): string {
  return partnerAnswered
    ? `${name} ya escribió y la dobló. Te toca.`
    : `${name} todavía no contesta`;
}

/** En una pregunta de opciones, los dos eligieron la misma. */
export function sameChoice(card: Pick<QuestionCard, 'mine' | 'partner'>): boolean {
  const a = card.mine?.choice;
  const b = card.partner?.choice;
  return typeof a === 'number' && a === b;
}

export type QuestionErrorKind = 'no_questions' | 'not_found' | 'other';

/** Clasifica el error de las RPC de pregunta (el código viaja en `message` o `code`). */
export function questionErrorKind(error: unknown): QuestionErrorKind {
  if (typeof error !== 'object' || error === null) return 'other';
  const e = error as { message?: unknown; code?: unknown };
  const tokens = [e.message, e.code].filter((v): v is string => typeof v === 'string');
  if (tokens.includes('no_questions')) return 'no_questions';
  if (tokens.includes('question_not_found')) return 'not_found';
  return 'other';
}

export type StreakView =
  { kind: 'streak'; current: number; missing: number } | { kind: 'start'; missing: number };

export function streakView(streak: Streak): StreakView {
  const missing = streak.missing_days.length;
  return streak.current > 0
    ? { kind: 'streak', current: streak.current, missing }
    : { kind: 'start', missing };
}
