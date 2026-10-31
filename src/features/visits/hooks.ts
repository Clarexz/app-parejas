import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { useCouple, useToday } from '@/features/couple';
import { randomUuid } from '@/lib/ids';
import { supabase } from '@/lib/supabase';
import { visitStats, type VisitStats } from '@/lib/visits';

import { deleteVisit, fetchVisits, saveVisit, type SaveVisitInput, type VisitRow } from './api';

export const visitKeys = {
  all: ['visits'] as const,
  list: (coupleId: string | null) => ['visits', coupleId] as const,
};

const NO_VISITS: VisitRow[] = [];

/** Visitas de la pareja (la más reciente primero). */
export function useVisits() {
  const { couple } = useCouple();
  const coupleId = couple?.id ?? null;
  const query = useQuery({
    queryKey: visitKeys.list(coupleId),
    queryFn: () => fetchVisits(coupleId as string),
    enabled: !!coupleId,
  });
  return {
    visits: query.data ?? NO_VISITS,
    isLoading: !!coupleId && query.isLoading,
    // Un refresco fallido con datos en caché no es un error de pantalla completa.
    isError: query.isError && !query.data,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
  };
}

function invalidateVisits(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: visitKeys.all });
  // Una visita ligada cambia qué cuentas regresivas siguen pendientes.
  void qc.invalidateQueries({ queryKey: ['events'] });
}

const byStartDesc = (a: VisitRow, b: VisitRow) =>
  a.start_date < b.start_date ? 1 : a.start_date > b.start_date ? -1 : 0;

/** Crea o edita (con `id`) una visita. */
export function useSaveVisit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveVisitInput) => saveVisit(input),
    onSuccess: (visit) => {
      qc.setQueryData<VisitRow[]>(visitKeys.list(visit.couple_id), (prev) =>
        prev ? [...prev.filter((v) => v.id !== visit.id), visit].sort(byStartDesc) : prev,
      );
      invalidateVisits(qc);
    },
  });
}

/** Borra una visita: desaparece al instante de la lista. */
export function useDeleteVisit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteVisit(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: visitKeys.all });
      const snapshot = qc.getQueriesData<VisitRow[]>({ queryKey: visitKeys.all });
      for (const [key, data] of snapshot) {
        if (data) {
          qc.setQueryData<VisitRow[]>(
            key,
            data.filter((v) => v.id !== id),
          );
        }
      }
      return { snapshot };
    },
    onError: (_e, _id, ctx) => {
      for (const [key, data] of ctx?.snapshot ?? []) qc.setQueryData(key, data);
    },
    onSettled: () => invalidateVisits(qc),
  });
}

/** Realtime de `visits`: invalida la caché ante cualquier cambio de la pareja. */
export function useVisitsRealtime(coupleId: string | null) {
  const qc = useQueryClient();
  // Pantalla de visitas y otros montajes pueden coexistir: un canal por montaje.
  const [suffix] = useState(() => randomUuid().slice(0, 8));
  useEffect(() => {
    if (!coupleId) return;
    const invalidate = () => invalidateVisits(qc);
    const filter = `couple_id=eq.${coupleId}`;
    let channel = supabase.channel(`visits:${coupleId}:${suffix}`);
    for (const event of ['INSERT', 'UPDATE', 'DELETE'] as const) {
      channel = channel.on(
        'postgres_changes',
        // Los DELETE solo traen la llave (no couple_id): no se pueden filtrar por pareja.
        event === 'DELETE'
          ? { event, schema: 'public', table: 'visits' }
          : { event, schema: 'public', table: 'visits', filter },
        invalidate,
      );
    }
    channel.subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [coupleId, qc, suffix]);
}

/** Estadísticas de visitas contra "hoy" y el aniversario de la pareja. */
export function useVisitStats(): VisitStats<VisitRow> & { today: string } {
  const { couple } = useCouple();
  const { today } = useToday();
  const { visits } = useVisits();
  const anniversary = couple?.anniversary_date ?? null;
  return useMemo(
    () => ({ ...visitStats(visits, { start: anniversary, today }), today }),
    [visits, anniversary, today],
  );
}
