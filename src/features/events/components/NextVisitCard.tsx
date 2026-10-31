import { View } from 'react-native';

import { Card, Doodle, Stamp, Text } from '@/components';
import { formatStampIsoDate } from '@/lib/stampDate';
import type { Countdown } from '@/lib/events';
import { countdownHeadline, countdownSpoken } from '@/lib/eventsView';
import { tiltFor } from '@/lib/tilt';
import { useTheme } from '@/theme';

type Props = {
  countdown: Countdown;
  /** Texto sobre el número, p. ej. "La próxima vez que nos vemos". */
  heading?: string;
  onPress?: () => void;
};

/**
 * La cuenta regresiva destacada: ficha con los días en grande a mano (subrayados), la fecha en
 * sello y el título con su emoji (contenido de la pareja).
 */
export function NextVisitCard({ countdown, heading, onPress }: Props) {
  const { spacing } = useTheme();
  const { value, unit } = countdownHeadline(countdown.daysUntil);
  const title = countdown.emoji ? `${countdown.emoji} ${countdown.title}` : countdown.title;
  return (
    <Card
      tilt={tiltFor(countdown.key, 1) || 1}
      onPress={onPress}
      accessibilityLabel={`${heading ? `${heading}: ` : ''}${title}, ${countdownSpoken(countdown.daysUntil)}`}
    >
      <View style={{ gap: spacing.sm }}>
        {heading ? (
          <Text variant="small" tone="muted">
            {heading}
          </Text>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }}>
          <View>
            <Text variant="hero">{value}</Text>
            <Doodle kind="underline" width={96} />
          </View>
          {unit ? <Text variant="title">{unit}</Text> : null}
        </View>
        <Text variant="hand" numberOfLines={2}>
          {title}
        </Text>
        <Stamp tone="ink">{formatStampIsoDate(countdown.date)}</Stamp>
      </View>
    </Card>
  );
}
