import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button, Card, Icon, Text } from '@/components';
import { useFruits } from '@/features/couple';
import { useStreak } from '@/features/questions';
import { formatLongDate } from '@/lib/dateParts';
import { formatNumber } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import type { HomeSummary } from '@/lib/home';
import { repairLine, streakView } from '@/lib/questionCopy';
import { useTheme } from '@/theme';

type TileProps = {
  value: string;
  label: string;
  /** Chispa en la fruta indicada, junto al número. */
  sparkColor?: string;
  onPress?: () => void;
  hint?: string;
};

/** Número secundario (`num`) con su nota sobre `surface`; la racha lleva su chispa (DISENO §8). */
function Tile({ value, label, sparkColor, onPress, hint }: TileProps) {
  const { colors, spacing, radius } = useTheme();
  const body = (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: radius.card,
        padding: 18,
        gap: spacing.xxs,
        justifyContent: 'center',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Text variant="num">{value}</Text>
        {sparkColor ? <Icon name="spark" size={22} color={sparkColor} /> : null}
      </View>
      <Text variant="note" tone="muted">
        {label}
      </Text>
    </View>
  );
  if (!onPress) {
    return (
      <View accessible accessibilityLabel={`${value} ${label}`} style={{ flex: 1 }}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${value} ${label}`}
      accessibilityHint={hint}
      onPress={onPress}
      style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.8 : 1 })}
    >
      {body}
    </Pressable>
  );
}

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
        <Tile
          value={daysValue}
          label={daysLabel}
          onPress={detailText ? () => setDetail((v) => !v) : undefined}
          hint="Muestra el desglose"
        />
        <Tile
          value={formatNumber(current)}
          label={current === 1 ? 'día de racha' : 'días de racha'}
          sparkColor={fruits.me.hex}
          onPress={() => router.navigate('/questions')}
          hint="Abre las preguntas"
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
