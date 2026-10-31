import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Button, Card, LoadingLines, Text } from '@/components';
import { tiltFor } from '@/lib/tilt';
import { useTheme } from '@/theme';

import { useCountdowns } from '../hooks';
import { EventsEvents } from './EventsEvents';
import { NextVisitCard } from './NextVisitCard';

/**
 * Tarjeta de Inicio: la próxima visita (o la cuenta regresiva más próxima) con acceso a
 * `/events`; sin nada, invita a apuntar la próxima visita.
 */
export function CountdownHomeCard() {
  const { spacing } = useTheme();
  const router = useRouter();
  const { featured, visit, isLoading } = useCountdowns();
  const open = () => router.push('/events');

  let body;
  if (isLoading) {
    body = <LoadingLines count={2} accessibilityLabel="Cargando la cuenta regresiva" />;
  } else if (featured) {
    body = (
      <NextVisitCard
        countdown={featured}
        heading={visit ? 'La próxima vez que nos vemos' : 'Lo próximo'}
        onPress={open}
      />
    );
  } else {
    body = (
      <Card tilt={tiltFor('cuenta-regresiva', 1) || 1} onPress={open}>
        <View style={{ gap: spacing.sm }}>
          <Text variant="hand">¿Cuándo se vuelven a ver?</Text>
          <Text variant="body" tone="muted">
            Apunten la próxima visita y cuenten los días juntos.
          </Text>
          <View style={{ alignItems: 'flex-start' }}>
            <Button
              title="Apuntar la visita"
              variant="secondary"
              onPress={() => router.push({ pathname: '/events/edit', params: { kind: 'visit' } })}
            />
          </View>
        </View>
      </Card>
    );
  }
  return (
    <View>
      <EventsEvents />
      {body}
    </View>
  );
}
