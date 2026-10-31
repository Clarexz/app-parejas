import {
  parseCategoryQuestion,
  parseHistoryItem,
  parseQuestionCard,
  parseStreak,
  type CategoryQuestion,
  type HistoryItem,
  type QuestionCard,
  type Streak,
} from '@/lib/questions';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

export type QuestionCategory = Database['public']['Tables']['question_categories']['Row'];
export type Comment = Database['public']['Tables']['answer_comments']['Row'];
export type Nudge = Database['public']['Tables']['nudges']['Row'];

export const HISTORY_PAGE_SIZE = 30;

export async function fetchDailyQuestion(day?: string | null): Promise<QuestionCard> {
  const { data, error } = await supabase.rpc('get_daily_question', { p_day: day ?? undefined });
  if (error) throw error;
  return parseQuestionCard(data);
}

export async function fetchQuestion(questionId: string): Promise<QuestionCard> {
  const { data, error } = await supabase.rpc('get_question_with_answers', {
    p_question_id: questionId,
  });
  if (error) throw error;
  return parseQuestionCard(data);
}

export async function submitAnswer(input: {
  questionId: string;
  text: string | null;
  choice: number | null;
}): Promise<QuestionCard> {
  const { data, error } = await supabase.rpc('submit_answer', {
    p_question_id: input.questionId,
    p_text: input.text ?? undefined,
    p_choice: input.choice ?? undefined,
  });
  if (error) throw error;
  return parseQuestionCard(data);
}

export async function deleteAnswer(questionId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_answer', { p_question_id: questionId });
  if (error) throw error;
}

export async function fetchStreak(): Promise<Streak> {
  const { data, error } = await supabase.rpc('get_streak');
  if (error) throw error;
  return parseStreak(data);
}

export async function fetchCategories(): Promise<QuestionCategory[]> {
  const { data, error } = await supabase
    .from('question_categories')
    .select('*')
    .eq('kind', 'questions')
    .order('position', { ascending: true });
  if (error) throw error;
  return data;
}

export async function fetchCategoryQuestions(slug: string): Promise<CategoryQuestion[]> {
  const { data, error } = await supabase.rpc('get_category_questions', { p_category: slug });
  if (error) throw error;
  return data.map(parseCategoryQuestion);
}

export async function fetchHistory(input: {
  search?: string | null;
  category?: string | null;
  limit?: number;
  before?: string | null;
}): Promise<HistoryItem[]> {
  const { data, error } = await supabase.rpc('get_history', {
    p_search: input.search || undefined,
    p_category: input.category || undefined,
    p_limit: input.limit ?? HISTORY_PAGE_SIZE,
    p_before: input.before ?? undefined,
  });
  if (error) throw error;
  return data.map(parseHistoryItem);
}

export async function fetchComments(coupleId: string, questionId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('answer_comments')
    .select('*')
    .eq('couple_id', coupleId)
    .eq('question_id', questionId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function addComment(questionId: string, body: string): Promise<Comment> {
  const { data, error } = await supabase.rpc('add_comment', {
    p_question_id: questionId,
    p_body: body,
  });
  if (error) throw error;
  return data;
}

export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_comment', { p_comment_id: commentId });
  if (error) throw error;
}

/** Pone, cambia o quita (mismo emoji o null) mi reacción. */
export async function reactToComment(commentId: string, emoji: string | null): Promise<Comment> {
  const { data, error } = await supabase.rpc('react_to_comment', {
    p_comment_id: commentId,
    p_emoji: emoji ?? undefined,
  });
  if (error) throw error;
  return data;
}

export async function sendNudge(): Promise<Nudge> {
  const { data, error } = await supabase.rpc('send_nudge', { p_kind: 'answer' });
  if (error) throw error;
  return data;
}

/** Devuelve si las picantes quedaron activas para la pareja. */
export async function setSpicyOptIn(enabled: boolean): Promise<boolean> {
  const { data, error } = await supabase.rpc('set_spicy_opt_in', { p_enabled: enabled });
  if (error) throw error;
  return data;
}
