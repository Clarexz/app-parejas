import {
  compressToJpeg,
  removeFileQuietly,
  uploadJpeg,
  type Profile,
} from '@/features/profile/api';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

export type Couple = Database['public']['Tables']['couples']['Row'];
export type CoupleMember = Database['public']['Tables']['couple_members']['Row'];

export type CoupleState = {
  couple: Couple | null;
  members: CoupleMember[];
  me: Profile | null;
  partner: Profile | null;
};

export const EMPTY_COUPLE_STATE: CoupleState = {
  couple: null,
  members: [],
  me: null,
  partner: null,
};

/** Mi membresía -> mi pareja -> miembros -> perfiles de ambos. */
export async function fetchCoupleState(userId: string): Promise<CoupleState> {
  const { data: mine, error: mineError } = await supabase
    .from('couple_members')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (mineError) throw mineError;
  if (!mine) return EMPTY_COUPLE_STATE;

  const { data: couple, error: coupleError } = await supabase
    .from('couples')
    .select('*')
    .eq('id', mine.couple_id)
    .single();
  if (coupleError) throw coupleError;

  const { data: members, error: membersError } = await supabase
    .from('couple_members')
    .select('*')
    .eq('couple_id', mine.couple_id);
  if (membersError) throw membersError;

  const ids = members.map((m) => m.user_id);
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .in('id', ids);
  if (profilesError) throw profilesError;

  return {
    couple,
    members,
    me: profiles.find((p) => p.id === userId) ?? null,
    partner: profiles.find((p) => p.id !== userId) ?? null,
  };
}

export async function createCouple(input: {
  anniversaryDate?: string | null;
  timezone: string;
}): Promise<Couple> {
  const { data, error } = await supabase.rpc('create_couple', {
    p_anniversary_date: input.anniversaryDate ?? undefined,
    p_timezone: input.timezone,
  });
  if (error) throw error;
  return data;
}

export async function joinCouple(code: string): Promise<Couple> {
  const { data, error } = await supabase.rpc('join_couple', { p_code: code });
  if (error) throw error;
  return data;
}

export async function leaveCouple(): Promise<void> {
  const { error } = await supabase.rpc('leave_couple');
  if (error) throw error;
}

export async function updateCouple(
  coupleId: string,
  patch: { anniversary_date?: string | null; timezone?: string; photo_path?: string },
): Promise<Couple> {
  const { data, error } = await supabase
    .from('couples')
    .update(patch)
    .eq('id', coupleId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function uploadCouplePhoto(
  coupleId: string,
  localUri: string,
  previousPath: string | null,
): Promise<Couple> {
  const body = await compressToJpeg(localUri);
  const path = await uploadJpeg(`couples/${coupleId}/${Date.now()}.jpg`, body);
  let couple: Couple;
  try {
    couple = await updateCouple(coupleId, { photo_path: path });
  } catch (e) {
    await removeFileQuietly(path);
    throw e;
  }
  await removeFileQuietly(previousPath);
  return couple;
}
