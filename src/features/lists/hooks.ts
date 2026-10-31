import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { useCouple } from '@/features/couple';
import { randomUuid } from '@/lib/ids';
import {
  applyClearDone,
  applyOrder,
  applyRemove,
  applyText,
  applyToggle,
  nextPosition,
  replaceItem,
} from '@/lib/lists';
import { supabase } from '@/lib/supabase';

import {
  addListItem,
  clearDoneListItems,
  deleteList,
  deleteListItem,
  fetchList,
  fetchListItems,
  fetchLists,
  reorderListItems,
  saveList,
  setListItemDone,
  updateListItem,
  type List,
  type ListItem,
  type SaveListInput,
} from './api';

export const listKeys = {
  all: ['lists'] as const,
  list: (coupleId: string | null) => ['lists', 'list', coupleId] as const,
  one: (id: string | null) => ['lists', 'one', id] as const,
  items: (listId: string | null) => ['lists', 'items', listId] as const,
};

const NO_LISTS: List[] = [];
const NO_ITEMS: ListItem[] = [];

// ---------------------------------------------------------------------------
// Lecturas
// ---------------------------------------------------------------------------

/** Las listas de la pareja con su avance. */
export function useLists() {
  const { couple } = useCouple();
  const coupleId = couple?.id ?? null;
  const query = useQuery({
    queryKey: listKeys.list(coupleId),
    queryFn: () => fetchLists(coupleId as string),
    enabled: !!coupleId,
  });
  return {
    lists: query.data ?? NO_LISTS,
    isLoading: !!coupleId && query.isLoading,
    // Un refresco fallido con datos en caché no es un error de pantalla completa.
    isError: query.isError && !query.data,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
  };
}

function findInLists(qc: QueryClient, id: string): List | undefined {
  for (const [, data] of qc.getQueriesData<List[]>({ queryKey: [...listKeys.all, 'list'] })) {
    const hit = data?.find((l) => l.id === id);
    if (hit) return hit;
  }
  return undefined;
}

/** Una lista por id; arranca con lo que ya está en la lista en caché. */
export function useList(id: string | null | undefined) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: listKeys.one(id ?? null),
    queryFn: () => fetchList(id as string),
    enabled: !!id,
    placeholderData: () => (id ? findInLists(qc, id) : undefined),
  });
  return {
    list: query.data ?? null,
    isLoading: !!id && query.isLoading,
    isError: query.isError && !query.data,
    refetch: query.refetch,
  };
}

/** Renglones de una lista, en el orden del servidor (`position`). */
export function useListItems(listId: string | null | undefined) {
  const query = useQuery({
    queryKey: listKeys.items(listId ?? null),
    queryFn: () => fetchListItems(listId as string),
    enabled: !!listId,
  });
  return {
    items: query.data ?? NO_ITEMS,
    isLoading: !!listId && query.isLoading,
    isError: query.isError && !query.data,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
  };
}

// ---------------------------------------------------------------------------
// Escrituras de listas
// ---------------------------------------------------------------------------

function invalidateLists(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: listKeys.all });
}

const WRITE_KEY = ['lists', 'write'] as const;

/**
 * Relee del servidor solo cuando ya no quedan escrituras de renglones en vuelo: si no, una lectura
 * a medio camino pisaría los cambios optimistas de un toque rápido siguiente.
 */
function settle(qc: QueryClient) {
  // Dentro de `onSettled` la mutación actual todavía cuenta como en curso.
  if (qc.isMutating({ mutationKey: WRITE_KEY }) <= 1) invalidateLists(qc);
}

/** Crea o edita (con `id`) una lista. */
export function useSaveList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveListInput) => saveList(input),
    onSuccess: () => invalidateLists(qc),
  });
}

/** Borra una lista: desaparece al instante de la pantalla de listas. */
export function useDeleteList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteList(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: listKeys.all });
      const snapshot: [readonly unknown[], List[]][] = [];
      for (const [key, data] of qc.getQueriesData<List[]>({
        queryKey: [...listKeys.all, 'list'],
      })) {
        if (!data) continue;
        snapshot.push([key, data]);
        qc.setQueryData<List[]>(
          key,
          data.filter((l) => l.id !== id),
        );
      }
      return { snapshot };
    },
    onError: (_e, _id, ctx) => {
      for (const [key, data] of ctx?.snapshot ?? []) qc.setQueryData(key, data);
    },
    onSettled: (_d, _e, id) => {
      qc.removeQueries({ queryKey: listKeys.one(id) });
      qc.removeQueries({ queryKey: listKeys.items(id) });
      invalidateLists(qc);
    },
  });
}

// ---------------------------------------------------------------------------
// Escrituras de renglones (optimistas, con rollback)
// ---------------------------------------------------------------------------

type ItemsContext = { previous: ListItem[] | undefined };

/** Aplica `patch` a la caché de renglones y devuelve lo anterior para el rollback. */
async function patchItems(
  qc: QueryClient,
  listId: string,
  patch: (items: ListItem[]) => ListItem[],
): Promise<ItemsContext> {
  const key = listKeys.items(listId);
  await qc.cancelQueries({ queryKey: key });
  const previous = qc.getQueryData<ListItem[]>(key);
  if (previous) qc.setQueryData<ListItem[]>(key, patch(previous));
  return { previous };
}

function rollback(qc: QueryClient, listId: string, ctx: ItemsContext | undefined) {
  if (ctx?.previous) qc.setQueryData(listKeys.items(listId), ctx.previous);
}

/** Agrega un renglón al final: aparece al instante y se cambia por el real al confirmar. */
export function useAddListItem() {
  const qc = useQueryClient();
  const { me, couple } = useCouple();
  return useMutation({
    mutationKey: WRITE_KEY,
    mutationFn: ({ listId, text }: { listId: string; text: string }) => addListItem(listId, text),
    onMutate: async ({ listId, text }) => {
      const key = listKeys.items(listId);
      await qc.cancelQueries({ queryKey: key });
      const tempId = `tmp-${randomUuid()}`;
      const now = new Date().toISOString();
      const current = qc.getQueryData<ListItem[]>(key) ?? [];
      const temp: ListItem = {
        id: tempId,
        couple_id: couple?.id ?? '',
        created_by: me?.id ?? '',
        done_by: null,
        list_id: listId,
        text: text.trim(),
        done: false,
        done_at: null,
        position: nextPosition(current),
        created_at: now,
        updated_at: now,
      };
      qc.setQueryData<ListItem[]>(key, [...current, temp]);
      return { tempId };
    },
    onSuccess: (item, { listId }, ctx) => {
      qc.setQueryData<ListItem[]>(listKeys.items(listId), (items) =>
        replaceItem(items ?? [], ctx?.tempId ?? '', item),
      );
    },
    onError: (_e, { listId }, ctx) => {
      // Solo se quita el renglón fallido: puede haber otros agregándose a la vez.
      qc.setQueryData<ListItem[]>(listKeys.items(listId), (items) =>
        applyRemove(items ?? [], ctx?.tempId ?? ''),
      );
    },
    onSettled: () => settle(qc),
  });
}

/** Tacha o destacha un renglón (guarda quién y cuándo). */
export function useToggleListItem() {
  const qc = useQueryClient();
  const { me } = useCouple();
  return useMutation({
    mutationKey: WRITE_KEY,
    mutationFn: ({ id, done }: { listId: string; id: string; done: boolean }) =>
      setListItemDone(id, done),
    onMutate: ({ listId, id, done }) =>
      patchItems(qc, listId, (items) =>
        applyToggle(items, id, done, me?.id ?? null, new Date().toISOString()),
      ),
    onError: (_e, { listId }, ctx) => rollback(qc, listId, ctx),
    onSettled: () => settle(qc),
  });
}

/** Cambia el texto de un renglón. */
export function useUpdateListItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: WRITE_KEY,
    mutationFn: ({ id, text }: { listId: string; id: string; text: string }) =>
      updateListItem(id, text),
    onMutate: ({ listId, id, text }) =>
      patchItems(qc, listId, (items) => applyText(items, id, text)),
    onError: (_e, { listId }, ctx) => rollback(qc, listId, ctx),
    onSettled: () => settle(qc),
  });
}

/** Borra un renglón. */
export function useDeleteListItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: WRITE_KEY,
    mutationFn: ({ id }: { listId: string; id: string }) => deleteListItem(id),
    onMutate: ({ listId, id }) => patchItems(qc, listId, (items) => applyRemove(items, id)),
    onError: (_e, { listId }, ctx) => rollback(qc, listId, ctx),
    onSettled: () => settle(qc),
  });
}

/** Borra los tachados; devuelve cuántos eran. */
export function useClearDoneListItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: WRITE_KEY,
    mutationFn: (listId: string) => clearDoneListItems(listId),
    onMutate: (listId) => patchItems(qc, listId, applyClearDone),
    onError: (_e, listId, ctx) => rollback(qc, listId, ctx),
    onSettled: () => settle(qc),
  });
}

/** Reordena: `ids` son todos los renglones de la lista en el orden nuevo. */
export function useReorderListItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: WRITE_KEY,
    mutationFn: ({ listId, ids }: { listId: string; ids: string[] }) =>
      reorderListItems(listId, ids),
    onMutate: ({ listId, ids }) => patchItems(qc, listId, (items) => applyOrder(items, ids)),
    onError: (_e, { listId }, ctx) => rollback(qc, listId, ctx),
    // Tras un `invalid_order` (la lista cambió) se vuelve a leer del servidor.
    onSettled: () => settle(qc),
  });
}

// ---------------------------------------------------------------------------
// Realtime
// ---------------------------------------------------------------------------

/**
 * Escucha `lists` y `list_items` de la pareja e invalida la caché al cambiar (incluye borrados).
 * Cada montaje usa su propio canal: la pantalla de listas y la de una lista pueden convivir.
 */
export function useListsRealtime() {
  const qc = useQueryClient();
  const { couple } = useCouple();
  const coupleId = couple?.id ?? null;
  const [suffix] = useState(() => randomUuid().slice(0, 8));
  useEffect(() => {
    if (!coupleId) return;
    const invalidate = () => invalidateLists(qc);
    const filter = `couple_id=eq.${coupleId}`;
    let channel = supabase.channel(`lists:${coupleId}:${suffix}`);
    for (const table of ['lists', 'list_items']) {
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
  }, [coupleId, qc, suffix]);
}
