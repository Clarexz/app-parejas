import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Card, Note, Text } from '@/components';
import { tiltFor } from '@/lib/tilt';
import { useTheme } from '@/theme';

/** Pregunta del día, racha, cuenta regresiva y distancia: apartados que llegan en fases siguientes. */
export function HomePlaceholders() {
  const { spacing, colors } = useTheme();
  const router = useRouter();
  return (
    <View style={{ gap: spacing.xl }}>
      <Card
        variant="ruled"
        tilt={-1}
        onPress={() => router.navigate('/questions')}
        accessibilityLabel="La pregunta del día. Abre la pestaña de preguntas."
      >
        <Text variant="title">La pregunta del día</Text>
        <Text variant="body" tone="muted">
          Muy pronto: una pregunta al día para los dos. Contestan, se dobla y se desdobla.
        </Text>
      </Card>
      <Note id="racha" tape={false} style={{ marginLeft: spacing.lg }}>
        <Text variant="hand" style={{ color: colors.onPostit }}>
          Su racha empieza el día que contesten la primera pregunta.
        </Text>
      </Note>
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
