import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import {
  Button,
  Card,
  Chip,
  EmptyState,
  Icon,
  IconButton,
  LoadingSymbol,
  Notice,
  Screen,
  ScreenHeader,
  StatTile,
  Text,
} from '@/components';
import { useCouple } from '@/features/couple';
import { useCountdowns } from '@/features/events';
import { MONTH_NAMES } from '@/lib/dateParts';
import { daysBetween, formatNumber, parseIsoDate } from '@/lib/dates';
import {
  pendingVisitEvents,
  visitLength,
  visitRangeLabel,
  visitStats,
  visitYears,
} from '@/lib/visits';
import { useTheme } from '@/theme';

import type { VisitRow } from '../api';
import { useVisits, useVisitsRealtime } from '../hooks';
import { VisitCalendar } from './VisitCalendar';

const daysWord = (n: number) => `${formatNumber(n)} ${n === 1 ? 'día' : 'días'}`;

/** "2026-10-12" -> "12 de oct". */
function shortDate(iso: string): string {
  const p = parseIsoDate(iso);
  return p ? `${p.day} de ${MONTH_NAMES[p.month - 1]?.slice(0, 3)}` : '';
}

function VisitCard({
  visit,
  current,
  onPress,
}: {
  visit: VisitRow;
  current: boolean;
  onPress: () => void;
}) {
  const { spacing } = useTheme();
  const length = visitLength(visit);
  const range = visitRangeLabel(visit);
  return (
    <Card
      onPress={onPress}
      accessibilityLabel={`Visita ${range}, ${daysWord(length)}${visit.place ? `, ${visit.place}` : ''}`}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <View style={{ flex: 1, gap: spacing.xxs }}>
          <Text variant="h3">{range}</Text>
          <Text variant="note" tone="muted">
            {daysWord(length)}
            {current ? ' · en curso' : ''}
          </Text>
        </View>
        <Icon name="chevron" size={20} />
      </View>
      {visit.place ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Icon name="pin" size={16} />
          <Text variant="ui" style={{ flex: 1 }}>
            {visit.place}
          </Text>
        </View>
      ) : null}
      {visit.note ? (
        <Text variant="body" tone="muted" numberOfLines={3}>
          {visit.note}
        </Text>
      ) : null}
    </Card>
  );
}

/** Pantalla `/visits`: cuánto llevan sin verse, días juntos vs. separados, el año y la lista. */
export function VisitsScreen() {
  const { spacing } = useTheme();
  const router = useRouter();
  const { couple } = useCouple();
  useVisitsRealtime(couple?.id ?? null);
  const { visits, isLoading, isError, refetch, isRefetching } = useVisits();
  const { visit: nextVisit, events, today } = useCountdowns();
  const anniversary = couple?.anniversary_date ?? null;
  const stats = useMemo(
    () => visitStats(visits, { start: anniversary, today }),
    [visits, anniversary, today],
  );
  const pending = useMemo(() => pendingVisitEvents(events, visits, today), [events, visits, today]);
  const years = useMemo(() => visitYears(visits, today), [visits, today]);
  const currentYear = Number(today.slice(0, 4));
  const [pickedYear, setPickedYear] = useState<number | null>(null);
  const year = pickedYear && years.includes(pickedYear) ? pickedYear : currentYear;

  const create = () => router.push('/visits/edit');
  const edit = (id: string) => router.push({ pathname: '/visits/edit', params: { id } });
  const fromEvent = (eventId: string) =>
    router.push({ pathname: '/visits/edit', params: { eventId } });

  let body;
  if (isLoading) {
    body = (
      <View style={{ alignItems: 'center', paddingVertical: spacing.xxl }}>
        <LoadingSymbol accessibilityLabel="Cargando las visitas" />
      </View>
    );
  } else if (isError) {
    body = (
      <Notice tone="danger" action={{ label: 'Reintentar', onPress: () => void refetch() }}>
        No pudimos abrir las visitas. Revisa tu señal e intenta otra vez.
      </Notice>
    );
  } else {
    const waiting = nextVisit ? nextVisit.daysUntil : null;
    const pendingCards = pending.slice(0, 2).map((e) => (
      <Card key={e.id}>
        <Text variant="h3">¿Ya se vieron el {shortDate(e.date.slice(0, 10))}?</Text>
        <Text variant="note" tone="muted">
          {e.title}
        </Text>
        <View style={{ alignItems: 'flex-start', marginTop: spacing.xs }}>
          <Button title="Apuntarla" variant="secondary" size="sm" onPress={() => fromEvent(e.id)} />
        </View>
      </Card>
    ));
    const waitingLink =
      waiting !== null ? (
        <View style={{ alignItems: 'flex-start' }}>
          <Button
            title={waiting === 0 ? 'Se ven hoy' : `Faltan ${daysWord(waiting)} para la próxima`}
            variant="ghost"
            onPress={() => router.push('/events')}
          />
        </View>
      ) : null;

    body =
      visits.length === 0 ? (
        <View style={{ gap: spacing.lg }}>
          <EmptyState
            art="circles"
            title="Aquí irá su primera visita"
            body="Cuando se vean, apúntenla y vayan llenando el calendario. Cada círculo es un día en persona."
            action={{ label: 'Apuntar la primera', onPress: create }}
          />
          {pendingCards}
          {waitingLink}
        </View>
      ) : (
        <View style={{ gap: spacing.xl }}>
          <View style={{ gap: spacing.xs }}>
            {stats.current ? (
              <>
                <Text variant="h1">Juntos</Text>
                <Text variant="body" tone="muted">
                  Día {daysBetween(stats.current.start_date, today) + 1} de esta visita.
                </Text>
              </>
            ) : stats.daysSinceLast !== null ? (
              <View accessible accessibilityLabel={`${daysWord(stats.daysSinceLast)} sin verse`}>
                <Text variant="display">{formatNumber(stats.daysSinceLast)}</Text>
                <Text variant="h3">
                  {stats.daysSinceLast === 1 ? 'día sin verse' : 'días sin verse'}
                </Text>
              </View>
            ) : null}
            {waitingLink}
          </View>

          <View style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <StatTile
                value={formatNumber(stats.daysTogether)}
                label={stats.daysTogether === 1 ? 'día juntos' : 'días juntos'}
                icon="couple"
              />
              <StatTile
                value={formatNumber(stats.daysApart)}
                label={stats.daysApart === 1 ? 'día separados' : 'días separados'}
                icon="distance"
              />
            </View>
            {stats.pctTogether !== null ? (
              <Text variant="note" tone="muted">
                {stats.pctTogether}% del tiempo han estado juntos en persona.
              </Text>
            ) : null}
          </View>

          <View style={{ gap: spacing.md }}>
            <Text variant="h3" accessibilityRole="header">
              Su año
            </Text>
            {years.length > 1 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {years.map((y) => (
                  <Chip
                    key={y}
                    label={String(y)}
                    selected={y === year}
                    onPress={() => setPickedYear(y)}
                  />
                ))}
              </View>
            ) : null}
            <VisitCalendar visits={visits} year={year} today={today} />
          </View>

          {pendingCards.length > 0 ? <View style={{ gap: spacing.md }}>{pendingCards}</View> : null}

          <View style={{ gap: spacing.md }}>
            <Text variant="h3" accessibilityRole="header">
              Todas las visitas
            </Text>
            {visits.map((v) => (
              <VisitCard
                key={v.id}
                visit={v}
                current={stats.current?.id === v.id}
                onPress={() => edit(v.id)}
              />
            ))}
          </View>

          {stats.longestVisit !== null ? (
            <View style={{ gap: spacing.md }}>
              <Text variant="h3" accessibilityRole="header">
                En números
              </Text>
              <View style={{ flexDirection: 'row', gap: spacing.md }}>
                <StatTile
                  value={formatNumber(stats.longestVisit)}
                  label="días, su visita más larga"
                />
                {stats.longestGap !== null ? (
                  <StatTile
                    value={formatNumber(stats.longestGap)}
                    label="días, su separación más larga"
                  />
                ) : (
                  <View style={{ flex: 1 }} />
                )}
              </View>
              {stats.averageGap !== null ? (
                <View style={{ flexDirection: 'row', gap: spacing.md }}>
                  <StatTile
                    value={formatNumber(stats.averageGap)}
                    label="días entre visitas, en promedio"
                  />
                  <View style={{ flex: 1 }} />
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      );
  }

  return (
    <Screen scroll refreshing={isRefetching} onRefresh={() => void refetch()}>
      <View style={{ gap: spacing.xl }}>
        <ScreenHeader
          back
          onBack={() => (router.canGoBack() ? router.back() : router.replace('/memories'))}
          label={
            visits.length === 0
              ? undefined
              : `${visits.length} ${visits.length === 1 ? 'visita' : 'visitas'}`
          }
          title="Nuestras visitas"
          right={
            <IconButton
              name="plus"
              variant="filled"
              accessibilityLabel="Apuntar una visita"
              onPress={create}
            />
          }
        />
        {body}
      </View>
    </Screen>
  );
}
