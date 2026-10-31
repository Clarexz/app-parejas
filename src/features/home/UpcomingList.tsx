import { View } from 'react-native';

import { Divider, Text } from '@/components';
import { formatDaysUntil } from '@/lib/dates';
import type { Countdown } from '@/lib/events';
import { formatStampIsoDate } from '@/lib/stampDate';
import { useTheme } from '@/theme';

/** "Lo que viene": renglones sobre la hoja separados por `Divider`, sin fichas (DISENO §1). */
export function UpcomingList({ items }: { items: Countdown[] }) {
  const { spacing } = useTheme();
  if (items.length === 0) return null;
  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="title" accessibilityRole="header">
        Lo que viene
      </Text>
      <View>
        {items.map((m, i) => (
          <View key={m.key}>
            {i > 0 ? <Divider /> : null}
            <View accessible style={{ paddingVertical: spacing.md, gap: spacing.xxs }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.md }}>
                <Text variant="hand" style={{ flex: 1 }}>
                  {m.emoji ? `${m.emoji} ${m.title}` : m.title}
                </Text>
                <Text variant="small" tone="muted">
                  {formatDaysUntil(m.daysUntil)}
                </Text>
              </View>
              <Text variant="mono" tone="muted">
                {formatStampIsoDate(m.date)}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
