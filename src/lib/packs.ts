/** Lógica pura de los temas (packs): tipos, parseo de `get_packs`, progreso y "siguiente del tema". */
import type { Intensity } from './questions';

/** Fila de `get_packs`. */
export type Pack = {
  slug: string;
  name: string;
  emoji: string;
  description: string;
  intensity: Intensity;
  position: number;
  total: number;
  answered_by_me: number;
  answered_by_both: number;
  /** Primera pregunta (por orden) que yo no he contestado; null si ya contesté todas. */
  next_question_id: string | null;
};

type PackRow = {
  slug: string;
  name: string;
  emoji: string;
  description: string;
  intensity: string;
  position: number;
  total: number;
  answered_by_me: number;
  answered_by_both: number;
  next_question_id: string | null;
};

export function parsePack(row: PackRow): Pack {
  const intensity = row.intensity;
  if (intensity !== 'ligera' && intensity !== 'profunda' && intensity !== 'picante') {
    throw new Error('Respuesta inesperada del servidor: pack.intensity');
  }
  return {
    slug: row.slug,
    name: row.name,
    emoji: row.emoji,
    description: row.description,
    intensity,
    position: row.position,
    total: row.total,
    answered_by_me: row.answered_by_me,
    answered_by_both: row.answered_by_both,
    next_question_id: row.next_question_id ?? null,
  };
}

/**
 * - `locked`: tema picante y las picantes no están activas para la pareja.
 * - `empty`: el tema no tiene preguntas activas.
 * - `new`: yo no he contestado ninguna.
 * - `in_progress`: contesté algunas, faltan.
 * - `finished`: ya contesté todas (aunque a mi pareja le falten).
 */
export type PackStatus = 'locked' | 'empty' | 'new' | 'in_progress' | 'finished';

export function packStatus(pack: Pack, spicyActive: boolean): PackStatus {
  if (pack.intensity === 'picante' && !spicyActive) return 'locked';
  if (pack.total <= 0) return 'empty';
  if (pack.next_question_id === null) return 'finished';
  return pack.answered_by_me > 0 ? 'in_progress' : 'new';
}

/** Avance de los dos (0 a 1): preguntas contestadas por ambos entre el total. */
export function packProgress(pack: Pick<Pack, 'total' | 'answered_by_both'>): number {
  if (pack.total <= 0) return 0;
  return Math.min(1, Math.max(0, pack.answered_by_both / pack.total));
}

/** "3 de 12 contestadas por los dos". */
export function packProgressLine(pack: Pick<Pack, 'total' | 'answered_by_both'>): string {
  return `${pack.answered_by_both} de ${pack.total} contestadas por los dos`;
}

/** Botón principal de la pantalla del tema; `null` si no hay nada que contestar. */
export function packAction(status: PackStatus): { label: string } | null {
  if (status === 'new') return { label: 'Empezar' };
  if (status === 'in_progress') return { label: 'Seguir' };
  return null;
}

export type NextInPack =
  /** Hay otra pregunta del tema por contestar. */
  | { kind: 'next'; questionId: string }
  /** Ya contesté todas las del tema. */
  | { kind: 'finished' }
  /** Todavía no llegan datos frescos (o el tema no se encontró): no se ofrece nada aún. */
  | { kind: 'pending' };

/**
 * Qué sigue después de contestar `currentId` dentro de un tema. `get_packs` se refresca tras
 * contestar; mientras traiga a la misma pregunta como siguiente, los datos están viejos.
 */
export function nextInPack(
  packs: readonly Pack[],
  slug: string,
  currentId: string,
  fresh = true,
): NextInPack {
  const pack = packs.find((p) => p.slug === slug);
  if (!pack || !fresh) return { kind: 'pending' };
  if (pack.next_question_id === null) return { kind: 'finished' };
  if (pack.next_question_id === currentId) return { kind: 'pending' };
  return { kind: 'next', questionId: pack.next_question_id };
}
