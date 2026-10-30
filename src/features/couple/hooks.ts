import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useSession } from '@/features/auth';
import { supabase } from '@/lib/supabase';

import {
  createCouple,
  EMPTY_COUPLE_STATE,
  fetchCoupleState,
  joinCouple,
  leaveCouple,
  updateCouple,
  uploadCouplePhoto,
} from './api';

/** Mientras falta la pareja, consulta cada 15 s por si Realtime no conecta. */
const WAITING_REFETCH_MS = 15_000;

export function useCouple() {
  const { user } = useSession();
  const userId = user?.id ?? null;
  const query = useQuery({
    queryKey: ['couple', userId],
    queryFn: () => fetchCoupleState(userId as string),
    enabled: !!userId,
    refetchInterval: (q) => (q.state.data?.members.length === 1 ? WAITING_REFETCH_MS : false),
  });
  const state = query.data ?? EMPTY_COUPLE_STATE;
  return {
    couple: state.couple,
    me: state.me,
    partner: state.partner,
    members: state.members,
    memberCount: query.data ? state.members.length : null,
    isLoading: !!userId && query.isLoading,
    // Un refresco fallido con datos en caché no es un error de pantalla completa.
    isError: query.isError && !query.data,
    refetch: query.refetch,
  };
}

export function usePartner() {
  return useCouple().partner;
}

function useInvalidateCoupleData() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ['couple'] }),
      qc.invalidateQueries({ queryKey: ['profile'] }),
    ]);
}

export function useCreateCouple() {
  const invalidate = useInvalidateCoupleData();
  return useMutation({
    mutationFn: (input: { anniversaryDate?: string | null; timezone: string }) =>
      createCouple(input),
    onSuccess: invalidate,
  });
}

export function useJoinCouple() {
  const invalidate = useInvalidateCoupleData();
  return useMutation({
    mutationFn: (code: string) => joinCouple(code),
    onSuccess: invalidate,
  });
}

export function useLeaveCouple() {
  const invalidate = useInvalidateCoupleData();
  return useMutation({ mutationFn: leaveCouple, onSuccess: invalidate });
}

export function useUpdateCouple() {
  const { couple } = useCouple();
  const invalidate = useInvalidateCoupleData();
  return useMutation({
    mutationFn: (patch: { anniversary_date?: string | null; timezone?: string }) => {
      if (!couple) throw new Error('not_authenticated');
      return updateCouple(couple.id, patch);
    },
    onSuccess: invalidate,
  });
}

/** Recibe la URI local de la foto; la comprime, la sube y borra la anterior. */
export function useUploadCouplePhoto() {
  const { couple } = useCouple();
  const invalidate = useInvalidateCoupleData();
  return useMutation({
    mutationFn: (localUri: string) => {
      if (!couple) throw new Error('not_authenticated');
      return uploadCouplePhoto(couple.id, localUri, couple.photo_path);
    },
    onSuccess: invalidate,
  });
}

/** Escucha cambios de la pareja en tiempo real (RLS filtra) e invalida la caché. */
export function useCoupleRealtime(coupleId: string | null) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!coupleId) return;
    const invalidate = () => {
      void qc.invalidateQueries({ queryKey: ['couple'] });
    };
    const channel = supabase
      .channel(`couple:${coupleId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'couple_members',
          filter: `couple_id=eq.${coupleId}`,
        },
        invalidate,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'couples', filter: `id=eq.${coupleId}` },
        invalidate,
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, invalidate)
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [coupleId, qc]);
}
