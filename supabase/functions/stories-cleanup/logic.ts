// Lógica pura de la Edge Function `stories-cleanup` (sin APIs de Deno ni de Node): la usan
// index.ts (Deno) y los tests de Jest.

/** Tamaño de cada lote de borrado en Storage. */
export const REMOVE_CHUNK_SIZE = 100;
/** Lotes máximos por ejecución (la siguiente hora sigue donde se quedó). */
export const MAX_BATCHES = 10;
/** Cuántas stories pide cada lote a stories_cleanup_batch. */
export const BATCH_LIMIT = 200;

export type CleanupItem = { id: string; paths: string[] };

export type CleanupBatch = {
  storyIds: string[];
  paths: string[];
  items: CleanupItem[];
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function strings(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x !== '') : [];
}

// Valida la respuesta de stories_cleanup_batch. `items` (id + archivos de cada story) es opcional:
// sin él, se asume que cada story pudo tener cualquiera de los archivos del lote.
export function parseBatch(json: unknown): CleanupBatch | null {
  if (!isRecord(json)) return null;
  if (!Array.isArray(json.story_ids) || !Array.isArray(json.paths)) return null;
  const storyIds = strings(json.story_ids);
  const paths = strings(json.paths);
  let items: CleanupItem[];
  if (Array.isArray(json.items)) {
    items = json.items
      .filter(isRecord)
      .filter((i) => typeof i.id === 'string' && i.id !== '')
      .map((i) => ({ id: i.id as string, paths: strings(i.paths) }));
  } else {
    items = storyIds.map((id) => ({ id, paths }));
  }
  return { storyIds, paths, items };
}

// Parte una lista en lotes de `size` (mínimo 1).
export function chunk<T>(list: readonly T[], size: number): T[][] {
  const n = Math.max(1, Math.floor(size));
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += n) out.push(list.slice(i, i + n));
  return out;
}

// Ids de las stories que ya se pueden confirmar: todas sus archivos se borraron bien
// (o no tenían archivos). Una story con algún archivo fallido se reintenta la próxima hora.
export function storiesToCommit(
  items: readonly CleanupItem[],
  failedPaths: ReadonlySet<string>,
): string[] {
  return items.filter((i) => i.paths.every((p) => !failedPaths.has(p))).map((i) => i.id);
}

// Comparación en tiempo constante (para el secreto compartido).
export function timingSafeEqual(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  let diff = ea.length ^ eb.length;
  const n = Math.max(ea.length, eb.length);
  for (let i = 0; i < n; i++) diff |= (ea[i] ?? 0) ^ (eb[i] ?? 0);
  return diff === 0;
}
