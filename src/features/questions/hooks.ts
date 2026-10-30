import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { useSession } from '@/features/auth';
import { useCouple, useToday } from '@/features/couple';
import {
  applyReaction,
  justCompleted,
  validateAnswerInput,
  validateComment,
  type CategoryQuestion,
  type HistoryItem,
  type QuestionCard,
  type QuestionInfo,
} from '@/lib/questions';
import { supabase } from '@/lib/supabase';

import {
  addComment,
  deleteAnswer,
  deleteComment,
  fetchCategories,
  fetchCategoryQuestions,
  fetchComments,
  fetchDailyQuestion,
  fetchHistory,
  fetchQuestion,
  fetchStreak,
  HISTORY_PAGE_SIZE,
  reactToComment,
  sendNudge,
  setSpicyOptIn,
  submitAnswer,
  type Comment,
  type Nudge,
  type QuestionCategory,
} from './api';

export const questionKeys = {
  dailyAll: (coupleId: string | null) => ['daily-question', coupleId] as const,
  daily: (coupleId: string | null, day: string) => ['daily-question', coupleId, day] as const,
  questionAll: (coupleId: string | null) => ['question', coupleId] as const,
  question: (coupleId: string | null, questionId: string | null) =>
    ['question', coupleId, questionId] as const,
  streak: (coupleId: string | null) => ['streak', coupleId] as const,
  categories: () => ['categories'] as const,
  categoryQuestionsAll: (coupleId: string | null) => ['category-questions', coupleId] as const,
  categoryQuestions: (coupleId: string | null, slug: string | null) =>
    ['category-questions', coupleId, slug] as const,
  historyAll: (coupleId: string | null) => ['history', coupleId] as const,
  history: (coupleId: string | null, search: string, category: string | null) =>
    ['history', coupleId, search, category] as const,
  commentsAll: (coupleId: string | null) => ['comments', coupleId] as const,
  comments: (coupleId: string | null, questionId: string | null) =>
    ['comments', coupleId, questionId] as const,
};

const NO_COMMENTS: Comment[] = [];
const NO_ITEMS: HistoryItem[] = [];
const NO_CATEGORIES: QuestionCategory[] = [];
const NO_CATEGORY_QUESTIONS: CategoryQuestion[] = [];

/** Tras mi propio submit/delete se ignoran los avisos de Realtime de la pareja por este tiempo. */
const OWN_MUTATION_QUIET_MS = 3000;
let lastOwnMutationAt = 0;
function markOwnMutation() {
  lastOwnMutationAt = Date.now();
}

type QueryLike = {
  isLoading: boolean;
  isError: boolean;
  data: unknown;
  refetch: () => unknown;
  isRefetching: boolean;
};

/** Estado común: un refresco fallido con datos en caché no es un error de pantalla completa. */
function viewState(query: QueryLike, coupleId: string | null) {
  return {
    isLoading: !!coupleId && query.isLoading,
    isError: query.isError && !query.data,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
  };
}

/** Invalida todo lo que depende de las respuestas de la pareja. */
function invalidateCards(qc: QueryClient, coupleId: string | null) {
  for (const queryKey of [
    questionKeys.dailyAll(coupleId),
    questionKeys.questionAll(coupleId),
    questionKeys.streak(coupleId),
    questionKeys.historyAll(coupleId),
    questionKeys.categoryQuestionsAll(coupleId),
  ]) {
    void qc.invalidateQueries({ queryKey });
  }
}

/** Invalida los comentarios de una pregunta y los contadores de las tarjetas. */
function invalidateThread(qc: QueryClient, coupleId: string | null, questionId: string) {
  void qc.invalidateQueries({ queryKey: questionKeys.comments(coupleId, questionId) });
  void qc.invalidateQueries({ queryKey: questionKeys.dailyAll(coupleId) });
  void qc.invalidateQueries({ queryKey: questionKeys.question(coupleId, questionId) });
  void qc.invalidateQueries({ queryKey: questionKeys.historyAll(coupleId) });
}

/** Tarjeta en caché de una pregunta (en `question` o en cualquier `daily-question`). */
function findCachedCard(
  qc: QueryClient,
  coupleId: string | null,
  questionId: string,
): QuestionCard | undefined {
  const direct = qc.getQueryData<QuestionCard>(questionKeys.question(coupleId, questionId));
  if (direct) return direct;
  for (const [, data] of qc.getQueriesData<QuestionCard>({
    queryKey: questionKeys.dailyAll(coupleId),
  })) {
    if (data?.question.id === questionId) return data;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Pregunta del día (`day` o el "hoy" de la pareja). */
export function useDailyQuestion(day?: string) {
  const { couple } = useCouple();
  const { today } = useToday();
  const coupleId = couple?.id ?? null;
  const effectiveDay = day ?? today;
  const query = useQuery({
    queryKey: questionKeys.daily(coupleId, effectiveDay),
    queryFn: () => fetchDailyQuestion(effectiveDay),
    enabled: !!coupleId,
  });
  return { card: query.data ?? null, day: effectiveDay, ...viewState(query, coupleId) };
}

export function useQuestion(questionId: string | null | undefined) {
  const { couple } = useCouple();
  const coupleId = couple?.id ?? null;
  const query = useQuery({
    queryKey: questionKeys.question(coupleId, questionId ?? null),
    queryFn: () => fetchQuestion(questionId as string),
    enabled: !!coupleId && !!questionId,
  });
  return { card: query.data ?? null, ...viewState(query, coupleId) };
}

export function useStreak() {
  const { couple } = useCouple();
  const coupleId = couple?.id ?? null;
  const query = useQuery({
    queryKey: questionKeys.streak(coupleId),
    queryFn: fetchStreak,
    enabled: !!coupleId,
  });
  return { streak: query.data ?? null, ...viewState(query, coupleId) };
}

export function useCategories() {
  const { couple } = useCouple();
  const coupleId = couple?.id ?? null;
  const query = useQuery({
    queryKey: questionKeys.categories(),
    queryFn: fetchCategories,
    enabled: !!coupleId,
  });
  return { categories: query.data ?? NO_CATEGORIES, ...viewState(query, coupleId) };
}

export function useCategoryQuestions(slug: string | null | undefined) {
  const { couple } = useCouple();
  const coupleId = couple?.id ?? null;
  const query = useQuery({
    queryKey: questionKeys.categoryQuestions(coupleId, slug ?? null),
    queryFn: () => fetchCategoryQuestions(slug as string),
    enabled: !!coupleId && !!slug,
  });
  return { questions: query.data ?? NO_CATEGORY_QUESTIONS, ...viewState(query, coupleId) };
}

/** Historial paginado (30 por página); `search` y `category` vacíos = sin filtro. */
export function useHistory({
  search = '',
  category = null,
}: { search?: string; category?: string | null } = {}) {
  const { couple } = useCouple();
  const coupleId = couple?.id ?? null;
  const query = useInfiniteQuery({
    queryKey: questionKeys.history(coupleId, search, category),
    queryFn: ({ pageParam }) => fetchHistory({ search, category, before: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) =>
      lastPage.length < HISTORY_PAGE_SIZE
        ? undefined
        : (lastPage[lastPage.length - 1]?.last_activity ?? undefined),
    enabled: !!coupleId,
  });
  const items = query.data ? query.data.pages.flat() : NO_ITEMS;
  return {
    items,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    ...viewState(query, coupleId),
  };
}

export function useComments(questionId: string | null | undefined) {
  const { couple } = useCouple();
  const coupleId = couple?.id ?? null;
  const query = useQuery({
    queryKey: questionKeys.comments(coupleId, questionId ?? null),
    queryFn: () => fetchComments(coupleId as string, questionId as string),
    enabled: !!coupleId && !!questionId,
  });
  return { comments: query.data ?? NO_COMMENTS, ...viewState(query, coupleId) };
}

// ---------------------------------------------------------------------------
// Mutaciones
// ---------------------------------------------------------------------------

export type SubmitAnswerInput = {
  question: QuestionInfo;
  text?: string | null;
  choice?: number | null;
};
export type SubmitAnswerResult = { card: QuestionCard; justCompleted: boolean };

export function useSubmitAnswer() {
  const { couple } = useCouple();
  const qc = useQueryClient();
  const coupleId = couple?.id ?? null;
  return useMutation({
    mutationFn: async (input: SubmitAnswerInput): Promise<SubmitAnswerResult> => {
      const result = validateAnswerInput(input.question, input);
      if (!result.ok) throw new Error(result.error);
      markOwnMutation();
      const prev = findCachedCard(qc, coupleId, input.question.id);
      const card = await submitAnswer({ questionId: input.question.id, ...result.value });
      return { card, justCompleted: justCompleted(prev, card) };
    },
    onSuccess: ({ card }) => {
      markOwnMutation();
      qc.setQueryData(questionKeys.question(coupleId, card.question.id), card);
      if (card.day) qc.setQueryData(questionKeys.daily(coupleId, card.day), card);
      void qc.invalidateQueries({ queryKey: questionKeys.streak(coupleId) });
      void qc.invalidateQueries({ queryKey: questionKeys.historyAll(coupleId) });
      void qc.invalidateQueries({ queryKey: questionKeys.categoryQuestionsAll(coupleId) });
    },
  });
}

export function useDeleteAnswer() {
  const { couple } = useCouple();
  const qc = useQueryClient();
  const coupleId = couple?.id ?? null;
  return useMutation({
    mutationFn: (questionId: string) => {
      markOwnMutation();
      return deleteAnswer(questionId);
    },
    onSuccess: () => {
      markOwnMutation();
      invalidateCards(qc, coupleId);
      void qc.invalidateQueries({ queryKey: questionKeys.commentsAll(coupleId) });
    },
  });
}

export function useAddComment() {
  const { user } = useSession();
  const { couple } = useCouple();
  const qc = useQueryClient();
  const coupleId = couple?.id ?? null;
  return useMutation({
    mutationFn: (input: { questionId: string; body: string }) => {
      const result = validateComment(input.body);
      if (!result.ok) throw new Error(result.error);
      return addComment(input.questionId, result.value);
    },
    onMutate: async (input) => {
      const key = questionKeys.comments(coupleId, input.questionId);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Comment[]>(key);
      const result = validateComment(input.body);
      if (coupleId && user && result.ok) {
        const optimistic: Comment = {
          id: `optimistic-${Date.now()}`,
          couple_id: coupleId,
          question_id: input.questionId,
          user_id: user.id,
          body: result.value,
          reactions: {},
          created_at: new Date().toISOString(),
        };
        qc.setQueryData<Comment[]>(key, [...(previous ?? []), optimistic]);
      }
      return { previous, key };
    },
    onError: (_error, _input, context) => {
      if (context) qc.setQueryData(context.key, context.previous);
    },
    onSettled: (_data, _error, input) => invalidateThread(qc, coupleId, input.questionId),
  });
}

export function useDeleteComment() {
  const { couple } = useCouple();
  const qc = useQueryClient();
  const coupleId = couple?.id ?? null;
  return useMutation({
    mutationFn: (input: { commentId: string; questionId: string }) =>
      deleteComment(input.commentId),
    onSettled: (_data, _error, input) => invalidateThread(qc, coupleId, input.questionId),
  });
}

/** `emoji` null (o el mismo que ya puse) quita mi reacción. */
export function useReactToComment() {
  const { user } = useSession();
  const { couple } = useCouple();
  const qc = useQueryClient();
  const coupleId = couple?.id ?? null;
  return useMutation({
    mutationFn: (input: { commentId: string; questionId: string; emoji: string | null }) =>
      reactToComment(input.commentId, input.emoji),
    onMutate: async (input) => {
      const key = questionKeys.comments(coupleId, input.questionId);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Comment[]>(key);
      if (previous && user) {
        qc.setQueryData<Comment[]>(
          key,
          previous.map((c) =>
            c.id === input.commentId
              ? { ...c, reactions: applyReaction(c.reactions, user.id, input.emoji) }
              : c,
          ),
        );
      }
      return { previous, key };
    },
    onError: (_error, _input, context) => {
      if (context) qc.setQueryData(context.key, context.previous);
    },
    onSettled: (_data, _error, input) => {
      void qc.invalidateQueries({ queryKey: questionKeys.comments(coupleId, input.questionId) });
    },
  });
}

export function useSendNudge() {
  return useMutation({ mutationFn: () => sendNudge() });
}

/** El resultado es si las picantes quedaron activas para la pareja. */
export function useSetSpicyOptIn() {
  const { couple } = useCouple();
  const qc = useQueryClient();
  const coupleId = couple?.id ?? null;
  return useMutation({
    mutationFn: (enabled: boolean) => setSpicyOptIn(enabled),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['couple'] });
      void qc.invalidateQueries({ queryKey: questionKeys.categories() });
      invalidateCards(qc, coupleId);
    },
  });
}

// ---------------------------------------------------------------------------
// Realtime
// ---------------------------------------------------------------------------

export type QuestionsRealtimeHandlers = {
  /** Mi pareja contestó (o borró) una respuesta; no se llama por mis propias mutaciones. */
  onPartnerAnswered?: () => void;
  /** Mi pareja me mandó un toque. */
  onNudge?: (nudge: Nudge) => void;
};

/**
 * Escucha preguntas, respuestas, comentarios y toques de la pareja e invalida la caché.
 * El servidor toca `daily_questions.updated_at` al contestar: de ahí sale `onPartnerAnswered`.
 */
export function useQuestionsRealtime(
  coupleId: string | null,
  handlers?: QuestionsRealtimeHandlers,
) {
  const qc = useQueryClient();
  const { user } = useSession();
  const userId = user?.id ?? null;
  const handlersRef = useRef(handlers);
  const userIdRef = useRef(userId);
  useEffect(() => {
    handlersRef.current = handlers;
    userIdRef.current = userId;
  });
  useEffect(() => {
    if (!coupleId) return;
    const filter = `couple_id=eq.${coupleId}`;
    const invalidateAll = () => invalidateCards(qc, coupleId);
    const invalidateComments = () => {
      void qc.invalidateQueries({ queryKey: questionKeys.commentsAll(coupleId) });
    };
    const channel = supabase
      .channel(`questions:${coupleId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'daily_questions', filter },
        invalidateAll,
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'daily_questions', filter },
        () => {
          invalidateAll();
          if (Date.now() - lastOwnMutationAt > OWN_MUTATION_QUIET_MS) {
            handlersRef.current?.onPartnerAnswered?.();
          }
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'answers', filter },
        invalidateAll,
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'answers', filter },
        invalidateAll,
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'answer_comments', filter },
        invalidateComments,
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'answer_comments', filter },
        invalidateComments,
      )
      // Los DELETE no admiten filtro: RLS limita lo que llega.
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'answer_comments' },
        invalidateComments,
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'nudges', filter },
        (payload) => {
          const nudge = payload.new as Nudge;
          if (nudge.to_user === userIdRef.current) handlersRef.current?.onNudge?.(nudge);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [coupleId, qc]);
}
