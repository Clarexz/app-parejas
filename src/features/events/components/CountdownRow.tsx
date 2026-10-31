import { Pressable, View } from 'react-native';

import { Icon, Text } from '@/components';
import type { Countdown } from '@/lib/events';
import { countdownNote, countdownSpoken } from '@/lib/eventsView';
import { formatDaysUntil } from '@/lib/dates';
import { formatStampIsoDate } from '@/lib/stampDate';
import { useTheme } from '@/theme';

type Props = {
  countdown: Countdown;
  /** Solo las propias se editan; las automáticas no son tocables. */
  onPress?: () => void;
  /** Texto de la derecha; por defecto "en N días". */
  trailing?: string;
  /** Línea sutil bajo la fecha; por defecto sale de `countdownNote`. */
  note?: string | null;
};

/** Renglón de "Lo que viene" / "Ya pasaron": título a mano, días, fecha y una nota sutil. */
export function CountdownRow({ countdown, onPress, trailing, note }: Props) {
  const { spacing, colors } = useTheme();
  const title = countdown.emoji ? `${countdown.emoji} ${countdown.title}` : countdown.title;
  const sub = note === undefined ? countdownNote(countdown) : note;
  const days = trailing ?? formatDaysUntil(countdown.daysUntil);
  const content = (
    <View style={{ paddingVertical: spacing.md, gap: spacing.xxs, minHeight: 44 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.md }}>
        <Text variant="hand" style={{ flex: 1 }}>
          {title}
        </Text>
        <Text variant="small" tone="muted">
          {days}
        </Text>
        {onPress ? <Icon name="pencil" size={16} color={colors.inkMuted} /> : null}
      </View>
      <Text variant="mono" tone="muted">
        {formatStampIsoDate(countdown.date)}
      </Text>
      {sub ? (
        <Text variant="caption" tone="muted">
          {sub}
        </Text>
      ) : null}
    </View>
  );
  const label = `${title}, ${trailing ?? countdownSpoken(countdown.daysUntil)}, ${formatStampIsoDate(countdown.date)}`;
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
