import { View, useWindowDimensions } from 'react-native';

import { Stamp } from '@/components';
import { groupByMonth, type MemoryMonthGroup } from '@/lib/memories';
import { useTheme } from '@/theme';

import type { Memory } from '../api';
import { useMemoryPhotoUrls } from '../hooks';
import { MemoryPolaroid } from './MemoryPolaroid';

type Props = { memories: Memory[]; onOpen: (id: string) => void };

function MonthSection({
  group,
  onOpen,
}: {
  group: MemoryMonthGroup<Memory>;
  onOpen: (id: string) => void;
}) {
  const { spacing, page } = useTheme();
  const { width } = useWindowDimensions();
  const paths = group.items.flatMap((m) => (m.photos[0] ? [m.photos[0].thumb_path] : []));
  const { urls } = useMemoryPhotoUrls(paths);
  const gap = spacing.lg;
  const column = (width - page.contentLeft - page.contentRight - gap) / 2;
  const size = column >= 150 ? 'M' : 'S';
  const left = group.items.filter((_, i) => i % 2 === 0);
  const right = group.items.filter((_, i) => i % 2 === 1);

  const renderColumn = (items: Memory[], offset: number) => (
    <View style={{ flex: 1, alignItems: 'center', gap: spacing.xl, marginTop: offset }}>
      {items.map((m) => (
        <MemoryPolaroid
          key={m.id}
          memory={m}
          size={size}
          url={m.photos[0] ? urls[m.photos[0].thumb_path] : undefined}
          onPress={() => onOpen(m.id)}
        />
      ))}
    </View>
  );

  return (
    <View style={{ gap: spacing.lg }}>
      <Stamp tone="ink">{group.label.toUpperCase()}</Stamp>
      <View style={{ flexDirection: 'row', gap }}>
        {renderColumn(left, 0)}
        {renderColumn(right, spacing.xl)}
      </View>
    </View>
  );
}

/** Diario: memorias agrupadas por mes, polaroids en 2 columnas con su tilt (DISENO §8). */
export function MemoriesTimeline({ memories, onOpen }: Props) {
  const { spacing } = useTheme();
  const groups = groupByMonth(memories);
  return (
    <View style={{ gap: spacing.xxl }}>
      {groups.map((g) => (
        <MonthSection key={g.key} group={g} onOpen={onOpen} />
      ))}
    </View>
  );
}
