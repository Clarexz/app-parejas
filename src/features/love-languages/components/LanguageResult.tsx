import { View } from 'react-native';

import { GridScore, Text } from '@/components';
import {
  MAX_LANGUAGE_SCORE,
  primaryLabel,
  primaryLanguages,
  rankLanguages,
  type LoveLanguageScores,
} from '@/lib/loveLanguages';
import { useTheme } from '@/theme';

import { LOVE_QUIZ, languageInfo } from '../quiz';

/**
 * Resultado de una persona: el lenguaje principal a mano y sus cinco lenguajes en orden, cada uno
 * con sus puntos pintados en la cuadrícula del cuaderno.
 */
export function LanguageResult({
  heading,
  scores,
  tone,
}: {
  heading: string;
  scores: LoveLanguageScores;
  tone: 'jamaica' | 'nopal';
}) {
  const { spacing } = useTheme();
  const primary = primaryLabel(primaryLanguages(scores), LOVE_QUIZ.languages);
  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ gap: spacing.xs }}>
        <Text variant="small" muted>
          {heading}
        </Text>
        {primary ? (
          <Text variant="title" accessibilityLabel={`Lenguaje principal: ${primary}`}>
            {primary}
          </Text>
        ) : null}
      </View>
      <View style={{ gap: spacing.md }}>
        {rankLanguages(scores).map((r) => {
          const name = languageInfo(r.key)?.name ?? r.key;
          return (
            <View key={r.key} style={{ gap: spacing.xs }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text variant="body">{name}</Text>
                <Text variant="small" muted style={{ fontVariant: ['tabular-nums'] }}>
                  {r.score}
                </Text>
              </View>
              <GridScore
                value={r.score}
                total={MAX_LANGUAGE_SCORE}
                tone={tone}
                accessibilityLabel={`${name}: ${r.score} de ${MAX_LANGUAGE_SCORE}`}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}
