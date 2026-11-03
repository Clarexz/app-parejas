import { View } from 'react-native';

import { FruitDot, Text } from '@/components';
import type { Fruit } from '@/lib/fruits';
import { useTheme } from '@/theme';

type RowProps = { fruit: Fruit; name: string; count: number; total: number };

export function ProgressRow({ fruit, name, count, total }: RowProps) {
  const { colors, spacing, radius } = useTheme();
  const pct = total > 0 ? Math.min(1, count / total) : 0;
  return (
    <View
      accessible
      accessibilityLabel={`${name}: ${count} de ${total}`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
    >
      <FruitDot fruit={fruit} />
      <View
        style={{
          flex: 1,
          height: 8,
          borderRadius: radius.pill,
          backgroundColor: colors.surface2,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: `${pct * 100}%`,
            height: 8,
            borderRadius: radius.pill,
            backgroundColor: fruit.hex,
          }}
        />
      </View>
      <Text variant="note" tone="muted" style={{ minWidth: 40, textAlign: 'right' }}>
        {count}/{total}
      </Text>
    </View>
  );
}

type Props = {
  total: number;
  me: { fruit: Fruit; name: string; count: number };
  partner: { fruit: Fruit; name: string; count: number };
};

/** Avance de la ronda con las dos frutas: una barra para ti y otra para tu pareja. */
export function RoundProgress({ total, me, partner }: Props) {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing.sm }}>
      <ProgressRow {...me} total={total} />
      <ProgressRow {...partner} total={total} />
    </View>
  );
}
