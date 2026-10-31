/**
 * Textos y validación de las cuentas regresivas (Fase 8). Funciones puras: la UI solo las usa.
 * La lógica de fechas vive en `events.ts`.
 */
import { formatNumber } from './dates';
import type { Countdown, CountdownKind } from './events';

export const EVENT_TITLE_MAX = 60;
export const EVENT_NOTE_MAX = 280;
export const EVENT_EMOJI_MAX = 16;

export type EventDraft = {
  title: string;
  emoji: string;
  note: string;
  /** Si la fecha escrita es una fecha real. */
  dateValid: boolean;
};

export type EventDraftErrors = {
  title?: 'empty' | 'too_long';
  emoji?: 'too_long';
  note?: 'too_long';
  date?: 'invalid';
};

/** Validación del formulario de eventos; `null` si todo está bien. */
export function validateEventDraft(draft: EventDraft): EventDraftErrors | null {
  const errors: EventDraftErrors = {};
  const title = draft.title.trim();
  if (!title) errors.title = 'empty';
  else if (title.length > EVENT_TITLE_MAX) errors.title = 'too_long';
  if (draft.emoji.trim().length > EVENT_EMOJI_MAX) errors.emoji = 'too_long';
  if (draft.note.trim().length > EVENT_NOTE_MAX) errors.note = 'too_long';
  if (!draft.dateValid) errors.date = 'invalid';
  return Object.keys(errors).length ? errors : null;
}

/** Mensajes en español de México (qué pasó y qué hacer). */
export function eventErrorMessages(
  errors: EventDraftErrors | null,
  dateError?: string,
): Record<'title' | 'emoji' | 'note' | 'date', string | undefined> {
  return {
    title:
      errors?.title === 'empty'
        ? 'Ponle un nombre a esa fecha.'
        : errors?.title === 'too_long'
          ? `El nombre aguanta hasta ${EVENT_TITLE_MAX} letras.`
          : undefined,
    emoji: errors?.emoji ? 'Con uno o dos emojis basta.' : undefined,
    note: errors?.note ? `La nota aguanta hasta ${EVENT_NOTE_MAX} letras.` : undefined,
    date: errors?.date
      ? (dateError ?? 'Escribe una fecha que exista, como 14 / 02 / 2027.')
      : undefined,
  };
}

/** Número protagonista y su unidad: 0 → "Hoy", 1 → "1 día", n → "n días". */
export function countdownHeadline(daysUntil: number): { value: string; unit: string } {
  if (daysUntil <= 0) return { value: 'Hoy', unit: '' };
  return { value: formatNumber(daysUntil), unit: daysUntil === 1 ? 'día' : 'días' };
}

/** Para lectores de pantalla: "faltan 12 días", "es mañana", "es hoy". */
export function countdownSpoken(daysUntil: number): string {
  if (daysUntil <= 0) return 'es hoy';
  if (daysUntil === 1) return 'es mañana';
  return `faltan ${formatNumber(daysUntil)} días`;
}

const AUTO_NOTE: Partial<Record<CountdownKind, string>> = {
  anniversary: 'Sale de su aniversario',
  monthiversary: 'Sale de su aniversario',
  days: 'Sale de su aniversario',
  birthday: 'Sale del cumpleaños en el perfil',
};

/** Línea sutil bajo cada cuenta regresiva: por qué no se edita o que se repite. */
export function countdownNote(c: Pick<Countdown, 'kind' | 'eventId' | 'recurring'>): string | null {
  if (!c.eventId) return AUTO_NOTE[c.kind] ?? null;
  return c.recurring ? 'Se repite cada año' : null;
}

/** "hace 3 días" para eventos que ya pasaron (`days` >= 1). */
export function pastLabel(days: number): string {
  if (days <= 0) return 'hoy';
  if (days === 1) return 'ayer';
  return `hace ${formatNumber(days)} días`;
}

/** Nombre a mostrar de una persona: apodo, nombre o el respaldo. */
export function personName(
  p: { nickname?: string | null; display_name?: string | null } | null | undefined,
  fallback: string,
): string {
  return p?.nickname?.trim() || p?.display_name?.trim() || fallback;
}
