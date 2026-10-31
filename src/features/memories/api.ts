import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

import { randomUuid } from '@/lib/ids';
import { toJpeg } from '@/lib/image';
import { memoryPhotoPaths } from '@/lib/memories';
import { supabase } from '@/lib/supabase';
import type { Database, Json } from '@/types/database';

type Tables = Database['public']['Tables'];

export type MemoryPhoto = Tables['memory_photos']['Row'];

/** Memoria con sus fotos ya ordenadas por `position`. */
export type Memory = Tables['memories']['Row'] & { photos: MemoryPhoto[] };

export type MemoryPhotoInput =
  | {
      kind: 'existing';
      path: string;
      thumbPath: string;
      width?: number | null;
      height?: number | null;
    }
  | { kind: 'new'; uri: string; width?: number | null; height?: number | null };

export type SaveMemoryInput = {
  /** Con id se edita; sin id se crea. */
  id?: string;
  title: string;
  /** 'YYYY-MM-DD' */
  happenedOn: string;
  body?: string | null;
  lat?: number | null;
  lng?: number | null;
  placeName?: string | null;
  /** En el orden en que se mostrarán (la primera es la portada). */
  photos: MemoryPhotoInput[];
};

export const MEMORIES_BUCKET = 'memories';

const PHOTO_SIDE = 1600;
const PHOTO_QUALITY = 0.7;
const THUMB_SIDE = 480;
const THUMB_QUALITY = 0.6;
const MEMORIES_LIMIT = 1000;
export const SIGNED_URL_SECONDS = 3600;
// Se reutiliza la URL firmada hasta 10 minutos antes de que caduque.
const SIGNED_URL_REUSE_MS = (SIGNED_URL_SECONDS - 600) * 1000;

const SELECT = '*, photos:memory_photos(*)';

type MemoryRow = Tables['memories']['Row'] & { photos: MemoryPhoto[] | null };

function normalize(row: MemoryRow): Memory {
  return {
    ...row,
    photos: [...(row.photos ?? [])].sort((a, b) => a.position - b.position),
  };
}

/** Todas las memorias de la pareja (hasta 1000), la más reciente primero. */
export async function fetchMemories(coupleId: string): Promise<Memory[]> {
  const { data, error } = await supabase
    .from('memories')
    .select(SELECT)
    .eq('couple_id', coupleId)
    .order('happened_on', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(MEMORIES_LIMIT);
  if (error) throw error;
  return (data as unknown as MemoryRow[]).map(normalize);
}

export async function fetchMemory(id: string): Promise<Memory | null> {
  const { data, error } = await supabase.from('memories').select(SELECT).eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? normalize(data as unknown as MemoryRow) : null;
}

// ---------------------------------------------------------------------------
// Guardar
// ---------------------------------------------------------------------------

async function upload(path: string, body: ArrayBuffer): Promise<void> {
  const { error } = await supabase.storage
    .from(MEMORIES_BUCKET)
    .upload(path, body, { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;
}

async function currentIds(): Promise<{ userId: string; coupleId: string }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) throw new Error('not_authenticated');
  const { data: coupleId, error } = await supabase.rpc('my_couple_id');
  if (error) throw error;
  if (!coupleId) throw new Error('no_couple');
  return { userId, coupleId };
}

type PhotoPayload = {
  path: string;
  thumb_path: string;
  width: number | null;
  height: number | null;
};

/**
 * Crea o edita una memoria. Comprime (1600 px, JPEG 0.7) y crea la miniatura (480 px, JPEG 0.6)
 * de cada foto nueva, las sube a Storage y luego llama a la RPC. Si la RPC falla, los archivos
 * subidos quedan huérfanos y la limpieza horaria los borra (la app no puede borrar en Storage).
 * `onProgress` recibe un avance de 0 a 1 (repartido por foto).
 */
export async function saveMemory(
  input: SaveMemoryInput,
  onProgress?: (progress: number) => void,
): Promise<Memory> {
  onProgress?.(0);
  const newCount = input.photos.filter((p) => p.kind === 'new').length;
  const ids = newCount > 0 ? await currentIds() : null;
  // La subida ocupa el 95 %; el 5 % restante es la RPC.
  const share = newCount > 0 ? 0.95 / newCount : 0;
  let done = 0;

  const photos: PhotoPayload[] = [];
  for (const photo of input.photos) {
    if (photo.kind === 'existing') {
      photos.push({
        path: photo.path,
        thumb_path: photo.thumbPath,
        width: photo.width ?? null,
        height: photo.height ?? null,
      });
      continue;
    }
    const paths = memoryPhotoPaths(ids!.coupleId, ids!.userId, randomUuid());
    const media = await toJpeg(photo.uri, PHOTO_SIDE, PHOTO_QUALITY);
    onProgress?.((done + 0.35) * share);
    const thumb = await toJpeg(photo.uri, THUMB_SIDE, THUMB_QUALITY);
    onProgress?.((done + 0.5) * share);
    await upload(paths.path, media.data);
    onProgress?.((done + 0.8) * share);
    await upload(paths.thumb, thumb.data);
    done += 1;
    onProgress?.(done * share);
    photos.push({
      path: paths.path,
      thumb_path: paths.thumb,
      width: media.width,
      height: media.height,
    });
  }

  const common = {
    p_title: input.title.trim(),
    p_happened_on: input.happenedOn,
    p_body: input.body?.trim() || undefined,
    p_lat: input.lat ?? undefined,
    p_lng: input.lng ?? undefined,
    p_place_name: input.placeName?.trim() || undefined,
    p_photos: photos as unknown as Json,
  };
  const { data, error } = input.id
    ? await supabase.rpc('update_memory', { p_memory_id: input.id, ...common })
    : await supabase.rpc('create_memory', common);
  if (error) throw error;
  onProgress?.(1);
  // La RPC devuelve la fila sin fotos: se reconstruyen con lo enviado (se refresca por Realtime).
  return normalize({
    ...data,
    photos: photos.map((p, position) => ({
      id: `local-${position}`,
      couple_id: data.couple_id,
      memory_id: data.id,
      path: p.path,
      thumb_path: p.thumb_path,
      position,
      width: p.width,
      height: p.height,
      created_at: data.updated_at,
    })),
  });
}

export async function deleteMemory(id: string): Promise<void> {
  const { error } = await supabase.rpc('delete_memory', { p_memory_id: id });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------

const urlCache = new Map<string, { url: string; expiresAt: number }>();

/**
 * URLs firmadas (1 h) de archivos del bucket `memories`, en una sola llamada para los que no
 * están en caché. Devuelve un mapa ruta → URL (las rutas que fallen se omiten).
 */
export async function memoryMediaUrls(paths: readonly string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const missing: string[] = [];
  const now = Date.now();
  for (const path of new Set(paths)) {
    const cached = urlCache.get(path);
    if (cached && cached.expiresAt > now) out[path] = cached.url;
    else missing.push(path);
  }
  if (missing.length > 0) {
    const { data, error } = await supabase.storage
      .from(MEMORIES_BUCKET)
      .createSignedUrls(missing, SIGNED_URL_SECONDS);
    if (error) throw error;
    const expiresAt = Date.now() + SIGNED_URL_REUSE_MS;
    for (const item of data) {
      if (!item.path || !item.signedUrl) continue;
      urlCache.set(item.path, { url: item.signedUrl, expiresAt });
      out[item.path] = item.signedUrl;
    }
  }
  return out;
}

/** URL firmada de una sola ruta. */
export async function memoryMediaUrl(path: string): Promise<string> {
  const urls = await memoryMediaUrls([path]);
  const url = urls[path];
  if (!url) throw new Error('memory_photo_unavailable');
  return url;
}

/** Guarda una foto de una memoria en la galería. Devuelve 'denied' si no hay permiso. */
export async function savePhotoToGallery(path: string): Promise<'saved' | 'denied'> {
  const permission = await MediaLibrary.requestPermissionsAsync(true);
  if (!permission.granted) return 'denied';
  const url = await memoryMediaUrl(path);
  const file = await FileSystem.File.downloadFileAsync(url, FileSystem.Paths.cache, {
    idempotent: true,
  });
  try {
    await MediaLibrary.Asset.create(file.uri);
  } finally {
    try {
      file.delete();
    } catch {
      // el caché se limpia solo
    }
  }
  return 'saved';
}
