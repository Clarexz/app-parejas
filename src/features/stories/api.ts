import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

import type { Stroke } from '@/lib/drawing';
import { randomUuid } from '@/lib/ids';
import { toJpeg } from '@/lib/image';
import {
  STORY_CAPTION_MAX,
  storyPaths,
  type StoryBg,
  type StoryFont,
  type StorySticker,
} from '@/lib/stories';
import { supabase } from '@/lib/supabase';
import type { Database, Json } from '@/types/database';

type Tables = Database['public']['Tables'];

export type StoryReply = Tables['story_replies']['Row'];
export type StoryView = { user_id: string; seen_at: string };
export type StoryReaction = { user_id: string; emoji: string };

export type Story = Tables['stories']['Row'] & {
  views: StoryView[];
  reactions: StoryReaction[];
  replies: StoryReply[];
};

export type CreateStoryInput =
  | { kind: 'photo'; uri: string; caption?: string | null; stickers?: StorySticker[] }
  | { kind: 'text'; text: string; bg: StoryBg; font: StoryFont; stickers?: StorySticker[] }
  | { kind: 'drawing'; strokes: Stroke[]; bg: StoryBg; stickers?: StorySticker[] };

export const STORIES_BUCKET = 'stories';

const MEDIA_SIDE = 1600;
const MEDIA_QUALITY = 0.7;
const THUMB_SIDE = 320;
const THUMB_QUALITY = 0.6;
const ARCHIVE_LIMIT = 500;
const SIGNED_URL_SECONDS = 3600;
// Se reutiliza la URL firmada hasta 10 minutos antes de que caduque.
const SIGNED_URL_REUSE_MS = (SIGNED_URL_SECONDS - 600) * 1000;

const SELECT =
  '*, views:story_views(user_id, seen_at), reactions:story_reactions(user_id, emoji), replies:story_replies(*)';

type StoryRow = Tables['stories']['Row'] & {
  views: StoryView[] | null;
  reactions: StoryReaction[] | null;
  replies: StoryReply[] | null;
};

function normalize(row: StoryRow): Story {
  return {
    ...row,
    views: row.views ?? [],
    reactions: row.reactions ?? [],
    replies: [...(row.replies ?? [])].sort(
      (a, b) => Date.parse(a.created_at) - Date.parse(b.created_at),
    ),
  };
}

/** Stories activas de la pareja (la RLS ya oculta borradas y caducadas de tu pareja). */
export async function fetchActiveStories(coupleId: string): Promise<Story[]> {
  const { data, error } = await supabase
    .from('stories')
    .select(SELECT)
    .eq('couple_id', coupleId)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as unknown as StoryRow[]).map(normalize);
}

/** Mi archivo: todas mis stories (activas y caducadas), la más nueva primero. */
export async function fetchArchive(userId: string): Promise<Story[]> {
  const { data, error } = await supabase
    .from('stories')
    .select(SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(ARCHIVE_LIMIT);
  if (error) throw error;
  return (data as unknown as StoryRow[]).map(normalize);
}

export async function fetchStory(id: string): Promise<Story | null> {
  const { data, error } = await supabase.from('stories').select(SELECT).eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? normalize(data as unknown as StoryRow) : null;
}

// ---------------------------------------------------------------------------
// Crear
// ---------------------------------------------------------------------------

async function upload(path: string, body: ArrayBuffer): Promise<void> {
  const { error } = await supabase.storage
    .from(STORIES_BUCKET)
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

/**
 * Publica una story. Para fotos comprime (1600 px, JPEG 0.7) y crea la miniatura (320 px,
 * JPEG 0.6), sube ambas a Storage y luego llama a la RPC. Si la RPC falla, los archivos subidos
 * quedan huérfanos y la limpieza horaria los borra (la app no tiene permiso de borrar en Storage).
 * `onProgress` recibe un avance de 0 a 1.
 */
export async function createStory(
  input: CreateStoryInput,
  onProgress?: (progress: number) => void,
): Promise<Story> {
  const stickers = (input.stickers ?? []) as unknown as Json;
  let args: Database['public']['Functions']['create_story']['Args'];

  if (input.kind === 'photo') {
    onProgress?.(0);
    const { userId, coupleId } = await currentIds();
    const paths = storyPaths(coupleId, userId, randomUuid());
    const media = (await toJpeg(input.uri, MEDIA_SIDE, MEDIA_QUALITY)).data;
    onProgress?.(0.25);
    const thumb = (await toJpeg(input.uri, THUMB_SIDE, THUMB_QUALITY)).data;
    onProgress?.(0.4);
    await upload(paths.media, media);
    onProgress?.(0.7);
    await upload(paths.thumb, thumb);
    onProgress?.(0.9);
    const caption = (input.caption ?? '').trim().slice(0, STORY_CAPTION_MAX);
    args = {
      p_kind: 'photo',
      p_media_path: paths.media,
      p_thumb_path: paths.thumb,
      p_text: caption || undefined,
      p_stickers: stickers,
    };
  } else if (input.kind === 'text') {
    args = {
      p_kind: 'text',
      p_text: input.text.trim(),
      p_bg: input.bg,
      p_font: input.font,
      p_stickers: stickers,
    };
  } else {
    args = {
      p_kind: 'drawing',
      p_bg: input.bg,
      p_strokes: input.strokes as unknown as Json,
      p_stickers: stickers,
    };
  }

  const { data, error } = await supabase.rpc('create_story', args);
  if (error) throw error;
  onProgress?.(1);
  return normalize({ ...data, views: [], reactions: [], replies: [] });
}

// ---------------------------------------------------------------------------
// Acciones
// ---------------------------------------------------------------------------

export async function deleteStory(id: string): Promise<void> {
  const { error } = await supabase.rpc('delete_story', { p_story_id: id });
  if (error) throw error;
}

export async function markStorySeen(id: string): Promise<void> {
  const { error } = await supabase.rpc('mark_story_seen', { p_story_id: id });
  if (error) throw error;
}

/** `null` o vacío quita mi reacción. */
export async function reactToStory(id: string, emoji: string | null): Promise<void> {
  const { error } = await supabase.rpc('react_to_story', {
    p_story_id: id,
    p_emoji: emoji ?? '',
  });
  if (error) throw error;
}

export async function replyToStory(id: string, body: string): Promise<StoryReply> {
  const { data, error } = await supabase.rpc('reply_to_story', { p_story_id: id, p_body: body });
  if (error) throw error;
  return data;
}

/** "Guardar mis stories en mi archivo" (profiles.story_archive). */
export async function setStoryArchive(enabled: boolean): Promise<void> {
  const { error } = await supabase.rpc('set_story_archive', { p_enabled: enabled });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------

const urlCache = new Map<string, { url: string; expiresAt: number }>();

/** URL firmada (1 h) de un archivo del bucket `stories`; se reutiliza mientras no esté por vencer. */
export async function storyMediaUrl(path: string): Promise<string> {
  const cached = urlCache.get(path);
  if (cached && cached.expiresAt > Date.now()) return cached.url;
  const { data, error } = await supabase.storage
    .from(STORIES_BUCKET)
    .createSignedUrl(path, SIGNED_URL_SECONDS);
  if (error) throw error;
  urlCache.set(path, { url: data.signedUrl, expiresAt: Date.now() + SIGNED_URL_REUSE_MS });
  return data.signedUrl;
}

/**
 * Guarda la foto de una story en la galería del celular. Solo fotos. Devuelve 'denied' si no hay
 * permiso para escribir en la galería.
 */
export async function saveStoryToGallery(story: Story): Promise<'saved' | 'denied'> {
  if (story.kind !== 'photo' || !story.media_path) throw new Error('invalid_story');
  const permission = await MediaLibrary.requestPermissionsAsync(true);
  if (!permission.granted) return 'denied';
  const url = await storyMediaUrl(story.media_path);
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
