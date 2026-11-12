/** Lógica pura de las preguntas propias de la pareja: validación (como `add_custom_question`) y parseo. */
import { parseOptions, type Intensity, type QuestionType } from './questions';
import type { Json } from '@/types/database';

export const CUSTOM_TEXT_MIN = 10;
export const CUSTOM_TEXT_MAX = 220;
export const CUSTOM_OPTION_MAX = 60;
export const CUSTOM_OPTIONS_MIN = 2;
export const CUSTOM_OPTIONS_MAX = 4;

/** Intensidades que se pueden elegir al agregar (las picantes salen de la categoría). */
export type CustomIntensity = 'ligera' | 'profunda';

export type CustomQuestionDraft = {
  category: string | null;
  type: QuestionType;
  text: string;
  /** Una por campo; las vacías se ignoran al validar. */
  options: readonly string[];
  intensity: CustomIntensity;
};

export type CustomQuestionErrors = {
  category?: 'required';
  text?: 'too_short' | 'too_long';
  options?: 'too_few' | 'too_many' | 'too_long' | 'duplicate';
};

export type CustomQuestionInput = {
  category: string;
  type: QuestionType;
  text: string;
  options: string[] | null;
  intensity: CustomIntensity;
};

export type CustomQuestionResult =
  { ok: true; value: CustomQuestionInput } | { ok: false; errors: CustomQuestionErrors };

/** Recorta y colapsa los espacios repetidos (también saltos de línea) en uno solo. */
export function collapseSpaces(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

function charLength(s: string): number {
  return Array.from(s).length;
}

/** Texto ya normalizado: es lo que se manda al servidor y lo que se cuenta contra 10–220. */
export function validateCustomQuestion(draft: CustomQuestionDraft): CustomQuestionResult {
  const errors: CustomQuestionErrors = {};
  if (!draft.category) errors.category = 'required';

  const text = collapseSpaces(draft.text);
  const length = charLength(text);
  if (length < CUSTOM_TEXT_MIN) errors.text = 'too_short';
  else if (length > CUSTOM_TEXT_MAX) errors.text = 'too_long';

  let options: string[] | null = null;
  if (draft.type === 'choice') {
    options = draft.options.map((o) => o.trim()).filter((o) => o.length > 0);
    if (options.length < CUSTOM_OPTIONS_MIN) errors.options = 'too_few';
    else if (options.length > CUSTOM_OPTIONS_MAX) errors.options = 'too_many';
    else if (options.some((o) => charLength(o) > CUSTOM_OPTION_MAX)) errors.options = 'too_long';
    else if (new Set(options.map((o) => o.toLowerCase())).size !== options.length) {
      errors.options = 'duplicate';
    }
  }

  if (Object.keys(errors).length > 0 || !draft.category) return { ok: false, errors };
  return {
    ok: true,
    value: {
      category: draft.category,
      type: draft.type,
      text,
      options,
      intensity: draft.intensity,
    },
  };
}

/** Mensajes de error por campo (es-MX); `null` si el campo está bien. */
export function customQuestionMessages(errors: CustomQuestionErrors): {
  category: string | null;
  text: string | null;
  options: string | null;
} {
  return {
    category: errors.category ? 'Elige una categoría.' : null,
    text:
      errors.text === 'too_short'
        ? `Escríbela un poco más larga (mínimo ${CUSTOM_TEXT_MIN} letras).`
        : errors.text === 'too_long'
          ? `Hazla más cortita (máximo ${CUSTOM_TEXT_MAX} letras).`
          : null,
    options:
      errors.options === 'too_few'
        ? `Pon al menos ${CUSTOM_OPTIONS_MIN} opciones.`
        : errors.options === 'too_many'
          ? `Pueden ser hasta ${CUSTOM_OPTIONS_MAX} opciones.`
          : errors.options === 'too_long'
            ? `Cada opción puede tener hasta ${CUSTOM_OPTION_MAX} letras.`
            : errors.options === 'duplicate'
              ? 'Dos opciones dicen lo mismo. Cámbiale a una.'
              : null,
  };
}

/** Pregunta propia de la pareja (fila de `get_custom_questions`). */
export type CustomQuestion = {
  id: string;
  category: string;
  category_name: string;
  category_emoji: string;
  type: QuestionType;
  text: string;
  options: string[] | null;
  intensity: Intensity;
  created_by: string;
  created_at: string;
  answered_by_me: boolean;
  answered_by_partner: boolean;
};

type CustomRow = {
  id: string;
  category: string;
  category_name: string;
  category_emoji: string;
  type: string;
  text: string;
  options: Json;
  intensity: string;
  created_by: string;
  created_at: string;
  answered_by_me: boolean;
  answered_by_partner: boolean;
};

export function parseCustomQuestion(row: CustomRow): CustomQuestion {
  if (row.type !== 'open' && row.type !== 'choice') {
    throw new Error('Respuesta inesperada del servidor: custom_question.type');
  }
  if (row.intensity !== 'ligera' && row.intensity !== 'profunda' && row.intensity !== 'picante') {
    throw new Error('Respuesta inesperada del servidor: custom_question.intensity');
  }
  return {
    id: row.id,
    category: row.category,
    category_name: row.category_name,
    category_emoji: row.category_emoji,
    type: row.type,
    text: row.text,
    options: parseOptions(row.options, 'custom_question.options'),
    intensity: row.intensity,
    created_by: row.created_by,
    created_at: row.created_at,
    answered_by_me: row.answered_by_me,
    answered_by_partner: row.answered_by_partner,
  };
}
