// Lógica pura de notificaciones: canales, rutas permitidas, preferencias y recordatorio local.

import { parseIsoDate } from './dates';

export type ChannelId = 'actividad' | 'toques' | 'recordatorio';

/** Importancia de Android (mismos valores que `AndroidImportance` de expo-notifications). */
export type ChannelImportance = 'default' | 'high';

export type ChannelDef = {
  id: ChannelId;
  name: string;
  description: string;
  importance: ChannelImportance;
};

export const CHANNELS: readonly ChannelDef[] = [
  {
    id: 'actividad',
    name: 'Actividad de la pareja',
    description: 'Respuestas, comentarios, moods, stories, memorias y juegos de tu pareja.',
    importance: 'default',
  },
  {
    id: 'toques',
    name: 'Toques',
    description: 'Cuando tu pareja te recuerda la pregunta de hoy.',
    importance: 'high',
  },
  {
    id: 'recordatorio',
    name: 'Recordatorio diario',
    description: 'Un aviso a la hora que elijas si aún no contestas la pregunta de hoy.',
    importance: 'default',
  },
];

export const REMINDER_CHANNEL: ChannelId = 'recordatorio';
export const REMINDER_ID_PREFIX = 'reminder-';

// ---------------------------------------------------------------------------
// Rutas
// ---------------------------------------------------------------------------

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATIC_ROUTES = new Set(['/', '/question', '/moods', '/settings/notifications']);

function asRecord(data: unknown): Record<string, unknown> | null {
  return data && typeof data === 'object' && !Array.isArray(data)
    ? (data as Record<string, unknown>)
    : null;
}

/**
 * Valida el `url` que trae una notificación: solo rutas internas conocidas. Cualquier otra
 * cosa (esquemas, `//`, rutas desconocidas, params inválidos) devuelve null.
 */
export function routeForNotification(data: unknown): string | null {
  const url = asRecord(data)?.url;
  if (typeof url !== 'string' || !url.startsWith('/') || url.startsWith('//')) return null;
  if (/[\\\s]/.test(url) || url.includes('://') || url.includes('#')) return null;
  if (STATIC_ROUTES.has(url)) return url;
  const story = /^\/story\/view\?(user|story)=([^&]+)$/.exec(url);
  if (story) return UUID_RE.test(story[2]) ? url : null;
  const game = /^\/(game|drawing)\/([^/?]+)$/.exec(url);
  if (game) return UUID_RE.test(game[2]) ? url : null;
  const memory = /^\/memory\/([^/?]+)$/.exec(url);
  if (memory) return UUID_RE.test(memory[1]) ? url : null;
  const m = /^\/question\?(id|day)=([^&]+)$/.exec(url);
  if (!m) return null;
  if (m[1] === 'id') return UUID_RE.test(m[2]) ? url : null;
  return /^\d{4}-\d{2}-\d{2}$/.test(m[2]) && parseIsoDate(m[2]) ? url : null;
}

/** Tipo (`kind`) de la notificación, si viene en los datos. */
export function notificationKind(data: unknown): string | null {
  const kind = asRecord(data)?.kind;
  return typeof kind === 'string' ? kind : null;
}

/**
 * En primer plano solo se muestra el banner de las pruebas (o tipos desconocidos): para
 * respuestas, comentarios, moods y toques la app ya avisa con toasts por Realtime.
 */
export function shouldShowInForeground(data: unknown): boolean {
  const kind = notificationKind(data);
  if (kind === null) return true;
  // 'widget' es un push de datos (solo refresca los widgets): nunca banner.
  return !['widget', 'answer', 'comment', 'mood', 'nudge', 'reminder'].includes(kind);
}

// ---------------------------------------------------------------------------
// Preferencias
// ---------------------------------------------------------------------------

export type NotificationPrefs = {
  answers: boolean;
  comments: boolean;
  moods: boolean;
  nudges: boolean;
  stories: boolean;
  memories: boolean;
  games: boolean;
  reminderEnabled: boolean;
  /** 'HH:MM' en la hora local del celular. */
  reminderTime: string;
};

export const DEFAULT_PREFS: NotificationPrefs = {
  answers: true,
  comments: true,
  moods: true,
  nudges: true,
  stories: true,
  memories: true,
  games: true,
  reminderEnabled: true,
  reminderTime: '21:00',
};

export type PrefsRow = {
  answers: boolean;
  comments: boolean;
  moods: boolean;
  nudges: boolean;
  stories: boolean;
  memories: boolean;
  games: boolean;
  reminder_enabled: boolean;
  reminder_time: string;
};

/** Acepta 'HH:MM' o 'HH:MM:SS'; devuelve 'HH:MM' o null si no es una hora válida. */
export function normalizeTime(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const m = /^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

/** Fila de la base (o null = sin fila) → preferencias con valores por omisión. */
export function normalizePrefs(row: Partial<PrefsRow> | null | undefined): NotificationPrefs {
  if (!row) return { ...DEFAULT_PREFS };
  const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);
  return {
    answers: bool(row.answers, DEFAULT_PREFS.answers),
    comments: bool(row.comments, DEFAULT_PREFS.comments),
    moods: bool(row.moods, DEFAULT_PREFS.moods),
    nudges: bool(row.nudges, DEFAULT_PREFS.nudges),
    stories: bool(row.stories, DEFAULT_PREFS.stories),
    memories: bool(row.memories, DEFAULT_PREFS.memories),
    games: bool(row.games, DEFAULT_PREFS.games),
    reminderEnabled: bool(row.reminder_enabled, DEFAULT_PREFS.reminderEnabled),
    reminderTime: normalizeTime(row.reminder_time) ?? DEFAULT_PREFS.reminderTime,
  };
}

/** Inverso de `normalizePrefs` para un cambio parcial (solo incluye lo que viene). */
export function toPrefsRow(partial: Partial<NotificationPrefs>): Partial<PrefsRow> {
  const out: Partial<PrefsRow> = {};
  if (partial.answers !== undefined) out.answers = partial.answers;
  if (partial.comments !== undefined) out.comments = partial.comments;
  if (partial.moods !== undefined) out.moods = partial.moods;
  if (partial.nudges !== undefined) out.nudges = partial.nudges;
  if (partial.stories !== undefined) out.stories = partial.stories;
  if (partial.memories !== undefined) out.memories = partial.memories;
  if (partial.games !== undefined) out.games = partial.games;
  if (partial.reminderEnabled !== undefined) out.reminder_enabled = partial.reminderEnabled;
  if (partial.reminderTime !== undefined) {
    const t = normalizeTime(partial.reminderTime);
    if (t) out.reminder_time = `${t}:00`;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Recordatorio local
// ---------------------------------------------------------------------------

/**
 * Fechas (hora local del celular) de los próximos `days` recordatorios a la hora `time`.
 * Hoy se omite si la hora ya pasó o si ya contestaste; en ese caso se empieza mañana.
 */
export function reminderDates(input: {
  now: Date;
  time: string;
  answeredToday: boolean;
  days?: number;
}): Date[] {
  const t = normalizeTime(input.time) ?? DEFAULT_PREFS.reminderTime;
  const [h, m] = t.split(':').map(Number);
  const days = Math.max(0, Math.floor(input.days ?? 7));
  const { now } = input;
  const out: Date[] = [];
  for (let i = 0; out.length < days && i < days + 1; i++) {
    // El constructor normaliza desbordes de día/mes/año y respeta el horario local.
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, h, m, 0, 0);
    if (i === 0 && (input.answeredToday || d.getTime() <= now.getTime())) continue;
    out.push(d);
  }
  return out;
}

/** Identificador estable por día local: 'reminder-YYYY-MM-DD'. */
export function reminderId(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${REMINDER_ID_PREFIX}${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

/** Recorta el nombre de la pareja para el texto del recordatorio. */
export function shortName(name: string | null | undefined, max = 20): string | null {
  const n = (name ?? '').replace(/\s+/g, ' ').trim();
  if (!n) return null;
  const chars = Array.from(n);
  return chars.length <= max ? n : `${chars.slice(0, max - 1).join('')}…`;
}
