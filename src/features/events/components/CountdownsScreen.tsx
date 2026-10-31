import { useRouter } from 'expo-router';
import { View } from 'react-native';

import {
  Button,
  CloudOff,
  Divider,
  EmptyPolaroid,
  EmptyState,
  IconButton,
  LoadingLines,
  PageHeader,
  Screen,
  Text,
} from '@/components';
import { daysBetween } from '@/lib/dates';
import type { Countdown } from '@/lib/events';
import { pastLabel } from '@/lib/eventsView';
import { formatStampIsoDate } from '@/lib/stampDate';
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

  const edit = (id: string) => router.push({ pathname: '/events/edit', params: { id } });
  const create = () => router.push('/events/edit');
  const createVisit = () => router.push({ pathname: '/events/edit', params: { kind: 'visit' } });

  let body;
  if (isLoading) {
    body = <LoadingLines count={4} accessibilityLabel="Cargando las cuentas regresivas" />;
  } else if (isError) {
    body = (
      <EmptyState
        illustration={<CloudOff />}
        title="No pudimos abrir las cuentas regresivas"
        body="No hay señal con el servidor. Revisa tu internet y vuelve a intentar."
        actionLabel="Reintentar"
        onAction={() => void refetch()}
      />
    );
  } else {
    const upcoming = countdowns;
    body = (
      <View style={{ gap: spacing.xl }}>
        {visit ? (
          <NextVisitCard
            countdown={visit}
            heading="La próxima vez que nos vemos"
            onPress={() => visit.eventId && edit(visit.eventId)}
          />
        ) : (
          <View style={{ gap: spacing.sm }}>
            <EmptyState
              illustration={<EmptyPolaroid />}
              title="¿Cuándo se vuelven a ver?"
              body="Apunten la próxima visita y cuenten los días juntos. Hasta la espera se siente más corta con fecha."
            />
            <View style={{ alignItems: 'flex-start' }}>
              <Button title="Apuntar la próxima visita" onPress={createVisit} />
            </View>
          </View>
        )}

        <View style={{ gap: spacing.sm }}>
          <Text variant="title" accessibilityRole="header">
            Lo que viene
          </Text>
          {upcoming.length === 0 ? (
            <Text variant="body" tone="muted">
              Nada en el horizonte todavía. Apunten un cumpleaños, un viaje o ese concierto que ya
              quieren.
            </Text>
          ) : (
            <View>
              {upcoming.map((c, i) => (
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
          <View style={{ alignItems: 'flex-start' }}>
            <Button title="Apuntar una fecha" variant="secondary" icon="plus" onPress={create} />
          </View>
        </View>

        {past.length > 0 ? (
          <View style={{ gap: spacing.sm }}>
            <Text variant="title" accessibilityRole="header">
              Ya pasaron
            </Text>
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
      <View style={{ gap: spacing.lg }}>
        <View style={{ alignItems: 'flex-start', marginLeft: -spacing.sm }}>
          <IconButton
            name="back"
            accessibilityLabel="Volver"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          />
        </View>
        <PageHeader stamp={formatStampIsoDate(today)} title="Cuentas regresivas" />
        {body}
      </View>
    </Screen>
  );
}
