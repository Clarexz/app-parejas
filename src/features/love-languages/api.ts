import {
  parseLoveLanguageResult,
  parseLoveLanguagesOverview,
  type LoveLanguageResult,
  type LoveLanguagesOverview,
} from '@/lib/loveLanguages';
import { supabase } from '@/lib/supabase';

export async function fetchLoveLanguages(): Promise<LoveLanguagesOverview> {
  const { data, error } = await supabase.rpc('get_love_languages');
  if (error) throw error;
  return parseLoveLanguagesOverview(data);
}

/** Guarda (o reemplaza) mis respuestas: un lenguaje por pregunta, en el orden del test. */
export async function submitLoveLanguageTest(
  answers: string[],
  quizVersion: number,
): Promise<LoveLanguageResult> {
  const { data, error } = await supabase.rpc('submit_love_language_test', {
    p_answers: answers,
    p_quiz_version: quizVersion,
  });
  if (error) throw error;
  const result = parseLoveLanguageResult(data);
  if (!result) throw new Error('invalid_love_language');
  return result;
}
