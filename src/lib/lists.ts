// Lógica pura de las listas compartidas (Fase 8, RF-19). Sin React ni red.
import { moveItem } from '@/lib/memories';

export { moveItem };

export const LIST_TITLE_MAX = 60;
export const LIST_ITEM_MAX = 200;
export const LIST_ITEMS_MAX = 500;
export const LIST_EMOJI_MAX = 16;

export type ListKind = 'trip' | 'groceries' | 'bucket' | 'watch' | 'places' | 'other';

export type ListKindInfo = {
  kind: ListKind;
  label: string;
  /** Pista breve para el título de una lista de este tipo. */
  placeholder: string;
};

export const LIST_KINDS: readonly ListKindInfo[] = [
  { kind: 'trip', label: 'Viaje', placeholder: 'Qué llevar a Oaxaca' },
  { kind: 'groceries', label: 'Súper', placeholder: 'Lo que falta en la alacena' },
  { kind: 'bucket', label: 'Por hacer juntos', placeholder: 'Cosas que queremos hacer' },
  { kind: 'watch', label: 'Pelis y series', placeholder: 'Para el sofá del viernes' },
  { kind: 'places', label: 'Lugares por visitar', placeholder: 'Taquerías pendientes' },
  { kind: 'other', label: 'Otra', placeholder: 'Lo que ustedes quieran' },
];

export function isListKind(value: string): value is ListKind {
  return LIST_KINDS.some((k) => k.kind === value);
}

/** Etiqueta del tipo; un tipo desconocido se trata como "Otra". */
export function listKindLabel(kind: string): string {
  return (LIST_KINDS.find((k) => k.kind === kind) ?? LIST_KINDS[LIST_KINDS.length - 1]).label;
}

export function listKindInfo(kind: string): ListKindInfo {
  return LIST_KINDS.find((k) => k.kind === kind) ?? LIST_KINDS[LIST_KINDS.length - 1];
}

// ---------------------------------------------------------------------------
// Validación
// ---------------------------------------------------------------------------

/** Mensaje de error del título de una lista, o null si es válido (se recorta antes de medir). */
export function listTitleError(title: string): string | null {
  const t = title.trim();
  if (t.length === 0) return 'Ponle un nombre a la lista.';
  if (t.length > LIST_TITLE_MAX) return `Máximo ${LIST_TITLE_MAX} letras.`;
  return null;
}

/** Mensaje de error de un renglón, o null si es válido. */
export function listItemError(text: string): string | null {
  const t = text.trim();
  if (t.length === 0) return 'Escribe algo en el renglón.';
  if (t.length > LIST_ITEM_MAX) return `Máximo ${LIST_ITEM_MAX} letras.`;
  return null;
}

// ---------------------------------------------------------------------------
// Renglones
// ---------------------------------------------------------------------------

export type ItemLike = {
  id: string;
  text: string;
  done: boolean;
  done_by: string | null;
  done_at: string | null;
  position: number;
};

/** Renglones por `position` (desempata por id para ser estable). */
export function byPosition<T extends ItemLike>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
}

/** Pendientes y tachados, cada grupo en su orden. */
export function splitItems<T extends ItemLike>(items: readonly T[]): { pending: T[]; done: T[] } {
  const sorted = byPosition(items);
  return { pending: sorted.filter((i) => !i.done), done: sorted.filter((i) => i.done) };
}

/** Orden de pantalla: primero los pendientes y al final los tachados. */
export function sortItems<T extends ItemLike>(items: readonly T[]): T[] {
  const { pending, done } = splitItems(items);
  return [...pending, ...done];
}

/** Cuenta de tachados y total. */
export function itemCounts(items: readonly { done: boolean }[]): { done: number; total: number } {
  return { done: items.filter((i) => i.done).length, total: items.length };
}

/** "3 de 8", "Vacía" o "Todo tachado". */
export function progressLabel(done: number, total: number): string {
  if (total <= 0) return 'Vacía';
  if (done >= total) return total === 1 ? 'Ya está tachado' : 'Todo tachado';
  return `${done} de ${total}`;
}

/** Fracción 0..1 para dibujar la barra de avance. */
export function progressRatio(done: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(1, Math.max(0, done / total));
}

/** Quién tachó el renglón: "Lo tachaste tú", "Lo tachó Caleb" o null si está pendiente. */
export function doneByLabel(
  item: Pick<ItemLike, 'done' | 'done_by'>,
  meId: string | null | undefined,
  partnerName: string | null | undefined,
): string | null {
  if (!item.done) return null;
  if (item.done_by && item.done_by === meId) return 'Lo tachaste tú';
  return partnerName ? `Lo tachó ${partnerName}` : 'Lo tachó tu pareja';
}

// ---------------------------------------------------------------------------
// Reordenar
// ---------------------------------------------------------------------------

/**
 * Ids de TODA la lista en el orden nuevo tras mover el pendiente `from` a `to` (índices entre los
 * pendientes). Los tachados se quedan al final, como se ven. La RPC exige todos los ids.
 */
export function reorderedIds<T extends ItemLike>(
  items: readonly T[],
  from: number,
  to: number,
): string[] {
  const { pending, done } = splitItems(items);
  const moved = moveItem(
    pending.map((i) => i.id),
    from,
    to,
  );
  return [...moved, ...done.map((i) => i.id)];
}

// ---------------------------------------------------------------------------
// Actualizaciones optimistas (devuelven copias nuevas)
// ---------------------------------------------------------------------------

export function applyToggle<T extends ItemLike>(
  items: readonly T[],
  id: string,
  done: boolean,
  byId: string | null,
  nowIso: string,
): T[] {
  return items.map((i) =>
    i.id === id ? { ...i, done, done_by: done ? byId : null, done_at: done ? nowIso : null } : i,
  );
}

export function applyText<T extends ItemLike>(items: readonly T[], id: string, text: string): T[] {
  return items.map((i) => (i.id === id ? { ...i, text: text.trim() } : i));
}

export function applyRemove<T extends ItemLike>(items: readonly T[], id: string): T[] {
  return items.filter((i) => i.id !== id);
}

export function applyClearDone<T extends ItemLike>(items: readonly T[]): T[] {
  return items.filter((i) => !i.done);
}

/** Posición que le tocaría a un renglón nuevo (al final). */
export function nextPosition(items: readonly { position: number }[]): number {
  return items.reduce((max, i) => Math.max(max, i.position), -1) + 1;
}

/** Aplica un orden de ids: reasigna `position` 0..n-1 (los ids que no estén quedan al final). */
export function applyOrder<T extends ItemLike>(items: readonly T[], ids: readonly string[]): T[] {
  const rank = new Map(ids.map((id, i) => [id, i]));
  const sorted = [...items].sort(
    (a, b) =>
      (rank.get(a.id) ?? ids.length + a.position) - (rank.get(b.id) ?? ids.length + b.position),
  );
  return sorted.map((item, position) => ({ ...item, position }));
}

/** Reemplaza un renglón provisional por el que devolvió el servidor. */
export function replaceItem<T extends ItemLike>(items: readonly T[], oldId: string, next: T): T[] {
  return items.some((i) => i.id === oldId)
    ? items.map((i) => (i.id === oldId ? next : i))
    : [...items.filter((i) => i.id !== next.id), next];
}

/** `true` si el id es de un renglón provisional (aún sin confirmar por el servidor). */
export function isTempId(id: string): boolean {
  return id.startsWith('tmp-');
}
