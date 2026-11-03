import { View } from 'react-native';

import { FruitDot, Text } from '@/components';
import type { Fruit } from '@/lib/fruits';
import {
  MAX_LANGUAGE_SCORE,
  primaryLabel,
  primaryLanguages,
  rankLanguages,
  type LoveLanguageScores,
} from '@/lib/loveLanguages';
import { useTheme } from '@/theme';

import { LOVE_QUIZ, languageInfo } from '../quiz';

/** Barra horizontal de una puntuación, en la fruta de quien la sacó. */
function ScoreBar({ value, color, label }: { value: number; color: string; label: string }) {
  const { colors } = useTheme();
  const ratio = Math.min(1, Math.max(0, value / MAX_LANGUAGE_SCORE));
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      style={{ height: 12, borderRadius: 6, backgroundColor: colors.surface2, overflow: 'hidden' }}
    >
      <View
        style={{
          height: 12,
          borderRadius: 6,
          width: `${Math.round(ratio * 100)}%`,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

/**
 * Resultado de una persona: el lenguaje principal en grande y sus cinco lenguajes en orden, cada
 * uno con una barra en la fruta de esa persona (tu fruta para ti, la de tu pareja para la suya).
 */
export function LanguageResult({
  heading,
  scores,
  fruit,
}: {
  heading: string;
  scores: LoveLanguageScores;
  fruit: Fruit;
}) {
  const { spacing } = useTheme();
  const primary = primaryLabel(primaryLanguages(scores), LOVE_QUIZ.languages);
  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ gap: spacing.xs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <FruitDot fruit={fruit} />
          <Text variant="label" tone="muted">
            {heading}
          </Text>
        </View>
        {primary ? (
          <Text variant="h2" accessibilityLabel={`Lenguaje principal: ${primary}`}>
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
                <Text variant="ui" style={{ fontVariant: ['tabular-nums'] }}>
                  {r.score}
                </Text>
              </View>
              <ScoreBar
                value={r.score}
                color={fruit.hex}
                label={`${name}: ${r.score} de ${MAX_LANGUAGE_SCORE}`}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}
