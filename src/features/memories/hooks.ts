import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';

import { useCouple, useToday } from '@/features/couple';
import { onThisDay } from '@/lib/memories';
import { supabase } from '@/lib/supabase';

import {
  deleteMemory,
  fetchMemories,
  fetchMemory,
  memoryMediaUrls,
  savePhotoToGallery,
  saveMemory,
  type Memory,
  type SaveMemoryInput,
} from './api';

export const memoryKeys = {
  all: ['memories'] as const,
  list: (coupleId: string | null) => ['memories', 'list', coupleId] as const,
  one: (id: string | null) => ['memories', 'one', id] as const,
  urls: (paths: readonly string[]) => ['memories', 'urls', ...paths] as const,
};

const NO_MEMORIES: Memory[] = [];
const MEDIA_STALE_MS = 50 * 60 * 1000;

// ---------------------------------------------------------------------------
// Lecturas
// ---------------------------------------------------------------------------

/** Todas las memorias de la pareja, la más reciente primero. */
export function useMemories() {
  const { couple } = useCouple();
  const coupleId = couple?.id ?? null;
  const query = useQuery({
    queryKey: memoryKeys.list(coupleId),
    queryFn: () => fetchMemories(coupleId as string),
    enabled: !!coupleId,
  });
  return {
    memories: query.data ?? NO_MEMORIES,
    isLoading: !!coupleId && query.isLoading,
    // Un refresco fallido con datos en caché no es un error de pantalla completa.
    isError: query.isError && !query.data,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
  };
}

function findInLists(qc: QueryClient, id: string): Memory | undefined {
  for (const [, data] of qc.getQueriesData<Memory[]>({ queryKey: [...memoryKeys.all, 'list'] })) {
    const hit = data?.find((m) => m.id === id);
    if (hit) return hit;
  }
  return undefined;
}

/** Una memoria por id (p. ej. desde un push). Arranca con lo que ya está en la lista en caché. */
export function useMemory(id: string | null | undefined) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: memoryKeys.one(id ?? null),
    queryFn: () => fetchMemory(id as string),
    enabled: !!id,
    placeholderData: () => (id ? findInLists(qc, id) : undefined),
  });
  return {
    memory: query.data ?? null,
    isLoading: !!id && query.isLoading,
    isError: query.isError && !query.data,
    refetch: query.refetch,
  };
}

/** URLs firmadas (en lote) de rutas del bucket `memories`: mapa ruta → URL. */
export function useMemoryPhotoUrls(paths: readonly string[]) {
  const key = useMemo(() => [...new Set(paths)].sort(), [paths]);
  const query = useQuery({
    queryKey: memoryKeys.urls(key),
    queryFn: () => memoryMediaUrls(key),
    enabled: key.length > 0,
    staleTime: MEDIA_STALE_MS,
    gcTime: MEDIA_STALE_MS * 2,
  });
  return {
    urls: query.data ?? NO_URLS,
    isLoading: key.length > 0 && query.isLoading,
    isError: query.isError,
  };
}
const NO_URLS: Record<string, string> = {};

/** "Un día como hoy": memorias de este mismo día en años anteriores (con el "hoy" de la pareja). */
export function useOnThisDay() {
  const { today } = useToday();
  const { memories, isLoading } = useMemories();
  const items = useMemo(() => onThisDay(memories, today), [memories, today]);
  return { items, isLoading };
}

// ---------------------------------------------------------------------------
// Escrituras
// ---------------------------------------------------------------------------

type Snapshot = [QueryKey, unknown][];

function invalidateMemories(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: memoryKeys.all });
}

export type SaveMemoryVars = SaveMemoryInput & { onProgress?: (progress: number) => void };

/** Crea o edita (con `id`) una memoria; sube las fotos nuevas con progreso. */
export function useSaveMemory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ onProgress, ...input }: SaveMemoryVars) => saveMemory(input, onProgress),
    onSuccess: (memory) => {
      qc.setQueryData(memoryKeys.one(memory.id), memory);
      invalidateMemories(qc);
    },
  });
}

/** Arranca una memoria: desaparece al instante de la lista. */
export function useDeleteMemory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteMemory(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: memoryKeys.all });
      const snapshot: Snapshot = [];
      for (const [key, data] of qc.getQueriesData<Memory[]>({
        queryKey: [...memoryKeys.all, 'list'],
      })) {
        if (!data) continue;
        snapshot.push([key, data]);
        qc.setQueryData<Memory[]>(
          key,
          data.filter((m) => m.id !== id),
        );
      }
      return { snapshot };
    },
    onError: (_e, _id, ctx) => {
      for (const [key, data] of ctx?.snapshot ?? []) qc.setQueryData(key, data);
    },
    onSettled: (_d, _e, id) => {
      qc.removeQueries({ queryKey: memoryKeys.one(id) });
      invalidateMemories(qc);
    },
  });
}

/** Foto de una memoria (por ruta) a la galería del celular. */
export function useSaveMemoryPhoto() {
  return useMutation({ mutationFn: (path: string) => savePhotoToGallery(path) });
}

// ---------------------------------------------------------------------------
// Realtime
// ---------------------------------------------------------------------------

/** Escucha memorias y fotos de la pareja e invalida la caché al cambiar (incluye borrados). */
export function useMemoriesRealtime() {
  const qc = useQueryClient();
  const { couple } = useCouple();
  const coupleId = couple?.id ?? null;
  useEffect(() => {
    if (!coupleId) return;
    const invalidate = () => invalidateMemories(qc);
    const filter = `couple_id=eq.${coupleId}`;
    let channel = supabase.channel(`memories:${coupleId}`);
    for (const table of ['memories', 'memory_photos']) {
      for (const event of ['INSERT', 'UPDATE', 'DELETE'] as const) {
        channel = channel.on(
          'postgres_changes',
          // Los DELETE solo traen la llave (no couple_id): no se pueden filtrar por pareja.
          event === 'DELETE'
            ? { event, schema: 'public', table }
            : { event, schema: 'public', table, filter },
          invalidate,
        );
      }
    }
    channel.subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [coupleId, qc]);
}
