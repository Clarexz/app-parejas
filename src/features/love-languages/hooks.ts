import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { useCouple } from '@/features/couple';
import { randomUuid } from '@/lib/ids';
import { supabase } from '@/lib/supabase';

import { fetchLoveLanguages, submitLoveLanguageTest } from './api';

export const loveLanguageKeys = {
  all: ['love-languages'] as const,
  overview: (userId: string | null) => ['love-languages', userId] as const,
};

/** Escucha `love_language_results` (sin filtro: RLS recorta) e invalida. Un canal por montaje. */
export function useLoveLanguagesRealtime(enabled: boolean) {
  const qc = useQueryClient();
  const [suffix] = useState(() => randomUuid().slice(0, 8));
  useEffect(() => {
    if (!enabled) return;
    const channel = supabase
      .channel(`love-languages:${suffix}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'love_language_results' },
        () => qc.invalidateQueries({ queryKey: loveLanguageKeys.all }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled, qc, suffix]);
}

/** Mis resultados, los de mi pareja (si yo ya hice el test) y si ella ya lo hizo. */
export function useLoveLanguages() {
  const { me } = useCouple();
  const userId = me?.id ?? null;
  useLoveLanguagesRealtime(!!userId);
  const query = useQuery({
    queryKey: loveLanguageKeys.overview(userId),
    queryFn: fetchLoveLanguages,
    enabled: !!userId,
  });
  return {
    overview: query.data ?? null,
    isLoading: !!userId && query.isLoading,
    // Un refresco fallido con datos en caché no es un error de pantalla completa.
    isError: query.isError && !query.data,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
  };
}

export function useSubmitLoveLanguageTest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ answers, quizVersion }: { answers: string[]; quizVersion: number }) =>
      submitLoveLanguageTest(answers, quizVersion),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: loveLanguageKeys.all });
    },
  });
}
