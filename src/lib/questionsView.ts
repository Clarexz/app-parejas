/** Lógica pura de presentación de las preguntas (pestaña, categorías, historial, picantes). */
import {
  OTHER_CHOICE,
  spicyState,
  type AnswerInfo,
  type HistoryItem,
  type QuestionInfo,
} from './questions';

/**
 * Texto completo de una respuesta: la opción elegida y su nota (respuestas viejas), la opción
 * propia ("Otra: …") o el texto abierto. Un índice fuera de rango nunca devuelve `undefined`.
 */
export function answerDisplay(
  answer: Pick<AnswerInfo, 'text' | 'choice'>,
  question: Pick<QuestionInfo, 'options'>,
): string {
  const text = answer.text?.trim() || null;
  if (answer.choice === OTHER_CHOICE) return text ? `Otra: ${text}` : 'Otra';
  const option = answer.choice !== null ? question.options?.[answer.choice] : undefined;
  return [option, text].filter((p): p is string => !!p).join(' · ');
}

/** Texto corto de una respuesta (ver `answerDisplay`), sin saltos de línea y recortado. */
export function answerExcerpt(
  answer: Pick<AnswerInfo, 'text' | 'choice'>,
  question: Pick<QuestionInfo, 'options'>,
  max = 140,
): string {
  const full = answerDisplay(answer, question).replace(/\s+/g, ' ');
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
