import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import {
  Button,
  Card,
  Chip,
  CloudOff,
  Divider,
  Doodle,
  EmptyPolaroid,
  EmptyState,
  Icon,
  IconButton,
  LoadingLines,
  Note,
  PageHeader,
  Screen,
  Stamp,
  Text,
} from '@/components';
import { useCouple } from '@/features/couple';
import { useCountdowns } from '@/features/events';
import { MONTH_NAMES } from '@/lib/dateParts';
import { daysBetween, formatNumber, parseIsoDate } from '@/lib/dates';
import { tiltFor } from '@/lib/tilt';
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

function StatRow({ label, value }: { label: string; value: string }) {
  const { spacing } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}`}
      style={{
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: spacing.md,
        paddingVertical: spacing.sm,
      }}
    >
      <Text variant="body" tone="muted" style={{ flex: 1 }}>
        {label}
      </Text>
      <Text variant="bodyStrong" style={{ fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
    </View>
  );
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
      tilt={tiltFor(visit.id, 1)}
      onPress={onPress}
      accessibilityLabel={`Visita ${range}, ${daysWord(length)}${visit.place ? `, ${visit.place}` : ''}`}
    >
      <View style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Stamp tone={current ? 'nopal' : 'jamaica'}>{range.toUpperCase()}</Stamp>
          {current ? (
            <Text variant="caption" tone="nopal">
              En curso
            </Text>
          ) : null}
        </View>
        <Text variant="hand">{daysWord(length)}</Text>
        {visit.place ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Icon name="pin" size={16} />
            <Text variant="small" style={{ flex: 1 }}>
              {visit.place}
            </Text>
          </View>
        ) : null}
        {visit.note ? (
          <Text variant="body" tone="muted" numberOfLines={3}>
            {visit.note}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}

/** Pantalla `/visits`: cuánto llevan sin verse, días juntos vs. separados, el año y la lista. */
export function VisitsScreen() {
  const { spacing, colors } = useTheme();
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
    body = <LoadingLines count={4} accessibilityLabel="Cargando las visitas" />;
  } else if (isError) {
    body = (
      <EmptyState
        illustration={<CloudOff />}
        title="No pudimos abrir las visitas"
        body="No hay señal con el servidor. Revisa tu internet y vuelve a intentar."
        actionLabel="Reintentar"
        onAction={() => void refetch()}
      />
    );
  } else {
    const waiting = nextVisit ? nextVisit.daysUntil : null;
    const pendingNotes = pending.slice(0, 2).map((e) => (
      <Note key={e.id} id={e.id} tape={false}>
        <View style={{ gap: spacing.sm, maxWidth: 260 }}>
          <Text variant="hand" style={{ color: colors.onPostit }}>
            ¿Ya se vieron el {shortDate(e.date.slice(0, 10))}?
          </Text>
          <Text variant="caption" style={{ color: colors.onPostit }}>
            {e.title}
          </Text>
          <Button title="Apuntarla" variant="secondary" onNote onPress={() => fromEvent(e.id)} />
        </View>
      </Note>
    ));

    body =
      visits.length === 0 ? (
        <View style={{ gap: spacing.lg }}>
          <EmptyState
            illustration={<EmptyPolaroid />}
            title="Todavía no apuntan ninguna visita"
            body="Cuando se vean, apúntenla aquí y vayan pintando el calendario. Cada cuadrito es un día que sí fue en persona."
            actionLabel="Apuntar la primera"
            onAction={create}
          />
          {pendingNotes}
          {waiting !== null ? (
            <Button
              title={`Faltan ${daysWord(waiting)} para la próxima`}
              variant="ghost"
              onPress={() => router.push('/events')}
            />
          ) : null}
        </View>
      ) : (
        <View style={{ gap: spacing.xl }}>
          <View style={{ gap: spacing.xs, alignItems: 'flex-start' }}>
            {stats.current ? (
              <>
                <Text variant="title">Están juntos</Text>
                <Text variant="body" tone="muted">
                  Día {daysBetween(stats.current.start_date, today) + 1} de esta visita.
                </Text>
              </>
            ) : stats.daysSinceLast !== null ? (
              <Text variant="title">{daysWord(stats.daysSinceLast)} sin verse</Text>
            ) : null}
            {waiting !== null ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/events')}
                style={{ minHeight: 44, justifyContent: 'center' }}
              >
                <Text variant="bodyStrong" tone="jamaica">
                  {waiting === 0 ? 'Se ven hoy' : `Faltan ${daysWord(waiting)} para la próxima`}
                </Text>
              </Pressable>
            ) : null}
          </View>

          <View style={{ gap: spacing.sm }}>
            <View>
              <View
                accessible
                accessibilityLabel={`${daysWord(stats.daysTogether)} juntos`}
                style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }}
              >
                <Text variant="hero">{formatNumber(stats.daysTogether)}</Text>
                <Text variant="title">
                  {stats.daysTogether === 1 ? 'día juntos' : 'días juntos'}
                </Text>
              </View>
              <Doodle kind="underline" width={120} />
            </View>
            <Text variant="body" tone="muted">
              en persona, contra {daysWord(stats.daysApart)} separados
              {stats.pctTogether !== null ? ` (${stats.pctTogether}% juntos)` : ''}.
            </Text>
          </View>

          <View style={{ gap: spacing.md }}>
            <Text variant="title" accessibilityRole="header">
              Su año
            </Text>
            {years.length > 1 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {years.map((y, i) => (
                  <Chip
                    key={y}
                    label={String(y)}
                    color={i % 2 === 0 ? 'yellow' : 'mint'}
                    selected={y === year}
                    onPress={() => setPickedYear(y)}
                  />
                ))}
              </View>
            ) : null}
            <VisitCalendar visits={visits} year={year} today={today} />
          </View>

          {pendingNotes.length > 0 ? <View style={{ gap: spacing.lg }}>{pendingNotes}</View> : null}

          <View style={{ gap: spacing.lg }}>
            <Text variant="title" accessibilityRole="header">
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
            <View>
              <Text variant="title" accessibilityRole="header">
                En números
              </Text>
              <StatRow label="Visita más larga" value={daysWord(stats.longestVisit)} />
              {stats.longestGap !== null ? (
                <>
                  <Divider />
                  <StatRow label="Separación más larga" value={daysWord(stats.longestGap)} />
                </>
              ) : null}
              {stats.averageGap !== null ? (
                <>
                  <Divider />
                  <StatRow label="Promedio entre visitas" value={daysWord(stats.averageGap)} />
                </>
              ) : null}
            </View>
          ) : null}
        </View>
      );
  }

  return (
    <Screen scroll refreshing={isRefetching} onRefresh={() => void refetch()}>
      <View style={{ gap: spacing.lg }}>
        <View style={{ alignItems: 'flex-start', marginLeft: -spacing.sm }}>
          <IconButton
            name="back"
            accessibilityLabel="Volver"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          />
        </View>
        <PageHeader
          stamp={
            visits.length === 0
              ? 'SIN VISITAS'
              : `${visits.length} ${visits.length === 1 ? 'VISITA' : 'VISITAS'}`
          }
          title="Nuestras visitas"
          right={
            <IconButton
              name="plus"
              variant="sticker"
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
