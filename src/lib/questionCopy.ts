/** Textos y decisiones de presentación de las preguntas (funciones puras, es-MX). */
import type { PackStatus } from '@/lib/packs';
import { OTHER_CHOICE, type QuestionCard, type Streak } from '@/lib/questions';

export function pluralDays(n: number): string {
  return n === 1 ? '1 día' : `${n} días`;
}

/** "<n> días seguidos contestando." */
export function streakLine(current: number): string {
  if (current <= 0) return 'Todavía no hay racha. Contesten hoy y empieza la cuenta.';
  return `${current === 1 ? '1 día seguido' : `${current} días seguidos`} contestando.`;
}

/** Aviso de la racha en riesgo: ayer quedó sin contestar y todavía se puede recuperar. */
export function repairPrompt(current: number): string {
  return `Se les pasó ayer. Contesten la de ayer hoy para salvar su racha de ${pluralDays(current)}; hoy ya no suma.`;
}

/** "Les quedan 3 de 5 recuperaciones este mes". */
export function repairsLeftLine(left: number, perMonth: number): string {
  if (left <= 0) return 'Ya no les quedan recuperaciones este mes.';
  return `${left === 1 ? 'Les queda' : 'Les quedan'} ${left} de ${perMonth} ${left === 1 ? 'recuperación' : 'recuperaciones'} este mes`;
}

/** Hoy se recuperó ayer: la pregunta de hoy cuenta como hecha pero no suma a la racha. */
export const REPAIR_TODAY_NOTE = 'Hoy recuperaron ayer; hoy no suma a la racha.';

export type RepairView =
  | { kind: 'repair'; day: string; current: number; left: number; perMonth: number }
  | { kind: 'repaired_today' }
  | { kind: 'none' };

/** Qué mostrar de la recuperación: nada si no hay día por recuperar o ya no queda cupo. */
export function repairView(streak: Streak): RepairView {
  if (streak.today_is_repair) return { kind: 'repaired_today' };
  if (streak.repair_day && streak.repairs_left > 0) {
    return {
      kind: 'repair',
      day: streak.repair_day,
      current: streak.current,
      left: streak.repairs_left,
      perMonth: streak.repairs_per_month,
    };
  }
  return { kind: 'none' };
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
  // "Otra" (-1) nunca es coincidencia: cada quien escribió algo distinto.
  return typeof a === 'number' && a !== OTHER_CHOICE && a === b;
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

// ---------------------------------------------------------------------------
// Temas (packs), voto y preguntas propias
// ---------------------------------------------------------------------------

export const FEEDBACK_TITLE = '¿Qué tal esta pregunta?';
export const FEEDBACK_UP_LABEL = '👍 Me gustó';
export const FEEDBACK_DOWN_LABEL = '👎 Mejor no';
export const FEEDBACK_DOWN_NOTE = 'No les volverá a salir como pregunta del día.';

/** Nota de una tarjeta de tema en la pestaña. */
export function packCardNote(
  status: PackStatus,
  progress: { total: number; answered_by_both: number },
): string {
  if (status === 'locked') return 'Se abre cuando los dos quieran.';
  if (status === 'empty') return 'Pronto habrá preguntas aquí.';
  const { total, answered_by_both: both } = progress;
  if (both >= total) return `Las ${total} contestadas por los dos.`;
  return `${both} de ${total} contestadas por los dos`;
}

export const PACK_FINISHED_LINE = 'Ya contestaste todas.';
export const PACK_NEXT_LABEL = 'Siguiente del tema';
export const PACK_DONE_TITLE = 'Terminaste el tema';
export const PACK_DONE_BODY = 'Ya contestaste todas. Si a tu pareja le faltan, aquí las alcanzas.';

export const ADD_QUESTION_NOTE =
  'Las preguntas que agreguen aparecen en su categoría para que las contesten cuando quieran.';
export const ADD_QUESTION_SPICY_NOTE =
  'Las picantes se abren solo cuando los dos las activan en sus ajustes.';
