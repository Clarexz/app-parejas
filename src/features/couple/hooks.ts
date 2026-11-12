import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';

import { useSession } from '@/features/auth';
import { FRUITS, resolveFruits, type Fruit } from '@/lib/fruits';
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

/**
 * Las frutas que se ven de verdad (mía y de mi pareja), con la misma regla que el servidor
 * (`resolveFruits` = `private.effective_fruit`). Sin perfil cargado: Sandía y sin pareja.
 */
export function useFruits(): { me: Fruit; partner: Fruit | null } {
  const { me, partner } = useCouple();
  const meId = me?.id ?? null;
  const meFruit = me?.fruit ?? null;
  const partnerId = partner?.id ?? null;
  const partnerFruit = partner?.fruit ?? null;
  return useMemo(() => {
    if (!meId) return { me: FRUITS.sandia, partner: null };
    const resolved = resolveFruits(
      { id: meId, fruit: meFruit },
      partnerId ? { id: partnerId, fruit: partnerFruit } : null,
    );
    return {
      me: FRUITS[resolved.me],
      partner: resolved.partner ? FRUITS[resolved.partner] : null,
    };
  }, [meId, meFruit, partnerId, partnerFruit]);
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
    mutationFn: (patch: { anniversary_date?: string | null }) => {
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
