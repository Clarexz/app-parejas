import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { useCouple } from '@/features/couple';
import type { Stroke } from '@/lib/drawing';
import type { Drawing, GameId, GameOverview, GameRound } from '@/lib/games';
import { randomUuid } from '@/lib/ids';
import { supabase } from '@/lib/supabase';

import {
  answerGameItem,
  deleteDrawing,
  deleteGameRound,
  fetchDrawing,
  fetchGameOverview,
  fetchGameRound,
  giveUpDrawing,
  guessDrawing,
  rerollDrawingWord,
  startDrawing,
  startGameRound,
  submitDrawing,
} from './api';

export const gameKeys = {
  all: (coupleId: string | null) => ['games', coupleId] as const,
  overview: (coupleId: string | null) => ['games', coupleId, 'overview'] as const,
  round: (coupleId: string | null, id: string | null) => ['games', coupleId, 'round', id] as const,
  drawing: (coupleId: string | null, id: string | null) =>
    ['games', coupleId, 'drawing', id] as const,
};

type QueryLike = {
  isLoading: boolean;
  isError: boolean;
  data: unknown;
  error: unknown;
  refetch: () => unknown;
  isRefetching: boolean;
};

/** Estado común: un refresco fallido con datos en caché no es un error de pantalla completa. */
function viewState(query: QueryLike, enabled: boolean) {
  return {
    isLoading: enabled && query.isLoading,
    isError: query.isError && !query.data,
    error: query.error,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
  };
}

function invalidateOverview(qc: QueryClient, coupleId: string | null) {
  void qc.invalidateQueries({ queryKey: gameKeys.overview(coupleId) });
}

// ---------------------------------------------------------------------------
// Realtime
// ---------------------------------------------------------------------------

/**
 * Escucha `game_rounds` y `drawing_challenges` de la pareja e invalida el resumen y los detalles.
 * Los query hooks de abajo ya lo montan; es independiente por si una pantalla lo necesita sola.
 */
export function useGamesRealtime(coupleId: string | null) {
  const qc = useQueryClient();
  // Hub y detalle pueden estar montados a la vez: un canal por montaje.
  const [suffix] = useState(() => randomUuid().slice(0, 8));
  useEffect(() => {
    if (!coupleId) return;
    const invalidate = () => {
      void qc.invalidateQueries({ queryKey: gameKeys.all(coupleId) });
    };
    const filter = `couple_id=eq.${coupleId}`;
    let channel = supabase.channel(`games:${coupleId}:${suffix}`);
    for (const table of ['game_rounds', 'drawing_challenges'] as const) {
      for (const event of ['INSERT', 'UPDATE', 'DELETE'] as const) {
        channel = channel.on(
          'postgres_changes',
          // Los DELETE solo traen la llave (no couple_id): no se pueden filtrar por pareja.
          event === 'DELETE'
            ? { event, schema: 'public', table }
            : { event, schema: 'public', table, filter },
          invalidate,
        );
      }
    }
    channel.subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [coupleId, qc, suffix]);
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useGameOverview() {
  const { couple } = useCouple();
  const coupleId = couple?.id ?? null;
  useGamesRealtime(coupleId);
  const query = useQuery({
    queryKey: gameKeys.overview(coupleId),
    queryFn: fetchGameOverview,
    enabled: !!coupleId,
  });
  return { overview: query.data ?? null, ...viewState(query, !!coupleId) };
}

export function useGameRound(id: string | null | undefined) {
  const { couple } = useCouple();
  const coupleId = couple?.id ?? null;
  useGamesRealtime(coupleId);
  const enabled = !!coupleId && !!id;
  const query = useQuery({
    queryKey: gameKeys.round(coupleId, id ?? null),
    queryFn: () => fetchGameRound(id as string),
    enabled,
  });
  return { round: query.data ?? null, ...viewState(query, enabled) };
}

export function useDrawing(id: string | null | undefined) {
  const { couple } = useCouple();
  const coupleId = couple?.id ?? null;
  useGamesRealtime(coupleId);
  const enabled = !!coupleId && !!id;
  const query = useQuery({
    queryKey: gameKeys.drawing(coupleId, id ?? null),
    queryFn: () => fetchDrawing(id as string),
    enabled,
  });
  return { drawing: query.data ?? null, ...viewState(query, enabled) };
}

// ---------------------------------------------------------------------------
// Mutaciones: rondas
// ---------------------------------------------------------------------------

/** `mutateAsync({ game, spicy })` → la ronda (la abierta si ya existía). */
export function useStartGameRound() {
  const { couple } = useCouple();
  const qc = useQueryClient();
  const coupleId = couple?.id ?? null;
  return useMutation({
    mutationFn: (input: { game: GameId; spicy: boolean }): Promise<GameRound> =>
      startGameRound(input.game, input.spicy),
    onSuccess: (round) => {
      qc.setQueryData(gameKeys.round(coupleId, round.id), round);
      invalidateOverview(qc, coupleId);
    },
  });
}

/** Contesta un ítem; `mine` y `my_count` se actualizan al instante. */
export function useAnswerGameItem(roundId: string | null | undefined) {
  const { couple } = useCouple();
  const qc = useQueryClient();
  const coupleId = couple?.id ?? null;
  const key = gameKeys.round(coupleId, roundId ?? null);
  return useMutation({
    mutationFn: (input: { questionId: string; choice: number }): Promise<GameRound> =>
      answerGameItem({ roundId: roundId as string, ...input }),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<GameRound>(key);
      if (previous && previous.mine[input.questionId] === undefined) {
        qc.setQueryData<GameRound>(key, {
          ...previous,
          mine: { ...previous.mine, [input.questionId]: input.choice },
          my_count: previous.my_count + 1,
        });
      }
      return { previous };
    },
    onError: (_error, _input, ctx) => {
      if (ctx?.previous) qc.setQueryData(key, ctx.previous);
    },
    onSuccess: (round) => {
      qc.setQueryData(key, round);
    },
    onSettled: () => invalidateOverview(qc, coupleId),
  });
}

/** Borra o abandona una ronda; desaparece al instante del resumen. */
export function useDeleteGameRound() {
  const { couple } = useCouple();
  const qc = useQueryClient();
  const coupleId = couple?.id ?? null;
  return useMutation({
    mutationFn: (roundId: string) => deleteGameRound(roundId),
    onMutate: async (roundId) => {
      const key = gameKeys.overview(coupleId);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<GameOverview>(key);
      if (previous) {
        qc.setQueryData<GameOverview>(key, {
          ...previous,
          games: previous.games.map((g) =>
            g.open_round?.id === roundId ? { ...g, open_round: null } : g,
          ),
          recent: previous.recent.filter((r) => r.id !== roundId),
        });
      }
      return { previous, key };
    },
    onError: (_error, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(ctx.key, ctx.previous);
    },
    onSuccess: (_data, roundId) => {
      qc.removeQueries({ queryKey: gameKeys.round(coupleId, roundId) });
    },
    onSettled: () => invalidateOverview(qc, coupleId),
  });
}

// ---------------------------------------------------------------------------
// Mutaciones: reto de dibujo
// ---------------------------------------------------------------------------

export function useStartDrawing() {
  const { couple } = useCouple();
  const qc = useQueryClient();
  const coupleId = couple?.id ?? null;
  return useMutation({
    mutationFn: (): Promise<Drawing> => startDrawing(),
    onSuccess: (drawing) => {
      qc.setQueryData(gameKeys.drawing(coupleId, drawing.id), drawing);
      invalidateOverview(qc, coupleId);
    },
  });
}

/** Mutación sobre un reto que devuelve el reto actualizado. */
function useDrawingMutation<TInput>(
  id: string | null | undefined,
  fn: (id: string, input: TInput) => Promise<Drawing>,
) {
  const { couple } = useCouple();
  const qc = useQueryClient();
  const coupleId = couple?.id ?? null;
  return useMutation({
    mutationFn: (input: TInput) => fn(id as string, input),
    onSuccess: (drawing) => {
      qc.setQueryData(gameKeys.drawing(coupleId, drawing.id), drawing);
    },
    onSettled: () => {
      invalidateOverview(qc, coupleId);
      void qc.invalidateQueries({ queryKey: gameKeys.drawing(coupleId, id ?? null) });
    },
  });
}

/** Cambia la palabra (máx. 3 veces); `mutateAsync()` → reto con la palabra nueva. */
export function useRerollDrawingWord(id: string | null | undefined) {
  return useDrawingMutation<void>(id, (drawingId) => rerollDrawingWord(drawingId));
}

/** Envía el dibujo: `mutateAsync({ strokes })`. */
export function useSubmitDrawing(id: string | null | undefined) {
  return useDrawingMutation<{ strokes: Stroke[] }>(id, (drawingId, input) =>
    submitDrawing(drawingId, input.strokes),
  );
}

export function useGiveUpDrawing(id: string | null | undefined) {
  return useDrawingMutation<void>(id, (drawingId) => giveUpDrawing(drawingId));
}

/** Un intento: `mutateAsync(guess)` → `{ correct, drawing }`. */
export function useGuessDrawing(id: string | null | undefined) {
  const { couple } = useCouple();
  const qc = useQueryClient();
  const coupleId = couple?.id ?? null;
  return useMutation({
    mutationFn: (guess: string) => guessDrawing(id as string, guess),
    onSuccess: ({ drawing }) => {
      qc.setQueryData(gameKeys.drawing(coupleId, drawing.id), drawing);
    },
    onSettled: () => {
      invalidateOverview(qc, coupleId);
      void qc.invalidateQueries({ queryKey: gameKeys.drawing(coupleId, id ?? null) });
    },
  });
}

export function useDeleteDrawing() {
  const { couple } = useCouple();
  const qc = useQueryClient();
  const coupleId = couple?.id ?? null;
  return useMutation({
    mutationFn: (id: string) => deleteDrawing(id),
    onMutate: async (id) => {
      const key = gameKeys.overview(coupleId);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<GameOverview>(key);
      if (previous) {
        qc.setQueryData<GameOverview>(key, {
          ...previous,
          drawings: {
            active: previous.drawings.active.filter((d) => d.id !== id),
            recent: previous.drawings.recent.filter((d) => d.id !== id),
          },
        });
      }
      return { previous, key };
    },
    onError: (_error, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(ctx.key, ctx.previous);
    },
    onSuccess: (_data, id) => {
      qc.removeQueries({ queryKey: gameKeys.drawing(coupleId, id) });
    },
    onSettled: () => invalidateOverview(qc, coupleId),
  });
}
