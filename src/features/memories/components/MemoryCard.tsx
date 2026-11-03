import { Pressable, View } from 'react-native';

import { FruitDot, Text } from '@/components';
import { formatLongDate } from '@/lib/dateParts';
import type { Fruit } from '@/lib/fruits';
import { useTheme } from '@/theme';

import { memoryDate } from '../ago';
import type { Memory } from '../api';
import { MemoryPhotoTile } from './MemoryPhotoTile';

type Props = {
  memory: Memory;
  /** URL firmada de la miniatura de la portada. */
  url?: string;
  /** `featured`: foto 3:2 con título, fecha y lugar. `grid`: foto cuadrada para la rejilla de 2. */
  size?: 'featured' | 'grid';
  /** Fruta de quien la subió. */
  fruit?: Fruit | null;
  onPress?: () => void;
};

/**
 * Memoria del diario (DISENO §8): la foto manda, sin marco. Foto radio 24, título `bodyStrong`,
 * "fecha · lugar" en `note` y el punto de la fruta de quien la subió.
 */
export function MemoryCard({ memory, url, size = 'grid', fruit, onPress }: Props) {
  const { spacing } = useTheme();
  const featured = size === 'featured';
  const place = memory.place_name;
  const date = memoryDate(memory.happened_on);
  const meta = place ? `${date} · ${place}` : date;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${memory.title}, ${formatLongDate(memory.happened_on)}${place ? `, ${place}` : ''}`}
      accessibilityHint="Toca para abrir la memoria"
      onPress={onPress}
      style={({ pressed }) => ({ gap: spacing.sm, opacity: pressed ? 0.85 : 1 })}
    >
      <MemoryPhotoTile url={url} aspectRatio={featured ? 3 / 2 : 1} />
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong" numberOfLines={2}>
            {memory.title}
          </Text>
          <Text variant="note" tone="muted" numberOfLines={1}>
            {meta}
          </Text>
        </View>
        {fruit ? (
          <View style={{ paddingTop: spacing.sm }}>
            <FruitDot fruit={fruit} size={featured ? 14 : 12} />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}
