import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { useCouple, useToday } from '@/features/couple';
import {
  buildCountdowns,
  featuredCountdown,
  nextVisit,
  pastEvents,
  type Countdown,
} from '@/lib/events';
import { personName } from '@/lib/eventsView';
import { randomUuid } from '@/lib/ids';
import { supabase } from '@/lib/supabase';

import { deleteEvent, fetchEvents, saveEvent, type EventRow, type SaveEventInput } from './api';

export const eventKeys = {
  all: ['events'] as const,
  list: (coupleId: string | null) => ['events', coupleId] as const,
};

const NO_EVENTS: EventRow[] = [];

/** Eventos de la pareja (fechas propias y visitas). */
export function useEvents() {
  const { couple } = useCouple();
  const coupleId = couple?.id ?? null;
  const query = useQuery({
    queryKey: eventKeys.list(coupleId),
    queryFn: () => fetchEvents(coupleId as string),
    enabled: !!coupleId,
  });
  return {
    events: query.data ?? NO_EVENTS,
    isLoading: !!coupleId && query.isLoading,
    // Un refresco fallido con datos en caché no es un error de pantalla completa.
    isError: query.isError && !query.data,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
  };
}

function invalidateEvents(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: eventKeys.all });
}

/** Crea o edita (con `id`) un evento. */
export function useSaveEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveEventInput) => saveEvent(input),
    onSuccess: (event) => {
      qc.setQueryData<EventRow[]>(eventKeys.list(event.couple_id), (prev) =>
        prev ? [...prev.filter((e) => e.id !== event.id), event] : prev,
      );
      invalidateEvents(qc);
    },
  });
}

/** Borra un evento: desaparece al instante de la lista. */
export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteEvent(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: eventKeys.all });
      const snapshot = qc.getQueriesData<EventRow[]>({ queryKey: eventKeys.all });
      for (const [key, data] of snapshot) {
        if (data) {
          qc.setQueryData<EventRow[]>(
            key,
            data.filter((e) => e.id !== id),
          );
        }
      }
      return { snapshot };
    },
    onError: (_e, _id, ctx) => {
      for (const [key, data] of ctx?.snapshot ?? []) qc.setQueryData(key, data);
    },
    onSettled: () => invalidateEvents(qc),
  });
}

/** Realtime de `events`: invalida la caché ante cualquier cambio de la pareja. */
export function useEventsRealtime(coupleId: string | null) {
  const qc = useQueryClient();
  // Inicio y la pantalla de cuentas pueden estar montadas a la vez: un canal por montaje.
  const [suffix] = useState(() => randomUuid().slice(0, 8));
  useEffect(() => {
    if (!coupleId) return;
    const invalidate = () => invalidateEvents(qc);
    const filter = `couple_id=eq.${coupleId}`;
    let channel = supabase.channel(`events:${coupleId}:${suffix}`);
    for (const event of ['INSERT', 'UPDATE', 'DELETE'] as const) {
      channel = channel.on(
        'postgres_changes',
        // Los DELETE solo traen la llave (no couple_id): no se pueden filtrar por pareja.
        event === 'DELETE'
          ? { event, schema: 'public', table: 'events' }
          : { event, schema: 'public', table: 'events', filter },
        invalidate,
      );
    }
    channel.subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [coupleId, qc, suffix]);
}

const NO_COUNTDOWNS: Countdown[] = [];

/**
 * Todo lo de cuentas regresivas junto: automáticas + propias (`countdowns`), la próxima visita,
 * la destacada (visita o la más próxima) y lo que ya pasó.
 */
export function useCountdowns() {
  const { couple, me, partner } = useCouple();
  const { today } = useToday();
  const { events, isLoading, isError, refetch, isRefetching } = useEvents();
  const anniversary = couple?.anniversary_date ?? null;

  const derived = useMemo(() => {
    if (!couple) {
      return {
        countdowns: NO_COUNTDOWNS,
        visit: null,
        featured: null,
        past: NO_EVENTS,
      };
    }
    const input = {
      anniversary,
      me: me ? { name: personName(me, 'Tú'), birthday: me.birthday } : null,
      partner: partner
        ? { name: personName(partner, 'tu pareja'), birthday: partner.birthday }
        : null,
      events,
      today,
    };
    return {
      countdowns: buildCountdowns(input),
      visit: nextVisit(events, today),
      featured: featuredCountdown(input),
      past: pastEvents(events, today),
    };
  }, [couple, anniversary, me, partner, events, today]);

  return { ...derived, events, today, isLoading, isError, refetch, isRefetching };
}
