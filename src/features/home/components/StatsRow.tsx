import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { Button, Card, StatTile, Text } from '@/components';
import { useFruits } from '@/features/couple';
import { useStreak } from '@/features/questions';
import { formatLongDate } from '@/lib/dateParts';
import { formatNumber } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import type { HomeSummary } from '@/lib/home';
import { repairLine, streakView } from '@/lib/questionCopy';
import { useTheme } from '@/theme';

type Props = {
  summary: HomeSummary;
  anniversary: string | null;
};

/** Días juntos y racha, lado a lado. Sin fecha de aniversario, invita a ponerla. */
export function StatsRow({ summary, anniversary }: Props) {
  const { spacing } = useTheme();
  const router = useRouter();
  const fruits = useFruits();
  const { streak } = useStreak();
  const [detail, setDetail] = useState(false);
  const celebrated = useRef(false);
  const todayStamp = summary.state === 'counting' ? summary.todayStamp : null;

  useEffect(() => {
    if (todayStamp && !celebrated.current) {
      celebrated.current = true;
      haptic.success();
    }
  }, [todayStamp]);

  if (summary.state === 'none') {
    return (
      <Card style={{ padding: 20, gap: spacing.xs }}>
        <Text variant="h3" accessibilityRole="header">
          ¿Desde cuándo son ustedes?
        </Text>
        <Text variant="note" tone="muted">
          Con esa fecha les cuento los días, los cumplemeses y lo que viene.
        </Text>
        <View style={{ alignItems: 'flex-start', marginTop: spacing.sm }}>
          <Button
            title="Poner nuestra fecha"
            variant="secondary"
            size="sm"
            onPress={() => router.push('/settings/couple')}
          />
        </View>
      </Card>
    );
  }

  const view = streak ? streakView(streak) : null;
  const current = view?.kind === 'streak' ? view.current : 0;
  const missing = view?.missing ?? 0;

  let daysValue: string;
  let daysLabel: string;
  let detailText: string | null = null;
  if (summary.state === 'future') {
    daysValue = formatNumber(summary.daysUntil);
    daysLabel =
      summary.daysUntil === 1 ? 'día para empezar a contar' : 'días para empezar a contar';
    detailText = anniversary ? `Su fecha es el ${formatLongDate(anniversary)}.` : null;
  } else {
    daysValue = formatNumber(summary.days);
    daysLabel = summary.days === 1 ? 'día juntos' : 'días juntos';
    detailText =
      summary.breakdown && anniversary
        ? `${summary.breakdown} desde el ${formatLongDate(anniversary)}`
        : 'Hoy empieza todo.';
  }

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <StatTile
          value={daysValue}
          label={daysLabel}
          icon="love"
          onPress={detailText ? () => setDetail((v) => !v) : undefined}
          accessibilityHint="Muestra el desglose"
        />
        <StatTile
          value={formatNumber(current)}
          label={current === 1 ? 'día de racha' : 'días de racha'}
          icon="spark"
          iconColor={fruits.me.hex}
          onPress={() => router.navigate('/questions')}
          accessibilityHint="Abre las preguntas"
        />
      </View>
      {todayStamp ? (
        <Text variant="ui" accessibilityLiveRegion="polite">
          {todayStamp.toLocaleLowerCase('es-MX').replace(/^./, (c) => c.toUpperCase())}
        </Text>
      ) : null}
      {detail && detailText ? (
        <Text variant="note" tone="muted" accessibilityLiveRegion="polite">
          {detailText}
        </Text>
      ) : null}
      {missing > 0 ? (
        <Text variant="note" tone="muted">
          {repairLine(missing)}.
        </Text>
      ) : null}
    </View>
  );
}
