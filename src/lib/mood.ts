/** Lógica pura del mood (cómo te sientes hoy): opciones, agrupación y validación. */

export type MoodRow = {
  id: string;
  couple_id: string;
  user_id: string;
  emoji: string;
  note: string | null;
  created_at: string;
};

export type MoodOption = { emoji: string; label: string };

export const MOOD_NOTE_MAX = 80;
const MOOD_EMOJI_MAX = 16;

/** Etiquetas neutras en género, en español de México. */
export const MOOD_OPTIONS: readonly MoodOption[] = [
  { emoji: '😄', label: 'Feliz' },
  { emoji: '😌', label: 'En paz' },
  { emoji: '🥰', label: 'Con mariposas' },
  { emoji: '🤗', label: 'Apapachable' },
  { emoji: '😴', label: 'Con sueño' },
  { emoji: '🤤', label: 'Con hambre' },
  { emoji: '🤩', label: 'Con emoción' },
  { emoji: '😎', label: 'Con todo' },
  { emoji: '🥳', label: 'De fiesta' },
  { emoji: '🤔', label: 'Pensando' },
  { emoji: '😅', label: 'Más o menos' },
  { emoji: '😤', label: 'Con coraje' },
  { emoji: '😫', label: 'Estresada la cosa' },
  { emoji: '🥺', label: 'Sensible' },
  { emoji: '😢', label: 'Con ganas de llorar' },
  { emoji: '🫠', label: 'Me derrito' },
];

export function moodLabel(emoji: string): string | null {
  return MOOD_OPTIONS.find((o) => o.emoji === emoji)?.label ?? null;
}

/** Último mood por usuario (created_at desc; empate: el primero de la lista). */
export function latestMoodByUser(moods: readonly MoodRow[]): Record<string, MoodRow> {
  const result: Record<string, MoodRow> = {};
  for (const mood of moods) {
    const current = result[mood.user_id];
    if (!current || Date.parse(mood.created_at) > Date.parse(current.created_at)) {
      result[mood.user_id] = mood;
    }
  }
  return result;
}

/** Agrupa por día (días desc y, dentro del día, hora desc). */
export function groupMoodsByDay(
  moods: readonly MoodRow[],
  dayOf: (createdAt: string) => string,
): { day: string; moods: MoodRow[] }[] {
  const byDay = new Map<string, MoodRow[]>();
  for (const mood of moods) {
    const day = dayOf(mood.created_at);
    const list = byDay.get(day);
    if (list) list.push(mood);
    else byDay.set(day, [mood]);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([day, list]) => ({
      day,
      moods: [...list].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)),
    }));
}

export function validateMoodInput(input: {
  emoji: string;
  note?: string | null;
}): { ok: true; value: { emoji: string; note: string | null } } | { ok: false; error: string } {
  const emoji = input.emoji.trim();
  if (!emoji) return { ok: false, error: 'Elige cómo te sientes.' };
  if (/\s/.test(emoji) || Array.from(emoji).length > MOOD_EMOJI_MAX) {
    return { ok: false, error: 'Elige un solo emoji para tu mood.' };
  }
  const note = (input.note ?? '').trim();
  if (Array.from(note).length > MOOD_NOTE_MAX) {
    return { ok: false, error: `La nota es de máximo ${MOOD_NOTE_MAX} letras.` };
  }
  return { ok: true, value: { emoji, note: note || null } };
}
