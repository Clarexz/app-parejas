import type { EventKind } from '@/lib/events';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type Row = Database['public']['Tables']['events']['Row'];

/** Fila de `events` con `kind` ya acotado. */
export type EventRow = Omit<Row, 'kind'> & { kind: EventKind };

export type SaveEventInput = {
  /** Con id se edita; sin id se crea. */
  id?: string;
  title: string;
  /** 'YYYY-MM-DD' */
  date: string;
  kind: EventKind;
  emoji?: string | null;
  recurringYearly?: boolean;
  note?: string | null;
};

const EVENTS_LIMIT = 500;

function normalize(row: Row): EventRow {
  return { ...row, kind: row.kind === 'visit' ? 'visit' : 'custom' };
}

/** Todos los eventos de la pareja, por fecha. */
export async function fetchEvents(coupleId: string): Promise<EventRow[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('couple_id', coupleId)
    .order('date', { ascending: true })
    .limit(EVENTS_LIMIT);
  if (error) throw error;
  return (data ?? []).map(normalize);
}

/** Crea o edita un evento (RPC `save_event`). Las visitas nunca se repiten. */
export async function saveEvent(input: SaveEventInput): Promise<EventRow> {
  const { data, error } = await supabase.rpc('save_event', {
    p_title: input.title,
    p_date: input.date,
    p_kind: input.kind,
    p_emoji: input.emoji || undefined,
    p_recurring_yearly: input.kind === 'visit' ? false : (input.recurringYearly ?? false),
    p_note: input.note || undefined,
    p_id: input.id,
  });
  if (error) throw error;
  return normalize(data as Row);
}

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase.rpc('delete_event', { p_id: id });
  if (error) throw error;
}
