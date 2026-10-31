import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

export type VisitRow = Database['public']['Tables']['visits']['Row'];

export type SaveVisitInput = {
  /** Con id se edita; sin id se crea. */
  id?: string;
  /** 'YYYY-MM-DD' */
  startDate: string;
  endDate: string;
  place?: string | null;
  note?: string | null;
  /** Cuenta regresiva de visita a la que corresponde. */
  eventId?: string | null;
};

const VISITS_LIMIT = 1000;

/** Todas las visitas de la pareja, de la más reciente a la más antigua. */
export async function fetchVisits(coupleId: string): Promise<VisitRow[]> {
  const { data, error } = await supabase
    .from('visits')
    .select('*')
    .eq('couple_id', coupleId)
    .order('start_date', { ascending: false })
    .limit(VISITS_LIMIT);
  if (error) throw error;
  return data ?? [];
}

/** Crea o edita una visita (RPC `save_visit`). */
export async function saveVisit(input: SaveVisitInput): Promise<VisitRow> {
  const { data, error } = await supabase.rpc('save_visit', {
    p_start_date: input.startDate,
    p_end_date: input.endDate,
    p_place: input.place || undefined,
    p_note: input.note || undefined,
    p_event_id: input.eventId || undefined,
    p_id: input.id,
  });
  if (error) throw error;
  return data as VisitRow;
}

export async function deleteVisit(id: string): Promise<void> {
  const { error } = await supabase.rpc('delete_visit', { p_id: id });
  if (error) throw error;
}
