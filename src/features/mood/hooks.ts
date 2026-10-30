import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';

import { useSession } from '@/features/auth';
import { useCouple } from '@/features/couple';
import { latestMoodByUser, validateMoodInput } from '@/lib/mood';
import { supabase } from '@/lib/supabase';

import { fetchMoods, setMood, type Mood } from './api';

const NO_MOODS: Mood[] = [];

export function useMoods() {
  const { couple } = useCouple();
  const coupleId = couple?.id ?? null;
  const query = useQuery({
    queryKey: ['moods', coupleId],
    queryFn: () => fetchMoods(coupleId as string),
    enabled: !!coupleId,
  });
  const moods = query.data ?? NO_MOODS;
  const latestByUser = useMemo(() => latestMoodByUser(moods), [moods]);
  return {
    moods,
    latestByUser,
    isLoading: !!coupleId && query.isLoading,
    // Un refresco fallido con datos en caché no es un error de pantalla completa.
    isError: query.isError && !query.data,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
  };
}

/** Mi último mood (o null). */
export function useMyMood(): Mood | null {
  const { me } = useCouple();
  const { latestByUser } = useMoods();
  return (me && latestByUser[me.id]) || null;
}

/** El último mood de tu pareja (o null). */
export function usePartnerMood(): Mood | null {
  const { partner } = useCouple();
  const { latestByUser } = useMoods();
  return (partner && latestByUser[partner.id]) || null;
}

export function useSetMood() {
  const { user } = useSession();
  const { couple } = useCouple();
  const qc = useQueryClient();
  const coupleId = couple?.id ?? null;
  return useMutation({
    mutationFn: (input: { emoji: string; note?: string | null }) => {
      const result = validateMoodInput(input);
      if (!result.ok) throw new Error(result.error);
      return setMood(result.value);
    },
    onMutate: async (input) => {
      const key = ['moods', coupleId];
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Mood[]>(key);
      const result = validateMoodInput(input);
      if (coupleId && user && result.ok) {
        const now = new Date().toISOString();
        const optimistic: Mood = {
          id: `optimistic-${Date.now()}`,
          couple_id: coupleId,
          user_id: user.id,
          emoji: result.value.emoji,
          note: result.value.note,
          created_at: now,
        };
        qc.setQueryData<Mood[]>(key, [optimistic, ...(previous ?? [])]);
      }
      return { previous, key };
    },
    onError: (_error, _input, context) => {
      if (context) qc.setQueryData(context.key, context.previous);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['moods'] });
    },
  });
}

/**
 * Escucha moods nuevos de la pareja en tiempo real e invalida la caché.
 * `onPartnerMood` se llama cuando el INSERT es de otra persona (animación, háptica).
 */
export function useMoodRealtime(coupleId: string | null, onPartnerMood?: (m: Mood) => void) {
  const qc = useQueryClient();
  const { user } = useSession();
  const userId = user?.id ?? null;
  const callbackRef = useRef(onPartnerMood);
  const userIdRef = useRef(userId);
  useEffect(() => {
    callbackRef.current = onPartnerMood;
    userIdRef.current = userId;
  });
  useEffect(() => {
    if (!coupleId) return;
    const channel = supabase
      .channel(`moods:${coupleId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'moods', filter: `couple_id=eq.${coupleId}` },
        (payload) => {
          void qc.invalidateQueries({ queryKey: ['moods', coupleId] });
          const mood = payload.new as Mood;
          if (mood.user_id !== userIdRef.current) callbackRef.current?.(mood);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [coupleId, qc]);
}
