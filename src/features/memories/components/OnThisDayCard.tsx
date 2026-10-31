import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Card, Polaroid, Text } from '@/components';
import { memoryCountLabel, onThisDayLabel } from '@/lib/memories';
import { useTheme } from '@/theme';

import type { Memory } from '../api';
import { useMemoryPhotoUrls, useOnThisDay } from '../hooks';

type ViewProps = {
  memory: Memory;
  yearsAgo: number;
  /** Cuántas memorias más cayeron en este día (aparte de la que se muestra). */
  extra?: number;
  url?: string;
  onPress: () => void;
};

/** Presentación: ficha tocable con la polaroid de la memoria y "Un día como hoy, hace N años". */
export function OnThisDayCardView({ memory, yearsAgo, extra = 0, url, onPress }: ViewProps) {
  const { spacing } = useTheme();
  const label = onThisDayLabel(yearsAgo);
  return (
    <Card tilt={1} onPress={onPress} accessibilityLabel={`${label}: ${memory.title}`}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
        <Polaroid
          size="S"
          id={memory.id}
          source={url ? { uri: url } : undefined}
          accessibilityLabel={`Foto de ${memory.title}`}
        />
        <View style={{ flex: 1, gap: spacing.xs }}>
          <Text variant="bodyStrong">{label}</Text>
          <Text variant="hand" numberOfLines={3}>
            {memory.title}
          </Text>
          {memory.place_name ? (
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {memory.place_name}
            </Text>
          ) : null}
          {extra > 0 ? (
            <Text variant="caption" tone="muted">
              y {memoryCountLabel(extra)} más ese día
            </Text>
          ) : null}
        </View>
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
