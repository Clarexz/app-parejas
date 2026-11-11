/** Lógica pura de las respuestas en audio (Fase 12). Mismas reglas que `submit_answer`. */

/** Duración mínima de un audio (ms): evita toques accidentales. */
export const MIN_AUDIO_MS = 500;
/** Duración máxima de un audio (ms): 2 minutos. La grabación se corta sola al llegar. */
export const MAX_AUDIO_MS = 120_000;
/** Bucket privado de Storage donde viven los audios. */
export const AUDIO_BUCKET = 'answer-audio';

function wholeSeconds(ms: number): number {
  return Number.isFinite(ms) && ms > 0 ? Math.floor(ms / 1000) : 0;
}

/** "0:07", "1:59", "2:00". Segundos completos (sin redondear hacia arriba). */
export function formatAudioDuration(ms: number): string {
  const total = wholeSeconds(ms);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** Duración dicha en voz alta, para lectores de pantalla: "1 minuto 5 segundos". */
export function spokenAudioDuration(ms: number): string {
  const total = wholeSeconds(ms);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  const parts: string[] = [];
  if (minutes > 0) parts.push(minutes === 1 ? '1 minuto' : `${minutes} minutos`);
  if (seconds > 0 || minutes === 0) parts.push(seconds === 1 ? '1 segundo' : `${seconds} segundos`);
  return parts.join(' ');
}

/** `<pareja>/<usuario>/<pregunta>/<id>.m4a` (el `id` es un uuid en minúsculas). */
export function audioAnswerPath(
  coupleId: string,
  userId: string,
  questionId: string,
  id: string,
): string {
  return `${coupleId}/${userId}/${questionId}/${id.toLowerCase()}.m4a`;
}

/**
 * Audio de una respuesta en el formulario: uno que ya está guardado (se conserva tal cual) o una
 * grabación nueva en el celular (se sube al contestar).
 */
export type AudioDraft =
  { kind: 'existing'; path: string; ms: number } | { kind: 'new'; uri: string; ms: number };

export type AudioDurationError = 'too_short' | 'too_long';
export type AudioDurationResult =
  { ok: true; ms: number } | { ok: false; error: AudioDurationError };

/** Valida la duración de una grabación terminada (500 ms – 2 min). */
export function validateAudioDuration(ms: number): AudioDurationResult {
  if (!Number.isFinite(ms) || ms < MIN_AUDIO_MS) return { ok: false, error: 'too_short' };
  if (ms > MAX_AUDIO_MS) return { ok: false, error: 'too_long' };
  return { ok: true, ms: Math.round(ms) };
}

/**
 * Duración que se manda al servidor: el corte automático puede pasarse unos milisegundos de
 * los 2 minutos, así que se ajusta al tope. `null` si la grabación es demasiado corta.
 */
export function normalizeAudioMs(ms: number): number | null {
  if (!Number.isFinite(ms) || ms < MIN_AUDIO_MS) return null;
  return Math.min(Math.round(ms), MAX_AUDIO_MS);
}

/** Avance de reproducción de 0 a 1 (sin pasarse, y 0 si no hay duración). */
export function playbackProgress(currentMs: number, totalMs: number): number {
  if (!Number.isFinite(currentMs) || !Number.isFinite(totalMs) || totalMs <= 0) return 0;
  return Math.min(1, Math.max(0, currentMs / totalMs));
}
