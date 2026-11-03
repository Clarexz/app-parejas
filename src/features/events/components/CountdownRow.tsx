import { Pressable, View } from 'react-native';

import { FruitDot, Icon, Text, type IconName } from '@/components';
import { useFruits } from '@/features/couple';
import { formatLongDate } from '@/lib/dateParts';
import type { Countdown } from '@/lib/events';
import { countdownHeadline, countdownNote, countdownSpoken } from '@/lib/eventsView';
import { useTheme } from '@/theme';

type Props = {
  countdown: Countdown;
  /** Solo las propias se editan; las automáticas no son tocables. */
  onPress?: () => void;
  /** Texto de la derecha en lugar del número ("hace 3 días" en los que ya pasaron). */
  trailing?: string;
  /** Línea sutil bajo la fecha; por defecto sale de `countdownNote`. */
  note?: string | null;
};

const KIND_ICON: Partial<Record<Countdown['kind'], IconName>> = {
  anniversary: 'heart',
  monthiversary: 'heart',
  days: 'heart',
  birthday: 'gift',
  visit: 'suitcase',
  custom: 'calendar',
};

/** Renglón de la lista: ícono por tipo, título y fecha a la izquierda, número en `num` a la derecha. */
export function CountdownRow({ countdown, onPress, trailing, note }: Props) {
  const { spacing, colors } = useTheme();
  const fruits = useFruits();
  const title = countdown.emoji ? `${countdown.emoji} ${countdown.title}` : countdown.title;
  const sub = note === undefined ? countdownNote(countdown) : note;
  const { value, unit } = countdownHeadline(countdown.daysUntil);
  // Cumpleaños: el punto dice de quién es.
  const owner =
    countdown.key === 'birthday:me'
      ? fruits.me
      : countdown.key === 'birthday:partner'
        ? fruits.partner
        : null;
  const label = `${title}, ${trailing ?? countdownSpoken(countdown.daysUntil)}, ${formatLongDate(countdown.date)}`;
  const content = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        minHeight: 64,
        paddingVertical: spacing.sm,
      }}
    >
      <View style={{ width: 28, alignItems: 'center' }}>
        <Icon name={KIND_ICON[countdown.kind] ?? 'calendar'} size={24} />
      </View>
      <View style={{ flex: 1, gap: spacing.xxs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Text variant="bodyStrong" numberOfLines={2} style={{ flexShrink: 1 }}>
            {title}
          </Text>
          {owner ? <FruitDot fruit={owner} /> : null}
        </View>
        <Text variant="note" tone="muted">
          {formatLongDate(countdown.date)}
          {sub ? ` · ${sub}` : ''}
        </Text>
      </View>
      {trailing ? (
        <Text variant="note" tone="muted">
          {trailing}
        </Text>
      ) : (
        <View style={{ alignItems: 'flex-end' }}>
          <Text variant="num">{value}</Text>
          {unit ? (
            <Text variant="note" tone="muted">
              {unit}
            </Text>
          ) : null}
        </View>
      )}
      {onPress ? <Icon name="chevron" size={20} color={colors.inkMuted} /> : null}
    </View>
  );
  if (!onPress) {
    return (
      <View accessible accessibilityLabel={label}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}. Editar`}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      {content}
    </Pressable>
  );
}
