import { View } from 'react-native';

import { Card, Text } from '@/components';
import { formatLongDate } from '@/lib/dateParts';
import type { HomeSummary } from '@/lib/home';
import { useTheme } from '@/theme';

type Props = {
  summary: HomeSummary;
  anniversary: string | null;
};

/** El tiempo juntos desglosado ("3 años, 8 meses y 16 días"), fijo al final de Inicio. */
export function TimeTogetherCard({ summary, anniversary }: Props) {
  const { spacing } = useTheme();
  if (summary.state === 'none' || !anniversary) return null;

  const long = formatLongDate(anniversary);
  let label: string;
  let headline: string;
  let note: string;
  if (summary.state === 'future') {
    label = 'Empiezan a contar';
    headline = `El ${long}`;
    note = 'Ese día arrancan los días juntos.';
  } else {
    label = 'Tiempo juntos';
    headline = summary.breakdown || 'Hoy empieza todo';
    note = summary.breakdown ? `desde el ${long}` : `Su fecha es el ${long}.`;
  }

  return (
    <Card style={{ padding: 20 }}>
      <View
        accessible
        accessibilityLabel={`${label}: ${headline}, ${note}`}
        style={{ gap: spacing.xxs }}
      >
        <Text variant="label" tone="muted">
          {label}
        </Text>
        <Text variant="h3">{headline}</Text>
        <Text variant="note" tone="muted">
          {note}
        </Text>
      </View>
    </Card>
  );
}
