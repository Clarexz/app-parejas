import { useRouter } from 'expo-router';
import { useId } from 'react';
import { View } from 'react-native';
import Svg, { ClipPath, Defs, Path, Rect } from 'react-native-svg';

import { Button, Card, LoadingSymbol, Text, type FruitLike } from '@/components';
import { useFruits } from '@/features/couple';
import { useCountdowns } from '@/features/events';
import { formatNumber } from '@/lib/dates';
import type { Countdown } from '@/lib/events';
import { countdownSpoken } from '@/lib/eventsView';
import { FRUITS } from '@/lib/fruits';
import { useTheme } from '@/theme';

import { countdownProgress, shortDate } from '../format';

const ARC = 'M3 24 A19 19 0 0 1 41 24 Z';

/** Media luna chica: tu fruta, que se llena con la de tu pareja de abajo hacia arriba. */
export function HalfMoon({
  progress,
  me,
  partner,
}: {
  progress: number;
  me: FruitLike;
  partner: FruitLike;
}) {
  const { colors } = useTheme();
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const hex = (f: FruitLike) => (typeof f === 'string' ? FRUITS[f].hex : f.hex);
  // La media luna ocupa de y=5 a y=24: el relleno sube desde la base.
  const top = 24 - 19 * progress;
  return (
    <Svg width={44} height={28} viewBox="0 0 44 28" accessibilityElementsHidden>
      <Defs>
        <ClipPath id={`fill-${id}`}>
          <Rect x={0} y={top} width={44} height={28 - top} />
        </ClipPath>
      </Defs>
      <Path d={ARC} fill={hex(me)} />
      <Path d={ARC} fill={hex(partner)} clipPath={`url(#fill-${id})`} />
      <Path d="M1 26.5H43" stroke={colors.ink} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

type ViewProps = {
  countdown: Countdown | null;
  /** Alta del evento (para el avance de la media luna). */
  createdAt?: string | null;
  today: string;
  loading?: boolean;
  onOpen: () => void;
  onCreate: () => void;
};

/** La tarjeta "La próxima vez" y sus tres estados: cargando, con cuenta y vacía. */
export function NextTimeCardView({
  countdown,
  createdAt,
  today,
  loading = false,
  onOpen,
  onCreate,
}: ViewProps) {
  const { spacing } = useTheme();
  const fruits = useFruits();
  const partnerFruit = fruits.partner ?? FRUITS[fruits.me.suggested];

  if (loading) {
    return (
      <Card style={{ minHeight: 120, alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSymbol size={32} accessibilityLabel="Cargando la próxima vez" />
      </Card>
    );
  }

  if (!countdown) {
    return (
      <Card style={{ padding: 20, gap: spacing.xs }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text variant="label" tone="muted">
            La próxima vez
          </Text>
          <HalfMoon progress={0.06} me={fruits.me} partner={partnerFruit} />
        </View>
        <Text variant="h3">¿Cuándo se ven?</Text>
        <Text variant="note" tone="muted">
          Apunten la próxima vez que se ven y vayan contando los días.
        </Text>
        <View style={{ alignItems: 'flex-start', marginTop: spacing.sm }}>
          <Button title="Apuntar la fecha" variant="secondary" size="sm" onPress={onCreate} />
        </View>
      </Card>
    );
  }

  const today0 = countdown.daysUntil <= 0;
  const value = today0
    ? 'Hoy'
    : `${formatNumber(countdown.daysUntil)} ${countdown.daysUntil === 1 ? 'día' : 'días'}`;
  const where = [
    shortDate(countdown.date),
    countdown.emoji ? `${countdown.emoji} ${countdown.title}` : countdown.title,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <Card
      style={{ padding: 20, gap: spacing.xxs }}
      onPress={onOpen}
      accessibilityLabel={`La próxima vez, ${countdown.title}: ${countdownSpoken(countdown.daysUntil)}. Toca para ver las cuentas regresivas.`}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text variant="label" tone="muted">
          La próxima vez
        </Text>
        <HalfMoon
          progress={countdownProgress(countdown.daysUntil, createdAt, today)}
          me={fruits.me}
          partner={partnerFruit}
        />
      </View>
      {today0 ? null : (
        <Text variant="h3" style={{ marginTop: spacing.xs }}>
          Faltan
        </Text>
      )}
      <Text variant="display">{value}</Text>
      <Text variant="note" tone="muted" numberOfLines={2}>
        {today0 ? where : `para el ${where}`}
      </Text>
    </Card>
  );
}

/** Conectada a la cuenta regresiva destacada (la próxima visita o la más cercana). */
export function NextTimeCard() {
  const router = useRouter();
  const { featured, events, today, isLoading } = useCountdowns();
  const createdAt = featured?.eventId
    ? (events.find((e) => e.id === featured.eventId)?.created_at ?? null)
    : null;
  return (
    <NextTimeCardView
      countdown={featured}
      createdAt={createdAt}
      today={today}
      loading={isLoading}
      onOpen={() => router.push('/events')}
      onCreate={() => router.push({ pathname: '/events/edit', params: { kind: 'visit' } })}
    />
  );
}
