import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Card, Text } from '@/components';
import { memoryAgo, memoryCountLabel } from '@/lib/memories';
import { useTheme } from '@/theme';

import type { Memory } from '../api';
import { useMemoryPhotoUrls, useOnThisDay } from '../hooks';
import { MemoryPhotoTile } from './MemoryPhotoTile';

type ViewProps = {
  memory: Memory;
  yearsAgo: number;
  /** Cuántas memorias más cayeron en este día (aparte de la que se muestra). */
  extra?: number;
  url?: string;
  onPress: () => void;
};

/** Texto de la etiqueta: "Un día como hoy · hace 1 año". */
export function onThisDayCaption(yearsAgo: number): string {
  return `Un día como hoy · ${memoryAgo(yearsAgo)}`;
}

/** Presentación: `Card` con la foto de la memoria a todo lo ancho (radio 24) y "Un día como hoy". */
export function OnThisDayCardView({ memory, yearsAgo, extra = 0, url, onPress }: ViewProps) {
  const { spacing } = useTheme();
  const caption = onThisDayCaption(yearsAgo);
  return (
    <Card
      onPress={onPress}
      accessibilityLabel={`${caption}: ${memory.title}`}
      style={{ padding: 0, gap: 0, overflow: 'hidden' }}
    >
      <MemoryPhotoTile url={url} aspectRatio={3 / 2} radius={0} />
      <View style={{ padding: 18, gap: spacing.xs }}>
        <Text variant="label" tone="muted">
          {caption}
        </Text>
        <Text variant="h3" numberOfLines={2}>
          {memory.title}
        </Text>
        {memory.place_name || extra > 0 ? (
          <Text variant="note" tone="muted" numberOfLines={1}>
            {[memory.place_name, extra > 0 ? `y ${memoryCountLabel(extra)} más ese día` : null]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}

/** Tarjeta de Inicio: la memoria más reciente de este mismo día en años anteriores. Sin ninguna, no se muestra. */
export function OnThisDayCard() {
  const router = useRouter();
  const { items } = useOnThisDay();
  const first = items[0];
  const cover = first?.memory.photos[0]?.thumb_path;
  const { urls } = useMemoryPhotoUrls(cover ? [cover] : []);
  if (!first) return null;
  return (
    <OnThisDayCardView
      memory={first.memory}
      yearsAgo={first.yearsAgo}
      extra={items.length - 1}
      url={cover ? urls[cover] : undefined}
      onPress={() => router.push({ pathname: '/memory/[id]', params: { id: first.memory.id } })}
    />
  );
}
