import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from '@tanstack/react-query';
import { useEffect } from 'react';

import { useSession } from '@/features/auth';
import { useCouple } from '@/features/couple';
import { useProfile } from '@/features/profile';
import { supabase } from '@/lib/supabase';

import {
  createStory,
  deleteStory,
  fetchActiveStories,
  fetchArchive,
  fetchStory,
  markStorySeen,
  reactToStory,
  replyToStory,
  saveStoryToGallery,
  setStoryArchive,
  storyMediaUrl,
  type CreateStoryInput,
  type Story,
  type StoryReply,
} from './api';

export const storyKeys = {
  all: ['stories'] as const,
  active: (coupleId: string | null) => ['stories', 'active', coupleId] as const,
  archive: (userId: string | null) => ['stories', 'archive', userId] as const,
  one: (id: string | null) => ['stories', 'one', id] as const,
  media: (path: string | null) => ['stories', 'media', path] as const,
};

const NO_STORIES: Story[] = [];
const MEDIA_STALE_MS = 50 * 60 * 1000;

// ---------------------------------------------------------------------------
// Lecturas
// ---------------------------------------------------------------------------

/** Stories activas de la pareja (la mía y la de mi pareja), de la más vieja a la más nueva. */
export function useActiveStories() {
  const { couple } = useCouple();
  const coupleId = couple?.id ?? null;
  const query = useQuery({
    queryKey: storyKeys.active(coupleId),
    queryFn: () => fetchActiveStories(coupleId as string),
    enabled: !!coupleId,
  });
  return {
    stories: query.data ?? NO_STORIES,
    isLoading: !!coupleId && query.isLoading,
    // Un refresco fallido con datos en caché no es un error de pantalla completa.
    isError: query.isError && !query.data,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
  };
}

/** Mi archivo (todas mis stories), la más nueva primero. */
export function useStoryArchive() {
  const { user } = useSession();
  const userId = user?.id ?? null;
  const query = useQuery({
    queryKey: storyKeys.archive(userId),
    queryFn: () => fetchArchive(userId as string),
    enabled: !!userId,
  });
  return {
    stories: query.data ?? NO_STORIES,
    isLoading: !!userId && query.isLoading,
    isError: query.isError && !query.data,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
  };
}

function findInCaches(qc: QueryClient, id: string): Story | undefined {
  for (const [, data] of qc.getQueriesData<Story[]>({ queryKey: [...storyKeys.all, 'active'] })) {
    const hit = data?.find((s) => s.id === id);
    if (hit) return hit;
  }
  for (const [, data] of qc.getQueriesData<Story[]>({ queryKey: [...storyKeys.all, 'archive'] })) {
    const hit = data?.find((s) => s.id === id);
    if (hit) return hit;
  }
  return undefined;
}

/** Una story por id (p. ej. desde el archivo o un push). Arranca con lo que ya está en caché. */
export function useStory(id: string | null | undefined) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: storyKeys.one(id ?? null),
    queryFn: () => fetchStory(id as string),
    enabled: !!id,
    placeholderData: () => (id ? findInCaches(qc, id) : undefined),
  });
  return {
    story: query.data ?? null,
    isLoading: !!id && query.isLoading,
    isError: query.isError && !query.data,
    refetch: query.refetch,
  };
}

/** URL firmada de un archivo del bucket `stories` (null si no hay ruta). */
export function useStoryMediaUrl(path: string | null | undefined) {
  const query = useQuery({
    queryKey: storyKeys.media(path ?? null),
    queryFn: () => storyMediaUrl(path as string),
    enabled: !!path,
    staleTime: MEDIA_STALE_MS,
    gcTime: MEDIA_STALE_MS * 2,
  });
  return { url: query.data ?? null, isLoading: !!path && query.isLoading, isError: query.isError };
}

// ---------------------------------------------------------------------------
// Escrituras
// ---------------------------------------------------------------------------

type Snapshot = [QueryKey, unknown][];

/** Aplica `update` a toda story con ese id en las cachés de activas, archivo y detalle. */
function patchStory(qc: QueryClient, id: string, update: (s: Story) => Story): Snapshot {
  const snapshot: Snapshot = [];
  for (const kind of ['active', 'archive'] as const) {
    for (const [key, data] of qc.getQueriesData<Story[]>({ queryKey: [...storyKeys.all, kind] })) {
      if (!data) continue;
      snapshot.push([key, data]);
      qc.setQueryData<Story[]>(
        key,
        data.map((s) => (s.id === id ? update(s) : s)),
      );
    }
  }
  const one = qc.getQueryData<Story | null>(storyKeys.one(id));
  if (one) {
    snapshot.push([storyKeys.one(id), one]);
    qc.setQueryData<Story | null>(storyKeys.one(id), update(one));
  }
  return snapshot;
}

function restore(qc: QueryClient, snapshot: Snapshot | undefined) {
  for (const [key, data] of snapshot ?? []) qc.setQueryData(key, data);
}

async function cancelStories(qc: QueryClient) {
  await qc.cancelQueries({ queryKey: storyKeys.all });
}

function invalidateStories(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: storyKeys.all });
}

export type CreateStoryVars = CreateStoryInput & { onProgress?: (progress: number) => void };

export function useCreateStory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ onProgress, ...input }: CreateStoryVars) =>
      createStory(input as CreateStoryInput, onProgress),
    onSuccess: () => invalidateStories(qc),
  });
}

/** "Arrancar" mi story: desaparece al instante de todas las listas. */
export function useDeleteStory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteStory(id),
    onMutate: async (id) => {
      await cancelStories(qc);
      const snapshot: Snapshot = [];
      for (const kind of ['active', 'archive'] as const) {
        for (const [key, data] of qc.getQueriesData<Story[]>({
          queryKey: [...storyKeys.all, kind],
        })) {
          if (!data) continue;
          snapshot.push([key, data]);
          qc.setQueryData<Story[]>(
            key,
            data.filter((s) => s.id !== id),
          );
        }
      }
      return { snapshot };
    },
    onError: (_e, _id, ctx) => restore(qc, ctx?.snapshot),
    onSettled: () => invalidateStories(qc),
  });
}

/** Marca como vista la story de mi pareja. El autor no cuenta ni se repite la vista. */
export function useMarkStorySeen() {
  const { user } = useSession();
  const userId = user?.id ?? null;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markStorySeen(id),
    onMutate: async (id) => {
      await cancelStories(qc);
      const current = findInCaches(qc, id);
      if (!userId || !current || current.user_id === userId) return { snapshot: [] as Snapshot };
      if (current.views.some((v) => v.user_id === userId)) return { snapshot: [] as Snapshot };
      const seenAt = new Date().toISOString();
      const snapshot = patchStory(qc, id, (s) => ({
        ...s,
        views: [...s.views, { user_id: userId, seen_at: seenAt }],
      }));
      return { snapshot };
    },
    // Sin invalidar al terminar: la vista optimista es exacta y evita recargar mientras se ve.
    onError: (_e, _id, ctx) => {
      restore(qc, ctx?.snapshot);
      invalidateStories(qc);
    },
  });
}

/** Mi reacción (una por persona). `emoji: null` la quita. */
export function useReactToStory() {
  const { user } = useSession();
  const userId = user?.id ?? null;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, emoji }: { id: string; emoji: string | null }) => reactToStory(id, emoji),
    onMutate: async ({ id, emoji }) => {
      await cancelStories(qc);
      if (!userId) return { snapshot: [] as Snapshot };
      const snapshot = patchStory(qc, id, (s) => {
        const others = s.reactions.filter((r) => r.user_id !== userId);
        return { ...s, reactions: emoji ? [...others, { user_id: userId, emoji }] : others };
      });
      return { snapshot };
    },
    onError: (_e, _vars, ctx) => restore(qc, ctx?.snapshot),
    onSettled: () => invalidateStories(qc),
  });
}

/** Responde a una story activa; la respuesta aparece al instante con un id provisional. */
export function useReplyToStory() {
  const { user } = useSession();
  const userId = user?.id ?? null;
  const { couple } = useCouple();
  const coupleId = couple?.id ?? null;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => replyToStory(id, body),
    onMutate: async ({ id, body }) => {
      await cancelStories(qc);
      if (!userId || !coupleId) return { snapshot: [] as Snapshot };
      const optimistic: StoryReply = {
        id: `optimistic-${Date.now()}`,
        couple_id: coupleId,
        story_id: id,
        user_id: userId,
        body: body.trim(),
        created_at: new Date().toISOString(),
      };
      const snapshot = patchStory(qc, id, (s) => ({ ...s, replies: [...s.replies, optimistic] }));
      return { snapshot };
    },
    onError: (_e, _vars, ctx) => restore(qc, ctx?.snapshot),
    onSettled: () => invalidateStories(qc),
  });
}

/** Foto de una story a la galería del celular. */
export function useSaveStoryToGallery() {
  return useMutation({ mutationFn: (story: Story) => saveStoryToGallery(story) });
}

/** "Guardar mis stories en mi archivo": `enabled` + `setEnabled` (optimista sobre el perfil). */
export function useStoryArchiveSetting() {
  const { user } = useSession();
  const userId = user?.id ?? null;
  const { data: profile, isLoading } = useProfile();
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: (enabled: boolean) => setStoryArchive(enabled),
    onMutate: async (enabled) => {
      const key = ['profile', userId];
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData(key);
      qc.setQueryData(key, (old: unknown) =>
        old && typeof old === 'object' ? { ...old, story_archive: enabled } : old,
      );
      return { previous, key };
    },
    onError: (_e, _enabled, ctx) => {
      if (ctx) qc.setQueryData(ctx.key, ctx.previous);
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: ['profile'] }),
  });
  return {
    enabled: profile?.story_archive ?? true,
    isLoading: !!userId && isLoading,
    isSaving: mutation.isPending,
    setEnabled: mutation.mutate,
    mutation,
  };
}

// ---------------------------------------------------------------------------
// Realtime
// ---------------------------------------------------------------------------

/**
 * Escucha stories, vistos, reacciones y respuestas e invalida la caché. Solo `stories` y
 * `story_replies` tienen `couple_id` para filtrar; vistos y reacciones llegan filtrados por la
 * RLS (solo las de stories que puedo ver).
 */
export function useStoriesRealtime() {
  const qc = useQueryClient();
  const { couple } = useCouple();
  const coupleId = couple?.id ?? null;
  useEffect(() => {
    if (!coupleId) return;
    const invalidate = () => invalidateStories(qc);
    const filter = `couple_id=eq.${coupleId}`;
    let channel = supabase.channel(`stories:${coupleId}`);
    for (const event of ['INSERT', 'UPDATE'] as const) {
      channel = channel
        .on('postgres_changes', { event, schema: 'public', table: 'stories', filter }, invalidate)
        .on('postgres_changes', { event, schema: 'public', table: 'story_views' }, invalidate)
        .on('postgres_changes', { event, schema: 'public', table: 'story_reactions' }, invalidate)
        .on(
          'postgres_changes',
          { event, schema: 'public', table: 'story_replies', filter },
          invalidate,
        );
    }
    // Quitar una reacción es un DELETE.
    channel = channel.on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'story_reactions' },
      invalidate,
    );
    channel.subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [coupleId, qc]);
}
