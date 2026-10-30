import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { Button, Doodle, Stamp, Text } from '@/components';
import { formatLongDate } from '@/lib/dateParts';
import { formatNumber } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import type { HomeSummary } from '@/lib/home';
import { useTheme } from '@/theme';

/** El número protagonista de Inicio y sus variantes (sin fecha, futura, hoy es hito). */
export function DaysTogether({
  summary,
  anniversary,
}: {
  summary: HomeSummary;
  anniversary: string | null;
}) {
  const { spacing } = useTheme();
  const router = useRouter();
  const [numberWidth, setNumberWidth] = useState(0);
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
      <View style={{ gap: spacing.sm, alignItems: 'flex-start' }}>
        <Text variant="title" accessibilityRole="header">
          ¿Desde cuándo son ustedes?
        </Text>
        <Text variant="body" tone="muted">
          Con esa fecha les cuento los días, los cumplemeses y lo que viene.
        </Text>
        <Button
          title="Poner nuestra fecha"
          variant="secondary"
          onPress={() => router.push('/settings/couple')}
        />
      </View>
    );
  }

  if (summary.state === 'future') {
    return (
      <View style={{ gap: spacing.sm }}>
        <Text variant="title" accessibilityRole="header">
          Faltan {formatNumber(summary.daysUntil)} {summary.daysUntil === 1 ? 'día' : 'días'} para
          empezar a contar.
        </Text>
        {anniversary ? (
          <Text variant="body" tone="muted">
            Su fecha es el {formatLongDate(anniversary)}.
          </Text>
        ) : null}
      </View>
    );
  }

  const formatted = formatNumber(summary.days);
  return (
    <View style={{ gap: spacing.xs }}>
      <View
        accessible
        accessibilityLabel={`${formatted} ${summary.days === 1 ? 'día' : 'días'} juntos`}
        style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.md }}
      >
        <View onLayout={(e) => setNumberWidth(e.nativeEvent.layout.width)}>
          <Text variant="hero">{formatted}</Text>
          {numberWidth > 0 ? (
            <Doodle kind="underline" width={numberWidth} style={{ marginTop: -spacing.sm }} />
          ) : null}
        </View>
        {summary.todayStamp ? <Stamp>{summary.todayStamp}</Stamp> : null}
      </View>
      <Text variant="hand">{summary.days === 1 ? 'día juntos' : 'días juntos'}</Text>
      <Text variant="body" tone="muted">
        {summary.breakdown && anniversary
          ? `${summary.breakdown} desde el ${formatLongDate(anniversary)}`
          : 'Hoy empieza todo.'}
      </Text>
    </View>
  );
}
