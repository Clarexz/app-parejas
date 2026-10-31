import quizJson from '../../../content/love-languages.json';

import type { LoveLanguageInfo, LoveLanguageQuiz } from '@/lib/loveLanguages';

/** El test completo (contenido estático, orden estable del JSON). */
export const LOVE_QUIZ = quizJson as LoveLanguageQuiz;

export function languageInfo(key: string): LoveLanguageInfo | undefined {
  return LOVE_QUIZ.languages.find((l) => l.key === key);
}
