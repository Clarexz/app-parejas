import { View } from 'react-native';

import { Card, Text } from '@/components';
import { DailyQuestionCard, StreakNote } from '@/features/questions';
import { tiltFor } from '@/lib/tilt';
import { useTheme } from '@/theme';

/** Pregunta del día y racha (Fase 3); cuenta regresiva y distancia llegan en fases siguientes. */
export function HomePlaceholders() {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing.xl }}>
      <DailyQuestionCard />
      <StreakNote />
      <Card tilt={tiltFor('cuenta-regresiva', 1) || 1}>
        <Text variant="hand">Cuenta regresiva</Text>
        <Text variant="body" tone="muted">
          Pronto podrán contar los días para la próxima vez que se vean.
        </Text>
      </Card>
      <Card tilt={tiltFor('distancia', 1) || -1}>
        <Text variant="hand">Distancia</Text>
        <Text variant="body" tone="muted">
          Pronto verán a cuántos kilómetros están.
        </Text>
      </Card>
    </View>
  );
}
