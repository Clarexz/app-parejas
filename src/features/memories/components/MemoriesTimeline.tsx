import { View } from 'react-native';

import { Text } from '@/components';
import { useToday } from '@/features/couple';
import { groupByMonth, memoryCountLabel, type MemoryMonthGroup } from '@/lib/memories';
import { useTheme } from '@/theme';

import { useAuthorFruit } from '../authorFruit';
import type { Memory } from '../api';
import { useMemoryPhotoUrls } from '../hooks';
import { MemoryCard } from './MemoryCard';

type Props = { memories: Memory[]; onOpen: (id: string) => void };

function MonthSection({
  group,
  currentYear,
  onOpen,
}: {
  group: MemoryMonthGroup<Memory>;
  currentYear: number | null;
  onOpen: (id: string) => void;
}) {
  const { spacing } = useTheme();
  const fruitOf = useAuthorFruit();
  const paths = group.items.flatMap((m) => (m.photos[0] ? [m.photos[0].thumb_path] : []));
  const { urls } = useMemoryPhotoUrls(paths);
  const urlOf = (m: Memory) => (m.photos[0] ? urls[m.photos[0].thumb_path] : undefined);
  const [first, ...rest] = group.items;
  const rows: Memory[][] = [];
  for (let i = 0; i < rest.length; i += 2) rows.push(rest.slice(i, i + 2));
  // El año solo se dice cuando no es el actual: "noviembre" o "octubre 2025".
  const title = group.year === currentYear ? group.label.replace(/ \d{4}$/, '') : group.label;

  return (
    <View style={{ gap: spacing.lg }}>
      <View
        style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}
      >
        <Text variant="h3" accessibilityRole="header">
          {title}
        </Text>
        <Text variant="note" tone="muted">
          {memoryCountLabel(group.items.length)}
        </Text>
      </View>
      <MemoryCard
        memory={first}
        size="featured"
        url={urlOf(first)}
        fruit={fruitOf(first.created_by)}
        onPress={() => onOpen(first.id)}
      />
      {rows.map((row) => (
        <View key={row[0].id} style={{ flexDirection: 'row', gap: spacing.lg }}>
          {row.map((m) => (
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
          {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
        </View>
      ))}
    </View>
  );
}

/** Diario: agrupado por mes; la memoria más reciente grande y las demás en rejilla de 2 (DISENO §8). */
export function MemoriesTimeline({ memories, onOpen }: Props) {
  const { spacing } = useTheme();
  const { today } = useToday();
  const currentYear = Number(today.slice(0, 4)) || null;
  const groups = groupByMonth(memories);
  return (
    <View style={{ gap: spacing.xl }}>
      {groups.map((g) => (
        <MonthSection key={g.key} group={g} currentYear={currentYear} onOpen={onOpen} />
      ))}
    </View>
  );
}
