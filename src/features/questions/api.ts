import * as FileSystem from 'expo-file-system';

import { AUDIO_BUCKET, audioAnswerPath, normalizeAudioMs, type AudioDraft } from '@/lib/audio';
import {
  parseCustomQuestion,
  type CustomQuestion,
  type CustomQuestionInput,
} from '@/lib/customQuestions';
import { parseFeedbackVote, type FeedbackVote } from '@/lib/feedback';
import { randomUuid } from '@/lib/ids';
import { parsePack, type Pack } from '@/lib/packs';
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

async function currentIds(): Promise<{ userId: string; coupleId: string }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) throw new Error('not_authenticated');
  const { data: coupleId, error } = await supabase.rpc('my_couple_id');
  if (error) throw error;
  if (!coupleId) throw new Error('no_couple');
  return { userId, coupleId };
}

/**
 * Sube una grabación (m4a) a `answer-audio` en `<pareja>/<yo>/<pregunta>/<uuid>.m4a`. Si luego
 * `submit_answer` falla, el archivo queda huérfano y la limpieza horaria lo borra.
 */
export async function uploadAnswerAudio(questionId: string, uri: string): Promise<string> {
  const { userId, coupleId } = await currentIds();
  const path = audioAnswerPath(coupleId, userId, questionId, randomUuid());
  const body = await new FileSystem.File(uri).arrayBuffer();
  const { error } = await supabase.storage
    .from(AUDIO_BUCKET)
    .upload(path, body, { contentType: 'audio/mp4', upsert: false });
  if (error) throw error;
  return path;
}

export async function submitAnswer(input: {
  questionId: string;
  text: string | null;
  choice: number | null;
  /** Solo preguntas abiertas: audio guardado (se conserva) o grabación nueva (se sube antes). */
  audio?: AudioDraft | null;
}): Promise<QuestionCard> {
  let audioPath: string | undefined;
  let audioMs: number | undefined;
  if (input.audio) {
    const ms = normalizeAudioMs(input.audio.ms);
    if (ms === null) throw new Error('audio_too_short');
    audioPath =
      input.audio.kind === 'existing'
        ? input.audio.path
        : await uploadAnswerAudio(input.questionId, input.audio.uri);
    audioMs = ms;
  }
  const { data, error } = await supabase.rpc('submit_answer', {
    p_question_id: input.questionId,
    p_text: input.text ?? undefined,
    p_choice: input.choice ?? undefined,
    p_audio_path: audioPath,
    p_audio_ms: audioMs,
  });
  if (error) throw error;
  return parseQuestionCard(data);
}

const SIGNED_URL_SECONDS = 3600;
// Se reutiliza la URL firmada hasta 10 minutos antes de que caduque.
const SIGNED_URL_REUSE_MS = (SIGNED_URL_SECONDS - 600) * 1000;
const audioUrlCache = new Map<string, { url: string; expiresAt: number }>();

/** URL firmada (1 h) de un audio del bucket `answer-audio`. */
export async function answerAudioUrl(path: string): Promise<string> {
  const cached = audioUrlCache.get(path);
  if (cached && cached.expiresAt > Date.now()) return cached.url;
  const { data, error } = await supabase.storage
    .from(AUDIO_BUCKET)
    .createSignedUrl(path, SIGNED_URL_SECONDS);
  if (error) throw error;
  if (!data?.signedUrl) throw new Error('audio_unavailable');
  audioUrlCache.set(path, { url: data.signedUrl, expiresAt: Date.now() + SIGNED_URL_REUSE_MS });
  return data.signedUrl;
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

/** Temas (packs) con mi avance y la siguiente pregunta sin contestar. */
export async function fetchPacks(): Promise<Pack[]> {
  const { data, error } = await supabase.rpc('get_packs');
  if (error) throw error;
  return data.map(parsePack);
}

/** Mi voto de una pregunta (RLS solo deja ver el mío). */
export async function fetchMyFeedback(questionId: string): Promise<FeedbackVote> {
  const { data, error } = await supabase
    .from('question_feedback')
    .select('vote')
    .eq('question_id', questionId)
    .maybeSingle();
  if (error) throw error;
  return parseFeedbackVote(data?.vote);
}

/** Pone, cambia o quita (null) mi voto. */
export async function setQuestionFeedback(
  questionId: string,
  vote: FeedbackVote,
): Promise<FeedbackVote> {
  const { data, error } = await supabase.rpc('set_question_feedback', {
    p_question_id: questionId,
    // La RPC borra el voto con null; el tipo generado no lo admite porque el argumento no tiene default.
    p_vote: vote as number,
  });
  if (error) throw error;
  return parseFeedbackVote(data);
}

export async function fetchCustomQuestions(): Promise<CustomQuestion[]> {
  const { data, error } = await supabase.rpc('get_custom_questions');
  if (error) throw error;
  return data.map(parseCustomQuestion);
}

/** Devuelve el id de la pregunta creada. */
export async function addCustomQuestion(input: CustomQuestionInput): Promise<string> {
  const { data, error } = await supabase.rpc('add_custom_question', {
    p_category: input.category,
    p_type: input.type,
    p_text: input.text,
    p_options: input.options ?? undefined,
    p_intensity: input.intensity,
  });
  if (error) throw error;
  return data;
}

export async function retireCustomQuestion(questionId: string): Promise<void> {
  const { error } = await supabase.rpc('retire_custom_question', { p_question_id: questionId });
  if (error) throw error;
}
