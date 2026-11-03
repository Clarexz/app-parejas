import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Button, Card, LoadingSymbol, Text } from '@/components';
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
    body = (
      <Card>
        <View style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
          <LoadingSymbol size={40} accessibilityLabel="Cargando la cuenta regresiva" />
        </View>
      </Card>
    );
  } else if (featured) {
    body = (
      <NextVisitCard
        countdown={featured}
        heading={visit ? undefined : 'Lo próximo'}
        onPress={open}
      />
    );
  } else {
    body = (
      <Card onPress={open}>
        <Text variant="h3">¿Cuándo se vuelven a ver?</Text>
        <Text variant="body" tone="muted">
          Apunten la próxima visita y cuenten los días.
        </Text>
        <View style={{ alignItems: 'flex-start', marginTop: spacing.xs }}>
          <Button
            title="Apuntar la visita"
            variant="secondary"
            size="sm"
            onPress={() => router.push({ pathname: '/events/edit', params: { kind: 'visit' } })}
          />
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
