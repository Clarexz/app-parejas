import { View } from 'react-native';

import { Icon, Polaroid, Text } from '@/components';
import type { PolaroidSize } from '@/components/Polaroid';
import { formatLongDate } from '@/lib/dateParts';
import { photoCountLabel } from '@/lib/memories';
import { useTheme } from '@/theme';

import type { Memory } from '../api';
import { dayMonthStamp } from '../ago';

// Mismos anchos que `Polaroid`.
const WIDTHS: Record<PolaroidSize, number> = { S: 104, M: 150, L: 220 };

type Props = {
  memory: Memory;
  /** URL firmada de la miniatura de la portada (si todavía no llega, se ve el marco vacío). */
  url?: string;
  size?: PolaroidSize;
  tilt?: number;
  tape?: 'yellow' | 'mint' | 'pink' | false;
  onPress?: () => void;
};

/**
 * Memoria como polaroid: la portada, el título a mano como pie, la fecha en sello y, debajo,
 * el lugar y cuántas fotos trae (DISENO §7).
 */
export function MemoryPolaroid({ memory, url, size = 'M', tilt, tape = false, onPress }: Props) {
  const { spacing, colors } = useTheme();
  const place = memory.place_name;
  const count = memory.photos.length;
  return (
    <View style={{ width: WIDTHS[size], gap: spacing.sm }}>
      <View style={{ paddingTop: tape ? spacing.xs : 0 }}>
        <Polaroid
          source={url ? { uri: url } : undefined}
          id={memory.id}
          tilt={tilt}
          size={size}
          tape={tape}
          caption={memory.title}
          date={dayMonthStamp(memory.happened_on)}
          onPress={onPress}
          accessibilityLabel={`${memory.title}, ${formatLongDate(memory.happened_on)}${place ? `, ${place}` : ''}`}
          accessibilityHint="Toca para abrir la memoria"
        />
      </View>
      {place || count > 1 ? (
        <View style={{ gap: spacing.xxs }}>
          {place ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Icon name="pin" size={16} color={colors.inkMuted} />
              <Text variant="caption" tone="muted" numberOfLines={1} style={{ flexShrink: 1 }}>
                {place}
              </Text>
            </View>
          ) : null}
          {count > 1 ? (
            <Text variant="caption" tone="muted">
              {photoCountLabel(count)}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
