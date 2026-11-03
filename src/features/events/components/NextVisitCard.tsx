import { View } from 'react-native';

import { Card, Text } from '@/components';
import { formatLongDate } from '@/lib/dateParts';
import type { Countdown } from '@/lib/events';
import { countdownHeadline, countdownSpoken } from '@/lib/eventsView';
import { useTheme } from '@/theme';

import { MoonFill } from './MoonFill';

type Props = {
  countdown: Countdown;
  /** Texto sobre el número; por defecto "Faltan" (o nada si es hoy). */
  heading?: string;
  onPress?: () => void;
};

/**
 * La cuenta regresiva destacada, como la tarjeta de Inicio: "Faltan" (`h3`), los días en
 * `display`, la fecha y el título, y la media luna que se llena con las dos frutas.
 */
export function NextVisitCard({ countdown, heading, onPress }: Props) {
  const { spacing } = useTheme();
  const { value, unit } = countdownHeadline(countdown.daysUntil);
  const title = countdown.emoji ? `${countdown.emoji} ${countdown.title}` : countdown.title;
  const lead = heading ?? (countdown.daysUntil > 0 ? 'Faltan' : null);
  return (
    <Card
      onPress={onPress}
      accessibilityLabel={`${heading ? `${heading}: ` : ''}${title}, ${countdownSpoken(countdown.daysUntil)}`}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
        <View style={{ flex: 1, gap: spacing.xs }}>
          {lead ? <Text variant="h3">{lead}</Text> : null}
          <Text variant="display" numberOfLines={1} adjustsFontSizeToFit>
            {unit ? `${value} ${unit}` : value}
          </Text>
          <Text variant="ui" numberOfLines={2}>
            {title}
          </Text>
          <Text variant="note" tone="muted">
            {formatLongDate(countdown.date)}
          </Text>
        </View>
        <MoonFill daysUntil={countdown.daysUntil} />
      </View>
    </Card>
  );
}
