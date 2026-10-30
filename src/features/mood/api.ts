import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

export type Mood = Database['public']['Tables']['moods']['Row'];

/** Moods de la pareja (RLS limita a miembros actuales), del más nuevo al más viejo. */
export async function fetchMoods(coupleId: string, limit = 60): Promise<Mood[]> {
  const { data, error } = await supabase
    .from('moods')
    .select('*')
    .eq('couple_id', coupleId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function setMood(input: { emoji: string; note?: string | null }): Promise<Mood> {
  const { data, error } = await supabase.rpc('set_mood', {
    p_emoji: input.emoji,
    p_note: input.note ?? undefined,
  });
  if (error) throw error;
  return data;
}
