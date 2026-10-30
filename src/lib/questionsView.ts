/** Lógica pura de presentación de las preguntas (pestaña, categorías, historial, picantes). */
import { todayIn } from './dates';
import { spicyState, type AnswerInfo, type HistoryItem, type QuestionInfo } from './questions';
import { formatStampIsoDate } from './stampDate';

export type CategoryColor = 'yellow' | 'mint' | 'pink';

// Rosa se reserva para las picantes; el resto alterna canario y menta.
const COLORS: readonly CategoryColor[] = ['yellow', 'mint'];

/** Color de cinta estable por categoría; las picantes siempre van en rosa. */
export function categoryColor(slug: string, intensity?: string): CategoryColor {
  if (intensity === 'picante' || slug === 'picantes') return 'pink';
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length] ?? 'yellow';
}

/** Texto corto de una respuesta: la opción elegida (y su nota) o el texto, recortado. */
export function answerExcerpt(
  answer: Pick<AnswerInfo, 'text' | 'choice'>,
  question: Pick<QuestionInfo, 'options'>,
  max = 140,
): string {
  const option = answer.choice !== null ? question.options?.[answer.choice] : undefined;
  const parts = [option, answer.text?.trim()].filter((p): p is string => !!p);
  const full = parts.join(' · ').replace(/\s+/g, ' ');
  const chars = Array.from(full);
  return chars.length > max ? `${chars.slice(0, max).join('').trimEnd()}…` : full;
}

export type PartnerLine =
  | { kind: 'answer'; text: string }
  /** Tu pareja contestó pero tú no: su respuesta no se muestra. */
  | { kind: 'locked' }
  /** Tú contestaste y tu pareja todavía no. */
  | { kind: 'pending' };

export function historyPartnerLine(item: HistoryItem): PartnerLine {
  if (!item.mine) return { kind: 'locked' };
  if (item.partner_answered && item.partner) {
    return { kind: 'answer', text: answerExcerpt(item.partner, item.question) };
  }
  return { kind: 'pending' };
}

/** "29 OCT 2026" a partir de 'YYYY-MM-DD'. */
export function shortStamp(iso: string): string {
  const full = formatStampIsoDate(iso); // "JUE 29 OCT 2026"
  return full ? full.split(' ').slice(1).join(' ') : '';
}

/** Sello de una ficha del historial: el día de la pregunta o, si no fue del día, la última actividad. */
export function historyStamp(item: HistoryItem, timeZone: string): string {
  const iso = item.day ?? todayIn(timeZone, new Date(item.last_activity));
  return shortStamp(iso);
}

export type CategoryRowState = 'unanswered' | 'mine' | 'partner' | 'both';

export function categoryRowState(q: {
  answered_by_me: boolean;
  answered_by_partner: boolean;
}): CategoryRowState {
  if (q.answered_by_me && q.answered_by_partner) return 'both';
  if (q.answered_by_me) return 'mine';
  if (q.answered_by_partner) return 'partner';
  return 'unanswered';
}

export function streakHeadline(current: number): string {
  if (current <= 0) return 'Todavía no hay racha. Contesten hoy y empieza.';
  return current === 1 ? '1 día contestando.' : `${current} días seguidos contestando.`;
}

export type SpicyCopy = {
  /** Qué hizo tu pareja. */
  partnerLine: string;
  /** Resultado para los dos. */
  result: string;
  active: boolean;
};

/** Textos del ajuste de picantes según el opt-in de cada quien (sin presión). */
export function spicyCopy(
  members: { user_id: string; spicy_opt_in: boolean }[],
  myId: string,
  partnerName: string,
): SpicyCopy {
  const s = spicyState(members, myId);
  const partnerLine = s.partner ? `${partnerName} ya las activó.` : `${partnerName} todavía no.`;
  if (s.active) return { partnerLine, result: 'Activas para los dos.', active: true };
  if (s.mine) {
    return {
      partnerLine,
      result: `Tú ya dijiste que sí. Se abren cuando ${partnerName} también quiera.`,
      active: false,
    };
  }
  if (s.partner) {
    return {
      partnerLine,
      result: 'Se abren cuando tú también quieras. Sin prisa.',
      active: false,
    };
  }
  return { partnerLine, result: 'Por ahora están apagadas para los dos.', active: false };
}
