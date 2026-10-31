import type { ReactNode } from 'react';
import { View } from 'react-native';

import { DistanceCard } from '@/features/distance';
import { CountdownHomeCard } from '@/features/events';
import { DailyQuestionCard, StreakNote } from '@/features/questions';
import { useTheme } from '@/theme';

/** Pregunta del día y racha (Fase 3); cuenta regresiva y distancia (Fase 8). */
export function HomePlaceholders({ afterQuestion }: { afterQuestion?: ReactNode }) {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing.xl }}>
      <DailyQuestionCard />
      {afterQuestion}
      <StreakNote />
      <CountdownHomeCard />
      <DistanceCard />
    </View>
  );
}
