import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type Tables = Database['public']['Tables'];

export type ListItem = Tables['list_items']['Row'];

/** Lista con el conteo de renglones (hechos/total) ya calculado. */
export type List = Tables['lists']['Row'] & { itemCount: number; doneCount: number };

export type SaveListInput = {
  /** Con id se edita; sin id se crea. */
  id?: string;
  title: string;
  kind: string;
  emoji?: string | null;
};

const LISTS_LIMIT = 200;
const ITEMS_LIMIT = 500;
const SELECT = '*, list_items(id, done)';

type ListRow = Tables['lists']['Row'] & { list_items: { id: string; done: boolean }[] | null };

function normalize(row: ListRow): List {
  const { list_items, ...list } = row;
  const items = list_items ?? [];
  return { ...list, itemCount: items.length, doneCount: items.filter((i) => i.done).length };
}

/** Las listas de la pareja, la más nueva primero. */
export async function fetchLists(coupleId: string): Promise<List[]> {
  const { data, error } = await supabase
    .from('lists')
    .select(SELECT)
    .eq('couple_id', coupleId)
    .order('created_at', { ascending: false })
    .limit(LISTS_LIMIT);
  if (error) throw error;
  return (data as unknown as ListRow[]).map(normalize);
}

export async function fetchList(id: string): Promise<List | null> {
  const { data, error } = await supabase.from('lists').select(SELECT).eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? normalize(data as unknown as ListRow) : null;
}

/** Renglones de una lista en su orden (`position`). */
export async function fetchListItems(listId: string): Promise<ListItem[]> {
  const { data, error } = await supabase
    .from('list_items')
    .select('*')
    .eq('list_id', listId)
    .order('position', { ascending: true })
    .limit(ITEMS_LIMIT);
  if (error) throw error;
  return data;
}

export async function saveList(input: SaveListInput): Promise<Tables['lists']['Row']> {
  const { data, error } = await supabase.rpc('save_list', {
    p_title: input.title.trim(),
    p_kind: input.kind,
    p_emoji: input.emoji?.trim() || undefined,
    p_id: input.id,
  });
  if (error) throw error;
  return data;
}

export async function deleteList(id: string): Promise<void> {
  const { error } = await supabase.rpc('delete_list', { p_id: id });
  if (error) throw error;
}

export async function addListItem(listId: string, text: string): Promise<ListItem> {
  const { data, error } = await supabase.rpc('add_list_item', {
    p_list_id: listId,
    p_text: text.trim(),
  });
  if (error) throw error;
  return data;
}

export async function updateListItem(id: string, text: string): Promise<void> {
  const { error } = await supabase.rpc('update_list_item', { p_id: id, p_text: text.trim() });
  if (error) throw error;
}

export async function setListItemDone(id: string, done: boolean): Promise<void> {
  const { error } = await supabase.rpc('set_list_item_done', { p_id: id, p_done: done });
  if (error) throw error;
}

export async function deleteListItem(id: string): Promise<void> {
  const { error } = await supabase.rpc('delete_list_item', { p_id: id });
  if (error) throw error;
}

/** Borra los renglones tachados; devuelve cuántos fueron. */
export async function clearDoneListItems(listId: string): Promise<number> {
  const { data, error } = await supabase.rpc('clear_done_list_items', { p_list_id: listId });
  if (error) throw error;
  return data;
}

/** `ids` debe traer TODOS los renglones de la lista, en el orden nuevo. */
export async function reorderListItems(listId: string, ids: string[]): Promise<void> {
  const { error } = await supabase.rpc('reorder_list_items', { p_list_id: listId, p_ids: ids });
  if (error) throw error;
}
