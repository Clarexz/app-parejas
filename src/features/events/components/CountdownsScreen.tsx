import { useRouter } from 'expo-router';
import { View } from 'react-native';

import {
  Button,
  Divider,
  EmptyState,
  IconButton,
  LoadingSymbol,
  Notice,
  Screen,
  ScreenHeader,
  Text,
} from '@/components';
import { daysBetween } from '@/lib/dates';
import type { Countdown } from '@/lib/events';
import { pastLabel } from '@/lib/eventsView';
import { pendingVisitEvents } from '@/lib/visits';
import { useVisits } from '@/features/visits/hooks';
import { useTheme } from '@/theme';

import type { EventRow } from '../api';
import { useCountdowns } from '../hooks';
import { CountdownRow } from './CountdownRow';
import { EventsEvents } from './EventsEvents';
import { NextVisitCard } from './NextVisitCard';

function asCountdown(e: EventRow): Countdown {
  return {
    key: `event:${e.id}`,
    kind: e.kind,
    title: e.title,
    emoji: e.emoji,
    date: e.date.slice(0, 10),
    daysUntil: 0,
    eventId: e.id,
    recurring: false,
  };
}

/** Pantalla `/events`: la próxima visita, lo que viene (automáticas + propias) y lo que ya pasó. */
export function CountdownsScreen() {
  const { spacing } = useTheme();
  const router = useRouter();
  const { countdowns, visit, past, today, isLoading, isError, refetch, isRefetching } =
    useCountdowns();
  const { visits } = useVisits();
  const unlogged = pendingVisitEvents(past, visits, today).length;

  const edit = (id: string) => router.push({ pathname: '/events/edit', params: { id } });
  const create = () => router.push('/events/edit');
  const createVisit = () => router.push({ pathname: '/events/edit', params: { kind: 'visit' } });

  let body;
  if (isLoading) {
    body = (
      <View style={{ alignItems: 'center', paddingVertical: spacing.xxl }}>
        <LoadingSymbol accessibilityLabel="Cargando las cuentas regresivas" />
      </View>
    );
  } else if (isError) {
    body = (
      <Notice tone="danger" action={{ label: 'Reintentar', onPress: () => void refetch() }}>
        No pudimos abrir las cuentas regresivas. Revisa tu señal e intenta otra vez.
      </Notice>
    );
  } else {
    body = (
      <View style={{ gap: spacing.xl }}>
        {visit ? (
          <NextVisitCard countdown={visit} onPress={() => visit.eventId && edit(visit.eventId)} />
        ) : (
          <EmptyState
            art="circles"
            title="¿Cuándo se vuelven a ver?"
            body="Apunten la próxima visita y cuenten los días. La espera se siente más corta con fecha."
            action={{ label: 'Apuntar la próxima visita', onPress: createVisit }}
          />
        )}

        <View style={{ gap: spacing.sm }}>
          <Text variant="h3" accessibilityRole="header">
            Lo que viene
          </Text>
          {countdowns.length === 0 ? (
            <Text variant="body" tone="muted">
              Nada en el horizonte. Apunten un cumpleaños, un viaje o ese concierto.
            </Text>
          ) : (
            <View>
              {countdowns.map((c, i) => (
                <View key={c.key}>
                  {i > 0 ? <Divider /> : null}
                  <CountdownRow
                    countdown={c}
                    onPress={c.eventId ? () => edit(c.eventId as string) : undefined}
                  />
                </View>
              ))}
            </View>
          )}
        </View>

        {past.length > 0 ? (
          <View style={{ gap: spacing.sm }}>
            <Text variant="h3" accessibilityRole="header">
              Ya pasaron
            </Text>
            {unlogged > 0 ? (
              <View style={{ alignItems: 'flex-start' }}>
                <Button
                  title={
                    unlogged === 1
                      ? '¿Ya se vieron? Apunten esa visita'
                      : `¿Ya se vieron? Apunten ${unlogged} visitas`
                  }
                  variant="ghost"
                  onPress={() => router.push('/visits')}
                />
              </View>
            ) : null}
            <View>
              {past.map((e, i) => (
                <View key={e.id}>
                  {i > 0 ? <Divider /> : null}
                  <CountdownRow
                    countdown={asCountdown(e)}
                    trailing={pastLabel(daysBetween(e.date.slice(0, 10), today))}
                    note={null}
                    onPress={() => edit(e.id)}
                  />
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <Screen scroll refreshing={isRefetching} onRefresh={() => void refetch()}>
      <EventsEvents />
      <View style={{ gap: spacing.xl }}>
        <ScreenHeader
          back
          onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          title="Cuentas regresivas"
          right={
            <IconButton
              name="plus"
              variant="filled"
              accessibilityLabel="Apuntar una fecha"
              onPress={create}
            />
          }
        />
        {body}
      </View>
    </Screen>
  );
}
