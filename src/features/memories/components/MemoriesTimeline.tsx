import { FlashList } from '@shopify/flash-list';
import { useMemo, type ReactElement, type ReactNode } from 'react';
import { View, type RefreshControlProps } from 'react-native';

import { Text } from '@/components';
import { useToday } from '@/features/couple';
import { memoryCountLabel, timelineRows, type TimelineRow } from '@/lib/memories';
import { useTheme } from '@/theme';

import { useAuthorFruit } from '../authorFruit';
import type { Memory } from '../api';
import { useMemoryPhotoUrls } from '../hooks';
import { MemoryCard } from './MemoryCard';

type Props = {
  memories: Memory[];
  onOpen: (id: string) => void;
  /** Todo lo que va arriba de las memorias (título, resumen de visitas, selector). */
  header: ReactElement;
  /** Lo que va debajo: estados de carga/error/vacío o el mapa (con `memories` vacío). */
  footer?: ReactNode;
  refreshControl?: ReactElement<RefreshControlProps>;
};

/**
 * Diario virtualizado (FlashList): agrupado por mes; la memoria más reciente grande y las demás en
 * rejilla de 2 (DISENO §8). Las URLs de las portadas se piden en un solo lote para toda la lista.
 */
export function MemoriesTimeline({ memories, onOpen, header, footer, refreshControl }: Props) {
  const { spacing } = useTheme();
  const fruitOf = useAuthorFruit();
  const { today } = useToday();
  const currentYear = Number(today.slice(0, 4)) || null;
  const rows = useMemo(() => timelineRows(memories, currentYear), [memories, currentYear]);
  const paths = useMemo(
    () => memories.flatMap((m) => (m.photos[0] ? [m.photos[0].thumb_path] : [])),
    [memories],
  );
  const { urls } = useMemoryPhotoUrls(paths);
  const urlOf = (m: Memory) => (m.photos[0] ? urls[m.photos[0].thumb_path] : undefined);

  const renderRow = ({ item: row }: { item: TimelineRow<Memory> }) => {
    if (row.kind === 'month') {
      return (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            paddingTop: row.first ? 0 : spacing.xl - spacing.lg,
            paddingBottom: spacing.lg,
          }}
        >
          <Text variant="h3" accessibilityRole="header">
            {row.title}
          </Text>
          <Text variant="note" tone="muted">
            {memoryCountLabel(row.count)}
          </Text>
        </View>
      );
    }
    if (row.kind === 'featured') {
      return (
        <View style={{ paddingBottom: spacing.lg }}>
          <MemoryCard
            memory={row.memory}
            size="featured"
            url={urlOf(row.memory)}
            fruit={fruitOf(row.memory.created_by)}
            onPress={() => onOpen(row.memory.id)}
          />
        </View>
      );
    }
    return (
      <View style={{ flexDirection: 'row', gap: spacing.lg, paddingBottom: spacing.lg }}>
        {row.memories.map((m) => (
          <View key={m.id} style={{ flex: 1 }}>
            <MemoryCard
              memory={m}
              size="grid"
              url={urlOf(m)}
              fruit={fruitOf(m.created_by)}
              onPress={() => onOpen(m.id)}
            />
          </View>
        ))}
        {row.memories.length === 1 ? <View style={{ flex: 1 }} /> : null}
      </View>
    );
  };

  return (
    <FlashList
      data={rows}
      keyExtractor={(row) => row.key}
      getItemType={(row) => row.kind}
      renderItem={renderRow}
      ListHeaderComponent={
        <View style={{ gap: spacing.xl, paddingBottom: spacing.xl }}>{header}</View>
      }
      ListFooterComponent={footer ? <View>{footer}</View> : null}
      refreshControl={refreshControl}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    />
  );
}
