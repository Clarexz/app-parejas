import { parseRelationshipStats, type RelationshipStats } from '@/lib/stats';
import { supabase } from '@/lib/supabase';

/** Agregados de la relación (RPC `get_relationship_stats`, solo lectura). */
export async function fetchRelationshipStats(): Promise<RelationshipStats> {
  const { data, error } = await supabase.rpc('get_relationship_stats');
  if (error) throw error;
  return parseRelationshipStats(data);
}
